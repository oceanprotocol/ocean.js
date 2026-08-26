import { expect } from 'chai'
import {
  AGENT_SIGNATURE,
  OK_STATUS,
  createP2pTestPeer,
  filledBytes
} from './p2pStreamPeer.js'
import { P2pProvider, P2pError } from '../../src/services/providers/P2pProvider.js'

/**
 * The framing limits bound one *frame* and the transport's own backlog. They say nothing
 * about how many frames a caller accumulates, and two paths accumulate all of them: a
 * buffered command reply, and a P2P download, which returns the whole file as a single
 * `ArrayBuffer`. Both loops read until end-of-stream, so a peer that simply keeps sending
 * grows the array until the process dies — and the per-frame idle timeout is no defence,
 * because a peer sending steadily is never idle.
 *
 * Capping it changes the contract: a response past the ceiling now fails where it
 * previously either succeeded or exhausted memory. That is the deliberate part, so the
 * boundary is pinned here in both directions — at the limit succeeds, one byte over
 * fails.
 */
describe('P2P buffered response limits', () => {
  const NODE = 'test-peer'
  /** Small enough to reach in a handful of frames, large enough to clear the status frame. */
  const COMMAND_LIMIT = 200
  const DOWNLOAD_LIMIT = 300

  let savedConfig: any
  let provider: P2pProvider

  beforeEach(() => {
    provider = new P2pProvider()
    savedConfig = (provider as any).p2pConfig
    ;(provider as any).p2pConfig = {
      ...savedConfig,
      maxBufferedCommandBytes: COMMAND_LIMIT,
      maxBufferedDownloadBytes: DOWNLOAD_LIMIT
    }
  })

  afterEach(() => {
    ;(provider as any).p2pConfig = savedConfig
  })

  function download(peerProvider: P2pProvider): Promise<any> {
    return peerProvider.getDownloadUrl(
      'did:op:1',
      'service-1',
      0,
      '0xtx',
      NODE,
      AGENT_SIGNATURE
    )
  }

  it('fails a command reply that grows past the ceiling', async () => {
    const peer = await createP2pTestPeer({ provider })
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      // Comfortably over COMMAND_LIMIT once the status frame is counted.
      peer.sendFrame(filledBytes(150))
      peer.sendFrame(filledBytes(150))
      await peer.close()
    })().catch(() => {})

    let raised: any
    try {
      await provider.getNonce(NODE, '0x0000000000000000000000000000000000000001')
    } catch (err) {
      raised = err
    }

    expect(raised, 'an over-limit reply must raise').to.be.instanceOf(P2pError)
    expect(raised.type).to.equal('protocol_failed')
    expect(raised.message).to.contain('exceeded the maximum buffered size')
  })

  it('does not retry an over-limit reply', async () => {
    // `protocol_failed` is deliberately not retryable: another attempt fetches the same
    // oversized body, so retrying would multiply the cost of the thing being refused.
    const peer = await createP2pTestPeer({ provider })
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      peer.sendFrame(filledBytes(400))
      await peer.close()
    })().catch(() => {})

    try {
      await provider.getNonce(NODE, '0x0000000000000000000000000000000000000001')
    } catch {
      // asserted above
    }
    expect(peer.dialCount()).to.equal(1)
  })

  it('fails a single oversized reply frame, with no second frame to catch it', async () => {
    // The common shape of a command reply is one frame, so this — not a long series of
    // them — is how an over-limit reply usually arrives. It is also the only case the
    // read loop's own check cannot cover, because the loop never runs.
    const peer = await createP2pTestPeer({ provider })
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(filledBytes(COMMAND_LIMIT + 1))
      await peer.close()
    })().catch(() => {})

    let raised: any
    try {
      await provider.getNonce(NODE, '0x0000000000000000000000000000000000000001')
    } catch (err) {
      raised = err
    }
    expect(raised, 'a single oversized frame must raise').to.not.equal(undefined)
    expect(String(raised?.message)).to.contain('exceeded the maximum buffered size')
  })

  it('draws the line at the ceiling exactly, in both directions', async () => {
    // The boundary is the whole contract of a cap, so it is pinned from both sides with
    // the same bytes on the wire — only the limit moves. The body is split across two
    // frames, which is how a real reply of any size arrives.
    const body = JSON.stringify({ nonce: 42, filler: 'x'.repeat(50) })
    const statusBytes = new TextEncoder().encode(OK_STATUS).byteLength
    const bodyBytes = new TextEncoder().encode(body).byteLength
    const total = statusBytes + bodyBytes
    const half = Math.floor(body.length / 2)

    async function attempt(limit: number): Promise<{ nonce?: number; error?: any }> {
      const attemptProvider = new P2pProvider()
      ;(attemptProvider as any).p2pConfig = {
        ...(attemptProvider as any).p2pConfig,
        maxBufferedCommandBytes: limit
      }
      const peer = await createP2pTestPeer({ provider: attemptProvider })
      ;(async () => {
        await peer.commandReceived
        peer.sendFrame(OK_STATUS)
        peer.sendFrame(body.slice(0, half))
        peer.sendFrame(body.slice(half))
        await peer.close()
      })().catch(() => {})
      try {
        return {
          nonce: await attemptProvider.getNonce(
            NODE,
            '0x0000000000000000000000000000000000000001'
          )
        }
      } catch (error) {
        return { error }
      }
    }

    const onTheLine = await attempt(total)
    expect(onTheLine.error, 'a reply of exactly the limit must be accepted').to.equal(
      undefined
    )
    expect(onTheLine.nonce).to.equal(42)

    const oneOver = await attempt(total - 1)
    expect(oneOver.error, 'one byte over the limit must be refused').to.not.equal(
      undefined
    )
    expect(String(oneOver.error?.message)).to.contain(
      'exceeded the maximum buffered size'
    )
  })

  it('fails a download that grows past its own, separate ceiling', async () => {
    const peer = await createP2pTestPeer({ provider })
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      peer.sendFrame(filledBytes(200))
      peer.sendFrame(filledBytes(200))
      await peer.close()
    })().catch(() => {})

    let raised: any
    try {
      await download(provider)
    } catch (err) {
      raised = err
    }

    expect(raised, 'an over-limit download must raise').to.not.equal(undefined)
    expect(String(raised?.message)).to.contain('exceeded the maximum buffered size')
    expect(String(raised?.message)).to.contain('download')
  })

  it('delivers a download that stays under the ceiling', async () => {
    const peer = await createP2pTestPeer({ provider })
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      peer.sendFrame(filledBytes(100))
      peer.sendFrame(filledBytes(100))
      await peer.close()
    })().catch(() => {})

    const result = await download(provider)
    expect(result.data.byteLength).to.equal(200)
  })

  it('counts a status-less first frame toward the download ceiling', async () => {
    // A node may answer a download with file bytes straight away and no status envelope,
    // in which case that first frame *is* data and has to be counted like any other. It
    // arrives through a different code path from the read loop, so it needs its own test.
    const attemptProvider = new P2pProvider()
    ;(attemptProvider as any).p2pConfig = {
      ...(attemptProvider as any).p2pConfig,
      maxBufferedDownloadBytes: 100
    }
    const peer = await createP2pTestPeer({ provider: attemptProvider })
    ;(async () => {
      await peer.commandReceived
      // Not JSON, so it is treated as the start of the file rather than a status frame.
      peer.sendFrame(filledBytes(150))
      await peer.close()
    })().catch(() => {})

    let raised: any
    try {
      await download(attemptProvider)
    } catch (err) {
      raised = err
    }
    expect(raised, 'a status-less first frame must be counted').to.not.equal(undefined)
    expect(String(raised?.message)).to.contain('exceeded the maximum buffered size')
  })

  it('uses the command ceiling for a command and the download ceiling for a download', async () => {
    // The two limits are not interchangeable — a dataset is not a status envelope — so a
    // body between them must be accepted on one path and refused on the other.
    const between = filledBytes(250)

    const downloadPeer = await createP2pTestPeer({ provider })
    ;(async () => {
      await downloadPeer.commandReceived
      downloadPeer.sendFrame(OK_STATUS)
      downloadPeer.sendFrame(between)
      await downloadPeer.close()
    })().catch(() => {})
    const result = await download(provider)
    expect(result.data.byteLength).to.equal(250)

    const commandProvider = new P2pProvider()
    const commandPeer = await createP2pTestPeer({ provider: commandProvider })
    ;(async () => {
      await commandPeer.commandReceived
      commandPeer.sendFrame(OK_STATUS)
      commandPeer.sendFrame(between)
      await commandPeer.close()
    })().catch(() => {})

    let raised: any
    try {
      await commandProvider.getNonce(NODE, '0x0000000000000000000000000000000000000001')
    } catch (err) {
      raised = err
    }
    expect(raised, 'the same body must be refused on the command path').to.be.instanceOf(
      P2pError
    )
  })
})
