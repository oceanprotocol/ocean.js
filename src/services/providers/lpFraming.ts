/**
 * Length-prefixed framing for the Ocean P2P protocol: the four flow-control constants, the
 * `lpStream` wrapper that applies them, and the frame reader that can tell a clean
 * end-of-stream from a truncated one.
 *
 * These live in their own module because the four constants only make sense as a set —
 * each is derived from the others, and changing one without the rest reintroduces the
 * silent-discard failure they exist to prevent — and because everything here is about the
 * wire, not about the provider that happens to speak it.
 *
 * Kept byte-for-byte in step with ocean-node's `components/P2P/lpFraming.ts`. Divergence
 * between the two is not a style question: it is one peer reading a different number of
 * bytes than the other one wrote.
 */
import { lpStream, UnexpectedEOFError } from '@libp2p/utils'
import type { Stream } from '@libp2p/interface'

/** The framed view of a stream that `lpFramedStream` returns. */
export type LpFramedStream = ReturnType<typeof lpStream>

/**
 * Largest length-prefixed frame either side of this protocol will accept.
 *
 * Handed to `lpStream()` as `maxDataLength`, which does two things. A peer declaring a bigger
 * frame fails immediately with `InvalidDataLengthError`, and `lpStream` derives a
 * `maxLengthLength` from it, which caps the length-prefix read — without that cap a peer sending
 * an endless run of varint continuation bytes keeps the prefix loop reading one byte at a time
 * forever.
 *
 * 4 MiB is not a new restriction: it is already the largest frame that can be read at all,
 * because `lpStream`'s default read buffer is 4 MiB and a frame has to fit in the buffer whole
 * before it can be handed over. What changes is the failure mode — a clear error about the
 * declared length instead of an opaque buffer overflow — and that the limit now bounds the
 * flow-control marks below rather than being an accident of a library default.
 *
 * Every frame this protocol emits in practice is far smaller: file and log chunks arrive at the
 * source stream's high-water mark (16—64 KiB), and the largest single frames are whole-payload
 * JSON writes such as a DDO or a status envelope.
 */
export const LP_MAX_FRAME_BYTES = 4 * 1024 * 1024

/**
 * `varint` bytes needed to encode `LP_MAX_FRAME_BYTES`, which is what `lpStream` derives as its
 * `maxLengthLength`. Also the slack on a byte count kept outside `byteStream`: a frame's length
 * prefix is consumed from the read buffer before the frame it belongs to is complete, so such a
 * count can run this far — and no further — ahead of the buffer's real occupancy.
 */
export const LP_MAX_LENGTH_PREFIX_BYTES = 4

/**
 * How much the transport may buffer on our behalf while reads are paused.
 *
 * Pausing reads is the only backpressure lever a libp2p stream has: it withholds the muxer's
 * window updates, so the peer's send window drains and it stops. What it cannot do is stop
 * bytes the peer already had permission to send, and those land in the stream's own buffer —
 * which resets the stream if it passes `maxReadBufferLength`.
 *
 * The library's defaults make that reset a certainty rather than a safeguard: yamux lets its
 * receive window double up to `MAX_STREAM_WINDOW` (16 MiB) on a stream that is being drained
 * quickly, while `maxReadBufferLength` stops at 4 MiB. So pausing a stream that has been going
 * fast — exactly the case where a consumer falls behind — resets it. Measured: a 40 MiB transfer
 * died at frame 160 with `Read buffer length of 4194496 exceeded limit of 4194304, read status
 * is paused`, and because an abort discards the stream buffer without ever dispatching it, the
 * byte accounting saw nothing pending and read the truncation as a clean end.
 *
 * So the buffer is raised to the window it may have to absorb. Bytes only accumulate here while
 * a consumer is behind, and the peer stops once its window is spent.
 */
export const LP_PAUSE_BUFFER_BYTES = 16 * 1024 * 1024

/**
 * Backlog at or below which a paused read loop may let the transport deliver again.
 *
 * Pausing while the consumer works on a frame is not on its own enough, because `resume()`
 * dispatches *everything* the stream buffered while paused as a single `message` event: one
 * cycle admits a whole flush and consumes one frame, so a consumer slower than its peer still
 * accumulates without bound. A loop that has fallen behind therefore stays paused and drains
 * what it is already holding, and only lets more in once the backlog is back below this mark.
 *
 * The value is not free to choose. It has to be at least one maximum-size frame plus its length
 * prefix: while paused, the only way to make progress is to read a complete frame out of the
 * backlog, so a lower mark could leave a loop paused on a backlog holding part of a frame with
 * nothing to release it.
 */
