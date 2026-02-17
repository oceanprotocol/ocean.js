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

export interface ServiceEndpoint {
  serviceName: string
  method: string
  urlPath: string
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
  GET_P2P_PEER: 'getP2PPeer',
  GET_P2P_PEERS: 'getP2PPeers',
  GET_P2P_NETWORK_STATS: 'getP2PNetworkStats',
  FIND_PEER: 'findPeer',
  CREATE_AUTH_TOKEN: 'createAuthToken',
  INVALIDATE_AUTH_TOKEN: 'invalidateAuthToken',
  FETCH_CONFIG: 'fetchConfig',
  PUSH_CONFIG: 'pushConfig',
  GET_LOGS: 'getLogs',
  JOBS: 'jobs'
}