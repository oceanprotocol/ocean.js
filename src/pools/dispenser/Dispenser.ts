import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { Contract } from 'web3-eth-contract'
import { TransactionReceipt } from 'web3-eth'
import Decimal from 'decimal.js'
import defaultDispenserAbi from '../../artifacts/pools/dispenser/Dispenser.sol/Dispenser.json'
import { LoggerInstance as logger, getFairGasPrice } from '../../utils/'
import { Datatoken } from '../../tokens'

export interface DispenserToken {
  active: boolean
  owner: string
  maxTokens: string
  maxBalance: string
  balance: string
  isMinter: boolean
  allowedSwapper: string
}

export class Dispenser {
  public GASLIMIT_DEFAULT = 1000000
  public web3: Web3 = null
  public dispenserAddress: string
  public startBlock: number
  public dispenserAbi: AbiItem | AbiItem[]
  public dispenserContract: Contract

  /**
   * Instantiate Dispenser
   * @param {any} web3
   * @param {String} dispenserAddress
   * @param {any} dispenserABI
   */
  constructor(
    web3: Web3,
    dispenserAddress: string = null,
    dispenserAbi: AbiItem | AbiItem[] = null,
    startBlock?: number
  ) {
    this.web3 = web3
    this.dispenserAddress = dispenserAddress
    if (startBlock) this.startBlock = startBlock
    else this.startBlock = 0
    this.dispenserAbi = dispenserAbi || (defaultDispenserAbi.abi as AbiItem[])
    if (web3)
      this.dispenserContract = new this.web3.eth.Contract(
        this.dispenserAbi,
        this.dispenserAddress
      )
  }

  /**
   * Get information about a datatoken dispenser
   * @param {String} dtAddress
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async status(dtAdress: string): Promise<DispenserToken> {
    try {
      const result: DispenserToken = await this.dispenserContract.methods
        .status(dtAdress)
        .call()
      result.maxTokens = this.web3.utils.fromWei(result.maxTokens)
      result.maxBalance = this.web3.utils.fromWei(result.maxBalance)
      result.balance = this.web3.utils.fromWei(result.balance)
      return result
    } catch (e) {
      logger.warn(`No dispenser available for data token: ${dtAdress}`)
    }
    return null
  }

  /**
   * Estimate gas cost for create method
   * @param {String} dtAddress Datatoken address
   * @param {String} address Owner address
   * @param {String} maxTokens max tokens to dispense
   * @param {String} maxBalance max balance of requester
   * @param {String} allowedSwapper  if !=0, only this address can request DTs
   * @return {Promise<any>}
   */
  public async estGasCreate(
    dtAddress: string,
    address: string,
    maxTokens: string,
    maxBalance: string,
    allowedSwapper: string
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.dispenserContract.methods
        .create(
          dtAddress,
          this.web3.utils.toWei(maxTokens),
          this.web3.utils.toWei(maxBalance),
          address,
          allowedSwapper
        )
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
  }

