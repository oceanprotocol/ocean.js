import { expect } from 'chai'
import { P2pProvider } from '../../src/services/providers/P2pProvider.js'

/**
 * `getDiscoveredNodes()` answered "who is in the peer store, at what addresses" and stopped
 * there. That is the half that does not decide anything: a peer can sit in the store with
 * three addresses and be unreachable, can be connected only over a circuit relay that will
 * drop the connection after a byte budget, or can be connected only because *it* dialled
 * *us*. An address list shows none of that.
 *
 * So each entry gained the connection state, additively — `peerId` and `multiaddrs` are
 * untouched — and the node-wide facts went into a separate `getP2pDiagnostics()` rather
 * than widening a method that returns an array, which would have broken every consumer
 * destructuring its elements.
 */
describe('P2P diagnostics', () => {
  const provider = new P2pProvider()

  afterEach(async () => {
    await provider.stopP2P()
  })

  /** A libp2p just real enough for the two methods to walk. */
  function fakeNode(options: {
    peers: Array<{ id: string; addrs: string[] }>
    connections: Record<
      string,
      Array<{ direction: string; addr: string; limited?: boolean }>
    >
    routingTableSize?: number
    dhtMode?: string
    ages?: { maxAddressAge?: number; maxPeerAge?: number }
  }): any {
    return {
      peerId: { toString: () => 'self-peer' },
      peerStore: {
        all: async () =>
          options.peers.map((peer) => ({
            id: { toString: () => peer.id },
            addresses: peer.addrs.map((addr) => ({ multiaddr: { toString: () => addr } }))
          })),
        store: options.ages
      },
      getConnections: (peerId?: { toString: () => string }) => {
        const all = Object.values(options.connections).flat()
        const forPeer =
          peerId === undefined ? all : (options.connections[peerId.toString()] ?? [])
        return forPeer.map((connection) => ({
          direction: connection.direction,
          remoteAddr: { toString: () => connection.addr },
          limits: connection.limited === true ? { bytes: 1n } : undefined
        }))
      },
      services: {
        dht: {
          routingTable: { size: options.routingTableSize },
          getMode: options.dhtMode === undefined ? undefined : () => options.dhtMode
        }
      }
    }
  }

  function install(node: any): void {
    ;(provider as any).libp2pNode = node
  }

  describe('getDiscoveredNodes', () => {
    it('keeps peerId and multiaddrs exactly as they were', async () => {
      install(
        fakeNode({
          peers: [{ id: 'peer-a', addrs: ['/ip4/1.2.3.4/tcp/9000'] }],
          connections: {}
        })
      )
      const [node] = await provider.getDiscoveredNodes()
      expect(node.peerId).to.equal('peer-a')
      expect(node.multiaddrs).to.deep.equal(['/ip4/1.2.3.4/tcp/9000'])
    })

    it('reports a known-but-unconnected peer as such', async () => {
      // The distinction the old shape could not make, and the common case: the peer store
      // remembers a peer for 48 h whether or not anything can reach it.
      install(
        fakeNode({
          peers: [{ id: 'peer-a', addrs: ['/ip4/1.2.3.4/tcp/9000'] }],
          connections: {}
        })
      )
      const [node] = await provider.getDiscoveredNodes()
      expect(node.connections).to.equal(0)
      expect(node.direction).to.equal(undefined)
      expect(node.transports).to.deep.equal([])
      expect(node.limited).to.equal(false)
    })

    it('reports direction, transport and the relay limit of a connected peer', async () => {
      install(
        fakeNode({
          peers: [{ id: 'peer-a', addrs: [] }],
          connections: {
            'peer-a': [
              { direction: 'outbound', addr: '/dns4/x.example/tcp/443/wss' },
              { direction: 'outbound', addr: '/ip4/1.2.3.4/tcp/9000' }
            ]
          }
        })
      )
      const [node] = await provider.getDiscoveredNodes()
      expect(node.connections).to.equal(2)
      expect(node.direction).to.equal('outbound')
      expect(node.transports.sort()).to.deep.equal(['tcp', 'wss'])
      expect(node.limited).to.equal(false)
    })

    it('calls a peer limited only when every connection to it is', async () => {
      // One unrestricted connection is enough to carry a transfer, so a peer with a relayed
      // *and* a direct connection is not limited. Getting this backwards would mark most
      // healthy peers as degraded.
      install(
        fakeNode({
          peers: [
            { id: 'relayed-only', addrs: [] },
            { id: 'also-direct', addrs: [] }
          ],
          connections: {
            'relayed-only': [
              {
                direction: 'inbound',
                addr: '/ip4/9.9.9.9/tcp/4001/p2p/QmRelay/p2p-circuit',
                limited: true
              }
            ],
            'also-direct': [
              {
                direction: 'inbound',
                addr: '/ip4/9.9.9.9/tcp/4001/p2p/QmRelay/p2p-circuit',
                limited: true
              },
              { direction: 'outbound', addr: '/ip4/1.2.3.4/tcp/9000' }
            ]
          }
        })
      )
      const nodes = await provider.getDiscoveredNodes()
      const relayedOnly = nodes.find((n) => n.peerId === 'relayed-only')
      const alsoDirect = nodes.find((n) => n.peerId === 'also-direct')
      expect(relayedOnly?.limited).to.equal(true)
      expect(relayedOnly?.transports).to.deep.equal(['circuit-relay'])
      expect(alsoDirect?.limited).to.equal(false)
    })

    it('reports mixed when a peer was dialled in both directions', async () => {
      install(
        fakeNode({
          peers: [{ id: 'peer-a', addrs: [] }],
          connections: {
            'peer-a': [
              { direction: 'inbound', addr: '/ip4/1.2.3.4/tcp/9000' },
              { direction: 'outbound', addr: '/ip4/1.2.3.4/tcp/9000' }
            ]
          }
        })
      )
      const [node] = await provider.getDiscoveredNodes()
      expect(node.direction).to.equal('mixed')
    })

    it('returns an empty list when there is no node', async () => {
      install(undefined)
      expect(await provider.getDiscoveredNodes()).to.deep.equal([])
    })
  })

  describe('getP2pDiagnostics', () => {
    it('reports the routing table, the DHT mode and the effective peer store ages', () => {
      install(
        fakeNode({
          peers: [],
          connections: { a: [{ direction: 'outbound', addr: '/ip4/1.2.3.4/tcp/9000' }] },
          routingTableSize: 12,
          dhtMode: 'client',
          ages: { maxAddressAge: 172_800_000, maxPeerAge: 172_800_000 }
        })
      )
      const diagnostics = provider.getP2pDiagnostics()
      expect(diagnostics.running).to.equal(true)
      expect(diagnostics.peerId).to.equal('self-peer')
      expect(diagnostics.connections).to.equal(1)
      expect(diagnostics.routingTablePeers).to.equal(12)
      expect(diagnostics.dhtMode).to.equal('client')
      expect(diagnostics.peerStore).to.deep.equal({
        maxAddressAge: 172_800_000,
        maxPeerAge: 172_800_000
      })
      expect(diagnostics.resolution).to.have.property('resolve:dht-hit')
    })

    it('distinguishes an unreachable DHT service from an empty routing table', () => {
      // Not knowing is not the same as knowing the table is empty, and reporting `0` for
      // both would make a broken DHT service look like a freshly started node.
      install(fakeNode({ peers: [], connections: {}, routingTableSize: undefined }))
      expect(provider.getP2pDiagnostics().routingTablePeers).to.equal(undefined)

      install(fakeNode({ peers: [], connections: {}, routingTableSize: 0 }))
      expect(provider.getP2pDiagnostics().routingTablePeers).to.equal(0)
    })

    it('reports not running, with the counters, when there is no node', () => {
      install(undefined)
      const diagnostics = provider.getP2pDiagnostics()
      expect(diagnostics.running).to.equal(false)
      expect(diagnostics.connections).to.equal(0)
      expect(diagnostics.peerId).to.equal(undefined)
      // The counters are process-lifetime totals and survive the node, so they are still
      // the answer to "what happened" after a stop.
      expect(diagnostics.resolution).to.have.property('resolve:miss')
    })

    it('omits the peer store ages rather than guessing when libp2p moves them', () => {
      install(fakeNode({ peers: [], connections: {}, ages: undefined }))
      expect(provider.getP2pDiagnostics().peerStore).to.equal(undefined)
    })
  })

  describe('against a real node', () => {
    it('reports a running offline node honestly', async () => {
      await provider.setupP2P({ bootstrapPeers: [], libp2p: {} })
      await (provider as any).getOrCreateLibp2pNode()

      const diagnostics = provider.getP2pDiagnostics()
      expect(diagnostics.running).to.equal(true)
      expect(diagnostics.peerId).to.be.a('string')
      expect(diagnostics.connections).to.equal(0)
      // Pins the two internals this reads against a real libp2p, so an upgrade that moves
      // either one fails here rather than silently reporting nothing.
      expect(
        diagnostics.routingTablePeers,
        'the routing table must be reachable'
      ).to.be.a('number')
      expect(diagnostics.peerStore?.maxAddressAge).to.equal(172_800_000)
      expect(diagnostics.dhtMode).to.equal('client')
    })
  })
})
