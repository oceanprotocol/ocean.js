import { expect } from 'chai'
import type { Libp2p } from '@libp2p/interface'
import { P2pProvider } from '../../src/services/providers/P2pProvider.js'
import { LoggerInstance } from '../../src/utils/Logger.js'

/**
 * `libp2p` config is spread over ocean.js's defaults, which replaces whole option
 * objects. For most of them that is right — `transports`, `services`, `addresses` are
 * subsystems a caller replaces on purpose.
 *
 * For `peerStore` it was a trap, and a sharp one. That bag holds two independent values
 * with an invariant between them, so `libp2p: { peerStore: { maxAddressAge: … } }` —
 * the obvious way to tune one — silently dropped `maxPeerAge` back to the library's
 * **6 h**, shorter than the address lifetime just set. A peer entry that expires before
 * its own addresses do takes them with it, which is the exact failure the 48 h default
 * exists to prevent: configuring it produced it.
 *
 * These bags are now merged field by field. The values are still the caller's — an
 * inverted pair is used as given and warned about, not quietly corrected — but a field
 * they did not mention keeps ocean.js's value instead of falling back to a library
 * default they never saw.
 */
describe('P2P libp2p option bags merge instead of replacing', () => {
  const FORTY_EIGHT_HOURS_MS = 172_800_000
  const provider = new P2pProvider()

  function peerStoreLimits(node: Libp2p): {
    maxAddressAge: number
    maxPeerAge: number
  } {
    const { store } = node.peerStore as unknown as {
      store: { maxAddressAge: number; maxPeerAge: number }
    }
    return { maxAddressAge: store.maxAddressAge, maxPeerAge: store.maxPeerAge }
  }

  /** Builds a real, offline node with `config`, hands it to `read`, then stops it. */
  async function withNode<T>(
    libp2p: Record<string, any>,
    read: (node: Libp2p) => T
  ): Promise<T> {
    await provider.setupP2P({ bootstrapPeers: [], libp2p })
    try {
      const node = await (provider as any).getOrCreateLibp2pNode()
      return read(node)
    } finally {
      await provider.stopP2P()
    }
  }

  it('applies both 48 h lifetimes when nothing is overridden', async () => {
    const limits = await withNode({}, peerStoreLimits)
    expect(limits.maxAddressAge).to.equal(FORTY_EIGHT_HOURS_MS)
    expect(limits.maxPeerAge).to.equal(FORTY_EIGHT_HOURS_MS)
  })

  it('keeps maxPeerAge when only maxAddressAge is overridden', async () => {
    // The whole point. Before the merge this reported the library's 6 h — shorter than
    // the two hours being configured, and therefore the inversion.
    const limits = await withNode(
      { peerStore: { maxAddressAge: 7_200_000 } },
      peerStoreLimits
    )
    expect(limits.maxAddressAge).to.equal(7_200_000)
    expect(
      limits.maxPeerAge,
      'the field not mentioned must keep the ocean.js value'
    ).to.equal(FORTY_EIGHT_HOURS_MS)
    expect(limits.maxPeerAge).to.be.at.least(limits.maxAddressAge)
  })

  it('keeps maxAddressAge when only maxPeerAge is overridden', async () => {
    const limits = await withNode(
      { peerStore: { maxPeerAge: 200_000_000 } },
      peerStoreLimits
    )
    expect(limits.maxPeerAge).to.equal(200_000_000)
    expect(limits.maxAddressAge).to.equal(FORTY_EIGHT_HOURS_MS)
  })

  it('uses both values as given when both are overridden', async () => {
    const limits = await withNode(
      { peerStore: { maxAddressAge: 60_000, maxPeerAge: 120_000 } },
      peerStoreLimits
    )
    expect(limits).to.deep.equal({ maxAddressAge: 60_000, maxPeerAge: 120_000 })
  })

  it('warns about an inverted pair rather than silently correcting it', async () => {
    const warnings: string[] = []
    const originalWarn = LoggerInstance.warn.bind(LoggerInstance)
    ;(LoggerInstance as any).warn = (message: string) => {
      warnings.push(String(message))
    }
    try {
      const limits = await withNode(
        { peerStore: { maxAddressAge: 90_000, maxPeerAge: 30_000 } },
        peerStoreLimits
      )
      // The caller's node, the caller's numbers.
      expect(limits).to.deep.equal({ maxAddressAge: 90_000, maxPeerAge: 30_000 })
      expect(
        warnings.some((line) => line.includes('maxPeerAge')),
        `expected a warning about the inversion, got: ${warnings.join(' | ')}`
      ).to.equal(true)
    } finally {
      ;(LoggerInstance as any).warn = originalWarn
    }
  })

  it('does not warn when the pair is the right way round', async () => {
    const warnings: string[] = []
    const originalWarn = LoggerInstance.warn.bind(LoggerInstance)
    ;(LoggerInstance as any).warn = (message: string) => {
      warnings.push(String(message))
    }
    try {
      await withNode(
        { peerStore: { maxAddressAge: 30_000, maxPeerAge: 90_000 } },
        () => null
      )
      expect(warnings.filter((line) => line.includes('maxPeerAge'))).to.deep.equal([])
    } finally {
      ;(LoggerInstance as any).warn = originalWarn
    }
  })

  it('keeps the ocean.js connection cap when connectionManager is partly overridden', async () => {
    // Same shape of bug, lower stakes: overriding one connection-manager field used to
    // drop the 32-connection cap back to libp2p's own much larger default.
    const maxConnections = await withNode(
      { connectionManager: { maxIncomingPendingConnections: 7 } },
      (node) =>
        (node as any).components?.connectionManager?.maxConnections ??
        (node as any).connectionManager?.maxConnections
    )
    expect(maxConnections).to.equal(32)
  })
})
