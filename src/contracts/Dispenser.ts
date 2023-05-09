import Decimal from 'decimal.js'
import DispenserAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import { sendTx } from '../utils'
import { Datatoken } from './Datatoken'
import { SmartContractWithAddress } from './SmartContractWithAddress'
import { DispenserToken, ReceiptOrEstimate, AbiItem } from '../@types'

export class Dispenser extends SmartContractWithAddress {
  getDefaultAbi() {
    return DispenserAbi.abi as AbiItem[]
  }

  /**
   * Get information about a datatoken dispenser
   * @param {String} dtAddress
   * @return {Promise<DispenserToken>}
   */
  public async status(dtAdress: string): Promise<DispenserToken> {
    const status2: DispenserToken = await this.contract.status(dtAdress)
    if (!status2) {
      throw new Error(`Np dispenser found for the given datatoken address`)
    }
    const status = {
      active: status2[0],
      owner: status2[1],
      isMinter: status2[2],
      maxTokens: await this.unitsToAmount(null, status2[3], 18),
      maxBalance: await this.unitsToAmount(null, status2[4], 18),
      balance: await this.unitsToAmount(null, status2[5], 18),
      allowedSwapper: status2[6]
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
    const estGas = await this.contract.estimateGas.create(
      dtAddress,
      this.amountToUnits(null, maxTokens, 18),
      this.amountToUnits(null, maxBalance, 18),
      address,
      allowedSwapper
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Call createFixedRate contract method
    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.create,
      dtAddress,
      this.amountToUnits(null, maxTokens, 18),
      this.amountToUnits(null, maxBalance, 18),
      address,
      allowedSwapper
    )

    return <ReceiptOrEstimate<G>>trxReceipt
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
    const estGas = await this.contract.estimateGas.activate(
      dtAddress,
      this.amountToUnits(null, maxTokens, 18),
      this.amountToUnits(null, maxBalance, 18)
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.activate,
      dtAddress,
      this.amountToUnits(null, maxTokens, 18),
      this.amountToUnits(null, maxBalance, 18)
    )

    return <ReceiptOrEstimate<G>>trxReceipt
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
    const estGas = await this.contract.estimateGas.deactivate(dtAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.deactivate,
      dtAddress
    )

    return <ReceiptOrEstimate<G>>trxReceipt
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
    const estGas = await this.contract.estimateGas.setAllowedSwapper(
      dtAddress,
      newAllowedSwapper
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.setAllowedSwapper,
      dtAddress,
      newAllowedSwapper
    )
    return <ReceiptOrEstimate<G>>trxReceipt
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
    const estGas = await this.contract.estimateGas.dispense(
      dtAddress,
      this.amountToUnits(null, amount, 18),
      destination
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.dispense,
      dtAddress,
      this.amountToUnits(null, amount, 18),
      destination
    )
    return <ReceiptOrEstimate<G>>trxReceipt
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
    const estGas = await this.contract.estimateGas.ownerWithdraw(dtAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.ownerWithdraw,
      dtAddress
    )

    return <ReceiptOrEstimate<G>>trxReceipt
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
