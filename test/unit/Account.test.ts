import { assert } from 'chai'
import Account from '../../src/ocean/Account'
import { Ocean } from '../../src/ocean/Ocean'

import Web3 from 'web3'
import { ConfigHelper } from '../../src/utils/ConfigHelper'

let account: Account
let ocean
const web3 = new Web3('http://127.0.0.1:8545')

describe('Account', () => {
  before(async () => {
    const config = new ConfigHelper().getConfig('development')
    config.web3Provider = web3
    ocean = await Ocean.getInstance(config)
    account = (await ocean.accounts.list())[0]
  })

  describe('#getOceanBalance()', () => {
    it('should get initial ocean balance', async () => {
      const balance = await account.getOceanBalance()
      assert.equal(0, Number(balance), `Expected 0, got ${balance}`)
    })
  })

  describe('#getEthBalance()', () => {
    it('should get initial ether balance', async () => {
      const balance = await account.getEtherBalance()

      console.log('ETH balance', balance.toString())
    })
  })
  describe('#setId()', () => {
    it('set new Id', async () => {
      account.setId('test')
      const newId = account.getId()
      assert.equal(newId, 'test')
    })
  })
  describe('#setPassword() and getPassword()', () => {
    it('set new Password', async () => {
      const oldPwd = account.getPassword()
      assert.equal(oldPwd, undefined)
      account.setPassword('test')
      const newPwd = account.getPassword()
      assert.equal(newPwd, 'test')
    })
  })
})
