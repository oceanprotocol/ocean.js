import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { deployContracts, Addresses } from '../TestContractHandler'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { web3 } from '../config'
import { NftFactory, NftCreateData, TokenOrder, ZERO_ADDRESS, signHash } from '../../src'
import {
  ProviderFees,
  FreCreationParams,
  Erc20CreateParams,
  PoolCreationParams
} from '../../src/@types'

describe('Nft Factory test', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let contracts: Addresses
  let nftFactory: NftFactory
  let dtAddress: string
  let dtAddress2: string
  let nftAddress: string

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    nftOwner = accounts[1]
    user1 = accounts[2]
    user2 = accounts[3]
    user3 = accounts[4]
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(factoryOwner)

    const daiContract = new web3.eth.Contract(
      MockERC20.abi as AbiItem[],
      contracts.daiAddress
    )
    await daiContract.methods
      .approve(contracts.erc721FactoryAddress, web3.utils.toWei('10000'))
      .send({ from: factoryOwner })
  })

  it('should initiate NFTFactory instance', async () => {
    nftFactory = new NftFactory(contracts.erc721FactoryAddress, web3)
  })

  it('#getOwner - should return actual owner', async () => {
    const owner = await nftFactory.getOwner()
    assert(owner === factoryOwner)
  })

  it('#getNFTTemplate - should return NFT template struct', async () => {
    const nftTemplate = await nftFactory.getNFTTemplate(1)
    assert(nftTemplate.isActive === true)
    assert(nftTemplate.templateAddress === contracts.erc721TemplateAddress)
  })
  it('#getTokenTemplate - should return Token template struct', async () => {
    const tokenTemplate = await nftFactory.getTokenTemplate(1)
    assert(tokenTemplate.isActive === true)
    assert(tokenTemplate.templateAddress === contracts.erc20TemplateAddress)
  })

  it('#createNftwithErc - should create an NFT and a Datatoken ', async () => {
    // we prepare transaction parameters objects
    const nftData: NftCreateData = {
      name: '72120Bundle',
      symbol: '72Bundle',
      templateIndex: 1,
      tokenURI: 'https://oceanprotocol.com/nft/'
    }

    const ercParams: Erc20CreateParams = {
      templateIndex: 1,
      minter: factoryOwner,
      feeManager: user3,
      mpFeeAddress: user2,
      feeToken: '0x0000000000000000000000000000000000000000',
      cap: '10000',
      feeAmount: '0',
      name: 'ERC20B1',
      symbol: 'ERC20DT1Symbol'
    }

    const txReceipt = await nftFactory.createNftWithErc20(
      factoryOwner,
      nftData,
      ercParams
    )

    // EVENTS HAVE BEEN EMITTED
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')

    // stored for later use in startMultipleTokenOrder test
    nftAddress = txReceipt.events.NFTCreated.returnValues.newTokenAddress
    dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('#createNftErcWithPool- should create an NFT, a Datatoken and a pool DT/DAI', async () => {
    // we prepare transaction parameters objects
    const nftData: NftCreateData = {
      name: '72120Bundle',
      symbol: '72Bundle',
      templateIndex: 1,
      tokenURI: 'https://oceanprotocol.com/nft/'
    }

    const ercParams: Erc20CreateParams = {
      templateIndex: 1,
      minter: user2,
      feeManager: user3,
      mpFeeAddress: user2,
      feeToken: '0x0000000000000000000000000000000000000000',
      cap: '1000000',
      feeAmount: '0',
      name: 'ERC20B1',
      symbol: 'ERC20DT1Symbol'
    }

    const poolParams: PoolCreationParams = {
      ssContract: contracts.sideStakingAddress,
      baseTokenAddress: contracts.daiAddress,
      baseTokenSender: contracts.erc721FactoryAddress,
      publisherAddress: factoryOwner,
      marketFeeCollector: factoryOwner,
      poolTemplateAddress: contracts.poolTemplateAddress,
      rate: '1',
      baseTokenDecimals: 18,
      vestingAmount: '10000',
      vestedBlocks: 2500000,
      initialBaseTokenLiquidity: '2000',
      swapFeeLiquidityProvider: '0.001',
      swapFeeMarketRunner: '0.001'
    }

    const txReceipt = await nftFactory.createNftErc20WithPool(
      factoryOwner,
      nftData,
      ercParams,
      poolParams
    )

    // EVENTS HAVE BEEN EMITTED
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')
    expect(txReceipt.events.NewPool.event === 'NewPool')
  })

  it('#createNftErcWithFixedRate- should create an NFT, a datatoken and create a Fixed Rate Exchange', async () => {
    // we prepare transaction parameters objects
    const nftData: NftCreateData = {
      name: '72120Bundle',
      symbol: '72Bundle',
      templateIndex: 1,
      tokenURI: 'https://oceanprotocol.com/nft/'
    }

    const ercParams: Erc20CreateParams = {
      templateIndex: 1,
      minter: factoryOwner,
      feeManager: user3,
      mpFeeAddress: user2,
      feeToken: '0x0000000000000000000000000000000000000000',
      cap: '1000000',
      feeAmount: '0',
      name: 'ERC20B1',
      symbol: 'ERC20DT1Symbol'
    }

    const freParams: FreCreationParams = {
      fixedRateAddress: contracts.fixedRateAddress,
      baseTokenAddress: contracts.daiAddress,
      owner: factoryOwner,
      marketFeeCollector: factoryOwner,
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: '0.001',
      allowedConsumer: factoryOwner,
      withMint: false
    }

    const txReceipt = await nftFactory.createNftErc20WithFixedRate(
      factoryOwner,
      nftData,
      ercParams,
      freParams
    )

    // EVENTS HAVE BEEN EMITTED
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')
    expect(txReceipt.events.NewFixedRate.event === 'NewFixedRate')

    // stored for later use in startMultipleTokenOrder test
    dtAddress2 = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('#createNftErcWithDispenser- should create an NFT, a datatoken and create a Dispenser', async () => {
    // we prepare transaction parameters objects
    const nftData: NftCreateData = {
      name: '72120Bundle',
      symbol: '72Bundle',
      templateIndex: 1,
      tokenURI: 'https://oceanprotocol.com/nft/'
    }

    const ercParams: Erc20CreateParams = {
      templateIndex: 1,
      minter: factoryOwner,
      feeManager: user3,
      mpFeeAddress: user2,
      feeToken: '0x0000000000000000000000000000000000000000',
      cap: '1000000',
      feeAmount: '0',
      name: 'ERC20B1',
      symbol: 'ERC20DT1Symbol'
    }

    const dispenserParams = {
      dispenserAddress: contracts.dispenserAddress,
      maxTokens: '1',
      maxBalance: '1',
      withMint: true,
      allowedSwapper: ZERO_ADDRESS
    }

    const txReceipt = await nftFactory.createNftErc20WithDispenser(
      factoryOwner,
      nftData,
      ercParams,
      dispenserParams
    )

    // EVENTS HAVE BEEN EMITTED
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')
    expect(txReceipt.events.DispenserCreated.event === 'DispenserCreated')

    // stored for later use in startMultipleTokenOrder test
    dtAddress2 = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('#startMultipleTokenOrder- should succed to start multiple orders', async () => {
    const consumer = user2 // could be different user
    const dtAmount = web3.utils.toWei('1')
    const serviceIndex = 1 // dummy index
    const consumeFeeAddress = user3 // marketplace fee Collector
    const consumeFeeAmount = '0' // fee to be collected on top, requires approval
    const consumeFeeToken = contracts.daiAddress // token address for the feeAmount, in this case DAI

    // we reuse a DT created in a previous test
    const dtContract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress)
    expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')

    // dt owner mint dtAmount to user2
    await dtContract.methods.mint(user2, dtAmount).send({ from: factoryOwner })

    // user2 approves NFTFactory to move his dtAmount
    await dtContract.methods
      .approve(contracts.erc721FactoryAddress, dtAmount)
      .send({ from: user2 })

    // we reuse another DT created in a previous test
    const dtContract2 = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress2)
    expect(await dtContract2.methods.balanceOf(user2).call()).to.equal('0')

    // dt owner mint dtAmount to user2
    await dtContract2.methods.mint(user2, dtAmount).send({ from: factoryOwner })
    // user2 approves NFTFactory to move his dtAmount
    await dtContract2.methods
      .approve(contracts.erc721FactoryAddress, dtAmount)
      .send({ from: user2 })

    // we check user2 has enought DTs
    expect(await dtContract.methods.balanceOf(user2).call()).to.equal(dtAmount)
    expect(await dtContract2.methods.balanceOf(user2).call()).to.equal(dtAmount)

    const providerData = JSON.stringify({ timeout: 0 })
    const providerValidUntil = '0'

    const message = web3.utils.soliditySha3(
      { t: 'bytes', v: web3.utils.toHex(web3.utils.asciiToHex(providerData)) },
      { t: 'address', v: consumeFeeAddress },
      { t: 'address', v: consumeFeeToken },
      { t: 'uint256', v: web3.utils.toWei(consumeFeeAmount) },
      { t: 'uint256', v: providerValidUntil }
    )

    const { v, r, s } = await signHash(web3, message, consumeFeeAddress)
    const providerFees: ProviderFees = {
      providerFeeAddress: consumeFeeAddress,
      providerFeeToken: consumeFeeToken,
      providerFeeAmount: consumeFeeAmount,
      v: v,
      r: r,
      s: s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const consumeMarketFee = {
      consumeMarketFeeAddress: '0x0000000000000000000000000000000000000000',
      consumeMarketFeeToken: '0x0000000000000000000000000000000000000000',
      consumeMarketFeeAmount: '0'
    }
    const orders: TokenOrder[] = [
      {
        tokenAddress: dtAddress,
        consumer: consumer,
        serviceIndex: serviceIndex,
        _providerFee: providerFees,
        _consumeMarketFee: consumeMarketFee
      },
      {
        tokenAddress: dtAddress2,
        consumer: consumer,
        serviceIndex: serviceIndex,
        _providerFee: providerFees,
        _consumeMarketFee: consumeMarketFee
      }
    ]
    await nftFactory.startMultipleTokenOrder(user2, orders)
    // we check user2 has no more DTs
    expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')
    expect(await dtContract2.methods.balanceOf(user2).call()).to.equal('0')
  })

  it('#checkDatatoken - should confirm if DT is from the factory', async () => {
    assert((await nftFactory.checkDatatoken(dtAddress)) === true)
    assert((await nftFactory.checkDatatoken(dtAddress2)) === true)
    assert((await nftFactory.checkDatatoken(user2)) === false)
    assert((await nftFactory.checkDatatoken(nftAddress)) === false)
  })

  it('#checkNFT - should return nftAddress if from the factory, or address(0) if not', async () => {
    assert(
      (await nftFactory.checkNFT(dtAddress)) ===
        '0x0000000000000000000000000000000000000000'
    )
    assert((await nftFactory.checkNFT(nftAddress)) === nftAddress)
  })
})
