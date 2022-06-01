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
  Erc20CreateParams,
  PoolCreationParams,
  FreCreationParams,
  DispenserCreationParams
} from '../../src/@types'

describe('Publish tests', async () => {
  let config: Config
  let addresses: any
  let aquarius: Aquarius
  let providerUrl: any
  let nft: Nft
  let factory: NftFactory
  let publisherAccount: string

  const assetUrl = [
    {
      type: 'url',
      url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
      method: 'GET'
    }
  ]

  const genericAsset: DDO = {
    '@context': ['https://w3id.org/did/v1'],
    id: '',
    version: '4.0.0',
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
        serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
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
    factory = new NftFactory(addresses.NFTFactory, web3)

    await approve(
      web3,
      publisherAccount,
      addresses.MockDAI,
      addresses.NFTFactory,
      '100000'
    )
  })

  it('should publish a dataset with pool (create NFT + ERC20 + pool) and with Metdata proof', async () => {
    const poolDdo: DDO = { ...genericAsset }

    const nftParams: NftCreateData = {
      name: 'testNftPool',
      symbol: 'TSTP',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

    const poolParams: PoolCreationParams = {
      ssContract: addresses.Staking,
      baseTokenAddress: addresses.MockDAI,
      baseTokenSender: addresses.NFTFactory,
      publisherAddress: publisherAccount,
      marketFeeCollector: publisherAccount,
      poolTemplateAddress: addresses.poolTemplate,
      rate: '1',
      baseTokenDecimals: 18,
      vestingAmount: '10000',
      vestedBlocks: 2500000,
      initialBaseTokenLiquidity: '2000',
      swapFeeLiquidityProvider: '0.001',
      swapFeeMarketRunner: '0.001'
    }

    const bundleNFT = await factory.createNftErc20WithPool(
      publisherAccount,
      nftParams,
      erc20Params,
      poolParams
    )

    const nftAddress = bundleNFT.events.NFTCreated.returnValues[0]
    const datatokenAddress = bundleNFT.events.TokenCreated.returnValues[0]

    const encryptedFiles = await ProviderInstance.encrypt(assetUrl, providerUrl)

    poolDdo.metadata.name = 'test-dataset-pool'
    poolDdo.services[0].files = await encryptedFiles
    poolDdo.services[0].datatokenAddress = datatokenAddress

    poolDdo.nftAddress = nftAddress
    const chain = await web3.eth.getChainId()
    poolDdo.chainId = chain
    poolDdo.id =
      'did:op:' + SHA256(web3.utils.toChecksumAddress(nftAddress) + chain.toString(10))

    const AssetValidation: ValidateMetadata = await aquarius.validate(poolDdo)
    assert(AssetValidation.valid === true, 'Published asset is not valid')

    const encryptedDdo = await ProviderInstance.encrypt(poolDdo, providerUrl)
    const encryptedResponse = await encryptedDdo
    const metadataHash = getHash(JSON.stringify(poolDdo))
    // just to make sure that our hash matches one computed by aquarius
    assert(AssetValidation.hash === '0x' + metadataHash, 'Metadata hash is a missmatch')
    await nft.setMetadata(
      nftAddress,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedResponse,
      '0x' + metadataHash,
      [AssetValidation.proof]
    )

    const resolvedDDO = await aquarius.waitForAqua(poolDdo.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')
  })

  it('should publish a dataset with fixed price (create NFT + ERC20 + fixed price) with an explicit empty Metadata Proof', async () => {
    const fixedPriceDdo: DDO = { ...genericAsset }

    const nftParams: NftCreateData = {
      name: 'testNftFre',
      symbol: 'TSTF',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const erc20Params: Erc20CreateParams = {
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

    const bundleNFT = await factory.createNftErc20WithFixedRate(
      publisherAccount,
      nftParams,
      erc20Params,
      fixedPriceParams
    )

    const nftAddress = bundleNFT.events.NFTCreated.returnValues[0]
    const datatokenAddress = bundleNFT.events.TokenCreated.returnValues[0]

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

  it('should publish a dataset with dispenser (create NFT + ERC20 + dispenser) with no defined MetadataProof', async () => {
    const dispenserDdo: DDO = { ...genericAsset }

    const nftParams: NftCreateData = {
      name: 'testNftDispenser',
      symbol: 'TSTD',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const erc20Params: Erc20CreateParams = {
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

    const bundleNFT = await factory.createNftErc20WithDispenser(
      publisherAccount,
      nftParams,
      erc20Params,
      dispenserParams
    )

    const nftAddress = bundleNFT.events.NFTCreated.returnValues[0]
    const datatokenAddress = bundleNFT.events.TokenCreated.returnValues[0]

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
