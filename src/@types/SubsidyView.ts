/**
 * Types for the `ISubsidyView` interface — the standardized, read-only view that every
 * Ocean subsidy provider (OPF rolling-window, one-time onboarding credits, ...) exposes
 * so dashboards can query subsidy availability uniformly and discover providers via
 * ERC-165. See `SubsidyView` in `contracts/` and the "Dashboard integration guide".
 */

/**
 * Coarse window kind for UI grouping. Always render the actual window length from
 * `SubsidyBucket.periodSeconds`, not from this enum — `MONTH`, for example, is a fixed
 * 28-day window on OPF, not a calendar month. `CUSTOM` is anything outside the common set.
 */
export enum SubsidyPeriod {
  ONE_TIME = 0,
  DAY = 1,
  WEEK = 2,
  MONTH = 3,
  CUSTOM = 4
}

/** Broad category of a provider, from `ISubsidyView.subsidyKind()`, used for grouping. */
export enum SubsidyKind {
  ROLLING_WINDOW = 0,
  ONE_TIME = 1,
  OTHER = 2
}

/**
 * The two ways a subsidy can be delivered, from `ISubsidyViewV2` (contracts v2). Both legs
 * draw from the **same** per-provider budget (they are alternatives, never additive).
 * - `REIMBURSEMENT` (0): the legacy claim-time path — `onSubsidyClaim` runs at claim and the
 *   subsidy is released to the payer *after* the job. The payer must still have fronted the
 *   funds (deposit + lock the full amount).
 * - `PREFUNDED` (1): the new lock-time path — `onSubsidyLock` runs when the lock is created and
 *   the provider's tokens are pulled into a non-withdrawable sponsored bucket that backs the
 *   lock. A fully-sponsored lock needs **no payer deposit** (zero-deposit onboarding).
 */
export enum SubsidyMode {
  REIMBURSEMENT = 0,
  PREFUNDED = 1
}

/**
 * Which subsidy mode(s) a provider currently honours, from `ISubsidyModeConfig.subsidyModeConfig()`
 * (owner-settable). Default is `BOTH`. When a mode is disabled its callback returns 0 **and** the
 * matching `quoteSubsidyModes` leg (and, for the refund leg, the v1 `quoteSubsidy`) reports 0.
 * `pause()` disables *all* subsidy; this only selects between the two modes. A dashboard reads this
 * to know whether to offer a prepaid vs refund flow.
 */
export enum SubsidyModeConfig {
  BOTH = 0,
  REFUND_ONLY = 1,
  PREPAID_ONLY = 2
}

/**
 * One budget window as reported by `subsidyBuckets`. Amount fields (`limit`, `used`,
 * `remaining`) are in human-readable token units. Always check `unlimited` first: when
 * `true`, `limit` and `remaining` are `'0'` and meaningless (`used` stays valid).
 */
export interface SubsidyBucket {
  /** Coarse window kind for UI grouping (see {@link SubsidyPeriod}). */
  period: SubsidyPeriod
  /** Exact window length in seconds; `'0'` means one-time / no fixed window. */
  periodSeconds: string
  /** `true` => no cap this window; `limit` & `remaining` are `'0'` and meaningless. */
  unlimited: boolean
  /** Cap for this window, in human-readable token units (`'0'` when unlimited). */
  limit: string
  /** Real cumulative spend this window, in human-readable token units (valid even when unlimited). */
  used: string
  /** `limit - used`, in human-readable token units; `'0'` when unlimited (read `unlimited`). */
  remaining: string
  /** Unix timestamp (seconds) of the next automatic reset; `'0'` = admin-driven / no timer. */
  resetsAt: string
}

/**
 * Full payer/token budget report from `subsidyBuckets`. The top-level flags describe
 * payer-side eligibility; `buckets` holds the per-window budgets.
 */
export interface SubsidyBucketReport {
  /** Provider is paused: nothing is drawable right now. */
  paused: boolean
  /** The payer passes the user AccessList gate. */
  userAllowed: boolean
  /** The token is configured and enabled. */
  tokenEnabled: boolean
  /** Per-window budgets. Within one provider, take the MIN of `remaining` — never the sum. */
  buckets: SubsidyBucket[]
}

/**
 * Result of `quoteSubsidy`, in human-readable token units. `subsidy` is released to the
 * payer (cost reduction); `bonus` rewards the node (both current providers return `'0'`
 * for `bonus`, but the field accommodates future node-incentive providers).
 */
export interface SubsidyQuote {
  /** Subsidy released to the payer, in human-readable token units. */
  subsidy: string
  /** Bonus paid to the node, in human-readable token units. */
  bonus: string
}

/**
 * Result of one leg of `quoteSubsidyModes` (or of `quoteSubsidyByMode`), in human-readable
 * token units. `subsidy` is how much of the job cost the provider covers under this mode (for
 * `PREFUNDED` it is pre-funded into the lock, not paid to the payer; for `REIMBURSEMENT` it is
 * released to the payer at claim). `bonus` rewards the node.
 */
export interface ModeQuote {
  /** Which delivery mode this quote is for. */
  mode: SubsidyMode
  /** Job cost covered by the provider under this mode, in human-readable token units. */
  subsidy: string
  /** Bonus paid to the node under this mode, in human-readable token units. */
  bonus: string
}

/** ERC-165 base interface id (`IERC165.supportsInterface`). */
export const ERC165_INTERFACE_ID = '0x01ffc9a7'
/** ERC-165 interface id of `ISubsidyView` (the v1 read/quote surface dashboards consume). */
export const ISUBSIDY_VIEW_INTERFACE_ID = '0xcf08f23a'
/** ERC-165 interface id of `ISubsidyProvider` (the escrow-facing claim-time subsidy surface). */
export const ISUBSIDY_PROVIDER_INTERFACE_ID = '0x659fa925'
/**
 * ERC-165 interface id of `ISubsidyViewV2` (dual-mode quoting: `quoteSubsidyModes` /
 * `quoteSubsidyByMode`). Feature-detect it before calling the v2 quote methods.
 */
export const ISUBSIDY_VIEW_V2_INTERFACE_ID = '0x8cd610bb'
/** ERC-165 interface id of `ISubsidyModeConfig` (the owner-settable `subsidyModeConfig` switch). */
export const ISUBSIDY_MODE_CONFIG_INTERFACE_ID = '0x63edab4f'
/**
 * ERC-165 interface id of `ISubsidyLockProvider` (the escrow-facing lock-time / prefunded
 * sponsorship surface: `onSubsidyLock` / `onSubsidyRefund`). A provider advertising this can be
 * passed as a `subsidyProvider` to `createLock`/`reLock`.
 */
export const ISUBSIDY_LOCK_PROVIDER_INTERFACE_ID = '0xefed9e7b'
