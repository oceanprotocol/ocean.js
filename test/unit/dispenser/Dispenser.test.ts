import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../TestContractHandler'
import { DispenserContractHandler } from '../../DispenserContractHandler'
import { DataTokens } from '../../../src/datatokens/Datatokens'
import { LoggerInstance } from '../../../src/utils'
import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
import { OceanDispenser } from '../../../src/dispenser/Dispenser'

import DispenserContract = require('@oceanprotocol/contracts/artifacts/Dispenser.json')
const web3 = new Web3('http://127.0.0.1:8545')

describe('Dispenser flow', () => {
  let DispenserAddress: string
  let DispenserClass
  let bob: string
  let alice: string
  let charlie: string
  let datatoken: DataTokens
  let tokenAddress: string
  let tokenAddress2: string
  let tokenAddress3: string

  let owner: string
  let contracts: TestContractHandler

  const consoleDebug = false
  const tokenAmount = '1000'
  const blob = 'http://localhost:8030/api/v1/services/consume'

  before(async () => {
    // deploy SFactory
    const Contracts = new DispenserContractHandler(
      DispenserContract.abi as AbiItem[],
      DispenserContract.bytecode,
      web3
    )
    await Contracts.getAccounts()
    owner = Contracts.accounts[0]

    await Contracts.deployContracts()
    DispenserAddress = Contracts.contractAddress
    assert(DispenserAddress !== null)

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
    charlie = contracts.accounts[3]
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

  it('should create some datatoken2', async () => {
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
    tokenAddress2 = await datatoken.create(
      blob,
      alice,
      '1000000000000000',
      'AliceDT2',
      'DTA2'
    )
    assert(tokenAddress2 !== null)
    tokenAddress3 = await datatoken.create(
      blob,
      alice,
      '1000000000000000',
      'AliceDT3',
      'DTA3'
    )
    assert(tokenAddress3 !== null)
  })

  it('should initialize Dispenser class', async () => {
    DispenserClass = new OceanDispenser(
      web3,
      LoggerInstance,
      DispenserAddress,
      DispenserContract.abi as AbiItem[],
      datatoken
    )
    assert(DispenserClass !== null)
  })

  it('Alice mints 1000 tokens', async () => {
    const txid = await datatoken.mint(tokenAddress, alice, tokenAmount)
    if (consoleDebug) console.log(txid)
    assert(txid !== null)
  })

  it('Alice creates a dispenser', async () => {
    const tx = await DispenserClass.activate(tokenAddress, '1', '1', alice)
    assert(tx, 'Cannot activate dispenser')
  })

  it('Alice should make the dispenser a minter', async () => {
    const tx = await DispenserClass.makeMinter(tokenAddress, alice)
    assert(tx, 'Cannot make dispenser a minter')
  })

  it('Alice gets the dispenser status', async () => {
    const status = await DispenserClass.status(tokenAddress)
    assert(status.active === true, 'Dispenser not active')
    assert(status.owner === alice, 'Dispenser owner is not alice')
    assert(status.minterApproved === true, 'Dispenser is not a minter')
  })

  it('Alice should fail to get the dispenser status for an unknown token', async () => {
    const status = await DispenserClass.status(tokenAddress3)
    assert(
      status.owner === '0x0000000000000000000000000000000000000000',
      'Owner of inexistent dispenser should be 0'
    )
  })

  it('Alice should fail to get the dispenser status for zero address', async () => {
    const status = await DispenserClass.status(0x0000000000000000000000000000000000000000)
    assert(status === null)
  })

  it('Bob requests more datatokens then allowed', async () => {
    const check = await DispenserClass.isDispensable(tokenAddress, bob, '10')
    assert(check === false, 'isDispensable should return false')
    const tx = await DispenserClass.dispense(tokenAddress, bob, '10')
    assert(tx === null, 'Request should fail')
  })

  it('Bob requests datatokens', async () => {
    const check = await DispenserClass.isDispensable(tokenAddress, bob, '1')
    assert(check === true, 'isDispensable should return true')
    const tx = await DispenserClass.dispense(tokenAddress, bob, '1')
    assert(tx, 'Bob failed to get 1DT')
  })

  it('Bob requests more datatokens but he exceeds maxBalance', async () => {
    const check = await DispenserClass.isDispensable(tokenAddress, bob, '10')
    assert(check === false, 'isDispensable should return false')
    const tx = await DispenserClass.dispense(tokenAddress, bob, '10')
    assert(tx === null, 'Request should fail')
  })

  it('Alice deactivates the dispenser', async () => {
    const tx = await DispenserClass.deactivate(tokenAddress, alice)
    assert(tx, 'Cannot deactivate dispenser')
    const status = await DispenserClass.status(tokenAddress)
    assert(status.active === false, 'Dispenser is still active')
  })

  it('Charlie should fail to get datatokens', async () => {
    const check = await DispenserClass.isDispensable(tokenAddress, charlie, '1')
    assert(check === false, 'isDispensable should return false')
    const tx = await DispenserClass.dispense(tokenAddress, charlie, '1')
    assert(tx === null, 'Charlie should fail to get 1DT')
  })

  it('Alice calls removeMinter role and checks if she is the new minter', async () => {
    const tx = await DispenserClass.cancelMinter(tokenAddress, alice)
    assert(tx, 'Cannot cancel minter role')
    const status = await DispenserClass.status(tokenAddress)
    assert(status.minterApproved === false, 'Dispenser is still a minter')
    assert(status.owner === alice, 'Dispenser is not owned by Alice')
    const isMinter = await datatoken.isMinter(tokenAddress, alice)
    assert(isMinter === true, 'ALice is not the minter')
  })

  it('Bob should fail to activate a dispenser for a token for he is not a minter', async () => {
    const tx = await DispenserClass.activate(tokenAddress, '1', '1', bob)
    assert(tx === null, 'Bob should fail to activate dispenser')
  })

  it('Alice creates a dispenser without minter role', async () => {
    const tx = await DispenserClass.activate(tokenAddress2, '1', '1', alice)
    assert(tx, 'Cannot activate dispenser')
  })
  it('Bob requests datatokens but there are none', async () => {
    const check = await DispenserClass.isDispensable(tokenAddress2, bob, '1')
    assert(check === false, 'isDispensable should return false')
    const tx = await DispenserClass.dispense(tokenAddress2, bob, '1')
    assert(tx === null, 'Request should fail')
  })
  it('Alice mints tokens and transfer them to the dispenser.', async () => {
    const mintTx = await datatoken.mint(
      tokenAddress2,
      alice,
      '10',
      DispenserClass.dispenserAddress
    )
    assert(mintTx, 'Alice cannot mint tokens')
    const status = await DispenserClass.status(tokenAddress2)
    assert(status.balance > 0, 'Balances do not match')
  })

  it('Bob requests datatokens', async () => {
    const check = await DispenserClass.isDispensable(tokenAddress2, bob, '1')
    assert(check === true, 'isDispensable should return true')
    const tx = await DispenserClass.dispense(tokenAddress2, bob, '1')
    assert(tx, 'Bob failed to get 1DT')
  })

  it('Bob tries to withdraw all datatokens', async () => {
    const tx = await DispenserClass.ownerWithdraw(tokenAddress2, bob)
    assert(tx === null, 'Request should fail')
  })

  it('Alice withdraws all datatokens', async () => {
    const tx = await DispenserClass.ownerWithdraw(tokenAddress2, alice)
    assert(tx, 'Alice failed to withdraw all her tokens')
    const status = await DispenserClass.status(tokenAddress2)
    assert(status.balance === '0', 'Balance > 0')
  })
})
