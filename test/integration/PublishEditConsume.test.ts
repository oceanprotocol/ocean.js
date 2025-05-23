import { assert } from 'chai'
import { ethers, Signer } from 'ethers'
import fs from 'fs'
import FormData from 'form-data'
import fetch from 'node-fetch'
import path from 'path'
import { fileURLToPath } from 'url'
import { getTestConfig, getAddresses, provider } from '../config.js'
import {
  Config,
  ProviderInstance,
  Aquarius,
  Datatoken,
  downloadFile,
  sendTx,
  transfer,
  amountToUnits
} from '../../src/index.js'
import { Files } from '../../src/@types'
import { createAssetHelper, orderAsset, updateAssetMetadata } from './helpers.js'
import { DDO } from '@oceanprotocol/ddo-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let config: Config

let aquarius: Aquarius
let datatoken: Datatoken
let providerUrl: string
let consumerAccount: Signer
let publisherAccount: Signer
let addresses: any

let urlAssetId
let resolvedUrlAssetDdo
let resolvedUrlAssetDdoAfterUpdate

let arweaveAssetId
let resolvedArweaveAssetDdo
let resolvedArweaveAssetDdoAfterUpdate

let ipfsAssetId
let resolvedIpfsAssetDdo
// let resolvedIpfsAssetDdoAfterUpdate

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

// const onchainFile: Files = {
//   datatokenAddress: '0x0',
//   nftAddress: '0x0',
//   files: []
// }

// const grapqlFile: Files = {
//   datatokenAddress: '0x0',
//   nftAddress: '0x0',
//   files: [
//     {
//       type: 'graphql',
//       url: 'https://v4.subgraph.sepolia.oceanprotocol.com/subgraphs/name/oceanprotocol/ocean-subgraph/graphql',
//       query: `"
//           query{
//                 nfts(orderBy: createdTimestamp,orderDirection:desc){
//                      id
//                      symbol
//                      createdTimestamp
//                 }
//                }
//                "`
//     }
//   ]
// }

const assetDdo: DDO = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
  chainId: 8996,
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
      id: 'db164c1b981e4d2974e90e61bda121512e6909c1035c908d68933ae4cfaba6b0',
      type: 'access',
      files: '',
      datatokenAddress: '0x0',
      serviceEndpoint: 'http://127.0.0.1:8001',
      timeout: 0
    }
  ]
}

function delay(interval: number) {
  return it('should delay', (done) => {
    setTimeout(() => done(), interval)
  }).timeout(interval + 100)
}
export async function uploadToIpfs(): Promise<string> {
  const filePath = path.resolve(__dirname, 'resources/data.json')

  const fileStream = fs.createReadStream(filePath)

  const form = new FormData()
  form.append('file', fileStream, 'data.json')

  try {
    const response = await fetch('http://172.15.0.16:5001/api/v0/add', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    })
    const result = (await response.json()) as { Hash: string }
    return result.Hash
  } catch (error) {
    console.error('Error uploading file to IPFS:', error)
    throw error
  }
}

