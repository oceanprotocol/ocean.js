import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../TestContractHandler'
import { FixedPricedContractHandler } from '../../FixedPriceContractHandler'
import { DataTokens } from '../../../src/datatokens/Datatokens'
import {
  OceanFixedRateExchange,
  FixedPricedExchange
} from '../../../src/exchange/FixRateExchange'

import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'

import BigNumber from 'bignumber.js'
import FixedRateExchangeContract = require('@oceanprotocol/contracts/artifacts/FixedRateExchange.json')
const web3 = new Web3('http://127.0.0.1:8545')

describe('FixedRateExchange flow', () => {
  let oceanTokenAddress
  let FixedRateExchangeAddress
  let FixedRateClass
  let oceandatatoken
  let aliceExchangeId
  let bob
  let alice
  let datatoken
  let tokenAddress

  let alicePoolAddress
  let currentDtPrice
  let owner
  let contracts

  let consoleDebug: false
  let greatPool
  const tokenAmount = '777'
  const oceanAmount = '499'
  const transferAmount = '200'
  const blob = 'http://localhost:8030/api/v1/services/consume'
  describe('#test', () => {
    before(async () => {
      // deploy SFactory
      const Contracts = new FixedPricedContractHandler(
        FixedRateExchangeContract.abi as AbiItem[],
        FixedRateExchangeContract.bytecode,
        web3
      )
      await Contracts.getAccounts()
      owner = Contracts.accounts[0]

      await Contracts.deployContracts()
      FixedRateExchangeAddress = Contracts.contractAddress
      assert(FixedRateExchangeAddress !== null)

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
        web3
      )
      assert(datatoken !== null)
    })

    it('should create datatokens smart contract', async () => {
      tokenAddress = await datatoken.create(blob, alice)
      assert(tokenAddress !== null)
      console.log('data Token address:' + tokenAddress)
    })
    it('Create a dummy OceanToken', async () => {
      // Bob creates a Datatoken
      oceandatatoken = new DataTokens(
        contracts.factoryAddress,
        factory.abi as AbiItem[],
        datatokensTemplate.abi as AbiItem[],
        web3
      )
      oceanTokenAddress = await oceandatatoken.create(blob, bob)
      console.log('oceanTokenAddress:' + oceanTokenAddress)
    })

    it('should initialize FixedExchangeRate class', async () => {
      FixedRateClass = new OceanFixedRateExchange(
        web3,
        FixedRateExchangeAddress,
        FixedRateExchangeContract.abi,
        oceanTokenAddress
      )
      assert(FixedRateClass !== null)
    })

    it('Alice mints datatokens', async () => {
      const r = await datatoken.mint(tokenAddress, alice, tokenAmount)
    })
    it('Bob mints Ocean tokens', async () => {
      const r = await oceandatatoken.mint(oceanTokenAddress, bob, oceanAmount)
    })
    it('Alice should have 1000 tokens', async () => {
      const balance = await datatoken.balance(tokenAddress, alice)
      console.log(balance)
    })
    it('Bob should have 1000 ocean tokens', async () => {
      const balance = await oceandatatoken.balance(oceanTokenAddress, bob)
      console.log(balance)
    })
    it('Alice creates a new FixedRate Exchange with a rate of 0.5', async () => {
      aliceExchangeId = await FixedRateClass.create(tokenAddress, '0.2', alice)
      console.log(aliceExchangeId)
    })
    it('Alice allows Exchange to spend 1000 data tokens', async () => {
      const r = await datatoken.approve(tokenAddress, FixedRateExchangeAddress, '77', alice)
    })
    it('Bob allows Exchange to spend 1000 ocean tokens', async () => {
      const r = await oceandatatoken.approve(oceanTokenAddress, FixedRateExchangeAddress, '49', bob)
    })
    it('Alice should aproved speding datatokens', async () => {
      const balance = await datatoken.allowance(
        tokenAddress,
        alice,
        FixedRateExchangeAddress
      )
      console.log(balance)
    })
    it('Bob should aproved speding oceantokens', async () => {
      const balance = await oceandatatoken.allowance(
        oceanTokenAddress,
        bob,
        FixedRateExchangeAddress
      )
      console.log(balance)
    })
    it('Bob should get the exchange details', async () => {
      const exchangeDetails = await FixedRateClass.getExchange(aliceExchangeId)
      console.log(exchangeDetails)
    })
    it('Bob should swap 1 DataToken', async () => {
        const swapResult = await FixedRateClass.swap(aliceExchangeId, '10', bob)
        console.log('swap receipt status: ' + swapResult.status)
        console.log(await datatoken.balance(tokenAddress, alice))
        console.log(await datatoken.balance(tokenAddress, bob))
        console.log(await datatoken.allowance(tokenAddress, alice, FixedRateExchangeAddress))

        console.log(await datatoken.balance(oceanTokenAddress, bob))
        console.log(await datatoken.balance(oceanTokenAddress, alice))
        console.log(await datatoken.allowance(oceanTokenAddress, bob, FixedRateExchangeAddress))

    })
    /*
    it('Alice creates a new OceanPool pool', async () => {
      /// new pool with total DT = 45 , dt weight=90% with swap fee 2%
      alicePoolAddress = await Pool.createDTPool(alice, tokenAddress, 45, 9, '0.02')
    })
    it('Get pool information', async () => {
      const currentTokens = await Pool.getCurrentTokens(alice, alicePoolAddress)
      assert(currentTokens.length === 2)
      assert(currentTokens.includes(tokenAddress))
      assert(currentTokens.includes(oceanTokenAddress))
    })
    it('Get pool swap fee', async () => {
      const currentSwapFee = await Pool.getSwapFee(alice, alicePoolAddress)
      assert(currentSwapFee === '0.02')
    })
    it('Get dtPrice from the pool ', async () => {
      currentDtPrice = await Pool.getDTPrice(alice, alicePoolAddress)
      assert(currentDtPrice > 0)
    })
    it('Get dtToken pool reserve ', async () => {
      const currentDtReserve = await Pool.getDTReserve(alice, alicePoolAddress)
      assert(currentDtReserve > 0)
    })
    it('Get Ocean pool reserve ', async () => {
      const currentOceanReserve = await Pool.getOceanReserve(alice, alicePoolAddress)
      assert(currentOceanReserve > 0)
    })
    it('Get total supply of pool tokens', async () => {
      const totalSupply = await Pool.totalSupply(alicePoolAddress)
      assert(totalSupply > 0)
    })
    it('Get amount of Ocean needed to buy 1 dtToken', async () => {
      const requiredOcean = await Pool.getOceanNeeded(alice, alicePoolAddress, '1')
      assert(requiredOcean > 0)
    })

    it('Bob should search for pools with this DT', async () => {
      const pools = await Pool.searchPoolforDT(bob, tokenAddress)
      assert(pools.length > 0)
      greatPool = pools[0]
    })
    it('Bob should buy a DT ', async () => {
      const maxPrice = parseFloat(currentDtPrice) * 2
      await Pool.buyDT(bob, greatPool, '1', '2', String(maxPrice))
      const bobDtBalance = await datatoken.balance(tokenAddress, bob)
      const bobOceanBalance = await datatoken.balance(oceanTokenAddress, bob)
      assert(bobDtBalance > 0)
      assert(bobOceanBalance > 0)
    })
    it('Bob should add DT liquidity to pool ', async () => {
      const currentDtReserve = await Pool.getDTReserve(bob, greatPool)
      if (consoleDebug) console.log('currentDtReserve:' + currentDtReserve)
      const bobDtBalance = await datatoken.balance(tokenAddress, bob)
      if (consoleDebug) console.log('BOB DT Balance:' + bobDtBalance)
      await Pool.addDTLiquidity(bob, greatPool, bobDtBalance)

      const newbobDtBalance = await datatoken.balance(tokenAddress, bob)

      const newDtReserve = await Pool.getDTReserve(bob, greatPool)

      const sharesBalance = await Pool.sharesBalance(bob, greatPool)
      if (consoleDebug) console.log('newDtReserve:' + newDtReserve)
      if (consoleDebug) console.log('newbobDtBalance:' + newbobDtBalance)
      if (consoleDebug) console.log('sharesBalance:' + sharesBalance)
      assert(parseFloat(newbobDtBalance) < parseFloat(bobDtBalance))
      assert(parseFloat(newDtReserve) > parseFloat(currentDtReserve))
      assert(parseFloat(sharesBalance) > 0)
    })

    it('Bob should remove DT liquidity from pool ', async () => {
      const currentDtReserve = await Pool.getDTReserve(bob, greatPool)
      if (consoleDebug) console.log('currentDtReserve:' + currentDtReserve)
      const bobDtBalance = await datatoken.balance(tokenAddress, bob)
      if (consoleDebug) console.log('bobDtBalance:' + bobDtBalance)
      const poolShares = await Pool.sharesBalance(bob, greatPool)
      if (consoleDebug) console.log('poolShares:' + poolShares)
      await Pool.removeDTLiquidity(bob, greatPool, '0.75', poolShares)

      const newDtReserve = await Pool.getDTReserve(bob, greatPool)
      if (consoleDebug) console.log('newDtReserve:' + newDtReserve)
      const newbobDtBalance = await datatoken.balance(tokenAddress, bob)
      if (consoleDebug) console.log('newbobDtBalance:' + newbobDtBalance)
      const newpoolShares = await Pool.sharesBalance(bob, greatPool)
      if (consoleDebug) console.log('newpoolShares:' + newpoolShares)
      assert(parseFloat(newDtReserve) < parseFloat(currentDtReserve))
      assert(parseFloat(bobDtBalance) < parseFloat(newbobDtBalance))
      assert(parseFloat(poolShares) > parseFloat(newpoolShares))
    })

    it('Bob should add Ocean liquidity to pool ', async () => {
      const currentDtReserve = await Pool.getOceanReserve(bob, greatPool)
      const bobDtBalance = await datatoken.balance(oceanTokenAddress, bob)
      if (consoleDebug) console.log('currentDtReserve:' + currentDtReserve)
      if (consoleDebug) console.log('bobDtBalance:' + bobDtBalance)

      await Pool.addOceanLiquidity(bob, greatPool, '1')

      const newbobDtBalance = await datatoken.balance(oceanTokenAddress, bob)

      const newDtReserve = await Pool.getOceanReserve(bob, greatPool)

      const sharesBalance = await Pool.sharesBalance(bob, greatPool)
      if (consoleDebug) console.log('newDtReserve:' + newDtReserve)
      if (consoleDebug) console.log('newbobDtBalance:' + newbobDtBalance)
      if (consoleDebug) console.log('sharesBalance:' + sharesBalance)
      assert(parseFloat(newbobDtBalance) < parseFloat(bobDtBalance))
      assert(parseFloat(newDtReserve) > parseFloat(currentDtReserve))
      assert(parseFloat(sharesBalance) > 0)
    })

    it('Bob should remove Ocean liquidity from pool ', async () => {
      const currentDtReserve = await Pool.getOceanReserve(bob, greatPool)
      const bobDtBalance = await datatoken.balance(oceanTokenAddress, bob)

      const poolShares = await Pool.sharesBalance(bob, greatPool)
      if (consoleDebug) console.log('currentDtReserve:' + currentDtReserve)
      if (consoleDebug) console.log('bobDtBalance:' + bobDtBalance)
      if (consoleDebug) console.log('poolShares:' + poolShares)

      await Pool.removeOceanLiquidity(bob, greatPool, '0.75', poolShares)

      const newDtReserve = await Pool.getOceanReserve(bob, greatPool)
      const newbobDtBalance = await datatoken.balance(oceanTokenAddress, bob)
      const newpoolShares = await Pool.sharesBalance(bob, greatPool)

      if (consoleDebug) console.log('newDtReserve:' + newDtReserve)
      if (consoleDebug) console.log('newbobDtBalance:' + newbobDtBalance)
      if (consoleDebug) console.log('newpoolShares:' + newpoolShares)
      assert(parseFloat(newDtReserve) < parseFloat(currentDtReserve))
      assert(parseFloat(bobDtBalance) < parseFloat(newbobDtBalance))
      assert(parseFloat(poolShares) > parseFloat(newpoolShares))
    })
    */
  })
})
