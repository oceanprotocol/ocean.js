import { assert, spy, use } from 'chai'
import spies from 'chai-spies'
import { Ocean } from '../../../src/ocean/Ocean'
import { MetadataCache, SearchQuery } from '../../../src/metadatacache/MetadataCache'
import { DDO } from '../../../src/ddo/DDO'
import DID from '../../../src/ocean/DID'
import config from '../config'
import { LoggerInstance } from '../../../src/utils'
import { responsify, getSearchResults } from '../helpers'
import Web3 from 'web3'

use(spies)

describe('MetadataCache', () => {
  let ocean: Ocean
  let metadataCache: MetadataCache

  beforeEach(async () => {
    ocean = await Ocean.getInstance(config)
    metadataCache = ocean.metadataCache // eslint-disable-line prefer-destructuring
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
      spy.on(metadataCache.fetch, 'post', () => responsify(getSearchResults([new DDO()])))

      const result = await metadataCache.queryMetadata(query)
      assert.typeOf(result.results, 'array')
      assert.lengthOf(result.results, 1)
      assert.equal(result.page, 0)
      assert.equal(result.totalPages, 1)
      assert.equal(result.totalResults, 1)
    })

    it('should query metadata with a new instance', async () => {
      const metadatastoreNew = new MetadataCache(config.metadataCacheUri, LoggerInstance)
      spy.on(metadatastoreNew.fetch, 'post', () =>
        responsify(getSearchResults([new DDO()]))
      )

      const result = await metadatastoreNew.queryMetadata(query)
      assert.typeOf(result.results, 'array')
      assert.lengthOf(result.results, 1)
      assert.equal(result.page, 0)
      assert.equal(result.totalPages, 1)
      assert.equal(result.totalResults, 1)
    })

    it('should query metadata and return real ddo', async () => {
      spy.on(metadataCache.fetch, 'post', () => responsify(getSearchResults([new DDO()])))

      const result = await metadataCache.queryMetadata(query)
      assert.typeOf(result.results, 'array')
      assert.lengthOf(result.results, 1)
      assert.isDefined(result.results[0].findServiceById)
    })
  })

  describe('#storeDDO()', () => {
    it('should store a ddo', async () => {
      const did: DID = DID.generate('0x858048e3Ebdd3754e14F63d1185F8252eF142393')
      const ddo: DDO = new DDO({
        id: did.getId()
      })

      spy.on(metadataCache.fetch, 'post', () => responsify(ddo))

      const result: DDO = await metadataCache.storeDDO(ddo)
      assert(result)
      assert(result.id === ddo.id)
    })
  })

  describe('#retrieveDDO()', () => {
    it('should store a ddo', async () => {
      const did: DID = DID.generate('0x8248b0E583B9db96Ca3764EadF36e0024035Cc3A')
      const ddo: DDO = new DDO({
        id: did.getId()
      })

      spy.on(metadataCache.fetch, 'post', () => responsify(ddo))
      spy.on(metadataCache.fetch, 'get', () => responsify(ddo))

      const storageResult: DDO = await metadataCache.storeDDO(ddo)
      assert(storageResult)

      assert(storageResult.id === did.getId())

      const restrieveResult: DDO = await metadataCache.retrieveDDO(did)
      assert(restrieveResult)

      assert(restrieveResult.id === did.getId())
      assert(restrieveResult.id === storageResult.id)
    })
  })

  describe('#transferOwnership()', () => {})
})