  /**
   * Creates a new Dispenser
   * @param {String} dtAddress Datatoken address
   * @param {String} address Owner address
   * @param {String} maxTokens max tokens to dispense
   * @param {String} maxBalance max balance of requester
   * @param {String} allowedSwapper  only account that can ask tokens. set address(0) if not required
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async create(
    dtAddress: string,
    address: string,
    maxTokens: string,
    maxBalance: string,
    allowedSwapper: string
  ): Promise<TransactionReceipt> {
    const estGas = await this.estGasCreate(
      dtAddress,
      address,
      maxTokens,
      maxBalance,
      allowedSwapper
    )

    // Call createFixedRate contract method
    const trxReceipt = await this.dispenserContract.methods
      .create(
        dtAddress,
        this.web3.utils.toWei(maxTokens),
        this.web3.utils.toWei(maxBalance),
        address,
        allowedSwapper
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    return trxReceipt
  }

  /**
   * Estimate gas for activate method
   * @param {String} dtAddress
   * @param {Number} maxTokens max amount of tokens to dispense
   * @param {Number} maxBalance max balance of user. If user balance is >, then dispense will be rejected
   * @param {String} address User address (must be owner of the dataToken)
   * @return {Promise<any>}
   */
  public async estGasActivate(
    dtAddress: string,
    maxTokens: string,
    maxBalance: string,
    address: string
  ): Promise<any> {
    let estGas
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    try {
      estGas = await this.dispenserContract.methods
        .activate(
          dtAddress,
          this.web3.utils.toWei(maxTokens),
          this.web3.utils.toWei(maxBalance)
        )
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Activates a new dispener.
   * @param {String} dtAddress refers to datatoken address.
   * @param {Number} maxTokens max amount of tokens to dispense
   * @param {Number} maxBalance max balance of user. If user balance is >, then dispense will be rejected
   * @param {String} address User address (must be owner of the dataToken)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async activate(
    dtAddress: string,
    maxTokens: string,
    maxBalance: string,
    address: string
  ): Promise<TransactionReceipt> {
    try {
      const estGas = await this.estGasActivate(dtAddress, maxTokens, maxBalance, address)
      const trxReceipt = await this.dispenserContract.methods
        .activate(
          dtAddress,
          this.web3.utils.toWei(maxTokens),
          this.web3.utils.toWei(maxBalance)
        )
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } catch (e) {
      logger.error(`ERROR: Failed to activate dispenser: ${e.message}`)
    }
    return null
  }

  /**
   * Estimate gas for deactivate method
   * @param {String} dtAddress
   * @param {String} address User address (must be owner of the dataToken)
   * @return {Promise<any>}
   */
  public async estGasDeactivate(dtAddress: string, address: string): Promise<any> {
    let estGas
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    try {
      estGas = await this.dispenserContract.methods
        .deactivate(dtAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Deactivate an existing dispenser.
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the dataToken)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async deactivate(
    dtAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    try {
      const estGas = await this.estGasDeactivate(dtAddress, address)
      const trxReceipt = await this.dispenserContract.methods.deactivate(dtAddress).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
      return trxReceipt
    } catch (e) {
      logger.error(`ERROR: Failed to activate dispenser: ${e.message}`)
    }
    return null
  }

  /**
   * Estimate gas for setAllowedSwapper method
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the dataToken)
   * @param {String} newAllowedSwapper refers to the new allowedSwapper
   * @return {Promise<any>}
   */
  public async estGasSetAllowedSwapper(
    dtAddress: string,
    address: string,
    newAllowedSwapper: string
  ): Promise<any> {
    let estGas
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    try {
      estGas = await this.dispenserContract.methods
        .setAllowedSwapper(dtAddress, newAllowedSwapper)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Sets a new allowedSwapper.
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the dataToken)
   * @param {String} newAllowedSwapper refers to the new allowedSwapper
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async setAllowedSwapper(
    dtAddress: string,
    address: string,
    newAllowedSwapper: string
  ): Promise<TransactionReceipt> {
    try {
      const estGas = await this.estGasSetAllowedSwapper(
        dtAddress,
        address,
        newAllowedSwapper
      )
      const trxReceipt = await this.dispenserContract.methods
        .setAllowedSwapper(dtAddress, newAllowedSwapper)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } catch (e) {
      logger.error(`ERROR: Failed to activate dispenser: ${e.message}`)
    }
    return null
  }

  /**
   * Estimate gas for dispense method
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the dataToken)
   * @param {String} newAllowedSwapper refers to the new allowedSwapper
   * @return {Promise<any>}
   */
  public async estGasDispense(
    dtAddress: string,
    address: string,
    amount: string = '1',
    destination: string
  ): Promise<any> {
    let estGas
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    try {
      estGas = await this.dispenserContract.methods
        .dispense(dtAddress, this.web3.utils.toWei(amount), destination)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Dispense datatokens to caller.
   * The dispenser must be active, hold enough DT (or be able to mint more)
   * and respect maxTokens/maxBalance requirements
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address
   * @param {String} amount amount of datatokens required.
   * @param {String} destination who will receive the tokens
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async dispense(
    dtAddress: string,
    address: string,
    amount: string = '1',
    destination: string
  ): Promise<TransactionReceipt> {
    const estGas = await this.estGasDispense(dtAddress, address, amount, destination)
    try {
      const trxReceipt = await this.dispenserContract.methods
        .dispense(dtAddress, this.web3.utils.toWei(amount), destination)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } catch (e) {
      logger.error(`ERROR: Failed to dispense tokens: ${e.message}`)
    }
    return null
  }

  /**
   * Estimate gas for ownerWithdraw method
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the dataToken)
   * @param {String} newAllowedSwapper refers to the new allowedSwapper
   * @return {Promise<any>}
   */
  public async estGasOwnerWithdraw(dtAddress: string, address: string): Promise<any> {
    let estGas
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    try {
      estGas = await this.dispenserContract.methods
        .ownerWithdraw(dtAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Withdraw all tokens from the dispenser
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the dispenser)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async ownerWithdraw(
    dtAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    const estGas = await this.estGasOwnerWithdraw(dtAddress, address)
    try {
      const trxReceipt = await this.dispenserContract.methods
        .ownerWithdraw(dtAddress)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } catch (e) {
      logger.error(`ERROR: Failed to withdraw tokens: ${e.message}`)
    }
    return null
  }

  /**
   * Check if tokens can be dispensed
   * @param {String} dtAddress
   * @param {String} address User address that will receive datatokens
   * @param {String} amount amount of datatokens required.
   * @return {Promise<Boolean>}
   */
  public async isDispensable(
    dtAddress: string,
    dataToken: Datatoken,
    address: string,
    amount: string = '1'
  ): Promise<Boolean> {
    const status = await this.status(dtAddress)
    if (!status) return false
    // check active
    if (status.active === false) return false
    // check maxBalance
    const userBalance = new Decimal(await dataToken.balance(dtAddress, address))
    if (userBalance.greaterThanOrEqualTo(status.maxBalance)) return false
    // check maxAmount
    if (new Decimal(String(amount)).greaterThan(status.maxTokens)) return false
    // check dispenser balance
    const contractBalance = new Decimal(status.balance)
    if (contractBalance.greaterThanOrEqualTo(amount) || status.isMinter === true)
      return true
    return false
  }
}
