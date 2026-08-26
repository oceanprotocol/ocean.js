import { type Libp2p, type Libp2pOptions, createLibp2p } from 'libp2p'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import { tcp } from '@libp2p/tcp'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { bootstrap } from '@libp2p/bootstrap'
import { identify, identifyPush } from '@libp2p/identify'
import { EventTypes, KadDHT, kadDHT, passthroughMapper } from '@libp2p/kad-dht'
import { ping } from '@libp2p/ping'
import { peerIdFromString } from '@libp2p/peer-id'
import { isLoopback, isPrivate, lpStream, UnexpectedEOFError } from '@libp2p/utils'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { WebSockets, WebSocketsSecure } from '@multiformats/multiaddr-matcher'
import { Signer, isAddress } from 'ethers'
import { sleep } from '../../utils/General.js'
import { LoggerInstance } from '../../utils/Logger.js'
import { concatUint8Arrays } from '../../utils/bytes.js'
import { KEEP_ALIVE } from '@libp2p/interface'
import type { Connection, Stream, PeerId } from '@libp2p/interface'
import {
  StorageObject,
  FileInfo,
  ComputeJob,
  ComputeOutput,
  ComputeAlgorithm,
  ComputeAsset,
  ComputeEnvironment,
  ProviderInitialize,
  ProviderComputeInitializeResults,
  UserCustomParameters,
  ComputeResourceRequest,
  ComputeJobMetadata,
  PolicyServerInitializeCommand,
  PolicyServerPassthroughCommand,
  dockerRegistryAuth,
  DownloadResponse,
  ComputeResultStream,
  NodeStatus,
  NodeComputeJob,
  PersistentStorageAccessList,
  PersistentStorageBucket,
  PersistentStorageCreateBucketRequest,
  PersistentStorageDeleteFileResponse,
  PersistentStorageFileEntry,
  PersistentStorageObject,
  PersistentStorageUpdateBucketResponse,
  ServiceJob,
  ServiceJobListed,
  ServiceListFilters,
  ServiceRestartParams,
  ServiceTemplatePublic,
  ServiceStartParams,
  ServiceUserData,
  ServicePayment,
  OceanNode,
  NodeP2P,
  SignerOrAuthTokenOrSignature,
  CompleteSignature
} from '../../@types/index.js'
import { PROTOCOL_COMMANDS, NodeLogEntry } from '../../@types/Provider.js'
import { type DDO, type ValidateMetadata } from '@oceanprotocol/ddo-js'
import {
  getConsumerAddress,
  getSignature,
  getAuthorization,
  isAgentSignature
} from './BaseProvider.js'
import { eciesencrypt } from '../../utils/eciesencrypt.js'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import * as multiFormatRaw from 'multiformats/codecs/raw'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

export const OCEAN_P2P_PROTOCOL = '/ocean/nodes/1.0.0'
const OCEAN_DHT_PROTOCOL = '/ocean/nodes/1.0.0/kad/1.0.0'
const DEFAULT_MAX_RETRIES = 5
const DEFAULT_RETRY_DELAY_MS = 1000
const DEFAULT_DIAL_TIMEOUT_MS = 10_000
/**
 * Per-chunk idle timeout for reading a response body (download, compute result,
 * logs, any multi-frame answer). Deliberately *not* the dial timeout: a node that
 * pauses fifteen seconds between chunks of a large transfer is slow, not dead, and
 * reusing the 10 s dial budget aborted valid transfers. Override with
 * `streamIdleTimeout`.
 */
const STREAM_IDLE_TIMEOUT_MS = 60_000
/**
 * Budget for a DHT `findPeer` walk. Applies to the lookup itself, composed with
 * whatever signal the operation already carries, so the shorter one wins.
 */
const FINDPEER_TIMEOUT_MS = 20_000
/**
 * Default cap on P2P commands in flight at once. A provider fan-out — "ask every
 * provider of this CID for its status" — otherwise bursts as many simultaneous
 * dials as it has providers and starves itself of the connection budget below.
 * Override with `maxConcurrentRequests`.
 */
const DEFAULT_MAX_CONCURRENT_REQUESTS = 8
/**
 * Connection budget for a client. Deliberately small: ocean.js talks to a handful
 * of nodes per operation, it does not index the network, so a large budget only
 * buys idle sockets and dial-queue contention. Override with `maxConnections`.
 *
 * Not *too* small, though: kad-dht keep-alive-tags up to `PEER_SET_SIZE` (20) of
 * its closest peers even in client mode, and the four permanently-tagged bootstrap
 * peers below add to that — 24 connections libp2p intends to keep. The pruner uses
 * tags only for sort order, so a cap under that number prunes tagged connections
 * anyway and the reconnect queue immediately redials them: steady-state churn.
 */
const CLIENT_MAX_CONNECTIONS = 32
/**
 * How long the peer store keeps a peer entry and its addresses, in ms.
 *
 * libp2p's own defaults are a 1 h address lifetime and a 6 h peer lifetime, but a
 * DHT provider record stays valid for 48 h. With the defaults, a provider record
 * found on the DHT routinely names a peer whose addresses the peer store has
 * already discarded, so there is nothing left to dial and the lookup fails even
 * though the record itself is perfectly good.
 *
 * Re-learning the address does not rescue it. When an address that is already
 * stored is stored again, the peer store carries the *previous* `observed`
 * timestamp forward instead of refreshing it, so an unchanged address keeps
 * ageing on its original clock no matter how often identify re-reports it.
 *
 * Matching both values to the 48 h provider-record lifetime keeps an address
 * dialable for exactly as long as the records that point at it. The two are equal
 * on purpose: `maxPeerAge` must be >= `maxAddressAge`, or the peer entry is evicted
 * while its addresses are still inside their own lifetime.
 */
const PEER_STORE_MAX_AGE_MS = 172_800_000
/**
 * Tag applied to the bootstrap peers. The `keep-alive` prefix is load-bearing:
 * libp2p's reconnect queue only redials a peer whose tag name *starts with*
 * `keep-alive`, and `@libp2p/bootstrap`'s own default tag is plain `bootstrap`,
 * which does not qualify. Without this, losing the one-shot bootstrap connection
 * silently strands the client with no DHT entry point.
 */
const BOOTSTRAP_KEEP_ALIVE_TAG = `${KEEP_ALIVE}-ocean-bootstrap`
/**
 * How long `stopP2P()` waits for a node creation it adopted before giving up on it.
 *
 * A stop publishes a barrier that rejects every incoming P2P call until it settles, so
 * an unbounded wait here does not just delay shutdown — it wedges the client for as
 * long as the creation stays stuck, and a creation parked inside `node.start()` behind
 * a hung transport, a slow DNS or bootstrap leg, or a user-supplied service may never
 * settle at all. Giving up is safe: a superseded creation stops the node it built
 * itself, on the generation check at the end of `createLibp2pNode`.
 */
const ADOPTED_CREATION_STOP_TIMEOUT_MS = 5000

/**
 * True in Node.js / Electron's main process, false in a browser page *and* in a
 * Web or Service Worker.
 *
 * Deliberately a positive check for Node rather than `typeof window === 'undefined'`:
 * `window` is also absent in workers, so that test calls a worker "Node" and we then
 * construct `tcp()` (which reaches for `node:net` and throws), treat every multiaddr
 * as dialable and let the connection gater allow loopback/private targets — none of
 * which a worker can do.
 */
function isNodeRuntime(): boolean {
  return typeof process !== 'undefined' && process.versions?.node != null
}

const IPV4_LITERAL = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

/**
 * Wraps a bare IP literal in a multiaddr so libp2p's own `isPrivate` / `isLoopback`
 * can classify it. Returns null for anything that is not an IP literal (a DNS name,
 * an empty string), which those helpers cannot answer for.
 */
function ipLiteralToMultiaddr(host: string): Multiaddr | null {
  if (host === '') return null
  try {
    return multiaddr(IPV4_LITERAL.test(host) ? `/ip4/${host}` : `/ip6/${host}`)
  } catch {
    return null
  }
}

/**
 * A signal that fires after `ms`, or as soon as `opSignal` does — whichever comes
 * first.
 *
 * Deliberately *not* `AbortSignal.any`. A composite built from a long-lived source
 * is registered in that source's internal dependant-signal set and is never pruned
 * from it, not even once the composite's own timeout has fired, so the composite is
 * retained for as long as the source signal lives and the set grows by one entry per
 * call. Measured on this exact call shape: 402 MB retained over 200k composites and
 * `alive 2000/2000` of a sampled batch, where a bare `AbortSignal.timeout` leaves
 * `0/2000`. `dhtLookupSignal` is fed the *caller's* signal, so a server or MCP that
 * holds one `AbortController` per session leaked one composite per DHT fallback for
 * that controller's whole lifetime.
 *
 * A plain `AbortController` has no such set to grow, so the listeners are registered
 * `{ once: true }` and removed by `cleanup()`. Callers MUST call `cleanup()` in a
 * `finally`.
 */
function timeoutSignal(
  opSignal: AbortSignal | undefined,
  ms: number
): { signal: AbortSignal; cleanup: () => void } {
  const timer = AbortSignal.timeout(ms)
  // Nothing to compose, and nothing to clean up: a bare timeout signal is collected
  // as soon as it fires and the caller drops it.
  if (opSignal == null) return { signal: timer, cleanup: () => {} }

  const controller = new AbortController()
  if (opSignal.aborted) {
    controller.abort(opSignal.reason)
    return { signal: controller.signal, cleanup: () => {} }
  }
  const onOpAbort = () => controller.abort(opSignal.reason)
  const onTimeout = () => controller.abort(timer.reason)
  opSignal.addEventListener('abort', onOpAbort, { once: true })
  timer.addEventListener('abort', onTimeout, { once: true })
  return {
    signal: controller.signal,
    cleanup: () => {
      opSignal.removeEventListener('abort', onOpAbort)
      timer.removeEventListener('abort', onTimeout)
    }
  }
}

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
const LP_MAX_FRAME_BYTES = 4 * 1024 * 1024

/**
 * `varint` bytes needed to encode `LP_MAX_FRAME_BYTES`, which is what `lpStream` derives as its
 * `maxLengthLength`. Also the slack on a byte count kept outside `byteStream`: a frame's length
 * prefix is consumed from the read buffer before the frame it belongs to is complete, so such a
 * count can run this far — and no further — ahead of the buffer's real occupancy.
 */
const LP_MAX_LENGTH_PREFIX_BYTES = 4

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
const LP_PAUSE_BUFFER_BYTES = 16 * 1024 * 1024

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
const LP_RESUME_BELOW_BYTES = LP_MAX_FRAME_BYTES + LP_MAX_LENGTH_PREFIX_BYTES

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
const LP_MAX_BUFFER_BYTES = 24 * 1024 * 1024

/**
 * Wraps `stream` in the length-prefixed framing this protocol uses, and makes the stream itself
 * safe to pause. Callers must go through this rather than calling `lpStream()` directly: the
 * defaults it would otherwise take are what silently drop bytes under backpressure.
 */