describe('Publish consume test', async () => {
  before(async () => {
    publisherAccount = (await provider.getSigner(0)) as Signer
    consumerAccount = (await provider.getSigner(1)) as Signer
    config = await getTestConfig(publisherAccount)
    aquarius = new Aquarius(config?.oceanNodeUri)
    providerUrl = config?.oceanNodeUri
    addresses = getAddresses()
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
    ]

    const tokenContract = new ethers.Contract(addresses.Ocean, minAbi, publisherAccount)
    const estGas = await tokenContract.estimateGas.mint(
      await publisherAccount.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )
    await sendTx(
      estGas,
      publisherAccount,
      1,
      tokenContract.mint,
      await publisherAccount.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )
  }).timeout(40000)

  it('Send some OCEAN to consumer account', async () => {
    transfer(
      publisherAccount,
      config,
      addresses.Ocean,
      await consumerAccount.getAddress(),
      '100'
    )
  }).timeout(40000)

  it('Should publish url asset', async () => {
    urlAssetId = await createAssetHelper(
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
  }).timeout(40000)

  it('Should publish arweave asset', async () => {
    arweaveAssetId = await createAssetHelper(
      'ArwaveDatatoken',
      'ARWAVEDT',
      publisherAccount,
      arweaveFile,
      assetDdo,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    assert(arweaveAssetId, 'Failed to arwave publish DDO')
  }).timeout(40000)

  it('Should publish ipfs asset', async () => {
    const ipfsCID = await uploadToIpfs()
    const ipfsFile: Files = {
      datatokenAddress: '0x0',
      nftAddress: '0x0',
      files: [
        {
          type: 'ipfs',
          hash: ipfsCID
        }
      ]
    }
    ipfsAssetId = await createAssetHelper(
      'IpfsDatatoken',
      'IPFSDT',
      publisherAccount,
      ipfsFile,
      assetDdo,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    assert(ipfsAssetId, 'Failed to publish ipfs DDO')
  }).timeout(60000)

  // smartcontract & grapqhl datasets are not supported yet by ocean-node
  // it('Should publish onchain asset', async () => {
  //   const chainFile: Smartcontract = {
  //     type: 'smartcontract',
  //     address: addresses.Router,
  //     abi: {
  //       inputs: [],
  //       name: 'swapOceanFee',
  //       outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  //       stateMutability: 'view',
  //       type: 'function'
  //     },
  //     chainId: 8996
  //   }
  //   onchainFile.files[0] = chainFile
  //   onchainAssetId = await createAssetHelper(
  //     'ChainDatatoken',
  //     'CHAINDT',
  //     publisherAccount,
  //     onchainFile,
  //     assetDdo,
  //     providerUrl,
  //     addresses.ERC721Factory,
  //     aquarius
  //   )
  //   assert(onchainAssetId, 'Failed to publish onchain DDO')
  // }).timeout(40000)

  // it('Should publish graphql asset', async () => {
  //   grapqlAssetId = await createAssetHelper(
  //     'GraphDatatoken',
  //     'GRAPHDT',
  //     publisherAccount,
  //     grapqlFile,
  //     assetDdo,
  //     providerUrl,
  //     addresses.ERC721Factory,
  //     aquarius
  //   )
  //   assert(grapqlAssetId, 'Failed to publish graphql DDO')
  // }).timeout(40000)

  delay(20000) // let's wait for aquarius to index the  assets

  it('Resolve published assets', async () => {
    resolvedUrlAssetDdo = await aquarius.waitForIndexer(urlAssetId)
    assert(resolvedUrlAssetDdo, 'Cannot fetch url DDO from Aquarius')

    resolvedArweaveAssetDdo = await aquarius.waitForIndexer(arweaveAssetId)
    assert(resolvedArweaveAssetDdo, 'Cannot fetch arwave DDO from Aquarius')

    resolvedIpfsAssetDdo = await aquarius.waitForIndexer(ipfsAssetId)
    assert(resolvedIpfsAssetDdo, 'Cannot fetch ipfs DDO from Aquarius')

    // resolvedOnchainAssetDdo = await aquarius.waitForIndexer(onchainAssetId)
    // assert(resolvedOnchainAssetDdo, 'Cannot fetch onchain DDO from Aquarius')

    // resolvedGraphqlAssetDdo = await aquarius.waitForIndexer(grapqlAssetId)
    // assert(resolvedGraphqlAssetDdo, 'Cannot fetch graphql DDO from Aquarius')
  }).timeout(80000)

  it('Mint datasets datatokens to publisher', async () => {
    datatoken = new Datatoken(publisherAccount, config.chainId)
    const urlMintTx = await datatoken.mint(
      resolvedUrlAssetDdo.services[0].datatokenAddress,
      await publisherAccount.getAddress(),
      '10',
      await consumerAccount.getAddress()
    )
    assert(urlMintTx, 'Failed minting url datatoken to consumer.')

    const arwaveMintTx = await datatoken.mint(
      resolvedArweaveAssetDdo.services[0].datatokenAddress,
      await publisherAccount.getAddress(),
      '10',
      await consumerAccount.getAddress()
    )
    assert(arwaveMintTx, 'Failed minting arwave datatoken to consumer.')

    const ipfsMintTx = await datatoken.mint(
      resolvedIpfsAssetDdo.services[0].datatokenAddress,
      await publisherAccount.getAddress(),
      '10',
      await consumerAccount.getAddress()
    )
    assert(ipfsMintTx, 'Failed minting ipfs datatoken to consumer.')

    // const onchainMintTx = await datatoken.mint(
    //   resolvedOnchainAssetDdo.services[0].datatokenAddress,
    //   await publisherAccount.getAddress(),
    //   '10',
    //   await consumerAccount.getAddress()
    // )
    // assert(onchainMintTx, 'Failed minting onchain datatoken to consumer.')

    // const graphqlMintTx = await datatoken.mint(
    //   resolvedGraphqlAssetDdo.services[0].datatokenAddress,
    //   await publisherAccount.getAddress(),
    //   '10',
    //   await consumerAccount.getAddress()
    // )
    // assert(graphqlMintTx, 'Failed minting graphql datatoken to consumer.')
  }).timeout(40000)

  it('Should order url dataset', async () => {
    datatoken = new Datatoken(consumerAccount, config.chainId)
    urlOrderTx = await orderAsset(
      resolvedUrlAssetDdo.id,
      resolvedUrlAssetDdo.services[0].datatokenAddress,
      await consumerAccount.getAddress(),
      resolvedUrlAssetDdo.services[0].id,
      0,
      datatoken,
      providerUrl
    )
    assert(urlOrderTx, 'Ordering url dataset failed.')
  }).timeout(40000)

  it('Should order arweave dataset', async () => {
    arwaveOrderTx = await orderAsset(
      resolvedArweaveAssetDdo.id,
      resolvedArweaveAssetDdo.services[0].datatokenAddress,
      await consumerAccount.getAddress(),
      resolvedArweaveAssetDdo.services[0].id,
      0,
      datatoken,
      providerUrl
    )
    assert(arwaveOrderTx, 'Ordering arwave dataset failed.')
  }).timeout(40000)

  it('Should order IPFS dataset', async () => {
    ipfsOrderTx = await orderAsset(
      resolvedIpfsAssetDdo.id,
      resolvedIpfsAssetDdo.services[0].datatokenAddress,
      await consumerAccount.getAddress(),
      resolvedIpfsAssetDdo.services[0].id,
      0,
      datatoken,
      providerUrl
    )
    assert(ipfsOrderTx, 'Ordering ipfs dataset failed.')
  }).timeout(40000)

  // smartcontract & grapqhl datasets are not supported yet by ocean-node
  // it('Should order onchain dataset', async () => {
  //   onchainOrderTx = await orderAsset(
  //     resolvedOnchainAssetDdo.id,
  //     resolvedOnchainAssetDdo.services[0].datatokenAddress,
  //     await consumerAccount.getAddress(),
  //     resolvedOnchainAssetDdo.services[0].id,
  //     0,
  //     datatoken,
  //     providerUrl
  //   )
  //   assert(onchainOrderTx, 'Ordering onchain dataset failed.')
  // }).timeout(40000)

  // it('Should order graphQl dataset', async () => {
  //   grapqlOrderTx = await orderAsset(
  //     resolvedGraphqlAssetDdo.id,
  //     resolvedGraphqlAssetDdo.services[0].datatokenAddress,
  //     await consumerAccount.getAddress(),
  //     resolvedGraphqlAssetDdo.services[0].id,
  //     0,
  //     datatoken,
  //     providerUrl
  //   )
  //   assert(grapqlOrderTx, 'Ordering graphql dataset failed.')
  // }).timeout(40000)

  it('Should download the datasets files', async () => {
    const urlDownloadUrl = await ProviderInstance.getDownloadUrl(
      resolvedUrlAssetDdo.id,
      resolvedUrlAssetDdo.services[0].id,
      0,
      urlOrderTx.transactionHash,
      providerUrl,
      consumerAccount
    )
    console.log('urlDownloadUrl', urlDownloadUrl)
    assert(urlDownloadUrl, 'Provider getDownloadUrl failed for url dataset')
    try {
      await downloadFile(urlDownloadUrl)
    } catch (e) {
      assert.fail(`Download url dataset failed: ${e}`)
    }
    const arwaveDownloadURL = await ProviderInstance.getDownloadUrl(
      resolvedArweaveAssetDdo.id,
      resolvedArweaveAssetDdo.services[0].id,
      0,
      arwaveOrderTx.transactionHash,
      providerUrl,
      consumerAccount
    )
    console.log('arwaveDownloadURL', arwaveDownloadURL)
    assert(arwaveDownloadURL, 'Provider getDownloadUrl failed for arwave dataset')
    try {
      await downloadFile(arwaveDownloadURL)
    } catch (e) {
      assert.fail(`Download arwave dataset failed: ${e}`)
    }

    const ipfsDownloadURL = await ProviderInstance.getDownloadUrl(
      resolvedIpfsAssetDdo.id,
      resolvedIpfsAssetDdo.services[0].id,
      0,
      ipfsOrderTx.transactionHash,
      providerUrl,
      consumerAccount
    )
    assert(ipfsDownloadURL, 'Provider getDownloadUrl failed for ipfs dataset')
    try {
      await downloadFile(ipfsDownloadURL)
    } catch (e) {
      assert.fail(`Download ipfs dataset failed ${e}`)
    }

    // smartcontract & grapqhl datasets are not supported yet by ocean-node
    // const onchainDownloadURL = await ProviderInstance.getDownloadUrl(
    //   resolvedOnchainAssetDdo.id,
    //   resolvedOnchainAssetDdo.services[0].id,
    //   0,
    //   onchainOrderTx.transactionHash,
    //   providerUrl,
    //   consumerAccount
    // )
    // console.log('onchainDownloadURL', onchainDownloadURL)
    // assert(onchainDownloadURL, 'Provider getDownloadUrl failed for onchain dataset')
    // try {
    //   await downloadFile(onchainDownloadURL)
    // } catch (e) {
    //   assert.fail(`Download onchain dataset failed: ${e}`)
    // }
    // const graphqlDownloadURL = await ProviderInstance.getDownloadUrl(
    //   resolvedGraphqlAssetDdo.id,
    //   resolvedGraphqlAssetDdo.services[0].id,
    //   0,
    //   grapqlOrderTx.transactionHash,
    //   providerUrl,
    //   consumerAccount
    // )
    // console.log('graphqlDownloadURL', graphqlDownloadURL)
    // assert(graphqlDownloadURL, 'Provider getDownloadUrl failed for graphql dataset')
    // try {
    //   await downloadFile(graphqlDownloadURL)
    // } catch (e) {
    //   assert.fail(`Download graphql dataset failed ${e}`)
    // }
  }).timeout(60000)

  it('Should update url dataset', async () => {
    resolvedUrlAssetDdo.metadata.name = 'updated url asset name'
    const updateUrlTx = await updateAssetMetadata(
      publisherAccount,
      resolvedUrlAssetDdo,
      providerUrl,
      aquarius
    )
    assert(updateUrlTx, 'Failed to update url asset metadata')
  }).timeout(40000)

  it('Should update arweave dataset', async () => {
    resolvedArweaveAssetDdo.metadata.name = 'updated arwave asset name'
    const updateArwaveTx = await updateAssetMetadata(
      publisherAccount,
      resolvedArweaveAssetDdo,
      providerUrl,
      aquarius
    )
    assert(updateArwaveTx, 'Failed to update arwave asset metadata')
    // To be fixed in #1849
    // resolvedIpfsAssetDdo.metadata.name = 'updated ipfs asset name'
    // const updateIpfsTx = await updateAssetMetadata(
    //   publisherAccount,
    //   resolvedIpfsAssetDdo,
    //   providerUrl,
    //   aquarius
    // )
    // assert(updateIpfsTx, 'Failed to update ipfs asset metadata')

    it('Should update onchain dataset', async () => {
      resolvedOnchainAssetDdo.metadata.name = 'updated onchain asset name'
      const updateOnchainTx = await updateAssetMetadata(
        publisherAccount,
        resolvedOnchainAssetDdo,
        providerUrl,
        aquarius
      )
      assert(updateOnchainTx, 'Failed to update ipfs asset metadata')
    })

    it('Should update graphql dataset', async () => {
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
      resolvedUrlAssetDdoAfterUpdate = await aquarius.waitForIndexer(urlAssetId)
      assert(resolvedUrlAssetDdoAfterUpdate, 'Cannot fetch url DDO from Aquarius')

      resolvedArweaveAssetDdoAfterUpdate = await aquarius.waitForIndexer(arweaveAssetId)
      assert(resolvedArweaveAssetDdoAfterUpdate, 'Cannot fetch arwave DDO from Aquarius')
      // To be fixed in #1849
      // resolvedIpfsAssetDdoAfterUpdate = await aquarius.waitForAqua(ipfsAssetId)
      // assert(resolvedIpfsAssetDdoAfterUpdate, 'Cannot fetch ipfs DDO from Aquarius')

      resolvedOnchainAssetDdoAfterUpdate = await aquarius.waitForIndexer(onchainAssetId)
      assert(resolvedOnchainAssetDdoAfterUpdate, 'Cannot fetch onchain DDO from Aquarius')

      resolvedGraphqlAssetDdoAfterUpdate = await aquarius.waitForIndexer(grapqlAssetId)
      assert(resolvedGraphqlAssetDdoAfterUpdate, 'Cannot fetch onchain DDO from Aquarius')
    })
  }).timeout(40000)
})
