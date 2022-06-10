import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { deployContracts, Addresses } from '../../TestContractHandler'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import { web3 } from '../../config'
import {
  NftFactory,
  NftCreateData,
  TokenOrder,
  ZERO_ADDRESS,
  signHash,
  Nft,
  transfer,
  approve
} from '../../../src'
import {
  ProviderFees,
  FreCreationParams,
  Erc20CreateParams,
  PoolCreationParams
} from '../../../src/@types'

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

  const DATA_TOKEN_AMOUNT = web3.utils.toWei('1')
  const FEE = '0.001'

  const nftData: NftCreateData = {
    name: '72120Bundle',
    symbol: '72Bundle',
    templateIndex: 1,
    tokenURI: 'https://oceanprotocol.com/nft/',
    transferable: true,
    owner: factoryOwner
  }

  const ercParams: Erc20CreateParams = {
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
    ercParams.minter = nftOwner
    ercParams.paymentCollector = user2
    ercParams.mpFeeAddress = user1
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
    assert(tokenTemplate.templateAddress === contracts.erc20TemplateAddress)
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
    const txReceipt = await nftFactory.createNftWithErc20(nftOwner, nftData, ercParams)

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

    await nftFactory.createNftWithErc20(nftOwner, nftData, ercParams)

    expect((await nftFactory.getCurrentNFTCount()) === currentNFTCount + 1)
    expect((await nftFactory.getCurrentTokenCount()) === currentTokenCount + 1)
  })

  it('#createNftErcWithPool- should create an NFT, a Datatoken and a pool DT/DAI', async () => {
    // we prepare transaction parameters objects
    const poolParams: PoolCreationParams = {
      ssContract: contracts.sideStakingAddress,
      baseTokenAddress: contracts.daiAddress,
      baseTokenSender: contracts.nftFactoryAddress,
      publisherAddress: nftOwner,
      marketFeeCollector: nftOwner,
      poolTemplateAddress: contracts.poolTemplateAddress,
      rate: '1',
      baseTokenDecimals: 18,
      vestingAmount: '10000',
      vestedBlocks: 2500000,
      initialBaseTokenLiquidity: '2000',
      swapFeeLiquidityProvider: FEE,
      swapFeeMarketRunner: FEE
    }

    await transfer(
      web3,
      factoryOwner,
      contracts.daiAddress,
      nftOwner,
      poolParams.vestingAmount
    )

    await approve(
      web3,
      nftOwner,
      contracts.daiAddress,
      contracts.nftFactoryAddress,
      poolParams.vestingAmount
    )

    const txReceipt = await nftFactory.createNftErc20WithPool(
      nftOwner,
      nftData,
      ercParams,
      poolParams
    )

    // events have been emitted
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')
    expect(txReceipt.events.NewPool.event === 'NewPool')
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

    const txReceipt = await nftFactory.createNftErc20WithFixedRate(
      nftOwner,
      nftData,
      ercParams,
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

    const txReceipt = await nftFactory.createNftErc20WithDispenser(
      nftOwner,
      nftData,
      ercParams,
      dispenserParams
    )

    // events have been emitted
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')
    expect(txReceipt.events.DispenserCreated.event === 'DispenserCreated')

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
    const dtContract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress)
    expect(await dtContract.methods.balanceOf(user1).call()).to.equal('0')

    // dt owner mint DATA_TOKEN_AMOUNT to user1
    await dtContract.methods.mint(user1, DATA_TOKEN_AMOUNT).send({ from: nftOwner })

    // user1 approves NFTFactory to move his DATA_TOKEN_AMOUNT
    await dtContract.methods
      .approve(contracts.nftFactoryAddress, DATA_TOKEN_AMOUNT)
      .send({ from: user1 })

    // we reuse another DT created in a previous test
    const dtContract2 = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress2)
    expect(await dtContract2.methods.balanceOf(user1).call()).to.equal('0')

    // dt owner mint DATA_TOKEN_AMOUNT to user1
    await dtContract2.methods.mint(user1, DATA_TOKEN_AMOUNT).send({ from: nftOwner })
    // user1 approves NFTFactory to move his DATA_TOKEN_AMOUNT
    await dtContract2.methods
      .approve(contracts.nftFactoryAddress, DATA_TOKEN_AMOUNT)
      .send({ from: user1 })

    // we check user1 has enought DTs
    expect(await dtContract.methods.balanceOf(user1).call()).to.equal(DATA_TOKEN_AMOUNT)
    expect(await dtContract2.methods.balanceOf(user1).call()).to.equal(DATA_TOKEN_AMOUNT)

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
      consumeMarketFeeAddress: ZERO_ADDRESS,
      consumeMarketFeeToken: ZERO_ADDRESS,
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
    await nftFactory.startMultipleTokenOrder(user1, orders)
    // we check user1 has no more DTs
    expect(await dtContract.methods.balanceOf(user1).call()).to.equal('0')
    expect(await dtContract2.methods.balanceOf(user1).call()).to.equal('0')
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

  it('#addNFTTemplate - should add a new erc721 token template', async () => {
    const currentNFTTemplateCount = await nftFactory.getCurrentNFTTemplateCount()

    await nftFactory.addNFTTemplate(factoryOwner, contracts.nftTemplateAddress)

    expect(
      (await nftFactory.getCurrentNFTTemplateCount()) === currentNFTTemplateCount + 1
    )
  })

  it('#disableNFTTemplate - should disable an erc721 token template', async () => {
    const currentNFTTemplateCount = await nftFactory.getCurrentNFTTemplateCount()

    let nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === true)

    await nftFactory.disableNFTTemplate(factoryOwner, currentNFTTemplateCount)

    nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === false)
  })

  it('#reactivateNFTTemplate - should reactivate an erc721 previously disabled token template', async () => {
    const currentNFTTemplateCount = await nftFactory.getCurrentNFTTemplateCount()

    let nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === false)

    await nftFactory.reactivateNFTTemplate(factoryOwner, currentNFTTemplateCount)

    nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === true)
  })

  it('#addTokenTemplate - should add a new erc20 token template', async () => {
    const currentTokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()

    await nftFactory.addTokenTemplate(factoryOwner, contracts.erc20TemplateAddress)

    expect(
      (await nftFactory.getCurrentTokenTemplateCount()) === currentTokenTemplateCount + 1
    )
  })

  it('#disableTokenTemplate - should disable an erc20 token template', async () => {
    const currentTokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()

    let tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === true)

    await nftFactory.disableTokenTemplate(factoryOwner, currentTokenTemplateCount)

    tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === false)
  })

  it('#reactivateTokenTemplate - should reactivate an previously disabled erc20 token template', async () => {
    const currentTokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()

    let tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === false)

    await nftFactory.reactivateTokenTemplate(factoryOwner, currentTokenTemplateCount)

    tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === true)
  })
})
