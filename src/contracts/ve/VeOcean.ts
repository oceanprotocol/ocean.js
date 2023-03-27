import veOceanABI from '@oceanprotocol/contracts/artifacts/contracts/ve/veOCEAN.vy/veOCEAN.json'
import { sendTx } from '../../utils'
import { SmartContractWithAddress } from '../SmartContractWithAddress'
import { ReceiptOrEstimate, AbiItem } from '../../@types'
/**
 * Provides an interface for veOcean contract
 */
export class VeOcean extends SmartContractWithAddress {
  getDefaultAbi() {
    return veOceanABI.abi as AbiItem[]
  }

  /**
   * Deposit `amount` tokens for `userAddress` and lock until `unlockTime`
   * @param {String} amount Amount of tokens to be locked
   * @param {Number} unlockTime Timestamp for unlock
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async lockTokens<G extends boolean = false>(
    amount: string,
    unlockTime: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const amountFormatted = await this.amountToUnits(await this.getToken(), amount)
    const estGas = await this.contract.estimateGas.create_lock(
      amountFormatted,
      unlockTime
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas.add(20000),
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.create_lock,
      amountFormatted,
      unlockTime
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Deposit `amount` tokens for `toAddress` and add to the existing lock
   * Anyone (even a smart contract) can deposit for someone else, but cannot extend their locktime and deposit for a brand new user
   * @param {String} toAddress user address to deposit for
   * @param {String} amount Amount of tokens to be locked
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async depositFor<G extends boolean = false>(
    toAddress: string,
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const amountFormatted = await this.amountToUnits(await this.getToken(), amount)
    const estGas = await this.contract.estimateGas.deposit_for(toAddress, amountFormatted)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas.add(20000),
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.deposit_for,
      toAddress,
      amountFormatted
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Deposit `amount` additional tokens for `userAddress` without modifying the unlock time
   * @param {String} amount Amount of tokens to be locked
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async increaseAmount<G extends boolean = false>(
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const amountFormatted = await this.amountToUnits(await this.getToken(), amount)
    const estGas = await this.contract.estimateGas.increase_amount(amountFormatted)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas.add(20000),
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.increase_amount,
      amountFormatted
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Extend the unlock time for `userAddress` to `unlockTime`
   * @param {Number} unlockTime Timestamp for new unlock time
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async increaseUnlockTime<G extends boolean = false>(
    unlockTime: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.estimateGas.increase_unlock_time(unlockTime)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas.add(20000),
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.increase_unlock_time,
      unlockTime
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Withdraw all tokens for `userAddress`
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async withdraw<G extends boolean = false>(
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.estimateGas.withdraw()
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas.add(20000),
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.withdraw
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /** Get voting power for address
   * @param {String} userAddress user address
   * @return {Promise<number>}
   */
  public async getVotingPower(userAddress: string): Promise<number> {
    const balance = await this.contract.balanceOf(userAddress)
    return balance
  }

  /** Get locked balance
   * @param {String} userAddress user address
   * @return {Promise<string>}
   */
  public async getLockedAmount(userAddress: string): Promise<string> {
    const balance = await this.contract.locked(userAddress)
    const balanceFormated = await this.unitsToAmount(
      await this.getToken(),
      balance.amount.toString()
    )

    return balanceFormated
  }

  /** Get untilLock for address
   * @param {String} userAddress user address
   * @return {Promise<number>}
   */
  public async lockEnd(userAddress: string): Promise<number> {
    const untilLock = await this.contract.locked__end(userAddress)
    return parseInt(untilLock.toString())
  }

  /** Get total supply
   * @return {Promise<number>}
   */
  public async totalSupply(): Promise<string> {
    const supplyFormated = await this.unitsToAmount(
      await this.getToken(),
      await this.contract.totalSupply()
    )
    return supplyFormated
  }

  /** Get token
   * @return {Promise<string>}
   */
  public async getToken(): Promise<string> {
    const tokenAddress = await this.contract.token()
    return tokenAddress
  }
}
