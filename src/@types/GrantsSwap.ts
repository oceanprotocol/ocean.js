/**
 * EIP-2612 permit signature used by `GrantsSwap.swapToCOMPYwithPermit`.
 * Lets a user approve the input-token spend in-signature, so the swap can be
 * done in a single transaction (no separate ERC20 `approve`).
 */
export interface GrantsSwapPermit {
  /** Unix timestamp (seconds) after which the permit is no longer valid. */
  deadline: number | string
  /** `v` component of the permit signature. */
  v: number
  /** `r` component of the permit signature. */
  r: string
  /** `s` component of the permit signature. */
  s: string
}
