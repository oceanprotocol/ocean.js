import { assert, spy, use } from 'chai'
import spies from 'chai-spies'

import { SearchQuery, MetadataCache } from '../../../src/metadatacache/MetadataCache'
import { Ocean } from '../../../src/ocean/Ocean'
import config from '../config'
import { CredentialType, DDO } from '../../../src/lib'
import { responsify, getSearchResults } from '../helpers'
import { updateAllowCredentailDetail } from '../../../src/utils/AssetCredential'

use(spies)

describe('Assets', () => {
  let ocean: Ocean
  let metadataCache: MetadataCache

  beforeEach(async () => {
    ocean = await Ocean.getInstance(config)
    metadataCache = ocean.metadataCache // eslint-disable-line prefer-destructuring
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
          query_string: {
            query: 'Office'
          }
        },
        sort: {
          created: -1
        }
      } as SearchQuery

      spy.on(metadataCache.fetch, 'post', () => responsify(getSearchResults([new DDO()])))
      const assets = await ocean.assets.query(query)

      assert.typeOf(assets.results, 'array')
      assert.lengthOf(assets.results, 1)
      assert.isDefined(assets.results[0].findServiceById)
    })
  })

  describe('#search()', () => {
    it('should search for assets', async () => {
      const text = 'office'
      spy.on(metadataCache.fetch, 'post', () => responsify(getSearchResults([new DDO()])))
      const assets = await ocean.assets.search(text)

      assert.typeOf(assets.results, 'array')
      assert.lengthOf(assets.results, 1)
      assert.isDefined(assets.results[0].findServiceById)
    })
  })

  describe('#Credential()', () => {
    it('should add allow credential', () => {
      const credentialType = CredentialType.address
      const walletA = '0x12345'
      const walletB = '0x23456'
      const allowWalletAddressList = [walletA, walletB]
      const ddo = updateAllowCredentailDetail(
        new DDO(),
        credentialType,
        allowWalletAddressList
      )
      assert(ddo.credential.allow.length === 1)
    })
  })
})
