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
  transfer,
  SmartContract
} from '../../src'
import { Files, Smartcontract } from '../../src/@types'
import { createAsset, orderAsset, updateAssetMetadata } from './helpers'

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

let ipfsAssetId
let resolvedIpfsAssetDdo
let resolvedIpfsAssetDdoAfterUpdate

let onchainAssetId
let resolvedOnchainAssetDdo
let resolvedOnchainAssetDdoAfterUpdate

let grapqlAssetId
let resolvedGraphqlAssetDdo
let resolvedGraphqlAssetDdoAfterUpdate

let urlOrderTx
let arwaveOrderTx
let ipfsOrderTx
let onchainOrderTx
let grapqlOrderTx

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

const ifpsFile: Files = {
  datatokenAddress: '0x0',
  nftAddress: '0x0',
  files: [
    {
      type: 'ipfs',
      hash: 'QmdMBw956S3i2H2ioS9cERrtxoLJuSsfjzCvkqoDgUa2xm'
    }
  ]
}

const onchainFile: Files = {
  datatokenAddress: '0x0',
  nftAddress: '0x0',
  files: []
}

const grapqlFile: Files = {
  datatokenAddress: '0x0',
  nftAddress: '0x0',
  files: [
    {
      type: 'graphql',
      url: 'https://v4.subgraph.goerli.oceanprotocol.com/subgraphs/name/oceanprotocol/ocean-subgraph',
      query: `"
          query{
                nfts(orderBy: createdTimestamp,orderDirection:desc){
                     id
                     symbol
                     createdTimestamp
                }
               }
               "`
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
    name: 'Test asset',
    description: 'desc for the storage type assets',
    tags: [''],
    author: 'ocean-protocol',
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
    aquarius = new Aquarius(config?.metadataCacheUri)
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
      'UrlDatatoken',
      'URLDT',
      publisherAccount,
      urlFile,
      assetDdo,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    assert(urlAssetId, 'Failed to publish url DDO')
    console.log(`url dataset id: ${urlAssetId}`)

    arweaveAssetId = await createAsset(
      'ArwaveDatatoken',
      'ARWAVEDT',
      publisherAccount,
      arweaveFile,
      assetDdo,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    assert(urlAssetId, 'Failed to arwave publish DDO')
    console.log(`arwave dataset id: ${arweaveAssetId}`)

    ipfsAssetId = await createAsset(
      'IpfsDatatoken',
      'IPFSDT',
      publisherAccount,
      ifpsFile,
      assetDdo,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    assert(urlAssetId, 'Failed to publish ipfs DDO')
    console.log(`ipfs dataset id: ${ipfsAssetId}`)

    const chainFile: Smartcontract = {
      type: 'smartcontract',
      address: addresses.Router,
      abi: {
        inputs: [],
        name: 'swapOceanFee',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      },
      chainId: 8996
    }

    onchainFile.files[0] = chainFile
    onchainAssetId = await createAsset(
      'IpfsDatatoken',
      'IPFSDT',
      publisherAccount,
      onchainFile,
      assetDdo,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    assert(onchainAssetId, 'Failed to publish onchain DDO')
    console.log(`onchain dataset id: ${onchainAssetId}`)

    grapqlAssetId = await createAsset(
      'IpfsDatatoken',
      'IPFSDT',
      publisherAccount,
      grapqlFile,
      assetDdo,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    assert(grapqlAssetId, 'Failed to publish graphql DDO')
    console.log(`graphql dataset id: ${grapqlAssetId}`)
  })

  delay(10000) // let's wait for aquarius to index the  assets

  it('Resolve published assets', async () => {
    resolvedUrlAssetDdo = await aquarius.waitForAqua(urlAssetId)
    // console.log('+++resolvedDdo+++ ', resolvedUrlAssetDdo)
    assert(resolvedUrlAssetDdo, 'Cannot fetch url DDO from Aquarius')

    resolvedArweaveAssetDdo = await aquarius.waitForAqua(arweaveAssetId)
    // console.log('+++resolvedArweaveAssetDdo+++ ', resolvedArweaveAssetDdo)
    assert(resolvedArweaveAssetDdo, 'Cannot fetch arwave DDO from Aquarius')

    resolvedIpfsAssetDdo = await aquarius.waitForAqua(ipfsAssetId)
    console.log('+++resolvedIpfsAssetDdo+++ ', resolvedIpfsAssetDdo)
    assert(resolvedIpfsAssetDdo, 'Cannot fetch ipfs DDO from Aquarius')

    resolvedOnchainAssetDdo = await aquarius.waitForAqua(onchainAssetId)
    // console.log('+++resolvedOnchainAssetDdo+++ ', resolvedOnchainAssetDdo)
    assert(resolvedOnchainAssetDdo, 'Cannot fetch onchain DDO from Aquarius')

    resolvedGraphqlAssetDdo = await aquarius.waitForAqua(grapqlAssetId)
    // console.log('+++resolvedGraphqlAssetDdo+++ ', resolvedGraphqlAssetDdo)
    assert(resolvedGraphqlAssetDdo, 'Cannot fetch graphql DDO from Aquarius')
  })

  it('Mint datasets datatokens to publisher', async () => {
    const urlMintTx = await datatoken.mint(
      resolvedUrlAssetDdo.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    assert(urlMintTx, 'Failed minting url datatoken to consumer.')

    const arwaveMintTx = await datatoken.mint(
      resolvedArweaveAssetDdo.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    assert(arwaveMintTx, 'Failed minting arwave datatoken to consumer.')

    const ipfsMintTx = await datatoken.mint(
      resolvedIpfsAssetDdo.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    assert(ipfsMintTx, 'Failed minting ipfs datatoken to consumer.')

    const onchainMintTx = await datatoken.mint(
      resolvedOnchainAssetDdo.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    assert(onchainMintTx, 'Failed minting onchain datatoken to consumer.')

    const graphqlMintTx = await datatoken.mint(
      resolvedGraphqlAssetDdo.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    assert(graphqlMintTx, 'Failed minting graphql datatoken to consumer.')
  })

  it('Should order the datasets', async () => {
    urlOrderTx = await orderAsset(
      resolvedUrlAssetDdo.id,
      resolvedUrlAssetDdo.services[0].datatokenAddress,
      consumerAccount,
      resolvedUrlAssetDdo.services[0].id,
      0,
      datatoken,
      providerUrl
    )
    console.log('urlOrderTx ', urlOrderTx.transactionHash)
    assert(urlOrderTx, 'Ordering url dataset failed.')

    arwaveOrderTx = await orderAsset(
      resolvedArweaveAssetDdo.id,
      resolvedArweaveAssetDdo.services[0].datatokenAddress,
      consumerAccount,
      resolvedArweaveAssetDdo.services[0].id,
      0,
      datatoken,
      providerUrl
    )
    console.log('arwaveOrderTx ', arwaveOrderTx.transactionHash)
    assert(arwaveOrderTx, 'Ordering arwave dataset failed.')

    onchainOrderTx = await orderAsset(
      resolvedOnchainAssetDdo.id,
      resolvedOnchainAssetDdo.services[0].datatokenAddress,
      consumerAccount,
      resolvedOnchainAssetDdo.services[0].id,
      0,
      datatoken,
      providerUrl
    )
    console.log('onchainOrderTx ', onchainOrderTx.transactionHash)
    assert(onchainOrderTx, 'Ordering onchain dataset failed.')

    ipfsOrderTx = await orderAsset(
      resolvedIpfsAssetDdo.id,
      resolvedIpfsAssetDdo.services[0].datatokenAddress,
      consumerAccount,
      resolvedIpfsAssetDdo.services[0].id,
      0,
      datatoken,
      providerUrl
    )
    console.log('ipfsOrderTx ', ipfsOrderTx.transactionHash)
    assert(ipfsOrderTx, 'Ordering ipfs dataset failed.')

    grapqlOrderTx = await orderAsset(
      resolvedGraphqlAssetDdo.id,
      resolvedGraphqlAssetDdo.services[0].datatokenAddress,
      consumerAccount,
      resolvedGraphqlAssetDdo.services[0].id,
      0,
      datatoken,
      providerUrl
    )
    console.log('grapqlOrderTx ', grapqlOrderTx.transactionHash)
    assert(grapqlOrderTx, 'Ordering graphql dataset failed.')
  })

  it('Should download the datasets files', async () => {
    const urlDownloadUrl = await ProviderInstance.getDownloadUrl(
      resolvedUrlAssetDdo.id,
      consumerAccount,
      resolvedUrlAssetDdo.services[0].id,
      0,
      urlOrderTx.transactionHash,
      providerUrl,
      web3
    )
    assert(urlDownloadUrl, 'Provider getDownloadUrl failed for url dataset')
    try {
      await downloadFile(urlDownloadUrl)
    } catch (e) {
      assert.fail(`Download url dataset failed: ${e}`)
    }

    const arwaveDownloadURL = await ProviderInstance.getDownloadUrl(
      resolvedArweaveAssetDdo.id,
      consumerAccount,
      resolvedArweaveAssetDdo.services[0].id,
      0,
      arwaveOrderTx.transactionHash,
      providerUrl,
      web3
    )
    assert(arwaveDownloadURL, 'Provider getDownloadUrl failed for arwave dataset')
    try {
      await downloadFile(arwaveDownloadURL)
    } catch (e) {
      assert.fail(`Download arwave dataset failed: ${e}`)
    }

    const ipfsDownloadURL = await ProviderInstance.getDownloadUrl(
      resolvedIpfsAssetDdo.id,
      consumerAccount,
      resolvedIpfsAssetDdo.services[0].id,
      0,
      ipfsOrderTx.transactionHash,
      providerUrl,
      web3
    )
    assert(ipfsDownloadURL, 'Provider getDownloadUrl failed for ipfs dataset')
    try {
      await downloadFile(ipfsDownloadURL)
    } catch (e) {
      assert.fail(`Download ipfs dataset failed ${e}`)
    }

    const onchainDownloadURL = await ProviderInstance.getDownloadUrl(
      resolvedOnchainAssetDdo.id,
      consumerAccount,
      resolvedOnchainAssetDdo.services[0].id,
      0,
      onchainOrderTx.transactionHash,
      providerUrl,
      web3
    )
    assert(onchainDownloadURL, 'Provider getDownloadUrl failed for onchain dataset')
    try {
      await downloadFile(onchainDownloadURL)
    } catch (e) {
      assert.fail(`Download onchain dataset failed ${e}`)
    }

    const graphqlDownloadURL = await ProviderInstance.getDownloadUrl(
      resolvedGraphqlAssetDdo.id,
      consumerAccount,
      resolvedGraphqlAssetDdo.services[0].id,
      0,
      grapqlOrderTx.transactionHash,
      providerUrl,
      web3
    )
    assert(graphqlDownloadURL, 'Provider getDownloadUrl failed for graphql dataset')
    try {
      await downloadFile(graphqlDownloadURL)
    } catch (e) {
      assert.fail(`Download graphql dataset failed ${e}`)
    }
  })

  it('Should update datasets metadata', async () => {
    resolvedUrlAssetDdo.metadata.name = 'updated url asset name'
    const updateUrlTx = await updateAssetMetadata(
      publisherAccount,
      resolvedUrlAssetDdo,
      providerUrl,
      aquarius
    )
    assert(updateUrlTx, 'Failed to update url asset metadata')

    resolvedArweaveAssetDdo.metadata.name = 'updated arwave asset name'
    const updateArwaveTx = await updateAssetMetadata(
      publisherAccount,
      resolvedArweaveAssetDdo,
      providerUrl,
      aquarius
    )
    assert(updateArwaveTx, 'Failed to update arwave asset metadata')

    // resolvedIpfsAssetDdo.metadata.name = 'updated ipfs asset name'
    // const updateIpfsTx = await updateAssetMetadata(
    //   publisherAccount,
    //   resolvedIpfsAssetDdo,
    //   providerUrl,
    //   aquarius
    // )
    // assert(updateIpfsTx, 'Failed to update ipfs asset metadata')

    resolvedOnchainAssetDdo.metadata.name = 'updated onchain asset name'
    const updateOnchainTx = await updateAssetMetadata(
      publisherAccount,
      resolvedOnchainAssetDdo,
      providerUrl,
      aquarius
    )
    assert(updateOnchainTx, 'Failed to update ipfs asset metadata')

    resolvedGraphqlAssetDdo.metadata.name = 'updated graphql asset name'
    const updateGraphqlTx = await updateAssetMetadata(
      publisherAccount,
      resolvedGraphqlAssetDdo,
      providerUrl,
      aquarius
    )
    assert(updateGraphqlTx, 'Failed to update graphql asset metadata')
  })

  delay(10000) // let's wait for aquarius to index the updated ddo's

  it('Should resolve updated datasets', async () => {
    resolvedUrlAssetDdoAfterUpdate = await aquarius.waitForAqua(urlAssetId)
    console.log('____resolvedUrlDdoAfterUpdate____ ', resolvedUrlAssetDdoAfterUpdate)
    assert(resolvedUrlAssetDdoAfterUpdate, 'Cannot fetch url DDO from Aquarius')

    resolvedArweaveAssetDdoAfterUpdate = await aquarius.waitForAqua(arweaveAssetId)
    console.log(
      '____resolvedArwaveDdoAfterUpdate____ ',
      resolvedArweaveAssetDdoAfterUpdate
    )
    assert(resolvedArweaveAssetDdoAfterUpdate, 'Cannot fetch arwave DDO from Aquarius')

    // resolvedIpfsAssetDdoAfterUpdate = await aquarius.waitForAqua(ipfsAssetId)
    // console.log('____resolvedIpfsDdoAfterUpdate____ ', resolvedIpfsAssetDdoAfterUpdate)
    // assert(resolvedIpfsAssetDdoAfterUpdate, 'Cannot fetch ipfs DDO from Aquarius')

    resolvedOnchainAssetDdoAfterUpdate = await aquarius.waitForAqua(onchainAssetId)
    console.log('resolvedOnchainAssetDdoAfterUpdate ', resolvedOnchainAssetDdoAfterUpdate)
    assert(resolvedOnchainAssetDdoAfterUpdate, 'Cannot fetch onchain DDO from Aquarius')

    resolvedGraphqlAssetDdoAfterUpdate = await aquarius.waitForAqua(grapqlAssetId)
    console.log('resolvedGraphqlAssetDdoAfterUpdate ', resolvedGraphqlAssetDdoAfterUpdate)
    assert(resolvedGraphqlAssetDdoAfterUpdate, 'Cannot fetch onchain DDO from Aquarius')
  })
})
