import { type Multiaddr } from '@multiformats/multiaddr'
import { Signer } from 'ethers'
import type { PeerId } from '@libp2p/interface'
import type { AccessList } from './AccessList.js'
export interface ProviderFees {
  providerFeeAddress: string
  providerFeeToken: string
  providerFeeAmount: string
  v: string
  r: string
  s: string
  providerData: string
  validUntil: string
}

export interface ProviderInitialize {
  datatoken: string
  nonce: string
  computeAddress: string
  providerFee: ProviderFees
}

export interface ProviderComputeInitialize {
  datatoken?: string
  validOrder?: string
  providerFee?: ProviderFees
}

export interface ProviderComputeInitializePayment {
  escrowAddress: string
  chainId: number
  payee: string
  token: string
  amount: number
  minLockSeconds: number
}

export interface ProviderComputeInitializeResults {
  algorithm?: ProviderComputeInitialize
  datasets?: ProviderComputeInitialize[]
  payment?: ProviderComputeInitializePayment
}

export interface NodeP2P {
  nodeId: string
  multiaddress?: Multiaddr[]
}
export type OceanNode = string | NodeP2P | PeerId

export interface NodeStatusProvider {
  chainId: string
  network: string
}

export interface NodeStatusIndexer {
  chainId: string
  network: string
  block: string
}

export interface NodeStatusMaintenance {
  enabled: boolean
  /** Detailed status only: compute jobs still running while draining. */
  runningComputeJobs?: number
  /** Detailed status only: services still running while draining. */
  runningServices?: number
  /** Detailed status only: unix seconds, drain ETA. */
  latestExpectedEndTime?: number
}

/**
 * Node auth-token policy, read from `status.authTokenPolicy` (companion node plan §17.2). Lets a
 * client discover what a node requires/accepts before minting or presenting a token.
 */
export interface AuthTokenPolicy {
  /** seconds — hard cap on token lifetime; clients cap `validUntil` to this. */
  maxTokenLifetime: number
  /** 'disabled' = foreign tokens rejected; 'allowlist' = honored only from `trustedIssuers`. */
  crossNode: 'disabled' | 'allowlist'
  /** present only when crossNode === 'allowlist' — the issuer peerIds this node honors. */
  trustedIssuers?: string[]
  /** behaviour when a token's issuer is unreachable. */
  revocationFallback: 'closed' | 'cache' | 'open'
  /** seconds; present only when revocationFallback === 'cache'. */
  softFailGrace?: number
  /** OJ-03: node supports the status clientChallenge / signedChallenge proof-of-possession. */
  challengeSupported: true
}

export interface NodeStatus {
  id: string
  publicKey: string
  friendlyName: string
  address: string
  version: string
  http: boolean
  p2p: boolean
  /**
   * OJ-03: present only when the status request included a `clientChallenge`. The node's
   * libp2p-identity-key signature (0x-hex) over utf8(STATUS_CHALLENGE_DOMAIN + clientChallenge),
   * proving control of the key the peerId commits to. Verify with {@link verifyNodeChallenge}.
   */
  signedChallenge?: string
  /** Node auth-token policy (plan §17.2). Absent on nodes that predate scoped tokens. */
  authTokenPolicy?: AuthTokenPolicy
  provider: NodeStatusProvider[]
  indexer: NodeStatusIndexer[]
  escrowAddress: Record<string, string>
  /** chainId -> subsidy-provider contract addresses the node applies. Absent on older nodes. */
  subsidyProviders?: Record<string, string[]>
  /**
   * When true, a caller-supplied `subsidyProviders` list must be a subset of the node's
   * `subsidyProviders` for the chain (the node rejects the request otherwise). Absent on older nodes.
   */
  subsidyProviderFilter?: boolean
  /**
   * Per-provider-contract image allowlist (provider address -> allowed docker refs). A provider
   * only subsidizes a job whose image matches; `{}` / absent = unrestricted. Absent on older nodes.
   */
  subsidyProviderAllowedImages?: Record<string, string[]>
  /** Maintenance (drain) mode. Absent on nodes that predate the feature. */
  maintenance?: NodeStatusMaintenance
  supportedStorage: Record<string, boolean>
  platform: {
    cpus: number
    freemem: number
    totalmem: number
    loadavg: number[]
    arch: string
    machine: string
    platform: string
    osType: string
    node: string
  }
  codeHash: string
  allowedAdmins: {
    addresses: string[]
    accessLists: string[] | null
  }
  uptime: number
  persistentStorage?: {
    accessLists?: AccessList[]
    // Whether the node honours bucket access lists. When false (the node default), only a
    // bucket's owner can use it and creating a bucket with accessLists is rejected. Absent on
    // nodes that predate the setting, which always honour access lists.
    allowBucketSharing?: boolean
  }
}