function lpFramedStream(stream: Stream): ReturnType<typeof lpStream> {
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
function pauseReads(stream: Stream): void {
  if (stream.readStatus === 'readable') {
    stream.pause()
  }
}

/** Counterpart to `pauseReads`: let the transport deliver the next frame. */
function resumeReads(stream: Stream): void {
  if (stream.readStatus === 'paused') {
    stream.resume()
  }
}

/** Bytes `lpStream`'s default varint length-prefix takes for a frame of this size. */
function lpPrefixLength(byteLength: number): number {
  let length = 1
  let value = byteLength
  while (value >= 0x80) {
    value = Math.floor(value / 0x80)
    length++
  }
  return length
}

function toFrameBytes(chunk: Uint8Array | { subarray(): Uint8Array }): Uint8Array {
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
class LpFrameReader {
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

/**
 * Reads one frame under both budgets that apply to a response body: the per-frame idle
 * timeout, and the caller's own signal when it passed one.
 *
 * Frames 2..n used a bare `AbortSignal.timeout(idleTimeout)`, so a caller could cancel
 * a transfer up to its first frame and not afterwards — for a multi-gigabyte download,
 * exactly the wrong way round.
 *
 * The composite comes from `timeoutSignal`, i.e. a local `AbortController` whose
 * listeners are removed in the `finally` below, and never from `AbortSignal.any`: a
 * per-frame composite over a long-lived caller signal adds one uncollectable entry to
 * that signal's dependant set per frame, which on a large transfer is one per chunk.
 */
async function readFrame(
  frames: LpFrameReader,
  opSignal: AbortSignal | undefined,
  idleTimeoutMs: number
): Promise<Uint8Array> {
  const read = timeoutSignal(opSignal, idleTimeoutMs)
  try {
    return await frames.read({ signal: read.signal })
  } finally {
    read.cleanup()
  }
}

/**
 * Tears a response stream down rather than leaving it open with nobody reading it.
 *
 * An abandoned body is not just a local matter: the peer goes on sending into our read
 * buffer, holds its own reader open and keeps the muxer window turning over, so a
 * cancelled download stops nothing at the source. `abort()` is the only lever that
 * closes both directions at once — `close()` leaves the readable end open until the peer
 * closes its own writable end, and `closeRead()` needs a STOP_SENDING that yamux does
 * not implement. It can throw when the stream is already gone, which is exactly the case
 * where there is nothing left to do.
 */
function abortResponseStream(stream: Stream, reason: unknown): void {
  try {
    stream.abort(reason instanceof Error ? reason : new Error(String(reason)))
  } catch {}
}

/**
 * Minimal FIFO concurrency gate. A released slot is handed straight to the next
 * waiter rather than decremented and re-acquired, so the limit cannot be overshot
 * by a caller that arrives between the release and the waiter waking up.
 */
class ConcurrencyGate {
  private inFlight = 0
  private readonly waiting: Array<() => void> = []

  constructor(private readonly limit: () => number) {}

  /** Resolves with an idempotent release function once a slot is free. */
  async acquire(): Promise<() => void> {
    if (this.inFlight < this.limit()) {
      this.inFlight++
    } else {
      // The releaser hands this slot over, so `inFlight` already accounts for it.
      await new Promise<void>((resolve) => this.waiting.push(resolve))
    }
    let released = false
    return () => {
      if (released) return
      released = true
      const next = this.waiting.shift()
      if (next) next()
      else this.inFlight--
    }
  }
}

/**
 * Optional request payload sent as LP frames after the command JSON; ends with an empty LP frame.
 * This mirrors ocean-node's `p2pStreamBody` mechanism introduced for true streaming uploads.
 */
export type P2PRequestBodyStream = AsyncIterable<Uint8Array | ArrayBufferView | string>

function toUint8ArrayChunk(chunk: unknown): Uint8Array {
  if (chunk instanceof Uint8Array) return chunk
  if (typeof chunk === 'string') return new TextEncoder().encode(chunk)
  if (
    chunk &&
    typeof chunk === 'object' &&
    ArrayBuffer.isView(chunk as ArrayBufferView)
  ) {
    const v = chunk as ArrayBufferView
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
  }
  throw new Error('Unsupported chunk type for P2P request body')
}

async function writeP2pRequestBodyLp(
  lp: ReturnType<typeof lpStream>,
  body: P2PRequestBodyStream,
  signal: AbortSignal
): Promise<void> {
  for await (const chunk of body as AsyncIterable<unknown>) {
    await lp.write(toUint8ArrayChunk(chunk), { signal })
  }
  await lp.write(new Uint8Array(0), { signal })
}

// Ocean Protocol public bootstrap nodes (WebSocket addresses)
const DEFAULT_BOOTSTRAP_PEERS = [
  '/dns4/bootstrap1.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmLhRDqfufZiQnxvQs2XHhd6hwkLSPfjAQg1gH8wgRixiP',
  '/dns4/bootstrap2.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmHwzeVw7RpGopjZe6qNBJbzDDBdqtrSk7Gcx1emYsfgL4',
  '/dns4/bootstrap3.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmBKSeEP3v4tYEPsZsZv9VELinyMCsrVTJW9BvQeFXx28U',
  '/dns4/bootstrap4.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmSTVTArioKm2wVcyeASHYEsnx2ZNq467Z4GMDU4ErEPom'
]

/**
 * One provider of a CID, as returned by {@link P2pProvider.getProvidersForString}.
 *
 * `partial` is set on every record of a walk that ended before it finished — the
 * results are real but the set is incomplete, and the reason is logged.
 */
// Re-exported so a consumer can name the element type of `P2pProviderRecord.multiaddrs`
// without taking its own direct dependency on `@multiformats/multiaddr`.
export type { Multiaddr } from '@multiformats/multiaddr'

export interface P2pProviderRecord {
  id: string
  multiaddrs: Multiaddr[]
  partial?: true
  error?: string
}

export interface P2PConfig {
  /**
   * Bootstrap peer multiaddrs for DHT peer discovery.
   * Required when dialing bare peer IDs; defaults to Ocean Protocol's
   * public bootstrap nodes. Ignored if `libp2p.peerDiscovery` is set.
   */
  bootstrapPeers?: string[]
  /** Timeout per dial + stream operation in ms. Default: 10000 */
  dialTimeout?: number
  /** Max retry attempts on connection errors. Default: 5 */
  maxRetries?: number
  /** Base delay between retries in ms. Default: 1000 */
  retryDelay?: number
  /**
   * Timeout for DHT peer lookup when dialing a bare peer ID, in ms. Default: 20000.
   * Intentionally separate from dialTimeout — DHT resolution needs more time than
   * a direct dial. Once a peer is found and connected, subsequent calls skip this.
   * Composed with the operation's own signal, so the shorter of the two wins.
   */
  dhtLookupTimeout?: number
  /**
   * Idle timeout between two frames of a response body, in ms. Default: 60000.
   * Separate from dialTimeout on purpose — a large download or a compute result can
   * legitimately pause between chunks for far longer than a dial may take.
   */
  streamIdleTimeout?: number
  /**
   * Maximum P2P commands in flight at once. Default: 8. Fanning out to more peers
   * than this queues the surplus instead of burst-dialling past `maxConnections`.
   */
  maxConcurrentRequests?: number

  /**
   * Enable TCP transport in addition to WebSockets.
   * Defaults to `true` in Node.js/Electron and `false` in a browser or a Web /
   * Service Worker, where TCP does not exist. Set it explicitly only to override
   * that detection.
   */
  enableTcp?: boolean
  /**
   * Maximum number of simultaneous libp2p connections. Default: 32.
   * A client is not a crawler — raise this only if you fan out to many nodes at once.
   */
  maxConnections?: number
  /**
   * Full libp2p node configuration. Fields provided here override ocean.js
   * defaults (transports, encrypters, services, connectionManager, etc.).
   * Unset fields keep ocean.js defaults.
   */

  libp2p?: Partial<Libp2pOptions>

  /** Additional roles to be marked. Will be used in the future */
  /* Examples:  dashboard, cli , market , etc */
  additionalRoles?: string[]
}

/*
 * Process-wide libp2p singleton.
 *
 * A libp2p node is heavyweight and long-lived — sockets, a DHT routing table, a
 * peerStore, keep-alive timers — so one per process is the right number. This
 * state deliberately lives at module scope rather than on the instance: every
 * `new BaseProvider()` used to build its own `P2pProvider` and therefore its own
 * node, which matters now that libp2p is a runtime dependency every consumer
 * installs whether or not they use P2P.
 */
let sharedP2pConfig: P2PConfig = {}
/**
 * The last configuration that actually produced a live node, and what a failed
 * `setupP2P` restores.
 *
 * A rejected `setupP2P` cannot simply put back whatever it found, because two callers
 * racing each other see each other's half-applied values: the second reads the first's
 * config as "previous", and whichever catch block runs last wins, so both can reject and
 * still leave one of their own values installed. Restoring to the last *applied* config
 * is order-independent — every loser lands on the same value — and it also means a
 * caller that failed alongside one that succeeded restores the winner's config rather
 * than clobbering it. `{}` until the first successful setup, i.e. the defaults.
 */
let sharedAppliedP2pConfig: P2PConfig = {}
let sharedLibp2pNode: Libp2p | null = null
/** In-flight creation, so concurrent callers cannot race two nodes into existence. */
let sharedLibp2pNodePromise: Promise<Libp2p> | null = null
/**
 * Bumped by every `stopP2P()`. A creation that started under an older generation has
 * been superseded and must not publish the node it built — see `createLibp2pNode`.
 */
let sharedLibp2pGeneration = 0
/**
 * The teardown currently running, or null. `getOrCreateLibp2pNode` awaits this
 * before it decides anything, and that is what turns the generation counter into an
 * actual barrier.
 *
 * On its own the counter only guards creations that began *before* the bump. It does
 * nothing about a creation that begins *during* a stop: `stopP2P()` nulls both
 * globals and then awaits, and a caller arriving in that window sees no node, no
 * creation in flight, and a generation its own snapshot will *match* — so it happily
 * publishes a fresh node into a layer that is being torn down.
 */
let sharedStopInFlight: Promise<void> | null = null

let sharedP2pProvider: P2pProvider | null = null

/** Process-wide command budget, shared because the libp2p node is shared. */
const p2pCommandGate = new ConcurrencyGate(() => {
  // Clamped, and deliberately so. `inFlight < 0` is never true and nothing ever
  // releases a slot that was never taken, so a consumer reading
  // `maxConcurrentRequests: 0` as "no limit" — a plausible reading — used to wedge
  // the client permanently on its very first P2P call. A value that is not a usable
  // finite number falls back to the default rather than to a deadlocked gate.
  const configured = sharedP2pConfig.maxConcurrentRequests
  if (typeof configured !== 'number' || !Number.isFinite(configured)) {
    return DEFAULT_MAX_CONCURRENT_REQUESTS
  }
  return Math.max(1, Math.floor(configured))
})

/**
 * The process-wide `P2pProvider`. Every `BaseProvider` uses this one instance, so
 * `setupP2P()` / `stopP2P()` mean the same thing no matter which provider object
 * they were called on.
 */
export function getSharedP2pProvider(): P2pProvider {
  sharedP2pProvider ??= new P2pProvider()
  return sharedP2pProvider
}

export class P2pProvider {
  private get p2pConfig(): P2PConfig {
    return sharedP2pConfig
  }

  private set p2pConfig(config: P2PConfig) {
    sharedP2pConfig = config
  }

  private get appliedP2pConfig(): P2PConfig {
    return sharedAppliedP2pConfig
  }

  private set appliedP2pConfig(config: P2PConfig) {
    sharedAppliedP2pConfig = config
  }

  private get libp2pNode(): Libp2p | null {
    return sharedLibp2pNode
  }

  private set libp2pNode(node: Libp2p | null) {
    sharedLibp2pNode = node
  }

  /**
   * Configure the internal libp2p node used for P2P transport.
   * Call this once before making P2P requests, e.g.:
   *   ProviderInstance.setupP2P({ bootstrapPeers: ['/ip4/1.2.3.4/tcp/9000/ws/p2p/16Uiu2...'] })
   *
   * Required when using bare peer IDs as nodeUri — the bootstrap peers
   * provide DHT entry points so the peer can be located.
   */
  public async setupP2P(config: P2PConfig): Promise<void> {
    // Reconfiguring replaces the node, so shut the old one down properly instead
    // of dropping the reference and leaking its sockets and relay reservations.
    await this.stopP2P()
    // A rejected `setupP2P` must not leave its configuration installed. The config is
    // process-wide and `createLibp2pNode` reads it synchronously while building the node,
    // so it has to be assigned before that call — which means a failure has to undo the
    // assignment. Otherwise a `setupP2P` that *rejects* still installs the failed
    // caller's `bootstrapPeers`, its `libp2p` overrides (`privateKey`, a
    // `denyDialMultiaddr` gater) and its timeouts, and the next lazy call builds a node
    // from them.
    //
    // What it rolls back to is the last *applied* config, not whatever was there on
    // entry — see `sharedAppliedP2pConfig`.
    this.p2pConfig = config
    try {
      await this.getOrCreateLibp2pNode()
    } catch (err) {
      this.p2pConfig = this.appliedP2pConfig
      throw err
    }
    this.appliedP2pConfig = config
  }

  public async getMultiaddrFromPeerId(peerId: string): Promise<string> {
    const appendedPeerId = (peerId: string) =>
      peerId.includes('/p2p/') ? peerId : `${peerId}/p2p/${peerId}`
    const node = await this.getOrCreateLibp2pNode()

    // Check existing connections — remoteAddr.toString() gives the full multiaddr
    const connection = node
      .getConnections()
      .find((c) => c.remotePeer.toString() === peerId)
    if (connection?.remoteAddr) {
      const addr = connection.remoteAddr.toString()
      return appendedPeerId(addr)
    }

    // Check peerStore (populated by peer:discovery, DHT, and connections)
    try {
      const peerData = await node.peerStore.get(peerIdFromString(peerId))
      if (peerData?.addresses?.length > 0) {
        const addr = peerData.addresses[0].multiaddr.toString()
        return appendedPeerId(addr)
      }
    } catch {}

    // DHT lookup as last resort
    const dht = node.services.dht as KadDHT
    const lookup = this.dhtLookupSignal()
    try {
      for await (const event of dht.findPeer(peerIdFromString(peerId), {
        signal: lookup.signal
      })) {
        if (event.type === EventTypes.FINAL_PEER && event.peer.multiaddrs.length > 0) {
          const addr = event.peer.multiaddrs[0].toString()
          return appendedPeerId(addr)
        }
      }
    } finally {
      lookup.cleanup()
    }

    throw new Error(`No multiaddrs found for peer id ${peerId}`)
  }

  /** Returns the underlying libp2p node instance, or null if P2P is not initialized. */
  public getLibp2pNode(): Libp2p | null {
    return this.libp2pNode ?? null
  }

  /**
   * Tear the P2P layer down: close open connections, stop the libp2p node and clear
   * it so nothing keeps the process alive.
   *
   * Long-lived Node.js consumers should call this on shutdown — an unstopped node
   * holds sockets, timers and DHT state open indefinitely. (It holds no circuit-relay
   * reservation to drop: ocean.js listens on nothing — `addresses: { listen: [] }` —
   * so it never listens on `/p2p-circuit` and only ever *dials* through a relay.)
   *
   * Safe to call when P2P was never started, and safe to call more than once. A
   * later P2P call lazily creates a fresh node from the same configuration.
   */
  public async stopP2P(): Promise<void> {
    // Publish this teardown as a barrier that `getOrCreateLibp2pNode` awaits, and
    // chain it behind any stop already running — otherwise a second concurrent stop
    // would overwrite the barrier and a caller released by the first one could still
    // publish a node into a teardown that has not finished.
    //
    // `tearDownLibp2p` bumps the generation and nulls both globals before its first
    // `await`, and the assignment below runs in that same synchronous block, so
    // nothing can observe the globals in between.
    const previous = sharedStopInFlight
    const teardown = this.tearDownLibp2p(previous)
    sharedStopInFlight = teardown
    try {
      await teardown
    } finally {
      if (sharedStopInFlight === teardown) sharedStopInFlight = null
    }
  }

  private async tearDownLibp2p(previous: Promise<void> | null): Promise<void> {
    // Invalidate any creation already in flight before adopting it. `sharedLibp2pNode`
    // is assigned only *after* `await node.start()`, so mid-creation there is nothing
    // here to stop yet: without adopting the promise we would stop nothing, the
    // creation would then publish its node into the module global — resurrecting it
    // after shutdown — and the process would never exit.
    sharedLibp2pGeneration++
    const pending = sharedLibp2pNodePromise
    sharedLibp2pNodePromise = null
    const node = this.libp2pNode
    this.libp2pNode = null

    // Everything above is synchronous. From here on we may await, and the barrier is
    // already visible to `getOrCreateLibp2pNode`.
    if (previous != null) await previous.catch(() => {})

    // A creation that sees the bumped generation stops its own node and rejects, so a
    // rejection here means there is nothing left of it to stop.
    //
    // Bounded, for the reason given on `ADOPTED_CREATION_STOP_TIMEOUT_MS`: waiting
    // without a deadline while the stop barrier is up turns one stuck creation into a
    // permanently unusable client. The timer is unref'd so it cannot itself keep a
    // Node.js process alive after a shutdown that is otherwise complete — which is the
    // very thing `stopP2P` exists to allow.
    const pendingNode =
      pending == null
        ? null
        : await Promise.race([
            pending.catch(() => null),
            new Promise<null>((resolve) => {
              const timer: any = setTimeout(
                () => resolve(null),
                ADOPTED_CREATION_STOP_TIMEOUT_MS
              )
              timer?.unref?.()
            })
          ])

    const nodes = new Set<Libp2p>()
    if (node) nodes.add(node)
    if (pendingNode) nodes.add(pendingNode)

    for (const target of nodes) {
      try {
        // No hand-rolled connection-close loop here. libp2p's own
        // `ConnectionManager.stop()` already closes every tracked connection with
        // `AbortSignal.timeout(500)` and aborts whatever misses that deadline,
        // whereas a loop of `conn.close()` passes no AbortOptions and waits on
        // 'idle'/'drain' unbounded — one peer that stops reading would hang shutdown
        // before `node.stop()` ever ran.
        await target.stop()
      } catch (err: any) {
        LoggerInstance.debug(`[P2P] error while stopping libp2p node: ${err?.message}`)
      }
    }
  }

  /** Alias for {@link stopP2P}, for callers that expect a `dispose()` convention. */
  public async dispose(): Promise<void> {
    return this.stopP2P()
  }

  /** Returns all peers known to the peerStore (discovered via bootstrap, DHT, or connections). */
  public async getDiscoveredNodes(): Promise<
    Array<{ peerId: string; multiaddrs: string[] }>
  > {
    if (!this.libp2pNode) return []
    const allPeers = await this.libp2pNode.peerStore.all()
    return allPeers.map((peer) => ({
      peerId: peer.id.toString(),
      multiaddrs: peer.addresses.map((a) => a.multiaddr.toString())
    }))
  }

  private bufToHex(val: any): string {
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val)
      } catch {
        return val
      }
    }
    if (val?.type === 'Buffer' && Array.isArray(val.data)) {
      return new TextDecoder().decode(new Uint8Array(val.data))
    }
    if (val instanceof Uint8Array) {
      return new TextDecoder().decode(val)
    }
    return val
  }

  /**
   * Handler for the `/ocean/client/*` protocols. We advertise them over identify so
   * peers can tell what we are, but we do not serve inbound commands yet — so tear
   * the inbound stream down in *both* directions immediately.
   *
   * `close()` is not enough: it closes only the writable end, and the readable end
   * stays open until the remote closes its own writable end. That half-open stream
   * keeps buffering whatever the peer sends until `maxReadBufferLength` forces a
   * reset, and holds one of the `maxInboundStreams` slots for this protocol until
   * then. `closeRead()` cannot fix it either — it needs muxer support for
   * STOP_SENDING, and yamux's `sendCloseRead` is a no-op. So reset the stream: it is
   * immediate, needs no timeout signal (nothing to flush, nothing to await), frees
   * the slot on both sides and tells the peer accurately that we serve nothing here.
   */
  private async handleProtocolCommands(stream: Stream) {
    try {
      stream.abort(new Error('ocean.js client does not accept inbound streams'))
    } catch {}
  }

  private async getOrCreateLibp2pNode(): Promise<Libp2p> {
    // Read both before anything is awaited, so this snapshot is taken in the same
    // synchronous block as the call itself.
    const entryGeneration = sharedLibp2pGeneration
    let stopping = sharedStopInFlight
    let waitedForStop = false

    // Wait out any teardown already running. Each distinct barrier is awaited at most
    // once, so this terminates even if further stops arrive while we wait.
    while (stopping != null) {
      waitedForStop = true
      await stopping.catch(() => {})
      const next = sharedStopInFlight
      stopping = next === stopping ? null : next
    }

    // Having had to wait means this call was issued *before* the teardown finished,
    // so it belongs to the epoch being torn down and must not build a node. Creating
    // one here is what kept the two reproduced defects alive: it resurrects the
    // module global after `dispose()`, and the process then never exits; and when the
    // stop came from `setupP2P` it publishes a node built from the config being
    // replaced, which `setupP2P` then adopts through its own fast path and reports as
    // success — silently dropping the caller's `bootstrapPeers` and gater overrides.
    //
    // A call issued after a stop has fully settled sees no barrier here and lazily
    // creates a fresh node, exactly as `stopP2P` documents.
    if (waitedForStop || entryGeneration !== sharedLibp2pGeneration) {
      // Wording is load-bearing: `sendP2pCommand` retries on messages containing
      // 'closed' or 'reset', and this must not look like either.
      throw new Error('P2P was stopped while this operation was waiting for the node')
    }

    if (sharedLibp2pNode) return sharedLibp2pNode
    if (sharedLibp2pNodePromise == null) {
      const creation = this.createLibp2pNode()
      sharedLibp2pNodePromise = creation
      // A failed start must not poison every later call — but only clear the pointer
      // if it still refers to *this* creation, or we would drop a newer one.
      creation.catch(() => {
        if (sharedLibp2pNodePromise === creation) sharedLibp2pNodePromise = null
      })
    }
    return sharedLibp2pNodePromise
  }

  private async createLibp2pNode(): Promise<Libp2p> {
    const generation = sharedLibp2pGeneration
    const bootstrapAddrs = (this.p2pConfig.bootstrapPeers ?? DEFAULT_BOOTSTRAP_PEERS).map(
      multiaddr
    )

    const node = await createLibp2p({
      addresses: { listen: [] },
      transports: [
        webSockets(),
        circuitRelayTransport(),
        // TCP is on by default outside a browser, off inside one (it does not
        // exist there). Node then reaches nodes over plain TCP and a browser
        // uses secure WebSockets, without the caller configuring anything.
        ...((this.p2pConfig.enableTcp ?? isNodeRuntime()) ? [tcp()] : [])
      ],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      peerDiscovery: [
        ...(bootstrapAddrs.length > 0
          ? [
              bootstrap({
                list: bootstrapAddrs.map(String),
                timeout: 10000,
                tagName: BOOTSTRAP_KEEP_ALIVE_TAG
              })
            ]
          : [])
      ],
      services: {
        identify: identify(),
        identifyPush: identifyPush(),
        ping: ping(),
        dht: kadDHT({
          peerInfoMapper: passthroughMapper,
          allowQueryWithZeroPeers: false,
          kBucketSize: 20,
          protocol: OCEAN_DHT_PROTOCOL,
          // Client mode is the correct setting for a library consumer: we query
          // the DHT but never serve records for other peers. It is also *pinned*:
          // libp2p only installs its automatic client/server switch when this
          // option is omitted, so passing it explicitly means an app embedding
          // ocean.js can never be promoted to a DHT server behind its back.
          clientMode: true
        })
      },
      connectionGater: { denyDialMultiaddr: (ma) => this.denyDialMultiaddr(ma) },
      connectionManager: {
        maxConnections: this.p2pConfig.maxConnections ?? CLIENT_MAX_CONNECTIONS
      },
      connectionMonitor: { abortConnectionOnPingFailure: false },
      peerStore: {
        maxAddressAge: PEER_STORE_MAX_AGE_MS,
        maxPeerAge: PEER_STORE_MAX_AGE_MS
      },
      // User-supplied config overrides all defaults above.
      // Cast needed: services generics can't be inferred through a Partial<Libp2pOptions> spread.
      ...(this.p2pConfig.libp2p as any)
    })

    await node.start()

    // A `stopP2P()` that landed while we were starting bumped the generation, so this
    // node has already been superseded. Publishing it now would leave two live nodes
    // — one of them unreachable and never stopped — and resurrect the module global
    // after shutdown, which is what keeps the process alive forever. Stop what we
    // built instead and reject; `stopP2P()` adopts this promise and treats the
    // rejection as "nothing left to stop".
    if (generation !== sharedLibp2pGeneration) {
      try {
        await node.stop()
      } catch (err: any) {
        LoggerInstance.debug(
          `[P2P] error while stopping a superseded libp2p node: ${err?.message}`
        )
      }
      throw new Error('P2P was stopped while the libp2p node was starting')
    }

    // No `peer:discovery` auto-dial: a client must not crawl the network. Peers
    // are dialled lazily from `getConnection()`, for the specific target of the
    // request that needs them.

    this.libp2pNode = node
    // all implementations are clients
    this.libp2pNode.handle('/ocean/client/1.0.0', this.handleProtocolCommands)
    const additionalRoles = this.p2pConfig.additionalRoles ?? []
    for (const role of additionalRoles) {
      this.libp2pNode.handle(`/ocean/client/${role}/1.0.0`, this.handleProtocolCommands)
    }
    return node
  }

  public async cidFromRawString(data: string) {
    const hash = await sha256.digest(uint8ArrayFromString(data))
    const cid = CID.create(1, multiFormatRaw.code, hash)
    return cid
  }

  /**
   * Providers of a CID derived from `input`, as found on the DHT.
   *
   * A walk that ends early — the signal fired, the deadline passed, routing failed —
   * still yields whatever it found before that, and those results are usable, so they
   * are returned rather than discarded. The failure is logged and every record from a
   * cut-short walk is flagged `partial`, so an empty array with nothing logged means
   * "no providers" while an empty array with a logged error means "the lookup broke".
   */
  async getProvidersForString(
    input: string,
    signal?: AbortSignal
  ): Promise<P2pProviderRecord[]> {
    const node = await this.getOrCreateLibp2pNode()
    const cid = await this.cidFromRawString(input)
    const peersFound: Array<{ id: PeerId; multiaddrs: Multiaddr[] }> = []
    let failure: string | null = null
    try {
      for await (const result of node.contentRouting.findProviders(cid, {
        useCache: false,
        useNetwork: true,
        signal
      })) {
        peersFound.push(result)
      }
    } catch (err: any) {
      failure = err?.message ?? String(err)
      LoggerInstance.error(
        `[P2P] findProviders for "${input}" (${cid.toString()}) ended early after ` +
          `${peersFound.length} provider(s): ${failure}`
      )
    }
    return peersFound.map((peer) => ({
      id: peer.id.toString(),
      multiaddrs: peer.multiaddrs,
      ...(failure == null ? {} : { partial: true as const, error: failure })
    }))
  }

  /**
   * True when the page we are running in is itself served from a local origin,
   * i.e. the barge / `http://localhost` development case, where dialing a
   * loopback or LAN node is legitimate.
   */
  private isLocalPageOrigin(): boolean {
    if (typeof location === 'undefined') return false
    if (location.protocol === 'file:') return true
    const host = (location.hostname ?? '').replace(/^\[|\]$/g, '')
    // Fail *closed* on a host-less origin. `file:` is the only origin that is
    // genuinely local without a host, and it already returned true above. Every other
    // host-less origin is opaque — `data:`, `blob:`, `about:srcdoc` — and since
    // `isDialable` only asks this question together with `protocol !== 'https:'`,
    // answering "local" for them permitted plain-`ws` dials to loopback and RFC1918
    // from a document whose provenance we know nothing about.
    if (host === '') return false
    if (host === 'localhost' || host.endsWith('.localhost')) return true
    // mDNS name — a barge box on the same LAN
    if (host === 'local' || host.endsWith('.local')) return true
    // A page served from a private LAN address is every bit as local as one served
    // from loopback, and treating it as a remote browser breaks the ordinary
    // development case: `vite --host`, open http://192.168.1.20:5173 on a phone, and
    // the node at /ip4/192.168.1.20/tcp/9001/ws must still be dialable.
    const ip = ipLiteralToMultiaddr(host)
    return ip != null && (isLoopback(ip) || isPrivate(ip))
  }

  /**
   * Replaces libp2p's default dial gater, which refuses private and loopback
   * addresses whenever the *browser* build is loaded. That build is also what a
   * bundler picks for Node/Electron targets, so the default silently blocks
   * plain-`ws` and local-node dials in environments that can perfectly well make
   * them — which is why this override exists at all.
   *
   * So: allow everything outside a browser, allow local targets when the page
   * itself is local, and only in a genuine remote browser page refuse loopback /
   * private addresses, which are unreachable from there anyway.
   */
  private denyDialMultiaddr(ma: Multiaddr): boolean {
    if (isNodeRuntime()) return false
    if (this.isLocalPageOrigin()) return false
    return isLoopback(ma) || isPrivate(ma)
  }

  private isDialable(ma: Multiaddr): boolean {
    // Node.js can dial any transport (TCP, WS, WSS)
    if (isNodeRuntime()) return true

    // A browser — or a worker — can only use TLS-secured WebSockets. ocean-node
    // advertises all three spellings depending on how the listener was configured:
    // `/wss`, the expanded `/tls/ws`, and autoTLS's `/tls/sni/<host>/ws`. `/wss` is
    // *not* normalised to `/tls/ws` (`multiaddr('/ip4/1.2.3.4/tcp/9005/wss')` keeps
    // `wss` in `toString()`), so all three have to be recognised.
    //
    // The matcher does that, and unlike the substring test it replaces it does not
    // mistake `/dnsaddr/wss.example.com/tcp/9001/ws` — plain, insecure ws whose *host*
    // merely starts with "wss" — for a secure address. `matches` rather than
    // `exactMatch` so a relayed `…/wss/p2p/<relay>/p2p-circuit/p2p/<peer>` address
    // still qualifies; circuit addresses are filtered separately.
    if (WebSocketsSecure.matches(ma)) return true

    // Plain `ws` is still reachable from a page that is itself local and not served
    // over https — the barge / `vite --host` development case. This is the other half
    // of the gater's decision: letting the dial past the gater achieves nothing if the
    // address is filtered out here first. Anything else is mixed content, which the
    // browser blocks regardless of what we decide.
    return (
      this.isLocalPageOrigin() && location.protocol !== 'https:' && WebSockets.matches(ma)
    )
  }

  /**
   * True when the multiaddr does not include the relay `p2p-circuit` protocol segment.
   * (Direct / transport paths omit it; relay paths contain `/p2p-circuit/...`.)
   */
  private isNotP2PCircuit(ma: Multiaddr): boolean {
    return !/\/p2p-circuit(\/|$)/.test(ma.toString())
  }

  private peerIdFromMultiaddr(ma: Multiaddr): string | null {
    const parts = ma.toString().split('/p2p/')
    if (parts.length <= 1) return null
    // Strip trailing protocol components like /p2p-circuit
    const raw = parts[parts.length - 1]
    return raw.split('/')[0] || null
  }

  /**
   * Budget for a DHT walk. `dhtLookupTimeout` was documented and defaulted here from
   * the start, but the line applying it was commented out — so a lookup silently ran
   * on whatever signal the operation carried: the dial timeout, far too short for a
   * multi-hop walk, or no signal at all, in which case kad-dht's own 180 s default
   * applied. Composed with the operation signal when there is one, so whichever
   * expires first wins.
   */
  private dhtLookupSignal(opSignal?: AbortSignal): {
    signal: AbortSignal
    cleanup: () => void
  } {
    return timeoutSignal(opSignal, this.p2pConfig.dhtLookupTimeout ?? FINDPEER_TIMEOUT_MS)
  }

  /** Idle timeout between two frames of a response body. */
  private streamIdleTimeoutMs(): number {
    return this.p2pConfig.streamIdleTimeout ?? STREAM_IDLE_TIMEOUT_MS
  }

  /* Dials a new connection */
  private async getConnection(
    nodeUri: OceanNode,
    signal: AbortSignal,
    includeP2PCircuit: boolean = false
  ): Promise<Connection> {
    const node = await this.getOrCreateLibp2pNode()
    const hasDialable = () => addrs.some((ma) => this.isDialable(ma))
    let peerId: PeerId | null = null
    const addrs: Multiaddr[] = []
    if (nodeUri && typeof nodeUri === 'string') {
      try {
        const addr = multiaddr(nodeUri)
        addrs.push(addr)
        if (!peerId) {
          const pidStr = this.peerIdFromMultiaddr(addr)
          if (pidStr) peerId = peerIdFromString(pidStr)
        }
      } catch {}
      try {
        if (!peerId) peerId = peerIdFromString(nodeUri)
      } catch {}
    }
    if (typeof nodeUri === 'object' && nodeUri !== null && !Array.isArray(nodeUri)) {
      if ('nodeId' in nodeUri || 'multiaddress' in nodeUri) {
        const nodeP2p = nodeUri as NodeP2P
        if (Array.isArray(nodeP2p.multiaddress) && nodeP2p.multiaddress.length > 0) {
          for (const addr of nodeP2p.multiaddress) addrs.push(addr)
        }
        if (nodeP2p.nodeId) {
          try {
            peerId = peerIdFromString(nodeP2p.nodeId)
          } catch {}
        }
      } else {
        peerId = nodeUri as PeerId
      }
    }

    // check if we already have a connection
    if (peerId) {
      const existing = node.getConnections(peerId).filter((c) => c.status === 'open')
      if (existing.length > 0) {
        LoggerInstance.debug(
          `[P2P] ${peerId.toString()}: reusing existing connection via ${
            existing[0].remoteAddr
          }`
        )
        return existing[0]
      }
    }
    // if there are no dialable ma, search peerstore
    if (!hasDialable() && peerId) {
      try {
        const peerData = await node.peerStore.get(peerId)
        if (peerData?.addresses) {
          for (const addr of peerData.addresses) {
            addrs.push(addr.multiaddr)
          }
          LoggerInstance.debug(
            `[P2P] ${peerId.toString()}: ${peerData.addresses.length} peerStore addrs`
          )
        }
      } catch {
        LoggerInstance.debug(`[P2P] ${peerId.toString()}: not in peerStore`)
      }
    }
    // if there are no dialable ma, search dht
    if (!hasDialable() && peerId) {
      const lookup = this.dhtLookupSignal(signal)
      try {
        const peerInfo = await node.peerRouting.findPeer(peerId, {
          signal: lookup.signal
        })
        for (const ma of peerInfo.multiaddrs) addrs.push(ma)
        LoggerInstance.debug(
          `[P2P] ${peerId.toString()}: DHT returned ${peerInfo.multiaddrs.length} addrs`
        )
      } catch (err: any) {
        LoggerInstance.debug(
          `[P2P] ${peerId.toString()}: DHT findPeer failed: ${err.message}`
        )
      } finally {
        // Drops this composite's listeners on the caller's signal. Without it a
        // caller that holds one AbortController for a whole session accumulates one
        // uncollectable composite per DHT fallback.
        lookup.cleanup()
      }
    }
    let dialable = addrs.filter((ma) => this.isDialable(ma))
    const beforePFilter = dialable.length
    if (!includeP2PCircuit) dialable = dialable.filter((ma) => this.isNotP2PCircuit(ma))

    const afterPFilter = dialable.length

    if (dialable.length < 1) {
      // try with p2p-circuits if available
      if (!includeP2PCircuit && afterPFilter < beforePFilter) {
        // we have some p2p-circuit addrs, let's try them
        return this.getConnection(
          { nodeId: peerId ? peerId.toString() : '', multiaddress: addrs } as NodeP2P,
          signal,
          true
        )
      }
      // Distinguish "the peer advertised nothing" from "the peer advertised only
      // addresses a browser is not allowed to dial" — the second is by far the
      // more common and the generic message sends people looking in the wrong place.
      if (!isNodeRuntime() && addrs.length > 0) {
        throw new Error(
          `No TLS/WSS address advertised for this peer${
            peerId ? ` (${peerId.toString()})` : ''
          } — browsers require WSS. Advertised: ${addrs.map(String).join(', ')}`
        )
      }
      throw new Error('No valid multiaddresses, cannot connect')
    }
    // normalize all mas if we have peerId
    if (peerId) {
      dialable = dialable.map((ma) => {
        const str = ma.toString()
        return str.includes('/p2p/') ? ma : multiaddr(`${str}/p2p/${peerId.toString()}`)
      })
    }
    try {
      const conn = await node.dial(dialable, { signal })
      LoggerInstance.debug(
        `[P2P] Dial SUCCESS via ${conn.remoteAddr} (limited=${conn.limits != null})`
      )
      return conn
    } catch (err: any) {
      if (!includeP2PCircuit && afterPFilter < beforePFilter) {
        LoggerInstance.debug(
          `[P2P] Direct dial failed, falling back to relayed addresses...`
        )
        return this.getConnection(
          { nodeId: peerId ? peerId.toString() : '', multiaddress: addrs } as NodeP2P,
          signal,
          true
        )
      }
      throw new Error(
        `Cannot dial peer ${peerId?.toString()}. ` +
          (addrs.length > 0
            ? `Found addrs: ${addrs.map(String).join(', ')}. `
            : 'No addresses found. ') +
          `Active connections: ${node.getConnections().length}. ` +
          err.message
      )
    }
  }

  private async getNodePublicKey(nodeUri: OceanNode): Promise<string> {
    const status = await this.getNodeStatus(nodeUri)
    return status?.publicKey
  }

  protected getAuthorization(s: SignerOrAuthTokenOrSignature) {
    return getAuthorization(s)
  }

  private async getSignedCommandParams(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    command: string,
    signal?: AbortSignal
  ): Promise<CompleteSignature> {
    if (isAgentSignature(signerOrAuthToken)) {
      return {
        consumerAddress: signerOrAuthToken.consumerAddress,
        nonce: signerOrAuthToken.nonce,
        signature: signerOrAuthToken.signature
      }
    }
    if (typeof signerOrAuthToken === 'string') {
      return {
        consumerAddress: await getConsumerAddress(signerOrAuthToken),
        nonce: undefined,
        signature: undefined
      }
    }
    const consumerAddress = await getConsumerAddress(signerOrAuthToken)
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()
    const signature = await getSignature(signerOrAuthToken, nonce, command)
    return { consumerAddress, nonce, signature }
  }

  /**
   * Dial the peer, send the command, and read the first response frame.
   *
   * The process-wide concurrency gate is taken **here**, not in `sendP2pCommand`.
   * `getDownloadUrl` and `getComputeResult` dial through this method directly and
   * used to take no slot at all — precisely the long-lived bulk transfers that hold a
   * connection for minutes, so a fan-out of 20 downloads still burst 20 simultaneous
   * dials against a 32-connection budget of which ~24 are keep-alives.
   *
   * The slot is handed back to the caller as `release` rather than freed when this
   * function returns. Callers MUST call `release()` once they are done with the response
   * — from a generator's `finally` for a streaming reply, from a `finally` around the
   * read loop for a buffered one. It is idempotent, so releasing twice is harmless.
   *
   * A listener on the stream's 'close' event releases it as well, and that is a
   * leak-guard, not a hand-off. 'close' fires once the stream is finished in both
   * directions, which for any reply small enough to fit in the read buffer — the common
   * case — happens *before* the consumer has read a single frame, so it is usually the
   * 'close' listener that frees the slot and not the consumer. What this gate therefore
   * bounds is dials, streams and in-flight first frames, which is what protects the
   * connection budget: measured peak inbound streams is exactly the limit at 1, 2 and 8
   * across every heavy operation. It does not bound how many finished-but-undrained
   * response bodies a caller may be holding — at a limit of 8, up to 11 consumers were
   * observed iterating a body at once.
   *
   * Deliberately not the other way round. Releasing only from the consumer's `finally`
   * would make the slot travel with the body, at the cost of two worse failures: a
   * caller that holds a body while issuing another P2P call deadlocks against itself at
   * low limits, and a response that is never iterated at all strands its slot for good.
   */
  private async dialAndStream(
    nodeUri: OceanNode,
    payload: Record<string, any>,
    signal?: AbortSignal,
    requestBody?: P2PRequestBodyStream
  ): Promise<{
    lp: ReturnType<typeof lpStream>
    firstBytes: Uint8Array
    frames: LpFrameReader
    connection: Connection
    // Returned so every read loop can apply backpressure around its own consumer — see
    // `pauseReads`. Reads are already paused when this resolves.
    stream: Stream
    release: () => void
  }> {
    const release = await p2pCommandGate.acquire()
    let connection: Connection | undefined
    try {
      const opSignal =
        signal ??
        AbortSignal.timeout(this.p2pConfig.dialTimeout ?? DEFAULT_DIAL_TIMEOUT_MS)
      connection = await this.getConnection(nodeUri, opSignal)
      const stream = await connection.newStream(OCEAN_P2P_PROTOCOL, {
        signal: opSignal,
        runOnLimitedConnection: true
      })
      // Leak-guard for the slot — see the note above on what this gate bounds. 'close'
      // fires once the underlying stream is done in both directions, so an abandoned
      // response cannot hold a slot forever.
      stream.addEventListener('close', () => release(), { once: true })
      const lp = lpFramedStream(stream)
      // Same tick as `lpStream`, so the reader's byte accounting cannot miss a
      // message: nothing can be dispatched between the two listeners attaching.
      const frames = new LpFrameReader(lp, stream)

      let outboundPayload = payload
      if (requestBody) {
        outboundPayload = { ...payload, p2pStreamBody: true }
      }

      await lp.write(new TextEncoder().encode(JSON.stringify(outboundPayload)), {
        signal: opSignal
      })
      if (requestBody) {
        await writeP2pRequestBodyLp(lp, requestBody, opSignal)
      }
      await stream.close()

      // Time-to-first-frame belongs on the idle budget, not the dial budget. On
      // `opSignal` the peer had to produce its status frame within 10 s of the dial —
      // and for a download or a compute result that frame is exactly what a node
      // doing an object-store lookup is slowest to produce, so frames 2..n got the
      // generous timeout while frame 1 kept the tight one. The caller's own signal is
      // still honoured, whichever expires first.
      const firstRead = timeoutSignal(signal, this.streamIdleTimeoutMs())
      let firstBytes: Uint8Array
      try {
        firstBytes = await frames.read({ signal: firstRead.signal })
      } finally {
        firstRead.cleanup()
      }
      // The caller gets the status frame back before anything iterates the body, and it may
      // not start iterating in this tick, so hold the transport until a read loop asks for the
      // next frame — otherwise the peer fills the read buffer in the gap and the overflow
      // drops it. Every loop below calls `resumeReads` before each read.
      pauseReads(stream)

      return { lp, firstBytes, frames, connection, stream, release }
    } catch (err: any) {
      release()
      // Evict the connection so retries get a fresh on
      try {
        connection?.abort(new Error('stream failed'))
      } catch {}
      throw err
    }
  }

  private async sendP2pCommand(
    nodeUri: OceanNode,
    command: string,
    body: Record<string, any>,
    signerOrAuthToken?: SignerOrAuthTokenOrSignature | null,
    signal?: AbortSignal,
    retrialNumber: number = 0,
    requestBody?: P2PRequestBodyStream
  ): Promise<any> {
    // The concurrency slot is owned by `dialAndStream` now — see the comment there.
    // This method only decides *when* to hand it back: at the end of the buffered read
    // loop, or when a streaming generator finishes. It must not acquire a slot of its
    // own, or a recursive retry would hold two and the gate would deadlock against
    // itself at low limits. The slot is still released before each retry so a
    // recursive attempt queues behind other callers rather than jumping the line.
    let releaseSlot: (() => void) | null = null
    let slotOwnedByStream = false
    try {
      const payload = {
        command,
        authorization: signerOrAuthToken
          ? this.getAuthorization(signerOrAuthToken)
          : undefined,
        ...body
      }

      const dialed = await this.dialAndStream(nodeUri, payload, signal, requestBody)
      releaseSlot = dialed.release
      const { firstBytes, frames, stream } = dialed
      const idleTimeout = this.streamIdleTimeoutMs()

      if (!firstBytes.length) {
        throw new Error('Gateway node error: no response from peer')
      }

      // parse inside the `try`, decide outside it. The `throw` used to sit
      // *inside* a `try` whose `catch {}` was empty, so it was dead code: a status
      // frame of `{"httpStatus":500}` was swallowed. Buffered replies were rescued by
      // the identical check further down, but the three streaming commands were not —
      // they handed the error envelope to the consumer as the first data chunk.
      let status: Record<string, any> | null = null
      try {
        status = JSON.parse(new TextDecoder().decode(firstBytes))
      } catch {
        // Not JSON: the first frame is data, not a status envelope.
      }
      if (typeof status?.httpStatus === 'number' && status.httpStatus >= 400) {
        // Same message shaping as the buffered check below, so error text does not
        // change for the paths that were already covered.
        throw new Error(
          typeof status.error === 'string'
            ? status.error
            : status.error != null
              ? JSON.stringify(status.error)
              : `Gateway node error: ${status.httpStatus}`
        )
      }

      if (
        command === PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS ||
        command === PROTOCOL_COMMANDS.SERVICE_GET_STREAMABLE_LOGS ||
        command === PROTOCOL_COMMANDS.COMPUTE_GET_RESULT
      ) {
        // The slot is released from the generator's `finally`, which also runs when the
        // consumer `break`s out of a `for await`. The 'close' leak-guard in
        // `dialAndStream` often gets there first for a short reply — see the note there
        // on what the gate actually bounds.
        slotOwnedByStream = true
        const slot = dialed.release
        const streamableChunks = (async function* () {
          let completed = false
          try {
            while (true) {
              // Flow control. Reads are held while the consumer works on a frame, and are
              // only let go again once the backlog we are already holding has drained below
              // the mark — see `LP_RESUME_BELOW_BYTES`. Without this the peer fills the read
              // buffer at its own pace and `byteStream` silently drops the entire backlog past
              // `maxBufferSize`, which desynchronises the frame parser: the consumer is handed
              // corrupt, out-of-sequence frames for a while before the end-of-stream
              // accounting throws.
              if (frames.pendingBytes <= LP_RESUME_BELOW_BYTES) {
                resumeReads(stream)
              }
              // The caller's signal is composed into every frame read, not just the
              // first, so a transfer can be cancelled while it is running.
              const chunk = await readFrame(frames, signal, idleTimeout)
              pauseReads(stream)
              yield chunk
            }
          } catch (e) {
            // Only a clean end-of-stream ends the generator. A truncated frame throws
            // the same error type, and swallowing it would hand the caller a short
            // payload as if the transfer had completed.
            if (!frames.isCleanEnd(e)) throw e
            completed = true
          } finally {
            // Never leave the read side paused once nobody is reading any more.
            resumeReads(stream)
            // Anything but a clean end means nobody is going to read this body: the
            // caller cancelled, the transfer broke, or the consumer left its `for await`
            // early. Reset the stream so the peer stops producing instead of filling our
            // read buffer until the idle timeout expires.
            if (!completed) {
              abortResponseStream(
                stream,
                new Error('P2P response is no longer being read')
              )
            }
            slot()
          }
        })()
        return streamableChunks
      }

      const chunks: Uint8Array[] = [firstBytes]
      try {
        while (true) {
          // Reads are held when this loop starts (`dialAndStream` pauses them), so each pass
          // has to let the next frame through. This loop never suspends between reads, so it
          // needs no pause of its own.
          if (frames.pendingBytes <= LP_RESUME_BELOW_BYTES) {
            resumeReads(stream)
          }
          chunks.push(await readFrame(frames, signal, idleTimeout))
        }
      } catch (e) {
        // A truncated response body — `GET_LOGS` is the big one — must not be parsed
        // and returned as though the peer had finished sending it.
        if (!frames.isCleanEnd(e)) {
          abortResponseStream(stream, e)
          throw e
        }
      }

      let response: unknown
      for (let i = 0; i < chunks.length; i++) {
        const text = new TextDecoder().decode(chunks[i])
        try {
          response = JSON.parse(text)
        } catch {
          response = chunks[i]
        }
      }

      const res = response as Record<string, any> | null
      if (typeof res?.httpStatus === 'number' && res.httpStatus >= 400) {
        throw new Error(
          typeof res.error === 'string' ? res.error : JSON.stringify(res.error)
        )
      }

      const errText = (typeof response === 'string' ? response : res?.error) ?? ''
      if (
        errText.includes('Cannot connect to peer') &&
        retrialNumber < (this.p2pConfig.maxRetries ?? DEFAULT_MAX_RETRIES)
      ) {
        releaseSlot?.()
        await new Promise((resolve) =>
          setTimeout(resolve, this.p2pConfig.retryDelay ?? DEFAULT_RETRY_DELAY_MS)
        )
        return this.sendP2pCommand(
          nodeUri,
          command,
          body,
          signerOrAuthToken,
          signal,
          retrialNumber + 1,
          requestBody
        )
      }

      return response
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      if (
        (msg.includes('closed') || msg.includes('reset')) &&
        retrialNumber < (this.p2pConfig.maxRetries ?? DEFAULT_MAX_RETRIES)
      ) {
        LoggerInstance.debug(
          `[P2P] Stream reset/closed on attempt ${retrialNumber + 1}, retrying...`
        )

        // Connection already evicted by dialAndStream catch block.
        // Brief delay ensures libp2p fully cleans up before retry.
        releaseSlot?.()
        await sleep(1000)
        return this.sendP2pCommand(
          nodeUri,
          command,
          body,
          signerOrAuthToken,
          signal,
          retrialNumber + 1,
          requestBody
        )
      }
      throw new Error(`P2P command error: ${msg}`)
    } finally {
      // A streaming reply owns the slot from here on; everything else is done with it.
      if (!slotOwnedByStream) releaseSlot?.()
    }
  }

  /**
   * Returns node status via P2P STATUS command.
   * @param {OceanNode} nodeUri - multiaddr of the node
   */
  public async getNodeStatus(
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<NodeStatus> {
    try {
      return await this.sendP2pCommand(
        nodeUri,
        PROTOCOL_COMMANDS.STATUS,
        {},
        null,
        signal
      )
    } catch (e) {
      LoggerInstance.error('P2P getNodeStatus (STATUS) failed:', e)
      throw e
    }
  }

  public async getNodeJobs(
    nodeUri: OceanNode,
    fromTimestamp?: number,
    signal?: AbortSignal
  ): Promise<NodeComputeJob[]> {
    try {
      const body: Record<string, any> = {}
      if (fromTimestamp) body.fromTimestamp = fromTimestamp.toString()
      const result = await this.sendP2pCommand(
        nodeUri,
        PROTOCOL_COMMANDS.JOBS,
        body,
        null,
        signal
      )
      return Array.isArray(result) ? result : []
    } catch (e) {
      LoggerInstance.error('P2P getNodeJobs failed:', e)
      return []
    }
  }

  /**
   * Get current nonce from the node via P2P.
   */
  public async getNonce(
    nodeUri: OceanNode,
    consumerAddress: string,
    signal?: AbortSignal
  ): Promise<number> {
    try {
      const result = await this.sendP2pCommand(
        nodeUri,
        PROTOCOL_COMMANDS.NONCE,
        { address: consumerAddress },
        null,
        signal
      )
      // ocean-node may return a plain number or { nonce: number }
      const nonceValue =
        typeof result === 'number' ? result : (result?.nonce ?? result ?? 0)
      return !nonceValue || nonceValue === null ? 0 : Number(nonceValue)
    } catch (e) {
      LoggerInstance.error('P2P getNonce failed:', e)
      throw e
    }
  }

  /**
   * Encrypt data via P2P ENCRYPT command.
   */
  public async encrypt(
    data: any,
    chainId: number,
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    _policyServer?: any,
    signal?: AbortSignal
  ): Promise<string> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.ENCRYPT,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.ENCRYPT,
      {
        chainId,
        nonce,
        consumerAddress,
        signature,
        blob: typeof data === 'string' ? data : JSON.stringify(data)
      },
      signerOrAuthToken,
      signal
    )
    return this.bufToHex(result)
  }

  /**
   * Get file details for a given DID and service ID via P2P.
   */
  public async checkDidFiles(
    did: string,
    serviceId: string,
    nodeUri: OceanNode,
    withChecksum: boolean = false,
    signal?: AbortSignal
  ): Promise<FileInfo[]> {
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.FILE_INFO,
      { did, serviceId, checksum: withChecksum },
      null,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  /**
   * Get File details via P2P.
   */
  public async getFileInfo(
    file: StorageObject,
    nodeUri: OceanNode,
    withChecksum: boolean = false,
    signal?: AbortSignal
  ): Promise<FileInfo[]> {
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.FILE_INFO,
      { file, type: (file as any).type, checksum: withChecksum },
      null,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  /**
   * Returns compute environments via P2P.
   */
  public async getComputeEnvironments(
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<ComputeEnvironment[]> {
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_GET_ENVIRONMENTS,
      {},
      null,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  /**
   * Initializes the provider for a service (download) request via P2P.
   */
  public async initialize(
    did: string,
    serviceId: string,
    fileIndex: number,
    consumerAddress: string,
    nodeUri: OceanNode,
    signal?: AbortSignal,
    userCustomParameters?: UserCustomParameters,
    computeEnv?: string,
    validUntil?: number
  ): Promise<ProviderInitialize> {
    const body: Record<string, any> = {
      ddoId: did,
      serviceId,
      consumerAddress
    }
    if (userCustomParameters) body.userdata = userCustomParameters
    if (computeEnv) body.environment = computeEnv
    if (validUntil) body.validUntil = validUntil
    return this.sendP2pCommand(nodeUri, PROTOCOL_COMMANDS.GET_FEES, body, null, signal)
  }

  /**
   * Initializes compute request via P2P. No auth required -- the node only
   * validates parameters and applies rate limits.
   */
  public async initializeCompute(
    assets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    computeEnv: string,
    token: string,
    validUntil: number,
    nodeUri: OceanNode,
    consumerAddress: string,
    resources: ComputeResourceRequest[],
    chainId: number,
    policyServer?: any,
    signal?: AbortSignal,
    queueMaxWaitTime?: number,
    dockerRegistryAuthData?: dockerRegistryAuth,
    output?: ComputeOutput
  ): Promise<ProviderComputeInitializeResults> {
    const body: Record<string, any> = {
      datasets: assets,
      algorithm,
      environment: computeEnv,
      payment: { chainId, token, resources },
      maxJobDuration: validUntil,
      consumerAddress
    }
    if (policyServer) body.policyServer = policyServer
    if (queueMaxWaitTime) body.queueMaxWaitTime = queueMaxWaitTime
    if (dockerRegistryAuthData) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) {
        body.encryptedDockerRegistryAuth = eciesencrypt(
          nodeKey,
          JSON.stringify(dockerRegistryAuthData)
        )
      }
    }
    if (output) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) body.output = eciesencrypt(nodeKey, JSON.stringify(output))
    }

    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_INITIALIZE,
      body,
      null,
      signal
    )
  }

  /**
   * Sends a DOWNLOAD command to the peer via P2P, reads the binary stream
   * directly from the lpStream, and returns a DownloadResponse.
   * The node decrypts the service file and streams raw file data back.
   *
   * @param signal Cancels the whole operation, not just its start: it is honoured by the
   *   nonce round-trip, the dial, the first frame *and* every subsequent frame, so a
   *   transfer already in progress stops when it fires and the stream is reset so the
   *   peer stops sending. Optional — omitting it keeps the previous behaviour exactly,
   *   including the dial timeout that applies when no signal is supplied.
   */
  public async getDownloadUrl(
    did: string,
    serviceId: string,
    fileIndex: number,
    transferTxId: string,
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    policyServer?: any,
    userCustomParameters?: UserCustomParameters,
    signal?: AbortSignal
  ): Promise<DownloadResponse> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.DOWNLOAD,
      signal
    )

    const payload: Record<string, any> = {
      command: PROTOCOL_COMMANDS.DOWNLOAD,
      authorization: this.getAuthorization(signerOrAuthToken),
      fileIndex,
      documentId: did,
      transferTxId,
      serviceId,
      consumerAddress,
      nonce,
      signature
    }
    if (policyServer) payload.policyServer = policyServer
    if (userCustomParameters) payload.userData = userCustomParameters

    // `dialAndStream` now takes a concurrency slot on our behalf. A download is the
    // longest-lived operation this client performs, so the slot is held for the whole
    // transfer and released only once the body is fully collected or has failed.
    const { firstBytes, frames, stream, release } = await this.dialAndStream(
      nodeUri,
      payload,
      signal
    )
    let completed = false
    try {
      // First lp frame is the status JSON (if present). Some nodes send binary data
      // directly without a status prefix — in that case JSON.parse throws SyntaxError
      // and we treat the frame as the start of file data.
      const statusText = new TextDecoder().decode(firstBytes)
      let status: { httpStatus?: number; error?: string } | null = null
      try {
        status = JSON.parse(statusText)
      } catch {
        // Not JSON — first frame is file data, fall through to chunk collection
      }
      if (status && typeof status.httpStatus === 'number' && status.httpStatus >= 400) {
        throw new Error(status.error ?? `P2P download error: ${status.httpStatus}`)
      }

      // Collect binary file data. If the first frame wasn't a status JSON, it's data.
      const chunks: Uint8Array[] = status === null ? [new Uint8Array(firstBytes)] : []
      const idleTimeout = this.streamIdleTimeoutMs()
      try {
        while (true) {
          // Reads are held when this loop starts (`dialAndStream` pauses them), so each pass
          // has to let the next frame through. This loop never suspends between reads, so it
          // needs no pause of its own.
          if (frames.pendingBytes <= LP_RESUME_BELOW_BYTES) {
            resumeReads(stream)
          }
          // Every frame is read under the caller's signal as well as the idle timeout,
          // so a download in progress can be cancelled mid-transfer.
          const chunk = await readFrame(frames, signal, idleTimeout)
          chunks.push(new Uint8Array(chunk))
        }
      } catch (e) {
        // A download that was cut short must fail, not return the bytes that did
        // arrive as a complete file.
        if (!frames.isCleanEnd(e)) throw e
      }
      completed = true

      const combined = concatUint8Arrays(chunks)
      return {
        data: combined.buffer.slice(
          combined.byteOffset,
          combined.byteOffset + combined.byteLength
        ) as ArrayBuffer,
        filename: `file${fileIndex}`
      }
    } finally {
      // A cancelled or failed download must not leave the peer streaming a file into a
      // read buffer nobody will drain.
      if (!completed) {
        abortResponseStream(stream, new Error('P2P download was cancelled or failed'))
      }
      release()
    }
  }

  /**
   * Start a paid compute job via P2P.
   */
  public async computeStart(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    computeEnv: string,
    datasets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    maxJobDuration: number,
    token: string,
    resources: ComputeResourceRequest[],
    chainId: number,
    metadata?: ComputeJobMetadata,
    additionalViewers?: string[],
    output?: ComputeOutput,
    policyServer?: any,
    signal?: AbortSignal,
    queueMaxWaitTime?: number,
    dockerRegistryAuth?: dockerRegistryAuth,
    outputBucketId?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.COMPUTE_START,
      signal
    )

    const body: Record<string, any> = {
      environment: computeEnv,
      dataset: datasets[0],
      datasets,
      algorithm,
      maxJobDuration,
      feeToken: token,
      resources,
      chainId,
      payment: { chainId, token, maxJobDuration, resources },
      consumerAddress,
      nonce,
      signature
    }
    if (metadata) body.metadata = metadata
    if (additionalViewers) body.additionalViewers = additionalViewers
    if (policyServer) body.policyServer = policyServer
    if (queueMaxWaitTime) body.queueMaxWaitTime = queueMaxWaitTime
    if (dockerRegistryAuth) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey)
        body.encryptedDockerRegistryAuth = eciesencrypt(
          nodeKey,
          JSON.stringify(dockerRegistryAuth)
        )
    }
    if (output) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) body.output = eciesencrypt(nodeKey, JSON.stringify(output))
    }
    if (outputBucketId) body.outputBucketId = outputBucketId

    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_START,
      body,
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : result
  }

  /**
   * Start a free compute job via P2P.
   */
  public async freeComputeStart(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    computeEnv: string,
    datasets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    resources?: ComputeResourceRequest[],
    metadata?: ComputeJobMetadata,
    additionalViewers?: string[],
    output?: ComputeOutput,
    policyServer?: any,
    signal?: AbortSignal,
    queueMaxWaitTime?: number,
    dockerRegistryAuth?: dockerRegistryAuth,
    outputBucketId?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.FREE_COMPUTE_START,
      signal
    )

    const body: Record<string, any> = {
      environment: computeEnv,
      dataset: datasets[0],
      datasets,
      algorithm,
      resources,
      consumerAddress,
      nonce,
      signature
    }
    if (metadata) body.metadata = metadata
    if (additionalViewers) body.additionalViewers = additionalViewers
    if (policyServer) body.policyServer = policyServer
    if (queueMaxWaitTime) body.queueMaxWaitTime = queueMaxWaitTime
    if (dockerRegistryAuth) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey)
        body.encryptedDockerRegistryAuth = eciesencrypt(
          nodeKey,
          JSON.stringify(dockerRegistryAuth)
        )
    }
    if (output) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) body.output = eciesencrypt(nodeKey, JSON.stringify(output))
    }
    if (outputBucketId) body.outputBucketId = outputBucketId

    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.FREE_COMPUTE_START,
      body,
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : result
  }

  /**
   * Get streamable compute logs via P2P. Returns an async generator of Uint8Array chunks.
   */
  public async computeStreamableLogs(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    signal?: AbortSignal
  ): Promise<any> {
    const isAuthToken = typeof signerOrAuthToken === 'string'
    if (isAuthToken) {
      return this.sendP2pCommand(
        nodeUri,
        PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS,
        { jobId },
        signerOrAuthToken,
        signal
      )
    }

    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS,
      { jobId, consumerAddress, nonce, signature },
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Stop a compute job via P2P.
   */
  public async computeStop(
    jobId: string,
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    agreementId?: string,
    signal?: AbortSignal
  ): Promise<ComputeJob | ComputeJob[]> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.COMPUTE_STOP,
      signal
    )

    const body: Record<string, any> = { jobId, consumerAddress, nonce, signature }
    if (agreementId) body.agreementId = agreementId

    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_STOP,
      body,
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Get compute status via P2P.
   * @param {boolean} includeMetrics Owner-only runtime metrics (`runtimeMetrics`) on the
   *   returned job(s). To receive them, the node needs owner credentials: an auth token
   *   (`signerOrAuthToken` as a string) is ALWAYS sent, regardless of this flag; a `Signer`'s
   *   nonce+signature is only computed and sent when this flag is `true` (skipped otherwise
   *   to avoid an extra nonce round-trip on every plain status poll). Omitted (default): the
   *   node attaches metrics silently if valid owner credentials made it into the request
   *   (true automatically for token callers, false for `Signer` callers unless this flag is
   *   set), and returns exactly today's response otherwise. `true`: metrics are required —
   *   this method also computes the `Signer`'s signature, and the node answers 400/401 if
   *   credentials don't verify. `false`: metrics are never attached.
   */
  public async computeStatus(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId?: string,
    agreementId?: string,
    signal?: AbortSignal,
    includeMetrics?: boolean
  ): Promise<NodeComputeJob | NodeComputeJob[]> {
    let consumerAddress: string
    let nonce: string
    let signature: string
    if (includeMetrics === true) {
      ;({ consumerAddress, nonce, signature } = await this.getSignedCommandParams(
        nodeUri,
        signerOrAuthToken,
        PROTOCOL_COMMANDS.COMPUTE_GET_STATUS,
        signal
      ))
    } else {
      consumerAddress = await getConsumerAddress(signerOrAuthToken)
    }
    const body: Record<string, any> = { consumerAddress }
    if (jobId) body.jobId = jobId
    if (agreementId) body.agreementId = agreementId
    if (includeMetrics !== undefined) body.includeMetrics = includeMetrics
    if (nonce) body.nonce = nonce
    if (signature) body.signature = signature

    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_GET_STATUS,
      body,
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Get compute result as an async generator of Uint8Array chunks via P2P.
   * Supports resumable downloads via `offset` (byte position to resume from).
   *
   * @param signal Cancels the whole operation, not just its start: it is honoured by the
   *   nonce round-trip, the dial, the first frame *and* every frame the returned
   *   generator reads, so a result already being transferred stops when it fires and the
   *   stream is reset so the peer stops sending. Optional — omitting it keeps the
   *   previous behaviour exactly.
   */
  public async getComputeResult(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    index: number,
    offset: number = 0,
    signal?: AbortSignal
  ): Promise<ComputeResultStream> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.COMPUTE_GET_RESULT,
      signal
    )
    const payload: Record<string, any> = {
      command: PROTOCOL_COMMANDS.COMPUTE_GET_RESULT,
      jobId,
      index,
      offset,
      consumerAddress
    }

    if (typeof signerOrAuthToken === 'string') {
      payload.authorization = signerOrAuthToken
    } else {
      payload.nonce = nonce
      payload.signature = signature
    }

    // `dialAndStream` took a concurrency slot for us; the generator below releases it
    // from its `finally` rather than this method releasing it on return — a compute
    // result is a bulk transfer that can hold its connection for minutes. (The 'close'
    // leak-guard in `dialAndStream` can get there first when the whole result fitted in
    // the read buffer; see the note there on what the gate bounds.)
    const { firstBytes, frames, stream, release } = await this.dialAndStream(
      nodeUri,
      payload,
      signal
    )

    let status: Record<string, any>
    try {
      // First frame is always a status JSON
      status = JSON.parse(new TextDecoder().decode(firstBytes))
      if (typeof status?.httpStatus === 'number' && status.httpStatus >= 400) {
        throw new Error(status.error ?? `P2P compute result error: ${status.httpStatus}`)
      }
    } catch (e) {
      // Nothing is going to consume the generator, so hand the slot back here.
      release()
      throw e
    }

    const idleTimeout = this.streamIdleTimeoutMs()
    return (async function* () {
      let completed = false
      try {
        while (true) {
          // Flow control — see `LP_RESUME_BELOW_BYTES`. A compute result is exactly the
          // transfer where a consumer writing to disk falls behind the sender, and an unread
          // backlog past `maxBufferSize` is silently dropped by `byteStream`, desynchronising
          // the frame parser and handing out corrupt, out-of-sequence frames.
          if (frames.pendingBytes <= LP_RESUME_BELOW_BYTES) {
            resumeReads(stream)
          }
          // Every frame is read under the caller's signal as well as the idle timeout,
          // so a result transfer in progress can be cancelled mid-flight.
          const chunk = await readFrame(frames, signal, idleTimeout)
          pauseReads(stream)
          yield chunk
        }
      } catch (e) {
        // Truncation and a clean end throw the same error type; only the clean end
        // may finish the stream, or the consumer writes a short result file.
        if (!frames.isCleanEnd(e)) throw e
        completed = true
      } finally {
        // Never leave the read side paused once nobody is reading any more.
        resumeReads(stream)
        // Cancelled, broken, or left early by the consumer: reset the stream so the peer
        // stops producing a result body nobody will read.
        if (!completed) {
          abortResponseStream(
            stream,
            new Error('P2P compute result is no longer being read')
          )
        }
        release()
      }
    })()
  }

  /**
   * Not available over P2P, and now says so instead of pretending otherwise.
   *
   * There is no URL to return. A peer answers `COMPUTE_GET_RESULT` with the result bytes
   * themselves — the protocol carries no addressable location for them, so nothing this
   * method could hand back would be fetchable. Use {@link getComputeResult}, which gives
   * the same bytes as an async iterable of chunks, and takes an `offset` to resume with.
   *
   * What it did before: `COMPUTE_GET_RESULT` is one of the streaming commands, so
   * `sendP2pCommand` returned an async generator, which the declared `Promise<string>`
   * silently cast to a string. A caller got `typeof 'object'` with `Symbol.asyncIterator`
   * on it, `fetch()` received the literal text `[object AsyncGenerator]`, and
   * `url.startsWith(...)` threw a `TypeError`. It also dialled the peer and had it stream
   * an entire result body that nothing would ever read.
   *
   * The declared type is unchanged: the HTTP transport does return a real URL here, and
   * widening this to a union would force every consumer of the dispatching façade to
   * narrow a type that is a plain string on the transport they actually use.
   */
  public async getComputeResultUrl(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    index: number
  ): Promise<string> {
    throw new Error(
      `getComputeResultUrl is not supported over P2P (job ${jobId}, result index ` +
        `${index}): a peer returns the compute result as a stream, not a URL. Use ` +
        `getComputeResult(nodeUri, signerOrAuthToken, jobId, index) instead.`
    )
  }

  /**
   * Generate an auth token via P2P (auto-signs with Signer).
   */
  public async generateAuthToken(
    consumer: Signer,
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<string> {
    const address = await consumer.getAddress()
    const nonce = ((await this.getNonce(nodeUri, address, signal)) + 1).toString()
    const issuerPeerId = (await this.getNodeStatus(nodeUri, signal))?.id
    if (!issuerPeerId) throw new Error('Could not resolve node peerId for signature.')
    const signature = await getSignature(
      consumer,
      nonce,
      PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN,
      issuerPeerId
    )

    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN,
      { address, signature, nonce },
      null,
      signal
    )
    return result?.token ?? result
  }

  /**
   * Generate an auth token from a pre-signed request (no Signer needed).
   */
  public async generateSignedAuthToken(
    address: string,
    signature: string,
    nonce: string,
    nodeUri: OceanNode,
    validUntil?: number,
    signal?: AbortSignal
  ): Promise<string> {
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN,
      { address, signature, nonce, validUntil },
      null,
      signal
    )
    return result?.token ?? result
  }

  /**
   * Resolve a DDO by DID via P2P GET_DDO command.
   */
  public async resolveDdo(
    nodeUri: OceanNode,
    did: string,
    signal?: AbortSignal
  ): Promise<any> {
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.GET_DDO,
      { id: did },
      null,
      signal
    )
  }

  /**
   * Validate a DDO via P2P VALIDATE_DDO command.
   */
  public async validateDdo(
    nodeUri: OceanNode,
    ddo: DDO,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    signal?: AbortSignal
  ): Promise<ValidateMetadata> {
    const {
      consumerAddress: publisherAddress,
      nonce,
      signature
    } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.VALIDATE_DDO,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.VALIDATE_DDO,
      { ddo, publisherAddress, nonce, signature },
      signerOrAuthToken,
      signal
    )
    if (!result || result.error) return null
    return {
      valid: true,
      hash: this.bufToHex(result.hash),
      proof: {
        validatorAddress: this.bufToHex(result.publicKey),
        r: this.bufToHex(result.r?.[0] ?? result.r),
        s: this.bufToHex(result.s?.[0] ?? result.s),
        v: result.v
      }
    } as ValidateMetadata
  }

  /**
   * Invalidate an auth token via P2P.
   */
  public async invalidateAuthToken(
    consumer: Signer,
    token: string,
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<{ success: boolean }> {
    const consumerAddress = await consumer.getAddress()
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()
    const signature = await getSignature(
      consumer,
      nonce,
      PROTOCOL_COMMANDS.INVALIDATE_AUTH_TOKEN
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.INVALIDATE_AUTH_TOKEN,
      { address: consumerAddress, signature, token, nonce },
      null,
      signal
    )
  }

  /**
   * Check if a P2P node is reachable by calling STATUS.
   */
  public async isValidProvider(
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<boolean> {
    try {
      const result = await this.sendP2pCommand(
        nodeUri,
        PROTOCOL_COMMANDS.STATUS,
        {},
        null,
        signal
      )
      // STATUS response uses 'address' (ETH addr) while HTTP root uses 'providerAddress'
      return !!(
        result &&
        (result.address || result.providerAddress || result.providerAddresses)
      )
    } catch {
      return false
    }
  }

  /**
   * PolicyServer passthrough via P2P.
   */
  public async PolicyServerPassthrough(
    nodeUri: OceanNode,
    request: PolicyServerPassthroughCommand,
    signal?: AbortSignal
  ): Promise<any> {
    // the node injects fields into this object, so it has to be a keyed object. arrays are
    // objects too, and would be forwarded as {"0":..,"1":..} with no action
    if (
      !request?.policyServerPassthrough ||
      typeof request.policyServerPassthrough !== 'object' ||
      Array.isArray(request.policyServerPassthrough)
    )
      throw new Error(
        'PolicyServerPassthrough failed: "policyServerPassthrough" must be an object.'
      )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.POLICY_SERVER_PASSTHROUGH,
      { ...request },
      null,
      signal
    )
  }

  /**
   * Initialize Policy Server verification via P2P.
   *
   * A distinct command from the passthrough, so the signed message uses its own command
   * string: `consumerAddress + nonce + "PolicyServerInitialize"`.
   */
  public async initializePSVerification(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    request: PolicyServerInitializeCommand,
    signal?: AbortSignal
  ): Promise<any> {
    if (!signerOrAuthToken)
      throw new Error(
        'initializePSVerification failed: a signer, auth token or signature is required.'
      )
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.POLICY_SERVER_INITIALIZE,
      signal
    )
    if (!isAddress(consumerAddress))
      throw new Error(
        `initializePSVerification failed: could not resolve a valid web3 "consumerAddress" (got "${consumerAddress}") from the supplied credential.`
      )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.POLICY_SERVER_INITIALIZE,
      { ...request, consumerAddress, nonce, signature },
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Download node logs via P2P.
   */
  public async downloadNodeLogs(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    startTime: string,
    endTime: string,
    maxLogs?: number,
    moduleName?: string,
    level?: string,
    page?: number,
    signal?: AbortSignal
  ): Promise<NodeLogEntry[]> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.GET_LOGS,
      signal
    )

    const body: Record<string, any> = {
      startTime,
      endTime,
      signature,
      nonce,
      address: consumerAddress
    }
    if (maxLogs) body.maxLogs = maxLogs
    if (moduleName) body.moduleName = moduleName
    if (level) body.level = level
    if (page) body.page = page

    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.GET_LOGS,
      body,
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Fetch node configuration via P2P. Accepts a pre-signed payload —
   * the caller is responsible for nonce retrieval and signing.
   */
  public async fetchConfig(
    nodeUri: OceanNode,
    payload: Record<string, any>
  ): Promise<any> {
    return this.sendP2pCommand(nodeUri, PROTOCOL_COMMANDS.FETCH_CONFIG, payload)
  }

  /**
   * Push node configuration via P2P. Accepts a pre-signed payload —
   * the caller is responsible for nonce retrieval and signing.
   */
  public async pushConfig(
    nodeUri: OceanNode,
    payload: Record<string, any>
  ): Promise<any> {
    return this.sendP2pCommand(nodeUri, PROTOCOL_COMMANDS.PUSH_CONFIG, payload)
  }

  public async createPersistentStorageBucket(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    payload: PersistentStorageCreateBucketRequest,
    signal?: AbortSignal
  ): Promise<{
    bucketId: string
    owner: string
    accessList: PersistentStorageAccessList[]
    label?: string | null
  }> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_CREATE_BUCKET,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_CREATE_BUCKET,
      {
        ...authPayload,
        accessLists: payload.accessLists ?? [],
        label: payload.label
      },
      signerOrAuthToken,
      signal
    )
  }

  public async updatePersistentStorageBucket(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    label: string | null,
    signal?: AbortSignal
  ): Promise<PersistentStorageUpdateBucketResponse> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_UPDATE_BUCKET,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_UPDATE_BUCKET,
      { ...authPayload, bucketId, label },
      signerOrAuthToken,
      signal
    )
  }

  public async getPersistentStorageBuckets(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    owner: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageBucket[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_GET_BUCKETS,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_GET_BUCKETS,
      { ...authPayload, owner },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : []
  }

  public async listPersistentStorageFiles(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageFileEntry[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_LIST_FILES,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_LIST_FILES,
      { ...authPayload, bucketId },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : []
  }

  public async getPersistentStorageFileObject(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    fileName: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageObject> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_GET_FILE_OBJECT,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_GET_FILE_OBJECT,
      { ...authPayload, bucketId, fileName },
      signerOrAuthToken,
      signal
    )
  }

  public async uploadPersistentStorageFile(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    fileName: string,
    content: P2PRequestBodyStream,
    signal?: AbortSignal
  ): Promise<PersistentStorageFileEntry> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_UPLOAD_FILE,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_UPLOAD_FILE,
      { ...authPayload, bucketId, fileName },
      signerOrAuthToken,
      signal,
      0,
      content
    )
  }

  public async deletePersistentStorageFile(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    fileName: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageDeleteFileResponse> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_DELETE_FILE,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_DELETE_FILE,
      { ...authPayload, bucketId, fileName },
      signerOrAuthToken,
      signal
    )
  }

  // ── Service on Demand ────────────────────────────────────────────────

  // Encrypts userData to the node's public key (ECIES): JSON-encode then encrypt.
  private async encryptServiceUserData(
    nodeUri: OceanNode,
    userData?: ServiceUserData
  ): Promise<string | undefined> {
    if (userData === undefined || userData === null) return undefined
    const nodeKey = await this.getNodePublicKey(nodeUri)
    if (!nodeKey) throw new Error('Cannot resolve node public key to encrypt userData')
    return eciesencrypt(nodeKey, JSON.stringify(userData))
  }

  public async getServiceTemplates(
    nodeUri: OceanNode,
    chainId?: number,
    signal?: AbortSignal
  ): Promise<ServiceTemplatePublic[]> {
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_GET_TEMPLATES,
      { ...(chainId !== undefined ? { chainId } : {}) },
      null,
      signal
    )
    return Array.isArray(result) ? result : []
  }

  public async serviceStart(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    params: ServiceStartParams,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_START,
      signal
    )
    const { userData, ...rest } = params
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_START,
      {
        ...authPayload,
        ...rest,
        userData: await this.encryptServiceUserData(nodeUri, userData)
      },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  public async serviceStop(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_STOP,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_STOP,
      { ...authPayload, serviceId },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  public async serviceExtend(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    additionalDuration: number,
    payment: ServicePayment,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_EXTEND,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_EXTEND,
      { ...authPayload, serviceId, additionalDuration, payment },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  public async serviceRestart(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    params?: ServiceRestartParams,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    const {
      image,
      tag,
      checksum,
      dockerfile,
      additionalDockerFiles,
      userData,
      dockerCmd,
      dockerEntrypoint
    } = params ?? {}
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_RESTART,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_RESTART,
      {
        ...authPayload,
        serviceId,
        userData: await this.encryptServiceUserData(nodeUri, userData),
        // Only send when supplied — an omitted field reuses the node's stored value, whereas an
        // explicit value REPLACES it (matches ocean-node's restartService REUSE/RESPEC semantics).
        ...(image !== undefined ? { image } : {}),
        ...(tag !== undefined ? { tag } : {}),
        ...(checksum !== undefined ? { checksum } : {}),
        ...(dockerfile !== undefined ? { dockerfile } : {}),
        ...(additionalDockerFiles !== undefined ? { additionalDockerFiles } : {}),
        ...(dockerCmd !== undefined ? { dockerCmd } : {}),
        ...(dockerEntrypoint !== undefined ? { dockerEntrypoint } : {})
      },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  /**
   * @param {boolean} includeMetrics Owner-only runtime metrics (`runtimeMetrics`) on the
   *   returned service(s). This command is already authenticated, so metrics are included
   *   BY DEFAULT (omitted / `undefined`); pass `false` to opt out.
   */
  public async getServiceStatus(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId?: string,
    signal?: AbortSignal,
    includeMetrics?: boolean
  ): Promise<ServiceJob[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_GET_STATUS,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_GET_STATUS,
      {
        ...authPayload,
        ...(serviceId ? { serviceId } : {}),
        ...(includeMetrics !== undefined ? { includeMetrics } : {})
      },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : []
  }

  /**
   * Node-wide service listing (SERVICE_LIST) via P2P. Authenticated but NOT owner-scoped:
   * any consumer identity sees every owner's services, listing-sanitized (no userData, no
   * dockerCmd/dockerEntrypoint, no Dockerfile). Default (no filters) returns only the
   * services currently holding a resource reservation; see ServiceListFilters.
   */
  public async getServices(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    filters?: ServiceListFilters,
    signal?: AbortSignal
  ): Promise<ServiceJobListed[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_LIST,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_LIST,
      {
        ...authPayload,
        ...(filters?.status !== undefined ? { status: filters.status } : {}),
        ...(filters?.includeAllStatuses ? { includeAllStatuses: true } : {}),
        ...(filters?.fromTimestamp ? { fromTimestamp: filters.fromTimestamp } : {}),
        ...(filters?.updatedSince ? { updatedSince: filters.updatedSince } : {})
      },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : []
  }

  /**
   * Stream a running service's container logs via P2P. `since` optionally bounds the lower time
   * (Unix seconds, or a relative duration like '30s'/'2h'); omit for the full history then live.
   */
  public async serviceGetStreamableLogs(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    since?: string,
    signal?: AbortSignal
  ): Promise<any> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_GET_STREAMABLE_LOGS,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_GET_STREAMABLE_LOGS,
      { ...authPayload, serviceId, ...(since ? { since } : {}) },
      signerOrAuthToken,
      signal
    )
  }
}
