import { assert, expect } from 'chai'
import { ProviderInstance } from '../../src/index.js'
import { PROTOCOL_COMMANDS } from '../../src/@types/Provider.js'

describe('getEscrowEvents command', () => {
  it('uses the "getEscrowEvents" protocol command string', () => {
    expect(PROTOCOL_COMMANDS.GET_ESCROW_EVENTS).to.equal('getEscrowEvents')
  })
})

describe('HttpProvider.getEscrowEvents request construction', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function stubFetch(response: any) {
    let requestedUrl: string | undefined
    let requestedMethod: string | undefined
    globalThis.fetch = (async (url: string, init?: any) => {
      requestedUrl = url
      requestedMethod = init?.method
      return response
    }) as any
    return () => ({ requestedUrl, requestedMethod })
  }

  it('hits the REST events route and returns the parsed array', async () => {
    const rows = [{ id: 'a-0', eventType: 'Deposit', chainId: 8996 }]
    const read = stubFetch({ ok: true, json: async () => rows })
    const result = await ProviderInstance.getEscrowEvents('http://127.0.0.1:8001')
    const { requestedUrl, requestedMethod } = read()
    expect(requestedMethod).to.equal('GET')
    expect(requestedUrl).to.equal('http://127.0.0.1:8001/api/services/escrow/events')
    expect(result).to.deep.equal(rows)
  })

  it('serializes equality filters onto the query string', async () => {
    const read = stubFetch({ ok: true, json: async () => [] })
    await ProviderInstance.getEscrowEvents('http://127.0.0.1:8001', {
      chainId: 8996,
      eventType: 'Deposit'
    })
    const { requestedUrl } = read()
    expect(requestedUrl).to.contain('chainId=8996')
    expect(requestedUrl).to.contain('eventType=Deposit')
  })

  it('flattens ranges to <field>Min / <field>Max', async () => {
    const read = stubFetch({ ok: true, json: async () => [] })
    await ProviderInstance.getEscrowEvents('http://127.0.0.1:8001', {
      ranges: { block: { min: 1, max: 2 }, subsidyAmount: { min: '10' } }
    })
    const { requestedUrl } = read()
    expect(requestedUrl).to.contain('blockMin=1')
    expect(requestedUrl).to.contain('blockMax=2')
    expect(requestedUrl).to.contain('subsidyAmountMin=10')
  })

  it('drops gt/lt bounds over HTTP (REST reads only min/max)', async () => {
    const read = stubFetch({ ok: true, json: async () => [] })
    await ProviderInstance.getEscrowEvents('http://127.0.0.1:8001', {
      ranges: { block: { gt: '5', lt: '9' } }
    })
    const { requestedUrl } = read()
    expect(requestedUrl).to.not.contain('block')
  })

  it('returns [] when the node responds with a non-ok status', async () => {
    stubFetch({ ok: false, status: 400 })
    const result = await ProviderInstance.getEscrowEvents('http://127.0.0.1:8001', {
      ranges: { payer: { min: 1 } } // unsupported range field -> node 400
    })
    expect(result).to.deep.equal([])
  })

  it('returns [] when the node returns a non-array body', async () => {
    stubFetch({ ok: true, json: async () => ({ error: 'nope' }) })
    const result = await ProviderInstance.getEscrowEvents('http://127.0.0.1:8001')
    expect(result).to.deep.equal([])
  })
})

describe('getAllEscrowEvents auto-pagination', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('walks pages until a short page is returned', async () => {
    // First call returns a full page of 250, second returns a short page -> stop.
    const page1 = Array.from({ length: 250 }, (_, i) => ({
      id: `p1-${i}`,
      eventType: 'Deposit',
      chainId: 8996
    }))
    const page2 = [{ id: 'p2-0', eventType: 'Deposit', chainId: 8996 }]
    const offsets: string[] = []
    let call = 0
    globalThis.fetch = (async (url: string) => {
      const match = String(url).match(/offset=(\d+)/)
      offsets.push(match ? match[1] : 'none')
      const body = call === 0 ? page1 : page2
      call++
      return { ok: true, json: async () => body } as any
    }) as any

    const all = await ProviderInstance.getAllEscrowEvents('http://127.0.0.1:8001')
    assert(Array.isArray(all))
    expect(all.length).to.equal(251)
    expect(offsets).to.deep.equal(['0', '250'])
  })
})