/**
 * Shapes for the per-node resource metrics API (`getNodeMetrics` /
 * `getNodeMetricsHistory`). These mirror the `@types/nodeMetrics.ts` types on the ocean-node
 * side, so the client payload and the node response have an identical shape.
 */
export interface NodeMetricsGpu {
  resourceId: string
  vendor?: string
  utilizationPercent?: number
  memoryUsedBytes?: number
  memoryTotalBytes?: number
  temperatureC?: number
  powerWatts?: number
}

export interface NodeMetricsEnvResource {
  env: string
  resource: string
  total: number
  inUse: number
}

export interface NodeMetricsSnapshot {
  // epoch ms when the snapshot was assembled
  collectedAt: number
  // Freshness signal: false means NO engine had a fresh compute aggregate, so every scalar
  // below is a structural zero rather than a genuine reading.
  hasAggregate: boolean
  cpu: {
    usagePercent: number
    coresAllocated: number
    hostCores: number
    throttledCount: number
    loadAverage: number[]
  }
  memory: {
    usedBytes: number
    limitBytes: number
    hostFreeBytes: number
    hostTotalBytes: number
  }
  disk: {
    usedBytes: number
  }
  network: {
    rxBytes: number
    txBytes: number
  }
  jobs: {
    running: number
    runningFree: number
    queued: number
    queuedFree: number
  }
  gpu: NodeMetricsGpu[]
  env: NodeMetricsEnvResource[]
  meta: {
    sampledContainers: number
    oldestSampleAgeSeconds: number
  }
}

/**
 * One hourly bucket returned by `getNodeMetricsHistory`. Scalars are arithmetic means over the
 * hour's samples; `sampleCount` is how many minute-samples fed the average.
 */
export interface NodeMetricsHourly {
  // epoch ms of the floored UTC hour this bucket covers
  hourStart: number
  sampleCount: number
  cpu: {
    usagePercent: number
    coresAllocated: number
    hostCores: number
    throttledCount: number
  }
  memory: {
    usedBytes: number
    limitBytes: number
    hostFreeBytes: number
    hostTotalBytes: number
  }
  disk: {
    usedBytes: number
  }
  network: {
    rxBytes: number
    txBytes: number
  }
  jobs: {
    running: number
    runningFree: number
    queued: number
    queuedFree: number
  }
  gpu: NodeMetricsGpu[]
  env: NodeMetricsEnvResource[]
  meta: {
    sampledContainers: number
  }
}

export interface NodeMetricsHistoryResult {
  startTime: number
  stopTime: number
  count: number
  buckets: NodeMetricsHourly[]
}

export interface UserCustomParameters {
  [key: string]: any
}

