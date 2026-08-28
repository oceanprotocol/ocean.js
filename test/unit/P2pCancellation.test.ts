import { expect } from 'chai'
import { Wallet } from 'ethers'
import { AGENT_SIGNATURE, OK_STATUS, createP2pTestPeer, drain } from './p2pStreamPeer.js'

/**
 * A bulk transfer used to be cancellable only up to its first frame: frames 2..n read
 * under a bare idle timeout, so an `AbortController` a caller held for a
 * multi-gigabyte download did nothing once the download had started — exactly the
 * wrong way round. The trailing `AbortSignal` on `getDownloadUrl` and
 * `getComputeResult` now covers the nonce round-trip, the dial, the first frame and
 * every tail frame, and cancelling tears the stream down so the peer stops producing.
 *
 * The signal is optional, and the older call shapes without it must keep working —
 * that is the backward-compatibility guarantee, so it is asserted here too.
 */
describe('P2P transfer cancellation', () => {
  const NODE = 'test-peer'
  /** Comfortably under the 60 s per-frame idle timeout, so only the signal can explain it. */
  const PROMPT_MS = 3_000

  it('stops a compute result already in flight and tears the stream down', async () => {
    const peer = await createP2pTestPeer()
    const controller = new AbortController()
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      peer.sendFrame('chunk-0')
      peer.sendFrame('chunk-1')
      // then stalls: the transfer is open and idle, which is where a cancel lands
    })().catch(() => {})

    const body = await peer.provider.getComputeResult(
      NODE,
      AGENT_SIGNATURE,
      'job-1',
      0,
      0,
      controller.signal
    )

    const received: string[] = []
    const startedAt = Date.now()
    let error: Error | null = null
    try {
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        received.push(new TextDecoder().decode(chunk))
        if (received.length === 2) {
          controller.abort()
        }
      }
    } catch (err) {
      error = err as Error
    }
    const elapsed = Date.now() - startedAt

    expect(received).to.deep.equal(['chunk-0', 'chunk-1'])
    expect(error, 'an aborted transfer must not end as a clean completion').to.not.equal(
      null
    )
    expect(elapsed, `settled after ${elapsed}ms`).to.be.lessThan(PROMPT_MS)
    const closeError = await Promise.race([
      peer.closed,
      new Promise((resolve) => setTimeout(() => resolve('still open'), PROMPT_MS))
    ])
    expect(closeError, 'the peer must be told to stop producing').to.not.equal(
      'still open'
    )
  }).timeout(30_000)

  it('stops a download already in flight and tears the stream down', async () => {
    const peer = await createP2pTestPeer()
    const controller = new AbortController()
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      peer.sendFrame('part-0')
    })().catch(() => {})

    const startedAt = Date.now()
    const download = peer.provider.getDownloadUrl(
      'did:op:1',
      'service-1',
      0,
      '0xtx',
      NODE,
      AGENT_SIGNATURE,
      undefined,
      undefined,
      controller.signal
    )
    setTimeout(() => controller.abort(), 100)

    let error: Error | null = null
    try {
      await download
    } catch (err) {
      error = err as Error
    }
    const elapsed = Date.now() - startedAt

    expect(
      error,
      'an aborted download must not resolve with a partial file'
    ).to.not.equal(null)
    expect(elapsed, `settled after ${elapsed}ms`).to.be.lessThan(PROMPT_MS)
    const closeError = await Promise.race([
      peer.closed,
      new Promise((resolve) => setTimeout(() => resolve('still open'), PROMPT_MS))
    ])
    expect(closeError, 'the peer must be told to stop producing').to.not.equal(
      'still open'
    )
  }).timeout(30_000)

  it('covers the nonce round-trip that precedes a download', async () => {
    // A real signer, so the download takes the signing path: the nonce is fetched from
    // the peer before anything is dialled for the download itself. The peer never
    // answers, so only the caller's signal can end this.
    const signer = new Wallet(
      '0x0123456789012345678901234567890123456789012345678901234567890123'
    )
    const peer = await createP2pTestPeer()
    const controller = new AbortController()
    ;(async () => {
      await peer.commandReceived
      // deliberately silent
    })().catch(() => {})

    const startedAt = Date.now()
    const download = peer.provider.getDownloadUrl(
      'did:op:1',
      'service-1',
      0,
      '0xtx',
      NODE,
      signer,
      undefined,
      undefined,
      controller.signal
    )
    setTimeout(() => controller.abort(), 100)

    let error: Error | null = null
    try {
      await download
    } catch (err) {
      error = err as Error
    }
    const elapsed = Date.now() - startedAt

    expect(error, 'the nonce round-trip must honour the signal').to.not.equal(null)
    expect(elapsed, `settled after ${elapsed}ms`).to.be.lessThan(PROMPT_MS)
  }).timeout(30_000)

  it('keeps working for callers that pass no signal at all', async () => {
    const peer = await createP2pTestPeer()
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      peer.sendFrame('only-part')
      await peer.close()
    })().catch(() => {})

    // The pre-existing call shape: no trailing signal.
    const download = await peer.provider.getDownloadUrl(
      'did:op:1',
      'service-1',
      0,
      '0xtx',
      NODE,
      AGENT_SIGNATURE
    )
    expect(new TextDecoder().decode(new Uint8Array(download.data))).to.equal('only-part')
    expect(download.filename).to.equal('file0')
  }).timeout(30_000)

  it('keeps working for compute-result callers that pass no signal at all', async () => {
    const peer = await createP2pTestPeer()
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      peer.sendFrame('result-0')
      peer.sendFrame('result-1')
      await peer.close()
    })().catch(() => {})

    // The pre-existing call shape: no offset, no trailing signal.
    const body = await peer.provider.getComputeResult(NODE, AGENT_SIGNATURE, 'job-1', 0)
    const frames = await drain(body as AsyncIterable<Uint8Array>)
    expect(frames.map((frame) => new TextDecoder().decode(frame))).to.deep.equal([
      'result-0',
      'result-1'
    ])
  }).timeout(30_000)
})
