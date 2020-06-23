import { assert, expect, spy, use } from 'chai'
import spies from 'chai-spies'

import Account from '../../../src/ocean/Account'
import { Ocean } from '../../../src/ocean/Ocean'
import { OceanSecretStore } from '../../../src/ocean/OceanSecretStore'
import config from '../config'

use(spies)

describe('OceanSecretStore', () => {
    let oceanSecretStore: OceanSecretStore
    let accounts: Account[]

    let ocean: Ocean
    const did = 'a'.repeat(64)

    before(async () => {
        ocean = await Ocean.getInstance(config)
        oceanSecretStore = ocean.secretStore
        accounts = await ocean.accounts.list()
    })

    afterEach(() => {
        spy.restore()
    })

    describe('#encrypt()', () => {
        it('should encrypt a content', async () => {
            const secretStoreEncryptSpy = spy.on(
                ocean.brizo,
                'encrypt',
                () => 'encryptedResult'
            )

            const result = await oceanSecretStore.encrypt(did, 'test', accounts[0])

            expect(secretStoreEncryptSpy).to.have.been.called.with(did, 'test')

            assert.equal(result, 'encryptedResult', "Result doesn't match")
        })
    })
})
