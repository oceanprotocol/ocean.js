import { assert, expect } from 'chai'
import { HttpProvider } from '../../src/services/providers/HttpProvider.js'
import {
  CompleteSignature,
  ComputeAsset,
  ComputeAlgorithm
} from '../../src/@types/index.js'

// User-selectable subsidy providers (ocean-node #1485): computeStart, serviceStart and
// serviceExtend forward an optional `subsidyProviders: string[]` at the top level of the
// request body. These tests lock that wire contract by stubbing `fetch` and inspecting the
// body the client actually sends — an agent signature short-circuits the nonce round-trip,
// so no network call other than the captured request is made.

const NODE_URI = 'http://127.0.0.1:8001'
const AGENT_SIG: CompleteSignature = {
  consumerAddress: '0x0000000000000000000000000000000000000001',
  nonce: '1',
  signature: '0xdeadbeef'
}
const PROVIDERS = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222'
]

describe('User-selectable subsidy providers wire contract', () => {
  let provider: HttpProvider
  let originalFetch: typeof globalThis.fetch
  let lastBody: Record<string, any>

  beforeEach(() => {
    provider = new HttpProvider()
    originalFetch = globalThis.fetch
    lastBody = undefined
    // Capture the request body and return a minimal OK response.
    globalThis.fetch = (async (_url: string, init: any) => {
      lastBody = JSON.parse(init.body)
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => []
      }
    }) as any
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('computeStart forwards subsidyProviders when supplied', async () => {
    await provider.computeStart(
      NODE_URI,
      AGENT_SIG,
      'env-1',
      [{ documentId: 'did:op:1', serviceId: '0', transferTxId: '0x0' }] as ComputeAsset[],
      {} as ComputeAlgorithm,
      60,
      '0xtoken',
      [],
      8996,
      undefined, // metadata
      undefined, // additionalViewers
      undefined, // output
      undefined, // policyServer
      undefined, // signal
      undefined, // queueMaxWaitTime
      undefined, // dockerRegistryAuth
      undefined, // outputBucketId
      PROVIDERS
    )
    expect(lastBody.subsidyProviders).to.deep.equal(PROVIDERS)
  })

  it('computeStart omits subsidyProviders when not supplied', async () => {
    await provider.computeStart(
      NODE_URI,
      AGENT_SIG,
      'env-1',
      [{ documentId: 'did:op:1', serviceId: '0', transferTxId: '0x0' }] as ComputeAsset[],
      {} as ComputeAlgorithm,
      60,
      '0xtoken',
      [],
      8996
    )
    expect(lastBody).to.not.have.property('subsidyProviders')
  })

  it('serviceStart forwards subsidyProviders via ServiceStartParams', async () => {
    await provider.serviceStart(NODE_URI, AGENT_SIG, {
      environment: 'env-1',
      image: 'ubuntu',
      duration: 60,
      payment: { chainId: 8996, token: '0xtoken' },
      subsidyProviders: PROVIDERS
    })
    expect(lastBody.subsidyProviders).to.deep.equal(PROVIDERS)
  })

  it('serviceStart omits subsidyProviders when not supplied', async () => {
    await provider.serviceStart(NODE_URI, AGENT_SIG, {
      environment: 'env-1',
      image: 'ubuntu',
      duration: 60,
      payment: { chainId: 8996, token: '0xtoken' }
    })
    expect(lastBody).to.not.have.property('subsidyProviders')
  })

  it('serviceExtend forwards subsidyProviders when supplied', async () => {
    await provider.serviceExtend(
      NODE_URI,
      AGENT_SIG,
      'service-1',
      30,
      { chainId: 8996, token: '0xtoken' },
      undefined, // signal
      PROVIDERS
    )
    expect(lastBody.subsidyProviders).to.deep.equal(PROVIDERS)
  })

  it('serviceExtend omits subsidyProviders when not supplied', async () => {
    await provider.serviceExtend(NODE_URI, AGENT_SIG, 'service-1', 30, {
      chainId: 8996,
      token: '0xtoken'
    })
    expect(lastBody).to.not.have.property('subsidyProviders')
  })

  it('an empty array is forwarded (tri-state: explicitly no subsidy provider)', async () => {
    await provider.serviceExtend(
      NODE_URI,
      AGENT_SIG,
      'service-1',
      30,
      { chainId: 8996, token: '0xtoken' },
      undefined,
      []
    )
    // `[]` is truthy, so the client sends it — letting the node distinguish "none" from "default".
    assert.deepEqual(lastBody.subsidyProviders, [])
  })
})
