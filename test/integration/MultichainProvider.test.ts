import { assert } from 'chai'
import { SHA256 } from 'crypto-js'
import { AbiItem } from 'web3-utils'
import { web3, getTestConfig, getAddresses } from '../config'
import {
  Config,
  ProviderInstance,
  Aquarius,
  NftFactory,
  NftCreateData,
  Datatoken,
  getHash,
  Nft,
  downloadFile,
  ZERO_ADDRESS,
  calculateEstimatedGas,
  sendTx,
  transfer
} from '../../src'
import {
  ProviderFees,
  DatatokenCreateParams,
  DDO,
  Files,
  ProviderComputeInitialize,
  ConsumeMarketFee,
  Asset
} from '../../src/@types'
import { createAsset, updateAssetMetadata } from './utils'

let config: Config

let aquarius: Aquarius
let datatoken: Datatoken
let providerUrl: string
let consumerAccount: string
let publisherAccount: string
let providerInitializeComputeResults
let computeEnvs
let addresses: any
let ddoWith5mTimeoutId
let resolvedDdoWith5mTimeout
let resolvedDdoAfterUpdate
let orderTx

const assetUrl: Files = {
  datatokenAddress: '0x0',
  nftAddress: '0x0',
  files: [
    {
      type: 'url',
      url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
      method: 'GET'
    }
  ]
}

const ddoWithNoTimeout = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
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
      serviceEndpoint: 'http:/172.15.0.4:8030',
      timeout: 0,
      compute: {
        publisherTrustedAlgorithmPublishers: [],
        publisherTrustedAlgorithms: [],
        allowRawAlgorithm: true,
        allowNetworkAccess: true
      }
    }
  ]
}

describe('Multichain Provider test', async () => {
  before(async () => {
    config = await getTestConfig(web3)
    addresses = getAddresses()
    aquarius = new Aquarius(config.metadataCacheUri)
    providerUrl = 'http:/172.15.0.4:8030'
    datatoken = new Datatoken(web3)
  })

  it('Initialize accounts', async () => {
    const accounts = await web3.eth.getAccounts()
    publisherAccount = accounts[0]
    consumerAccount = accounts[1]

    console.log(`Publisher account address: ${publisherAccount}`)
    console.log(`Consumer account address: ${consumerAccount}`)
  })

  it('Mint OCEAN to publisher account', async () => {
    const minAbi = [
      {
        constant: false,
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' }
        ],
        name: 'mint',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ] as AbiItem[]
    const tokenContract = new web3.eth.Contract(minAbi, addresses.Ocean)
    const estGas = await calculateEstimatedGas(
      publisherAccount,
      tokenContract.methods.mint,
      publisherAccount,
      web3.utils.toWei('1000')
    )
    await sendTx(
      publisherAccount,
      estGas,
      web3,
      1,
      tokenContract.methods.mint,
      publisherAccount,
      web3.utils.toWei('1000')
    )
  })

  it('Send some OCEAN to consumer account', async () => {
    transfer(web3, config, publisherAccount, addresses.Ocean, consumerAccount, '100')
  })

  it('Should publish the dataset', async () => {
    ddoWith5mTimeoutId = await createAsset(
      'D1Min',
      'D1M',
      publisherAccount,
      assetUrl,
      ddoWithNoTimeout,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    assert(ddoWith5mTimeoutId, 'Failed to publish DDO')
    console.log(`dataset id: ${ddoWith5mTimeoutId}`)
  })

  it('Resolve published datasets and algorithms', async () => {
    resolvedDdoWith5mTimeout = await aquarius.waitForAqua(ddoWith5mTimeoutId)
    console.log('resolvedDdoWith5mTimeout ', resolvedDdoWith5mTimeout)
    assert(resolvedDdoWith5mTimeout, 'Cannot fetch DDO from Aquarius')
  })

  it('Mint dataset and algorithm datatokens to publisher', async () => {
    const dtMintTx = await datatoken.mint(
      resolvedDdoWith5mTimeout.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    assert(dtMintTx, 'Failed minting datatoken to consumer.')
  })

  it('Should order the dataset', async () => {
    const initializeData = await ProviderInstance.initialize(
      resolvedDdoWith5mTimeout.id,
      resolvedDdoWith5mTimeout.services[0].id,
      0,
      consumerAccount,
      providerUrl
    )

    assert(initializeData, 'Failed initializing the provider for order.')

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
    orderTx = await datatoken.startOrder(
      resolvedDdoWith5mTimeout.services[0].datatokenAddress,
      consumerAccount,
      consumerAccount,
      0,
      providerFees
    )
    assert(orderTx, 'Ordering the dataset failed.')
  })

  it('Should download the dataset file', async () => {
    const downloadURL = await ProviderInstance.getDownloadUrl(
      resolvedDdoWith5mTimeout.id,
      consumerAccount,
      resolvedDdoWith5mTimeout.services[0].id,
      0,
      orderTx.transactionHash,
      providerUrl,
      web3
    )
    assert(downloadURL, 'Provider getDownloadUrl failed')
    try {
      await downloadFile(downloadURL)
    } catch (e) {
      assert.fail('Download failed')
    }
  })

  it('Should update metadata the asset metadata with second provider as serviceEndpoint', async () => {
    resolvedDdoWith5mTimeout.services[0].serviceEndpoint = 'http:/172.15.0.4:8030'
    const updateTx = await updateAssetMetadata(
      publisherAccount,
      resolvedDdoWith5mTimeout,
      providerUrl,
      aquarius
    )
    assert(updateTx, 'Failed to update asset metadata')
  })

  it('Should resolve updated metadata asset', async () => {
    resolvedDdoAfterUpdate = await aquarius.waitForAqua(ddoWith5mTimeoutId)
    console.log('resolvedDdoAfterUpdate ', resolvedDdoAfterUpdate)
    assert(resolvedDdoAfterUpdate, 'Cannot fetch DDO from Aquarius')
  })

  it('Should order the dataset after updated serviceEndpoint to point to multichain provider', async () => {
    const initializeData = await ProviderInstance.initialize(
      resolvedDdoAfterUpdate.id,
      resolvedDdoAfterUpdate.services[0].id,
      0,
      consumerAccount,
      providerUrl
    )

    assert(
      initializeData,
      'Failed initializing the provider after multichain provider serivce enpoint set.'
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
    orderTx = await datatoken.startOrder(
      resolvedDdoAfterUpdate.services[0].datatokenAddress,
      consumerAccount,
      consumerAccount,
      0,
      providerFees
    )
    assert(
      orderTx,
      'Ordering the dataset failed after multichain provider serivce enpoint set.'
    )
  })

  it('Should download after updated asset serviceEndpoint to point to multichain provider', async () => {
    const downloadURL = await ProviderInstance.getDownloadUrl(
      resolvedDdoAfterUpdate.id,
      consumerAccount,
      resolvedDdoAfterUpdate.services[0].id,
      0,
      orderTx.transactionHash,
      providerUrl,
      web3
    )
    assert(
      downloadURL,
      'Provider getDownloadUrl failed after multichain provider serivce enpoint set'
    )
    try {
      await downloadFile(downloadURL)
    } catch (e) {
      assert.fail('Download failed after multichain provider serivce enpoint set')
    }
  })
})
