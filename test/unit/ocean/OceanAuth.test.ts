import { assert, expect, spy, use } from 'chai'
import spies from 'chai-spies'

import config from '../config'
import Account from '../../../src/ocean/Account'
import { Ocean } from '../../../src/ocean/Ocean'
import { OceanAuth } from '../../../src/ocean/OceanAuth'

use(spies)

describe('OceanAuth', () => {
    let oceanAuth: OceanAuth
    let account: Account

    before(async () => {
        // const ocean = await Ocean.getInstance(config)
        // oceanAuth = ocean.auth
        // account = (await ocean.accounts.list())[0]
    })

    afterEach(() => {
        spy.restore()
    })

    describe('#get()', () => {
        it('should return the token for a account', async () => {
            // const token = await oceanAuth.get(account)
            // assert.match(token, /^0x[a-f0-9]{130}-[0-9]{0,14}/i)
        })
    })

    // Not valid using providers without support for `personal_ecRecover`
    xdescribe('#check()', () => {
        it('should return the account of a signature', async () => {
            // const token = await oceanAuth.get(account)
            // const address = await oceanAuth.check(token)
            // assert.equal(address, account.getId())
        })

        it('should return empty address if the token is expired', async () => {
            // const token = [
            //     '0x0cfe59ce5c35461728b4126431096e4e021a842ca1f679532c537be5f895a3607e498',
            //     'f2cc22f787f9c7c8a967c346d717ef50ccb9f0af418d87a86dad899e6d61b-1234567890'
            // ].join('')
            // const address = await oceanAuth.check(token)
            // assert.equal(address, `0x${'0'.repeat(40)}`)
        })
    })

    describe('#store()', () => {
        it('should sign and store the token', async () => {
            // const writeTokenSpy = spy.on(oceanAuth as any, 'writeToken', () => null)
            // await oceanAuth.store(account)
            // expect(writeTokenSpy).to.has.been.called()
        })
    })

    describe('#restore()', () => {
        it('should return a stored token', async () => {
            // spy.on(oceanAuth as any, 'readToken', () => 'token')
            // spy.on(oceanAuth as any, 'check', () => account.getId())
            // const token = await oceanAuth.restore(account)
            // assert.equal(token, 'token')
        })

        it('should not return values if there is any error', async () => {
            // spy.on(oceanAuth as any, 'readToken', () => 'token')
            // spy.on(oceanAuth as any, 'check', () => '0x...')
            // const token = await oceanAuth.restore(account)
            // assert.isUndefined(token)
        })
    })

    describe('#isStored()', () => {
        it('should know if the token is stored', async () => {
            // spy.on(oceanAuth as any, 'restore', () => account.getId())
            // const isStored = await oceanAuth.isStored(account)
            // assert.isTrue(isStored)
        })

        it('should know if the token is not stored', async () => {
            // spy.on(oceanAuth as any, 'restore', () => undefined)
            // const isStored = await oceanAuth.isStored(account)
            // assert.isFalse(isStored)
        })
    })
})
