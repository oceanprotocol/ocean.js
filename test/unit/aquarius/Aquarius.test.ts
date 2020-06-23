import { assert, spy, use } from 'chai'
import spies from 'chai-spies'
import { Ocean } from '../../../src/ocean/Ocean'
import { Aquarius, SearchQuery } from '../../../src/aquarius/Aquarius'
import { DDO } from '../../../src/ddo/DDO'
import DID from '../../../src/ocean/DID'
import config from '../config'
import { LoggerInstance } from '../../../src/utils'

use(spies)

const reponsify = async (data) => ({
    ok: true,
    json: () => Promise.resolve(data)
})

describe('Aquarius', () => {
    let ocean: Ocean
    let aquarius: Aquarius
    /* eslint-disable @typescript-eslint/camelcase */
    const getResults = (
        results: DDO[],
        page = 0,
        total_pages = 1,
        total_results = 1
    ) => ({
        results,
        page,
        total_pages,
        total_results
    })
    /* eslint-enable @typescript-eslint/camelcase */

    beforeEach(async () => {
        ocean = await Ocean.getInstance(config)
        aquarius = ocean.aquarius // eslint-disable-line prefer-destructuring
    })

    afterEach(() => {
        spy.restore()
    })

    describe('#queryMetadata()', () => {
        const query = {
            offset: 100,
            page: 1,
            query: {
                value: 1
            },
            sort: {
                value: 1
            },
            text: 'Office'
        } as SearchQuery

        it('should query metadata', async () => {
            spy.on(aquarius.fetch, 'post', () => reponsify(getResults([new DDO()])))

            const result = await aquarius.queryMetadata(query)
            assert.typeOf(result.results, 'array')
            assert.lengthOf(result.results, 1)
            assert.equal(result.page, 0)
            assert.equal(result.totalPages, 1)
            assert.equal(result.totalResults, 1)
        })

        it('should query metadata and return real ddo', async () => {
            spy.on(aquarius.fetch, 'post', () => reponsify(getResults([new DDO()])))

            const result = await aquarius.queryMetadata(query)
            assert.typeOf(result.results, 'array')
            assert.lengthOf(result.results, 1)
            assert.isDefined(result.results[0].findServiceById)
        })
    })

    describe('#queryMetadataByText()', () => {
        const query = {
            offset: 100,
            page: 1,
            query: {
                value: 1
            },
            sort: {
                value: 1
            },
            text: 'Office'
        } as SearchQuery

        it('should query metadata by text', async () => {
            spy.on(aquarius.fetch, 'get', () => reponsify(getResults([new DDO()])))

            const result = await aquarius.queryMetadataByText(query)
            assert.typeOf(result.results, 'array')
            assert.lengthOf(result.results, 1)
            assert.equal(result.page, 0)
            assert.equal(result.totalPages, 1)
            assert.equal(result.totalResults, 1)
        })

        it('should query metadata by text with a new instance', async () => {
            const aquariusNew = new Aquarius(config.aquariusUri, LoggerInstance)
            spy.on(aquariusNew.fetch, 'get', () => reponsify(getResults([new DDO()])))

            const result = await aquariusNew.queryMetadataByText(query)
            assert.typeOf(result.results, 'array')
            assert.lengthOf(result.results, 1)
            assert.equal(result.page, 0)
            assert.equal(result.totalPages, 1)
            assert.equal(result.totalResults, 1)
        })

        it('should query metadata and return real ddo', async () => {
            spy.on(aquarius.fetch, 'get', () => reponsify(getResults([new DDO()])))

            const result = await aquarius.queryMetadataByText(query)
            assert.typeOf(result.results, 'array')
            assert.lengthOf(result.results, 1)
            assert.isDefined(result.results[0].findServiceById)
        })
    })

    describe('#storeDDO()', () => {
        it('should store a ddo', async () => {
            const did: DID = DID.generate()
            const ddo: DDO = new DDO({
                id: did.getId()
            })

            spy.on(aquarius.fetch, 'post', () => reponsify(ddo))

            const result: DDO = await aquarius.storeDDO(ddo)
            assert(result)
            assert(result.id === ddo.id)
        })
    })

    describe('#retrieveDDO()', () => {
        it('should store a ddo', async () => {
            const did: DID = DID.generate()
            const ddo: DDO = new DDO({
                id: did.getId()
            })

            spy.on(aquarius.fetch, 'post', () => reponsify(ddo))
            spy.on(aquarius.fetch, 'get', () => reponsify(ddo))

            const storageResult: DDO = await aquarius.storeDDO(ddo)
            assert(storageResult)

            assert(storageResult.id === did.getId())

            const restrieveResult: DDO = await aquarius.retrieveDDO(did)
            assert(restrieveResult)

            assert(restrieveResult.id === did.getId())
            assert(restrieveResult.id === storageResult.id)
        })
    })
})
