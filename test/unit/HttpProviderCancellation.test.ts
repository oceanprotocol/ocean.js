import { expect } from 'chai'
import { Wallet } from 'ethers'
import { ProviderInstance } from '../../src/index.js'

/**
 * `getDownloadUrl` and `getComputeResult` grew a trailing `AbortSignal`, and on the P2P
 * transport it reaches everything. On the HTTP transport it reached nothing: the façade
 * dispatches through a member typed `any`, so the extra argument was accepted by the
 * call and then dropped on the floor by a method that had no parameter for it. An HTTP
 * consumer passing a signal got silence, not cancellation.
 *
 * Two separate requests are at stake, and only one of them is obvious:
 *
 *   - the **result body**, which is the long one, and
 *   - the **nonce round-trip**, which runs first and which both of these methods perform
 *     whenever they are handed a `Signer` rather than a token. `getDownloadUrl` never
 *     transfers anything — it returns a URL for the caller to fetch — so the nonce
 *     request is the *whole* of its I/O, and it was uncancellable.
 *
 * These tests use a `Wallet`, because that is the credential shape that triggers the
 * nonce request; an auth token or a pre-made signature short-circuits it and would test
 * nothing.
 */
describe('HTTP transport cancellation', () => {
  const originalFetch = globalThis.fetch
  const NODE = 'http://127.0.0.1:8001'
  const signer = new Wallet(`0x${'11'.repeat(32)}`)

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  /** Records what each call received, and answers nonce requests plausibly. */
  function recordingFetch(): {
    calls: Array<{ url: string; signal?: AbortSignal }>
    install: () => void
  } {
    const calls: Array<{ url: string; signal?: AbortSignal }> = []
    return {
      calls,
      install: () => {
        globalThis.fetch = (async (url: string, init?: any) => {
          calls.push({ url, signal: init?.signal })
          if (url.includes('/nonce')) {
            return { ok: true, json: async () => ({ nonce: 7 }) } as any
          }
          return { ok: true, body: null } as any
        }) as any
      }
    }
  }

  it('carries the signal into the nonce round-trip behind getDownloadUrl', async () => {
    const fetches = recordingFetch()
    fetches.install()
    const controller = new AbortController()

    await ProviderInstance.getDownloadUrl(
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

    const nonceCall = fetches.calls.find((call) => call.url.includes('/nonce'))
    expect(nonceCall, 'the nonce request must have been made').to.not.equal(undefined)
    expect(nonceCall?.signal).to.equal(controller.signal)
  })

  it('carries the signal into both the nonce round-trip and the result request', async () => {
    const fetches = recordingFetch()
    fetches.install()
    const controller = new AbortController()

    await ProviderInstance.getComputeResult(
      NODE,
      signer,
      'job-1',
      0,
      0,
      controller.signal
    )

    expect(fetches.calls.length).to.be.at.least(2)
    for (const call of fetches.calls) {
      expect(call.signal, `${call.url} was sent without the signal`).to.equal(
        controller.signal
      )
    }
  })

  it('lets a mid-transfer abort break the result body rather than end it quietly', async () => {
    // Mimics what a real `fetch` does with a signal: the body stream is errored when the
    // signal fires. The distinction being asserted is between a body that *throws* and
    // one that simply stops — a short read reported as a complete result is the failure
    // mode worth ruling out.
    globalThis.fetch = (async (url: string, init?: any) => {
      if (url.includes('/nonce')) {
        return { ok: true, json: async () => ({ nonce: 7 }) } as any
      }
      const signal: AbortSignal | undefined = init?.signal
      let sent = 0
      const body = new ReadableStream<Uint8Array>({
        start(target) {
          signal?.addEventListener(
            'abort',
            () => target.error(new Error('aborted by signal')),
            { once: true }
          )
        },
        pull(target) {
          if (sent < 4) {
            target.enqueue(new TextEncoder().encode(`chunk-${sent++}`))
          }
          // Past the fourth chunk it produces nothing and never closes, so only the
          // abort can end this.
        }
      })
      return { ok: true, body } as any
    }) as any

    const controller = new AbortController()
    const result = await ProviderInstance.getComputeResult(
      NODE,
      signer,
      'job-1',
      0,
      0,
      controller.signal
    )

    const received: string[] = []
    let error: Error | null = null
    try {
      for await (const chunk of result as AsyncIterable<Uint8Array>) {
        received.push(new TextDecoder().decode(chunk))
        if (received.length === 2) controller.abort()
      }
    } catch (err: any) {
      error = err
    }

    expect(received.length).to.be.at.least(2)
    expect(error, 'an aborted transfer must raise, not end quietly').to.not.equal(null)
  })

  it('still works when no signal is passed', async () => {
    const fetches = recordingFetch()
    fetches.install()

    const url = await ProviderInstance.getDownloadUrl(
      'did:op:1',
      'service-1',
      0,
      '0xtx',
      NODE,
      signer
    )
    expect(url).to.be.a('string')
    expect(url).to.contain('/api/services/download')

    await ProviderInstance.getComputeResult(NODE, signer, 'job-1', 0)
    for (const call of fetches.calls) {
      expect(call.signal).to.equal(undefined)
    }
  })
})
