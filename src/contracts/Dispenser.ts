import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import Decimal from 'decimal.js'
import DispenserAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import { calculateEstimatedGas } from '../utils'
import { Datatoken, SmartContractWithAddress } from '.'
import { DispenserToken } from '../@types'

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
    const status: DispenserToken = await this.contract.methods.status(dtAdress).call()
    if (!status) {
      throw new Error(`Np dispenser found for the given datatoken address`)
    }
    status.maxTokens = this.web3.utils.fromWei(status.maxTokens)
    status.maxBalance = this.web3.utils.fromWei(status.maxBalance)
    status.balance = this.web3.utils.fromWei(status.balance)
    return status
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
  public async create<G extends boolean = false>(
    dtAddress: string,
    address: string,
    maxTokens: string,
    maxBalance: string,
    allowedSwapper: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.create,
      dtAddress,
      this.web3.utils.toWei(maxTokens),
      this.web3.utils.toWei(maxBalance),
      address,
      allowedSwapper
    )
    if (estimateGas) return estGas

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
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
  }

  /**
   * Activates a new dispener.
   * @param {String} dtAddress refers to datatoken address.
   * @param {Number} maxTokens max amount of tokens to dispense
   * @param {Number} maxBalance max balance of user. If user balance is >, then dispense will be rejected
   * @param {String} address User address (must be owner of the datatoken)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async activate<G extends boolean = false>(
    dtAddress: string,
    maxTokens: string,
    maxBalance: string,
    address: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.activate,
      dtAddress,
      this.web3.utils.toWei(maxTokens),
      this.web3.utils.toWei(maxBalance)
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .activate(
        dtAddress,
        this.web3.utils.toWei(maxTokens),
        this.web3.utils.toWei(maxBalance)
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
  }

  /**
   * Deactivate an existing dispenser.
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the datatoken)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async deactivate<G extends boolean = false>(
    dtAddress: string,
    address: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.deactivate,
      dtAddress
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods.deactivate(dtAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })
    return trxReceipt
  }

  /**
   * Sets a new allowedSwapper.
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the datatoken)
   * @param {String} newAllowedSwapper refers to the new allowedSwapper
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async setAllowedSwapper<G extends boolean = false>(
    dtAddress: string,
    address: string,
    newAllowedSwapper: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.setAllowedSwapper,
      dtAddress,
      newAllowedSwapper
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .setAllowedSwapper(dtAddress, newAllowedSwapper)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
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
  public async dispense<G extends boolean = false>(
    dtAddress: string,
    address: string,
    amount: string = '1',
    destination: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.dispense,
      dtAddress,
      this.web3.utils.toWei(amount),
      destination
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .dispense(dtAddress, this.web3.utils.toWei(amount), destination)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
  }

  /**
   * Withdraw all tokens from the dispenser
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} address User address (must be owner of the dispenser)
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public async ownerWithdraw<G extends boolean = false>(
    dtAddress: string,
    address: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.ownerWithdraw,
      dtAddress
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods.ownerWithdraw(dtAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })
    return trxReceipt
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
