import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { deployContracts, Addresses } from '../../TestContractHandler'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { web3 } from '../../config'
import { NftFactory, NftCreateData, balance, approve, ZERO_ADDRESS } from '../../../src'
import { Router } from '../../../src/pools/Router'
import { Erc20CreateParams, PoolCreationParams, Operation } from '../../../src/@types'

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
  const ERC20_NAME = 'ERC20B1'
  const ERC20_SYMBOL = 'ERC20DT1Symbol'
  const RATE = '1'
  const FEE = '0.001'
  const FEE_ZERO = '0'
  const DAI_AMOUNT = web3.utils.toWei('2')

  const NFT_DATA: NftCreateData = {
    name: NFT_NAME,
    symbol: NFT_SYMBOL,
    templateIndex: 1,
    tokenURI: NFT_TOKEN_URI
  }

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)

    await approve(
      web3,
      factoryOwner,
      contracts.daiAddress,
      contracts.erc721FactoryAddress,
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
    assert(factory === contracts.erc721FactoryAddress)
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

  it('#buyDTBatch - should buy multiple DT in one call', async () => {
    // APPROVE DAI
    const daiContract = new web3.eth.Contract(
      MockERC20.abi as AbiItem[],
      contracts.daiAddress
    )

    await daiContract.methods.transfer(user1, DAI_AMOUNT).send({ from: factoryOwner })

    await approve(web3, user1, contracts.daiAddress, contracts.routerAddress, DAI_AMOUNT)

    // CREATE A FIRST POOL
    const ercParams: Erc20CreateParams = {
      templateIndex: 1,
      minter: factoryOwner,
      paymentCollector: user2,
      mpFeeAddress: factoryOwner,
      feeToken: ZERO_ADDRESS,
      cap: '0',
      feeAmount: FEE_ZERO,
      name: ERC20_NAME,
      symbol: ERC20_SYMBOL
    }

    const poolParams: PoolCreationParams = {
      ssContract: contracts.sideStakingAddress,
      baseTokenAddress: contracts.daiAddress,
      baseTokenSender: contracts.erc721FactoryAddress,
      publisherAddress: factoryOwner,
      marketFeeCollector: factoryOwner,
      poolTemplateAddress: contracts.poolTemplateAddress,
      rate: RATE,
      baseTokenDecimals: 18,
      vestingAmount: '10000',
      vestedBlocks: 2500000,
      initialBaseTokenLiquidity: '2000',
      swapFeeLiquidityProvider: FEE,
      swapFeeMarketRunner: FEE
    }

    const nftFactory = new NftFactory(contracts.erc721FactoryAddress, web3)
    const txReceipt = await nftFactory.createNftErc20WithPool(
      factoryOwner,
      NFT_DATA,
      ercParams,
      poolParams
    )

    const erc20TokenAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
    const pool1 = txReceipt.events.NewPool.returnValues.poolAddress

    // CREATE A SECOND POOL
    const txReceipt2 = await nftFactory.createNftErc20WithPool(
      factoryOwner,
      NFT_DATA,
      ercParams,
      poolParams
    )

    const erc20Token2Address = txReceipt2.events.TokenCreated.returnValues.newTokenAddress
    const pool2 = txReceipt2.events.NewPool.returnValues.poolAddress

    // user1 has no dt1
    expect(await balance(web3, erc20TokenAddress, user1)).to.equal('0')
    // user1 has no dt2
    expect(await balance(web3, erc20Token2Address, user1)).to.equal('0')

    // we now can prepare the Operations objects

    // operation: 0 - swapExactAmountIn
    // 1 - swapExactAmountOut
    // 2 - FixedRateExchange
    // 3 - Dispenser
    const operations1: Operation = {
      exchangeIds: keccak256('0x00'), // used only for FixedRate or Dispenser, but needs to be filled even for pool
      source: pool1, // pool Address
      operation: 0, // swapExactAmountIn
      tokenIn: contracts.daiAddress,
      amountsIn: web3.utils.toWei('1'), // when swapExactAmountIn is EXACT amount IN
      tokenOut: erc20TokenAddress,
      amountsOut: web3.utils.toWei('0.1'), // when swapExactAmountIn is MIN amount OUT
      maxPrice: web3.utils.toWei('10'), // max price (only for pools),
      swapMarketFee: web3.utils.toWei('0.1'),
      marketFeeAddress: factoryOwner
    }

    const operations2: Operation = {
      exchangeIds: keccak256('0x00'), // used only for FixedRate or Dispenser, but needs to be filled even for pool
      source: pool2, // pool Address
      operation: 0, // swapExactAmountIn
      tokenIn: contracts.daiAddress,
      amountsIn: web3.utils.toWei('1'), // when swapExactAmountIn is EXACT amount IN
      tokenOut: erc20Token2Address,
      amountsOut: web3.utils.toWei('0.1'), // when swapExactAmountIn is MIN amount OUT
      maxPrice: web3.utils.toWei('10'), // max price (only for pools)
      swapMarketFee: web3.utils.toWei('0.1'),
      marketFeeAddress: factoryOwner
    }

    await router.buyDTBatch(user1, [operations1, operations2])

    // user1 got his dts
    expect(+(await balance(web3, erc20TokenAddress, user1))).gt(0)
    expect(+(await balance(web3, erc20Token2Address, user1))).gt(0)
  })
})
