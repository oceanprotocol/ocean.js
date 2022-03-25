import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../TestContractHandler'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import FactoryRouter from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import OPFCommunityFeeCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import { web3 } from '../../config'
import { NftFactory, NftCreateData } from '../../../src'
import { Router } from '../../../src/pools/Router'
import { Erc20CreateParams, PoolCreationParams, Operation } from '../../../src/@types'

const { keccak256 } = require('@ethersproject/keccak256')

describe('Router unit test', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let contracts: TestContractHandler
  let router: Router
  let dtAddress: string
  let dtAddress2: string
  let nftAddress: string

  it('should deploy contracts', async () => {
    contracts = new TestContractHandler(
      web3,
      ERC721Template.abi as AbiItem[],
      ERC20Template.abi as AbiItem[],
      PoolTemplate.abi as AbiItem[],
      ERC721Factory.abi as AbiItem[],
      FactoryRouter.abi as AbiItem[],
      SideStaking.abi as AbiItem[],
      FixedRate.abi as AbiItem[],
      Dispenser.abi as AbiItem[],
      OPFCommunityFeeCollector.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      FactoryRouter.bytecode,
      SideStaking.bytecode,
      FixedRate.bytecode,
      Dispenser.bytecode,
      OPFCommunityFeeCollector.bytecode
    )
    await contracts.getAccounts()
    factoryOwner = contracts.accounts[0]
    nftOwner = contracts.accounts[1]
    user1 = contracts.accounts[2]
    user2 = contracts.accounts[3]
    user3 = contracts.accounts[4]

    await contracts.deployContracts(factoryOwner, FactoryRouter.abi as AbiItem[])

    const daiContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.daiAddress
    )
    await daiContract.methods
      .approve(contracts.factory721Address, web3.utils.toWei('10000'))
      .send({ from: contracts.accounts[0] })
  })

  it('should initiate Router instance', async () => {
    router = new Router(contracts.routerAddress, web3)
  })

  it('#getOwner - should return actual owner', async () => {
    const owner = await router.getOwner()
    assert(owner === contracts.accounts[0])
  })

  it('#getNFTFactory - should return NFT Factory address', async () => {
    const factory = await router.getNFTFactory()
    assert(factory === contracts.factory721Address)
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
      contracts.MockERC20.options.jsonInterface,
      contracts.daiAddress
    )

    await daiContract.methods
      .transfer(user2, web3.utils.toWei('2'))
      .send({ from: contracts.accounts[0] })
    await daiContract.methods
      .approve(contracts.routerAddress, web3.utils.toWei('2'))
      .send({ from: user2 })

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
      minter: contracts.accounts[0],
      feeManager: user3,
      mpFeeAddress: contracts.accounts[0],
      feeToken: '0x0000000000000000000000000000000000000000',
      cap: '1000000',
      feeAmount: '0',
      name: 'ERC20B1',
      symbol: 'ERC20DT1Symbol'
    }

    const poolParams: PoolCreationParams = {
      ssContract: contracts.sideStakingAddress,
      baseTokenAddress: contracts.daiAddress,
      baseTokenSender: contracts.factory721Address,
      publisherAddress: contracts.accounts[0],
      marketFeeCollector: contracts.accounts[0],
      poolTemplateAddress: contracts.poolTemplateAddress,
      rate: '1',
      baseTokenDecimals: 18,
      vestingAmount: '10000',
      vestedBlocks: 2500000,
      initialBaseTokenLiquidity: '2000',
      swapFeeLiquidityProvider: '0.001',
      swapFeeMarketRunner: '0.001'
    }

    const nftFactory = new NftFactory(
      contracts.factory721Address,
      web3,
      ERC721Factory.abi as AbiItem[]
    )

    const txReceipt = await nftFactory.createNftErc20WithPool(
      contracts.accounts[0],
      nftData,
      ercParams,
      poolParams
    )

    const erc20Token = txReceipt.events.TokenCreated.returnValues.newTokenAddress
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
      minter: contracts.accounts[0],
      feeManager: user3,
      mpFeeAddress: contracts.accounts[0],
      feeToken: '0x0000000000000000000000000000000000000000',
      cap: '1000000',
      feeAmount: '0',
      name: 'ERC20B12',
      symbol: 'ERC20DT1Symbol2'
    }

    const poolParams2: PoolCreationParams = {
      ssContract: contracts.sideStakingAddress,
      baseTokenAddress: contracts.daiAddress,
      baseTokenSender: contracts.factory721Address,
      publisherAddress: contracts.accounts[0],
      marketFeeCollector: contracts.accounts[0],
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
      contracts.accounts[0],
      nftData2,
      ercParams2,
      poolParams2
    )

    const erc20Token2 = txReceipt2.events.TokenCreated.returnValues.newTokenAddress
    const pool2 = txReceipt2.events.NewPool.returnValues.poolAddress

    const erc20Contract = new web3.eth.Contract(
      ERC20Template.abi as AbiItem[],
      erc20Token
    )
    // user2 has no dt1
    expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')

    const erc20Contract2 = new web3.eth.Contract(
      ERC20Template.abi as AbiItem[],
      erc20Token2
    )
    // user2 has no dt2
    expect(await erc20Contract2.methods.balanceOf(user2).call()).to.equal('0')

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
      tokenOut: erc20Token,
      amountsOut: web3.utils.toWei('0.1'), // when swapExactAmountIn is MIN amount OUT
      maxPrice: web3.utils.toWei('10'), // max price (only for pools),
      swapMarketFee: web3.utils.toWei('0.1'),
      marketFeeAddress: contracts.accounts[0]
    }

    const operations2: Operation = {
      exchangeIds: keccak256('0x00'), // used only for FixedRate or Dispenser, but needs to be filled even for pool
      source: pool2, // pool Address
      operation: 0, // swapExactAmountIn
      tokenIn: contracts.daiAddress,
      amountsIn: web3.utils.toWei('1'), // when swapExactAmountIn is EXACT amount IN
      tokenOut: erc20Token2,
      amountsOut: web3.utils.toWei('0.1'), // when swapExactAmountIn is MIN amount OUT
      maxPrice: web3.utils.toWei('10'), // max price (only for pools)
      swapMarketFee: web3.utils.toWei('0.1'),
      marketFeeAddress: contracts.accounts[0]
    }

    await router.buyDTBatch(user2, [operations1, operations2])

    // user2 got his dts
    expect(parseInt(await erc20Contract.methods.balanceOf(user2).call())).gt(0)
    expect(parseInt(await erc20Contract2.methods.balanceOf(user2).call())).gt(0)
  })
})
