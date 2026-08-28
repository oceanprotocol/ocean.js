import { expect } from 'chai'
import { OK_STATUS, createP2pTestPeer, filledBytes } from './p2pStreamPeer.js'
import { P2pProvider } from '../../src/services/providers/P2pProvider.js'

/**
 * A buffered reply does not arrive as one frame. ocean-node writes the status envelope,
 * then **one frame per chunk of its response stream**, so any reply larger than a Node
 * stream chunk — 16—64 KiB, which a large DDO, a `GET_LOGS` dump or a busy
 * `computeStatus` clears easily — is split across several.
 *
 * The client accumulated every frame and then parsed them in a loop that *overwrote* its
 * result each pass, so what the caller received was the last frame alone. For a split
 * JSON reply that fragment is not valid JSON, so it came back as raw bytes: measured
 * against a two-frame `{"nonce":42,…}`, `getNonce` returned `null`. Anything that fitted
 * one frame — most replies, and every reply in a unit test that did not deliberately
 * split one — was unaffected, which is how it survived.
 *
 * These tests fix the shape of the assembly: join the body frames, exclude the status
 * envelope from the join, and leave the single-frame cases exactly as they were.
 */
describe('P2P buffered reply assembly', () => {
  const NODE = 'test-peer'
  const ADDRESS = '0x0000000000000000000000000000000000000001'

  /** Answers one command with a status envelope followed by `frames`. */
  async function replyWith(frames: Array<string | Uint8Array>): Promise<P2pProvider> {
    const provider = new P2pProvider()
    const peer = await createP2pTestPeer({ provider })
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      for (const frame of frames) peer.sendFrame(frame)
      await peer.close()
    })().catch(() => {})
    return provider
  }

  it('joins a JSON reply split across two frames', async () => {
    const body = JSON.stringify({ nonce: 42, filler: 'x'.repeat(40) })
    const half = Math.floor(body.length / 2)
    const provider = await replyWith([body.slice(0, half), body.slice(half)])

    expect(await provider.getNonce(NODE, ADDRESS)).to.equal(42)
  })

  it('joins a JSON reply split across many frames, including a split mid-token', async () => {
    // Chunk boundaries fall wherever the source stream put them — in the middle of a
    // number, a key, or an escape sequence. Nothing may depend on a frame being
    // self-describing.
    const body = JSON.stringify({ nonce: 1234567, note: 'a"b\\c' })
    const frames: string[] = []
    for (let i = 0; i < body.length; i += 3) frames.push(body.slice(i, i + 3))
    expect(frames.length).to.be.greaterThan(4)
    const provider = await replyWith(frames)

    expect(await provider.getNonce(NODE, ADDRESS)).to.equal(1234567)
  })

  it('still returns a single-frame reply unchanged', async () => {
    const provider = await replyWith([JSON.stringify({ nonce: 7 })])
    expect(await provider.getNonce(NODE, ADDRESS)).to.equal(7)
  })

  it('treats a status envelope with no body as the reply itself', async () => {
    // Some commands answer with the envelope and nothing else. That was the behaviour
    // before and must stay — the envelope must not be joined into the body and then fail
    // to parse alongside it.
    const provider = await replyWith([])
    // `getNonce` reads `nonce` off whatever came back; the envelope carries none, so the
    // point is that this resolves at all rather than throwing on a mangled parse.
    const nonce = await provider.getNonce(NODE, ADDRESS)
    expect(Number.isNaN(nonce) || nonce === undefined || nonce === null).to.equal(true)
  })

  it('hands back the whole body, not its last frame, when the reply is not JSON', async () => {
    // A node answering with bytes rather than JSON gets the same treatment: all of them.
    const provider = new P2pProvider()
    const peer = await createP2pTestPeer({ provider })
    ;(async () => {
      await peer.commandReceived
      // No status envelope, so the first frame is body too.
      peer.sendFrame(filledBytes(10, 65))
      peer.sendFrame(filledBytes(10, 66))
      peer.sendFrame(filledBytes(10, 67))
      await peer.close()
    })().catch(() => {})

    const raw: any = await (provider as any).sendP2pCommand(NODE, { command: 'nonce' })
    expect(raw).to.be.instanceOf(Uint8Array)
    expect(raw.byteLength, 'the whole body, not the last frame').to.equal(30)
    expect(new TextDecoder().decode(raw)).to.equal(
      'A'.repeat(10) + 'B'.repeat(10) + 'C'.repeat(10)
    )
  })
})
