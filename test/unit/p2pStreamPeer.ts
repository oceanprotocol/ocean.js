/**
 * Test-only peer for the P2P transport: one end of a real `streamPair`, driven by
 * hand so a test can produce byte sequences a cooperating node never would —
 * a truncated body, half a length prefix, a stray byte before close, a reset.
 *
 * `streamPair()` is the same libp2p stream implementation the production code runs
 * over, so the read-buffer limits, `pause()`/`resume()` and the `message`/`close`
 * events the frame reader depends on all behave as they do on a live connection.
 */
import { streamPair, lpStream } from '@libp2p/utils'
import type { Stream } from '@libp2p/interface'
import { P2pProvider } from '../../src/services/providers/P2pProvider.js'

/** Length prefix `lpStream` expects in front of a frame of `value` bytes. */
export function encodeVarint(value: number): Uint8Array {
  const out: number[] = []
  let remaining = value
  while (remaining >= 0x80) {
    out.push((remaining % 0x80) | 0x80)
    remaining = Math.floor(remaining / 0x80)
  }
  out.push(remaining)
  return new Uint8Array(out)
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

export function toBytes(body: Uint8Array | string): Uint8Array {
  return typeof body === 'string' ? new TextEncoder().encode(body) : body
}

/** A complete length-prefixed frame, ready to hand to `Stream.send`. */
export function frameBytes(body: Uint8Array | string): Uint8Array {
  const payload = toBytes(body)
  return concatBytes(encodeVarint(payload.byteLength), payload)
}

export function filledBytes(length: number, fill = 65): Uint8Array {
  return new Uint8Array(length).fill(fill)
}

export interface P2pTestPeer {
  /** Provider whose dial is redirected at this peer. */
  provider: P2pProvider
  /** Resolves with the command frame the client sent. */
  commandReceived: Promise<Uint8Array>
  /** Rejects nothing: resolves with the error the client tore the stream down with, if any. */
  closed: Promise<Error | undefined>
  /** Number of frames this peer managed to write before the client stopped it. */
  framesWritten: () => number
  /** Send a well-formed frame. */
  sendFrame: (body: Uint8Array | string) => void
  /** Send a well-formed frame and wait for it to be accepted (applies backpressure). */
  writeFrame: (body: Uint8Array | string) => Promise<void>
  /** Send arbitrary bytes, so malformed framing can be produced. */
  sendRaw: (bytes: Uint8Array) => void
  /** Graceful end of stream. */
  close: () => Promise<void>
  /** Ungraceful end of stream. */
  reset: (reason?: string) => void
  /** How many times the provider dialled. */
  dialCount: () => number
}

export interface P2pTestPeerOptions {
  /** Reuse an existing provider instead of creating one. */
  provider?: P2pProvider
  /** Delay before the dial resolves, so concurrent dials overlap observably. */
  dialDelayMs?: number
}

/**
 * Redirects `provider`'s dial at one end of a fresh `streamPair` and returns the
 * other end as a scriptable peer.
 */
export async function createP2pTestPeer(
  options: P2pTestPeerOptions = {}
): Promise<P2pTestPeer> {
  const [peerStream, clientStream] = (await streamPair()) as unknown as [Stream, Stream]
  const provider = options.provider ?? new P2pProvider()
  let dials = 0
  ;(provider as any).getConnection = async () => {
    dials++
    if (options.dialDelayMs != null) {
      await new Promise((resolve) => setTimeout(resolve, options.dialDelayMs))
    }
    return {
      newStream: async () => clientStream,
      abort: () => {}
    }
  }

  const peerLp = lpStream(peerStream)
  const commandReceived = peerLp
    .read({ signal: AbortSignal.timeout(10_000) })
    .then((chunk: any) => (chunk instanceof Uint8Array ? chunk : chunk.subarray()))

  const closed = new Promise<Error | undefined>((resolve) => {
    peerStream.addEventListener('close', (evt: any) => resolve(evt.error))
  })

  let written = 0
  return {
    provider,
    commandReceived,
    closed,
    framesWritten: () => written,
    sendFrame: (body) => {
      written++
      peerStream.send(frameBytes(body))
    },
    writeFrame: async (body) => {
      written++
      await peerLp.write(toBytes(body), { signal: AbortSignal.timeout(30_000) })
    },
    sendRaw: (bytes) => peerStream.send(bytes),
    close: async () => {
      await peerStream.close()
    },
    reset: (reason = 'peer reset the stream') => {
      peerStream.abort(new Error(reason))
    },
    dialCount: () => dials
  }
}

/** The status envelope every ocean-node reply opens with. */
export const OK_STATUS = JSON.stringify({ httpStatus: 200 })

/** Credentials that need no chain and no nonce round-trip. */
export const AGENT_SIGNATURE = {
  consumerAddress: '0x0000000000000000000000000000000000000001',
  nonce: '1',
  signature: '0xdeadbeef'
}

/**
 * Drains an async iterable of frames. `sink` is appended to as frames arrive, so a
 * caller can still see what was delivered before a failure — which is the difference
 * between "raised" and "raised without handing over a short body first".
 */
export async function drain(
  iterable: AsyncIterable<Uint8Array>,
  perFrameDelayMs = 0,
  sink: Uint8Array[] = []
): Promise<Uint8Array[]> {
  for await (const chunk of iterable) {
    sink.push(new Uint8Array(chunk))
    if (perFrameDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, perFrameDelayMs))
    }
  }
  return sink
}
