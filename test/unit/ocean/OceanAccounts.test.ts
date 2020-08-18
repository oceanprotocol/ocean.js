import { assert, spy, use } from 'chai'
import spies from 'chai-spies'

import config from '../config'
import Account from '../../../src/ocean/Account'
import { Ocean } from '../../../src/ocean/Ocean'
import { Accounts } from '../../../src/ocean/Accounts'

use(spies)

describe('OceanAccounts', () => {
  let oceanAccounts: Accounts

  before(async () => {
    oceanAccounts = (await Ocean.getInstance(config)).accounts
  })

  afterEach(() => {
    spy.restore()
  })

  describe('#list()', () => {
    it('should return the list of accounts', async () => {
      // const accounts = await oceanAccounts.list()
      // accounts.map((account) => assert.instanceOf(account, Account))
    })
  })

  describe('#balance()', () => {
    it('should return the balance of an account', async () => {
      // const [account] = await oceanAccounts.list()
      // spy.on(account, 'getBalance', () => ({ eth: 1, ocn: 5 }))
      // const balance = await oceanAccounts.balance(account)
      // assert.deepEqual(balance, {
      //     eth: 1,
      //     ocn: 5
      // })
    })
  })
})
