import { expect } from 'chai'
import { c2dBucketFor, c2dCapabilityContent } from '../../src/utils/C2dCapability.js'

/**
 * Golden vectors for the compute-capability content string and its bucketing rule. A
 * cooperating implementation elsewhere derives the same content id from the same three
 * inputs — `free`, `resource`, `value` — so these tables are the contract between the two:
 * if either side ever disagrees with a row here, a search silently returns zero providers
 * instead of failing loudly, which is exactly why the bytes are pinned down explicitly
 * rather than left to be discovered by reading the other implementation's source.
 *
 * The tables are append-only. Adding a row for a resource that isn't covered yet is routine
 * — that's the whole point of an open, ungated resource string. Editing or removing an
 * existing row changes what bytes get hashed for everything already relying on it, which is
 * a breaking format change, not a routine update.
 */
describe('C2D capability format: golden vectors', () => {
  describe('serialization', () => {
    const vectors: Array<{
      free: boolean
      resource: string
      value: number
      expected: string
    }> = [
      {
        free: false,
        resource: 'cpu',
        value: 1,
        expected: '{"c2d":{"free":false,"cpu":1}}'
      },
      {
        free: false,
        resource: 'cpu',
        value: 4,
        expected: '{"c2d":{"free":false,"cpu":4}}'
      },
      {
        free: false,
        resource: 'disk',
        value: 1,
        expected: '{"c2d":{"free":false,"disk":1}}'
      },
      {
        free: true,
        resource: 'ram',
        value: 8,
        expected: '{"c2d":{"free":true,"ram":8}}'
      },
      {
        free: true,
        resource: 'cpu',
        value: 1,
        expected: '{"c2d":{"free":true,"cpu":1}}'
      },
      {
        free: false,
        resource: 'gpu',
        value: 2,
        expected: '{"c2d":{"free":false,"gpu":2}}'
      },
      {
        free: false,
        resource: 'fpga',
        value: 4,
        expected: '{"c2d":{"free":false,"fpga":4}}'
      },
      {
        free: true,
        resource: 'pcie',
        value: 1,
        expected: '{"c2d":{"free":true,"pcie":1}}'
      }
    ]

    for (const { free, resource, value, expected } of vectors) {
      it(`{free: ${free}, resource: '${resource}', value: ${value}} -> ${expected}`, () => {
        expect(c2dCapabilityContent({ free, resource, value })).to.equal(expected)
      })
    }

    // These two exist specifically to prove the generic serialization path works for
    // resources this package has no built-in knowledge of — 'fpga' and 'pcie' get no special
    // casing anywhere and still produce byte-exact output.
    it('serializes a resource the package has never heard of, with no special casing', () => {
      expect(c2dCapabilityContent({ free: false, resource: 'fpga', value: 4 })).to.equal(
        '{"c2d":{"free":false,"fpga":4}}'
      )
      expect(c2dCapabilityContent({ free: true, resource: 'pcie', value: 1 })).to.equal(
        '{"c2d":{"free":true,"pcie":1}}'
      )
    })
  })

  describe('bucketing', () => {
    const vectors: Array<{ resource: string; value: number; bucket: number }> = [
      { resource: 'cpu', value: 1, bucket: 1 },
      { resource: 'cpu', value: 2, bucket: 2 },
      { resource: 'cpu', value: 3, bucket: 2 },
      { resource: 'cpu', value: 4, bucket: 4 },
      { resource: 'cpu', value: 7, bucket: 4 },
      { resource: 'cpu', value: 8, bucket: 8 },
      { resource: 'cpu', value: 100, bucket: 64 },
      { resource: 'ram', value: 8, bucket: 8 },
      { resource: 'disk', value: 500, bucket: 256 },
      { resource: 'disk', value: 4096, bucket: 4096 },
      { resource: 'fpga', value: 3, bucket: 2 },
      { resource: 'pcie', value: 1, bucket: 1 }
    ]

    for (const { resource, value, bucket } of vectors) {
      it(`${resource}: ${value} -> ${bucket}`, () => {
        expect(c2dBucketFor(resource, value)).to.equal(bucket)
      })
    }

    // 'fpga' and 'pcie' use exactly the same doubling ladder as 'cpu', with no per-resource
    // entry anywhere in the bucketing table (it ships empty) — that's what makes a brand new
    // resource type need no release of this package to bucket correctly.
    it('buckets an unknown resource with the same default ladder as a known one', () => {
      expect(c2dBucketFor('fpga', 3)).to.equal(c2dBucketFor('cpu', 3))
      expect(c2dBucketFor('pcie', 100)).to.equal(c2dBucketFor('cpu', 100))
    })
  })

  describe('required negative test: no qualifier can influence the serialized string', () => {
    // A capability's typed shape is exactly {free, resource, value} — there is nowhere to put
    // a model, kind, description or other qualifier, so this asserts the property at the type
    // level (nothing extra can be passed in) and, for belt-and-braces, that two capabilities
    // built from unrelated "extra" data — as if a caller had spread in metadata that has no
    // business affecting the hash — still serialize identically as long as the three real
    // fields match.
    it('produces the same string regardless of any extra model/kind/description data nearby', () => {
      const withoutMetadata = c2dCapabilityContent({
        free: false,
        resource: 'gpu',
        value: 2
      })

      const gpuModelA = { free: false, resource: 'gpu', value: 2, model: 'A100' } as const
      const gpuModelB = {
        free: false,
        resource: 'gpu',
        value: 2,
        model: 'RTX 4090',
        kind: 'consumer',
        description: 'high-end gaming card'
      } as const

      // Only {free, resource, value} are ever read; extra fields on the object are ignored.
      expect(c2dCapabilityContent(gpuModelA)).to.equal(withoutMetadata)
      expect(c2dCapabilityContent(gpuModelB)).to.equal(withoutMetadata)
      expect(c2dCapabilityContent(gpuModelA)).to.equal(c2dCapabilityContent(gpuModelB))
    })
  })
})
