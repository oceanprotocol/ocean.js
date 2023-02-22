import { ethers } from 'ethers'
import Decimal from 'decimal.js'
import DispenserAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import { calculateEstimatedGas, sendTx } from '../utils'
import { Datatoken } from './Datatoken'
import { SmartContractWithAddress } from './SmartContractWithAddress'
import { DispenserToken, ReceiptOrEstimate } from '../@types'

export class Dispenser extends SmartContractWithAddress {
  getDefaultAbi() {
    return DispenserAbi.abi
  }

  /**
   * Get information about a datatoken dispenser
   * @param {String} dtAddress
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async status(dtAdress: string): Promise<DispenserToken> {
    const status: DispenserToken = await this.contract.status(dtAdress)
    if (!status) {
      throw new Error(`Np dispenser found for the given datatoken address`)
    }
    status.maxTokens = ethers.formatEther(status.maxTokens)
    status.maxBalance = ethers.formatEther(status.maxBalance)
    status.balance = ethers.formatEther(status.balance)
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
    const estGas = await calculateEstimatedGas(
      this.contract.create,
      dtAddress,
      ethers.parseUnits(maxTokens, 'ethers'),
      ethers.parseUnits(maxBalance, 'ethers'),
      address,
      allowedSwapper
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Call createFixedRate contract method
    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.create,
      dtAddress,
      ethers.parseUnits(maxTokens, 'ethers'),
      ethers.parseUnits(maxBalance, 'ethers'),
      address,
      allowedSwapper
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Activates a new dispener.
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
    const estGas = await calculateEstimatedGas(
      this.contract.activate,
      dtAddress,
      ethers.parseUnits(maxTokens, 'ethers'),
      ethers.parseUnits(maxBalance, 'ethers')
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.activate,
      dtAddress,
      ethers.parseUnits(maxTokens, 'ethers'),
      ethers.parseUnits(maxBalance, 'ethers')
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
    const estGas = await calculateEstimatedGas(this.contract.deactivate, dtAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.deactivate,
      dtAddress
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Sets a new allowedSwapper.
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} newAllowedSwapper refers to the new allowedSwapper
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} TransactionReceipt
   */
  public async setAllowedSwapper<G extends boolean = false>(
    dtAddress: string,
    newAllowedSwapper: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      this.contract.setAllowedSwapper,
      dtAddress,
      newAllowedSwapper
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
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
   * The dispenser must be active, hold enough DT (or be able to mint more)
   * and respect maxTokens/maxBalance requirements
   * @param {String} dtAddress refers to datatoken address.
   * @param {String} amount amount of datatokens required.
   * @param {String} destination who will receive the tokens
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} TransactionReceipt
   */
  public async dispense<G extends boolean = false>(
    dtAddress: string,
    amount: string = '1',
    destination: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      this.contract.dispense,
      dtAddress,
      ethers.parseUnits(amount, 'ether'),
      destination
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.dispense,
      dtAddress,
      ethers.parseUnits(amount, 'ether'),
      destination
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Withdraw all tokens from the dispenser
   * @param {String} dtAddress refers to datatoken address.
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} TransactionReceipt
   */
  public async ownerWithdraw<G extends boolean = false>(
    dtAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(this.contract.ownerWithdraw, dtAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.ownerWithdraw,
      dtAddress
    )

    return <ReceiptOrEstimate<G>>trxReceipt
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
