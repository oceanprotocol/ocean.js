import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../TestContractHandler'
import { FixedPricedContractHandler } from '../../FixedPriceContractHandler'
import { DataTokens } from '../../../src/datatokens/Datatokens'
import { OceanFixedRateExchange } from '../../../src/exchange/FixedRateExchange'

import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'

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

  let owner
  let contracts

  const consoleDebug = false
  const tokenAmount = '1000000000000000000000000000000000'
  const fixedPriceRate = '0.5'
  const updatedPriceRate = '2'
  const swapAmount = '1'
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
      tokenAddress = await datatoken.create(
        blob,
        alice,
        '1000000000000000',
        'AliceDT',
        'DTA'
      )
      assert(tokenAddress !== null)
      if (consoleDebug) console.log("Alice's address:" + alice)
      if (consoleDebug) console.log('data Token address:' + tokenAddress)
    })
    it('Create a dummy OceanToken', async () => {
      // Bob creates a Datatoken
      oceandatatoken = new DataTokens(
        contracts.factoryAddress,
        factory.abi as AbiItem[],
        datatokensTemplate.abi as AbiItem[],
        web3
      )
      oceanTokenAddress = await oceandatatoken.create(
        blob,
        bob,
        '1000000000000000',
        'BobDT',
        'DTB'
      )
      if (consoleDebug) console.log("Bob's address:" + bob)
      if (consoleDebug) console.log('oceanTokenAddress:' + oceanTokenAddress)
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

    it('Alice mints 1000 tokens', async () => {
      const txid = await datatoken.mint(tokenAddress, alice, tokenAmount)
      if (consoleDebug) console.log(txid)
      assert(txid !== null)
    })
    it('Bob mints 1000 Ocean tokens', async () => {
      const txid = await oceandatatoken.mint(oceanTokenAddress, bob, tokenAmount)
      if (consoleDebug) console.log(txid)
      assert(txid !== null)
    })
    it('Alice should have 1000 tokens', async () => {
      const balance = await datatoken.balance(tokenAddress, alice)
      if (consoleDebug) console.log("Alice's datatoke balance:" + balance)
    })
    it('Bob should have 1000 ocean tokens', async () => {
      const balance = await oceandatatoken.balance(oceanTokenAddress, bob)
      if (consoleDebug) console.log("Bob's ocean balance:" + balance)
    })
    it('Alice allows Exchange to spend 1000 data tokens', async () => {
      const txid = await datatoken.approve(
        tokenAddress,
        FixedRateExchangeAddress,
        tokenAmount,
        alice
      )
      if (consoleDebug) console.log(txid)
    })
    it('Bob allows Exchange to spend 1000 ocean tokens', async () => {
      const txid = await oceandatatoken.approve(
        oceanTokenAddress,
        FixedRateExchangeAddress,
        tokenAmount,
        bob
      )
      if (consoleDebug) console.log(txid)
    })
    it('Alice should aproved speding datatokens', async () => {
      const balance = await datatoken.allowance(
        tokenAddress,
        alice,
        FixedRateExchangeAddress
      )
      if (consoleDebug) console.log('Alice datatoken allowance:' + balance)
    })
    it('Bob should aproved speding oceantokens', async () => {
      const balance = await oceandatatoken.allowance(
        oceanTokenAddress,
        bob,
        FixedRateExchangeAddress
      )
      if (consoleDebug) console.log('Bob ocean allowance:' + balance)
    })
    it('Alice creates a new FixedRate Exchange with a rate of 0.5', async () => {
      aliceExchangeId = await FixedRateClass.create(tokenAddress, fixedPriceRate, alice)
      if (consoleDebug) console.log('aliceExchangeId:' + aliceExchangeId)
    })
    it('Bob should find the exchange', async () => {
      const exchangeDetails = await FixedRateClass.searchforDT(tokenAddress, '0')
      assert(exchangeDetails[0].exchangeID === aliceExchangeId)
    })
    it('Bob should get the exchange details', async () => {
      const exchangeDetails = await FixedRateClass.getExchange(aliceExchangeId)
      if (consoleDebug) console.log(exchangeDetails)
    })

    it('Bob should get the amount of Ocean needed', async () => {
      const OceansNeeded = await FixedRateClass.CalcInGivenOut(
        aliceExchangeId,
        swapAmount
      )
      if (consoleDebug) console.log('Oceans needed:' + OceansNeeded)
      assert(OceansNeeded !== null)
    })
    it('Bob should swap 1 DataToken', async () => {
      const swapResult = await FixedRateClass.buyDT(aliceExchangeId, swapAmount, bob)
      if (consoleDebug) console.log(swapResult)
      assert(swapResult !== null)
    })
    it('Alice datatoken balance after swap', async () => {
      const balance = await datatoken.balance(tokenAddress, alice)
      if (consoleDebug) console.log('Alice datatoken balance:' + balance)
    })
    it('Alice ocean  balance after swap', async () => {
      const balance = await oceandatatoken.balance(oceanTokenAddress, alice)
      if (consoleDebug) console.log('Alice ocean balance:' + balance)
    })
    it('Bob datatoken balance after swap', async () => {
      const balance = await datatoken.balance(tokenAddress, bob)
      if (consoleDebug) console.log('Bob datatoken balance:' + balance)
    })
    it('Bob ocean  balance after swap', async () => {
      const balance = await oceandatatoken.balance(oceanTokenAddress, bob)
      if (consoleDebug) console.log('Bob ocean balance:' + balance)
    })
    it('Alice should update the rate', async () => {
      const tx = await FixedRateClass.setRate(aliceExchangeId, updatedPriceRate, alice)
      assert(tx !== null)
    })
    it('Alice should be able to deactivate the exchange', async () => {
      const tx = await FixedRateClass.deactivate(aliceExchangeId, alice)
      assert(tx !== null)
      const exchangeDetails = await FixedRateClass.getExchange(aliceExchangeId)
      assert(exchangeDetails.active === false)
    })
    it('Alice should be able to activate the exchange', async () => {
      const tx = await FixedRateClass.activate(aliceExchangeId, alice)
      assert(tx !== null)
      const exchangeDetails = await FixedRateClass.getExchange(aliceExchangeId)
      assert(exchangeDetails.active === true)
    })
  })
})
