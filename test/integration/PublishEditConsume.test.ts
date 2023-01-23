import { assert } from 'chai'
import { AbiItem } from 'web3-utils'
import { web3, getTestConfig, getAddresses } from '../config'
import {
  Config,
  ProviderInstance,
  Aquarius,
  Datatoken,
  downloadFile,
  calculateEstimatedGas,
  sendTx,
  transfer
} from '../../src'
import { ProviderFees, Files } from '../../src/@types'
import { createAsset, updateAssetMetadata } from './helpers'

let config: Config

let aquarius: Aquarius
let datatoken: Datatoken
let providerUrl: string
let consumerAccount: string
let publisherAccount: string
let addresses: any

let urlAssetId
let resolvedUrlAssetDdo
let resolvedUrlAssetDdoAfterUpdate

let arweaveAssetId
let resolvedArweaveAssetDdo
let resolvedArweaveAssetDdoAfterUpdate

let orderTx

const urlFile: Files = {
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

const arweaveFile: Files = {
  datatokenAddress: '0x0',
  nftAddress: '0x0',
  files: [
    {
      type: 'arweave',
      transactionId: 'USuWnUl3gLPhm4TPbmL6E2a2e2SWMCVo9yWCaapD-98'
    }
  ]
}

const assetDdo = {
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
      id: 'testFakeId',
      type: 'access',
      files: '',
      datatokenAddress: '0x0',
      serviceEndpoint: 'http://172.15.0.4:8030',
      timeout: 0
    }
  ]
}

function delay(interval: number) {
  return it('should delay', (done) => {
    setTimeout(() => done(), interval)
  }).timeout(interval + 100)
}

describe('Publish consume test', async () => {
  before(async () => {
    config = await getTestConfig(web3)
    addresses = getAddresses()
    aquarius = new Aquarius(config.metadataCacheUri)
    providerUrl = config?.providerUri
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

  it('Should publish the assets', async () => {
    urlAssetId = await createAsset(
      'D1Min',
      'D1M',
      publisherAccount,
      urlFile,
      assetDdo,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    assert(urlAssetId, 'Failed to publish DDO')
    console.log(`dataset id: ${urlAssetId}`)

    arweaveAssetId = await createAsset(
      'D1Min',
      'D1M',
      publisherAccount,
      arweaveFile,
      assetDdo,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    assert(urlAssetId, 'Failed to publish DDO')
    console.log(`dataset id: ${urlAssetId}`)
  })

  it('Resolve published assets', async () => {
    resolvedUrlAssetDdo = await aquarius.waitForAqua(urlAssetId)
    console.log('+++resolvedDdo+++ ', resolvedUrlAssetDdo)
    assert(resolvedUrlAssetDdo, 'Cannot fetch DDO from Aquarius')

    resolvedArweaveAssetDdo = await aquarius.waitForAqua(arweaveAssetId)
    console.log('+++resolvedArweaveAssetDdo+++ ', resolvedArweaveAssetDdo)
    assert(resolvedArweaveAssetDdo, 'Cannot fetch DDO from Aquarius')
  })

  it('Mint datasets datatokens to publisher', async () => {
    const urlMintTx = await datatoken.mint(
      resolvedUrlAssetDdo.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    assert(urlMintTx, 'Failed minting datatoken to consumer.')

    const arwaveMintTx = await datatoken.mint(
      resolvedUrlAssetDdo.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    assert(arwaveMintTx, 'Failed minting datatoken to consumer.')
  })

  it('Should order the datasets', async () => {
    const initializeData = await ProviderInstance.initialize(
      resolvedUrlAssetDdo.id,
      resolvedUrlAssetDdo.services[0].id,
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
      resolvedUrlAssetDdo.services[0].datatokenAddress,
      consumerAccount,
      consumerAccount,
      0,
      providerFees
    )
    assert(orderTx, 'Ordering the dataset failed.')
  })

  it('Should download the datasets files', async () => {
    const downloadURL = await ProviderInstance.getDownloadUrl(
      resolvedUrlAssetDdo.id,
      consumerAccount,
      resolvedUrlAssetDdo.services[0].id,
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

  it('Should update datasets metadata', async () => {
    resolvedUrlAssetDdo.metadata.name = 'updated url asset name'
    const updateTx = await updateAssetMetadata(
      publisherAccount,
      resolvedUrlAssetDdo,
      providerUrl,
      aquarius
    )
    assert(updateTx, 'Failed to update asset metadata')
  })

  delay(100000) // let's wait for aquarius to index the updated ddo

  it('Should resolve updated datasets', async () => {
    resolvedUrlAssetDdoAfterUpdate = await aquarius.waitForAqua(urlAssetId)
    console.log('____resolvedDdoAfterUpdate____ ', resolvedUrlAssetDdoAfterUpdate)
    assert(resolvedUrlAssetDdoAfterUpdate, 'Cannot fetch DDO from Aquarius')
  })

  it('Should order the datasets after updated', async () => {
    const initializeData = await ProviderInstance.initialize(
      resolvedUrlAssetDdoAfterUpdate.id,
      resolvedUrlAssetDdoAfterUpdate.services[0].id,
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
      resolvedUrlAssetDdoAfterUpdate.services[0].datatokenAddress,
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

  it('Should download files after updated datasets', async () => {
    const downloadURL = await ProviderInstance.getDownloadUrl(
      resolvedUrlAssetDdoAfterUpdate.id,
      consumerAccount,
      resolvedUrlAssetDdoAfterUpdate.services[0].id,
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
