import { expect } from 'chai'
import { lpStream, streamPair } from '@libp2p/utils'
import type { Stream } from '@libp2p/interface'
import {
  P2pProvider,
  P2pError,
  classifyP2pError,
  isRetryableP2pError,
  type P2pErrorType
} from '../../src/services/providers/P2pProvider.js'

/**
 * A failing P2P command used to be retried by two policies that did not know about each
 * other. One tested the reply body for `Cannot connect to peer` and recursed from inside
 * the `try`; the other tested a caught error's message for `closed` or `reset` and
 * recursed from the `catch`. Both matched on text, both had their own delay, and neither
 * jittered.
 *
 * Matching on message text is what makes that arrangement fragile rather than merely
 * untidy: an unrelated error elsewhere in the transport had to have its wording chosen
 * so that it would not accidentally look retryable to one of these predicates. These
 * tests pin the replacement — one loop, one budget, and a decision taken on the type of
 * the failure.
 *
 * The peer is one end of a real `streamPair`, so the framing, the reset and the
 * end-of-stream accounting are the ones a live connection produces.
 */
describe('P2P retry policy', () => {
  const provider = new P2pProvider()

  interface Dials {
    count: number
    signals: AbortSignal[]
    abortedOnEntry: boolean[]
  }

  type PeerScript = (peer: Stream, dialIndex: number) => Promise<void>

  /** Redirects the provider's dial at a scripted peer and records what each attempt got. */
  function scriptDials(script: PeerScript): Dials {
    const state: Dials = { count: 0, signals: [], abortedOnEntry: [] }
    ;(provider as any).getConnection = async (_uri: unknown, signal: AbortSignal) => {
      const index = state.count++
      state.signals.push(signal)
      state.abortedOnEntry.push(signal?.aborted === true)
      return {
        newStream: async () => {
          const [peerStream, clientStream] = (await streamPair()) as unknown as [
            Stream,
            Stream
          ]
          void script(peerStream, index).catch(() => {})
          return clientStream
        },
        abort: () => {}
      }
    }
    return state
  }

  const DEADLINE = { signal: AbortSignal.timeout(20_000) }

  /**
   * Idle budget for the tests whose peer tears the stream down instead of answering.
   *
   * It has to be set explicitly, and leaving it out is what made this file fragile. The
   * config installed by each test *replaces* the whole object, so omitting this falls back
   * to the 60 s default — which is exactly these tests' own mocha timeout, and there are up
   * to three attempts each with their own 60 s first-frame budget. So any delay in the
   * reset reaching the reader could only ever surface as "Timeout of 60000ms exceeded",
   * never as the assertion that would say what actually went wrong. Observed in CI on a
   * loaded runner; the failure carries no information by construction.
   *
   * Short enough that a reset which does not arrive fails fast and *as a timeout*, which
   * is a diagnosis rather than a stopwatch.
   */
  const NO_ANSWER_IDLE_MS = 2_000

  /** Reads the command frame, answers with `reply`, then ends the stream cleanly. */
  function replyWith(reply: Record<string, unknown>): PeerScript {
    return async (peer) => {
      const lp = lpStream(peer)
      await lp.read(DEADLINE)
      await lp.write(new TextEncoder().encode(JSON.stringify(reply)), DEADLINE)
      await peer.close()
    }
  }

  /** Reads the command frame and tears the stream down without answering. */
  const resetStream: PeerScript = async (peer) => {
    const lp = lpStream(peer)
    await lp.read(DEADLINE)
    peer.abort(new Error('the stream has been reset'))
  }

  async function failing(call: Promise<unknown>): Promise<any> {
    try {
      await call
      expect.fail('expected the command to reject')
    } catch (err) {
      return err
    }
  }

  afterEach(() => {
    ;(provider as any).p2pConfig = {}
  })

  it('retries the transport failures and no others', async () => {
    // The decision, stated once. A dial or a stream that died is the ordinary transient
    // and a deadline says only how long we waited; the other three describe an answer
    // that will be the same the second time, against a peer that will be the same peer.
    const expected: Record<P2pErrorType, boolean> = {
      dial_failed: true,
      timeout: true,
      resolve_failed: false,
      protocol_failed: false,
      peer_mismatch: false
    }
    for (const [type, retryable] of Object.entries(expected)) {
      expect(isRetryableP2pError(type as P2pErrorType), type).to.equal(retryable)
    }
  })

  it('classifies a failure by its type, not by its wording', async () => {
    const reset: any = new Error('the stream has been reset')
    reset.name = 'StreamResetError'
    expect(classifyP2pError(reset)).to.equal('dial_failed')

    const truncated: any = new Error('Unexpected EOF - stream closed while reading')
    truncated.name = 'UnexpectedEOFError'
    expect(classifyP2pError(truncated)).to.equal('dial_failed')

    const expired: any = new Error('signal timed out')
    expired.name = 'TimeoutError'
    expect(classifyP2pError(expired)).to.equal('timeout')

    // The wording that used to have to be chosen so it would not look retryable. It
    // says both `closed` and `reset`, and it is not a transport failure.
    const lifecycle = new Error('P2P was stopped while this operation was waiting')
    expect(classifyP2pError(lifecycle)).to.equal('protocol_failed')

    // An unrecognised error gets the type that is not retried, so a new error from a
    // dependency cannot turn into a retry storm on upgrade.
    expect(classifyP2pError({ name: 'SomethingNewError' })).to.equal('protocol_failed')
    expect(classifyP2pError(new P2pError('peer_mismatch', 'x'))).to.equal('peer_mismatch')
  })

  it('retries a stream reset and reports it as a dial failure', async () => {
    ;(provider as any).p2pConfig = {
      maxRetries: 2,
      retryDelay: 0,
      streamIdleTimeout: NO_ANSWER_IDLE_MS
    }
    const dials = scriptDials(resetStream)
    const err = await failing(provider.getNodeStatus('test-peer'))
    expect(err).to.be.instanceOf(P2pError)
    expect(err.type).to.equal('dial_failed')
    expect(err.message).to.contain('P2P command error: ')
    expect(dials.count).to.equal(3)
  }).timeout(60_000)

  it('retries a peer that never answers once, not to the full budget', async () => {
    // An expired deadline is worth another go — but its own budget is already long, so
    // spending the whole retry allowance on it multiplies a minute of waiting by six
    // against a peer that has already shown it is not answering.
    ;(provider as any).p2pConfig = { maxRetries: 4, retryDelay: 0, streamIdleTimeout: 60 }
    const dials = scriptDials(async (peer) => {
      // Reads the command and then says nothing at all, which is the failure a hung
      // node produces and the one the per-frame idle budget exists to bound.
      await lpStream(peer).read(DEADLINE)
      await new Promise((resolve) => setTimeout(resolve, 5_000))
    })
    const err = await failing(provider.getNodeStatus('test-peer'))
    expect(err).to.be.instanceOf(P2pError)
    expect(err.type).to.equal('timeout')
    expect(isRetryableP2pError('timeout'), 'a timeout is retried').to.equal(true)
    expect(dials.count, 'one attempt and one retry, not the whole budget').to.equal(2)
  }).timeout(60_000)

  it('does not retry an error envelope the peer answered with', async () => {
    ;(provider as any).p2pConfig = { maxRetries: 4, retryDelay: 0 }
    const dials = scriptDials(replyWith({ httpStatus: 500, error: 'boom' }))
    const err = await failing(provider.getNodeStatus('test-peer'))
    expect(err).to.be.instanceOf(P2pError)
    expect(err.type).to.equal('protocol_failed')
    expect(err.message).to.equal('P2P command error: boom')
    expect(dials.count, 'the peer answered; asking again gets the same answer').to.equal(
      1
    )
  }).timeout(60_000)

  it('spends one budget on a failure both old paths recognised', async () => {
    // The schedule below is the adversarial one for two independent policies: every
    // depth first takes the response-body path and that subtree then ends in a stream
    // reset, so a command that could branch on both would spawn two subtrees per depth
    // instead of one. With `maxRetries: 3` that is 15 attempts against a budget that
    // reads as 4, and the schedule is long enough to reveal it.
    const maxRetries = 3
    ;(provider as any).p2pConfig = {
      maxRetries,
      retryDelay: 0,
      streamIdleTimeout: NO_ANSWER_IDLE_MS
    }
    const schedule: Array<'body' | 'reset'> = []
    const build = (depth: number, wantThrow: boolean): void => {
      if (depth >= maxRetries) {
        schedule.push(wantThrow ? 'reset' : 'body')
        return
      }
      schedule.push('body')
      build(depth + 1, true)
      build(depth + 1, wantThrow)
    }
    build(0, true)
    expect(schedule.length).to.equal(15)

    const gatewayCannotReach = replyWith({
      httpStatus: 200,
      error: 'Cannot connect to peer'
    })
    const dials = scriptDials(async (peer, index) => {
      if ((schedule[index] ?? 'reset') === 'reset') return resetStream(peer, index)
      return gatewayCannotReach(peer, index)
    })

    const err = await failing(provider.getNodeStatus('test-peer'))
    expect(dials.count, 'one budget, not one per failure kind').to.equal(maxRetries + 1)
    expect(err.type).to.equal('dial_failed')
  }).timeout(60_000)

  it('still hands back the reply the peer sent once the budget is gone', async () => {
    // The untyped code returned this payload rather than raising when its retries ran
    // out, and a consumer reading `.error` off the result still can.
    const maxRetries = 2
    ;(provider as any).p2pConfig = { maxRetries, retryDelay: 0 }
    const dials = scriptDials(
      replyWith({ httpStatus: 200, error: 'Cannot connect to peer' })
    )
    const result: any = await provider.getNodeStatus('test-peer')
    expect(result.error).to.equal('Cannot connect to peer')
    expect(dials.count).to.equal(maxRetries + 1)
  }).timeout(60_000)

  it('gives every attempt its own deadline', async () => {
    // The backoff here is longer than the dial budget, so an attempt that inherited the
    // previous attempt's signal would start already aborted.
    ;(provider as any).p2pConfig = {
      maxRetries: 2,
      retryDelay: 120,
      dialTimeout: 40,
      streamIdleTimeout: NO_ANSWER_IDLE_MS
    }
    const dials = scriptDials(resetStream)
    await failing(provider.getNodeStatus('test-peer'))
    expect(dials.count).to.equal(3)
    expect(new Set(dials.signals).size, 'a retry must not reuse a spent signal').to.equal(
      3
    )
    expect(dials.abortedOnEntry).to.deep.equal([false, false, false])
  }).timeout(60_000)

  it('stops retrying once the caller has given up', async () => {
    ;(provider as any).p2pConfig = {
      maxRetries: 5,
      retryDelay: 0,
      streamIdleTimeout: NO_ANSWER_IDLE_MS
    }
    const controller = new AbortController()
    const dials = scriptDials(async (peer) => {
      await lpStream(peer).read(DEADLINE)
      controller.abort()
      peer.abort(new Error('the stream has been reset'))
    })
    const err = await failing(provider.getNodeStatus('test-peer', controller.signal))
    // The failure itself is one the policy would retry; the caller's spent signal is
    // the only reason it does not. Asserted, so this cannot pass because the failure
    // stopped being retryable.
    expect(
      isRetryableP2pError(err.type),
      'the premise is a failure that would otherwise be retried'
    ).to.equal(true)
    expect(dials.count, "the caller's budget is spent, not ours").to.equal(1)
  }).timeout(60_000)

  it('does not replay a request body it cannot rewind', async () => {
    ;(provider as any).p2pConfig = {
      maxRetries: 5,
      retryDelay: 0,
      streamIdleTimeout: NO_ANSWER_IDLE_MS
    }
    const dials = scriptDials(resetStream)
    async function* body() {
      yield new TextEncoder().encode('one shot')
    }
    const err = await failing(
      (provider as any).sendP2pCommand('test-peer', 'status', {}, null, undefined, body())
    )
    expect(err.type).to.equal('dial_failed')
    expect(dials.count, 'a second attempt would send a consumed body').to.equal(1)
  }).timeout(60_000)

  it('spreads retries instead of returning in lockstep', async () => {
    ;(provider as any).p2pConfig = { retryDelay: 1000 }
    const backoff = (attempt: number): number => (provider as any).retryBackoffMs(attempt)

    for (const [attempt, window] of [
      [1, 1000],
      [2, 2000],
      [3, 4000],
      [4, 8000],
      [5, 15_000]
    ]) {
      const draws = Array.from({ length: 400 }, () => backoff(attempt))
      const low = Math.min(...draws)
      const high = Math.max(...draws)
      expect(low, `attempt ${attempt} floor`).to.be.at.least(window / 2)
      expect(high, `attempt ${attempt} ceiling`).to.be.at.most(window)
      // Jitter, not a constant: without it every client that saw the same event comes
      // back at the same instant.
      expect(
        new Set(draws).size,
        `attempt ${attempt} must not return a fixed delay`
      ).to.be.greaterThan(50)
      // Half the window stays fixed, so a retry cannot land before libp2p has finished
      // tearing down the connection that just failed.
      expect(low, `attempt ${attempt} must keep a floor`).to.be.greaterThan(
        window / 2 - 1
      )
    }

    // Capped, so the last retry of a large `retryDelay` does not wait minutes.
    ;(provider as any).p2pConfig = { retryDelay: 600_000 }
    expect(backoff(1)).to.be.at.most(15_000)
    // A value that is not a usable delay falls back to the default rather than to zero.
    ;(provider as any).p2pConfig = { retryDelay: Number.NaN }
    expect(backoff(1)).to.be.at.least(500)
  })
})
