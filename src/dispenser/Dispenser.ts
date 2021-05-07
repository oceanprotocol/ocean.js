import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'

import defaultDispenserABI from '@oceanprotocol/contracts/artifacts/Dispenser.json'
import defaultDatatokensABI from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
import { Logger, getFairGasPrice } from '../utils'
import { TransactionReceipt } from 'web3-core'
import BigNumber from 'bignumber.js'
import Decimal from 'decimal.js'

/**
 * Provides an interface to Dispenser
 */
export class Dispenser {
  public GASLIMIT_DEFAULT = 1000000
  public dispenserAddress: string
  public dispenserABI: AbiItem | AbiItem[]
  public datatokensABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number
  /**
   * Instantiate DataTokens (independently of Ocean).
   * @param {String} factoryAddress
   * @param {AbiItem | AbiItem[]} factoryABI
   * @param {AbiItem | AbiItem[]} datatokensABI
   * @param {Web3} web3
   */
  constructor(
    dispenserAddress: string,
    dispenserABI: AbiItem | AbiItem[],
    datatokensABI: AbiItem | AbiItem[],
    web3: Web3,
    logger: Logger,
    startBlock?: number
  ) {
    this.dispenserAddress = dispenserAddress
    this.dispenserABI = dispenserABI || (defaultDispenserABI.abi as AbiItem[])
    this.datatokensABI = datatokensABI || (defaultDatatokensABI.abi as AbiItem[])
    this.web3 = web3
    this.logger = logger
    this.startBlock = startBlock || 0
  }
}
