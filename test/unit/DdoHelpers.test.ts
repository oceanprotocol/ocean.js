import { assert } from 'chai'
import { getHash } from '../../src/utils'

describe('Ddo helper test', () => {
  it('getHash asset hash test', async () => {
    const metadata = {
      created: '2022-03-22T08:38:53Z',
      updated: '2022-03-22T08:38:53Z',
      type: 'dataset',
      name: 'test asset ś',
      description: 'desc desc desc desc',
      tags: ['test'],
      author: 'Bogdan F',
      license: 'https://market.oceanprotocol.com/terms',
      links: [
        'https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-abstract10.xml.gz-rss.xml'
      ],
      additionalInformation: {
        termsAndConditions: true
      }
    }
    const asset = {
      '@context': ['https://w3id.org/did/v1'],
      id: 'did:op:e29b51636e89902c48165431feae2f6cd8fb90f071825a5a9c12d8db724ebdce',
      nftAddress: '0xCc2d92f01408117c1B625B26B397293E4881505d',
      version: '4.0.0',
      chainId: 4,
      metadata: metadata,
      services: [
        {
          id: '44f3e6e3e46eba92a1d70abd011c404eb50f137dd0f5bfc2e997f21a0e65b78b',
          type: 'access',
          files:
            '0x042438fcf9f58fb589febac8a76d15a1e39f75a267649abf9ee8aaf3d077cdd520dd8d16b06ae59edbd7672b194fe6e4cd820be015c8aaacf0b7581703af1f246e5c47e60b896572d6a7bb94996e49fb3a4cc3465c997700a0a8be857b37824259f3b64853b61a7a11d5ddb4ced0a976479b6351e0e31d7d682f52e00b9c5914c656d7360046c08ec236c1de21bf1329f5ff3bf904ac354cac81b109c88d6a124f591664da8a4e19798dea7896db8f07325927cd6d3255d3d5a1e8a01ce66695f0017f77843e6f48f333042278bf21d6dc96',
          datatokenAddress: '0x6540416EdDDcCE390391a317C4cF6f9D18853d92',
          serviceEndpoint: 'https://v4.provider.rinkeby.oceanprotocol.com',
          timeout: 86400
        }
      ],
      event: {
        tx: '0x1061285c59e295535932035711f45a5d6c3ad9c23f76996a78e07f290f63d8c2',
        block: 10369952,
        from: '0x968d4670c346275edd5CC1A7535D14b631FFc49C',
        contract: '0xCc2d92f01408117c1B625B26B397293E4881505d',
        datetime: '2022-03-22T08:39:08'
      },
      nft: {
        address: '0xCc2d92f01408117c1B625B26B397293E4881505d',
        name: 'Ocean Asset NFT',
        symbol: 'OCEAN-NFT',
        state: 0,
        tokenURI:
          'data:application/json;base64,eyJuYW1lIjoiT2NlYW4gQXNzZXQgTkZUIiwic3ltYm9sIjoiT0NFQU4tTkZUIiwiZGVzY3JpcHRpb24iOiJUaGlzIE5GVCByZXByZXNlbnRzIGFuIGFzc2V0IGluIHRoZSBPY2VhbiBQcm90b2NvbCB2NCBlY29zeXN0ZW0uXG5cblZpZXcgb24gT2NlYW4gTWFya2V0OiBodHRwczovL21hcmtldC5vY2VhbnByb3RvY29sLmNvbS9hc3NldC9kaWQ6b3A6ZTI5YjUxNjM2ZTg5OTAyYzQ4MTY1NDMxZmVhZTJmNmNkOGZiOTBmMDcxODI1YTVhOWMxMmQ4ZGI3MjRlYmRjZSIsImV4dGVybmFsX3VybCI6Imh0dHBzOi8vbWFya2V0Lm9jZWFucHJvdG9jb2wuY29tL2Fzc2V0L2RpZDpvcDplMjliNTE2MzZlODk5MDJjNDgxNjU0MzFmZWFlMmY2Y2Q4ZmI5MGYwNzE4MjVhNWE5YzEyZDhkYjcyNGViZGNlIiwiYmFja2dyb3VuZF9jb2xvciI6IjE0MTQxNCIsImltYWdlX2RhdGEiOiJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHdpZHRoPSc5OScgaGVpZ2h0PSc5OScgZmlsbD0ndW5kZWZpbmVkJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnJTNFJTNDcGF0aCBmaWxsPSclMjNmZjQwOTI3NycgZD0nTTAsOTlMMCwxOUMxMSwyMiAyMywyNSAzNCwyN0M0NCwyOCA1MywyNyA2NCwyN0M3NCwyNiA4NiwyNCA5OSwyM0w5OSw5OVonLyUzRSUzQ3BhdGggZmlsbD0nJTIzZmY0MDkyYmInIGQ9J00wLDk5TDAsNDlDMTMsNTAgMjYsNTEgMzYsNTFDNDUsNTAgNTIsNDggNjIsNDdDNzEsNDUgODUsNDQgOTksNDNMOTksOTlaJyUzRSUzQy9wYXRoJTNFJTNDcGF0aCBmaWxsPSclMjNmZjQwOTJmZicgZD0nTTAsOTlMMCw3MEMxMSw3MyAyMyw3NyAzNCw3OUM0NCw4MCA1NSw3OSA2Niw3OEM3Niw3NiA4Nyw3NSA5OSw3NUw5OSw5OVonJTNFJTNDL3BhdGglM0UlM0Mvc3ZnJTNFIn0=',
        owner: '0x968d4670c346275edd5CC1A7535D14b631FFc49C',
        created: '2022-03-22T08:39:08'
      },
      datatokens: [
        {
          address: '0x6540416EdDDcCE390391a317C4cF6f9D18853d92',
          name: 'Marvelous Starfish Token',
          symbol: 'MARSTA-67',
          serviceId: '44f3e6e3e46eba92a1d70abd011c404eb50f137dd0f5bfc2e997f21a0e65b78b'
        }
      ],
      stats: {
        orders: -1
      },
      purgatory: {
        state: false
      },
      accessDetails: {
        publisherMarketOrderFee: '0',
        type: 'fixed',
        addressOrId: '0x831f14d46de358e202ba8b71198e7d301f78becde00f63737469c3a6a192be90',
        price: '1',
        isPurchasable: true,
        baseToken: {
          address: '0x8967bcf84170c91b0d24d4302c2376283b0b3a07',
          name: 'OceanToken',
          symbol: 'OCEAN'
        },
        datatoken: {
          address: '0x6540416edddcce390391a317c4cf6f9d18853d92',
          name: 'Marvelous Starfish Token',
          symbol: 'MARSTA-67'
        }
      }
    }

    const hash = getHash(JSON.stringify(asset))
    console.log('hash obtained', hash)
    assert(hash !== null)
  })
})
