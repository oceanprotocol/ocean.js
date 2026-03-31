import { assert } from 'chai'
import { isP2pUri, ProviderInstance, getNodeEndpointConfig } from '../../src/index.js'

// This suite runs first (underscore prefix sorts before all letters).
// It warms the libp2p node - every subsequent test reuses the connection.
describe('P2P connection warmup', () => {
  it('should connect to the P2P node', async function () {
    const nodeUrl = getNodeEndpointConfig().oceanNodeUri
    if (!nodeUrl || !isP2pUri(nodeUrl)) {
      this.skip()
    }

    this.timeout(60000)

    const bootstrapPeers = nodeUrl.startsWith('/')
      ? [nodeUrl]
      : [`/ip4/172.15.0.5/tcp/9001/ws/p2p/${nodeUrl}`]

    await ProviderInstance.setupP2P({ bootstrapPeers })
    while (
      ProviderInstance.getDiscoveredNodes().length === 0 ||
      !ProviderInstance.getDiscoveredNodes().find((node) => node.peerId === nodeUrl)
    ) {
      console.log(`Waiting for P2P node to be discovered...`)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    console.log('P2P node discovered, checking if it is reachable...')
    const ok = await ProviderInstance.isValidProvider(nodeUrl)
    assert.ok(ok, 'P2P node should be reachable')
    console.log('P2P node reachable')
  })
})
