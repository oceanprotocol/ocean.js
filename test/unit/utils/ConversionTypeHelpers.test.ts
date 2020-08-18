import { assert } from 'chai'
import {
  zeroX,
  noZeroX,
  didPrefixed,
  noDidPrefixed
} from '../../../src/utils/ConversionTypeHelpers'

describe('ConversionTypeHelpers', () => {
  describe('#zeroXTransformer()', () => {
    it("should return the input if it's not hex value", async () => {
      const result1 = zeroX('Test 1')
      const result2 = noZeroX('Test 2')
      assert.equal(result1, 'Test 1')
      assert.equal(result2, 'Test 2')
    })

    it('should return the value with 0x prefix', async () => {
      const result1 = zeroX('0x1234')
      const result2 = zeroX('1234')
      assert.equal(result1, '0x1234')
      assert.equal(result2, '0x1234')
    })

    it('should return the value without 0x prefix', async () => {
      const result1 = noZeroX('0x1234')
      const result2 = noZeroX('1234')
      assert.equal(result1, '1234')
      assert.equal(result2, '1234')
    })
  })

  describe('#didTransformer()', () => {
    const did = 'a'.repeat(64)

    it("should return the input if it's not valid", async () => {
      const result1 = didPrefixed('Test 1')
      const result2 = noDidPrefixed('Test 2')
      const result3 = noDidPrefixed('Test 3')
      assert.equal(result1, 'Test 1')
      assert.equal(result2, 'Test 2')
      assert.equal(result3, 'Test 3')
    })

    it('should return the value with did:op: prefix', async () => {
      const result1 = didPrefixed(`0x${did}`)
      const result2 = didPrefixed(did)
      const result3 = didPrefixed(`did:op:${did}`)
      assert.equal(result1, `did:op:${did}`)
      assert.equal(result2, `did:op:${did}`)
      assert.equal(result3, `did:op:${did}`)
    })

    it('should return the value without did:op: prefix', async () => {
      const result1 = noDidPrefixed(`0x${did}`)
      const result2 = noDidPrefixed(did)
      const result3 = noDidPrefixed(`did:op:${did}`)
      assert.equal(result1, did)
      assert.equal(result2, did)
      assert.equal(result3, did)
    })
  })
})
