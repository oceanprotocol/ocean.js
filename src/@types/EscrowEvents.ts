// Indexed Escrow contract events exposed by an Ocean Node via the public `getEscrowEvents`
// read (HTTP `GET /api/services/escrow/events` or the P2P GET_ESCROW_EVENTS command).
//
// These are the *indexed event* shapes, deliberately kept separate from the on-chain structs
// in `Escrow.ts` (`AuthData`, `LockData`, `EscrowAuthorization`, ...), which model a different
// thing. uint256 values are decimal strings here (they overflow JS `number`).

export type EscrowEventType =
  | 'Auth'
  | 'Lock'
  | 'ReLock'
  | 'Claimed'
  | 'Canceled'
  | 'Deposit'
  | 'Withdraw'
  | 'Subsidized'
  | 'LockSponsored'
  | 'SponsorRefunded'

/**
 * Numeric range bound for a range filter. `min`/`max` are inclusive, `gt`/`lt` exclusive.
 * uint256 bounds must be passed as strings (the node compares them with BigInt).
 * Note: `gt`/`lt` only take effect over the P2P transport — the HTTP REST route reads only
 * `min`/`max`, so `gt`/`lt` are dropped (with a warning) when querying an HTTP node.
 */
export interface RangeFilter {
  min?: string | number
  max?: string | number
  gt?: string | number
  lt?: string | number
}

/**
 * One indexed escrow event row, keyed by `${txHash}-${logIndex}`. The base fields are always
 * present; the rest depend on `eventType`. All uint256 fields are decimal strings.
 */
export interface EscrowEventRecord {
  id: string
  eventType: EscrowEventType
  chainId: number
  contract: string
  block: number
  txHash: string
  payer?: string
  payee?: string
  token?: string
  jobId?: string
  provider?: string
  proof?: string
  amount?: string
  expiry?: string
  oldAmount?: string
  newAmount?: string
  newExpiry?: string
  maxLockedAmount?: string
  maxLockSeconds?: string
  maxLockCounts?: string
  expiryTimestamp?: string
  subsidyAmount?: string
  bonusAmount?: string
  reclaimable?: boolean
}

/**
 * Filters for `getEscrowEvents`. All fields are optional. Equality filters match exactly
 * (addresses are case-insensitive on input, returned lowercased). `ranges` holds numeric
 * range filters keyed by record field, e.g. `{ block: { min: 100, max: 200 } }`.
 *
 * Range-filterable fields: `block`, `chainId` (store-side), and the uint256 fields `amount`,
 * `subsidyAmount`, `bonusAmount`, `oldAmount`, `newAmount`, `maxLockedAmount`, `maxLockSeconds`,
 * `maxLockCounts`, `expiry`, `newExpiry`, `expiryTimestamp` (node-side BigInt). A range on any
 * other field is rejected by the node.
 */
export interface EscrowEventsFilter {
  chainId?: number
  eventType?: EscrowEventType
  payer?: string
  payee?: string
  token?: string
  provider?: string
  contract?: string
  reclaimable?: boolean
  jobId?: string
  txId?: string
  ranges?: Record<string, RangeFilter>
  offset?: number
  size?: number
}
