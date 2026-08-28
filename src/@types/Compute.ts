import { MetadataAlgorithm, ConsumerParameter } from '@oceanprotocol/ddo-js'
import { StorageObject, EncryptMethod } from './File.js'
import { NodeP2P } from './Provider.js'
export type ComputeResultType =
  'algorithmLog' | 'output' | 'configrationLog' | 'publishLog'

// new V2 C2D Compute Environment specs
export interface RunningPlatform {
  architecture: string
  os: string
}

export type ComputeResourceType = 'cpu' | 'ram' | 'disk' | 'gpu'

export interface ComputeResourcesPricingInfo {
  id: string
  price: number
}
export interface ComputeEnvFees {
  feeToken: string
  prices: ComputeResourcesPricingInfo[]
}
export interface ComputeEnvFeesStructure {
  [chainId: string]: ComputeEnvFees[]
}

export interface ComputeResourceRequest {
  id: string
  amount: number
}

export interface ComputeResource {
  id: string
  type?: ComputeResourceType
  kind?: string
  total?: number // total number of specific resource
  min?: number // min number of resource needed for a job
  max: number // max number of resource for a job
  description?: string
  init?: { [key: string]: any }
  inUse?: number // for display purposes
}

export interface ComputeEnvironmentAccessOptions {
  addresses?: string[]
  accessLists?: any
}

export interface ComputeEnvironmentFreeOptions {
  // only if a compute env exposes free jobs
  access?: ComputeEnvironmentAccessOptions
  storageExpiry?: number
  maxJobDuration?: number
  maxJobs?: number // maximum number of simultaneous free jobs
  resources?: ComputeResource[]
}
// Per-environment capability flags. Both default to true node-side; only an
// explicit false disables a capability. `services` gates Service-on-Demand.
export interface ComputeEnvFeatures {
  computeJobs?: boolean // false → COMPUTE_START + FREE_COMPUTE_START rejected
  services?: boolean // false → SERVICE_START rejected; env not service-eligible
}

export interface ComputeEnvironment {
  id: string
  description?: string
  consumerAddress: string
  access?: ComputeEnvironmentAccessOptions
  features?: ComputeEnvFeatures
  storageExpiry?: number // amount of seconds for storage
  minJobDuration?: number // min billable seconds for a paid job
  maxJobDuration?: number // max duration in seconds for a paid job
  maxJobs?: number // maximum number of simultaneous paid jobs
  runningJobs: number // amount of running jobs (paid jobs)
  runningfreeJobs?: number // amount of running jobs (free jobs)
  queuedJobs?: number
  queuedFreeJobs?: number
  queMaxWaitTime?: number
  queMaxWaitTimeFree?: number
  runMaxWaitTime?: number
  runMaxWaitTimeFree?: number
  fees: ComputeEnvFeesStructure
  resources?: ComputeResource[]
  free?: ComputeEnvironmentFreeOptions
  platform?: RunningPlatform
}

export interface ComputeResult {
  filename: string
  filesize: number
  type: ComputeResultType
  index?: number
}

export type ComputeJobMetadata = {
  [key: string]: string | number | boolean
}

// GPU backend a device's metrics were sampled with. Only 'nvidia' (NVML) is emitted
// today; 'amd' / 'intel' are reserved for when those backends exist.
export type GpuVendor = 'nvidia' | 'amd' | 'intel'

// Per-GPU runtime metrics. One entry per GPU resource the job/service holds. Only NVIDIA
// is emitted today; `null` (not `0`) means the backend could not read that metric.
export interface GpuMetricsSnapshot {
  resourceId: string
  vendor: GpuVendor
  utilizationPercent: number | null
  memoryUsedBytes: number | null
  memoryTotalBytes: number | null
  temperatureC?: number
  powerWatts?: number
  shared?: boolean // true → device-level number, may include other jobs' load
}

// Best-effort Docker/NVML runtime metrics snapshot for a compute job or service container,
// as returned by COMPUTE_GET_STATUS / SERVICE_GET_STATUS when `includeMetrics` resolves to
// true. Sampled on a fixed cadence (node-side `C2D_METRICS_INTERVAL_SECONDS`), so values can
// be slightly stale — see `collectedAt`. Owner-only; never present on unauthenticated or
// listing responses.
export interface ContainerMetricsSnapshot {
  collectedAt: string // ISO timestamp of the sample
  containerState: {
    status: string // 'running' | 'exited' | ...
    startedAt?: string
    finishedAt?: string
    exitCode?: number
    oomKilled: boolean
    error?: string
    restartCount: number
    health?: string // Docker HEALTHCHECK status, when the image defines one (services)
  }
  cpu: {
    usagePercent: number // % of one host CPU-second per wall-second; can exceed 100
    allocated: number // cores requested (0 when unconstrained)
    usagePercentOfAllocated: number // usagePercent / allocated (0 when allocated is 0)
    cumulativeSeconds: number // total CPU-seconds consumed since start
    throttledPeriods: number // CFS quota throttling events
    throttledSeconds: number
  }
  memory: {
    usageBytes: number
    limitBytes: number
    usagePercent: number
    peakUsageBytes: number // max usageBytes observed across samples
  }
  disk: {
    usedBytes: number
    quotaBytes?: number // present only for jobs with a 'disk' resource
    usagePercent?: number // present only when quotaBytes is known
  }
  network?: { rxBytes: number; txBytes: number } // absent when NetworkMode 'none'
  blockIO: { readBytes: number; writeBytes: number }
  pids: { current: number; limit: number }
  gpu?: GpuMetricsSnapshot[]
}

