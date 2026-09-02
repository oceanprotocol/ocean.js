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

export interface NodeStatus {
  id: string
  publicKey: string
  friendlyName: string
  address: string
  version: string
  http: boolean
  p2p: boolean
  provider: NodeStatusProvider[]
  indexer: NodeStatusIndexer[]
  escrowAddress: Record<string, string>
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
  FETCH_CONFIG: 'fetchConfig',
  PUSH_CONFIG: 'pushConfig',
  GET_LOGS: 'getLogs',
  JOBS: 'jobs',
  PERSISTENT_STORAGE_CREATE_BUCKET: 'persistentStorageCreateBucket',
  PERSISTENT_STORAGE_UPDATE_BUCKET: 'persistentStorageUpdateBucket',
  PERSISTENT_STORAGE_GET_BUCKETS: 'persistentStorageGetBuckets',
  PERSISTENT_STORAGE_LIST_FILES: 'persistentStorageListFiles',
  PERSISTENT_STORAGE_UPLOAD_FILE: 'persistentStorageUploadFile',
  PERSISTENT_STORAGE_GET_FILE_OBJECT: 'persistentStorageGetFileObject',
  PERSISTENT_STORAGE_DELETE_FILE: 'persistentStorageDeleteFile',
  SERVICE_GET_TEMPLATES: 'serviceGetTemplates',
  SERVICE_START: 'serviceStart',
  SERVICE_STOP: 'serviceStop',
  SERVICE_RESTART: 'serviceRestart',
  SERVICE_GET_STATUS: 'serviceGetStatus',
  SERVICE_LIST: 'serviceList',
  SERVICE_EXTEND: 'serviceExtend',
  SERVICE_GET_STREAMABLE_LOGS: 'serviceGetStreamableLogs'
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
