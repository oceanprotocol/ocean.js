import { LogLevel } from '../utils/Logger'
import { AbiItem } from 'web3-utils/types'

export class Config {
  /**
   * Ethereum node URL.
   * @type {string}
   */
  public nodeUri?: string

  /**
   * Address of Provider.
   * @type {string}
   */
  public providerAddress?: string

  /**
   * Metadata Store URL.
   * @type {string}
   */
  public metadataCacheUri?: string

  /**
   * Provider URL.
   * @type {string}
   */
  public providerUri?: string

  /**
   * Role-based access control URL.
   * @type {string}
   */
  public rbacUri?: string

  /**
   * Web3 Provider.
   * @type {any}
   */
  public web3Provider?: any

  /**
   * Ocean Token address
   * @type {string}
   */
  public oceanTokenAddress?: string

  /**
   * Factory address
   * @type {string}
   */
  public factoryAddress?: string

  /**
   * Factory ABI
   * @type {string}
   */
  public factoryABI?: AbiItem | AbiItem[]

  /**
   * datatokens ABI
   * @type {string}
   */
  public datatokensABI?: AbiItem | AbiItem[]

  /**
   * Pool Factory address
   * @type {string}
   */
  public poolFactoryAddress?: string

  /**
   * Pool Factory ABI
   * @type {string}
   */
  public poolFactoryABI?: AbiItem | AbiItem[]

  /**
   * Pool ABI
   * @type {string}
   */
  public poolABI?: AbiItem | AbiItem[]

  /**
   * FixedRateExchangeAddress
   * @type {string}
   */
  public fixedRateExchangeAddress?: string

  /**
   * FixedRateExchangeAddressABI
   * @type {any}
   */
  public fixedRateExchangeAddressABI?: AbiItem | AbiItem[]

  /**
   * DispenserAddress
   * @type {string}
   */
  public dispenserAddress?: string

  /**
   * DispenserABI
   * @type {any}
   */
  public dispenserABI?: AbiItem | AbiItem[]

  /**
   * DDOContractAddress
   * @type {string}
   */
  public metadataContractAddress?: string

  /**
   * DDOContractABI
   * @type {any}
   */
  public metadataContractABI?: AbiItem | AbiItem[]
  /**
   * block number of the deployment
   * @type {number}
   */
  public startBlock?: number
  /**
   * Log level.
   * @type {boolean | LogLevel}
   */
  public verbose?: boolean | LogLevel

  /**
   * Message shown when the user creates its own token.
   * @type {string}
   */
  public authMessage?: string

  /**
   * Token expiration time in ms.
   * @type {number}
   */
  public authTokenExpiration?: number

  // Parity config
  public parityUri?: string

  public threshold?: number

  /**
   * HTTP request timeout
   * @type {number}
   */
  public requestTimeout?: number
}

export default Config
