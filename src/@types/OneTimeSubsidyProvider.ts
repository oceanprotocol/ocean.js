/**
 * Per-token configuration of a `OneTimeSubsidyProvider`, as returned by `getTokenConfig`.
 * `defaultCredit` is expressed in human-readable token units; `pctBps` is the REQUIRED
 * per-job percentage ceiling in basis points (here `0` means "grant nothing" and `10000`
 * (= `BPS`) means up to 100% of the job may be sponsored — same meaning as
 * `OPFSubsidyProvider`). A token must have a non-zero `pctBps` to sponsor anything.
 */
export interface OneTimeTokenConfig {
  /** Per-job ceiling in basis points (1% = 100 bps); `'0'` = grant nothing, `'10000'` = 100% of job. */
  pctBps: string
  /** Global one-time credit granted per user for this token, in human-readable token units. */
  defaultCredit: string
  /** The token is only subsidised when this is `true`. */
  enabled: boolean
}