export const PROTOCOL_COMMANDS = {
  DOWNLOAD: 'download',
  ENCRYPT: 'encrypt',
  ENCRYPT_FILE: 'encryptFile',
  DECRYPT_DDO: 'decryptDDO',
  GET_DDO: 'getDDO',
  QUERY: 'query',
  NONCE: 'nonce',
  STATUS: 'status',
  DETAILED_STATUS: 'detailedStatus',
  FIND_DDO: 'findDDO',
  GET_FEES: 'getFees',
  FILE_INFO: 'fileInfo',
  VALIDATE_DDO: 'validateDDO',
  COMPUTE_GET_ENVIRONMENTS: 'getComputeEnvironments',
  COMPUTE_START: 'startCompute',
  FREE_COMPUTE_START: 'freeStartCompute',
  COMPUTE_STOP: 'stopCompute',
  COMPUTE_GET_STATUS: 'getComputeStatus',
  COMPUTE_GET_STREAMABLE_LOGS: 'getComputeStreamableLogs',
  COMPUTE_GET_RESULT: 'getComputeResult',
  COMPUTE_INITIALIZE: 'initializeCompute',
  STOP_NODE: 'stopNode',
  STOP_JOB: 'stopJob',
  REINDEX_TX: 'reindexTx',
  REINDEX_CHAIN: 'reindexChain',
  HANDLE_INDEXING_THREAD: 'handleIndexingThread',
  COLLECT_FEES: 'collectFees',
  POLICY_SERVER_PASSTHROUGH: 'PolicyServerPassthrough',
  POLICY_SERVER_INITIALIZE: 'PolicyServerInitialize',
  GET_P2P_PEER: 'getP2PPeer',
  GET_P2P_PEERS: 'getP2PPeers',
  GET_P2P_NETWORK_STATS: 'getP2PNetworkStats',
  GET_NODE_METRICS: 'getNodeMetrics',
  GET_NODE_METRICS_HISTORY: 'getNodeMetricsHistory',
  FIND_PEER: 'findPeer',
  CREATE_AUTH_TOKEN: 'createAuthToken',
  INVALIDATE_AUTH_TOKEN: 'invalidateAuthToken',
  VALIDATE_AUTH_TOKEN: 'validateAuthToken',
  FETCH_CONFIG: 'fetchConfig',
  PUSH_CONFIG: 'pushConfig',
  GET_LOGS: 'getLogs',
  SET_MAINTENANCE: 'setMaintenance',
  JOBS: 'jobs',
  PERSISTENT_STORAGE_CREATE_BUCKET: 'persistentStorageCreateBucket',
  PERSISTENT_STORAGE_UPDATE_BUCKET: 'persistentStorageUpdateBucket',
  PERSISTENT_STORAGE_GET_BUCKETS: 'persistentStorageGetBuckets',
  PERSISTENT_STORAGE_LIST_FILES: 'persistentStorageListFiles',
  PERSISTENT_STORAGE_UPLOAD_FILE: 'persistentStorageUploadFile',
  PERSISTENT_STORAGE_GET_FILE_OBJECT: 'persistentStorageGetFileObject',
  PERSISTENT_STORAGE_DELETE_FILE: 'persistentStorageDeleteFile',
  PERSISTENT_STORAGE_DOWNLOAD_FILE: 'persistentStorageDownloadFile',
  SERVICE_GET_TEMPLATES: 'serviceGetTemplates',
  SERVICE_START: 'serviceStart',
  SERVICE_STOP: 'serviceStop',
  SERVICE_RESTART: 'serviceRestart',
  SERVICE_GET_STATUS: 'serviceGetStatus',
  SERVICE_LIST: 'serviceList',
  SERVICE_EXTEND: 'serviceExtend',
  SERVICE_GET_STREAMABLE_LOGS: 'serviceGetStreamableLogs',
  GET_ESCROW_EVENTS: 'getEscrowEvents',
  SERVICE_GET_RESULT: 'serviceGetResult'
}

export interface NodeLogsParams {
  logId?: string
  startTime?: string
  endTime?: string
  maxLogs?: number
  moduleName?: string
  level?: string
  page?: number
}

export interface NodeLogEntry {
  timestamp: string
  level: string
  moduleName: string
  message: string
  meta?: Record<string, any>
}

export interface CompleteSignature {
  consumerAddress: string
  nonce: string
  signature: string
}

