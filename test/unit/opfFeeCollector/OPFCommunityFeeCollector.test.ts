import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../TestContractHandler'
import { FeeCollectorContractHandler } from '../../FeeCollectorContractHandler'
import { DataTokens } from '../../../src/datatokens/Datatokens'
import { OPFCommunityFeeCollector } from '../../../src/opfFeeCollector/OPFCommunityFeeCollector'
import { LoggerInstance } from '../../../src/utils'
import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
import FeeCollectorContract = require('@oceanprotocol/contracts/artifacts/OPFCommunityFeeCollector.json')
const web3 = new Web3('http://127.0.0.1:8545')

describe('OPFCommunityFeeCollector flow', () => {
  let feeCollectorAddress: string
  let feeCollectorClass: OPFCommunityFeeCollector

  let alice: string
  let bob: string
  let collector: string
  let newCollector: string
  let datatoken: DataTokens
  let tokenAddress: string

  let owner: string
  let contracts: TestContractHandler

  const consoleDebug = false
  const tokenAmount = '1000'

  const blob = 'http://localhost:8030/api/v1/services/consume'

  before(async () => {
    // deploy SFactory
    const Contracts = new FeeCollectorContractHandler(
      FeeCollectorContract.abi as AbiItem[],
      FeeCollectorContract.bytecode,
      web3
    )
    await Contracts.getAccounts()
    owner = Contracts.accounts[0]

    await Contracts.deployContracts()
    feeCollectorAddress = Contracts.contractAddress
    assert(feeCollectorAddress !== null)

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
    collector = contracts.accounts[1]
    bob = contracts.accounts[2]
    alice = contracts.accounts[3]
    newCollector = contracts.accounts[4]
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

  it('should initialize OPFCommunityFeeCollector class', async () => {
    feeCollectorClass = new OPFCommunityFeeCollector(
      web3,
      LoggerInstance,
      feeCollectorAddress,
      FeeCollectorContract.abi as AbiItem[]
    )
    assert(feeCollectorClass !== null)
  })

  it('Alice mints 1000 tokens and send it to FeeCollector', async () => {
    const tokenTransferred = '500'
    let txid = await datatoken.mint(tokenAddress, alice, tokenAmount)
    if (consoleDebug) console.log(txid)
    assert(txid !== null)
    txid = await datatoken.transfer(
      tokenAddress,
      feeCollectorAddress,
      tokenTransferred,
      alice
    )
    assert(txid !== null)

    const balance = await datatoken.balance(tokenAddress, feeCollectorAddress)
    assert(balance === tokenTransferred)
  })
  it('Alice triggers withdrawToken()', async () => {
    const tokenTransferred = '500'
    let tokenBalance = await datatoken.balance(tokenAddress, feeCollectorAddress)
    console.log(
      tokenBalance,
      'Datatokens balance before withdrawing in feeCollectorAddress'
    )
    const txid = await feeCollectorClass.withdrawToken(tokenAddress, alice)
    if (consoleDebug) console.log(txid)
    assert(txid !== null)
    tokenBalance = await datatoken.balance(tokenAddress, feeCollectorAddress)

    assert(tokenBalance === '0')

    tokenBalance = await datatoken.balance(tokenAddress, collector)
    // console.log(tokenBalance)
    assert(tokenBalance === tokenTransferred)
  })
  it('Alice triggers withdrawETH()', async () => {
    await web3.eth.sendTransaction({
      to: feeCollectorAddress,
      from: alice,
      value: web3.utils.toWei('3')
    })
    const ethCollectorInitialBalance = await web3.eth.getBalance(collector)
    let ethBalance = await web3.eth.getBalance(feeCollectorAddress)
    console.log(ethBalance, 'eth balance in feeCollectorAddress')
    const txid = await feeCollectorClass.withdrawETH(alice)
    if (consoleDebug) console.log(txid)
    assert(txid !== null)
    ethBalance = await web3.eth.getBalance(feeCollectorAddress)
    // console.log(ethBalance, 'eth balance in feeCollectorAddress')
    const ethCollectorFinalBalance = await web3.eth.getBalance(collector)
    // console.log(ethBalance, 'eth balance in collector')
    assert(ethCollectorFinalBalance > ethCollectorInitialBalance)
  })

  it('Owner updates feeCollector', async () => {
    const txid = await feeCollectorClass.changeCollector(newCollector, owner)
    if (consoleDebug) console.log(txid)
    assert(txid !== null)
  })
  // review this, missing check after transaction failure
  it('Not Owner fails to update feeCollector', async () => {
    try {
      await feeCollectorClass.changeCollector(newCollector, alice)
    } catch (e) {
      console.log('Fails has expected')
    }
  })

  it('Alice should have 500 tokens', async () => {
    const balance = await datatoken.balance(tokenAddress, alice)
    if (consoleDebug) console.log("Alice's datatoke balance:" + balance)
    assert(balance === '500')
  })
  it('Alice transfer other 300 tokens to FeeCollector', async () => {
    const tokenTransferred = '300'
    const txid = await datatoken.transfer(
      tokenAddress,
      feeCollectorAddress,
      tokenTransferred,
      alice
    )
    assert(txid !== null)
    const balance = await datatoken.balance(tokenAddress, feeCollectorAddress)
    assert(balance === tokenTransferred)
  })

  it('Bob(random user) triggers withdrawToken() again, now with a newCollector', async () => {
    const tokenTransferred = '300'

    const txid = await feeCollectorClass.withdrawToken(tokenAddress, bob)
    if (consoleDebug) console.log(txid)
    assert(txid !== null)
    let tokenBalance = await datatoken.balance(tokenAddress, feeCollectorAddress)
    console.log(
      tokenBalance,
      'Datatokens balance after withdrawing in feeCollectorAddress'
    )

    assert(tokenBalance === '0')

    tokenBalance = await datatoken.balance(tokenAddress, newCollector)
    assert(tokenBalance === tokenTransferred)
  })
})
