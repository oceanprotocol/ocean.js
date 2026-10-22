/**
 * Validates the target of a `serviceGetResult` call before anything is signed or dialled: an
 * archive `index` (with an optional resume `offset`), or `'live'` (which cannot be resumed —
 * each live zip is built afresh, so a byte offset into one means nothing in the next).
 */
export function assertServiceResultTarget(index: number | 'live', offset: number): void {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error(`Invalid offset: ${offset}. Must be a non-negative safe integer.`)
  }
  if (index === 'live') {
    if (offset > 0) throw new Error('A live service result download cannot be resumed')
    return
  }
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new Error(
      `Invalid result index: ${index}. Must be a non-negative safe integer.`
    )
  }
}
