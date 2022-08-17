import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { deployContracts, Addresses } from '../TestContractHandler'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { web3, getTestConfig } from '../config'
import {
  NftFactory,
  NftCreateData,
  Router,
  balance,
  approve,
  ZERO_ADDRESS,
  Datatoken,
  Config
} from '../../src'
import { DatatokenCreateParams, FreCreationParams, Operation } from '../../src/@types'

describe('Router unit test', () => {
  let factoryOwner: string
  let user1: string
  let user2: string
  let contracts: Addresses
  let router: Router
  let config: Config

  const NFT_NAME = '72120Bundle'
  const NFT_SYMBOL = '72Bundle'
  const NFT_TOKEN_URI = 'https://oceanprotocol.com/nft/'
  const DATATOKEN_NAME = 'ERC20B1'
  const DATATOKEN_SYMBOL = 'ERC20DT1Symbol'
  const DATATOKEN_AMMOUNT = '1000'
  const RATE = '1'
  const FEE = '0.001'
  const FEE_ZERO = '0'
  const DAI_AMOUNT = '100' // 100 DAI
  const CAP_AMOUNT = '1000000'
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

    config = await getTestConfig(web3)
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)

    await approve(
      web3,
      config,
      factoryOwner,
      contracts.daiAddress,
      contracts.nftFactoryAddress,
      web3.utils.toWei('100000')
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

  it('#isFixedPrice - should return true if in fixedPrice list', async () => {
    expect(await router.isFixedPrice(contracts.fixedRateAddress)).to.equal(true)
    expect(await router.isFixedPrice(contracts.daiAddress)).to.equal(false)
  })

  it('#buyDatatokenBatch - should buy multiple DT in one call', async () => {
    // APPROVE DAI
    const daiContract = new web3.eth.Contract(
      MockERC20.abi as AbiItem[],
      contracts.daiAddress
    )

    await daiContract.methods
      .transfer(user1, web3.utils.toWei(DAI_AMOUNT))
      .send({ from: factoryOwner })

    await approve(
      web3,
      config,
      user1,
      contracts.daiAddress,
      contracts.routerAddress,
      DAI_AMOUNT
    )

    // CREATE A FIRST FRE
    const freParams: FreCreationParams = {
      fixedRateAddress: contracts.fixedRateAddress,
      baseTokenAddress: contracts.daiAddress,
      owner: factoryOwner,
      marketFeeCollector: user2,
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: RATE,
      marketFee: FEE,
      allowedConsumer: ZERO_ADDRESS,
      withMint: false
    }

    const nftFactory = new NftFactory(contracts.nftFactoryAddress, web3)
    const txReceipt = await nftFactory.createNftWithDatatokenWithFixedRate(
      factoryOwner,
      NFT_DATA,
      ERC_PARAMS,
      freParams
    )

    const datatokenAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress

    const fre1 = txReceipt.events.NewFixedRate.returnValues.exchangeContract

    const freId1 = txReceipt.events.NewFixedRate.returnValues.exchangeId

    const datatoken = new Datatoken(web3)
    await datatoken.mint(datatokenAddress, factoryOwner, '1000', factoryOwner)
    await approve(
      web3,
      config,
      factoryOwner,
      datatokenAddress,
      contracts.fixedRateAddress,
      DATATOKEN_AMMOUNT
    )

    // CREATE A SECOND FRE

    const txReceipt2 = await nftFactory.createNftWithDatatokenWithFixedRate(
      factoryOwner,
      NFT_DATA,
      ERC_PARAMS,
      freParams
    )

    const datatoken2Address = txReceipt2.events.TokenCreated.returnValues.newTokenAddress

    const fre2 = txReceipt2.events.NewFixedRate.returnValues.exchangeContract

    const freId2 = txReceipt2.events.NewFixedRate.returnValues.exchangeId

    await datatoken.mint(datatoken2Address, factoryOwner, '1000', factoryOwner)
    await approve(
      web3,
      config,
      factoryOwner,
      datatoken2Address,
      contracts.fixedRateAddress,
      DATATOKEN_AMMOUNT
    )

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
      exchangeIds: freId1, // used only for FixedRate or Dispenser, but needs to be filled even for pool
      source: fre1, // pool Address
      operation: 2, // swapExactAmountIn
      tokenIn: contracts.daiAddress,
      amountsIn: AMOUNTS_IN, // when swapExactAmountIn is EXACT amount IN
      tokenOut: datatokenAddress,
      amountsOut: AMOUNTS_OUT, // when swapExactAmountIn is MIN amount OUT
      maxPrice: MAX_PRICE, // max price (only for pools),
      swapMarketFee: SWAP_MARKET_FEE,
      marketFeeAddress: factoryOwner
    }

    const operations2: Operation = {
      exchangeIds: freId2, // used only for FixedRate or Dispenser, but needs to be filled even for pool
      source: fre2, // pool Address
      operation: 2, // swapExactAmountIn
      tokenIn: contracts.daiAddress,
      amountsIn: AMOUNTS_IN, // when swapExactAmountIn is EXACT amount IN
      tokenOut: datatokenAddress,
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