export const LP_RESUME_BELOW_BYTES = LP_MAX_FRAME_BYTES + LP_MAX_LENGTH_PREFIX_BYTES

/**
 * Read-buffer ceiling for every length-prefixed stream in this protocol, and the ceiling on
 * bytes retained per stream.
 *
 * It has to be passed explicitly. `lpStream()` otherwise defaults `maxBufferSize` to 4 MiB and,
 * when an incoming message pushes the unread backlog past that, `byteStream`'s `message`
 * listener discards the *entire* buffer and rejects its `hasBytes` deferred — which is a no-op
 * when no read is pending, i.e. exactly while a consumer is working on a chunk it was just
 * handed. The discard is therefore silent, and it desynchronises the frame parser: later reads
 * take payload bytes for length prefixes and hand out corrupt, out-of-sequence frames. Verified
 * in `@libp2p/utils` 7.3.2, `dist/src/stream-utils.js`.
 *
 * The size follows from the two marks above rather than being picked: a resume can flush a full
 * pause buffer into the read buffer on top of a backlog that is already at the resume mark, so
 * the ceiling has to clear `LP_PAUSE_BUFFER_BYTES + LP_RESUME_BELOW_BYTES` (20 MiB) with room
 * for the frame in progress. 24 MiB does, and is only approached while a consumer is behind —
 * the resume mark keeps the steady state near one frame.
 */
export const LP_MAX_BUFFER_BYTES = 24 * 1024 * 1024

/**
 * Wraps `stream` in the length-prefixed framing this protocol uses, and makes the stream itself
 * safe to pause. Callers must go through this rather than calling `lpStream()` directly: the
 * defaults it would otherwise take are what silently drop bytes under backpressure.
 */
export function lpFramedStream(stream: Stream): ReturnType<typeof lpStream> {
  if (stream.maxReadBufferLength < LP_PAUSE_BUFFER_BYTES) {
    stream.maxReadBufferLength = LP_PAUSE_BUFFER_BYTES
  }
  // A fresh options object each call: `lpStream()` writes the `maxLengthLength` it derives back
  // onto the object it is given.
  return lpStream(stream, {
    maxBufferSize: LP_MAX_BUFFER_BYTES,
    maxDataLength: LP_MAX_FRAME_BYTES
  })
}

/**
 * Backpressure for a length-prefixed read loop: while the consumer is holding a frame, stop the
 * transport dispatching `message` events, so the unread backlog cannot grow past
 * `maxBufferSize` and be dropped. Bytes that arrive while paused are held by the stream itself
 * and flushed on resume, and the muxer stops granting the sender window, so this is real
 * end-to-end backpressure rather than local buffering.
 *
 * Guarded on `readStatus` because `pause()` and `resume()` throw `StreamStateError` once the
 * readable end is closing or closed, which happens on the last frames of every transfer — as
 * soon as the peer has closed its write side and the read buffer has drained.
 */
export function pauseReads(stream: Stream): void {
  if (stream.readStatus === 'readable') {
    stream.pause()
  }
}

/** Counterpart to `pauseReads`: let the transport deliver the next frame. */
export function resumeReads(stream: Stream): void {
  if (stream.readStatus === 'paused') {
    stream.resume()
  }
}

/** Bytes `lpStream`'s default varint length-prefix takes for a frame of this size. */
export function lpPrefixLength(byteLength: number): number {
  let length = 1
  let value = byteLength
  while (value >= 0x80) {
    value = Math.floor(value / 0x80)
    length++
  }
  return length
}

export function toFrameBytes(chunk: Uint8Array | { subarray(): Uint8Array }): Uint8Array {
  return chunk instanceof Uint8Array ? chunk : chunk.subarray()
}

