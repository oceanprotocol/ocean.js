import assert from 'assert'
import DID from '../../../src/ocean/DID'

const dataTokenMock = '0x0000000000000000000000000000000000000000'

describe('DID', () => {
  describe('#generate()', () => {
    it('should generate a new did', () => {
      const did: DID = DID.generate(dataTokenMock)
      assert(did)
    })
  })

  describe('#parse()', () => {
    it('should parse a valid did', () => {
      const did: DID = DID.parse(`did:op:${dataTokenMock}`)
      assert(did)
      assert(did.getDid())
    })

    it('should throw if prefix does not match', (done) => {
      try {
        const did: DID = DID.parse(`did:xxx:${dataTokenMock}`)
        assert(!did)
      } catch {
        done()
      }
    })

    it('should throw if id does not match', (done) => {
      const id = 'xyz'
      try {
        const did: DID = DID.parse(`did:op:${id}`)
        assert(!did)
      } catch {
        done()
      }
    })
  })

  describe('#getDid()', () => {
    it('should return the full did', () => {
      const did: DID = DID.generate(dataTokenMock)

      assert(did)
      assert(did.getDid().startsWith('did:op:'))
    })
  })
})
