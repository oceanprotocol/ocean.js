import { assert } from 'chai'
import { SHA256 } from 'crypto-js'
import { web3, getTestConfig, getAddresses } from '../config'
import {
  Config,
  ProviderInstance,
  Aquarius,
  NftFactory,
  NftCreateData,
  getHash,
  ZERO_ADDRESS,
  Nft,
  approve
} from '../../src'
import {
  ValidateMetadata,
  DDO,
  DatatokenCreateParams,
  FreCreationParams,
  DispenserCreationParams,
  Files
} from '../../src/@types'

describe('Publish tests', async () => {
  let config: Config
  let addresses: any
  let aquarius: Aquarius
  let providerUrl: any
  let nft: Nft
  let factory: NftFactory
  let publisherAccount: string

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
    id: '',
    version: '4.1.0',
    chainId: 4,
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
        id: 'testFakeId',
        type: 'access',
        description: 'Download service',
        files: '',
        datatokenAddress: '0x0',
        serviceEndpoint: 'https://v4.provider.goerli.oceanprotocol.com',
        timeout: 0
      }
    ]
  }

  before(async () => {
    config = await getTestConfig(web3)
    aquarius = new Aquarius(config.metadataCacheUri)
    providerUrl = config.providerUri

    addresses = getAddresses()
  })

  it('initialize accounts', async () => {
    const accounts = await web3.eth.getAccounts()
    publisherAccount = accounts[0]
  })

  it('initialize test classes', async () => {
    nft = new Nft(web3)
    factory = new NftFactory(addresses.ERC721Factory, web3)

    await approve(
      web3,
      config,
      publisherAccount,
      addresses.MockDAI,
      addresses.ERC721Factory,
      '100000'
    )
  })

  it('should publish a dataset with fixed price (create NFT + Datoken + fixed price) with an explicit empty Metadata Proof', async () => {
    const fixedPriceDdo: DDO = { ...genericAsset }

    const nftParams: NftCreateData = {
      name: 'testNftFre',
      symbol: 'TSTF',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const datatokenParams: DatatokenCreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

    const fixedPriceParams: FreCreationParams = {
      fixedRateAddress: addresses.FixedPrice,
      baseTokenAddress: addresses.MockDAI,
      owner: publisherAccount,
      marketFeeCollector: publisherAccount,
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: '0',
      allowedConsumer: publisherAccount,
      withMint: false
    }

    const bundleNFT = await factory.createNftWithDatatokenWithFixedRate(
      publisherAccount,
      nftParams,
      datatokenParams,
      fixedPriceParams
    )

    const nftAddress = bundleNFT.events.NFTCreated.returnValues[0]
    const datatokenAddress = bundleNFT.events.TokenCreated.returnValues[0]
    assetUrl.datatokenAddress = datatokenAddress
    assetUrl.nftAddress = nftAddress
    const encryptedFiles = await ProviderInstance.encrypt(assetUrl, providerUrl)

    fixedPriceDdo.metadata.name = 'test-dataset-fixedPrice'
    fixedPriceDdo.services[0].files = await encryptedFiles
    fixedPriceDdo.services[0].datatokenAddress = datatokenAddress

    fixedPriceDdo.nftAddress = nftAddress
    const chain = await web3.eth.getChainId()
    fixedPriceDdo.chainId = chain
    fixedPriceDdo.id =
      'did:op:' + SHA256(web3.utils.toChecksumAddress(nftAddress) + chain.toString(10))

    const isAssetValid: ValidateMetadata = await aquarius.validate(fixedPriceDdo)
    assert(isAssetValid.valid === true, 'Published asset is not valid')

    const encryptedDdo = await ProviderInstance.encrypt(fixedPriceDdo, providerUrl)
    const encryptedResponse = await encryptedDdo
    const metadataHash = getHash(JSON.stringify(fixedPriceDdo))
    // this is publishing with an explicit empty metadataProofs
    await nft.setMetadata(
      nftAddress,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedResponse,
      '0x' + metadataHash,
      []
    )
    const resolvedDDO = await aquarius.waitForAqua(fixedPriceDdo.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')
  })

  it('should publish a dataset with dispenser (create NFT + Datatoken + dispenser) with no defined MetadataProof', async () => {
    const dispenserDdo: DDO = { ...genericAsset }

    const nftParams: NftCreateData = {
      name: 'testNftDispenser',
      symbol: 'TSTD',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const datatokenParams: DatatokenCreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

    const dispenserParams: DispenserCreationParams = {
      dispenserAddress: addresses.Dispenser,
      maxTokens: '1',
      maxBalance: '1',
      withMint: true,
      allowedSwapper: ZERO_ADDRESS
    }

    const bundleNFT = await factory.createNftWithDatatokenWithDispenser(
      publisherAccount,
      nftParams,
      datatokenParams,
      dispenserParams
    )

    const allowedSwapper = bundleNFT.events.DispenserCreated.returnValues[4]
    assert(allowedSwapper === ZERO_ADDRESS, 'ZERO_ADDRESS is not set as allowedSwapper')

    const nftAddress = bundleNFT.events.NFTCreated.returnValues[0]
    const datatokenAddress = bundleNFT.events.TokenCreated.returnValues[0]
    assetUrl.datatokenAddress = datatokenAddress
    assetUrl.nftAddress = nftAddress
    const encryptedFiles = await ProviderInstance.encrypt(assetUrl, providerUrl)
    dispenserDdo.metadata.name = 'test-dataset-dispenser'
    dispenserDdo.services[0].files = await encryptedFiles
    dispenserDdo.services[0].datatokenAddress = datatokenAddress

    dispenserDdo.nftAddress = nftAddress
    const chain = await web3.eth.getChainId()
    dispenserDdo.chainId = chain
    dispenserDdo.id =
      'did:op:' + SHA256(web3.utils.toChecksumAddress(nftAddress) + chain.toString(10))

    const isAssetValid: ValidateMetadata = await aquarius.validate(dispenserDdo)
    assert(isAssetValid.valid === true, 'Published asset is not valid')

    const encryptedDdo = await ProviderInstance.encrypt(dispenserDdo, providerUrl)
    const encryptedResponse = await encryptedDdo
    const metadataHash = getHash(JSON.stringify(dispenserDdo))
    // this is publishing with any explicit metadataProofs
    await nft.setMetadata(
      nftAddress,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedResponse,
      '0x' + metadataHash
    )
    const resolvedDDO = await aquarius.waitForAqua(dispenserDdo.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')
  })
})
