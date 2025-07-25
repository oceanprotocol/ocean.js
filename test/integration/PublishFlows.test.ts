import { assert, expect } from 'chai'
import { ethers, Signer } from 'ethers'
import { getTestConfig, getAddresses, provider } from '../config.js'
import {
  Config,
  ProviderInstance,
  Aquarius,
  NftFactory,
  NftCreateData,
  ZERO_ADDRESS,
  Nft,
  approve,
  getEventFromTx
} from '../../src/index.js'
import {
  DatatokenCreateParams,
  FreCreationParams,
  DispenserCreationParams,
  Files
} from '../../src/@types/index.js'

import { createAsset } from '../../src/utils/index.js'
import crypto from 'crypto-js'
import { DDO, ValidateMetadata } from '@oceanprotocol/ddo-js'
const { SHA256 } = crypto

function delay(interval: number) {
  return it('should delay', (done) => {
    setTimeout(() => done(), interval)
  }).timeout(interval + 100)
}

// TODO: needs fix when indexing these assets with pricing schemas
describe('Publish tests', async () => {
  let config: Config
  let addresses: any
  let aquarius: Aquarius
  let providerUrl: any
  let nft: Nft
  let factory: NftFactory
  let publisherAccount: Signer
  let fixedPricedDID: string
  let dispenserDID: string

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

  const genericAsset: DDO = {
    '@context': ['https://w3id.org/did/v1'],
    id: 'did:op',
    version: '4.1.0',
    chainId: 8996,
    nftAddress: '0x0',
    metadata: {
      created: '2021-12-20T14:35:20Z',
      updated: '2021-12-20T14:35:20Z',
      type: 'dataset',
      name: 'dataset-name',
      description: 'Ocean protocol test dataset description',
      author: 'oceanprotocol-team',
      license: 'MIT',
      tags: ['white-papers'],
      additionalInformation: { 'test-key': 'test-value' },
      links: ['http://data.ceda.ac.uk/badc/ukcp09/']
    },
    services: [
      {
        id: 'db164c1b981e4d2974e90e61bda121512e6909c1035c908d68933ae4cfaba6b0',
        type: 'access',
        description: 'Download service',
        files: '',
        datatokenAddress: '0x0',
        serviceEndpoint: 'http://127.0.0.1:8001',
        timeout: 0
      }
    ]
  }

  before(async () => {
    publisherAccount = (await provider.getSigner(0)) as Signer
    config = await getTestConfig(publisherAccount)

    aquarius = new Aquarius(config.oceanNodeUri)
    providerUrl = config.oceanNodeUri

    addresses = getAddresses()
  })

  // it('initialize test classes', async () => {
  //   nft = new Nft(publisherAccount, await publisherAccount.getChainId())
  //   factory = new NftFactory(
  //     addresses.ERC721Factory,
  //     publisherAccount,
  //     await publisherAccount.getChainId()
  //   )

  //   await approve(
  //     publisherAccount,
  //     config,
  //     await publisherAccount.getAddress(),
  //     addresses.MockDAI,
  //     addresses.ERC721Factory,
  //     '100000'
  //   )
  // })

  // it('should publish a dataset with fixed price (create NFT + Datoken + fixed price) with an explicit empty Metadata Proof', async () => {
  //   const fixedPriceDdo: DDO = { ...genericAsset }

  //   const nftParams: NftCreateData = {
  //     name: 'testNftFre',
  //     symbol: 'TSTF',
  //     templateIndex: 1,
  //     tokenURI: '',
  //     transferable: true,
  //     owner: await publisherAccount.getAddress()
  //   }

  //   const datatokenParams: DatatokenCreateParams = {
  //     templateIndex: 1,
  //     cap: '100000',
  //     feeAmount: '0',
  //     paymentCollector: ZERO_ADDRESS,
  //     feeToken: ZERO_ADDRESS,
  //     minter: await publisherAccount.getAddress(),
  //     mpFeeAddress: ZERO_ADDRESS
  //   }

  //   const fixedPriceParams: FreCreationParams = {
  //     fixedRateAddress: addresses.FixedPrice,
  //     baseTokenAddress: addresses.MockDAI,
  //     owner: await publisherAccount.getAddress(),
  //     marketFeeCollector: await publisherAccount.getAddress(),
  //     baseTokenDecimals: 18,
  //     datatokenDecimals: 18,
  //     fixedRate: '1',
  //     marketFee: '0',
  //     allowedConsumer: await publisherAccount.getAddress(),
  //     withMint: true
  //   }

  //   const bundleNFT = await factory.createNftWithDatatokenWithFixedRate(
  //     nftParams,
  //     datatokenParams,
  //     fixedPriceParams
  //   )
  //   const trxReceipt = await bundleNFT.wait()
  //   // events have been emitted
  //   const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
  //   const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')
  //   expect(nftCreatedEvent.event === 'NFTCreated')
  //   expect(tokenCreatedEvent.event === 'TokenCreated')

  //   const nftAddress = nftCreatedEvent.args.newTokenAddress
  //   const datatokenAddress = tokenCreatedEvent.args.newTokenAddress
  //   assetUrl.datatokenAddress = datatokenAddress
  //   assetUrl.nftAddress = nftAddress

  //   fixedPriceDdo.services[0].files = await ProviderInstance.encrypt(
  //     assetUrl,
  //     config.chainId,
  //     providerUrl
  //   )

  //   fixedPriceDdo.metadata.name = 'test-dataset-fixedPrice'
  //   fixedPriceDdo.services[0].datatokenAddress = datatokenAddress

  //   fixedPriceDdo.nftAddress = nftAddress

  //   fixedPriceDdo.chainId = config.chainId
  //   fixedPriceDdo.id =
  //     'did:op:' +
  //     SHA256(ethers.utils.getAddress(nftAddress) + config.chainId.toString(10))

  //   fixedPricedDID = fixedPriceDdo.id
  //   const isAssetValid: ValidateMetadata = await aquarius.validate(
  //     fixedPriceDdo,
  //     publisherAccount,
  //     providerUrl
  //   )
  //   assert(isAssetValid.valid === true, 'Published asset is not valid')
  //   const encryptedResponse = await ProviderInstance.encrypt(
  //     fixedPriceDdo,
  //     config.chainId,
  //     providerUrl
  //   )

  //   await nft.setMetadata(
  //     nftAddress,
  //     await publisherAccount.getAddress(),
  //     0,
  //     providerUrl,
  //     '',
  //     '0x02',
  //     encryptedResponse,
  //     isAssetValid.hash,
  //     []
  //   )
  // })

  // delay(19000)

  // it('should publish a dataset with fixed price (create NFT + Datoken + fixed price) using createAsset() fn', async () => {
  //   const fixedPriceDdo: DDO = { ...genericAsset }
  //   const ownerAddress = publisherAccount
  //   const asset = await createAsset(
  //     'test asset',
  //     'TEST',
  //     ownerAddress,
  //     assetUrl,
  //     1, // template 1 on dev network
  //     fixedPriceDdo,
  //     true, // encrypted ddo
  //     providerUrl,
  //     ZERO_ADDRESS, // provider fee token
  //     aquarius
  //   )

  //   assert(asset !== null, 'Could not publish asset!')
  // })

  // delay(20000) // let's wait for aquarius to index the  assets

  // it('should resolve the fixed price dataset', async () => {
  //   const resolvedDDO = await aquarius.waitForIndexer(fixedPricedDID)
  //   assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')
  // }).timeout(40000)

  // it('should publish a dataset with dispenser (create NFT + Datatoken + dispenser) with no defined MetadataProof', async () => {
  //   const dispenserDdo: DDO = { ...genericAsset }

  //   const nftParams: NftCreateData = {
  //     name: 'testNftDispenser',
  //     symbol: 'TSTD',
  //     templateIndex: 1,
  //     tokenURI: '',
  //     transferable: true,
  //     owner: await publisherAccount.getAddress()
  //   }

  //   const datatokenParams: DatatokenCreateParams = {
  //     templateIndex: 1,
  //     cap: '100000',
  //     feeAmount: '0',
  //     paymentCollector: ZERO_ADDRESS,
  //     feeToken: ZERO_ADDRESS,
  //     minter: await publisherAccount.getAddress(),
  //     mpFeeAddress: ZERO_ADDRESS
  //   }

  //   const dispenserParams: DispenserCreationParams = {
  //     dispenserAddress: addresses.Dispenser,
  //     maxTokens: '1',
  //     maxBalance: '1',
  //     withMint: true,
  //     allowedSwapper: ZERO_ADDRESS
  //   }

  //   const bundleNFT = await factory.createNftWithDatatokenWithDispenser(
  //     nftParams,
  //     datatokenParams,
  //     dispenserParams
  //   )

  //   const trxReceipt = await bundleNFT.wait()
  //   // events have been emitted
  //   const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
  //   const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')
  //   expect(nftCreatedEvent.event === 'NFTCreated')
  //   expect(tokenCreatedEvent.event === 'TokenCreated')

  //   const nftAddress = nftCreatedEvent.args.newTokenAddress
  //   const datatokenAddress = tokenCreatedEvent.args.newTokenAddress
  //   assetUrl.datatokenAddress = datatokenAddress
  //   assetUrl.nftAddress = nftAddress

  //   const encryptedFiles = await ProviderInstance.encrypt(
  //     assetUrl,
  //     config.chainId,
  //     providerUrl
  //   )
  //   dispenserDdo.metadata.name = 'test-dataset-dispenser'
  //   dispenserDdo.services[0].files = await encryptedFiles
  //   dispenserDdo.services[0].datatokenAddress = datatokenAddress

  //   dispenserDdo.nftAddress = nftAddress
  //   dispenserDdo.chainId = config.chainId
  //   dispenserDdo.id =
  //     'did:op:' +
  //     SHA256(ethers.utils.getAddress(nftAddress) + config.chainId.toString(10))
  //   dispenserDID = dispenserDdo.id

  //   const isAssetValid: ValidateMetadata = await aquarius.validate(
  //     dispenserDdo,
  //     publisherAccount,
  //     providerUrl
  //   )
  //   assert(isAssetValid.valid === true, 'Published asset is not valid')

  //   const encryptedDdo = await ProviderInstance.encrypt(
  //     dispenserDdo,
  //     config.chainId,
  //     providerUrl
  //   )
  //   const encryptedResponse = await encryptedDdo
  //   // this is publishing with any explicit metadataProofs
  //   await nft.setMetadata(
  //     nftAddress,
  //     await publisherAccount.getAddress(),
  //     0,
  //     providerUrl,
  //     '',
  //     '0x02',
  //     encryptedResponse,
  //     isAssetValid.hash
  //   )
  // })

  // delay(19000)

  // it('should resolve the free dataset', async () => {
  //   const resolvedDDO = await aquarius.waitForIndexer(dispenserDID)
  //   assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')
  // }).timeout(40000)
})
