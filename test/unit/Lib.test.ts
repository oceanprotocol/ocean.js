import assert from 'assert'
import * as lib from '../../src/lib'

describe('Lib', () => {
  describe('interface', () => {
    it('should expose Ocean', async () => {
      assert(lib.Ocean)
    })
  })
})
