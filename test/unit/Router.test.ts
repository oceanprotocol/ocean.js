import { assert, expect } from 'chai'
import { getTestConfig, provider, getAddresses } from '../config'
import { ethers, Signer } from 'ethers'
import {
  NftFactory,
  NftCreateData,
  Router,
  balance,
  approve,
  ZERO_ADDRESS,
  Datatoken,
  Config,
  amountToUnits,
  getEventFromTx
} from '../../src'
import { DatatokenCreateParams, FreCreationParams, Operation } from '../../src/@types'

describe('Router unit test', () => {
  let factoryOwner: Signer
  let user1: Signer
  let user2: Signer
  let addresses: any
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
  const AMOUNTS_IN = ethers.utils.parseUnits('1')
  const AMOUNTS_OUT = ethers.utils.parseUnits('0.1')
  const MAX_PRICE = ethers.utils.parseUnits('10')
  const SWAP_MARKET_FEE = ethers.utils.parseUnits('0.1')
  let NFT_DATA: NftCreateData
  let ERC_PARAMS: DatatokenCreateParams

  before(async () => {
    factoryOwner = (await provider.getSigner(0)) as Signer
    user1 = (await provider.getSigner(1)) as Signer
    user2 = (await provider.getSigner(2)) as Signer
    config = await getTestConfig(factoryOwner as Signer)
    addresses = await getAddresses()

    NFT_DATA = {
      name: NFT_NAME,
      symbol: NFT_SYMBOL,
      templateIndex: 1,
      tokenURI: NFT_TOKEN_URI,
      transferable: true,
      owner: await factoryOwner.getAddress()
    }

    ERC_PARAMS = {
      templateIndex: 1,
      minter: await factoryOwner.getAddress(),
      paymentCollector: await user2.getAddress(),
      mpFeeAddress: await factoryOwner.getAddress(),
      feeToken: ZERO_ADDRESS,
      cap: CAP_AMOUNT,
      feeAmount: FEE_ZERO,
      name: DATATOKEN_NAME,
      symbol: DATATOKEN_SYMBOL
    }
  })

  it('should deploy contracts', async () => {
    await approve(
      factoryOwner,
      config,
      await factoryOwner.getAddress(),
      addresses.MockDAI,
      addresses.ERC721Factory,
      await amountToUnits(factoryOwner, addresses.MockDAI, '100000', 18)
    )
  })

  it('should initiate Router instance', async () => {
    router = new Router(addresses.Router, user1)
  })

  it('#getOwner - should return actual owner', async () => {
    const owner = await router.getOwner()
    assert(owner === (await factoryOwner.getAddress()))
  })

  it('#getNFTFactory - should return NFT Factory address', async () => {
    const factory = await router.getNFTFactory()
    assert(factory === addresses.ERC721Factory)
  })

  it('#isOceanTokens - should return true if in oceanTokens list', async () => {
    expect(await router.isApprovedToken(addresses.Ocean)).to.equal(true)
    expect(await router.isApprovedToken(addresses.MockDAI)).to.equal(false)
  })

  it('#isFixedPrice - should return true if in fixedPrice list', async () => {
    expect(await router.isFixedPrice(addresses.FixedPrice)).to.equal(true)
    expect(await router.isFixedPrice(addresses.MockDAI)).to.equal(false)
  })

  it('#buyDatatokenBatch - should buy multiple DT in one call', async () => {
    // APPROVE DAI
    const daiContract = new Datatoken(factoryOwner)
    await daiContract.transfer(addresses.MockDAI, await user1.getAddress(), DAI_AMOUNT)

    await approve(
      user1,
      config,
      await user1.getAddress(),
      addresses.MockDAI,
      addresses.Router,
      DAI_AMOUNT
    )

    // CREATE A FIRST FRE
    const freParams: FreCreationParams = {
      fixedRateAddress: addresses.FixedPrice,
      baseTokenAddress: addresses.MockDAI,
      owner: await factoryOwner.getAddress(),
      marketFeeCollector: await user2.getAddress(),
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: RATE,
      marketFee: FEE,
      allowedConsumer: ZERO_ADDRESS,
      withMint: true
    }

    const nftFactory = new NftFactory(addresses.ERC721Factory, factoryOwner)
    const tx = await nftFactory.createNftWithDatatokenWithFixedRate(
      NFT_DATA,
      ERC_PARAMS,
      freParams
    )
    const trxReceipt = await tx.wait()
    // events have been emitted
    const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
    const TokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')
    const NewFixedRateEvent = getEventFromTx(trxReceipt, 'NewFixedRate')

    expect(nftCreatedEvent.event === 'NFTCreated')
    const datatokenAddress = TokenCreatedEvent.args.newTokenAddress

    const fre1 = NewFixedRateEvent.args.exchangeContract

    const freId1 = NewFixedRateEvent.args.exchangeId

    const datatoken = new Datatoken(factoryOwner)
    await datatoken.mint(
      datatokenAddress,
      await factoryOwner.getAddress(),
      '1000',
      await factoryOwner.getAddress()
    )
    await approve(
      factoryOwner,
      config,
      await factoryOwner.getAddress(),
      datatokenAddress,
      addresses.FixedPrice,
      DATATOKEN_AMMOUNT
    )

    // CREATE A SECOND FRE

    const tx2 = await nftFactory.createNftWithDatatokenWithFixedRate(
      NFT_DATA,
      ERC_PARAMS,
      freParams
    )
    const trxReceipt2 = await tx2.wait()
    // events have been emitted
    const TokenCreatedEvent2 = getEventFromTx(trxReceipt2, 'TokenCreated')
    const NewFixedRateEvent2 = getEventFromTx(trxReceipt2, 'NewFixedRate')

    const datatoken2Address = TokenCreatedEvent2.args.newTokenAddress

    const fre2 = NewFixedRateEvent2.args.exchangeContract

    const freId2 = NewFixedRateEvent2.args.exchangeId

    await datatoken.mint(
      datatoken2Address,
      await factoryOwner.getAddress(),
      '1000',
      await factoryOwner.getAddress()
    )
    await approve(
      factoryOwner,
      config,
      await factoryOwner.getAddress(),
      datatoken2Address,
      addresses.FixedPrice,
      DATATOKEN_AMMOUNT
    )

    // user1 has no dt1
    expect(await balance(user1, datatokenAddress, await user1.getAddress())).to.equal(
      '0.0'
    )
    // user1 has no dt2
    expect(await balance(user1, datatoken2Address, await user1.getAddress())).to.equal(
      '0.0'
    )

    // we now can prepare the Operations objects
    // operation: 0 - swapExactAmountIn
    // 1 - swapExactAmountOut
    // 2 - FixedRateExchange
    // 3 - Dispenser
    const operations1: Operation = {
      exchangeIds: freId1, // used only for FixedRate or Dispenser, but needs to be filled even for pool
      source: fre1, // pool Address
      operation: 2, // swapExactAmountIn
      tokenIn: addresses.MockDAI,
      amountsIn: AMOUNTS_IN.toString(), // when swapExactAmountIn is EXACT amount IN
      tokenOut: datatokenAddress,
      amountsOut: AMOUNTS_OUT.toString(), // when swapExactAmountIn is MIN amount OUT
      maxPrice: MAX_PRICE.toString(), // max price (only for pools),
      swapMarketFee: SWAP_MARKET_FEE.toString(),
      marketFeeAddress: await factoryOwner.getAddress()
    }

    const operations2: Operation = {
      exchangeIds: freId2, // used only for FixedRate or Dispenser, but needs to be filled even for pool
      source: fre2, // pool Address
      operation: 2, // swapExactAmountIn
      tokenIn: addresses.MockDAI,
      amountsIn: AMOUNTS_IN.toString(), // when swapExactAmountIn is EXACT amount IN
      tokenOut: datatokenAddress,
      amountsOut: AMOUNTS_OUT.toString(), // when swapExactAmountIn is MIN amount OUT
      maxPrice: MAX_PRICE.toString(), // max price (only for pools),
      swapMarketFee: SWAP_MARKET_FEE.toString(),
      marketFeeAddress: await factoryOwner.getAddress()
    }

    await router.buyDatatokenBatch([operations1, operations2])

    // user1 got his dts
    expect(+(await balance(user1, datatokenAddress, await user1.getAddress()))).gt(0)
    expect(+(await balance(user1, datatoken2Address, await user1.getAddress()))).gt(0)
  })
})
