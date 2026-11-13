import { assert } from 'chai'
import { getAddress } from 'ethers'
import {
  filterSubsidyByAllowedImages,
  imageReferenceMatches,
  isNonEmpty,
  resolveServiceImage
} from '../../src/utils/SubsidyImage.js'

describe('subsidy image gate', () => {
  // lowercase on purpose: the gate must checksum before lookup
  const A = '0x1111111111111111111111111111111111111111'
  const B = '0x2222222222222222222222222222222222222222'
  const C = '0x3333333333333333333333333333333333333333'
  const IMAGE = 'oceanprotocol/algo'
  const TAG = '1.0'
  const DIGEST = 'sha256:' + 'a'.repeat(64)

  describe('resolveServiceImage / isNonEmpty', () => {
    it('resolves dockerfile > checksum > tag > latest', () => {
      assert.equal(resolveServiceImage('img', 'v1', undefined), 'img:v1')
      assert.equal(resolveServiceImage('img'), 'img:latest')
      assert.equal(resolveServiceImage('img', 'v1', 'sha256:x'), 'img@sha256:x')
      assert.equal(
        resolveServiceImage('img', 'v1', 'sha256:x', 'FROM x', 'AbC'),
        'abc-svc-image:latest'
      )
    })

    it('isNonEmpty handles strings, arrays, whitespace and nullish', () => {
      assert.isFalse(isNonEmpty(undefined))
      assert.isFalse(isNonEmpty(null))
      assert.isFalse(isNonEmpty(''))
      assert.isFalse(isNonEmpty('   '))
      assert.isFalse(isNonEmpty([]))
      assert.isTrue(isNonEmpty('run'))
      assert.isTrue(isNonEmpty(['run']))
    })
  })

  describe('imageReferenceMatches', () => {
    it('matches image:tag', () => {
      assert.isTrue(imageReferenceMatches({ image: IMAGE, tag: TAG }, `${IMAGE}:${TAG}`))
    })

    it('matches image@sha256 digest', () => {
      assert.isTrue(
        imageReferenceMatches({ image: IMAGE, checksum: DIGEST }, `${IMAGE}@${DIGEST}`)
      )
    })

    it('with both tag and checksum, matches ONLY the digest (checksum wins)', () => {
      const c = { image: IMAGE, tag: TAG, checksum: DIGEST }
      assert.isTrue(imageReferenceMatches(c, `${IMAGE}@${DIGEST}`))
      assert.isFalse(imageReferenceMatches(c, `${IMAGE}:${TAG}`))
    })

    it('never matches when a dockerfile is present, even whitespace-only', () => {
      const c = { image: IMAGE, tag: TAG, dockerfile: 'FROM alpine\nRUN miner' }
      assert.isFalse(imageReferenceMatches(c, `${IMAGE}:${TAG}`))
      assert.isFalse(imageReferenceMatches(c, `${IMAGE}:*`))
      assert.isFalse(
        imageReferenceMatches(
          { image: IMAGE, tag: TAG, dockerfile: '   ' },
          `${IMAGE}:${TAG}`
        )
      )
    })

    it('defaults to image:latest and trims the entry', () => {
      assert.isTrue(imageReferenceMatches({ image: IMAGE }, `${IMAGE}:latest`))
      assert.isFalse(imageReferenceMatches({ image: IMAGE }, `${IMAGE}:1.0`))
      assert.isTrue(
        imageReferenceMatches({ image: IMAGE, tag: TAG }, `  ${IMAGE}:${TAG}  `)
      )
    })

    it('never matches a container without an image name, or an empty entry', () => {
      assert.isFalse(imageReferenceMatches({ tag: TAG }, `${IMAGE}:${TAG}`))
      assert.isFalse(imageReferenceMatches(null, `${IMAGE}:${TAG}`))
      assert.isFalse(imageReferenceMatches({ image: IMAGE }, '   '))
    })

    it('is case-sensitive', () => {
      assert.isFalse(
        imageReferenceMatches({ image: IMAGE, tag: TAG }, `OceanProtocol/algo:${TAG}`)
      )
      assert.isFalse(imageReferenceMatches({ image: 'OceanProtocol/algo' }, `${IMAGE}:*`))
    })

    describe('wildcard tag `name:*`', () => {
      it('matches any tag, the default tag and any digest of the same image', () => {
        assert.isTrue(imageReferenceMatches({ image: IMAGE, tag: 'v1.2' }, `${IMAGE}:*`))
        assert.isTrue(imageReferenceMatches({ image: IMAGE }, `${IMAGE}:*`))
        assert.isTrue(
          imageReferenceMatches({ image: IMAGE, checksum: DIGEST }, `${IMAGE}:*`)
        )
      })

      it('does not match a different image, or a name prefix', () => {
        assert.isFalse(
          imageReferenceMatches({ image: 'evil/miner', tag: 'x' }, `${IMAGE}:*`)
        )
        assert.isFalse(
          imageReferenceMatches({ image: IMAGE, tag: 'x' }, 'oceanprotocol/*:*')
        )
      })

      it('a bare `:*` matches nothing', () => {
        assert.isFalse(imageReferenceMatches({ image: IMAGE, tag: TAG }, ':*'))
      })

      it('matches a registry-qualified name with a port', () => {
        const reg = 'localhost:5000/team/algo'
        assert.isTrue(imageReferenceMatches({ image: reg, tag: 'x' }, `${reg}:*`))
      })
    })
  })

  describe('filterSubsidyByAllowedImages', () => {
    const container = { image: IMAGE, tag: TAG }

    it('gate off on absent or {} map: everything kept', () => {
      for (const map of [null, undefined, {}]) {
        const r = filterSubsidyByAllowedImages([A, B], container, false, map)
        assert.deepEqual(r.kept, [A, B])
        assert.deepEqual(r.dropped, [])
      }
    })

    it('keyed address with a matching image and no entrypoint is kept', () => {
      const r = filterSubsidyByAllowedImages([A], container, false, {
        [getAddress(A)]: [`${IMAGE}:${TAG}`]
      })
      assert.deepEqual(r.kept, [A])
    })

    it('normalizes lowercase map keys before lookup (match and non-match)', () => {
      const ok = filterSubsidyByAllowedImages([A], container, false, {
        [A]: [`${IMAGE}:${TAG}`]
      })
      assert.deepEqual(ok.kept, [A])
      const no = filterSubsidyByAllowedImages(
        [A],
        { image: 'miner/x', tag: 'v1' },
        false,
        {
          [A]: [`${IMAGE}:${TAG}`]
        }
      )
      assert.deepEqual(no.dropped, [A])
    })

    it('merges entries when two keys normalize to the same address', () => {
      const r = filterSubsidyByAllowedImages([A], container, false, {
        [A.toLowerCase()]: ['other/image:1'],
        [getAddress(A)]: [`${IMAGE}:${TAG}`]
      })
      assert.deepEqual(r.kept, [A])
    })

    it('keyed address with no matching entry is dropped; an empty list blocks it', () => {
      const r = filterSubsidyByAllowedImages(
        [A, B],
        { image: 'evil/miner', tag: 'latest' },
        false,
        { [getAddress(A)]: [`${IMAGE}:${TAG}`], [getAddress(B)]: [] }
      )
      assert.deepEqual(r.kept, [])
      assert.deepEqual(r.dropped, [A, B])
    })

    it('a custom entrypoint drops a keyed address even on an exact/wildcard match', () => {
      for (const entry of [`${IMAGE}:${TAG}`, `${IMAGE}:*`]) {
        const r = filterSubsidyByAllowedImages([A], container, true, {
          [getAddress(A)]: [entry]
        })
        assert.deepEqual(r.dropped, [A])
      }
    })

    it('an unlisted address passes through; mixed set splits correctly', () => {
      const r = filterSubsidyByAllowedImages([A, B, C], container, false, {
        [getAddress(A)]: [`${IMAGE}:${TAG}`],
        [getAddress(B)]: ['other/image:9']
      })
      assert.deepEqual(r.kept, [A, C])
      assert.deepEqual(r.dropped, [B])
    })

    it('dockerfile build and attacker digest on an allowed tag are dropped', () => {
      const entry = { [getAddress(A)]: [`${IMAGE}:${TAG}`] }
      const dockerfile = filterSubsidyByAllowedImages(
        [A],
        { image: IMAGE, tag: TAG, dockerfile: 'FROM alpine' },
        false,
        entry
      )
      assert.deepEqual(dockerfile.dropped, [A])
      const digest = filterSubsidyByAllowedImages(
        [A],
        { image: IMAGE, tag: TAG, checksum: 'sha256:' + 'b'.repeat(64) },
        false,
        entry
      )
      assert.deepEqual(digest.dropped, [A])
    })
  })
})
