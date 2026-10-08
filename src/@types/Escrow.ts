export interface DepositData {
  token: string
  amount: string
}

export interface PermitData {
  token: string
  amount: string
  deadline: string
  v: number
  r: string
  s: string
}

export interface AuthData {
  token: string
  payee: string
  maxLockedAmount: string
  maxLockSeconds: string
  maxLockCounts: string
  /**
   * Unix timestamp (seconds) after which the payee can no longer create or extend locks (Escrow
   * v2). `'0'` (the default) = indefinite, i.e. today's behaviour. Claim and cancel are never
   * gated by expiry, so funds are never stuck.
   */
  expiryTimestamp?: string
}

/**
 * A lock as returned by `getLocks`. NOTE (Escrow v2): `amount` is the **gross** lock amount `L`
 * (payer-funded portion `P` + sponsored portion `S`), unchanged from v1. The payer-funded part is
 * tracked separately in `getUserFunds(...).locked`; read `getSponsorship(payee, payer, jobId)` for
 * the sponsored breakdown.
 */
export interface LockData {
  jobId: string
  payer: string
  amount: string
  expiry: string
  token: string
  startTime: string
}

/**
 * One authorization as returned by `getAuthorizations` (Escrow v2 tuple shape). Amounts are raw
 * on-chain values (the wrapper returns the raw ethers result; convert with `unitsToAmount` if
 * needed).
 */
export interface EscrowAuthorization {
  /** The authorized payee (node). */
  payee: string
  /** Max the payee may have locked from the payer's own funds at once. */
  maxLockedAmount: string
  /**
   * Currently locked from the payer's **own** funds (Escrow v2: the payer-funded portion `P`
   * only — sponsored tokens are not counted here).
   */
  currentLockedAmount: string
  /** Max lock duration the payee may set, in seconds. */
  maxLockSeconds: string
  /** Max number of concurrent locks the payee may hold. */
  maxLockCounts: string
  /** Number of locks the payee currently holds. */
  currentLocks: string
  /**
   * Unix timestamp (seconds) after which the payee can no longer create or extend locks; `'0'`
   * = indefinite (Escrow v2).
   */
  expiryTimestamp: string
}

/**
 * Per-lock sponsorship breakdown from `getSponsorship(payee, payer, jobId)` (Escrow v2). Amounts
 * are returned in human-readable token units by the wrapper.
 */
export interface Sponsorship {
  /** Total sponsored amount `S` backing this lock, in human-readable token units. */
  total: string
  /** The providers that sponsored this lock. */
  providers: string[]
  /** Each provider's contribution, aligned with `providers`, in human-readable token units. */
  amounts: string[]
}

/**
 * The flavour of an escrow deployment, from `escrowKind()` (Escrow v2). Use it to tell the
 * permissionless community escrow apart from the fee-gated enterprise one.
 */
export enum EscrowKind {
  COMMUNITY = 0,
  ENTERPRISE = 1
}

/** ERC-165 interface id of `IEscrowCore` (base escrow surface at v2 signatures). */
export const IESCROW_CORE_INTERFACE_ID = '0xd31a4ec5'
/**
 * ERC-165 interface id of `IEscrowLockSubsidy` (the lock-time / prefunded sponsorship surface:
 * `sweepReclaimable`, `maxSponsorsPerLock`, `getSponsoredTotal`, `getReclaimable`,
 * `getSponsorship`). Feature-detect it before using sponsorship on an escrow.
 */
export const IESCROW_LOCK_SUBSIDY_INTERFACE_ID = '0x016d7f65'
/**
 * ERC-165 interface id of `IEscrowEnterprise` (enterprise-only read passthroughs:
 * `feeCollector`, `isTokenAllowed`, `previewFee`). The community escrow does not advertise it.
 */
export const IESCROW_ENTERPRISE_INTERFACE_ID = '0xb2f20641'