/**
 * Length-prefixed frame reader that can tell a clean end-of-stream from a truncated
 * transfer.
 *
 * `lpStream.read()` throws `UnexpectedEOFError` for *both*: the peer closing exactly
 * between frames, and the peer declaring a 10-byte frame, sending 3 bytes and
 * vanishing. Swallowing that error by type — which every read loop here used to do —
 * hands a **truncated payload back as success**, so a cut-short download or compute
 * result looks complete.
 *
 * The discriminator is bytes consumed, not the error's name or message. The message
 * is ambiguous as well: a clean end and a frame cut off inside its varint length
 * prefix both read `stream closed while reading 0/1 bytes`, verified against
 * `@libp2p/utils` 7.3.2 over a real `streamPair`. Every byte the transport delivers
 * arrives as a `message` event — the only path into `lpStream`'s internal buffer — so
 * we count those, and count what fully-read frames account for. Equal totals mean the stream ended on a frame
 * boundary: a clean end. Otherwise bytes arrived that never completed a frame, which
 * is truncation and must propagate to the caller.
 *
 * Constraint on this accounting: the `lpStream` handed to the constructor must never
 * be `unwrap()`ped while this reader is in use. `unwrap()` removes only
 * `byteStream`'s own 'message' listener and then `unshift`s its internal buffer back
 * onto the stream, which re-dispatches those bytes as a fresh 'message' event — our
 * listener is still attached, so it would count them a second time, `pendingBytes`
 * would go positive and `isCleanEnd` would report a clean end-of-stream as
 * truncation. Nothing calls `unwrap()` today; anyone adding a call must detach this
 * reader's listener first.
 */
export class LpFrameReader {
  private received = 0
  private consumed = 0
  /** Backlog size at the moment `byteStream` was seen to drop its whole read buffer. */
  private discarded: number | undefined
  /** Set when the stream ends in an error, whether raised locally or by the peer. */
  private closeError: Error | undefined

  constructor(
    private readonly lp: ReturnType<typeof lpStream>,
    stream: Stream,
    maxBufferSize: number = LP_MAX_BUFFER_BYTES
  ) {
    // An aborted stream discards whatever it had buffered without ever dispatching it, so the
    // byte accounting below cannot see those bytes go missing: `pendingBytes` stays at zero
    // and the end-of-file that follows looks like a clean end of stream. Recording the failure
    // is what keeps a reset from being read as a completed transfer.
    stream.addEventListener('close', (evt) => {
      if (evt.error != null) {
        this.closeError = evt.error
      }
    })
    stream.addEventListener('message', (evt) => {
      this.received += evt.data.byteLength
      // `byteStream` never lets its unread backlog exceed `maxBufferSize`: the listener that
      // appends to it drops the entire buffer the moment it would, and the rejection it raises
      // does nothing when no read is pending. So a backlog above the ceiling can only mean the
      // drop has already happened. Backpressure (`pauseReads`) is what stops that arising;
      // this turns whatever is left into an immediate, named error at the next read instead of
      // an end-of-file long afterwards, by which time corrupt frames have been handed over.
      if (
        this.discarded === undefined &&
        this.pendingBytes > maxBufferSize + LP_MAX_LENGTH_PREFIX_BYTES
      ) {
        this.discarded = this.pendingBytes
      }
    })
  }

  /** Bytes delivered by the transport that are not yet part of a complete frame. */
  get pendingBytes(): number {
    return this.received - this.consumed
  }

  async read(options: { signal: AbortSignal }): Promise<Uint8Array> {
    if (this.discarded !== undefined) {
      throw new Error(
        `P2P read buffer overflowed — ${this.discarded} bytes were dropped before they could ` +
          'be read, so frame boundaries can no longer be trusted'
      )
    }
    const frame = toFrameBytes(await this.lp.read(options))
    this.consumed += lpPrefixLength(frame.byteLength) + frame.byteLength
    return frame
  }

  /**
   * True when `err` is the graceful end of the stream: an end-of-file thrown with
   * every delivered byte already accounted for by a complete frame. A truncated
   * frame throws the same error type but leaves bytes pending, and returns false.
   */
  isCleanEnd(err: unknown): boolean {
    if (this.closeError != null) {
      return false
    }
    const isEof =
      err instanceof UnexpectedEOFError ||
      (err as { name?: string } | null)?.name === 'UnexpectedEOFError'
    return isEof && this.pendingBytes === 0
  }
}
