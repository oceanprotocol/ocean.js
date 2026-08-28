import { expect } from 'chai'
import { createLibp2p, type Libp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { identify } from '@libp2p/identify'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey, peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import type { PeerId, PeerInfo } from '@libp2p/interface'
import {
  P2pProvider,
  P2pError,
  type ResolvedPeer
} from '../../src/services/providers/P2pProvider.js'

/**
 * A peer's addresses used to be looked up in two unrelated places: `getConnection`
 * resolved inline, and the public `getMultiaddrFromPeerId` ran its own walk and handed
 * back `addresses[0]` of whichever tier answered — no dedup, no ordering, so which
 * address a caller got was whatever the peer store happened to list first.
 *
 * These tests drive the one resolver that replaces both, through each of its tiers in
 * turn, and then the cache in front of it. The libp2p node is the real one the client
 * builds, with a real peer store; the first tier resolves a real connection to a real
 * second node over a real WebSocket. Only the DHT leg is stubbed, on the real node's
 * own `peerRouting` — a `findPeer` walk needs a populated routing table, which a unit
 * test has no way to stand up.
 */
describe('P2P peer resolution', () => {
  const provider = new P2pProvider()
  let remote: Libp2p
  let liveId: string
  let liveAddr: string
  let storedId: string
  let walkedId: string

  /** Addresses of one peer, in the order and spelling a caller must not depend on. */
  const PUBLIC_DIRECT = '/ip4/9.9.9.9/tcp/9000/ws'
  const PRIVATE_DIRECT = '/ip4/192.168.7.7/tcp/9000/ws'
  const RELAY_ID = '16Uiu2HAmLhRDqfufZiQnxvQs2XHhd6hwkLSPfjAQg1gH8wgRixiP'

  function relayedFor(peerId: string): string {
    return `/ip4/5.5.5.5/tcp/9001/ws/p2p/${RELAY_ID}/p2p-circuit/p2p/${peerId}`
  }

  async function freshPeerId(): Promise<string> {
    return peerIdFromPrivateKey(await generateKeyPair('Ed25519')).toString()
  }

  function node(): any {
    return provider.getLibp2pNode()
  }

  async function resolve(peerId: string): Promise<ResolvedPeer> {
    return (provider as any).resolvePeer(peerIdFromString(peerId))
  }

  async function closeAllConnections(): Promise<void> {
    for (const connection of node().getConnections()) {
      try {
        await connection.close()
      } catch {}
    }
  }

  before(async () => {
    remote = await createLibp2p({
      addresses: { listen: ['/ip4/127.0.0.1/tcp/0/ws'] },
      transports: [webSockets()],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      services: { identify: identify() }
    })
    liveId = remote.peerId.toString()
    liveAddr = remote.getMultiaddrs()[0].toString()
    storedId = await freshPeerId()
    walkedId = await freshPeerId()
    // No bootstrap contact: nothing here needs a network beyond the two local nodes.
    await provider.setupP2P({ bootstrapPeers: [] })
  })

  after(async () => {
    await provider.stopP2P()
    await remote.stop()
  })

  beforeEach(() => {
    provider.resetPeerResolutionStats()
  })

  it('resolves through the connection tier and says so', async () => {
    const connection = await (provider as any).getConnection(
      liveAddr,
      AbortSignal.timeout(15_000)
    )
    expect(connection.remotePeer.toString()).to.equal(liveId)

    const resolved = await resolve(liveId)
    expect(resolved.source).to.equal('connection')
    expect(resolved.cached).to.equal(false)
    expect(resolved.addresses.map(String)).to.deep.equal([
      connection.remoteAddr.toString()
    ])
    expect(provider.getPeerResolutionStats()['resolve:connection-hit']).to.equal(1)

    await closeAllConnections()
  })

  it('resolves through the peer store, deduplicated and ordered', async () => {
    const peerId = peerIdFromString(storedId)
    // The two spellings of one address are what libp2p's own peer store keeps as two
    // entries: storing `<addr>/p2p/<id>` strips the suffix and stores `<addr>` again
    // alongside the copy already there. So the duplicate below is not contrived — it is
    // what a peer that was learned from both a connection and a DHT record looks like.
    await node().peerStore.merge(peerId, {
      multiaddrs: [
        multiaddr(relayedFor(storedId)),
        multiaddr(PRIVATE_DIRECT),
        multiaddr(PUBLIC_DIRECT),
        multiaddr(`${PUBLIC_DIRECT}/p2p/${storedId}`)
      ]
    })
    const stored = await node().peerStore.get(peerId)
    expect(
      stored.addresses.filter((a: any) => a.multiaddr.toString() === PUBLIC_DIRECT)
        .length,
      'the peer store is expected to hold the duplicate this dedup exists for'
    ).to.equal(2)

    const resolved = await resolve(storedId)
    expect(resolved.source).to.equal('peer-store')
    expect(resolved.cached).to.equal(false)
    expect(resolved.addresses.map(String)).to.deep.equal([
      PUBLIC_DIRECT,
      PRIVATE_DIRECT,
      relayedFor(storedId)
    ])
    expect(provider.getPeerResolutionStats()['resolve:peerstore-hit']).to.equal(1)
  })

  it('resolves through the DHT when the peer store has nothing', async () => {
    const walks = stubFindPeer(walkedId, [
      relayedFor(walkedId),
      `${PUBLIC_DIRECT}/p2p/${walkedId}`,
      PUBLIC_DIRECT,
      PRIVATE_DIRECT
    ])
    try {
      const resolved = await resolve(walkedId)
      expect(resolved.source).to.equal('dht')
      expect(resolved.cached).to.equal(false)
      expect(walks.calls).to.equal(1)
      expect(
        walks.usedCache,
        'the walk must be allowed to use what libp2p knows'
      ).to.equal(true)
      // One address per distinct location, public before private before relayed, and
      // the first spelling of the duplicate is the one kept.
      expect(resolved.addresses.map(String)).to.deep.equal([
        `${PUBLIC_DIRECT}/p2p/${walkedId}`,
        PRIVATE_DIRECT,
        relayedFor(walkedId)
      ])
      expect(provider.getPeerResolutionStats()['resolve:dht-hit']).to.equal(1)
    } finally {
      walks.restore()
      provider.invalidatePeerResolution(walkedId)
    }
  })

  it('serves a second resolution from the cache instead of walking again', async () => {
    const walks = stubFindPeer(walkedId, [PUBLIC_DIRECT])
    try {
      const first = await resolve(walkedId)
      expect(first.cached).to.equal(false)
      expect(walks.calls).to.equal(1)

      const second = await resolve(walkedId)
      expect(second.cached, 'the second resolution must not repeat the walk').to.equal(
        true
      )
      expect(second.source).to.equal('dht')
      expect(second.addresses.map(String)).to.deep.equal([PUBLIC_DIRECT])
      expect(walks.calls).to.equal(1)
      expect(provider.getPeerResolutionStats()['resolve:cache-hit']).to.equal(1)
    } finally {
      walks.restore()
      provider.invalidatePeerResolution(walkedId)
    }
  })

  it('drops the cached address when the dial that used it failed', async () => {
    const walks = stubFindPeer(walkedId, [PUBLIC_DIRECT])
    const realDial = node().dial
    node().dial = async () => {
      const err: any = new Error('all addresses failed to dial')
      err.name = 'DialError'
      throw err
    }
    try {
      await resolve(walkedId)
      expect(walks.calls).to.equal(1)

      let raised: unknown
      try {
        await (provider as any).getConnection(walkedId, AbortSignal.timeout(15_000))
      } catch (err) {
        raised = err
      }
      expect(raised).to.be.instanceOf(P2pError)
      expect((raised as P2pError).type).to.equal('dial_failed')
      expect(provider.getPeerResolutionStats()['resolve:invalidated']).to.equal(1)

      // The load-bearing half: the address that failed is not handed out again.
      const after = await resolve(walkedId)
      expect(after.cached, 'a failed dial must leave nothing cached').to.equal(false)
      expect(walks.calls, 'the next resolution must go back to the tiers').to.equal(2)
    } finally {
      node().dial = realDial
      walks.restore()
      provider.invalidatePeerResolution(walkedId)
    }
  })

  it('lets a peer that resolved to nothing become reachable again', async () => {
    const absent = await freshPeerId()
    const walks = stubFindPeer(absent, null)
    try {
      const miss = await resolve(absent)
      expect(miss.source).to.equal('none')
      expect(miss.addresses).to.deep.equal([])
      expect(walks.calls).to.equal(1)

      // Suppressed while the negative entry lives, so a fan-out does not re-walk once
      // per call for a peer that is simply not there.
      const suppressed = await resolve(absent)
      expect(suppressed.cached).to.equal(true)
      expect(suppressed.addresses).to.deep.equal([])
      expect(walks.calls).to.equal(1)
      expect(provider.getPeerResolutionStats()['resolve:negative-cache-hit']).to.equal(1)

      // The peer comes back. Nothing tells the client that, so the only thing that can
      // make it reachable again is the entry expiring — and it has to expire while it is
      // being *read*, because a caller that wants a peer that is down asks repeatedly.
      // An entry whose lifetime were extended by a read would never expire under that
      // load, and the peer would stay unreachable for the rest of the session.
      walks.answer([PUBLIC_DIRECT])
      const startedAt = Date.now()
      let recovered = await resolve(absent)
      while (recovered.addresses.length === 0 && Date.now() - startedAt < 20_000) {
        await new Promise((done) => setTimeout(done, 400))
        recovered = await resolve(absent)
      }
      expect(
        recovered.source,
        'the peer must be reachable again without a restart'
      ).to.equal('dht')
      expect(recovered.addresses.map(String)).to.deep.equal([PUBLIC_DIRECT])
      expect(
        Date.now() - startedAt,
        'polling while the peer is down must not hold the entry open'
      ).to.be.lessThan(10_000)
      expect(walks.calls).to.be.greaterThan(1)
    } finally {
      walks.restore()
      provider.invalidatePeerResolution(absent)
    }
  }).timeout(45_000)

  it('refuses a connection that turns out to be a different peer', async () => {
    // Nothing contrived here: the caller names one node and supplies an address that
    // already carries a `/p2p/` component for another. Addresses that already carry one
    // are left alone by the dial path, so this used to connect to whoever was actually
    // at that address and send the command there without a word. It is also what a
    // cached address produces once something else has taken the address over.
    const impostor = await freshPeerId()
    let raised: any
    try {
      await (provider as any).getConnection(
        { nodeId: impostor, multiaddress: [multiaddr(liveAddr)] },
        AbortSignal.timeout(15_000)
      )
    } catch (err) {
      raised = err
    }
    expect(raised).to.be.instanceOf(P2pError)
    expect(raised.type).to.equal('peer_mismatch')
    expect(raised.message).to.contain(impostor)
    expect(raised.message).to.contain(liveId)
    await closeAllConnections()
  })

  it('returns the best address from getMultiaddrFromPeerId, as a real multiaddr', async () => {
    // The previous implementation built its return value with a helper whose parameter
    // shadowed the peer id, so it appended the *address* to itself: the result was
    // `<addr>/p2p/<addr>`, which does not parse, and it was the peer store's first
    // address rather than the best one.
    const answer = await provider.getMultiaddrFromPeerId(storedId)
    expect(answer).to.equal(`${PUBLIC_DIRECT}/p2p/${storedId}`)
    expect(multiaddr(answer).toString()).to.equal(answer)
    expect(answer.split('/p2p/').length - 1, 'the peer id must appear once').to.equal(1)
  })

  it('reports an unresolvable peer with a typed error and the same message', async () => {
    const absent = await freshPeerId()
    const walks = stubFindPeer(absent, null)
    try {
      let raised: any
      try {
        await provider.getMultiaddrFromPeerId(absent)
      } catch (err) {
        raised = err
      }
      expect(raised).to.be.instanceOf(P2pError)
      expect(raised.type).to.equal('resolve_failed')
      expect(raised.message).to.equal(`No multiaddrs found for peer id ${absent}`)

      let malformed: any
      try {
        await provider.getMultiaddrFromPeerId('not-a-peer-id')
      } catch (err) {
        malformed = err
      }
      expect(malformed).to.be.instanceOf(P2pError)
      expect(malformed.message).to.equal('No multiaddrs found for peer id not-a-peer-id')
    } finally {
      walks.restore()
      provider.invalidatePeerResolution(absent)
    }
  })

  interface FindPeerStub {
    calls: number
    usedCache: boolean
    answer: (addrs: string[] | null) => void
    restore: () => void
  }

  /**
   * Replaces the DHT leg on the real node's own `peerRouting`. `null` reproduces what a
   * walk that finds nobody raises, which is how the resolver learns it is a miss.
   */
  function stubFindPeer(peerId: string, addrs: string[] | null): FindPeerStub {
    const routing = node().peerRouting
    const real = routing.findPeer
    let current = addrs
    const stub: FindPeerStub = {
      calls: 0,
      usedCache: false,
      answer: (next) => {
        current = next
      },
      restore: () => {
        routing.findPeer = real
      }
    }
    routing.findPeer = async (id: PeerId, options: any = {}): Promise<PeerInfo> => {
      if (id.toString() !== peerId) return real.call(routing, id, options)
      stub.calls++
      stub.usedCache = options.useCache === true
      if (current == null) {
        const err: any = new Error('Not found')
        err.name = 'NotFoundError'
        throw err
      }
      return { id, multiaddrs: current.map((a) => multiaddr(a)) }
    }
    return stub
  }
})
