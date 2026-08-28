import { expect } from 'chai'
import { getEventListeners } from 'events'
import { P2pProvider } from '../../src/services/providers/P2pProvider.js'
import { AGENT_SIGNATURE } from './p2pStreamPeer.js'

/**
 * The dial budget used to be *replaced* by a caller's signal rather than composed with
 * it: `signal ?? AbortSignal.timeout(dialTimeout)`. So the moment a caller passed an
 * `AbortSignal` — which the cancellation work made the recommended thing to do — the
 * dial lost its only time bound.
 *
 * That matters because of what a stalled dial holds. A peer that accepts a TCP
 * connection and then never completes the upgrade parks the call *and its slot in the
 * process-wide concurrency gate*, so a handful of such peers starve every other P2P
 * call in the process. With a session-scoped `AbortController` — one per user session in
 * a server or an MCP host, which is the normal shape — "until the signal fires" means
 * hours.
 *
 * The fix bounds the dial and the stream open only. The writes that follow must stay on
 * the caller's own budget, because one of them can be a large request body that is
 * legitimately slower than any dial.
 */
describe('P2P dial budget', () => {
  const NODE = 'test-peer'
  const DIAL_MS = 300
  /** Long enough that only the dial budget can explain a rejection, short enough to run. */
  const PATIENCE_MS = 5_000

  let provider: P2pProvider
  let savedConfig: any

  beforeEach(() => {
    provider = new P2pProvider()
    savedConfig = (provider as any).p2pConfig
    ;(provider as any).p2pConfig = { ...savedConfig, dialTimeout: DIAL_MS }
  })

  afterEach(() => {
    ;(provider as any).p2pConfig = savedConfig
  })

  /**
   * A dial that never completes on its own and only ever ends because the signal it was
   * given fired. Records that signal so a test can prove which budget was in force.
   */
  function stallingDial(): { signals: AbortSignal[] } {
    const signals: AbortSignal[] = []
    ;(provider as any).getConnection = async (_node: string, signal?: AbortSignal) => {
      signals.push(signal as AbortSignal)
      return await new Promise((_resolve, reject) => {
        if (signal == null) return // hangs forever, which is itself a failure
        signal.addEventListener(
          'abort',
          () => reject(signal.reason ?? new Error('aborted')),
          { once: true }
        )
      })
    }
    return { signals }
  }

  async function timeToReject(run: () => Promise<unknown>): Promise<number> {
    const startedAt = Date.now()
    try {
      await run()
      return -1
    } catch {
      return Date.now() - startedAt
    }
  }

  it('bounds a stalled dial even though the caller supplied a live signal', async () => {
    const dial = stallingDial()
    // Never aborted. Under the old shape this signal *was* the dial budget, so the dial
    // had none at all and this call could not end.
    const caller = new AbortController()

    const elapsed = await timeToReject(() =>
      provider.getComputeResult(NODE, AGENT_SIGNATURE, 'job-1', 0, 0, caller.signal)
    )

    expect(elapsed, 'the call must reject rather than hang').to.be.greaterThan(-1)
    expect(elapsed).to.be.lessThan(PATIENCE_MS)
    expect(
      caller.signal.aborted,
      'the caller signal must not have been touched'
    ).to.equal(false)
    expect(dial.signals.length).to.be.at.least(1)
    expect(dial.signals[0].aborted).to.equal(true)
  })

  it('still lets the caller cancel first when the caller is the earlier deadline', async () => {
    stallingDial()
    const caller = new AbortController()
    const reason = new Error('caller changed their mind')
    setTimeout(() => caller.abort(reason), 20)

    let raised: any
    try {
      await provider.getComputeResult(NODE, AGENT_SIGNATURE, 'job-1', 0, 0, caller.signal)
    } catch (err) {
      raised = err
    }

    expect(raised, 'the call must reject').to.not.equal(undefined)
    expect(caller.signal.aborted).to.equal(true)
  })

  it('keeps the single shared budget when no caller signal is supplied', async () => {
    const dial = stallingDial()

    const elapsed = await timeToReject(() =>
      provider.getComputeResult(NODE, AGENT_SIGNATURE, 'job-1', 0)
    )

    expect(elapsed).to.be.greaterThan(-1)
    expect(elapsed).to.be.lessThan(PATIENCE_MS)
    // The dial and the writes after it share one timer in this case, exactly as before —
    // the fix is not allowed to hand signal-less callers a second budget.
    expect(dial.signals[0].aborted).to.equal(true)
  })

  it('leaves no listener behind on a long-lived caller signal', async () => {
    // The composite is built with a local controller precisely so it can be cleaned up;
    // `AbortSignal.any` would register itself in the source signal's dependant set and
    // never be pruned. A session-scoped controller sees many dials over its lifetime, so
    // a listener left behind per call is the leak this shape exists to avoid.
    stallingDial()
    const caller = new AbortController()

    const before = getEventListeners(caller.signal, 'abort').length
    for (let i = 0; i < 5; i++) {
      try {
        await provider.getComputeResult(
          NODE,
          AGENT_SIGNATURE,
          `job-${i}`,
          0,
          0,
          caller.signal
        )
      } catch {
        // every one of these ends on the dial budget
      }
    }
    const after = getEventListeners(caller.signal, 'abort').length

    expect(caller.signal.aborted).to.equal(false)
    expect(after, 'abort listeners must not accumulate across calls').to.equal(before)
  })
})
