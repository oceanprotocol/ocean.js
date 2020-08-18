import assert from 'assert'
import DID from '../../../src/ocean/DID'

describe('DID', () => {
  describe('#generate()', () => {
    it('should generate a new did', () => {
      const did: DID = DID.generate()
      assert(did)
    })
  })

  describe('#parse()', () => {
    it('should parse a valid did', () => {
      const id = 'a'.repeat(64)
      const did: DID = DID.parse(`did:op:${id}`)
      assert(did)

      assert(did.getId() === id, did.getId())
    })

    it('should throw if prefix does not match', (done) => {
      const id = '1234'
      try {
        const did: DID = DID.parse(`did:xxx:${id}`)
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
      const did: DID = DID.generate()
      assert(did)

      assert(did.getDid().startsWith('did:op:'))
    })
  })

  describe('#getDid()', () => {
    it('should return only the id part of the did', () => {
      const id = 'a'.repeat(64)
      const did: DID = DID.parse(`did:op:${id}`)
      assert(did)

      assert(did.getId() === id)
    })
  })
})
