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

/** ERC-165 base interface id (`IERC165.supportsInterface`). */
export const ERC165_INTERFACE_ID = '0x01ffc9a7'
/** ERC-165 interface id of `ISubsidyView` (the read/quote surface dashboards consume). */
export const ISUBSIDY_VIEW_INTERFACE_ID = '0xcf08f23a'
/** ERC-165 interface id of `ISubsidyProvider` (the escrow-facing claim surface). */
export const ISUBSIDY_PROVIDER_INTERFACE_ID = '0x659fa925'
