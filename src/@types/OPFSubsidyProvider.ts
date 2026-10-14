/**
 * Per-token subsidy configuration as returned by `OPFSubsidyProvider.getTokenLimits`.
 * Amount fields (`daily`, `weekly`, `monthly`) are expressed in human-readable token
 * units; `pctBps` is the percentage-of-job ceiling in basis points (not converted).
 */
export interface TokenLimits {
  /** Percentage-of-job ceiling in basis points (1% = 100 bps). */
  pctBps: string
  /** Per-user daily cap, in human-readable token units. */
  daily: string
  /** Per-user weekly cap, in human-readable token units. */
  weekly: string
  /** Per-user monthly cap, in human-readable token units. */
  monthly: string
  /** The token is only subsidised when this is `true`. */
  enabled: boolean
}
