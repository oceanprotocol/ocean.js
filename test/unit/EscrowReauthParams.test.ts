import { assert } from 'chai'
import { EscrowContract } from '../../src/contracts/Escrow'

/**
 * Unit tests for the pure re-authorization planner `EscrowContract.computeReauthParams`, which
 * decides how `verifyFundsForEscrowPayment` must (re)authorize a payee so the node's later
 * `createLock` cannot revert. The method takes no `this` and touches no chain, so it is exercised
 * directly through the prototype — no barge, signer or provider needed.
 *
 * Covers the review findings it was extracted to make testable:
 *  - C2: a count-exhausted auth must leave a free lock slot (`currentLocks + 1`).
 *  - C3: a prior/explicit expiry that cannot cover `now + maxLockSeconds (+buffer)` fails fast
 *        (returns a `{ message }`) instead of sending a doomed tx or silently un-revoking.
 *  - C4: the ceiling and the second/count caps must never shrink below the existing record.
 *  - C6: non-integer/garbage second/count inputs must not throw.
 */

type ReauthResult =
  | { ceiling: string; newSeconds: string; newCounts: string; newExpiry?: string }
  | { message: string }

// computeReauthParams is `protected` and pure, so call it on a bare context via the prototype.
function plan(
  prior: any,
  requiredAmountHuman: string,
  priorCurrentHuman: string,
  priorMaxHuman: string,
  maxLockSeconds: string,
  maxLockCounts: string,
  requiredExpiry: number,
  callerExpiry?: string
): ReauthResult {
  return (EscrowContract.prototype as any).computeReauthParams.call(
    {},
    prior,
    requiredAmountHuman,
    priorCurrentHuman,
    priorMaxHuman,
    maxLockSeconds,
    maxLockCounts,
    requiredExpiry,
    callerExpiry
  )
}

const isFailFast = (r: ReauthResult): r is { message: string } => 'message' in r

describe('EscrowContract.computeReauthParams (pure re-authorization planner)', () => {
  describe('no prior authorization', () => {
    it('uses the required amount and caps verbatim, no expiry', () => {
      const r = plan(undefined, '5', '0', '0', '3600', '3', 2000)
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.ceiling, '5')
      assert.strictEqual(r.newSeconds, '3600')
      assert.strictEqual(r.newCounts, '3')
      assert.strictEqual(r.newExpiry, undefined)
    })

    it('passes an explicit adequate expiry through', () => {
      const r = plan(undefined, '5', '0', '0', '3600', '3', 2000, '9000')
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.newExpiry, '9000')
    })

    it("always allows an explicit '0' (indefinite) expiry", () => {
      const r = plan(undefined, '5', '0', '0', '3600', '3', 2000, '0')
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.newExpiry, '0')
    })

    it('fails fast on an explicit nonzero expiry below the required horizon', () => {
      const r = plan(undefined, '5', '0', '0', '3600', '3', 2000, '1500')
      assert.isTrue(isFailFast(r))
      if (!isFailFast(r)) return
      assert.include(r.message, '1500')
      assert.include(r.message, '2000')
    })
  })

  describe('C4 — ceiling and caps never shrink below the prior record', () => {
    it('keeps the larger prior ceiling (max(required + currentLocked, priorMax))', () => {
      // required 5, nothing currently locked, but the prior cap was 100.
      const prior = { maxLockSeconds: 3600, maxLockCounts: 3, currentLocks: 0 }
      const r = plan(prior, '5', '0', '100', '3600', '3', 2000)
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.ceiling, '100')
    })

    it('adds the already-locked amount when that beats the prior cap', () => {
      // required 5 + currently locked 10 = 15 > prior cap 8.
      const prior = { maxLockSeconds: 3600, maxLockCounts: 3, currentLocks: 0 }
      const r = plan(prior, '5', '10', '8', '3600', '3', 2000)
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.ceiling, '15')
    })

    it('never lowers maxLockSeconds / maxLockCounts below the existing record', () => {
      const prior = { maxLockSeconds: 7200, maxLockCounts: 5, currentLocks: 0 }
      const r = plan(prior, '5', '0', '0', '3600', '2', 2000)
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.newSeconds, '7200')
      assert.strictEqual(r.newCounts, '5')
    })
  })

  describe('C2 — re-authorized counts must leave a free lock slot', () => {
    it('bumps counts to currentLocks + 1 when the prior auth is slot-exhausted', () => {
      // prior maxLockCounts 1 fully used (currentLocks 1); node also asks for 1.
      const prior = { maxLockSeconds: 3600, maxLockCounts: 1, currentLocks: 1 }
      const r = plan(prior, '5', '0', '0', '3600', '1', 2000)
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.newCounts, '2')
    })
  })

  describe('C3 — expiry is never silently renewed or reset', () => {
    it('preserves a prior expiry that still covers the horizon', () => {
      const prior = {
        maxLockSeconds: 3600,
        maxLockCounts: 3,
        currentLocks: 0,
        expiryTimestamp: 5000
      }
      const r = plan(prior, '5', '0', '0', '3600', '3', 2000)
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.newExpiry, '5000')
    })

    it('fails fast (no tx) when the prior expiry is too early and the caller gave none', () => {
      const prior = {
        maxLockSeconds: 3600,
        maxLockCounts: 3,
        currentLocks: 0,
        expiryTimestamp: 1000
      }
      const r = plan(prior, '5', '0', '0', '3600', '3', 2000)
      assert.isTrue(isFailFast(r))
      if (!isFailFast(r)) return
      assert.include(r.message, '1000')
      assert.include(r.message, '2000')
    })

    it('treats a prior expiry of 0 as indefinite (no renewal needed, stays unset)', () => {
      const prior = {
        maxLockSeconds: 3600,
        maxLockCounts: 3,
        currentLocks: 0,
        expiryTimestamp: 0
      }
      const r = plan(prior, '5', '0', '0', '3600', '3', 2000)
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.newExpiry, undefined)
    })

    it("lets an explicit '0' override a nonzero prior expiry", () => {
      const prior = {
        maxLockSeconds: 3600,
        maxLockCounts: 3,
        currentLocks: 0,
        expiryTimestamp: 5000
      }
      const r = plan(prior, '5', '0', '0', '3600', '3', 2000, '0')
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.newExpiry, '0')
    })
  })

  describe('tuple-shaped prior (numeric-index fallback)', () => {
    it('reads maxLockSeconds[3]/maxLockCounts[4]/currentLocks[5]/expiryTimestamp[6]', () => {
      // [payee, maxLocked, currentLocked, maxLockSeconds, maxLockCounts, currentLocks, expiry]
      const prior = ['0xpayee', 100n, 10n, 7200n, 5n, 1n, 5000n]
      // priorCurrentHuman/priorMaxHuman are supplied by the caller (already converted).
      const r = plan(prior, '5', '10', '100', '3600', '2', 2000)
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.ceiling, '100') // max(5 + 10, 100)
      assert.strictEqual(r.newSeconds, '7200') // max(3600, 7200)
      assert.strictEqual(r.newCounts, '5') // max(max(2, 5), 1 + 1)
      assert.strictEqual(r.newExpiry, '5000') // preserved, covers horizon
    })
  })

  describe('C6 — garbage second/count inputs do not throw', () => {
    it('truncates a fractional duration and floors a non-numeric count to 0', () => {
      const r = plan(undefined, '5', '0', '0', '1.5', 'abc', 0)
      assert.isFalse(isFailFast(r))
      if (isFailFast(r)) return
      assert.strictEqual(r.newSeconds, '1')
      assert.strictEqual(r.newCounts, '0')
    })
  })
})