export type SignerOrAuthTokenOrSignature = string | Signer | CompleteSignature

// ──────────────────────────────────────────────────────────────────────────────────────────
// Scoped auth tokens (companion node plan; ocean.js plan §4 / §9 / §10)
// ──────────────────────────────────────────────────────────────────────────────────────────

/** Sentinel to opt a token OUT of the node-scoped default audience (mint an UNRESTRICTED token). */
export const UNRESTRICTED_AUDIENCE = 'any'

/**
 * Options for {@link Provider.generateAuthToken}. All optional, but when any of audience/scope is
 * set (or when the node-scoped default applies) a `validUntil` is REQUIRED and must be signed —
 * ocean.js does not default it (approved breaking change, plan §10.1).
 */
export interface AuthTokenOptions {
  /**
   * Node peerIds the token may be used at. Omitted ⇒ ocean.js defaults to `[verifiedIssuerPeerId]`
   * (node-scoped, secure by default). Pass {@link UNRESTRICTED_AUDIENCE} to opt out (unrestricted,
   * a reusable network-wide bearer). An explicit `[]` is rejected.
   */
  audience?: string[] | typeof UNRESTRICTED_AUDIENCE
  /** Protocol commands the token may perform (PROTOCOL_COMMANDS values). Omitted ⇒ any command. */
  scope?: string[]
  /** Absolute expiry, epoch-milliseconds integer. REQUIRED for every v2 token. */
  validUntil?: number
  /**
   * Escape hatch for talking to pre-OJ-03 nodes: when true, skip the issuer identity challenge and
   * trust the status `id`. OFF by default; per-call only (never a global/env default). Reintroduces
   * OJ-03 risk — logged loudly. (plan §8.1 / §11 L1)
   */
  allowUnverifiedIssuer?: boolean
}

/** Command category for the user-facing catalog. */
export type CommandCategory =
  | 'data'
  | 'compute'
  | 'service'
  | 'storage'
  | 'auth'
  | 'admin'
  | 'p2p'
  | 'status'
  | 'other'

/** One entry of the scope-UX command catalog (plan §9.2). */
export interface CommandInfo {
  /** PROTOCOL_COMMANDS value, e.g. 'download'. */
  command: string
  /** one-line human description. */
  description: string
  /** may appear in an auth-token scope (false ⇒ in TOKEN_SCOPE_DISALLOWED). */
  scopable: boolean
  category: CommandCategory
  /** true for the two read-only admin commands (fetchConfig, getLogs). */
  adminReadonly?: boolean
  /** false for commands that reject bearer tokens entirely (mutating admin, decryptDDO). */
  tokenAuth?: boolean
}

/**
 * Commands that may NOT appear in an auth-token `scope` — the client-side mirror of the node's
 * `DISALLOWED_TOKEN_SCOPE_COMMANDS`. No shared package: keep in sync by hand with ocean-node
 * `src/utils/constants.ts`. `fetchConfig`/`getLogs` are NOT here (they are scopable).
 */
export const TOKEN_SCOPE_DISALLOWED: string[] = [
  PROTOCOL_COMMANDS.DECRYPT_DDO,
  PROTOCOL_COMMANDS.STOP_NODE,
  PROTOCOL_COMMANDS.STOP_JOB,
  PROTOCOL_COMMANDS.REINDEX_TX,
  PROTOCOL_COMMANDS.REINDEX_CHAIN,
  PROTOCOL_COMMANDS.HANDLE_INDEXING_THREAD,
  PROTOCOL_COMMANDS.COLLECT_FEES,
  PROTOCOL_COMMANDS.PUSH_CONFIG,
  PROTOCOL_COMMANDS.SET_MAINTENANCE,
  PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN,
  PROTOCOL_COMMANDS.INVALIDATE_AUTH_TOKEN,
  PROTOCOL_COMMANDS.VALIDATE_AUTH_TOKEN
]
