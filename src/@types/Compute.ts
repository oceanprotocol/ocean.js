import { Metadata, MetadataAlgorithm, ConsumerParameter } from '@oceanprotocol/ddo-js'

export type ComputeResultType =
  | 'algorithmLog'
  | 'output'
  | 'configrationLog'
  | 'publishLog'

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
export interface ComputeEnvironment {
  id: string
  description?: string
  consumerAddress: string
  access?: ComputeEnvironmentAccessOptions
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
  fileObject?: BaseFileObject // C2D v2
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
