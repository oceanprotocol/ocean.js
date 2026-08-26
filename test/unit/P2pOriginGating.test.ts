import { expect } from 'chai'
import { multiaddr } from '@multiformats/multiaddr'
import { P2pProvider } from '../../src/services/providers/P2pProvider.js'

/**
 * Two decisions depend on where the page came from: whether libp2p's dial gater lets a
 * loopback or RFC1918 target through, and whether a plain-`ws` address counts as
 * dialable at all. Both are only asked in a browser, so the checks below run with the
 * Node runtime probe and `location` stood down to simulate one.
 *
 * The rule that matters is that a host-less origin fails *closed*. `data:`, `blob:` and
 * `about:srcdoc` have no host, and treating "no host" as "local" let a document of
 * unknown provenance dial plain `ws` to loopback and to the private network behind it.
 * `file:` is the one genuinely local host-less origin and is answered before the host
 * is looked at.
 */
describe('P2P dial gating by page origin', () => {
  const provider = new P2pProvider()

  /** Runs `check` as though the library were loaded in a browser page at `origin`. */
  function inBrowserPageAt<T>(
    origin: { protocol: string; hostname?: string } | null,
    check: () => T
  ): T {
    const realVersions = Object.getOwnPropertyDescriptor(process, 'versions')
    const hadLocation = 'location' in globalThis
    const realLocation = (globalThis as any).location
    Object.defineProperty(process, 'versions', { value: undefined, configurable: true })
    if (origin == null) {
      delete (globalThis as any).location
    } else {
      ;(globalThis as any).location = {
        protocol: origin.protocol,
        hostname: origin.hostname ?? ''
      }
    }
    try {
      return check()
    } finally {
      if (realVersions) Object.defineProperty(process, 'versions', realVersions)
      if (hadLocation) (globalThis as any).location = realLocation
      else delete (globalThis as any).location
    }
  }

  const isLocal = (origin: { protocol: string; hostname?: string } | null) =>
    inBrowserPageAt(origin, () => (provider as any).isLocalPageOrigin() as boolean)
  const isDialable = (
    origin: { protocol: string; hostname?: string },
    addr: string
  ): boolean =>
    inBrowserPageAt(
      origin,
      () => (provider as any).isDialable(multiaddr(addr)) as boolean
    )
  const denies = (
    origin: { protocol: string; hostname?: string },
    addr: string
  ): boolean =>
    inBrowserPageAt(
      origin,
      () => (provider as any).denyDialMultiaddr(multiaddr(addr)) as boolean
    )

  it('refuses to call a host-less origin local', () => {
    // None of these has a host, and none of them says anything about where the document
    // came from. "No host" must not mean "local".
    expect(isLocal({ protocol: 'data:' }), 'data:').to.equal(false)
    expect(isLocal({ protocol: 'blob:' }), 'blob:').to.equal(false)
    expect(isLocal({ protocol: 'about:', hostname: '' }), 'about:srcdoc').to.equal(false)
    expect(isLocal({ protocol: 'https:', hostname: '' }), 'host-less https').to.equal(
      false
    )
  })

  it('still treats a file: document as local', () => {
    expect(isLocal({ protocol: 'file:', hostname: '' })).to.equal(true)
  })

  it('recognises the ordinary local development origins', () => {
    expect(isLocal({ protocol: 'http:', hostname: 'localhost' })).to.equal(true)
    expect(isLocal({ protocol: 'http:', hostname: 'app.localhost' })).to.equal(true)
    expect(isLocal({ protocol: 'http:', hostname: 'barge.local' })).to.equal(true)
    expect(isLocal({ protocol: 'http:', hostname: '127.0.0.1' })).to.equal(true)
    expect(isLocal({ protocol: 'http:', hostname: '192.168.1.20' })).to.equal(true)
    expect(isLocal({ protocol: 'http:', hostname: '[::1]' })).to.equal(true)
    expect(
      isLocal({ protocol: 'https:', hostname: 'market.oceanprotocol.com' })
    ).to.equal(false)
    expect(isLocal(null), 'no location object at all').to.equal(false)
  })

  it('lets a LAN development page dial a plain-ws node on the same network', () => {
    // `vite --host`, opened from a phone at http://192.168.1.20:5173. Both halves of
    // the decision have to agree, or the address is filtered before the gater sees it.
    const origin = { protocol: 'http:', hostname: '192.168.1.20' }
    expect(isDialable(origin, '/ip4/192.168.1.20/tcp/9001/ws')).to.equal(true)
    expect(denies(origin, '/ip4/192.168.1.20/tcp/9001/ws')).to.equal(false)
  })

  it('opens no plain-ws hole for a page served over https', () => {
    // An https page cannot load `ws` content at all — the browser blocks it — so a
    // private-address https origin must not be handed the local exemption.
    const httpsLan = { protocol: 'https:', hostname: '192.168.1.20' }
    expect(isLocal(httpsLan), 'the origin is still local').to.equal(true)
    expect(isDialable(httpsLan, '/ip4/192.168.1.20/tcp/9001/ws')).to.equal(false)
    expect(isDialable(httpsLan, '/ip4/192.168.1.20/tcp/9001/wss')).to.equal(true)
    expect(
      isDialable(
        { protocol: 'https:', hostname: 'localhost' },
        '/ip4/127.0.0.1/tcp/9001/ws'
      )
    ).to.equal(false)
  })

  it('does not mistake a host that merely begins with "wss" for a secure address', () => {
    // `/dnsaddr/wss.example.com/tcp/9001/ws` is plain, insecure ws whose *host* starts
    // with "wss" — a substring test called it secure and let a remote page dial it.
    const remote = { protocol: 'https:', hostname: 'market.oceanprotocol.com' }
    expect(isDialable(remote, '/dnsaddr/wss.example.com/tcp/9001/ws')).to.equal(false)
    expect(isDialable(remote, '/dns4/node.example.com/tcp/9001/wss')).to.equal(true)
    // the spellings ocean-node actually advertises, all genuinely secure
    expect(isDialable(remote, '/dns4/node.example.com/tcp/9001/tls/ws')).to.equal(true)
    expect(
      isDialable(
        remote,
        '/dns4/relay.example.com/tcp/9001/wss/p2p/16Uiu2HAmLhRDqfufZiQnxvQs2XHhd6hwkLSPfjAQg1gH8wgRixiP/p2p-circuit/p2p/16Uiu2HAmHwzeVw7RpGopjZe6qNBJbzDDBdqtrSk7Gcx1emYsfgL4'
      ),
      'a relayed secure address still qualifies'
    ).to.equal(true)
  })

  it('refuses loopback and private targets from a genuinely remote page', () => {
    const remote = { protocol: 'https:', hostname: 'market.oceanprotocol.com' }
    expect(denies(remote, '/ip4/127.0.0.1/tcp/9001/ws')).to.equal(true)
    expect(denies(remote, '/ip4/10.0.0.5/tcp/9001/ws')).to.equal(true)
    expect(denies(remote, '/ip4/9.9.9.9/tcp/9001/wss')).to.equal(false)
  })
})
