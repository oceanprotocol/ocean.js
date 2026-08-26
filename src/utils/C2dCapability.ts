/**
 * The typed and serialized forms of a single compute-capability advertisement, and the
 * bucketing rule used to keep the number of distinct advertisements small.
 *
 * This module is intentionally pure: no network access, no libp2p, no I/O. It only turns a
 * typed capability into the exact byte string that gets hashed into a content id, and back
 * (conceptually — there is no parser here, only the one-way serializer) again. Two independent
 * codebases compute this same content id from the same rule — one when a compute provider
 * announces what it can run, the other when a caller searches for a provider that can run
 * something — so identical bytes matter more than almost anything else in this file. Nothing
 * here should ever be "obviously equivalent" to what it replaces; it should be identical.
 */

/** A single compute capability, in typed form — never a hash, never a raw JSON string. */
export type C2dCapability = {
  /** Whether this is a free-tier or paid capability. */
  free: boolean
  /**
   * The resource being advertised or queried. Deliberately an open string, not a closed
   * union or enum — `'cpu' | 'ram' | 'disk' | 'gpu'` are simply the resources known today.
   * A compute engine can report any resource name and it serializes and buckets correctly
   * without either side of a search needing to know about it in advance.
   */
  resource: string
  /**
   * A positive integer, in the resource's own unit (cores for `cpu`, GB for `ram`/`disk`,
   * boards or devices for an accelerator, ...). Never converted to a different unit anywhere
   * in this module — the caller's unit is the serialized unit.
   */
  value: number
}

/**
 * The canonical byte-exact content string for a capability. This is the only thing that ever
 * gets hashed to derive a content id, on either side of a search, and is therefore the single
 * source of truth for it — nothing else in this package (or in a cooperating implementation
 * elsewhere) should ever assemble this string by hand.
 *
 * The shape is `{"c2d":{"free":<boolean>,"<resource>":<integer>}}` — exactly two fields inside
 * the wrapper, `free` first and the resource key second. That order is fixed explicitly below
 * rather than left to however a JS engine would order the keys of an object literal: a resource
 * name that happens to look like an array index (e.g. a purely numeric string) would otherwise
 * be reordered ahead of `free` by the engine's own integer-key ordering rules, silently changing
 * the bytes that get hashed. Building the string directly, field by field, makes that
 * impossible.
 *
 * A multi-dimension request (e.g. `cpu` AND `ram`) is never expressed as a single wider string
 * here — it is an intersection of one call to this function per dimension, handled by the
 * caller.
 */
export function c2dCapabilityContent(cap: C2dCapability): string {
  if (typeof cap.resource !== 'string' || cap.resource.length === 0) {
    throw new Error('c2dCapabilityContent: "resource" must be a non-empty string')
  }
  if (!Number.isInteger(cap.value) || cap.value < 1) {
    throw new Error(
      `c2dCapabilityContent: "value" must be a positive integer, got ${cap.value}`
    )
  }
  const freeField = cap.free ? 'true' : 'false'
  // JSON.stringify only to get a correctly quoted-and-escaped object key; the surrounding
  // structure is written out explicitly so the field order can never drift.
  const resourceKey = JSON.stringify(cap.resource)
  return `{"c2d":{"free":${freeField},${resourceKey}:${cap.value}}}`
}

/**
 * Largest power of two less than or equal to `value`. Pure integer arithmetic (no bitwise
 * truncation to 32 bits, no floating-point `log2` rounding) so it stays exact well past the
 * ranges any real resource value reaches.
 */
function largestPowerOfTwoAtMost(value: number): number {
  let bucket = 1
  while (bucket * 2 <= value) bucket *= 2
  return bucket
}

/**
 * Per-resource bucket-ladder overrides. Ships empty on purpose, and stays empty unless a
 * concrete need for a coarser or differently-spaced ladder shows up for one specific resource.
 *
 * The default rule below — pure doubling, applied identically to every resource — needs no
 * entry here to work for a resource neither side of a search has ever heard of, which is the
 * entire point of keeping this table empty: a new resource type never requires touching this
 * module. Adding an entry here changes what bytes get hashed for that resource, which is a
 * breaking format change like any other, not a routine addition.
 *
 * A ladder, if one is ever added for a resource, must be a strictly ascending list of positive
 * integers; `c2dBucketFor` picks the largest rung that is `<= value`.
 */
export const C2D_BUCKET_OVERRIDES: Readonly<Record<string, readonly number[]>> =
  Object.freeze({})

/**
 * Buckets `value` for `resource`, rounding **down**. Applies to every resource, known or
 * unknown, with no table lookup required for the common case.
 *
 * Both the announce side and the query side of a search call this same function, and both
 * round down: an announcer emits every bucket at or below its true maximum, and a search
 * request is bucketed down to the nearest one it could plausibly find. That produces false
 * positives (a query for `9` buckets to `8` and matches a provider whose real maximum is
 * exactly `8`) and never false negatives (a provider is never excluded because its own bucket
 * rounded below what it can actually do). Missing a capable provider is worse than finding one
 * that turns out, on closer inspection, not to qualify — which is exactly why a caller must
 * verify a candidate against its real capabilities before trusting a bucket match; the bucket
 * is a coarse prefilter, not an answer by itself.
 */
export function c2dBucketFor(resource: string, value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`c2dBucketFor: "value" must be a positive integer, got ${value}`)
  }
  const ladder = C2D_BUCKET_OVERRIDES[resource]
  if (ladder && ladder.length > 0) {
    let best: number | undefined
    for (const rung of ladder) {
      if (rung <= value && (best === undefined || rung > best)) best = rung
    }
    if (best !== undefined) return best
    // `value` is smaller than every rung in the override ladder — fall through to the
    // default ladder rather than returning nothing, so a value below a resource's smallest
    // named rung still buckets to something usable.
  }
  return largestPowerOfTwoAtMost(value)
}
