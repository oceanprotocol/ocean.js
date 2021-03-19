import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../TestContractHandler'
import { BalancerContractHandler } from '../../BalancerContractHandler'
import { DataTokens } from '../../../src/datatokens/Datatokens'
import { OceanPool } from '../../../src/balancer/OceanPool'

import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'

// this will be replaced by our SFactory/SPool
import OceanPoolFactory from '@oceanprotocol/contracts/artifacts/BFactory.json'
import OceanSPool from '@oceanprotocol/contracts/artifacts/BPool.json'
import { LoggerInstance } from '../../../src/utils'
import { Assets } from '../../../src/ocean/Assets'
const web3 = new Web3('http://127.0.0.1:8545')

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

describe('Balancer flow Manual Pool', () => {
  let oceanTokenAddress: string
  let OceanPoolFactoryAddress: string
  let Pool: OceanPool
  let oceandatatoken: DataTokens
  let alicePoolAddress: string
  let currentDtPrice: string
  let owner: string
  let bob: string
  let alice: string
  let contracts: TestContractHandler
  let datatoken: DataTokens
  let tokenAddress: string
  let consoleDebug: true
  let greatPool: string
  const tokenAmount = '1000'
  const transferAmount = '200'
  const blob = 'http://localhost:8030/api/v1/services/consume'

  before(async () => {
    // deploy SFactory
    const SContracts = new BalancerContractHandler(
      OceanPoolFactory.abi as AbiItem[],
      OceanPoolFactory.bytecode,
      OceanSPool.abi as AbiItem[],
      OceanSPool.bytecode,
      web3
    )
    await SContracts.getAccounts()
    owner = SContracts.accounts[0]

    await SContracts.SdeployContracts(owner)
    OceanPoolFactoryAddress = SContracts.factoryAddress
    assert(OceanPoolFactoryAddress !== null)

    // deploy DT Factory
    contracts = new TestContractHandler(
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      datatokensTemplate.bytecode,
      factory.bytecode,
      web3
    )
    await contracts.getAccounts()
    owner = contracts.accounts[0]
    alice = contracts.accounts[1]
    bob = contracts.accounts[2]
    await contracts.deployContracts(owner)

    // initialize DataTokens
    datatoken = new DataTokens(
      contracts.factoryAddress,
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      web3,
      LoggerInstance
    )
    assert(datatoken !== null)
  })

  it('should create datatokens smart contract', async () => {
    tokenAddress = await datatoken.create(blob, alice, '10000000000', 'AliceDT', 'DTA')
    assert(tokenAddress !== null)
  })
  it('Create a dummy OceanToken', async () => {
    // Alice creates a Datatoken
    oceandatatoken = new DataTokens(
      contracts.factoryAddress,
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      web3,
      LoggerInstance
    )
    oceanTokenAddress = await oceandatatoken.create(
      blob,
      alice,
      '10000000000',
      'AliceDT2',
      'DTA2'
    )
  })
  it('should initialize OceanPool class', async () => {
    Pool = new OceanPool(
      web3,
      LoggerInstance,
      OceanPoolFactory.abi as AbiItem[],
      OceanSPool.abi as AbiItem[],
      OceanPoolFactoryAddress,
      oceanTokenAddress,
      0
    )
    assert(Pool !== null)
  })

  it('Alice mints 2000 tokens', async () => {
    await datatoken.mint(tokenAddress, alice, tokenAmount)
  })
  it('Alice mints 2000 Ocean tokens', async () => {
    await oceandatatoken.mint(oceanTokenAddress, alice, tokenAmount)
  })
  it('Alice transfers 500 ocean token to Bob', async () => {
    await datatoken.transfer(oceanTokenAddress, bob, transferAmount, alice)
  })
  xit('Alice creates a new OceanPool pool', async () => {
    /// new pool with total DT = 45 , dt weight=90% with swap fee 2%
    const dtAmount = '45'
    const dtWeight = '9'
    const oceanAmount =
      (parseFloat(dtAmount) * (10 - parseFloat(dtWeight))) / parseFloat(dtWeight)
    const fee = '0.02'
    const createTx = await Pool.create(
      alice,
      tokenAddress,
      dtAmount,
      dtWeight,
      String(oceanAmount),
      fee
    )
    alicePoolAddress = createTx.events.BPoolRegistered.returnValues[0]
    const s = await Pool.getPoolSharesTotalSupply(alicePoolAddress)
    assert(String(s) === '100', 'totalSupply does not match: ' + s)
    const n = await Pool.getNumTokens(alicePoolAddress)
    assert(String(n) === '2', 'unexpected num tokens: ' + n)
  })
  it('Alice creates a new OceanPool pool manually', async () => {
    const createPool = await Pool.createPool(alice)
    alicePoolAddress = createPool.events.BPoolRegistered.returnValues[0]
  })
  it('Alice adds token to her Pool', async () => {
    /// new pool with total DT = 45 , dt weight=90% with swap fee 2%
    const dtAmount = '45'
    const dtWeight = '9'
    const oceanAmount =
      (parseFloat(dtAmount) * (10 - parseFloat(dtWeight))) / parseFloat(dtWeight)
    const oceanWeight = 10 - parseFloat(dtWeight)

    const oceanToken = {
      address: oceanTokenAddress,
      amount: String(oceanAmount),
      weight: String(oceanWeight)
    }
    // console.log(oceanToken.amount)
    const dtToken = {
      address: tokenAddress,
      amount: String(dtAmount),
      weight: String(dtWeight)
    }
    const tokens = []
    tokens.push(oceanToken, dtToken)

    await Pool.addToPool(alice, alicePoolAddress, tokens)
  })

  it('Get pool information', async () => {
    const currentTokens = await Pool.getCurrentTokens(alicePoolAddress)
    assert(currentTokens.length === 2)
    assert(currentTokens.includes(tokenAddress))
    assert(currentTokens.includes(oceanTokenAddress))
  })

  it('Alice sets swap fee', async () => {
    const fee = '0.02'
    await Pool.setSwapFee(alice, alicePoolAddress, fee)
  })

  it('Get pool swap fee', async () => {
    const currentSwapFee = await Pool.getSwapFee(alicePoolAddress)
    // console.log(currentSwapFee.toString())
    assert(currentSwapFee === '0.02')
  })

  it('Alice finalizes her pool', async () => {
    await Pool.finalize(alice, alicePoolAddress)
  })
  it('Verify that alice pool is finalized', async () => {
    const isFinalized = await Pool.isFinalized(alicePoolAddress)
    assert.equal(isFinalized, true)
  })

  it('Get Pool Controller', async () => {
    const controller = await Pool.getController(alicePoolAddress)
    assert.equal(controller, alice)
  })
  it('Set new Pool Controller and verify', async () => {
    await Pool.setController(alice, alicePoolAddress, bob)
    const controller = await Pool.getController(alicePoolAddress)

    assert.equal(controller, bob)
  })
  it('Verify OCEAN Token is bound', async () => {
    const oceanBound = await Pool.isBound(alicePoolAddress, oceanTokenAddress)
    assert.equal(oceanBound, true)
  })
  it('Verify DATA Token is bound', async () => {
    const dtBound = await Pool.isBound(alicePoolAddress, tokenAddress)
    assert.equal(dtBound, true)
  })

  it('Get OCEAN token Normalized Weight', async () => {
    const oceanNorm = await Pool.getNormalizedWeight(alicePoolAddress, oceanTokenAddress)
    // console.log(oceanNorm.toString())
    assert(Number(oceanNorm) > 0)
  })
  it('Get DT Normalized Weight', async () => {
    const dtNorm = await Pool.getNormalizedWeight(alicePoolAddress, tokenAddress)
    console.log(dtNorm.toString())
    assert(Number(dtNorm) > 0)
  })
  it('Alice calls JoinPool', async () => {
    const dtMaxAmount = '20'

    const oceanMaxAmount = '20'

    await Pool.approve(
      alice,
      tokenAddress,
      alicePoolAddress,
      web3.utils.toWei(dtMaxAmount)
    )
    await Pool.approve(
      alice,
      oceanTokenAddress,
      alicePoolAddress,
      web3.utils.toWei(oceanMaxAmount)
    )
    await Pool.joinPool(alice, alicePoolAddress, '1', [oceanMaxAmount, dtMaxAmount])

    const dtNorm = await Pool.getNormalizedWeight(alicePoolAddress, tokenAddress)
    // console.log(dtNorm.toString())
    assert(Number(dtNorm) === 0.9)
  })

  it('Alice calls joinswapPoolAmountOut', async () => {
    const oceanMaxAmount = '20'

    await Pool.approve(
      alice,
      oceanTokenAddress,
      alicePoolAddress,
      web3.utils.toWei(oceanMaxAmount)
    )
    await Pool.joinswapPoolAmountOut(
      alice,
      alicePoolAddress,
      oceanTokenAddress,
      '1',
      oceanMaxAmount
    )

    const dtNorm = await Pool.getNormalizedWeight(alicePoolAddress, tokenAddress)
    console.log(dtNorm.toString())
    assert(Number(dtNorm) === 0.9) // NormalizedWeight doesn't change.
  })

  it('Alice calls exitswapPoolAmountIn', async () => {
    // const dtMaxAmount = '20'

    const oceanMinAmount = '0.0002'

    await Pool.exitswapPoolAmountIn(
      alice,
      alicePoolAddress,
      oceanTokenAddress,
      '0.02',
      oceanMinAmount
    )

    const dtNorm = await Pool.getNormalizedWeight(alicePoolAddress, tokenAddress)
    console.log(dtNorm.toString())
    assert(Number(dtNorm) === 0.9) // NormalizedWeight doesn't change.
  })
  it('Get spot price for swapping', async () => {
    const spotPrice = await Pool.getSpotPrice(
      alicePoolAddress,
      tokenAddress,
      oceanTokenAddress
    )
    assert(Number(spotPrice) > 0)
  })

  it('Get spot price for swapping without fees', async () => {
    const spotPrice = await Pool.getSpotPriceSansFee(
      alicePoolAddress,
      tokenAddress,
      oceanTokenAddress
    )
    assert(Number(spotPrice) > 0)
  })

  it('Get dtPrice from the pool ', async () => {
    currentDtPrice = await Pool.getDTPrice(alicePoolAddress)
    assert(Number(currentDtPrice) > 0)
  })
  it('Get dtToken pool reserve ', async () => {
    const currentDtReserve = await Pool.getDTReserve(alicePoolAddress)
    assert(Number(currentDtReserve) > 0)
  })
  it('Get Ocean pool reserve ', async () => {
    const currentOceanReserve = await Pool.getOceanReserve(alicePoolAddress)
    assert(Number(currentOceanReserve) > 0)
  })
  it('Get total supply of pool tokens', async () => {
    const totalSupply = await Pool.getPoolSharesTotalSupply(alicePoolAddress)
    assert(Number(totalSupply) > 0)
  })
  it('Should fail to get amount of Ocean needed to buy more dtTokens than reserve', async () => {
    const requiredOcean = await Pool.getOceanNeeded(
      alicePoolAddress,
      await Pool.getDTReserve(alicePoolAddress)
    )
    assert(requiredOcean === '0')
  })
  it('Get amount of Ocean needed to buy 1 dtToken', async () => {
    const requiredOcean = await Pool.getOceanNeeded(alicePoolAddress, '1')
    assert(Number(requiredOcean) > 0)
  })
  it('Get amount of DT needed to buy 1 Ocean', async () => {
    const requiredOcean = await Pool.getDTNeeded(alicePoolAddress, '1')
    assert(Number(requiredOcean) > 0)
  })
  it('XGet max amount of DT that you can buy', async () => {
    const maxDT = await Pool.getDTMaxBuyQuantity(alicePoolAddress)
    console.log(maxDT.toString())
    assert(Number(maxDT) > 0)
  })
  it('XGet max amount of OCEAN that you can buy.', async () => {
    const maxOcean = await Pool.getOceanMaxBuyQuantity(alicePoolAddress)
    console.log(maxOcean.toString())
    assert(Number(maxOcean) > 0)
  })
  it('XGet how many Ocean Tokens are you going to receive for selling a specific dtAmount', async () => {
    const maxOcean = await Pool.getOceanReceived(alicePoolAddress, '1')
    console.log(maxOcean.toString())
    assert(Number(maxOcean) > 0)
  })
  it('XGet how many data token are you going to receive for selling a specific oceanAmount', async () => {
    const maxDT = await Pool.getDTReceived(alicePoolAddress, '1')
    console.log(maxDT.toString())
    assert(Number(maxDT) > 0)
  })
  it('XGet pool details', async () => {
    const poolDetails = await Pool.getPoolDetails(alicePoolAddress)

    assert(poolDetails.poolAddress, alicePoolAddress)
    assert(poolDetails.tokens[0], oceanTokenAddress)
    assert(poolDetails.tokens[1], tokenAddress)
  })

  it('X Get no of shares receved for adding ocean token to the pool', async () => {
    const shares = await Pool.calcPoolOutGivenSingleIn(
      alicePoolAddress,
      tokenAddress,
      '1'
    )
    console.log(shares.toString())
    assert(Number(shares) > 0)
  })
  it('X Get no of OCEAN tokens required to get a specific no of poolSh', async () => {
    const shares = await Pool.calcSingleInGivenPoolOut(
      alicePoolAddress,
      tokenAddress,
      '1'
    )
    console.log(shares.toString())
    assert(Number(shares) > 0)
  })

  it('Bob should search for pools with this DT', async () => {
    const pools = await Pool.searchPoolforDT(tokenAddress)
    assert(pools.length > 0)
    greatPool = pools[0]
  })
  it('Bob should buy 1 DT ', async () => {
    await Pool.buyDT(bob, greatPool, '1', '4')
    const bobDtBalance = await datatoken.balance(tokenAddress, bob)
    const bobOceanBalance = await datatoken.balance(oceanTokenAddress, bob)
    assert(Number(bobDtBalance) > 0)
    assert(Number(bobOceanBalance) > 0)
  })

  it('Bob should spend 2 Oceans to buy at least 0.1 DT ', async () => {
    await Pool.buyDTWithExactOcean(bob, greatPool, '0.1', '2')
    const bobDtBalance = await datatoken.balance(tokenAddress, bob)
    const bobOceanBalance = await datatoken.balance(oceanTokenAddress, bob)
    assert(Number(bobDtBalance) > 0)
    assert(Number(bobOceanBalance) > 0)
  })
  it('Bob should get slippage for buying some DT with 5 Ocean Tokens ', async () => {
    const slippage = await Pool.computeBuySlippage(greatPool, '5')
    assert(Number(slippage) > 0)
  })
  it('Bob should get slippage for selling 1 DT', async () => {
    const slippage = await Pool.computeSellSlippage(greatPool, '1')
    assert(Number(slippage) > 0)
  })
  it('Bob should sell 1 DT ', async () => {
    const bobDtBalance = await datatoken.balance(tokenAddress, bob)
    const bobOceanBalance = await datatoken.balance(oceanTokenAddress, bob)
    await Pool.sellDT(bob, greatPool, '1', '0.1')
    const newbobDtBalance = await datatoken.balance(tokenAddress, bob)
    const newbobOceanBalance = await datatoken.balance(oceanTokenAddress, bob)
    assert(Number(newbobDtBalance) < Number(bobDtBalance))
    assert(Number(newbobOceanBalance) > Number(bobOceanBalance))
  })
  it('Bob should get maximum DT liquidity that he can add to pool ', async () => {
    const maxDT = await Pool.getDTMaxAddLiquidity(greatPool)
    if (consoleDebug) console.error('maxDT:' + maxDT)
    assert(parseFloat(maxDT) > 0)
  })

  it('Bob should fail to add more than maximum DT liquidity that he can add to pool ', async () => {
    const maxDT = await Pool.getDTMaxAddLiquidity(greatPool)
    const tx = await Pool.addDTLiquidity(bob, greatPool, String(parseFloat(maxDT) * 2))
    assert(tx === null)
  })
  it('Bob should add DT liquidity to pool ', async () => {
    const maxDT = await Pool.getDTMaxAddLiquidity(greatPool)
    if (consoleDebug) console.error('maxDT:' + maxDT)
    const currentDtReserve = await Pool.getDTReserve(greatPool)
    if (consoleDebug) console.log('currentDtReserve:' + currentDtReserve)
    const bobDtBalance = await datatoken.balance(tokenAddress, bob)
    if (consoleDebug) console.log('BOB DT Balance:' + bobDtBalance)
    await Pool.addDTLiquidity(
      bob,
      greatPool,
      String(Math.min(parseFloat(maxDT), parseFloat(bobDtBalance) / 2))
    )

    const newbobDtBalance = await datatoken.balance(tokenAddress, bob)

    const newDtReserve = await Pool.getDTReserve(greatPool)

    const sharesBalance = await Pool.sharesBalance(bob, greatPool)
    if (consoleDebug) console.log('newDtReserve:' + newDtReserve)
    if (consoleDebug) console.log('newbobDtBalance:' + newbobDtBalance)
    if (consoleDebug) console.log('sharesBalance:' + sharesBalance)
    assert(parseFloat(newbobDtBalance) < parseFloat(bobDtBalance))
    assert(parseFloat(newDtReserve) > parseFloat(currentDtReserve))
    assert(parseFloat(sharesBalance) > 0)
  })
  it('Bob should get maximum DT liquidity that he can remove from pool ', async () => {
    const maxDT = await Pool.getDTMaxRemoveLiquidity(greatPool)
    if (consoleDebug) console.log('maxDT:' + maxDT)
    assert(parseFloat(maxDT) > 0)
  })
  it('Bob should know how many Pool Shares he needs to remove 1 DT ', async () => {
    const poolShares = await Pool.getPoolSharesRequiredToRemoveDT(greatPool, '1')
    if (consoleDebug) console.log('poolShares:' + poolShares)
    assert(parseFloat(poolShares) > 0)
  })
  it('Bob should know how many DT gets in exchange of his Pool Shares', async () => {
    const poolShares = await Pool.getDTRemovedforPoolShares(
      greatPool,
      await Pool.sharesBalance(bob, greatPool)
    )
    if (consoleDebug) console.log('poolShares:' + poolShares)
    assert(parseFloat(poolShares) > 0)
  })

  it('Bob should fail to remove more than maximum DT liquidity that he can remove from the pool ', async () => {
    const maxDT = await Pool.getDTMaxRemoveLiquidity(greatPool)
    if (consoleDebug) console.log('maxDT:' + maxDT)
    const poolShares = await Pool.sharesBalance(bob, greatPool)
    const tx = await Pool.removeDTLiquidity(
      bob,
      greatPool,
      String(parseFloat(maxDT) * 2),
      poolShares
    )
    assert(tx === null)
  })
  it('Bob should remove DT liquidity from pool ', async () => {
    const currentDtReserve = await Pool.getDTReserve(greatPool)
    if (consoleDebug) console.log('currentDtReserve:' + currentDtReserve)
    const bobDtBalance = await datatoken.balance(tokenAddress, bob)
    if (consoleDebug) console.log('bobDtBalance:' + bobDtBalance)
    const poolShares = await Pool.sharesBalance(bob, greatPool)
    if (consoleDebug) console.log('poolShares:' + poolShares)
    const maxDT = await Pool.getMaxRemoveLiquidity(greatPool, tokenAddress)
    if (consoleDebug) console.log('maxDT:' + maxDT)
    await Pool.removeDTLiquidity(
      bob,
      greatPool,
      String(Math.min(parseFloat(maxDT), parseFloat('0.1'))),
      poolShares
    )

    const newDtReserve = await Pool.getDTReserve(greatPool)
    if (consoleDebug) console.log('newDtReserve:' + newDtReserve)
    const newbobDtBalance = await datatoken.balance(tokenAddress, bob)
    if (consoleDebug) console.log('newbobDtBalance:' + newbobDtBalance)
    const newpoolShares = await Pool.sharesBalance(bob, greatPool)
    if (consoleDebug) console.log('newpoolShares:' + newpoolShares)
    assert(parseFloat(newDtReserve) < parseFloat(currentDtReserve))
    assert(parseFloat(bobDtBalance) < parseFloat(newbobDtBalance))
    assert(parseFloat(poolShares) > parseFloat(newpoolShares))
  })

  it('Bob should get maximum Ocean liquidity that he can add to pool ', async () => {
    const maxOcean = await Pool.getOceanMaxAddLiquidity(greatPool)
    assert(parseFloat(maxOcean) > 0)
  })

  it('Bob should fail to add more than maximum Ocean liquidity that he can add to pool ', async () => {
    const maxOcean = await Pool.getOceanMaxAddLiquidity(greatPool)
    const tx = await Pool.addOceanLiquidity(
      bob,
      greatPool,
      String(parseFloat(maxOcean) * 2)
    )
    assert(tx === null)
  })

  it('Bob should add Ocean liquidity to pool ', async () => {
    const currentDtReserve = await Pool.getOceanReserve(greatPool)
    const bobDtBalance = await datatoken.balance(oceanTokenAddress, bob)
    if (consoleDebug) console.log('currentDtReserve:' + currentDtReserve)
    if (consoleDebug) console.log('bobDtBalance:' + bobDtBalance)
    const maxOcean = await Pool.getOceanMaxAddLiquidity(greatPool)

    await Pool.addOceanLiquidity(
      bob,
      greatPool,
      String(Math.min(parseFloat(maxOcean), parseFloat(bobDtBalance)))
    )

    const newbobDtBalance = await datatoken.balance(oceanTokenAddress, bob)

    const newDtReserve = await Pool.getOceanReserve(greatPool)

    const sharesBalance = await Pool.sharesBalance(bob, greatPool)
    if (consoleDebug) console.log('newDtReserve:' + newDtReserve)
    if (consoleDebug) console.log('newbobDtBalance:' + newbobDtBalance)
    if (consoleDebug) console.log('sharesBalance:' + sharesBalance)
    assert(parseFloat(newbobDtBalance) < parseFloat(bobDtBalance))
    assert(parseFloat(newDtReserve) > parseFloat(currentDtReserve))
    assert(parseFloat(sharesBalance) > 0)
  })
  it('Bob should get maximum Ocean liquidity that he can remove from pool ', async () => {
    const maxOcean = await Pool.getMaxRemoveLiquidity(greatPool, oceanTokenAddress)
    assert(parseFloat(maxOcean) > 0)
  })
  it('Bob should fail to remove more than maximum Ocean liquidity that he can remove from the pool ', async () => {
    const maxOcean = await Pool.getOceanMaxRemoveLiquidity(greatPool)
    const poolShares = await Pool.sharesBalance(bob, greatPool)
    const tx = await Pool.removeOceanLiquidity(
      bob,
      greatPool,
      String(parseFloat(maxOcean) * 2),
      poolShares
    )
    assert(tx === null)
  })
  it('Bob should know how many Pool Shares he needs to remove 1 OCEAN ', async () => {
    const poolShares = await Pool.getPoolSharesRequiredToRemoveOcean(greatPool, '1')
    if (consoleDebug) console.log('poolShares:' + poolShares)
    assert(parseFloat(poolShares) > 0)
  })
  it('Bob should know how many OCEAN gets in exchange of his Pool Shares', async () => {
    const poolShares = await Pool.getOceanRemovedforPoolShares(
      greatPool,
      await Pool.sharesBalance(bob, greatPool)
    )
    if (consoleDebug) console.log('poolShares:' + poolShares)
    assert(parseFloat(poolShares) > 0)
  })
  it('Bob should remove Ocean liquidity from pool ', async () => {
    const currentDtReserve = await Pool.getOceanReserve(greatPool)
    const bobDtBalance = await datatoken.balance(oceanTokenAddress, bob)

    const poolShares = await Pool.sharesBalance(bob, greatPool)
    if (consoleDebug) console.log('currentDtReserve:' + currentDtReserve)
    if (consoleDebug) console.log('bobDtBalance:' + bobDtBalance)
    if (consoleDebug) console.log('poolShares:' + poolShares)

    await Pool.removeOceanLiquidity(bob, greatPool, '0.75', poolShares)

    const newDtReserve = await Pool.getOceanReserve(greatPool)
    const newbobDtBalance = await datatoken.balance(oceanTokenAddress, bob)
    const newpoolShares = await Pool.sharesBalance(bob, greatPool)

    if (consoleDebug) console.log('newDtReserve:' + newDtReserve)
    if (consoleDebug) console.log('newbobDtBalance:' + newbobDtBalance)
    if (consoleDebug) console.log('newpoolShares:' + newpoolShares)
    assert(parseFloat(newDtReserve) < parseFloat(currentDtReserve))
    assert(parseFloat(bobDtBalance) < parseFloat(newbobDtBalance))
    assert(parseFloat(poolShares) > parseFloat(newpoolShares))
  })
  it('Alice should know how many tokens she will get for removing all liquidity', async () => {
    const aliceShares = await Pool.sharesBalance(alice, greatPool)
    const amounts = await Pool.getTokensRemovedforPoolShares(greatPool, aliceShares)
    assert(parseFloat(amounts.dtAmount) > 0)
    assert(parseFloat(amounts.oceanAmount) > 0)
  })
  it('Alice should get all her shares for all the pools', async () => {
    const aliceShares = await Pool.getPoolSharesByAddress(alice)
    assert(aliceShares.length > 0)
  })

  it('Alice should remove all liquidity', async () => {
    const aliceShares = await Pool.sharesBalance(alice, greatPool)
    const aliceDtBalance = await datatoken.balance(tokenAddress, alice)
    const aliceOceanBalance = await datatoken.balance(oceanTokenAddress, alice)
    await Pool.removePoolLiquidity(alice, greatPool, aliceShares)
    const newAliceDtBalance = await datatoken.balance(tokenAddress, alice)
    const newAliceOceanBalance = await datatoken.balance(oceanTokenAddress, alice)
    const newAliceShares = await Pool.sharesBalance(alice, greatPool)
    assert(parseFloat(aliceDtBalance) < parseFloat(newAliceDtBalance))
    assert(parseFloat(aliceOceanBalance) < parseFloat(newAliceOceanBalance))
    assert(parseFloat(aliceShares) > parseFloat(newAliceShares))
  })
  it('Alice should get all the pools that she created', async () => {
    const alicePools = await Pool.getPoolsbyCreator(alice)
    assert(alicePools.length > 0)
  })

  it('Alice should get the logs for her pool', async () => {
    const poolLogs = await Pool.getPoolLogs(greatPool, null)
    assert(poolLogs.length > 0)
  })
  it('Bob should get the logs for all his activities', async () => {
    const poolLogs = await Pool.getAllPoolLogs(bob)
    assert(poolLogs.length > 0)
  })
})
