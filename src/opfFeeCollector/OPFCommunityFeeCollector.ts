import defaultFeeCollectorABI from '@oceanprotocol/contracts/artifacts/FixedRateExchange.json'
import { TransactionReceipt } from 'web3-core'
import { Contract, EventData } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'
import Web3 from 'web3'
import { SubscribablePromise, Logger, getFairGasPrice } from '../utils'


// export interface FixedPriceExchange {
//   exchangeID?: string
//   exchangeOwner: string
//   dataToken: string
//   baseToken: string
//   fixedRate: string
//   active: boolean
//   supply: string
// }

// export interface FixedPriceSwap {
//   exchangeID: string
//   caller: string
//   baseTokenAmount: string
//   dataTokenAmount: string
// }

// export enum FixedRateCreateProgressStep {
//   CreatingExchange,
//   ApprovingDatatoken
// }

export class OPFCommunityFeeCollector {
  public GASLIMIT_DEFAULT = 1000000
  /** Ocean related functions */
 // public oceanAddress: string = null
  public feeCollectorAddress: string
  public feeCollectorABI: AbiItem | AbiItem[]
  public web3: Web3
  public contract: Contract = null
  private logger: Logger
 // public datatokens: DataTokens
 // public startBlock: number

  /**
   * Instantiate FixedRateExchange
   * @param {any} web3
   * @param {String} feeCollectorAddress
   * @param {any} feeCollectorABI
   * @param {String} oceanAddress
   */
  constructor(
    web3: Web3,
    logger: Logger,
    feeCollectorAddress: string = null,
    feeCollectorABI: AbiItem | AbiItem[] = null,
   // oceanAddress: string = null,
   // datatokens: DataTokens,
   // startBlock?: number
  ) {
    this.web3 = web3
    this.feeCollectorAddress = feeCollectorAddress
    this.feeCollectorABI =
    feeCollectorABI || (defaultFeeCollectorABI.abi as AbiItem[])
   // this.oceanAddress = oceanAddress
  //  this.datatokens = datatokens
    if (web3)
      this.contract = new this.web3.eth.Contract(
        this.feeCollectorABI,
        this.feeCollectorAddress
      )
    this.logger = logger
  }

  /** Convert from wei
   * @param {String} amount
   * @return {Promise<string>} string
   */
  public fromWei(amount: string): string {
    return this.web3.utils.fromWei(amount)
  }

  
  /**
   * Set new rate
   * @param {String} exchangeId ExchangeId
   * @param {Number} newRate New rate
   * @param {String} address User account
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async withdrawToken(
    // exchangeId: string,
    // newRate: number,
    tokenAddress: string,
    address:string
  ): Promise<TransactionReceipt> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.contract.methods
        .withdrawToken(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await this.contract.methods
      .withdrawToken(tokenAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    return trxReceipt
  }

  /**
   * Activate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async changeCollector(
    newCollector: string,
    address: string
  ): Promise<TransactionReceipt> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.contract.methods
        .changeCollector(newCollector)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await this.contract.methods.changeCollector(newCollector).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })
    return trxReceipt
  }

  /**
   * Send ETH to collector
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async withdrawETH(
    address: string
  ): Promise<TransactionReceipt> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.contract.methods
        .withdrawETH()
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await this.contract.methods.withdrawETH().send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })
    return trxReceipt
  }

 
}
