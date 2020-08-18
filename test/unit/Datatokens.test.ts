import { assert } from 'chai'
import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'

const Web3 = require('web3')
const factory = require('@oceanprotocol/contracts/artifacts/DTFactory.json')
const datatokensTemplate = require('@oceanprotocol/contracts/artifacts/DataTokenTemplate.json')

const web3 = new Web3('http://127.0.0.1:8545')

describe('DataTokens', () => {
  let minter
  let spender
  let balance
  let contracts
  let datatoken
  let tokenAddress
  const tokenAmount = 100
  const blob = 'https://example.com/dataset-1'

  describe('#test', () => {
    it('should deploy contracts', async () => {
      contracts = new TestContractHandler(
        factory.abi,
        datatokensTemplate.abi,
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
        factory.abi,
        datatokensTemplate.abi,
        web3
      )
      assert(datatoken !== null)
    })

    it('should create datatokens smart contract', async () => {
      tokenAddress = await datatoken.create(blob, minter)
      assert(tokenAddress !== null)
    })

    it('should mint datatokens', async () => {
      await datatoken.mint(tokenAddress, minter, tokenAmount)
      balance = await datatoken.balance(tokenAddress, minter)
      assert(balance.toString() === tokenAmount.toString())
    })

    it('should transfer datatokens', async () => {
      await datatoken.transfer(tokenAddress, spender, tokenAmount, minter)
      balance = await datatoken.balance(tokenAddress, spender)
      assert(balance.toString() === tokenAmount.toString())
    })

    it('should approve datatokens transfer', async () => {
      await datatoken.approve(tokenAddress, minter, tokenAmount, spender)
    })

    it('should transferFrom datatokens', async () => {
      await datatoken.transferFrom(tokenAddress, spender, tokenAmount, minter)
      balance = await datatoken.balance(tokenAddress, minter)
      assert(balance.toString() === tokenAmount.toString())
    })
  })
})
