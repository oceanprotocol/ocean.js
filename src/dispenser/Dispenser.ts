import defaultDispenserABI from '@oceanprotocol/contracts/artifacts/Dispenser.json'
import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'
import Web3 from 'web3'
import {
  SubscribablePromise,
  Logger,
  getFairGasPrice,
  setContractDefaults
} from '../utils'
import { DataTokens } from '../datatokens/Datatokens'
import Decimal from 'decimal.js'
import { ConfigHelperConfig } from '../utils/ConfigHelper'

export interface DispenserToken {
  active: boolean
  owner: string
  minterApproved: boolean
  isTrueMinter: boolean
  maxTokens: string
  maxBalance: string
  balance: string
}

export enum DispenserMakeMinterProgressStep {
  // eslint-disable-next-line no-unused-vars
  MakeDispenserMinter,
  // eslint-disable-next-line no-unused-vars
  AcceptingNewMinter
}

export enum DispenserCancelMinterProgressStep {
  // eslint-disable-next-line no-unused-vars
  MakeOwnerMinter,
  // eslint-disable-next-line no-unused-vars
  AcceptingNewMinter
}

export class OceanDispenser {
  public GASLIMIT_DEFAULT = 1000000
  /** Ocean related functions */
  public dispenserAddress: string
  public dispenserABI: AbiItem | AbiItem[]
  public web3: Web3
  public contract: Contract = null
  private logger: Logger
  public datatokens: DataTokens
  public startBlock: number
  private config: ConfigHelperConfig

  /**
   * Instantiate Dispenser
   * @param {any} web3
   * @param {String} dispenserAddress
   * @param {any} dispenserABI
   */
  constructor(
    web3: Web3,
    logger: Logger,
    dispenserAddress: string = null,
    dispenserABI: AbiItem | AbiItem[] = null,
    datatokens: DataTokens,
    config?: ConfigHelperConfig
  ) {
    this.web3 = web3
    this.config = config
    this.dispenserAddress = dispenserAddress
    this.startBlock = (config && config.startBlock) || 0
    this.dispenserABI = dispenserABI || (defaultDispenserABI.abi as AbiItem[])
    this.datatokens = datatokens
    if (web3)
      this.contract = setContractDefaults(
        new this.web3.eth.Contract(this.dispenserABI, this.dispenserAddress),
        this.config
      )
    this.logger = logger
  }

