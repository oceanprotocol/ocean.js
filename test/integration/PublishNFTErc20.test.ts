import config from './config'
import ProviderInstance, { Provider } from '../../src/provider/Provider'
import Aquarius from '../../src/aquarius/Aquarius'
import { assert } from 'chai'
import { NftFactory, NftCreateData } from '../../src/factories/index'
import { Erc20CreateParams } from '../../src/interfaces'
import { getHash } from '../../src/utils'
import { Nft } from '../../src/tokens/NFT'
import Web3 from 'web3'
import fetch from 'cross-fetch'
import { SHA256 } from 'crypto-js'
import { homedir } from 'os'
import fs from 'fs'
import console from 'console'

const data = JSON.parse(
  fs.readFileSync(
    process.env.ADDRESS_FILE ||
      `${homedir}/.ocean/ocean-contracts/artifacts/address.json`,
    'utf8'
  )
)

const addresses = data.development
console.log(addresses)
const aquarius = new Aquarius('http://127.0.0.1:5000')
const web3 = new Web3('http://127.0.0.1:8545')
const ddo = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.0.0',
  chainId: 4,
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'dataset',
    name: 'dfgdfgdg',
    description: 'd dfgd fgd dfg dfgdfgd dfgdf',
    tags: [''],
    author: 'dd',
    license: 'https://market.oceanprotocol.com/terms',
    additionalInformation: {
      termsAndConditions: true
    }
  },
  services: [
    {
      id: 'notAnId',
      type: 'download',
      files:
        '0x04b69c2363b360cad8bffe1c681910598757d9ed8b7a79d1caff5efcfbb656cb9862b9068fa24462b20c5740d0c24db69c93657d261edf1123ed2300b34f8f652f53cf2862cdc2b0b201c5881f39151bfaabbd39c69f51fafc2965987be2bbe90dae10dbdd30f262404896feb7a8043bb62b72c0bc5d1525f07067ed42af7020ce96de634c6e23fd28947932b8adb6fc34c97eee2c0d441ad5eced00bed84633de5bcf6812dcd7f865bebdd5f9ae32efcf22aaca53c6ee3bb46c1566835d26a4263e5e82c65f29d701e37f47f1102b0afb48d07dea3dcdfaa37bca7d471b8833bfc20c25ee681e3f2670a451b635decf1550003339e32cf9bd75d4f331b35ae3362fead77e30594723dd8c6dbf4141fbd681a18e72786bfeb2216dd137a0cfe0ec8519760843e2114b3a3ed46d9319e2e9f9c58c78a916328324f77d62abac6719f3b88d2da4e60699bb159a8deabd53d003',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
      timeout: 0
    }
  ]
}

describe('Publish tests', async () => {
  it('should publish a dataset (create NFT + ERC20)', async () => {
    const nft = new Nft(web3)
    const Factory = new NftFactory(addresses.ERC721Factory, web3)
    const accounts = await web3.eth.getAccounts()
    const accountId = accounts[0]
    const nftParams: NftCreateData = {
      name: 'testNFT',
      symbol: 'TST',
      templateIndex: 1,
      tokenURI: ''
    }
    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      feeManager: '0x0000000000000000000000000000000000000000',
      feeToken: '0x0000000000000000000000000000000000000000',
      minter: accountId,
      mpFeeAddress: '0x0000000000000000000000000000000000000000'
    }
    const result = await Factory.createNftWithErc(accountId, nftParams, erc20Params)
    const erc721Address = result.events.NFTCreated.returnValues[0]
    const datatokenAddress = result.events.TokenCreated.returnValues[0]

    // update ddo and set the right did
    ddo.nftAddress = erc721Address
    const chain = await web3.eth.getChainId()
    ddo.id =
      'did:op:' + SHA256(web3.utils.toChecksumAddress(erc721Address) + chain.toString(10))

    const providerResponse = await ProviderInstance.encrypt(
      ddo,
      'http://172.15.0.4:8030',
      (url: string, body: string) => {
        // replace with fetch
        return fetch(url, {
          method: 'POST',
          body: body,
          headers: { 'Content-Type': 'application/octet-stream' }
        })
      }
    )
    const encryptedResponse = await providerResponse.text()
    const metadataHash = getHash(JSON.stringify(ddo))
    const res = await nft.setMetadata(
      erc721Address,
      accountId,
      0,
      'http://172.15.0.4:8030',
      '',
      '0x2',
      encryptedResponse,
      '0x' + metadataHash
    )
    const resolvedDDO = await aquarius.waitForAqua((url: string, body: string) => {
      // replace with fetch
      return fetch(url, {
        method: 'GET',
        body: body
      })
    }, ddo.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')
  })
})
