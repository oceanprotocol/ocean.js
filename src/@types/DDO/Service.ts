import { ConsumerParameter } from './ConsumerParameter'
import { Credentials } from './Credentials'
import { LanguageValueObject } from './LanguageValueObject'
import { RemoteObject } from './RemoteObject'
import { State } from './State'

export interface PublisherTrustedAlgorithm {
  /**
   * The DID of the algorithm which is trusted by the publisher.
   * @type {string}
   */
  did: string

  /**
   * Hash of algorithm’s files section.
   * @type {string}
   */
  filesChecksum: string

  /**
   * Hash of algorithm’s metadata.algorithm.container section.
   * @type {string}
   */
  containerSectionChecksum: string
}

export interface ServiceComputeOptions {
  /**
   * If true, any passed raw text will be allowed to run.
   * Useful for an algorithm drag & drop use case, but increases risk of data escape through malicious user input.
   * Should be false by default in all implementations.
   * @type {boolean}
   */
  allowRawAlgorithm: boolean

  /**
   * If true, the algorithm job will have network access.
   * @type {boolean}
   */
  allowNetworkAccess: boolean

  /**
   * If empty, then any published algorithm is allowed.
   * Otherwise, only published algorithms by some publishers are allowed
   * @type {string[]}
   */
  publisherTrustedAlgorithmPublishers: string[]

  /**
   * If empty, then any published algorithm is allowed. (see below)
   * @type {PublisherTrustedAlgorithm[]}
   */
  publisherTrustedAlgorithms: PublisherTrustedAlgorithm[]
}

export interface Service {
  /**
   * Unique ID
   * @type {string}
   */
  id: string

  /**
   * Type of service (access, compute, wss.
   * @type {string}
   */
  type: 'access' | 'compute' | string

  /**
   * Encrypted file URLs.
   * @type {string}
   */
  files: string

  /**
   * Datatoken address
   * @type {string}
   */
  datatokenAddress: string

  /**
   * Provider URL (schema + host).
   * @type {string}
   */
  serviceEndpoint: string

  /**
   * Describes the credentials needed to access a service
   * @type {Credentials}
   */
  credentials?: Credentials

  /**
   * Describing how long the service can be used after consumption is initiated.
   * @type {number}
   */
  timeout: number

  /**
   * Service friendly name
   * @type {string}
   */
  name?: string

  /**
   * Service description
   * @type {string | LanguageValueObject}
   */
  description?: string | LanguageValueObject

  /**
   * If service is of type compute, holds information about the compute-related privacy settings & resources.
   * @type {ServiceComputeOptions}
   */
  compute?: ServiceComputeOptions

  /**
   * Array of objects describing the consumer parameters
   * @type {ConsumerParameter[]}
   */
  consumerParameters?: ConsumerParameter[]

  /**
   * Stores service specific additional information, this is customizable by publisher
   * @type {any}
   */
  additionalInformation?: any

  /**
   * @type {LanguageValueObject}
   */
  displayName?: LanguageValueObject

  /**
   * Required if type asset
   * @type {RemoteObject}
   */
  dataSchema?: RemoteObject

  /**
   * Required if type algo
   * @type {RemoteObject}
   */
  inputSchema?: RemoteObject

  /**
   * Required if type algo
   * @type {RemoteObject}
   */
  outputSchema?: RemoteObject

  state?: State
}
