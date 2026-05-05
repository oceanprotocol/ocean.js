import Decimal from 'decimal.js'
import { TransactionRequest } from 'ethers'
import DispenserAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import { Datatoken } from './Datatoken.js'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'
import { DispenserToken, ReceiptOrEstimate, AbiItem } from '../@types/index.js'
import {
  buildTxOverrides,
  buildUnsignedTx,
  sendPreparedTransaction
} from '../utils/ContractUtils.js'

export class Dispenser extends SmartContractWithAddress {
  getDefaultAbi() {
    return DispenserAbi.abi as AbiItem[]
  }

  /**
   * Get information about a datatoken dispenser
   * @param {String} dtAddress
   * @return {Promise<DispenserToken>}
   */
  public async status(dtAddress: string): Promise<DispenserToken> {
    const status2: DispenserToken = await this.contract.status(dtAddress)
    if (!status2) {
      throw new Error(`Np dispenser found for the given datatoken address`)
    }
    const status = {
      active: status2.active,
      owner: status2.owner,
      isMinter: status2.isMinter,
      maxTokens: await this.unitsToAmount(null, status2.maxTokens, 18),
      maxBalance: await this.unitsToAmount(null, status2.maxBalance, 18),
      balance: await this.unitsToAmount(null, status2.balance, 18),
      allowedSwapper: status2.allowedSwapper
    }
    return status
  }

  /**
   * Creates a new Dispenser
   * @param {String} dtAddress Datatoken address
   * @param {String} address Owner address
   * @param {String} maxTokens max tokens to dispense
   * @param {String} maxBalance max balance of requester
   * @param {String} allowedSwapper  only account that can ask tokens. set address(0) if not required
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async create<G extends boolean = false>(
    dtAddress: string,
    address: string,
    maxTokens: string,
    maxBalance: string,
    allowedSwapper: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const maxTokensUnits = this.amountToUnits(null, maxTokens, 18)
    const maxBalanceUnits = this.amountToUnits(null, maxBalance, 18)
    const estGas = await this.contract.create.estimateGas(
      dtAddress,
      maxTokensUnits,
      maxBalanceUnits,
      address,
      allowedSwapper
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.createTx(
      dtAddress,
      address,
      maxTokens,
      maxBalance,
      allowedSwapper
    )
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async createTx(
    dtAddress: string,
    address: string,
    maxTokens: string,
    maxBalance: string,
    allowedSwapper: string
  ): Promise<TransactionRequest> {
    const maxTokensUnits = await this.amountToUnits(null, maxTokens, 18)
    const maxBalanceUnits = await this.amountToUnits(null, maxBalance, 18)
    const estGas = await this.contract.create.estimateGas(
      dtAddress,
      maxTokensUnits,
      maxBalanceUnits,
      address,
      allowedSwapper
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.create,
      [dtAddress, maxTokensUnits, maxBalanceUnits, address, allowedSwapper],
      overrides
    )
  }

  /**
   * Activates a dispener.
   * @param {String} dtAddress refers to datatoken address.
   * @param {Number} maxTokens max amount of tokens to dispense
   * @param {Number} maxBalance max balance of user. If user balance is >, then dispense will be rejected
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} TransactionReceipt
   */
  public async activate<G extends boolean = false>(
    dtAddress: string,
    maxTokens: string,
    maxBalance: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const maxTokensUnits = await this.amountToUnits(null, maxTokens, 18)
    const maxBalanceUnits = await this.amountToUnits(null, maxBalance, 18)
    const estGas = await this.contract.activate.estimateGas(
      dtAddress,
      maxTokensUnits,
      maxBalanceUnits
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.activateTx(dtAddress, maxTokens, maxBalance)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async activateTx(
    dtAddress: string,
    maxTokens: string,
    maxBalance: string
  ): Promise<TransactionRequest> {
    const maxTokensUnits = await this.amountToUnits(null, maxTokens, 18)
    const maxBalanceUnits = await this.amountToUnits(null, maxBalance, 18)
    const estGas = await this.contract.activate.estimateGas(
      dtAddress,
      maxTokensUnits,
      maxBalanceUnits
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.activate,
      [dtAddress, maxTokensUnits, maxBalanceUnits],
      overrides
    )
  }

  /**
   * Deactivate an existing dispenser.
   * @param {String} dtAddress refers to datatoken address.
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} TransactionReceipt
   */
  public async deactivate<G extends boolean = false>(
    dtAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.deactivate.estimateGas(dtAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.deactivateTx(dtAddress)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async deactivateTx(dtAddress: string): Promise<TransactionRequest> {
    const estGas = await this.contract.deactivate.estimateGas(dtAddress)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.deactivate, [dtAddress], overrides)
  }

  /**
   * Sets a new allowed swapper.
   * @param {String} dtAddress Datatoken address.
   * @param {String} newAllowedSwapper The address of the new allowed swapper.
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async setAllowedSwapper<G extends boolean = false>(
    dtAddress: string,
    newAllowedSwapper: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.setAllowedSwapper.estimateGas(
      dtAddress,
      newAllowedSwapper
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.setAllowedSwapperTx(dtAddress, newAllowedSwapper)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async setAllowedSwapperTx(
    dtAddress: string,
    newAllowedSwapper: string
  ): Promise<TransactionRequest> {
    const estGas = await this.contract.setAllowedSwapper.estimateGas(
      dtAddress,
      newAllowedSwapper
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.setAllowedSwapper,
      [dtAddress, newAllowedSwapper],
      overrides
    )
  }

  /**
   * Dispense datatokens to caller.
   * The dispenser must be active, hold enough datatokens (or be able to mint more)
   * and respect maxTokens/maxBalance requirements
   * @param {String} dtAddress Datatoken address.
   * @param {String} amount Amount of datatokens required.
   * @param {String} destination address of tokens receiver
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async dispense<G extends boolean = false>(
    dtAddress: string,
    amount: string = '1',
    destination: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const amountUnits = await this.amountToUnits(null, amount, 18)
    const estGas = await this.contract.dispense.estimateGas(
      dtAddress,
      amountUnits,
      destination
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.dispenseTx(dtAddress, amount, destination)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async dispenseTx(
    dtAddress: string,
    amount: string = '1',
    destination: string
  ): Promise<TransactionRequest> {
    const amountUnits = await this.amountToUnits(null, amount, 18)
    const estGas = await this.contract.dispense.estimateGas(
      dtAddress,
      amountUnits,
      destination
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.dispense,
      [dtAddress, amountUnits, destination],
      overrides
    )
  }

  /**
   * Withdraw all tokens from the dispenser
   * @param {String} dtAddress Datatoken address.
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async ownerWithdraw<G extends boolean = false>(
    dtAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.ownerWithdraw.estimateGas(dtAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.ownerWithdrawTx(dtAddress)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async ownerWithdrawTx(dtAddress: string): Promise<TransactionRequest> {
    const estGas = await this.contract.ownerWithdraw.estimateGas(dtAddress)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.ownerWithdraw, [dtAddress], overrides)
  }

  /**
   * Check if tokens can be dispensed
   * @param {String} dtAddress Datatoken address
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