  /**
   * Get dispenser status for a datatoken
   * @param {String} dataTokenAddress
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async status(dataTokenAddress: string): Promise<DispenserToken> {
    try {
      const result: DispenserToken = await this.contract.methods
        .status(dataTokenAddress)
        .call()
      result.maxTokens = this.web3.utils.fromWei(result.maxTokens)
      result.maxBalance = this.web3.utils.fromWei(result.maxBalance)
      result.balance = this.web3.utils.fromWei(result.balance)
      return result
    } catch (e) {
      this.logger.warn(`No dispenser available for data token: ${dataTokenAddress}`)
    }
    return null
  }

  /**
   * Activates a new dispener.
   * @param {String} dataToken
   * @param {Number} maxTokens max amount of tokens to dispense
   * @param {Number} maxBalance max balance of user. If user balance is >, then dispense will be rejected
   * @param {String} address User address (must be owner of the dataToken)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async activate(
    dataToken: string,
    maxTokens: string,
    maxBalance: string,
    address: string
  ): Promise<TransactionReceipt> {
    let estGas
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    try {
      estGas = await this.contract.methods
        .activate(
          dataToken,
          this.web3.utils.toWei(maxTokens),
          this.web3.utils.toWei(maxBalance)
        )
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    let trxReceipt = null
    try {
      trxReceipt = await this.contract.methods
        .activate(
          dataToken,
          this.web3.utils.toWei(maxTokens),
          this.web3.utils.toWei(maxBalance)
        )
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to activate dispenser: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Deactivates a dispener.
   * @param {String} dataToken
   * @param {String} address User address (must be owner of the dispenser)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async deactivate(
    dataToken: string,
    address: string
  ): Promise<TransactionReceipt> {
    let estGas
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    try {
      estGas = await this.contract.methods
        .deactivate(dataToken)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    let trxReceipt = null
    try {
      trxReceipt = await this.contract.methods.deactivate(dataToken).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    } catch (e) {
      this.logger.error(`ERROR: Failed to deactivate dispenser: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Make the dispenser minter of the datatoken
   * @param {String} dataToken
   * @param {String} address User address (must be owner of the datatoken)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public makeMinter(
    dataToken: string,
    address: string
  ): SubscribablePromise<DispenserMakeMinterProgressStep, TransactionReceipt> {
    return new SubscribablePromise(async (observer) => {
      observer.next(DispenserMakeMinterProgressStep.MakeDispenserMinter)
      let estGas
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      const minterTx = await this.datatokens.proposeMinter(
        dataToken,
        this.dispenserAddress,
        address
      )
      if (!minterTx) {
        return null
      }
      observer.next(DispenserMakeMinterProgressStep.AcceptingNewMinter)
      try {
        estGas = await this.contract.methods
          .acceptMinter(dataToken)
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }
      let trxReceipt = null
      try {
        trxReceipt = await this.contract.methods.acceptMinter(dataToken).send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      } catch (e) {
        this.logger.error(`ERROR: Failed to accept minter role: ${e.message}`)
      }
      return trxReceipt
    })
  }

  /**
   * Cancel minter role of dispenser and make the owner minter of the datatoken
   * @param {String} dataToken
   * @param {String} address User address (must be owner of the dispenser)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public cancelMinter(
    dataToken: string,
    address: string
  ): SubscribablePromise<DispenserCancelMinterProgressStep, TransactionReceipt> {
    return new SubscribablePromise(async (observer) => {
      observer.next(DispenserCancelMinterProgressStep.MakeOwnerMinter)
      let estGas
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      try {
        estGas = await this.contract.methods
          .removeMinter(dataToken)
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }
      let trxReceipt = null
      try {
        trxReceipt = await this.contract.methods.removeMinter(dataToken).send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      } catch (e) {
        this.logger.error(`ERROR: Failed to remove minter role: ${e.message}`)
      }
      if (!trxReceipt) {
        return null
      }
      observer.next(DispenserCancelMinterProgressStep.AcceptingNewMinter)
      const minterTx = await this.datatokens.approveMinter(dataToken, address)
      return minterTx
    })
  }

  /**
   * Request tokens from dispenser
   * @param {String} dataToken
   * @param {String} amount
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async dispense(
    dataToken: string,
    address: string,
    amount: string = '1'
  ): Promise<TransactionReceipt> {
    let estGas
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    try {
      estGas = await this.contract.methods
        .dispense(dataToken, this.web3.utils.toWei(amount))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    let trxReceipt = null
    try {
      trxReceipt = await this.contract.methods
        .dispense(dataToken, this.web3.utils.toWei(amount))
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to dispense tokens: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Withdraw all tokens from the dispenser (if any)
   * @param {String} dataToken
   * @param {String} address User address (must be owner of the dispenser)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async ownerWithdraw(
    dataToken: string,
    address: string
  ): Promise<TransactionReceipt> {
    let estGas
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    try {
      estGas = await this.contract.methods
        .ownerWithdraw(dataToken)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    let trxReceipt = null
    try {
      trxReceipt = await this.contract.methods.ownerWithdraw(dataToken).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    } catch (e) {
      this.logger.error(`ERROR: Failed to withdraw tokens: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Check if tokens can be dispensed
   * @param {String} dataToken
   * @param {String} address User address that will receive datatokens
   * @return {Promise<Boolean>}
   */
  public async isDispensable(
    dataToken: string,
    address: string,
    amount: string = '1'
  ): Promise<Boolean> {
    const status = await this.status(dataToken)
    if (!status) return false
    // check active
    if (status.active === false) return false
    // check maxBalance
    const userBalance = new Decimal(await this.datatokens.balance(dataToken, address))
    if (userBalance.greaterThanOrEqualTo(status.maxBalance)) return false
    // check maxAmount
    if (new Decimal(String(amount)).greaterThan(status.maxTokens)) return false
    // check dispenser balance
    const contractBalance = new Decimal(status.balance)
    if (contractBalance.greaterThanOrEqualTo(amount) || status.isTrueMinter === true)
      return true
    return false
  }
}
