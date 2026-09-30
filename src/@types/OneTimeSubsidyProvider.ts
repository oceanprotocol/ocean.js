/**
 * Per-token configuration of a `OneTimeSubsidyProvider`, as returned by `getTokenConfig`.
 * `defaultCredit` is expressed in human-readable token units; `pctBps` is the OPTIONAL
 * per-job percentage ceiling in basis points (here `0` means "no per-job cap" — the whole
 * remaining credit may go to a single job — the inverse of `OPFSubsidyProvider`).
 */
export interface OneTimeTokenConfig {
  /** Optional per-job ceiling in basis points (1% = 100 bps); `'0'` = no per-job cap. */
  pctBps: string
  /** Global one-time credit granted per user for this token, in human-readable token units. */
  defaultCredit: string
  /** The token is only subsidised when this is `true`. */
  enabled: boolean
}
