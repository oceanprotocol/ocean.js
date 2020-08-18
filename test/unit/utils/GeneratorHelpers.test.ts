import { assert } from 'chai'
import { generateId } from '../../../src/utils/GeneratorHelpers'

describe('GeneratorHelpers', () => {
  describe('#generateId()', () => {
    it('should generate an ID', async () => {
      const id = generateId()
      assert(id)
    })

    it('should generate an ID that is 64 chars long', async () => {
      const id: string = generateId()
      assert.equal(id.length, 64)
    })

    it('should not contain -', async () => {
      const id: string = generateId()
      assert.match(id, /^[a-f0-9]+$/i)
    })

    it('should generate an ID that is 130 chars long', async () => {
      const id: string = generateId(130)
      assert.equal(id.length, 130)
    })
  })
})