export interface ComputeJob {
  owner: string
  did?: string
  jobId: string
  dateCreated: string
  dateFinished: string
  status: number
  statusText: string
  results: ComputeResult[]
  inputDID?: string[]
  algoDID?: string
  agreementId?: string
  expireTimestamp: number
  metadata?: ComputeJobMetadata
  terminationDetails?: {
    exitCode?: number
    OOMKilled?: boolean
  }
}

export interface ComputeJobPayment {
  chainId: number
  token: string
  lockTx: string | null
  claimTx: string | null
  cancelTx: string | null
  cost: number
}

export interface NodeComputeJob extends ComputeJob {
  environment?: string
  stopRequested?: boolean
  resources?: ComputeResourceRequest[]
  isFree?: boolean
  algoStartTimestamp?: string
  algoStopTimestamp?: string
  payment?: ComputeJobPayment
  algoDuration?: number
  queueMaxWaitTime?: number
  jobIdHash?: string
  maxJobDuration?: number
  // Best-effort Docker/NVML runtime metrics, present only when computeStatus() was called
  // with includeMetrics resolving to true for the authenticated job owner.
  runtimeMetrics?: ContainerMetricsSnapshot
}

export interface ComputeOutputEncryption {
  encryptMethod: EncryptMethod.AES // in future we will support more ciphers
  key: string // AES symetric key
}

export interface ComputeOutput {
  remoteStorage?: StorageObject
  encryption?: ComputeOutputEncryption
}

export interface ComputeAsset {
  fileObject?: StorageObject // C2D v2
  documentId: string
  serviceId: string
  transferTxId?: string
  userdata?: { [key: string]: any }
}

export interface ExtendedMetadataAlgorithm extends MetadataAlgorithm {
  container: {
    // retain existing properties
    entrypoint: string
    image: string
    tag: string
    checksum: string
    dockerfile?: string // optional
    additionalDockerFiles?: { [key: string]: any }
    consumerParameters?: ConsumerParameter[]
  }
}

export interface ComputeAlgorithm {
  fileObject?: StorageObject // C2D v2
  documentId?: string
  serviceId?: string
  meta?: ExtendedMetadataAlgorithm
  transferTxId?: string
  algocustomdata?: { [key: string]: any }
  userdata?: { [key: string]: any }
  envs?: { [key: string]: string }
}

export interface ComputePayment {
  chainId: number
  token: string
  maxJobDuration: number
}

export interface ValidationResponse {
  isValid: boolean
  message: string
}

export interface dockerRegistryAuth {
  username?: string
  password?: string
  auth?: string
}

export type ComputeResultStream = AsyncIterable<Uint8Array>

/**
 * One resource dimension of a compute-provider search, e.g. `{ resource: 'cpu', value: 4 }`.
 * `resource` is deliberately an open string here too, matching the underlying capability
 * format — a caller can ask for a resource type this package has no built-in knowledge of
 * (`'fpga'`, `'pcie'`, anything a compute engine reports) and still get a well-typed request.
 */
export interface ComputeSearchDimension {
  resource: string
  value: number
}

/**
 * A typed request to `BaseProvider.findComputeProviders`. Built entirely from ordinary typed
 * values — never a hand-built JSON string, never a content id.
 */
export interface FindComputeProvidersRequest {
  free: boolean
  /** One entry per resource dimension. The result is the intersection of all of them. */
  resources: ComputeSearchDimension[]
  /**
   * Optional per-resource qualifier (e.g. `{ gpu: 'A100' }`) applied only at the verification
   * step, against a candidate's real compute environments. Never hashed and never part of a
   * lookup string — nothing that discriminates within a resource is.
   */
  models?: Record<string, string>
  signal?: AbortSignal
}

/**
 * A compute provider that announced a matching bucket for every requested dimension *and*
 * whose real compute environments (fetched during verification) actually satisfy the request.
 * `node` is directly usable as the `node` argument to other typed calls on this SDK's provider
 * client (e.g. `getComputeEnvironments`, `initializeCompute`).
 */
export interface ComputeProviderMatch {
  node: NodeP2P
  environments: ComputeEnvironment[]
}

/**
 * The outcome of one requested dimension's provider lookup, before verification and before it
 * is intersected with any other requested dimension. Carried on the result specifically so an
 * empty search is never a mystery — a caller can see exactly which dimension(s) had nothing,
 * instead of a single opaque empty list.
 */
export interface ComputeSearchDimensionResult {
  resource: string
  /** The value as requested, before bucketing. */
  value: number
  /** The bucket this dimension's lookup actually used. */
  bucket: number
  /** Provider ids that announced this bucket, before verification or intersection with other dimensions. */
  providerIds: string[]
  /** Set when this dimension's lookup ended early. `providerIds` is still real, just possibly incomplete. */
  partial?: true
  /** Present alongside `partial`, describing why the lookup ended early. */
  error?: string
}

/**
 * Result of `BaseProvider.findComputeProviders`. Always a typed value, even when nothing
 * matched — "nothing found" is a normal outcome here, never a thrown error.
 */
export interface FindComputeProvidersResult {
  /** Providers that satisfy every requested dimension, verified against their real environments. */
  providers: ComputeProviderMatch[]
  /** One entry per requested dimension, in request order. */
  dimensions: ComputeSearchDimensionResult[]
}
