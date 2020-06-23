import { assert, spy, use } from 'chai'
import spies from 'chai-spies'

import config from '../config'
import Account from '../../../src/ocean/Account'
import { Ocean } from '../../../src/ocean/Ocean'
import { OceanAccounts } from '../../../src/ocean/OceanAccounts'

use(spies)

describe('OceanAccounts', () => {
    let oceanAccounts: OceanAccounts

    before(async () => {
        oceanAccounts = (await Ocean.getInstance(config)).accounts
    })

    afterEach(() => {
        spy.restore()
    })

    describe('#list()', () => {
        it('should return the list of accounts', async () => {
            const accounts = await oceanAccounts.list()

            accounts.map((account) => assert.instanceOf(account, Account))
        })
    })

    describe('#balance()', () => {
        it('should return the balance of an account', async () => {
            const [account] = await oceanAccounts.list()
            spy.on(account, 'getBalance', () => ({ eth: 1, ocn: 5 }))
            const balance = await oceanAccounts.balance(account)

            assert.deepEqual(balance, { eth: 1, ocn: 5 })
        })
    })

    describe('#requestTokens()', () => {
        it('should return the balance of an account', async () => {
            const [account] = await oceanAccounts.list()
            spy.on(account, 'requestTokens', () => 10)
            const success = await oceanAccounts.requestTokens(account, 10)

            assert.isTrue(success)
        })
    })
})
