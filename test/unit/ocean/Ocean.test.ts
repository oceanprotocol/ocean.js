import { assert, spy, use } from 'chai'
import spies from 'chai-spies'
import Account from '../../../src/ocean/Account'
import { Ocean } from '../../../src/ocean/Ocean'
import config from '../config'
import { TestContractHandler } from '../../TestContractHandler'

use(spies)

let ocean: Ocean

describe('Ocean', () => {
    before(async () => {
        // await TestContractHandler.prepareContracts()
        // ocean = await Ocean.getInstance(config)
    })

    beforeEach(async () => {
        // spy.on(ocean.utils.signature, 'signText', () => `0x${'a'.repeat(130)}`)
    })
    afterEach(() => {
        // spy.restore()
    })

    describe('#getInstance()', () => {
        it('should get an instance of Ocean', async () => {
            // const oceanInstance: Ocean = await Ocean.getInstance(config)
            // assert(oceanInstance)
        })
    })

    describe('#getAccounts()', () => {
        it('should list accounts', async () => {
            // const accs: Account[] = await ocean.accounts.list()
            // assert(accs.length === 10)
            // assert((await accs[5].getBalance()).ocn === 0)
            // assert(typeof accs[0].getId() === 'string')
        })
    })
})
