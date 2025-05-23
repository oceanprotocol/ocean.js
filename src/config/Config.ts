import { AbiItem } from '../@types'
import { LogLevel } from '../utils'

type SDK = 'evm' | 'oasis'

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
   * Ocean Node URL.
   * @type {string}
   */
  public oceanNodeUri?: string

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
  public nftFactoryAddress?: string

  /**
   * Router Factory address
   * @type {string}
   */
  public routerFactoryAddress?: string

  /**
   * datatokens ABI
   * @type {string}
   */
  public datatokensABI?: AbiItem | AbiItem[]

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
   * OPFCommunityFeeCollector
   * @type {string}
   */
  public opfCommunityFeeCollector?: string

  /**
   * SideStaking address
   * @type {string}
   */
  public sideStakingAddress?: string

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

  /**
   * Parity config
   * @type {string}
   */
  public parityUri?: string

  public threshold?: number

  /**
   * Chain ID
   * @type {number}
   */
  chainId: number

  /**
   * Network name ex: mainnet, goerli, polygon
   * @type {string}
   */
  network: string

  /**
   * Url of the  blockchain exporer ex: https://etherscan.io
   * @type {string}
   */
  explorerUri: string

  /**
   * Ocean toke symbol on the chain, it's used just for convenience to reduce number of calls
   * @type {string}
   */
  oceanTokenSymbol: string

  /**
   * Specify the transaction Block Timeout
   * @type {number}
   */
  transactionBlockTimeout: number

  /**
   * Specify the transaction Confirmation Blocks
   * @type {number}
   */
  transactionConfirmationBlocks: number

  /**
   * Specify the transaction Polling Blocks Timeout
   * @type {number}
   */
  transactionPollingTimeout: number

  /**
   * Specify the multiplier for the gas fee
   * @type {number}
   */
  gasFeeMultiplier: number

  veAllocate?: string
  veOCEAN?: string
  veDelegation?: string
  veFeeDistributor?: string
  veDelegationProxy?: string
  DFRewards?: string
  DFStrategyV1?: string
  veFeeEstimate?: string

  // is confidential evm
  sdk?: SDK
  accessListFactory?: string
}
