import config from './config'
import ProviderInstance, { Provider } from '../../src/provider/Provider'
import { assert } from 'chai'
import { getHash } from '../../src/utils'
import { Nft } from '../../src/tokens/NFT'
import Web3 from 'web3'
import fetch from 'cross-fetch'

const web3 = new Web3('http://127.0.0.1:8545')

describe('Provider tests', async () => {
  let providerInstance: Provider

  const ddo =
    '{"@context":["https://w3id.org/did/v1"],"id":"did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c","version":"4.0.0","chainId":4,"metadata":{"created":"2021-12-20T14:35:20Z","updated":"2021-12-20T14:35:20Z","type":"dataset","name":"dfgdfgdg","description":"d dfgd fgd dfg dfgdfgd dfgdf","tags":[""],"author":"dd","license":"https://market.oceanprotocol.com/terms","additionalInformation":{"termsAndConditions":true}},"services":[{"id":"notAnId","type":"download","files":"0x04b69c2363b360cad8bffe1c681910598757d9ed8b7a79d1caff5efcfbb656cb9862b9068fa24462b20c5740d0c24db69c93657d261edf1123ed2300b34f8f652f53cf2862cdc2b0b201c5881f39151bfaabbd39c69f51fafc2965987be2bbe90dae10dbdd30f262404896feb7a8043bb62b72c0bc5d1525f07067ed42af7020ce96de634c6e23fd28947932b8adb6fc34c97eee2c0d441ad5eced00bed84633de5bcf6812dcd7f865bebdd5f9ae32efcf22aaca53c6ee3bb46c1566835d26a4263e5e82c65f29d701e37f47f1102b0afb48d07dea3dcdfaa37bca7d471b8833bfc20c25ee681e3f2670a451b635decf1550003339e32cf9bd75d4f331b35ae3362fead77e30594723dd8c6dbf4141fbd681a18e72786bfeb2216dd137a0cfe0ec8519760843e2114b3a3ed46d9319e2e9f9c58c78a916328324f77d62abac6719f3b88d2da4e60699bb159a8deabd53d003","datatokenAddress":"0xa15024b732A8f2146423D14209eFd074e61964F3","serviceEndpoint":"https://providerv4.rinkeby.oceanprotocol.com","timeout":0}]}'

  it('should deploy contracts', async () => {
    const nft = new Nft(web3)

    const erc721Address = ''
    const accountId = ''
    const encryptedResponse = await ProviderInstance.encrypt(
      'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
      accountId,
      ddo,
      'https://providerv4.rinkeby.oceanprotocol.com/',
      (url: string, body: string) => {
        //replace with fetch
        return axios.post(url, body, {
          headers: { 'Content-Type': 'application/octet-stream' },
          cancelToken: newCancelToken()
        })
      }
    )
    const metadataHash = getHash(ddo)
    const res = await nft.setMetadata(
      erc721Address,
      accountId,
      0,
      'https://providerv4.rinkeby.oceanprotocol.com/',
      '',
      '0x2',
      encryptedResponse,
      '0x' + metadataHash
    )
  })
})
