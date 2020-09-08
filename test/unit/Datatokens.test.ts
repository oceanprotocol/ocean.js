import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'

import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'

const web3 = new Web3('http://127.0.0.1:8545')

describe('DataTokens', () => {
  let minter: string
  let spender: string
  let balance: string
  let contracts: TestContractHandler
  let datatoken: DataTokens
  let tokenAddress: string
  const tokenAmount = '100'
  const blob = 'https://example.com/dataset-1'

  it('should deploy contracts', async () => {
    contracts = new TestContractHandler(
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      datatokensTemplate.bytecode,
      factory.bytecode,
      web3
    )
    await contracts.getAccounts()
    minter = contracts.accounts[0]
    spender = contracts.accounts[1]
    await contracts.deployContracts(minter)
  })

  it('should initialize datatokens class', async () => {
    datatoken = new DataTokens(
      contracts.factoryAddress,
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      web3
    )
    assert(datatoken !== null)
  })

  it('should create datatokens smart contract', async () => {
    tokenAddress = await datatoken.create(blob, minter, '10000000000', 'AliceDT', 'DTA')
    assert(tokenAddress !== null)
  })

  it('should create datatokens with fallback cap, name & symbol', async () => {
    tokenAddress = await datatoken.create(blob, minter)
    assert(tokenAddress !== null)

    const tokenName = await datatoken.getName(tokenAddress, minter)
    const tokenSymbol = await datatoken.getSymbol(tokenAddress, minter)
    assert(tokenName !== null || tokenName !== '')
    assert(tokenSymbol !== null || tokenSymbol !== '')
  })

  it('should mint datatokens', async () => {
    await datatoken.mint(tokenAddress, minter, tokenAmount)
    balance = await datatoken.balance(tokenAddress, minter)
    assert(balance === tokenAmount)
  })

  it('should transfer datatokens', async () => {
    await datatoken.transfer(tokenAddress, spender, tokenAmount, minter)
    balance = await datatoken.balance(tokenAddress, spender)
    assert(balance === tokenAmount)
  })

  it('should approve datatokens transfer', async () => {
    await datatoken.approve(tokenAddress, minter, tokenAmount, spender)
  })

  it('should transferFrom datatokens', async () => {
    await datatoken.transferFrom(tokenAddress, spender, tokenAmount, minter)
    balance = await datatoken.balance(tokenAddress, minter)
    assert(balance === tokenAmount)
  })
})
