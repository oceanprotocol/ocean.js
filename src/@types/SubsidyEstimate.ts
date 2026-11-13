import type { Signer } from 'ethers'
import type { Config } from '../config/index.js'
import type { ComputeResourceRequest } from './Compute.js'
import type { OceanNode } from './Provider.js'
import type { SubsidyKind, SubsidyMode, SubsidyQuote } from './SubsidyView.js'
import type { SubsidyImageContainer } from '../utils/SubsidyImage.js'
import type { BaseProvider } from '../services/providers/BaseProvider.js'

/** Why a subsidy-provider candidate was excluded from the selection. */
export type SubsidyDropReason =
  | 'image_not_allowed'
  | 'outside_node_set'
  | 'node_not_allowed'
  | 'user_not_allowed'
  | 'job_type_not_subsidized'
  | 'zero_quote'
  | 'error'

export interface EstimateJobSubsidyParams {
  signer: Signer
  chainId: number
  /** Payer (consumer) address. */
  payer: string
  /** Works over HTTP or P2P (the provider façade dispatches). */
  node: OceanNode
  token: string
  environmentId: string
  /** Caller-supplied resources (no auto-selection). */
  resources: ComputeResourceRequest[]
  durationSeconds: number
  /** REQUIRED — ocean-node numbering: COMPUTE=1, SERVICE=2. */
  jobType: number | string
  /** The image gate needs tag/checksum/dockerfile, not just an image name. */
  container: SubsidyImageContainer
  /**
   * Set true when the job must NOT be subsidized under a provider's image allowlist because the
   * workload is not the trusted operator image. The caller computes it with the node's OWN predicate
   * for the job type (the helper takes no algorithm/task object, so it cannot derive this):
   *  - service: `isNonEmpty(dockerEntrypoint) || isNonEmpty(dockerCmd)`
   *  - compute: `isNonEmpty(algorithm.meta.container.entrypoint) || hasUserSuppliedAlgorithm(algorithm)`
   *    where a user-supplied algorithm (rawcode, a `fileObject`, or a `documentId`/`serviceId` DID) is
   *    untrusted and must set this true. Omitting it for compute would subsidize an attacker algorithm
   *    run against a trusted image's allowlist. Default false.
   */
  hasCustomEntrypoint?: boolean
  /**
   * Compute-only: the env's queue max wait (seconds). Added to the lock duration used for
   * `minLockSeconds` (the node locks for job duration + queue wait), NOT to the billed cost.
   * Default 0.
   */
  queueMaxWaitTime?: number
  /** Added to what the node advertises (see the filter semantics on `estimateJobSubsidy`). */
  customSubsidyProviders?: string[]
  /** Human token units; default = the job cost. */
  subsidyNeeded?: string
  tokenDecimals?: number
  config?: Config
  /** Defaults to the shared `ProviderInstance`. */
  provider?: BaseProvider
  signal?: AbortSignal
}

export interface JobSubsidyProviderQuote {
  /** Checksummed address (raw input when it was not a valid address). */
  address: string
  subsidyKind: SubsidyKind | null
  version: number | null
  isV2: boolean
  gates: {
    /** Gate off OR address unlisted OR an allowlist entry matches. */
    imageAllowed: boolean
    /** null = the provider does not expose the check (unknown, NOT disqualifying). */
    isNodeAllowed: boolean | null
    isUserAllowed: boolean | null
    isJobTypeSubsidized: boolean | null
  }
  /** Image allowed AND no gate is an explicit false. */
  eligible: boolean
  dropped?: SubsidyDropReason
  reason?: string
  /** Human token units; a v1 provider's prefunded leg is '0'. */
  quotes: { reimbursement: SubsidyQuote; prefunded: SubsidyQuote }
}

export interface JobSubsidyScenario {
  mode: SubsidyMode
  /** THE list to pass as `subsidyProviders` at start. */
  selected: string[]
  /** Sum of the selected providers under this mode, capped at the cost. */
  projectedTotalSubsidy: string
  meetsSubsidyNeeded: boolean
  /** REIMBURSEMENT = cost; PREFUNDED = max(0, cost - projectedTotalSubsidy). */
  escrowNeeded: string
  /** Payer's withdrawable escrow balance for the token. */
  escrowAvailable: string
  /** max(0, escrowNeeded - escrowAvailable). */
  escrowShortfall: string
}

export interface JobSubsidyEstimate {
  chainId: number
  /** Payee (node status `address`). */
  node: string
  token: string
  /** Human token units (the node is authoritative at start). */
  cost: string
  costBaseUnits: string
  minutesBilled: number
  minLockSeconds: number
  escrowAddress: string
  maxSponsorsPerLock: number
  subsidyProviderFilter: boolean
  subsidyNeeded: string
  unpricedResourceIds: string[]
  providers: JobSubsidyProviderQuote[]
  scenarios: { reimbursement: JobSubsidyScenario; prefunded: JobSubsidyScenario }
  warnings: string[]
}
