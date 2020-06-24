import { assert, spy, use } from 'chai'
import spies from 'chai-spies'

import { SearchQuery } from '../../../src/metadatastore/MetadataStore'
import { Ocean } from '../../../src/ocean/Ocean'
import config from '../config'

use(spies)

let ocean: Ocean

describe('Assets', () => {
    before(async () => {
        ocean = await Ocean.getInstance(config)
    })

    afterEach(() => {
        spy.restore()
    })

    describe('#query()', () => {
        it('should search for assets', async () => {
            const query: SearchQuery = {
                offset: 100,
                page: 1,
                query: {
                    text: 'Office'
                },
                sort: {
                    created: -1
                }
            } as SearchQuery

            const assets = await ocean.assets.query(query)

            assert(assets)
        })
    })

    describe('#search()', () => {
        it('should search for assets', async () => {
            const text = 'office'
            const assets = await ocean.assets.search(text)

            assert(assets)
        })
    })
})
