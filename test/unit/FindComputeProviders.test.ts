import { expect } from 'chai'
import { multiaddr } from '@multiformats/multiaddr'
import { BaseProvider } from '../../src/services/providers/BaseProvider.js'
import { c2dCapabilityContent } from '../../src/utils/C2dCapability.js'
import type { P2pProviderRecord } from '../../src/services/providers/P2pProvider.js'
import type { ComputeEnvironment, OceanNode } from '../../src/@types/index.js'

/**
 * `BaseProvider.findComputeProviders` is the typed search API a caller uses instead of
 * building a lookup string, computing a bucket, or handling a content id directly. These
 * tests exercise it end to end — bucketing, the DHT-style provider lookup, and the mandatory
 * verification step — against stubbed provider lookups rather than a live fleet.
 *
 * That's deliberate, not a shortcut: the announce side that would make a real fleet emit
 * bucketed advertisements is a separate, not-yet-deployed change. Until it ships, this method
 * returns empty results against any real network because the fleet still announces exact
 * values while this client looks up buckets. None of that affects the correctness of the
 * client-side logic under test here, which only depends on the shape of what a provider
 * lookup and a compute-environments call return — hence the stubs.
 */
describe('findComputeProviders (stubbed provider lookups — no live fleet)', () => {
  let provider: BaseProvider
  let p2p: ReturnType<BaseProvider['getP2PProvider']>
  let originalGetProvidersForString: typeof p2p.getProvidersForString
  let originalGetComputeEnvironments: typeof p2p.getComputeEnvironments

  beforeEach(() => {
    provider = new BaseProvider()
    p2p = provider.getP2PProvider()
    originalGetProvidersForString = p2p.getProvidersForString.bind(p2p)
    originalGetComputeEnvironments = p2p.getComputeEnvironments.bind(p2p)
  })

  afterEach(() => {
    // The P2P provider backing every BaseProvider is a process-wide singleton, so the stubs
    // installed below must be undone after each test rather than left to leak into the next.
    p2p.getProvidersForString = originalGetProvidersForString
    p2p.getComputeEnvironments = originalGetComputeEnvironments
  })

  function fakeRecord(id: string): P2pProviderRecord {
    return { id, multiaddrs: [multiaddr('/ip4/127.0.0.1/tcp/4001')] }
  }

  /** Maps an already-bucketed content string to the provider ids that "announce" it. */
  function stubAnnouncements(byContent: Record<string, P2pProviderRecord[]>): void {
    p2p.getProvidersForString = (async (content: string) =>
      byContent[content] ?? []) as typeof p2p.getProvidersForString
  }

  /** Maps a provider's node id to its real compute environments. */
  function stubEnvironments(byNodeId: Record<string, ComputeEnvironment[]>): void {
    p2p.getComputeEnvironments = (async (node: OceanNode) => {
      const id = typeof node === 'string' ? node : (node as { nodeId?: string }).nodeId
      return (id && byNodeId[id]) || []
    }) as typeof p2p.getComputeEnvironments
  }

  const A_NODE: OceanNode = {
    nodeId: 'caller-entry-node',
    multiaddress: [multiaddr('/ip4/127.0.0.1/tcp/4001')]
  }

  it('rejects a node that does not identify the P2P network', async () => {
    try {
      await provider.findComputeProviders('https://provider.example.com', {
        free: false,
        resources: [{ resource: 'cpu', value: 4 }]
      })
      expect.fail('expected findComputeProviders to reject a non-P2P node')
    } catch (err: any) {
      expect(err.message).to.match(/P2P/)
    }
  })

  it('rejects a request with no resource dimensions', async () => {
    try {
      await provider.findComputeProviders(A_NODE, { free: false, resources: [] })
      expect.fail('expected findComputeProviders to reject an empty resources array')
    } catch (err: any) {
      expect(err.message).to.match(/resources/)
    }
  })

  it('finds a single-dimension match and verifies it against real compute environments', async () => {
    const bucket8Cpu = c2dCapabilityContent({ free: false, resource: 'cpu', value: 8 })
    stubAnnouncements({ [bucket8Cpu]: [fakeRecord('nodeA')] })
    stubEnvironments({
      nodeA: [
        {
          id: 'env-1',
          consumerAddress: '0xabc',
          runningJobs: 0,
          fees: {},
          resources: [{ id: 'cpu', max: 8 }]
        } as unknown as ComputeEnvironment
      ]
    })

    const result = await provider.findComputeProviders(A_NODE, {
      free: false,
      resources: [{ resource: 'cpu', value: 8 }]
    })

    expect(result.dimensions).to.have.lengthOf(1)
    expect(result.dimensions[0]).to.include({ resource: 'cpu', value: 8, bucket: 8 })
    expect(result.dimensions[0].providerIds).to.deep.equal(['nodeA'])
    expect(result.providers).to.have.lengthOf(1)
    expect(result.providers[0].node.nodeId).to.equal('nodeA')
  })

  it('drops a bucket match whose real maximum cannot satisfy the unbucketed request', async () => {
    // Bucketing rounds down on both sides, so a request for cpu:9 looks up bucket 8 — the
    // same bucket a provider whose true maximum is exactly 8 would announce. That is a false
    // positive by design; verification against the provider's real environment is what
    // filters it back out.
    const bucket8Cpu = c2dCapabilityContent({ free: false, resource: 'cpu', value: 8 })
    stubAnnouncements({ [bucket8Cpu]: [fakeRecord('nodeA')] })
    stubEnvironments({
      nodeA: [
        {
          id: 'env-1',
          consumerAddress: '0xabc',
          runningJobs: 0,
          fees: {},
          resources: [{ id: 'cpu', max: 8 }] // true max is 8, request asks for 9
        } as unknown as ComputeEnvironment
      ]
    })

    const result = await provider.findComputeProviders(A_NODE, {
      free: false,
      resources: [{ resource: 'cpu', value: 9 }]
    })

    // The raw DHT-style hit is still visible in the breakdown...
    expect(result.dimensions[0].providerIds).to.deep.equal(['nodeA'])
    // ...but verification drops it from the final, trustworthy result.
    expect(result.providers).to.have.lengthOf(0)
  })

  it('intersects a multi-dimension request rather than widening the lookup', async () => {
    const cpuBucket8 = c2dCapabilityContent({ free: false, resource: 'cpu', value: 8 })
    const ramBucket8 = c2dCapabilityContent({ free: false, resource: 'ram', value: 8 })
    stubAnnouncements({
      // nodeA announces both; nodeB only announces cpu.
      [cpuBucket8]: [fakeRecord('nodeA'), fakeRecord('nodeB')],
      [ramBucket8]: [fakeRecord('nodeA')]
    })
    stubEnvironments({
      nodeA: [
        {
          id: 'env-1',
          consumerAddress: '0xabc',
          runningJobs: 0,
          fees: {},
          resources: [
            { id: 'cpu', max: 12 },
            { id: 'ram', max: 10 }
          ]
        } as unknown as ComputeEnvironment
      ]
    })

    const result = await provider.findComputeProviders(A_NODE, {
      free: false,
      resources: [
        { resource: 'cpu', value: 9 },
        { resource: 'ram', value: 8 }
      ]
    })

    expect(result.dimensions).to.have.lengthOf(2)
    expect(result.providers.map((p) => p.node.nodeId)).to.deep.equal(['nodeA'])
  })

  it('reports which dimension had nothing, without silently zeroing the whole result', async () => {
    const cpuBucket8 = c2dCapabilityContent({ free: false, resource: 'cpu', value: 8 })
    stubAnnouncements({
      [cpuBucket8]: [fakeRecord('nodeA')]
      // no entry at all for the fpga bucket string: an old fleet has never heard of fpga.
    })
    stubEnvironments({})

    const result = await provider.findComputeProviders(A_NODE, {
      free: false,
      resources: [
        { resource: 'cpu', value: 8 },
        { resource: 'fpga', value: 4 }
      ]
    })

    expect(result.providers).to.have.lengthOf(0)
    const cpuDimension = result.dimensions.find((d) => d.resource === 'cpu')
    const fpgaDimension = result.dimensions.find((d) => d.resource === 'fpga')
    expect(cpuDimension?.providerIds).to.deep.equal(['nodeA'])
    expect(fpgaDimension?.providerIds).to.deep.equal([])
  })

  it('applies an optional model qualifier only at verification, never in the lookup string', async () => {
    const gpuBucket2 = c2dCapabilityContent({ free: false, resource: 'gpu', value: 2 })
    stubAnnouncements({ [gpuBucket2]: [fakeRecord('nodeA'), fakeRecord('nodeB')] })
    stubEnvironments({
      nodeA: [
        {
          id: 'env-1',
          consumerAddress: '0xabc',
          runningJobs: 0,
          fees: {},
          resources: [{ id: 'gpu-0', max: 2, description: 'NVIDIA A100' }]
        } as unknown as ComputeEnvironment
      ],
      nodeB: [
        {
          id: 'env-1',
          consumerAddress: '0xdef',
          runningJobs: 0,
          fees: {},
          resources: [{ id: 'gpu-0', max: 2, description: 'NVIDIA RTX 4090' }]
        } as unknown as ComputeEnvironment
      ]
    })

    const result = await provider.findComputeProviders(A_NODE, {
      free: false,
      resources: [{ resource: 'gpu', value: 2 }],
      models: { gpu: 'A100' }
    })

    expect(result.providers.map((p) => p.node.nodeId)).to.deep.equal(['nodeA'])
  })

  it('returns an empty, typed result rather than throwing when a resource is unknown to the fleet', async () => {
    stubAnnouncements({})
    stubEnvironments({})

    const result = await provider.findComputeProviders(A_NODE, {
      free: false,
      resources: [{ resource: 'fpga', value: 4 }]
    })

    expect(result.providers).to.deep.equal([])
    expect(result.dimensions).to.have.lengthOf(1)
    expect(result.dimensions[0].providerIds).to.deep.equal([])
  })

  it('surfaces a partial/early-terminated lookup on the affected dimension', async () => {
    const cpuBucket8 = c2dCapabilityContent({ free: false, resource: 'cpu', value: 8 })
    stubAnnouncements({
      [cpuBucket8]: [
        { id: 'nodeA', multiaddrs: [], partial: true, error: 'DHT walk timed out' }
      ]
    })
    stubEnvironments({ nodeA: [] })

    const result = await provider.findComputeProviders(A_NODE, {
      free: false,
      resources: [{ resource: 'cpu', value: 8 }]
    })

    expect(result.dimensions[0].partial).to.equal(true)
    expect(result.dimensions[0].error).to.equal('DHT walk timed out')
  })
})
