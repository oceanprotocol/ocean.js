import { assert, spy, use } from 'chai'
import spies from 'chai-spies'
import { Ocean } from '../../../src/ocean/Ocean'
import { MetadataCache, SearchQuery } from '../../../src/metadatacache/MetadataCache'
import { DDO } from '../../../src/ddo/DDO'
import DID from '../../../src/ocean/DID'
import config from '../config'
import { LoggerInstance } from '../../../src/utils'
import { responsify, getSearchResults } from '../helpers'

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
      from: 0,
      size: 21,
      query: {
        query_string: {
          query: 'Office'
        }
      },
      sort: {
        created: 'asc'
      }
    } as SearchQuery

    it('should query metadata', async () => {
      const result = await metadataCache.queryMetadata(query)
      assert.typeOf(result.hits.hits, 'array')
      assert.isAtLeast(result.hits.hits.length, 1)
    })

    it('should query metadata with a new instance', async () => {
      const metadatastoreNew = new MetadataCache(config.metadataCacheUri, LoggerInstance)

      const result = await metadatastoreNew.queryMetadata(query)
      assert.typeOf(result.hits.hits, 'array')
      assert.isAtLeast(result.hits.hits.length, 1)
    })

    it('should query metadata and return real ddo', async () => {
      const result = await metadataCache.queryMetadata(query)
      assert.typeOf(result.hits.hits, 'array')
      assert.isAtLeast(result.hits.hits.length, 1)
      const ddo = DDO.deserialize(JSON.stringify(result.hits.hits[0]))
      assert.isDefined(ddo.findServiceById)
    })
  })
})
