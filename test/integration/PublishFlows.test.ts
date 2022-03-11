import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import ProviderInstance from '../../src/provider/Provider'
import Aquarius from '../../src/aquarius/Aquarius'
import { assert } from 'chai'
import { NftFactory, NftCreateData } from '../../src/factories/index'
import { getHash, ZERO_ADDRESS } from '../../src/utils'
import { Nft } from '../../src/tokens/NFT'
import Web3 from 'web3'
import { SHA256 } from 'crypto-js'
import { homedir } from 'os'
import fs from 'fs'
import { AbiItem } from 'web3-utils'
import {
  ValidateMetadata,
  DDO,
  Erc20CreateParams,
  PoolCreationParams,
  FreCreationParams,
  DispenserCreationParams
} from '../../src/@types'

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
const providerUrl = process.env.PROVIDER_URL || 'http://127.0.0.1:8030'
let nft: Nft
let factory: NftFactory
let accounts: string[]

const files = [
  {
    type: 'url',
    url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
    method: 'GET'
  }
]
const genericAsset: DDO = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'testFakeDid',
  version: '4.0.0',
  chainId: 4,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    name: 'dataset-name',
    type: 'dataset',
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
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
      timeout: 0
    }
  ]
}

describe('Publish tests', async () => {
  it('initialise testes classes', async () => {
    nft = new Nft(web3)
    factory = new NftFactory(addresses.ERC721Factory, web3)
    accounts = await web3.eth.getAccounts()
    const daiContract = new web3.eth.Contract(
      MockERC20.abi as AbiItem[],
      addresses.MockDAI
    )
    await daiContract.methods
      .approve(addresses.ERC721Factory, web3.utils.toWei('100000'))
      .send({ from: accounts[0] })
  })

  it('should publish a dataset with pool (create NFT + ERC20 + pool) and with Metdata proof', async () => {
    const poolDdo: DDO = { ...genericAsset }
    const nftParams: NftCreateData = {
      name: 'testNftPool',
      symbol: 'TSTP',
      templateIndex: 1,
      tokenURI: ''
    }
    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      feeManager: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: accounts[0],
      mpFeeAddress: ZERO_ADDRESS
    }
    const poolParams: PoolCreationParams = {
      ssContract: addresses.Staking,
      baseTokenAddress: addresses.MockDAI,
      baseTokenSender: addresses.ERC721Factory,
      publisherAddress: accounts[0],
      marketFeeCollector: accounts[0],
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
      accounts[0],
      nftParams,
      erc20Params,
      poolParams
    )

    const nftAddress = bundleNFT.events.NFTCreated.returnValues[0]
    const datatokenAddress = bundleNFT.events.TokenCreated.returnValues[0]
    const poolAdress = bundleNFT.events.NewPool.returnValues[0]

    const encryptedFiles = await ProviderInstance.encrypt(files, providerUrl)

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
    const tx = await nft.setMetadata(
      nftAddress,
      accounts[0],
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
      tokenURI: ''
    }
    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      feeManager: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: accounts[0],
      mpFeeAddress: ZERO_ADDRESS
    }

    const fixedPriceParams: FreCreationParams = {
      fixedRateAddress: addresses.FixedPrice,
      baseTokenAddress: addresses.MockDAI,
      owner: accounts[0],
      marketFeeCollector: accounts[0],
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: '0',
      allowedConsumer: accounts[0],
      withMint: false
    }

    const bundleNFT = await factory.createNftErc20WithFixedRate(
      accounts[0],
      nftParams,
      erc20Params,
      fixedPriceParams
    )

    const nftAddress = bundleNFT.events.NFTCreated.returnValues[0]
    const datatokenAddress = bundleNFT.events.TokenCreated.returnValues[0]
    const fixedPrice = bundleNFT.events.NewFixedRate.returnValues[0]

    const encryptedFiles = await ProviderInstance.encrypt(files, providerUrl)

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
    const res = await nft.setMetadata(
      nftAddress,
      accounts[0],
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
      tokenURI: ''
    }
    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      feeManager: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: accounts[0],
      mpFeeAddress: ZERO_ADDRESS
    }

    const dispenserParams: DispenserCreationParams = {
      dispenserAddress: addresses.Dispenser,
      maxTokens: web3.utils.toWei('1'),
      maxBalance: web3.utils.toWei('1'),
      withMint: true,
      allowedSwapper: ZERO_ADDRESS
    }

    const bundleNFT = await factory.createNftErc20WithDispenser(
      accounts[0],
      nftParams,
      erc20Params,
      dispenserParams
    )

    const nftAddress = bundleNFT.events.NFTCreated.returnValues[0]
    const datatokenAddress = bundleNFT.events.TokenCreated.returnValues[0]
    const dispenserAddress = bundleNFT.events.DispenserCreated.returnValues[0]

    const encryptedFiles = await ProviderInstance.encrypt(files, providerUrl)
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
    const res = await nft.setMetadata(
      nftAddress,
      accounts[0],
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
