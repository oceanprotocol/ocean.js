import { assert } from 'chai'
import Web3Provider from '../../../src/datatokens/Web3Provider'
import Account from '../../../src/ocean/Account'
import { Ocean } from '../../../src/ocean/Ocean'
import config from '../config'
import { TestContractHandler } from '../../TestContractHandler'

let ocean: Ocean
let accounts: Account[]

describe('Account', () => {
  before(async () => {
    // await TestContractHandler.prepareContracts()
    // ocean = await Ocean.getInstance(config)
    // accounts = await ocean.accounts.list()
  })

  describe('#getOceanBalance()', () => {
    it('should get initial ocean balance', async () => {
      // const balance = await accounts[8].getOceanBalance()
      // assert.equal(0, balance, `Expected 0 got ${balance}`)
    })

    it('should get the correct balance', async () => {
      // const amount = 100
      // const account: Account = accounts[0]
      // const initialBalance = await account.getOceanBalance()
      // await account.requestTokens(amount)
      // const balance = await account.getOceanBalance()
      // assert.equal(balance, initialBalance + amount)
    })
  })

  describe('#getEthBalance()', () => {
    it('should get initial ether balance', async () => {
      // const account: Account = accounts[9]
      // const balance = await account.getEtherBalance()
      // const web3 = Web3Provider.getWeb3()
      // assert(
      //     Number(web3.utils.toWei('100', 'ether')) === balance,
      //     `ether did not match ${balance}`
      // )
    })
  })

  describe('#getBalance()', () => {
    it('should get initial balance', async () => {
      // const account: Account = accounts[9]
      // const balance = await account.getBalance()
      // const web3 = Web3Provider.getWeb3()
      // assert(
      //     Number(web3.utils.toWei('100', 'ether')) === balance.eth,
      //     `ether did not match ${balance.eth}`
      // )
      // assert(balance.ocn === 0, `tokens did not match ${balance.ocn}`)
    })
  })

  describe('#requestTokens()', () => {
    it('should return the amount of tokens granted', async () => {
      // const tokens = '500'
      // const account: Account = accounts[0]
      // const tokensGranted: string = await account.requestTokens(tokens)
      // assert.equal(tokensGranted, tokens)
    })
  })
})
