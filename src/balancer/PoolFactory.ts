import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { Logger } from '../utils'
import jsonFactoryABI from '@oceanprotocol/contracts/artifacts/BFactory.json'
import { TransactionReceipt } from 'web3-core'

export class PoolFactory {
  public GASLIMIT_DEFAULT = 1000000
  public web3: Web3 = null
  public factoryABI: AbiItem | AbiItem[]
  public factoryAddress: string
  public logger: Logger

  constructor(
    web3: Web3,
    logger: Logger,
    factoryABI: AbiItem | AbiItem[] = null,
    factoryAddress: string = null
  ) {
    this.web3 = web3

    if (factoryABI) this.factoryABI = factoryABI
    else this.factoryABI = jsonFactoryABI.abi as AbiItem[]
    if (factoryAddress) {
      this.factoryAddress = factoryAddress
    }
    this.logger = logger
  }

  /**
   * Creates a new pool
   */
  async createPool(account: string): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    if (this.factoryAddress === null) {
      this.logger.error('ERROR: bfactoryAddress is null')
      return null
    }

    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress, {
      from: account
    })
    let txid = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await factory.methods
        .newBPool()
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas newBPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      txid = await factory.methods.newBPool().send({ from: account, gas: estGas + 1 })
      // pooladdress = transactiondata.events.BPoolRegistered.returnValues[0]
    } catch (e) {
      this.logger.error(`ERROR: Failed to create new pool: ${e.message}`)
    }
    return txid
  }
}
