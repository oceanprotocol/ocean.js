import { MetaData } from './MetadataInterfaces'

export type ServiceType = 'authorization' | 'metadata' | 'access' | 'compute'

export interface ServiceCommon {
    type: ServiceType
    index: number
    serviceEndpoint?: string
    attributes: ServiceCommonAttributes
}

export interface ServiceCommonAttributes {
    main: { [key: string]: any }
    additionalInformation?: { [key: string]: any }
}

export interface ServiceAccessAttributes extends ServiceCommonAttributes {
    main: {
        creator: string
        name: string
        datePublished: string
        dtCost: number
        timeout: number
    }
}
export interface ServiceComputePrivacy {
    allowRawAlgorithm: boolean
    allowNetworkAccess: boolean
    trustedAlgorithms: string[]
}

export interface ServiceComputeAttributes extends ServiceCommonAttributes {
    main: {
        creator: string
        datePublished: string
        price: string
        timeout: number
        provider?: ServiceComputeProvider
        name: string
        privacy?: ServiceComputePrivacy
    }
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
            price: string
            cpu: string
            gpu: string
            memory: string
            disk: string
            maxExecutionTime: number
        }[]
    }
}

export interface ServiceMetadata extends ServiceCommon {
    type: 'metadata'
    attributes: MetaData
}

export interface ServiceAccess extends ServiceCommon {
    type: 'access'
    templateId?: string
    attributes: ServiceAccessAttributes
}

export interface ServiceCompute extends ServiceCommon {
    type: 'compute'
    templateId?: string
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
