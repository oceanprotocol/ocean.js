import { expect } from 'chai'
import { lpStream, streamPair } from '@libp2p/utils'
import type { Stream } from '@libp2p/interface'
import { P2pProvider } from '../../src/services/providers/P2pProvider.js'

/**
 * A provider fan-out — "ask every provider of this CID for its status" — used to burst
 * one simultaneous dial per provider against a connection budget of which most slots
 * are already keep-alives. Every P2P command now takes a slot from one process-wide
 * gate before it dials.
 *
 * What is measured here is the number of dials and streams open at once, which is what
 * the connection budget cares about, and it must equal the configured limit exactly —
 * a gate that under-runs its limit is a throughput bug, one that over-runs it is the
 * original defect. The window counted is `getConnection` entry to stream close, which
 * sits inside the gate's own acquire/release window.
 *
 * Note what this cannot show. The gate hands a slot back on stream close as a
 * leak-guard, which for a reply small enough to fit in the read buffer happens before
 * the consumer reads anything, so a harness that held responses open would not observe
 * a premature release either — it is not built here and nothing below claims it.
 */
describe('P2P command concurrency gate', () => {
  const DIAL_MS = 20
  const provider = new P2pProvider()

  interface Instrumentation {
    active: number
    peak: number
    dials: number
  }

  type PeerScript = (peer: Stream, dialIndex: number) => Promise<void>

  function instrument(script: PeerScript): Instrumentation {
    const state: Instrumentation = { active: 0, peak: 0, dials: 0 }
    ;(provider as any).getConnection = async () => {
      const dialIndex = state.dials++
      state.active++
      state.peak = Math.max(state.peak, state.active)
      let counted = true
      const finish = () => {
        if (counted) {
          counted = false
          state.active--
        }
      }
      try {
        await new Promise((resolve) => setTimeout(resolve, DIAL_MS))
        return {
          newStream: async () => {
            const [peerStream, clientStream] = (await streamPair()) as unknown as [
              Stream,
              Stream
            ]
            // Registered before `dialAndStream` registers its own release listener, so
            // this decrement always lands before the slot is handed on and the count
            // can never be flattered by listener ordering.
            clientStream.addEventListener('close', finish, { once: true })
            void script(peerStream, dialIndex).catch(() => {})
            return clientStream
          },
          abort: () => finish()
        }
      } catch (err) {
        finish()
        throw err
      }
    }
    return state
  }

  /** Answers with a well-formed status envelope and closes. */
  const respondOk: PeerScript = async (peer) => {
    const lp = lpStream(peer)
    await lp.read({ signal: AbortSignal.timeout(20_000) })
    await lp.write(
      new TextEncoder().encode(JSON.stringify({ httpStatus: 200, id: 'node' })),
      { signal: AbortSignal.timeout(20_000) }
    )
    await peer.close()
  }

  function setLimit(limit: number): void {
    ;(provider as any).p2pConfig = {
      maxConcurrentRequests: limit,
      maxRetries: 0,
      retryDelay: 0
    }
  }

  afterEach(() => {
    ;(provider as any).p2pConfig = {}
  })

  for (const limit of [1, 2, 8]) {
    it(`opens exactly ${limit} dial(s) at a time when the limit is ${limit}`, async () => {
      setLimit(limit)
      const state = instrument(respondOk)
      const callers = limit * 3
      const results = await Promise.all(
        Array.from({ length: callers }, () => provider.getNodeStatus('test-peer'))
      )
      expect(results).to.have.lengthOf(callers)
      expect(state.dials).to.equal(callers)
      expect(
        state.peak,
        `peak concurrency was ${state.peak}, limit is ${limit}`
      ).to.equal(limit)
      expect(state.active, 'every slot must be back').to.equal(0)
    }).timeout(60_000)
  }

  it('holds no permit back after a wave of failures', async () => {
    const limit = 4
    setLimit(limit)
    // A wave that fails in three different ways: the peer resets the stream, the peer
    // answers with an error envelope, and the dial itself never produces a stream. Each
    // of those takes a slot; none of them may keep it.
    instrument(async (peer, index) => {
      const kind = index % 3
      if (kind === 0) {
        peer.abort(new Error('peer went away'))
        return
      }
      const lp = lpStream(peer)
      await lp.read({ signal: AbortSignal.timeout(20_000) })
      if (kind === 1) {
        await lp.write(
          new TextEncoder().encode(JSON.stringify({ httpStatus: 503, error: 'busy' })),
          { signal: AbortSignal.timeout(20_000) }
        )
      }
      await peer.close()
    })
    const churnResults = await Promise.allSettled(
      Array.from({ length: limit * 3 }, () => provider.getNodeStatus('test-peer'))
    )
    expect(
      churnResults.some((r) => r.status === 'rejected'),
      'the churn must fail'
    ).to.equal(true)

    // If any of those leaked a permit, this wave cannot reach the limit — and at a
    // total leak it cannot finish at all.
    const clean = instrument(respondOk)
    await Promise.all(
      Array.from({ length: limit * 3 }, () => provider.getNodeStatus('test-peer'))
    )
    expect(
      clean.peak,
      `only ${clean.peak} of ${limit} slots were still available`
    ).to.equal(limit)
    expect(clean.active).to.equal(0)
  }).timeout(120_000)

  it('does not wedge itself when a command retries recursively at a limit of one', async () => {
    ;(provider as any).p2pConfig = {
      maxConcurrentRequests: 1,
      maxRetries: 2,
      retryDelay: 0
    }
    // 'Cannot connect to peer' is the reply that drives the recursive retry. A retry
    // that kept its caller's slot would queue behind itself and never resume.
    const state = instrument(async (peer) => {
      const lp = lpStream(peer)
      await lp.read({ signal: AbortSignal.timeout(20_000) })
      await lp.write(
        new TextEncoder().encode(
          JSON.stringify({ httpStatus: 200, error: 'Cannot connect to peer' })
        ),
        { signal: AbortSignal.timeout(20_000) }
      )
      await peer.close()
    })
    const status = await provider.getNodeStatus('test-peer')
    expect((status as any).error).to.equal('Cannot connect to peer')
    // one initial attempt plus maxRetries
    expect(state.dials).to.equal(3)
    expect(state.peak).to.equal(1)
    expect(state.active).to.equal(0)
  }).timeout(60_000)

  it('treats a limit of zero as one rather than as no limit', async () => {
    // A consumer reading `maxConcurrentRequests: 0` as "unlimited" used to wedge the
    // client permanently on its very first P2P call, because no slot could ever be taken.
    setLimit(0)
    const state = instrument(respondOk)
    await Promise.all(
      Array.from({ length: 3 }, () => provider.getNodeStatus('test-peer'))
    )
    expect(state.peak).to.equal(1)
    expect(state.active).to.equal(0)
  }).timeout(60_000)
})
