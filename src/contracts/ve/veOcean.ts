import { AbiItem } from 'web3-utils'
import veOceanABI from '@oceanprotocol/contracts/artifacts/contracts/ve/veOCEAN.vy/veOCEAN.json'
import { calculateEstimatedGas, sendTx } from '../../utils'
import { SmartContractWithAddress } from '../SmartContractWithAddress'
import { ReceiptOrEstimate } from '../../@types'
/**
 * Provides an interface for veOcean contract
 */
export class VeOcean extends SmartContractWithAddress {
  getDefaultAbi(): AbiItem | AbiItem[] {
    return veOceanABI.abi as AbiItem[]
  }

  /**
   * Deposit `amount` tokens for `userAddress` and lock until `unlockTime`
   * @param {String} userAddress user address
   * @param {String} amount Amount of tokens to be locked
   * @param {Number} unlockTime Timestamp for unlock
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async lockTokens<G extends boolean = false>(
    userAddress: string,
    amount: string,
    unlockTime: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      userAddress,
      this.contract.methods.create_lock,
      amount,
      unlockTime
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      userAddress,
      estGas * 2 + 1,
      this.web3,
      this.config?.gasFeeMultiplier,
      this.contract.methods.create_lock,
      amount,
      unlockTime
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Deposit `amount` tokens for `toAddress` and add to the existing lock
   * Anyone (even a smart contract) can deposit for someone else, but cannot extend their locktime and deposit for a brand new user
   * @param {String} fromUserAddress user address that sends the tx
   * @param {String} toAddress user address to deposit for
   * @param {String} amount Amount of tokens to be locked
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async depositFor<G extends boolean = false>(
    fromUserAddress: string,
    toAddress: string,
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      fromUserAddress,
      this.contract.methods.deposit_for,
      toAddress,
      amount
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      fromUserAddress,
      estGas + 1,
      this.web3,
      this.config?.gasFeeMultiplier,
      this.contract.methods.deposit_for,
      toAddress,
      amount
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Deposit `amount` additional tokens for `userAddress` without modifying the unlock time
   * @param {String} userAddress user address that sends the tx
   * @param {String} amount Amount of tokens to be locked
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async increaseAmount<G extends boolean = false>(
    userAddress: string,
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      userAddress,
      this.contract.methods.increase_amount,
      amount
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      userAddress,
      estGas * 2 + 1,
      this.web3,
      this.config?.gasFeeMultiplier,
      this.contract.methods.increase_amount,
      amount
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Extend the unlock time for `userAddress` to `unlockTime`
   * @param {String} userAddress user address that sends the tx
   * @param {Number} unlockTime Timestamp for new unlock time
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async increaseUnlockTime<G extends boolean = false>(
    userAddress: string,
    unlockTime: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      userAddress,
      this.contract.methods.increase_unlock_time,
      unlockTime
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      userAddress,
      estGas * 2 + 1,
      this.web3,
      this.config?.gasFeeMultiplier,
      this.contract.methods.increase_unlock_time,
      unlockTime
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Withdraw all tokens for `userAddress`
   * @param {String} userAddress user address that sends the tx
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async withdraw<G extends boolean = false>(
    userAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      userAddress,
      this.contract.methods.withdraw
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      userAddress,
      estGas + 1,
      this.web3,
      this.config?.gasFeeMultiplier,
      this.contract.methods.withdraw
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /** Get voting power for address
   * @param {String} userAddress user address
   * @return {Promise<number>}
   */
  public async getVotingPower(userAddress: string): Promise<number> {
    const balance = await this.contract.methods.balanceOf(userAddress).call()
    return balance
  }

  /** Get locked balance
   * @param {String} userAddress user address
   * @return {Promise<number>}
   */
  public async getLockedAmount(userAddress: string): Promise<number> {
    const balance = await this.contract.methods.locked(userAddress).call()
    return balance.amount
  }

  /** Get untilLock for address
   * @param {String} userAddress user address
   * @return {Promise<number>}
   */
  public async lockEnd(userAddress: string): Promise<number> {
    const untilLock = await this.contract.methods.locked__end(userAddress).call()
    return untilLock
  }

  /** Get total supply
   * @return {Promise<number>}
   */
  public async totalSupply(): Promise<number> {
    const supply = await this.contract.methods.totalSupply().call()
    return supply
  }
}
