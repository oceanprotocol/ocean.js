import { assert, expect } from 'chai'
import { deployContracts, Addresses } from '../../TestContractHandler'
import { web3 } from '../../config'
import {
  NftFactory,
  NftCreateData,
  Router,
  balance,
  approve,
  ZERO_ADDRESS,
  transfer
} from '../../../src'
import { DatatokenCreateParams, PoolCreationParams, Operation } from '../../../src/@types'

const { keccak256 } = require('@ethersproject/keccak256')

describe('Router unit test', () => {
  let factoryOwner: string
  let user1: string
  let user2: string
  let contracts: Addresses
  let router: Router

  const NFT_NAME = '72120Bundle'
  const NFT_SYMBOL = '72Bundle'
  const NFT_TOKEN_URI = 'https://oceanprotocol.com/nft/'
  const DATATOKEN_NAME = 'ERC20B1'
  const DATATOKEN_SYMBOL = 'ERC20DT1Symbol'
  const RATE = '1'
  const FEE = '0.001'
  const FEE_ZERO = '0'
  const DAI_AMOUNT = '2' // 2 DAI
  const CAP_AMOUNT = '1000000'
  const VESTING_AMOUNT = '10000'
  const TOKEN_DECIMALS = 18
  const VESTED_BLOCKS = 2500000
  const BASE_TOKEN_LIQUIDITY = '2000'
  const EXCHANGE_IDS = keccak256('0x00')
  const AMOUNTS_IN = web3.utils.toWei('1')
  const AMOUNTS_OUT = web3.utils.toWei('0.1')
  const MAX_PRICE = web3.utils.toWei('10')
  const SWAP_MARKET_FEE = web3.utils.toWei('0.1')

  const NFT_DATA: NftCreateData = {
    name: NFT_NAME,
    symbol: NFT_SYMBOL,
    templateIndex: 1,
    tokenURI: NFT_TOKEN_URI,
    transferable: true,
    owner: factoryOwner
  }

  const ERC_PARAMS: DatatokenCreateParams = {
    templateIndex: 1,
    minter: factoryOwner,
    paymentCollector: user2,
    mpFeeAddress: factoryOwner,
    feeToken: ZERO_ADDRESS,
    cap: CAP_AMOUNT,
    feeAmount: FEE_ZERO,
    name: DATATOKEN_NAME,
    symbol: DATATOKEN_SYMBOL
  }

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]

    NFT_DATA.owner = factoryOwner
    ERC_PARAMS.minter = factoryOwner
    ERC_PARAMS.paymentCollector = user2
    ERC_PARAMS.mpFeeAddress = factoryOwner
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)

    await approve(
      web3,
      factoryOwner,
      contracts.daiAddress,
      contracts.nftFactoryAddress,
      web3.utils.toWei('10000')
    )
  })

  it('should initiate Router instance', async () => {
    router = new Router(contracts.routerAddress, web3)
  })

  it('#getOwner - should return actual owner', async () => {
    const owner = await router.getOwner()
    assert(owner === factoryOwner)
  })

  it('#getNFTFactory - should return NFT Factory address', async () => {
    const factory = await router.getNFTFactory()
    assert(factory === contracts.nftFactoryAddress)
  })

  it('#isOceanTokens - should return true if in oceanTokens list', async () => {
    expect(await router.isApprovedToken(contracts.oceanAddress)).to.equal(true)
    expect(await router.isApprovedToken(contracts.daiAddress)).to.equal(false)
  })

  it('#isSideStaking - should return true if in ssContracts list', async () => {
    expect(await router.isSideStaking(contracts.sideStakingAddress)).to.equal(true)
    expect(await router.isSideStaking(contracts.fixedRateAddress)).to.equal(false)
  })

  it('#isFixedPrice - should return true if in fixedPrice list', async () => {
    expect(await router.isFixedPrice(contracts.fixedRateAddress)).to.equal(true)
    expect(await router.isFixedPrice(contracts.daiAddress)).to.equal(false)
  })

  it('#isPoolTemplate - should return true if in poolTemplates list', async () => {
    expect(await router.isPoolTemplate(contracts.poolTemplateAddress)).to.equal(true)
    expect(await router.isPoolTemplate(contracts.fixedRateAddress)).to.equal(false)
  })

  it('#buyDatatokenBatch - should buy multiple DT in one call', async () => {
    // APPROVE DAI
    await transfer(web3, factoryOwner, contracts.daiAddress, user1, DAI_AMOUNT)

    await approve(web3, user1, contracts.daiAddress, contracts.routerAddress, DAI_AMOUNT)

    // CREATE A FIRST POOL
    const poolParams: PoolCreationParams = {
      ssContract: contracts.sideStakingAddress,
      baseTokenAddress: contracts.daiAddress,
      baseTokenSender: contracts.nftFactoryAddress,
      publisherAddress: factoryOwner,
      marketFeeCollector: factoryOwner,
      poolTemplateAddress: contracts.poolTemplateAddress,
      rate: RATE,
      baseTokenDecimals: TOKEN_DECIMALS,
      vestingAmount: VESTING_AMOUNT,
      vestedBlocks: VESTED_BLOCKS,
      initialBaseTokenLiquidity: BASE_TOKEN_LIQUIDITY,
      swapFeeLiquidityProvider: FEE,
      swapFeeMarketRunner: FEE
    }

    const nftFactory = new NftFactory(contracts.nftFactoryAddress, web3)
    const txReceipt = await nftFactory.createNftWithDatatokenWithPool(
      factoryOwner,
      NFT_DATA,
      ERC_PARAMS,
      poolParams
    )

    const datatokenAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
    const pool1 = txReceipt.events.NewPool.returnValues.poolAddress

    // CREATE A SECOND POOL
    const txReceipt2 = await nftFactory.createNftWithDatatokenWithPool(
      factoryOwner,
      NFT_DATA,
      ERC_PARAMS,
      poolParams
    )

    const datatoken2Address = txReceipt2.events.TokenCreated.returnValues.newTokenAddress
    const pool2 = txReceipt2.events.NewPool.returnValues.poolAddress

    // user1 has no dt1
    expect(await balance(web3, datatokenAddress, user1)).to.equal('0')
    // user1 has no dt2
    expect(await balance(web3, datatoken2Address, user1)).to.equal('0')

    // we now can prepare the Operations objects

    // operation: 0 - swapExactAmountIn
    // 1 - swapExactAmountOut
    // 2 - FixedRateExchange
    // 3 - Dispenser
    const operations1: Operation = {
      exchangeIds: EXCHANGE_IDS, // used only for FixedRate or Dispenser, but needs to be filled even for pool
      source: pool1, // pool Address
      operation: 0, // swapExactAmountIn
      tokenIn: contracts.daiAddress,
      amountsIn: AMOUNTS_IN, // when swapExactAmountIn is EXACT amount IN
      tokenOut: datatokenAddress,
      amountsOut: AMOUNTS_OUT, // when swapExactAmountIn is MIN amount OUT
      maxPrice: MAX_PRICE, // max price (only for pools),
      swapMarketFee: SWAP_MARKET_FEE,
      marketFeeAddress: factoryOwner
    }

    const operations2: Operation = {
      exchangeIds: EXCHANGE_IDS, // used only for FixedRate or Dispenser, but needs to be filled even for pool
      source: pool2, // pool Address
      operation: 0, // swapExactAmountIn
      tokenIn: contracts.daiAddress,
      amountsIn: AMOUNTS_IN, // when swapExactAmountIn is EXACT amount IN
      tokenOut: datatoken2Address,
      amountsOut: AMOUNTS_OUT, // when swapExactAmountIn is MIN amount OUT
      maxPrice: MAX_PRICE, // max price (only for pools),
      swapMarketFee: SWAP_MARKET_FEE,
      marketFeeAddress: factoryOwner
    }

    await router.buyDatatokenBatch(user1, [operations1, operations2])

    // user1 got his dts
    expect(+(await balance(web3, datatokenAddress, user1))).gt(0)
    expect(+(await balance(web3, datatoken2Address, user1))).gt(0)
  })
})
