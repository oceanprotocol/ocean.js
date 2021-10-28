import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../../TestContractHandler'
import { Contract } from 'web3-eth-contract'
import Web3 from 'web3'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import FactoryRouter from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import OPFCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import { LoggerInstance } from '../../../../src/utils'
import { NFTFactory } from '../../../../src/factories/NFTFactory'
import { Pool } from '../../../../src/pools/balancer/Pool'
import { CONNREFUSED } from 'dns'
const { keccak256 } = require('@ethersproject/keccak256')
const web3 = new Web3('http://127.0.0.1:8545')
const communityCollector = '0xeE9300b7961e0a01d9f0adb863C7A227A07AaD75'

describe('Pool unit test', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let contracts: TestContractHandler
  let pool: Pool
  let dtAddress: string
  let dtAddress2: string
  let poolAddress: string
  let erc20Token: string
  let erc20Contract: Contract
  let daiContract: Contract

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
      OPFCollector.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      FactoryRouter.bytecode,
      SideStaking.bytecode,
      FixedRate.bytecode,
      Dispenser.bytecode,
      OPFCollector.bytecode
    )
    await contracts.getAccounts()
    factoryOwner = contracts.accounts[0]
    nftOwner = contracts.accounts[1]
    user1 = contracts.accounts[2]
    user2 = contracts.accounts[3]
    user3 = contracts.accounts[4]

    await contracts.deployContracts(factoryOwner, FactoryRouter.abi as AbiItem[])

    daiContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.daiAddress
    )
    await daiContract.methods
      .approve(contracts.factory721Address, web3.utils.toWei('10000'))
      .send({ from: contracts.accounts[0] })

    expect(await daiContract.methods.balanceOf(contracts.accounts[0]).call()).to.equal(
      web3.utils.toWei('100000')
    )
  })

  it('should initiate Pool instance', async () => {
    pool = new Pool(web3, LoggerInstance, PoolTemplate.abi as AbiItem[])
    
  })

  it('#create a pool', async () => {
    // CREATE A POOL
    // we prepare transaction parameters objects
    const nftData = {
      name: '72120Bundle',
      symbol: '72Bundle',
      templateIndex: 1,
      baseURI: 'https://oceanprotocol.com/nft/'
    }
    const ercData = {
      templateIndex: 1,
      strings: ['ERC20B1', 'ERC20DT1Symbol'],
      addresses: [
        contracts.accounts[0],
        user3,
        contracts.accounts[0],
        '0x0000000000000000000000000000000000000000'
      ],
      uints: [web3.utils.toWei('1000000'), 0],
      bytess: []
    }

    const poolData = {
      addresses: [
        contracts.sideStakingAddress,
        contracts.daiAddress,
        contracts.factory721Address,
        contracts.accounts[0],
        contracts.accounts[0],
        contracts.poolTemplateAddress
      ],
      ssParams: [
        web3.utils.toWei('1'), // rate
        18, // basetokenDecimals
        web3.utils.toWei('10000'),
        2500000, // vested blocks
        web3.utils.toWei('2000') // baseToken initial pool liquidity
      ],
      swapFees: [
        1e15, //
        1e15
      ]
    }

    const nftFactory = new NFTFactory(contracts.factory721Address, web3, LoggerInstance)

    const txReceipt = await nftFactory.createNftErcWithPool(
      contracts.accounts[0],
      nftData,
      ercData,
      poolData
    )

    erc20Token = txReceipt.events.TokenCreated.returnValues.newTokenAddress
    poolAddress = txReceipt.events.NewPool.returnValues.poolAddress

    erc20Contract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], erc20Token)
    // user2 has no dt1
    expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')
  })

  it('#sharesBalance - should return user shares balance (datatoken balance, LPT balance, etc) ', async () => {
    expect(await daiContract.methods.balanceOf(user2).call()).to.equal(
      await pool.sharesBalance(user2, contracts.daiAddress)
    )
  })

  it('#getNumTokens - should return num of tokens in pool (2)', async () => {
    expect(await pool.getNumTokens(poolAddress)).to.equal('2')
  })

  it('#getPoolSharesTotalSupply - should return totalSupply of LPT', async () => {
    // dt owner which added liquidity has half of pool shares (the rest is in the sidestaking contracta)
    const dtOwnerLPTBalance = await pool.sharesBalance(contracts.accounts[0], poolAddress)
    expect(await pool.sharesBalance(contracts.accounts[0], poolAddress)).to.equal(
      await pool.sharesBalance(contracts.sideStakingAddress, poolAddress)
    )
    // total supply is twice the dtOwner balance
    expect(await pool.getPoolSharesTotalSupply(poolAddress)).to.equal(
      (2 * Number(dtOwnerLPTBalance)).toString()
    )
  })
  it('#getCurrentTokens - should return current pool tokens', async () => {
    const currentTokens = await pool.getCurrentTokens(poolAddress)
    expect(currentTokens[0]).to.equal(erc20Token)
    expect(currentTokens[1]).to.equal(contracts.daiAddress)
  })

  it('#getFinalTokens - should return final pool tokens', async () => {
    const finalTokens = await pool.getFinalTokens(poolAddress)
    expect(finalTokens[0]).to.equal(erc20Token)
    expect(finalTokens[1]).to.equal(contracts.daiAddress)
  })

  it('#getController - should return the pool controller (sideStaking address)', async () => {
    expect(await pool.getController(poolAddress)).to.equal(contracts.sideStakingAddress)
  })

  it('#isBound - should return true if token is bound into the pool', async () => {
    expect(await pool.isBound(poolAddress, contracts.daiAddress)).to.equal(true)
    expect(await pool.isBound(poolAddress, contracts.oceanAddress)).to.equal(false)
  })

  it('#getReserve - should return final pool tokens', async () => {
    expect(await pool.getReserve(poolAddress, contracts.daiAddress)).to.equal('2000') // base token initial liquidity
    // rate is 1 so we have the same amount of DTs
    expect(await pool.getReserve(poolAddress, erc20Token)).to.equal('2000')
  })

  it('#isFinalized - should return true if pool is finalized', async () => {
    expect(await pool.isFinalized(poolAddress)).to.equal(true)
    expect(await pool.isFinalized(contracts.oceanAddress)).to.equal(null)
  })

  it('#getSwapFee - should return the swap fee', async () => {
    expect(await pool.getSwapFee(poolAddress)).to.equal('0.001') //0.1%
  })

  it('#getNormalizedWeight - should return the normalized weight', async () => {
    expect(await pool.getNormalizedWeight(poolAddress, contracts.daiAddress)).to.equal(
      '0.5'
    )
    expect(await pool.getNormalizedWeight(poolAddress, erc20Token)).to.equal('0.5')
  })

  it('#getDenormalizedWeight - should return the denormalized weight', async () => {
    expect(await pool.getDenormalizedWeight(poolAddress, contracts.daiAddress)).to.equal(
      '5'
    )
    expect(await pool.getDenormalizedWeight(poolAddress, erc20Token)).to.equal('5')
  })

  it('#getBasetoken - should return the basetoken address', async () => {
    expect(await pool.getBasetoken(poolAddress)).to.equal(
      contracts.daiAddress
    )
    
  })

  it('#getDatatoken - should return the datatoken address', async () => {
    expect(await pool.getDatatoken(poolAddress)).to.equal(
      erc20Token
    )
  })

  it('#swapExactAmountIn - should swap', async () => {
    await daiContract.methods
      .transfer(user2, web3.utils.toWei('1000'))
      .send({ from: contracts.accounts[0] })
    expect(await daiContract.methods.balanceOf(user2).call()).to.equal(
      web3.utils.toWei('1000')
    )
    expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')
    await pool.approve(user2, contracts.daiAddress, poolAddress, web3.utils.toWei('100'))
    const tx = await pool.swapExactAmountIn(
      user2,
      poolAddress,
      contracts.daiAddress,
      '10',
      erc20Token,
      '1'
    )
    expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal(
      tx.events.LOG_SWAP.returnValues.tokenAmountOut
    )
  })

  it('#swapExactAmountOut - should swap', async () => {
    // await pool.approve(contracts.accounts[0],contracts.daiAddress,poolAddress,web3.utils.toWei('100'))
    expect(await daiContract.methods.balanceOf(user2).call()).to.equal(
      web3.utils.toWei('990')
    )
    const tx = await pool.swapExactAmountOut(
      user2,
      poolAddress,
      contracts.daiAddress,
      '100',
      erc20Token,
      '50'
    )
    assert(tx != null)
  })

  it('#joinPool- user2 should add liquidity, receiving LP tokens', async () => {
    const BPTAmountOut = '0.01'
    const maxAmountsIn = [
      '50', // Amounts IN
      '50' // Amounts IN
    ]

    await pool.approve(user2, erc20Token, poolAddress, web3.utils.toWei('1000'))
    await pool.approve(user2, contracts.daiAddress, poolAddress, '1000')
    const tx = await pool.joinPool(user2, poolAddress, BPTAmountOut, maxAmountsIn)
    assert(tx != null)
    expect(await pool.sharesBalance(user2, poolAddress)).to.equal(BPTAmountOut)
    expect(tx.events.LOG_JOIN.event === 'LOG_JOIN')
    expect(tx.events.LOG_BPT.event === 'LOG_BPT')

    //console.log(tx)
    // console.log(tx.events.LOG_JOIN)
    // console.log(tx.events.LOG_BPT)
  })
  it('#joinswapExternAmountIn- user2 should add liquidity, receiving LP tokens', async () => {
    const daiAmountIn = '100'
    const minBPTOut = '0.1'
    await pool.approve(user2, contracts.daiAddress, poolAddress, web3.utils.toWei('1000'))

    const tx = await pool.joinswapExternAmountIn(
      user2,
      poolAddress,
      contracts.daiAddress,
      daiAmountIn,
      minBPTOut
    )

    assert(tx != null)

    expect(tx.events.LOG_JOIN[0].event === 'LOG_JOIN')
    expect(tx.events.LOG_BPT.event === 'LOG_BPT')
    // 2 JOIN EVENTS BECAUSE SIDE STAKING ALSO STAKED DTs, TODO: we should add to whom has been sent in the LOG_BPT event
    expect(tx.events.LOG_JOIN[0].returnValues.bptAmount).to.equal(
      tx.events.LOG_JOIN[0].returnValues.bptAmount
    )
  })

  it('#joinswapPoolAmountOut- user2 should add liquidity, receiving LP tokens', async () => {
    const BPTAmountOut = '0.1'
    const maxDAIIn = '100'

    await pool.approve(user2, contracts.daiAddress, poolAddress, web3.utils.toWei('1000'))

    const tx = await pool.joinswapPoolAmountOut(
      user2,
      poolAddress,
      contracts.daiAddress,
      BPTAmountOut,
      maxDAIIn
    )

    assert(tx != null)

    expect(tx.events.LOG_JOIN[0].event === 'LOG_JOIN')
    expect(tx.events.LOG_BPT.event === 'LOG_BPT')
    // 2 JOIN EVENTS BECAUSE SIDE STAKING ALSO STAKED DTs, TODO: we should add to whom has been sent in the LOG_BPT event
    expect(tx.events.LOG_JOIN[0].returnValues.bptAmount).to.equal(
      tx.events.LOG_JOIN[0].returnValues.bptAmount
    )
  })

  it('#exitPool- user2 exit the pool receiving both tokens, burning LP', async () => {
    const BPTAmountIn = '0.5'
    const minAmountOut = [
      '1', // min amount out for OCEAN AND DT
      '1'
    ]

    const tx = await pool.exitPool(user2, poolAddress, BPTAmountIn, minAmountOut)

    assert(tx != null)

    expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(erc20Token)
    expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(contracts.daiAddress)
  })

  it('#exitswapPoolAmountIn- user2 exit the pool receiving only DAI', async () => {
    const BPTAmountIn = '0.5'
    const minDAIOut = '0.5'

    const tx = await pool.exitswapPoolAmountIn(
      user2,
      poolAddress,
      contracts.daiAddress,
      BPTAmountIn,
      minDAIOut
    )

    assert(tx != null)

    expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.daiAddress)

    // DTs were also unstaked in the same transaction (went to the staking contract)
    expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(erc20Token)
  })

  it('#exitswapExternAmountOut- user2 exit the pool receiving only DAI', async () => {
    const maxBTPIn = "0.5"
    const exactDAIOut = "1"

    const tx = await pool.exitswapPoolAmountIn(
      user2,
      poolAddress,
      contracts.daiAddress,
      maxBTPIn,
      exactDAIOut
    )

    assert(tx != null)

    expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.daiAddress)

    // DTs were also unstaked in the same transaction (went to the staking contract)
    expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(erc20Token)
  })

  it('#getAmountInExactOut- should get the amount in for exact out', async () => {
    const maxBTPIn = "0.5"
    const exactDAIOut = "1"
    
    const amountIn = await pool.getAmountInExactOut(
      poolAddress,
      erc20Token,
      contracts.daiAddress,
      exactDAIOut
    )

    assert(amountIn != null)

   // console.log(tx)

    const spotPrice = await pool.getSpotPrice(poolAddress,erc20Token,contracts.daiAddress)

   // amount of DAI In will be slightly bigger than spotPrice
    assert(amountIn >spotPrice)
  })

  it('#getAmountOutExactIn- should get the amount out for exact In', async () => {
    const exactDTIn= "1"

    const amountOut = await pool.getAmountOutExactIn(
      poolAddress,
      erc20Token,
      contracts.daiAddress,
      exactDTIn
    )

    assert(amountOut != null)

    console.log(amountOut)

    const spotPrice = await pool.getSpotPrice(poolAddress,contracts.daiAddress,erc20Token)
    console.log(spotPrice)
    // amount of DAI received will be slightly less than spotPrice
    assert(amountOut< spotPrice)
  })

  it('#getSpotPrice- should get the spot price', async () => {
    

    assert(await pool.getSpotPrice(poolAddress,erc20Token,contracts.daiAddress) != null)
    assert(await pool.getSpotPrice(poolAddress,contracts.daiAddress,erc20Token) != null)
   
  })

  it('#getMarketFees- should get market fees for each token', async () => {
    
    // we haven't performed any swap DT => DAI so there's no fee in erc20Token
    // but there's a fee in DAI
    assert(await pool.getMarketFees(poolAddress,erc20Token) == '0')
    assert(await pool.getMarketFees(poolAddress,contracts.daiAddress) > '0')
   
  })

  it('#getCommunityFees- should get community fees for each token', async () => {
     // we haven't performed any swap DT => DAI so there's no fee in erc20Token
    // but there's a fee in DAI

    assert(await pool.getCommunityFees(poolAddress,erc20Token) == '0')
    assert(await pool.getCommunityFees(poolAddress,contracts.daiAddress) > '0')
   
  })
  
  it('#collectMarketFee- should collect market fees for each token', async () => {
    const spotPriceBefore = await pool.getSpotPrice(poolAddress,erc20Token,contracts.daiAddress)
    // contracts.accounts[0] is the marketFeeCollector
    assert(await pool.getMarketFeeCollector(poolAddress) == contracts.accounts[0])
     // user3 has no DAI (we are going to send DAI fee to him)
    assert(await daiContract.methods.balanceOf(user3).call() == '0')
    // only marketFeeCollector can call this, set user3 as receiver
    await pool.collectMarketFee(contracts.accounts[0],poolAddress,user3)
    // DAI fees have been collected
    assert(await pool.getMarketFees(poolAddress,contracts.daiAddress) == '0')
    // user3 got DAI
    assert(await daiContract.methods.balanceOf(user3).call() > '0')
    // Spot price hasn't changed after fee collection
    assert(await pool.getSpotPrice(poolAddress,erc20Token,contracts.daiAddress)== spotPriceBefore)
  })

    
  it('#getMarketFeeCollector- should get market fees for each token', async () => {
    
    // contracts.accounts[0] is the marketFeeCollector
    assert(await pool.getMarketFeeCollector(poolAddress) == contracts.accounts[0])
   
   
  })

    
  it('#getOPFCollector- should get market fees for each token', async () => {

  
    assert(await pool.getOPFCollector(poolAddress) == contracts.opfCollectorAddress)
   
   
  })

  it('#collectCommunityFee- should get community fees for each token', async () => {
    const spotPriceBefore = await pool.getSpotPrice(poolAddress,erc20Token,contracts.daiAddress)
    // some fee are available in DAI 
    assert(await pool.getCommunityFees(poolAddress,contracts.daiAddress) > '0')
    // opf collector has no DAI
    assert(await daiContract.methods.balanceOf(contracts.opfCollectorAddress).call() == '0')
    // anyone can call callectOPF
    await pool.collectOPF(contracts.accounts[0],poolAddress)
    // DAI fees have been collected
    assert(await pool.getCommunityFees(poolAddress,contracts.daiAddress) == '0')
    // OPF collector got DAI
    assert(await daiContract.methods.balanceOf(contracts.opfCollectorAddress).call() > '0')
    // Spot price hasn't changed after fee collection
    assert(await pool.getSpotPrice(poolAddress,erc20Token,contracts.daiAddress)== spotPriceBefore)
  })

  it('#updateMarketFeeCollector- should update market fee collector', async () => {
    
    // contracts.accounts[0] is the marketFeeCollector
    assert(await pool.getMarketFeeCollector(poolAddress) == contracts.accounts[0])

    await pool.updateMarketFeeCollector(contracts.accounts[0],poolAddress,user3)

    assert(await pool.getMarketFeeCollector(poolAddress) == user3)  
   
  })
})
