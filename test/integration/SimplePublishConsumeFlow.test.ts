import ProviderInstance, { Provider } from '../../src/provider/Provider'
import Aquarius from '../../src/aquarius/Aquarius'
import { assert } from 'chai'
import { NftFactory, NftCreateData } from '../../src/factories/index'
import { Datatoken } from '../../src/tokens/Datatoken'
import { Erc20CreateParams } from '../../src/interfaces'
import { getHash } from '../../src/utils'
import { Nft } from '../../src/tokens/NFT'
import Web3 from 'web3'
import { SHA256 } from 'crypto-js'
import { homedir } from 'os'
import fs from 'fs'
import { downloadFile, crossFetchGeneric } from '../../src/utils/FetchHelper'
import console from 'console'
import { ProviderFees } from '../../src/@types/Provider'

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
const providerUrl = 'http://172.15.0.4:8030'
const assetUrl = [
  {
    type: 'url',
    url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
    method: 'GET'
  }
]
const ddo = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.0.0',
  chainId: 4,
  nftAddress: '0x0',
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
      type: 'access',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
      timeout: 0
    }
  ]
}

describe('Simple Publish & consume test', async () => {
  it('should publish a dataset (create NFT + ERC20)', async () => {
    const nft = new Nft(web3)
    const datatoken = new Datatoken(web3)
    const Factory = new NftFactory(addresses.ERC721Factory, web3)
    const accounts = await web3.eth.getAccounts()
    const publisherAccount = accounts[0]
    const consumerAccount = accounts[1]
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
      minter: publisherAccount,
      mpFeeAddress: '0x0000000000000000000000000000000000000000'
    }
    const result = await Factory.createNftWithErc(
      publisherAccount,
      nftParams,
      erc20Params
    )
    const erc721Address = result.events.NFTCreated.returnValues[0]
    const datatokenAddress = result.events.TokenCreated.returnValues[0]

    // create the files encrypted string
    let providerResponse = await ProviderInstance.encrypt(
      assetUrl,
      providerUrl,
      crossFetchGeneric
    )
    ddo.services[0].files = await providerResponse.text()
    ddo.services[0].datatokenAddress = datatokenAddress
    // update ddo and set the right did
    ddo.nftAddress = erc721Address
    const chain = await web3.eth.getChainId()
    ddo.id =
      'did:op:' + SHA256(web3.utils.toChecksumAddress(erc721Address) + chain.toString(10))

    providerResponse = await ProviderInstance.encrypt(ddo, providerUrl, crossFetchGeneric)
    const encryptedResponse = await providerResponse.text()
    const metadataHash = getHash(JSON.stringify(ddo))
    const res = await nft.setMetadata(
      erc721Address,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedResponse,
      '0x' + metadataHash
    )
    const resolvedDDO = await aquarius.waitForAqua(ddo.id, null, crossFetchGeneric)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')
    // mint 1 ERC20 and send it to the consumer
    await datatoken.mint(datatokenAddress, publisherAccount, '1', consumerAccount)
    // initialize provider
    const initializeData = await ProviderInstance.initialize(
      resolvedDDO.id,
      resolvedDDO.services[0].id,
      0,
      consumerAccount,
      providerUrl,
      crossFetchGeneric
    )
    const providerFees: ProviderFees = {
      providerFeeAddress: initializeData.providerFee.providerFeeAddress,
      providerFeeToken: initializeData.providerFee.providerFeeToken,
      providerFeeAmount: initializeData.providerFee.providerFeeAmount,
      v: initializeData.providerFee.v,
      r: initializeData.providerFee.r,
      s: initializeData.providerFee.s,
      providerData: initializeData.providerFee.providerData,
      validUntil: initializeData.providerFee.validUntil
    }
    // make the payment
    const txid = await datatoken.startOrder(
      datatokenAddress,
      consumerAccount,
      consumerAccount,
      0,
      providerFees
    )
    // get the url
    const downloadURL = await ProviderInstance.getDownloadUrl(
      ddo.id,
      consumerAccount,
      ddo.services[0].id,
      0,
      txid.transactionHash,
      providerUrl,
      web3
    )
    assert(downloadURL, 'Provider getDownloadUrl failed')
    try {
      await downloadFile(downloadURL, './tmpfile')
    } catch (e) {
      assert.fail('Download failed')
    }
  })
})
