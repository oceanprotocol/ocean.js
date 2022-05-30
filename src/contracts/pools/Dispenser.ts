import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import Decimal from 'decimal.js'
import DispenserAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import {
  LoggerInstance,
  getFairGasPrice,
  estimateGas,
  Datatoken,
  SmartContractWithAddress
} from '../..'
import { DispenserToken } from '../../@types'

export class Dispenser extends SmartContractWithAddress {
  getDefaultAbi(): AbiItem | AbiItem[] {
    return DispenserAbi.abi as AbiItem[]
  }

  /**
   * Get information about a datatoken dispenser
   * @param {String} dtAddress
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async status(dtAdress: string): Promise<DispenserToken> {
    try {
      const result: DispenserToken = await this.contract.methods.status(dtAdress).call()
      result.maxTokens = this.web3.utils.fromWei(result.maxTokens)
      result.maxBalance = this.web3.utils.fromWei(result.maxBalance)
      result.balance = this.web3.utils.fromWei(result.balance)
      return result
    } catch (e) {
      LoggerInstance.warn(`No dispenser available for datatoken: ${dtAdress}`)
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
    return estimateGas(
      address,
      this.contract.methods.create,
      dtAddress,
      this.web3.utils.toWei(maxTokens),
      this.web3.utils.toWei(maxBalance),
      address,
      allowedSwapper
    )
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
    const estGas = await estimateGas(
      address,
      this.contract.methods.create,
      dtAddress,
      this.web3.utils.toWei(maxTokens),
      this.web3.utils.toWei(maxBalance),
      address,
      allowedSwapper
    )

    // Call createFixedRate contract method
    const trxReceipt = await this.contract.methods
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
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    return trxReceipt
  }

  /**
   * Estimate gas for activate method
   * @param {String} dtAddress
   * @param {Number} maxTokens max amount of tokens to dispense
   * @param {Number} maxBalance max balance of user. If user balance is >, then dispense will be rejected
   * @param {String} address User address (must be owner of the datatoken)
   * @return {Promise<any>}
   */
  public async estGasActivate(
    dtAddress: string,
    maxTokens: string,
    maxBalance: string,
    address: string
  ): Promise<any> {
    return estimateGas(
      address,
      this.contract.methods.activate,
      dtAddress,
      this.web3.utils.toWei(maxTokens),
      this.web3.utils.toWei(maxBalance)
    )
  }

  /**
   * Activates a new dispener.
   * @param {String} dtAddress refers to datatoken address.
   * @param {Number} maxTokens max amount of tokens to dispense
   * @param {Number} maxBalance max balance of user. If user balance is >, then dispense will be rejected
   * @param {String} address User address (must be owner of the datatoken)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async activate(
    dtAddress: string,
    maxTokens: string,
    maxBalance: string,
    address: string
  ): Promise<TransactionReceipt> {
    try {
      const estGas = await estimateGas(
        address,
        this.contract.methods.activate,
        dtAddress,
        this.web3.utils.toWei(maxTokens),
        this.web3.utils.toWei(maxBalance)
      )

      const trxReceipt = await this.contract.methods
        .activate(
          dtAddress,
          this.web3.utils.toWei(maxTokens),
          this.web3.utils.toWei(maxBalance)
        )
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to activate dispenser: ${e.message}`)
    }
    return null
  }

  /**
   * Estimate gas for deactivate method
   * @param {String} dtAddress
   * @param {String} address User address (must be owner of the datatoken)
   * @return {Promise<any>}
   */
  public async estGasDeactivate(dtAddress: string, address: string): Promise<any> {
    return estimateGas(address, this.contract.methods.deactivate, dtAddress)
  }

  /**
   * Deactivate an existing dispenser.
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the datatoken)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async deactivate(
    dtAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    try {
      const estGas = await estimateGas(
        address,
        this.contract.methods.deactivate,
        dtAddress
      )

      const trxReceipt = await this.contract.methods.deactivate(dtAddress).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to activate dispenser: ${e.message}`)
    }
    return null
  }

  /**
   * Estimate gas for setAllowedSwapper method
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the datatoken)
   * @param {String} newAllowedSwapper refers to the new allowedSwapper
   * @return {Promise<any>}
   */
  public async estGasSetAllowedSwapper(
    dtAddress: string,
    address: string,
    newAllowedSwapper: string
  ): Promise<any> {
    return estimateGas(
      address,
      this.contract.methods.setAllowedSwapper,
      dtAddress,
      newAllowedSwapper
    )
  }

  /**
   * Sets a new allowedSwapper.
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the datatoken)
   * @param {String} newAllowedSwapper refers to the new allowedSwapper
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async setAllowedSwapper(
    dtAddress: string,
    address: string,
    newAllowedSwapper: string
  ): Promise<TransactionReceipt> {
    try {
      const estGas = await estimateGas(
        address,
        this.contract.methods.setAllowedSwapper,
        dtAddress,
        newAllowedSwapper
      )

      const trxReceipt = await this.contract.methods
        .setAllowedSwapper(dtAddress, newAllowedSwapper)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to activate dispenser: ${e.message}`)
    }
    return null
  }

  /**
   * Estimate gas for dispense method
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the datatoken)
   * @param {String} newAllowedSwapper refers to the new allowedSwapper
   * @return {Promise<any>}
   */
  public async estGasDispense(
    dtAddress: string,
    address: string,
    amount: string = '1',
    destination: string
  ): Promise<any> {
    return estimateGas(
      address,
      this.contract.methods.dispense,
      dtAddress,
      this.web3.utils.toWei(amount),
      destination
    )
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
    const estGas = await estimateGas(
      address,
      this.contract.methods.dispense,
      dtAddress,
      this.web3.utils.toWei(amount),
      destination
    )

    try {
      const trxReceipt = await this.contract.methods
        .dispense(dtAddress, this.web3.utils.toWei(amount), destination)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to dispense tokens: ${e.message}`)
    }
    return null
  }

  /**
   * Estimate gas for ownerWithdraw method
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the datatoken)
   * @param {String} newAllowedSwapper refers to the new allowedSwapper
   * @return {Promise<any>}
   */
  public async estGasOwnerWithdraw(dtAddress: string, address: string): Promise<any> {
    return estimateGas(address, this.contract.methods.ownerWithdraw, dtAddress)
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
    const estGas = await estimateGas(
      address,
      this.contract.methods.ownerWithdraw,
      dtAddress
    )

    try {
      const trxReceipt = await this.contract.methods.ownerWithdraw(dtAddress).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to withdraw tokens: ${e.message}`)
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
    datatoken: Datatoken,
    address: string,
    amount: string = '1'
  ): Promise<Boolean> {
    const status = await this.status(dtAddress)
    if (!status) return false
    // check active
    if (status.active === false) return false
    // check maxBalance
    const userBalance = new Decimal(await datatoken.balance(dtAddress, address))
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
