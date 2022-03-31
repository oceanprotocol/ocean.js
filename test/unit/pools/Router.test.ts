import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { deployContracts, Addresses } from '../../TestContractHandler'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { web3 } from '../../config'
import { NftFactory, NftCreateData, balance } from '../../../src'
import { Router } from '../../../src/pools/Router'
import { Erc20CreateParams, PoolCreationParams, Operation } from '../../../src/@types'

const { keccak256 } = require('@ethersproject/keccak256')

describe('Router unit test', () => {
  let factoryOwner: string
  let user1: string
  let user2: string
  let contracts: Addresses
  let router: Router

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)

    const daiContract = new web3.eth.Contract(
      MockERC20.abi as AbiItem[],
      contracts.daiAddress
    )
    await daiContract.methods
      .approve(contracts.erc721FactoryAddress, web3.utils.toWei('10000'))
      .send({ from: factoryOwner })
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

    await daiContract.methods
      .transfer(user1, web3.utils.toWei('2'))
      .send({ from: factoryOwner })
    await daiContract.methods
      .approve(contracts.routerAddress, web3.utils.toWei('2'))
      .send({ from: user1 })

    // CREATE A FIRST POOL
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
      paymentCollector: user2,
      mpFeeAddress: factoryOwner,
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

    const nftFactory = new NftFactory(contracts.erc721FactoryAddress, web3)

    const txReceipt = await nftFactory.createNftErc20WithPool(
      factoryOwner,
      nftData,
      ercParams,
      poolParams
    )

    const erc20TokenAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
    const pool1 = txReceipt.events.NewPool.returnValues.poolAddress

    // CREATE A SECOND POOL

    const nftData2: NftCreateData = {
      name: '72120Bundle2',
      symbol: '72Bundle2',
      templateIndex: 1,
      tokenURI: 'https://oceanprotocol.com/nft2/'
    }

    const ercParams2: Erc20CreateParams = {
      templateIndex: 1,
      minter: factoryOwner,
      paymentCollector: user2,
      mpFeeAddress: factoryOwner,
      feeToken: '0x0000000000000000000000000000000000000000',
      cap: '1000000',
      feeAmount: '0',
      name: 'ERC20B12',
      symbol: 'ERC20DT1Symbol2'
    }

    const poolParams2: PoolCreationParams = {
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

    const txReceipt2 = await nftFactory.createNftErc20WithPool(
      factoryOwner,
      nftData2,
      ercParams2,
      poolParams2
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
