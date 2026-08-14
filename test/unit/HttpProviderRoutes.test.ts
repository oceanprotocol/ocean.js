import { assert, expect } from 'chai'
import { ProviderInstance } from '../../src/index.js'

describe('HttpProvider.getNodeJobs request construction', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  // ocean-node registers this route as `/api/services/jobs/:job` with a REQUIRED (non-optional)
  // param — confirmed by running the real route in isolation: a request with no segment after
  // `/jobs/` 404s ("Cannot GET"), one with any literal segment (including the string ":job")
  // reaches the handler. The node has never given a way to ask for "no filter" here, so the
  // client sends the literal placeholder the node itself announces in its serviceEndpoints doc.
  it('requests the literal :job path segment, not an interpolated value', async () => {
    let requestedUrl: string | undefined
    let requestedMethod: string | undefined
    globalThis.fetch = (async (url: string, init?: any) => {
      requestedUrl = url
      requestedMethod = init?.method
      return { ok: true, json: async () => ({ jobs: [] }) } as any
    }) as any

    const jobs = await ProviderInstance.getNodeJobs('http://127.0.0.1:8001')
    assert(Array.isArray(jobs), 'should return an array')
    expect(requestedMethod).to.equal('GET')
    expect(requestedUrl).to.equal('http://127.0.0.1:8001/api/services/jobs/:job')
  })

  it('strips a trailing slash from nodeUri and appends fromTimestamp as a query param', async () => {
    let requestedUrl: string | undefined
    globalThis.fetch = (async (url: string) => {
      requestedUrl = url
      return { ok: true, json: async () => ({ jobs: [] }) } as any
    }) as any

    await ProviderInstance.getNodeJobs('http://127.0.0.1:8001/', 1700000000)
    expect(requestedUrl).to.equal(
      'http://127.0.0.1:8001/api/services/jobs/:job?fromTimestamp=1700000000'
    )
  })

  it('returns [] instead of throwing when the node responds with a non-ok status', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as any
    const jobs = await ProviderInstance.getNodeJobs('http://127.0.0.1:8001')
    expect(jobs).to.deep.equal([])
  })
})
