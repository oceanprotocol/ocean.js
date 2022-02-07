import config from './config'
import ProviderInstance, { Provider } from '../../src/provider/Provider'
import Aquarius from '../../src/aquarius/Aquarius'
import { assert } from 'chai'
import { NftFactory, NftCreateData } from '../../src/factories/index'
import { Datatoken } from '../../src/tokens/Datatoken'
import { getHash } from '../../src/utils'
import { Nft } from '../../src/tokens/NFT'
import Web3 from 'web3'
import { SHA256 } from 'crypto-js'
import { homedir } from 'os'
import fs from 'fs'
import { ProviderFees, Erc20CreateParams } from '../../src/@types'

const data = JSON.parse(
  fs.readFileSync(
    process.env.ADDRESS_FILE ||
      `${homedir}/.ocean/ocean-contracts/artifacts/address.json`,
    'utf8'
  )
)

const addresses = data.development
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
      type: 'compute',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
      timeout: 0,
      compute: {
        publisherTrustedAlgorithmPublishers: [],
        publisherTrustedAlgorithms: [],
        allowRawAlgorithm: true,
        allowNetworkAccess: true,
        namespace: 'ocean-compute',
        cpus: 2,
        gpus: 4,
        gpuType: 'NVIDIA Tesla V100 GPU',
        memory: '128M',
        volumeSize: '2G'
      }
    }
  ]
}
const algoAssetUrl = [
  {
    type: 'url',
    url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
    method: 'GET'
  }
]
const algoDdo = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.0.0',
  chainId: 4,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'algorithm',
    name: 'dfgdfgdg',
    description: 'd dfgd fgd dfg dfgdfgd dfgdf',
    tags: [''],
    author: 'dd',
    license: 'https://market.oceanprotocol.com/terms',
    additionalInformation: {
      termsAndConditions: true
    },
    algorithm: {
      language: 'Node.js',
      version: '1.0.0',
      container: {
        entrypoint: 'node $ALGO',
        image: 'ubuntu',
        tag: 'latest',
        checksum: '44e10daa6637893f4276bb8d7301eb35306ece50f61ca34dcab550'
      }
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

describe('Simple compute tests', async () => {
  it('should publish a dataset, algorithm and start a compute job', async () => {
    const nft = new Nft(web3)
    const datatoken = new Datatoken(web3)
    const Factory = new NftFactory(addresses.ERC721Factory, web3)
    const accounts = await web3.eth.getAccounts()
    const publisherAccount = accounts[0]
    const consumerAccount = accounts[1]
    const chain = await web3.eth.getChainId()
    const nftParamsAsset: NftCreateData = {
      name: 'testNFT',
      symbol: 'TST',
      templateIndex: 1,
      tokenURI: ''
    }
    const erc20ParamsAsset: Erc20CreateParams = {
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
      nftParamsAsset,
      erc20ParamsAsset
    )
    const erc721AddressAsset = result.events.NFTCreated.returnValues[0]
    const datatokenAddressAsset = result.events.TokenCreated.returnValues[0]
    // create the files encrypted string
    let providerResponse = await ProviderInstance.encrypt(assetUrl, providerUrl)
    ddo.services[0].files = await providerResponse
    ddo.services[0].datatokenAddress = datatokenAddressAsset
    // update ddo and set the right did
    ddo.nftAddress = erc721AddressAsset
    ddo.id =
      'did:op:' +
      SHA256(web3.utils.toChecksumAddress(erc721AddressAsset) + chain.toString(10))

    providerResponse = await ProviderInstance.encrypt(ddo, providerUrl)

    let encryptedResponse = await providerResponse
    let metadataHash = getHash(JSON.stringify(ddo))
    let res = await nft.setMetadata(
      erc721AddressAsset,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedResponse,
      '0x' + metadataHash
    )
    // let's publish the algorithm as well
    const nftParamsAlgo: NftCreateData = {
      name: 'testNFT',
      symbol: 'TST',
      templateIndex: 1,
      tokenURI: ''
    }
    const erc20ParamsAlgo: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      feeManager: '0x0000000000000000000000000000000000000000',
      feeToken: '0x0000000000000000000000000000000000000000',
      minter: publisherAccount,
      mpFeeAddress: '0x0000000000000000000000000000000000000000'
    }
    const resultAlgo = await Factory.createNftWithErc(
      publisherAccount,
      nftParamsAlgo,
      erc20ParamsAlgo
    )
    const erc721AddressAlgo = resultAlgo.events.NFTCreated.returnValues[0]
    const datatokenAddressAlgo = resultAlgo.events.TokenCreated.returnValues[0]

    // create the files encrypted string
    providerResponse = await ProviderInstance.encrypt(algoAssetUrl, providerUrl)
    algoDdo.services[0].files = await providerResponse
    algoDdo.services[0].datatokenAddress = datatokenAddressAlgo
    // update ddo and set the right did
    algoDdo.nftAddress = erc721AddressAlgo

    algoDdo.id =
      'did:op:' +
      SHA256(web3.utils.toChecksumAddress(erc721AddressAlgo) + chain.toString(10))

    providerResponse = await ProviderInstance.encrypt(algoDdo, providerUrl)
    encryptedResponse = await providerResponse
    metadataHash = getHash(JSON.stringify(algoDdo))
    res = await nft.setMetadata(
      erc721AddressAlgo,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedResponse,
      '0x' + metadataHash
    )

    // let's wait
    const resolvedDDOAsset = await aquarius.waitForAqua(ddo.id)
    assert(resolvedDDOAsset, 'Cannot fetch DDO from Aquarius')
    const resolvedDDOAlgo = await aquarius.waitForAqua(algoDdo.id)
    assert(resolvedDDOAlgo, 'Cannot fetch DDO from Aquarius')
    // mint 1 ERC20 and send it to the consumer
    await datatoken.mint(datatokenAddressAsset, publisherAccount, '1', consumerAccount)
    await datatoken.mint(datatokenAddressAlgo, publisherAccount, '1', consumerAccount)

    // initialize provider orders for algo
    const initializeDataAlgo = await ProviderInstance.initialize(
      resolvedDDOAlgo.id,
      resolvedDDOAlgo.services[0].id,
      0,
      consumerAccount,
      providerUrl
    )
    const providerAlgoFees: ProviderFees = {
      providerFeeAddress: initializeDataAlgo.providerFee.providerFeeAddress,
      providerFeeToken: initializeDataAlgo.providerFee.providerFeeToken,
      providerFeeAmount: initializeDataAlgo.providerFee.providerFeeAmount,
      v: initializeDataAlgo.providerFee.v,
      r: initializeDataAlgo.providerFee.r,
      s: initializeDataAlgo.providerFee.s,
      providerData: initializeDataAlgo.providerFee.providerData,
      validUntil: initializeDataAlgo.providerFee.validUntil
    }

    // make the payment
    const txidAlgo = await datatoken.startOrder(
      datatokenAddressAlgo,
      consumerAccount,
      initializeDataAlgo.computeAddress,
      0,
      providerAlgoFees
    )
    assert(txidAlgo, 'Failed to order algo')

    const providerValidUntil = new Date()
    providerValidUntil.setHours(providerValidUntil.getHours() + 1)

    // initialize provider orders for asset
    const initializeData = await ProviderInstance.initialize(
      resolvedDDOAsset.id,
      resolvedDDOAsset.services[0].id,
      0,
      consumerAccount,
      providerUrl,
      null,
      null,
      'env1',
      providerValidUntil.getTime()
    )
    const providerDatasetFees: ProviderFees = {
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
    const txidAsset = await datatoken.startOrder(
      datatokenAddressAsset,
      consumerAccount,
      initializeDataAlgo.computeAddress,
      0,
      providerDatasetFees
    )
    assert(txidAsset, 'Failed to order algo')
    // start the compute job
    const computeJobs = await ProviderInstance.computeStart(
      providerUrl,
      web3,
      consumerAccount,
      'env1',
      {
        documentId: resolvedDDOAsset.id,
        serviceId: resolvedDDOAsset.services[0].id,
        transferTxId: txidAsset.transactionHash
      },
      {
        documentId: resolvedDDOAlgo.id,
        serviceId: resolvedDDOAlgo.services[0].id,
        transferTxId: txidAlgo.transactionHash
      }
    )
    assert(computeJobs, 'Cannot start compute job')
    const jobStatus = await ProviderInstance.computeStatus(
      providerUrl,
      null,
      computeJobs[0].jobId
    )
    assert(jobStatus)
  })
})
