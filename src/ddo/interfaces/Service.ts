import { Metadata } from './Metadata'
import { Status } from './Status'

export interface ServiceCustomParameter {
  name: string
  type: string
  label: string
  required: boolean
  options?: any
  description: string
}

export interface ServiceCustomParametersRequired {
  userCustomParameters?: ServiceCustomParameter[]
  algoCustomParameters?: ServiceCustomParameter[]
}

export type ServiceType = 'authorization' | 'metadata' | 'access' | 'compute'

export interface ServiceCommonAttributes extends ServiceCustomParametersRequired {
  main: { [key: string]: any }
  additionalInformation?: { [key: string]: any }
  status?: Status
}

export interface ServiceCommon {
  type: ServiceType
  index: number
  serviceEndpoint?: string
  attributes: ServiceCommonAttributes
}

export interface ServiceAccessAttributes extends ServiceCommonAttributes {
  main: {
    creator: string
    name: string
    datePublished: string
    cost: string
    timeout: number
  }
}

export interface publisherTrustedAlgorithm {
  did: string
  filesChecksum: string
  containerSectionChecksum: string
}

export interface ServiceComputePrivacy {
  allowRawAlgorithm?: boolean
  allowNetworkAccess?: boolean
  allowAllPublishedAlgorithms?: boolean
  publisherTrustedAlgorithms?: publisherTrustedAlgorithm[]
}

export interface ServiceComputeProvider {
  type: string
  description: string
  environment: {
    cluster: {
      type: string
      url: string
    }
    supportedContainers: {
      image: string
      tag: string
      checksum: string
    }[]
    supportedServers: {
      serverId: string
      serverType: string
      cost: string
      cpu: string
      gpu: string
      memory: string
      disk: string
      maxExecutionTime: number
    }[]
  }
}

export interface ServiceComputeAttributes extends ServiceCommonAttributes {
  main: {
    creator: string
    datePublished: string
    cost: string
    timeout: number
    provider?: ServiceComputeProvider
    name: string
    privacy?: ServiceComputePrivacy
  }
}

export interface ServiceMetadata extends ServiceCommon {
  type: 'metadata'
  attributes: Metadata
}

export interface ServiceAccess extends ServiceCommon {
  type: 'access'
  attributes: ServiceAccessAttributes
}

export interface ServiceCompute extends ServiceCommon {
  type: 'compute'
  attributes: ServiceComputeAttributes
}

export type Service<T extends ServiceType | 'default' = 'default'> = T extends 'metadata'
  ? ServiceMetadata
  : T extends 'access'
  ? ServiceAccess
  : T extends 'compute'
  ? ServiceCompute
  : T extends 'default'
  ? ServiceCommon
  : ServiceCommon
