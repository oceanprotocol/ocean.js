import { Metadata, MetadataAlgorithm } from './DDO/Metadata'

export type ComputeResultType =
  | 'algorithmLog'
  | 'output'
  | 'configrationLog'
  | 'publishLog'

export interface ComputeEnvironment {
  id: string
  cpuNumber: number
  cpuType: string
  gpuNumber: number
  gpuType: string
  ramGB: number
  diskGB: number
  priceMin: number
  desc: string
  currentJobs: number
  maxJobs: number
  consumerAddress: string
  storageExpiry: number
  maxJobDuration: number
  lastSeen: number
}

export interface ComputeResult {
  filename: string
  filesize: number
  type: ComputeResultType
  index?: number
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
}

export interface ComputeOutput {
  publishAlgorithmLog?: boolean
  publishOutput?: boolean
  providerAddress?: string
  providerUri?: string
  metadata?: Metadata
  metadataUri?: string
  nodeUri?: string
  owner?: string
  secretStoreUri?: string
  whitelist?: string[]
}

export interface ComputeAsset {
  documentId: string
  serviceId: string
  transferTxId?: string
  userdata?: { [key: string]: any }
}

export interface ComputeAlgorithm {
  documentId?: string
  serviceId?: string
  meta?: MetadataAlgorithm
  transferTxId?: string
  algocustomdata?: { [key: string]: any }
  userdata?: { [key: string]: any }
}
