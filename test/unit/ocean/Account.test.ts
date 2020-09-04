import { assert } from 'chai'
import Account from '../../../src/ocean/Account'

let account: Account

describe('Account', () => {
  before(async () => {
    account = new Account()
  })

  describe('#getOceanBalance()', () => {
    // it('should get initial ocean balance', async () => {
    //   const balance = await account.getOceanBalance()
    //   assert.equal(0, Number(balance), `Expected 0, got ${balance}`)
    // })
  })

  describe('#getEthBalance()', () => {
    // it('should get initial ether balance', async () => {
    //   const balance = await account.getEtherBalance()
    //   // assert(balance === '100', `ether did not match ${balance}`)
    //   assert.equal(0, Number(balance), `Expected 0, got ${balance}`)
    // })
  })
})
