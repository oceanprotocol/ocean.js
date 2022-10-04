import { assert, expect } from 'chai'
import { deployContracts, Addresses } from '../TestContractHandler'
import { web3, getTestConfig } from '../config'
import {
  NftFactory,
  NftCreateData,
  TokenOrder,
  ZERO_ADDRESS,
  signHash,
  Nft,
  approve,
  Config,
  balance,
  Datatoken
} from '../../src'
import { ProviderFees, FreCreationParams, DatatokenCreateParams } from '../../src/@types'

describe('Nft Factory test', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let contracts: Addresses
  let nftFactory: NftFactory
  let dtAddress: string
  let dtAddress2: string
  let nftAddress: string
  let config: Config

  const DATA_TOKEN_AMOUNT = '1'
  const FEE = '0.001'

  const nftData: NftCreateData = {
    name: '72120Bundle',
    symbol: '72Bundle',
    templateIndex: 1,
    tokenURI: 'https://oceanprotocol.com/nft/',
    transferable: true,
    owner: factoryOwner
  }

  const dtParams: DatatokenCreateParams = {
    templateIndex: 1,
    minter: nftOwner,
    paymentCollector: user2,
    mpFeeAddress: user1,
    feeToken: ZERO_ADDRESS,
    cap: '1000000',
    feeAmount: '0',
    name: 'ERC20B1',
    symbol: 'ERC20DT1Symbol'
  }

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    nftOwner = accounts[1]
    user1 = accounts[2]
    user2 = accounts[3]

    nftData.owner = factoryOwner
    dtParams.minter = nftOwner
    dtParams.paymentCollector = user2
    dtParams.mpFeeAddress = user1

    config = await getTestConfig(web3)
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)
  })

  it('should initiate NFTFactory instance', async () => {
    nftFactory = new NftFactory(contracts.nftFactoryAddress, web3)
  })

  it('#getOwner - should return actual owner', async () => {
    const owner = await nftFactory.getOwner()
    assert(owner === factoryOwner)
  })

  it('#getNFTTemplate - should return NFT template struct', async () => {
    const nftTemplate = await nftFactory.getNFTTemplate(1)
    assert(nftTemplate.isActive === true)
    assert(nftTemplate.templateAddress === contracts.nftTemplateAddress)
  })

  it('#getTokenTemplate - should return Token template struct', async () => {
    const tokenTemplate = await nftFactory.getTokenTemplate(1)
    assert(tokenTemplate.isActive === true)
    assert(tokenTemplate.templateAddress === contracts.datatokenTemplateAddress)
  })

  it('#createNft - should create an NFT', async () => {
    // we prepare transaction parameters objects
    const nftAddress = await nftFactory.createNFT(nftOwner, nftData)

    // we check the created nft
    const nftDatatoken = new Nft(web3)
    const tokenURI = await nftDatatoken.getTokenURI(nftAddress, 1)
    assert(tokenURI === nftData.tokenURI)
  })

  it('#createNftwithErc - should create an NFT and a Datatoken', async () => {
    // we prepare transaction parameters objects
    const txReceipt = await nftFactory.createNftWithDatatoken(nftOwner, nftData, dtParams)

    // events have been emitted
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')

    // stored for later use in startMultipleTokenOrder test
    nftAddress = txReceipt.events.NFTCreated.returnValues.newTokenAddress
    dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('#createNftwithErc - should increment nft and token count', async () => {
    const currentNFTCount = await nftFactory.getCurrentNFTCount()
    const currentTokenCount = await nftFactory.getCurrentTokenCount()

    await nftFactory.createNftWithDatatoken(nftOwner, nftData, dtParams)

    expect((await nftFactory.getCurrentNFTCount()) === currentNFTCount + 1)
    expect((await nftFactory.getCurrentTokenCount()) === currentTokenCount + 1)
  })

  it('#createNftErcWithFixedRate- should create an NFT, a datatoken and create a Fixed Rate Exchange', async () => {
    // we prepare transaction parameters objects
    const freParams: FreCreationParams = {
      fixedRateAddress: contracts.fixedRateAddress,
      baseTokenAddress: contracts.daiAddress,
      owner: nftOwner,
      marketFeeCollector: nftOwner,
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: FEE,
      allowedConsumer: user1,
      withMint: false
    }

    const txReceipt = await nftFactory.createNftWithDatatokenWithFixedRate(
      nftOwner,
      nftData,
      dtParams,
      freParams
    )

    // events have been emitted
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')
    expect(txReceipt.events.NewFixedRate.event === 'NewFixedRate')

    // stored for later use in startMultipleTokenOrder test
    dtAddress2 = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('#createNftErcWithDispenser- should create an NFT, a datatoken and create a Dispenser', async () => {
    // we prepare transaction parameters objects
    const dispenserParams = {
      dispenserAddress: contracts.dispenserAddress,
      maxTokens: '1',
      maxBalance: '1',
      withMint: true,
      allowedSwapper: ZERO_ADDRESS
    }

    const txReceipt = await nftFactory.createNftWithDatatokenWithDispenser(
      nftOwner,
      nftData,
      dtParams,
      dispenserParams
    )

    // events have been emitted
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')
    expect(txReceipt.events.DispenserCreated.event === 'DispenserCreated')
    // expect(
    //   txReceipt.events.DispenserAllowedSwapperChanged.event ===
    //     'DispenserAllowedSwapperChanged'
    // )

    // allows dispensing for everybody
    console.log('Events', txReceipt.events)
    console.log('DispenserCreated', txReceipt.events.DispenserCreated)
    // console.log(
    //   'DispenserAllowedSwapperChanged',
    //   txReceipt.events.DispenserAllowedSwapperChanged
    // )

    const { allowedSwapper } = txReceipt.events.DispenserCreated.returnValues
    console.log(`Allowed Swapper: ${allowedSwapper}`)
    assert(allowedSwapper === ZERO_ADDRESS, 'ZERO_ADDRESS is not set as allowedSwapper')

    // stored for later use in startMultipleTokenOrder test
    dtAddress2 = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('#startMultipleTokenOrder- should succed to start multiple orders', async () => {
    const consumer = user1 // could be different user
    const serviceIndex = 1 // dummy index
    const consumeFeeAddress = user2 // marketplace fee Collector
    const consumeFeeAmount = '0' // fee to be collected on top, requires approval
    const consumeFeeToken = contracts.daiAddress // token address for the feeAmount, in this case DAI

    // we reuse a DT created in a previous test
    expect(await balance(web3, dtAddress, user1)).to.equal('0')

    // dt owner mint DATA_TOKEN_AMOUNT to user1
    const datatoken = new Datatoken(web3)
    datatoken.mint(dtAddress, nftOwner, DATA_TOKEN_AMOUNT, user1)

    // user1 approves NFTFactory to move his DATA_TOKEN_AMOUNT
    await approve(
      web3,
      config,
      user1,
      dtAddress,
      contracts.nftFactoryAddress,
      DATA_TOKEN_AMOUNT
    )

    // we reuse another DT created in a previous test
    expect(await balance(web3, dtAddress2, user1)).to.equal('0')

    // dt owner mint DATA_TOKEN_AMOUNT to user1
    datatoken.mint(dtAddress2, nftOwner, DATA_TOKEN_AMOUNT, user1)
    // user1 approves NFTFactory to move his DATA_TOKEN_AMOUNT
    await approve(
      web3,
      config,
      user1,
      dtAddress2,
      contracts.nftFactoryAddress,
      DATA_TOKEN_AMOUNT
    )

    // we check user1 has enought DTs
    expect(await balance(web3, dtAddress, user1)).to.equal(DATA_TOKEN_AMOUNT)
    expect(await balance(web3, dtAddress2, user1)).to.equal(DATA_TOKEN_AMOUNT)

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
      v,
      r,
      s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const consumeMarketFee = {
      consumeMarketFeeAddress: ZERO_ADDRESS,
      consumeMarketFeeToken: ZERO_ADDRESS,
      consumeMarketFeeAmount: '0'
    }
    const orders: TokenOrder[] = [
      {
        tokenAddress: dtAddress,
        consumer,
        serviceIndex,
        _providerFee: providerFees,
        _consumeMarketFee: consumeMarketFee
      },
      {
        tokenAddress: dtAddress2,
        consumer,
        serviceIndex,
        _providerFee: providerFees,
        _consumeMarketFee: consumeMarketFee
      }
    ]
    await nftFactory.startMultipleTokenOrder(user1, orders)
    // we check user1 has no more DTs
    expect(await balance(web3, dtAddress, user1)).to.equal('0')
    expect(await balance(web3, dtAddress2, user1)).to.equal('0')
  })

  it('#checkDatatoken - should confirm if DT is from the factory', async () => {
    assert((await nftFactory.checkDatatoken(dtAddress)) === true)
    assert((await nftFactory.checkDatatoken(dtAddress2)) === true)
    assert((await nftFactory.checkDatatoken(user1)) === false)
    assert((await nftFactory.checkDatatoken(nftAddress)) === false)
  })

  it('#checkNFT - should return nftAddress if from the factory, or address(0) if not', async () => {
    assert((await nftFactory.checkNFT(dtAddress)) === ZERO_ADDRESS)
    assert((await nftFactory.checkNFT(nftAddress)) === nftAddress)
  })

  it('#addNFTTemplate - should add a new NFT token template', async () => {
    const currentNFTTemplateCount = await nftFactory.getCurrentNFTTemplateCount()

    await nftFactory.addNFTTemplate(factoryOwner, contracts.nftTemplateAddress)

    expect(
      (await nftFactory.getCurrentNFTTemplateCount()) === currentNFTTemplateCount + 1
    )
  })

  it('#disableNFTTemplate - should disable an NFT token template', async () => {
    const currentNFTTemplateCount = await nftFactory.getCurrentNFTTemplateCount()

    let nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === true)

    await nftFactory.disableNFTTemplate(factoryOwner, currentNFTTemplateCount)

    nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === false)
  })

  it('#reactivateNFTTemplate - should reactivate an NFT previously disabled token template', async () => {
    const currentNFTTemplateCount = await nftFactory.getCurrentNFTTemplateCount()

    let nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === false)

    await nftFactory.reactivateNFTTemplate(factoryOwner, currentNFTTemplateCount)

    nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === true)
  })

  it('#addTokenTemplate - should add a new Datatokent template', async () => {
    const currentTokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()

    await nftFactory.addTokenTemplate(factoryOwner, contracts.datatokenTemplateAddress)

    expect(
      (await nftFactory.getCurrentTokenTemplateCount()) === currentTokenTemplateCount + 1
    )
  })

  it('#disableTokenTemplate - should disable an Datatoken template', async () => {
    const currentTokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()

    let tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === true)

    await nftFactory.disableTokenTemplate(factoryOwner, currentTokenTemplateCount)

    tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === false)
  })

  it('#reactivateTokenTemplate - should reactivate an previously disabled Datatoken template', async () => {
    const currentTokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()

    let tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === false)

    await nftFactory.reactivateTokenTemplate(factoryOwner, currentTokenTemplateCount)

    tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === true)
  })
})
