import { Metadata, MetadataAlgorithm } from '.'

export type ComputeResultType =
  | 'algorithmLog'
  | 'output'
  | 'configrationLog'
  | 'publishLog'

// OLD V1 ComputeEnvironment specs
// export interface ComputeEnvironment {
//   id: string
//   cpuNumber: number
//   cpuType: string
//   gpuNumber: number
//   gpuType: string
//   ramGB: number
//   diskGB: number
//   priceMin: number
//   desc: string
//   currentJobs: number
//   maxJobs: number
//   consumerAddress: string
//   storageExpiry: number
//   maxJobDuration: number
//   lastSeen: number
//   free: boolean
// }

// new V2 C2D Compute Environment specs
export interface RunningPlatform {
  architecture: string
  os: string
}

export type ComputeResourceType = 'cpu' | 'memory' | 'storage'

export interface ComputeResourcesPricingInfo {
  type: ComputeResourceType
  price: number
}
export interface ComputeEnvFees {
  feeToken: string
  prices: ComputeResourcesPricingInfo[]
}
export interface ComputeEnvFeesStructure {
  [chainId: string]: ComputeEnvFees
}
export interface ComputeEnvironment {
  id: string
  // legacy
  // cpuNumber: number
  // cpuType: string
  // gpuNumber: number
  // gpuType: string
  // ramGB: number
  // diskGB: number
  // priceMin: number
  totalCpu: number // total cpu available for jobs
  maxCpu: number // max cpu for a single job.  Imagine a K8 cluster with two nodes, each node with 10 cpus.  Total=20, but at most you can allocate 10 cpu for a job
  totalRam: number // total gb of RAM
  maxRam: number // max allocatable GB RAM for a single job.
  maxDisk: number // max GB of disck allocatable for a single job
  fees: ComputeEnvFeesStructure
  // legacy
  description: string
  currentJobs: number
  maxJobs: number
  consumerAddress: string
  storageExpiry: number
  maxJobDuration: number
  lastSeen: number
  free: boolean
  platform?: RunningPlatform[] // array due to k8 support
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

export enum FileObjectType {
  URL = 'url',
  IPFS = 'ipfs',
  ARWEAVE = 'arweave'
}

export enum EncryptMethod {
  AES = 'AES',
  ECIES = 'ECIES'
}

export interface HeadersObject {
  [key: string]: string
}

export interface BaseFileObject {
  type: string
  encryptedBy?: string
  encryptMethod?: EncryptMethod
}

export interface UrlFileObject extends BaseFileObject {
  url: string
  method: string
  headers?: [HeadersObject]
}

export interface IpfsFileObject extends BaseFileObject {
  hash: string
}

export interface ArweaveFileObject extends BaseFileObject {
  transactionId: string
}
export interface ComputeAsset {
  fileObject?: BaseFileObject // C2D v2
  documentId: string
  serviceId: string
  transferTxId?: string
  userdata?: { [key: string]: any }
}

export interface ComputeAlgorithm {
  fileObject?: BaseFileObject // C2D v2
  documentId?: string
  serviceId?: string
  meta?: MetadataAlgorithm
  transferTxId?: string
  algocustomdata?: { [key: string]: any }
  userdata?: { [key: string]: any }
}

export interface ComputeResourceRequest {
  id: string
  amount: number
}
