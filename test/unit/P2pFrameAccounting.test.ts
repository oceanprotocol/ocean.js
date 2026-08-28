import { expect } from 'chai'
import {
  AGENT_SIGNATURE,
  OK_STATUS,
  concatBytes,
  createP2pTestPeer,
  drain,
  encodeVarint,
  filledBytes,
  frameBytes
} from './p2pStreamPeer.js'

/**
 * `lpStream.read()` raises the same `UnexpectedEOFError` for a peer that closed
 * exactly between two frames and for a peer that promised ten bytes, sent three and
 * vanished. Telling those apart is what stops a cut-short download or compute result
 * being handed back as a complete one, and the only discriminator is arithmetic:
 * transport bytes delivered versus bytes accounted for by complete frames.
 *
 * Everything below runs over a real `streamPair`, through the public
 * `getComputeResult` entry point, so it exercises the framing the production read
 * loop actually uses rather than a re-implementation of it.
 */
describe('P2P response framing: clean end of stream versus truncation', () => {
  const NODE = 'test-peer'
  const JOB = 'job-1'

  async function collect(
    script: (peer: Awaited<ReturnType<typeof createP2pTestPeer>>) => Promise<void>,
    perFrameDelayMs = 0
  ): Promise<{ frames: Uint8Array[]; error: Error | null }> {
    const peer = await createP2pTestPeer()
    const scripted = (async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      await script(peer)
    })()
    const frames: Uint8Array[] = []
    let error: Error | null = null
    try {
      const body = await peer.provider.getComputeResult(NODE, AGENT_SIGNATURE, JOB, 0)
      await drain(body as AsyncIterable<Uint8Array>, perFrameDelayMs, frames)
    } catch (err) {
      error = err as Error
    }
    await scripted.catch(() => {})
    return { frames, error }
  }

  function decode(frames: Uint8Array[]): string[] {
    return frames.map((frame) => new TextDecoder().decode(frame))
  }

  it('ends the body when the peer closes on a frame boundary', async () => {
    const { frames, error } = await collect(async (peer) => {
      peer.sendFrame('alpha')
      peer.sendFrame('beta')
      peer.sendFrame('gamma')
      await peer.close()
    })
    expect(error, error?.message).to.equal(null)
    expect(decode(frames)).to.deep.equal(['alpha', 'beta', 'gamma'])
  })

  it('raises rather than returning a short body when one stray byte follows good frames', async () => {
    // A single `0x01` is a length prefix promising one body byte that never arrives.
    // Swallowing the end-of-file here is exactly how a truncated transfer used to be
    // reported as a completed one.
    const { frames, error } = await collect(async (peer) => {
      peer.sendFrame('alpha')
      peer.sendFrame('beta')
      peer.sendRaw(new Uint8Array([0x01]))
      await peer.close()
    })
    expect(error, 'a truncated transfer must not resolve').to.not.equal(null)
    expect(decode(frames)).to.deep.equal(['alpha', 'beta'])
  })

  it('raises when a frame declares more bytes than the peer sends', async () => {
    const { error } = await collect(async (peer) => {
      peer.sendRaw(concatBytes(encodeVarint(50), filledBytes(7)))
      await peer.close()
    })
    expect(error, 'a body cut short mid-frame must not resolve').to.not.equal(null)
  })

  it('raises when the stream ends inside a multi-byte length prefix', async () => {
    // 200 needs a two-byte varint; only the continuation byte is sent. A clean end and
    // a prefix cut in half produce an identical error message, so the byte count is the
    // only thing that can separate them.
    const prefix = encodeVarint(200)
    expect(prefix.byteLength).to.equal(2)
    const { error } = await collect(async (peer) => {
      peer.sendRaw(prefix.subarray(0, 1))
      await peer.close()
    })
    expect(error, 'half a length prefix must not read as a clean end').to.not.equal(null)
  })

  it('treats a zero-length frame as data and still ends cleanly', async () => {
    const { frames, error } = await collect(async (peer) => {
      peer.sendFrame('alpha')
      peer.sendFrame(new Uint8Array(0))
      await peer.close()
    })
    expect(error, error?.message).to.equal(null)
    expect(frames.map((frame) => frame.byteLength)).to.deep.equal([5, 0])
  })

  it('reassembles a frame split across several transport messages', async () => {
    const body = filledBytes(3000, 66)
    const wire = frameBytes(body)
    const { frames, error } = await collect(async (peer) => {
      for (let offset = 0; offset < wire.byteLength; offset += 700) {
        peer.sendRaw(wire.subarray(offset, Math.min(offset + 700, wire.byteLength)))
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
      await peer.close()
    })
    expect(error, error?.message).to.equal(null)
    expect(frames).to.have.lengthOf(1)
    expect(frames[0].byteLength).to.equal(3000)
    expect(Array.from(frames[0].subarray(0, 4))).to.deep.equal([66, 66, 66, 66])
  })

  it('accounts for frames on both sides of every length-prefix width boundary', async () => {
    // 127 -> one prefix byte, 128 -> two, 16383 -> two, 16384 -> three. The byte
    // accounting adds the prefix width back itself, so a wrong width leaves a
    // permanent non-zero residue and a clean close is misread as truncation.
    const sizes = [127, 128, 16383, 16384]
    const { frames, error } = await collect(async (peer) => {
      for (const size of sizes) {
        peer.sendFrame(filledBytes(size))
      }
      await peer.close()
    })
    expect(error, error?.message).to.equal(null)
    expect(frames.map((frame) => frame.byteLength)).to.deep.equal(sizes)
  })

  it('raises when the peer resets the stream instead of closing it', async () => {
    // A reset discards whatever the stream had buffered without dispatching it, so the
    // byte counters see nothing missing. Only the recorded close error separates this
    // from a completed transfer.
    const { frames, error } = await collect(async (peer) => {
      peer.sendFrame('alpha')
      await new Promise((resolve) => setTimeout(resolve, 30))
      peer.reset()
    })
    expect(error, 'a reset must not resolve as a finished body').to.not.equal(null)
    expect(decode(frames)).to.deep.equal(['alpha'])
  })
})
