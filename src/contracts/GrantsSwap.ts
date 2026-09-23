import { TransactionRequest } from 'ethers'
import GrantsSwapAbi from '@oceanprotocol/contracts/artifacts/contracts/grants/GrantsSwap.sol/GrantsSwap.json'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'
import { GrantsSwapPermit, ReceiptOrEstimate, AbiItem } from '../@types/index.js'
import { minAbi } from '../utils/minAbi.js'
import {
  buildTxOverrides,
  buildUnsignedTx,
  sendPreparedTransaction
} from '../utils/ContractUtils.js'

/**
 * Fixed-point scale of the contract's `rate` (`RATE_UNIT = 1e18`). This is a
 * protocol constant, NOT a token decimal — the rate is a normalized multiplier,
 * so it is always converted at this scale regardless of the input/COMPY decimals.
 */
const RATE_UNIT_DECIMALS = 18

/**
 * Wrapper around the `GrantsSwap` contract — swaps an input ERC20 for COMPY at a
 * configurable, owner-set rate.
 *
 * Only the user-facing surface is exposed here: read the rate, quote a swap, read
 * the contract's liquidity and pause state, and execute a swap (with or without an
 * EIP-2612 permit). Owner/admin *write* operations (`setRate`, `pause`, `unpause`,
 * `withdrawTokens`) are intentionally not wrapped.
 *
 * The input token and COMPY can have any decimals (e.g. 6↔18, 6↔12, 6↔6); the
 * contract normalizes the gap internally (`RATE_UNIT` + `mulDiv`). `getCompyAmount`
 * takes the input `amount` in the input token's decimals and returns COMPY in
 * COMPY's decimals. Nothing here assumes token decimals — both are fetched on chain
 * once and cached (via `amountToUnits`/`unitsToAmount` given the token address).
 */
export class GrantsSwap extends SmartContractWithAddress {
  private inputTokenAddress: string
  private compyTokenAddress: string
  private inputTokenDecimals: number
  private compyTokenDecimals: number

  getDefaultAbi() {
    return GrantsSwapAbi.abi as AbiItem[]
  }

  /**
   * Number of decimals of the input token (cached after first read).
   * @return {Promise<number>}
   */
  private async getInputTokenDecimals(): Promise<number> {
    if (this.inputTokenDecimals === undefined) {
      const inputToken = await this.getInputToken()
      const tokenContract = this.getContract(inputToken, minAbi as AbiItem[])
      this.inputTokenDecimals = Number(await tokenContract.decimals())
    }
    return this.inputTokenDecimals
  }

  /**
   * Number of decimals of the COMPY token (cached after first read).
   * @return {Promise<number>}
   */
  private async getCompyTokenDecimals(): Promise<number> {
    if (this.compyTokenDecimals === undefined) {
      const compyToken = await this.getCompyToken()
      const tokenContract = this.getContract(compyToken, minAbi as AbiItem[])
      this.compyTokenDecimals = Number(await tokenContract.decimals())
    }
    return this.compyTokenDecimals
  }

  /**
   * Address of the ERC20 token that gets swapped into COMPY (cached after first read).
   * @return {Promise<string>}
   */
  public async getInputToken(): Promise<string> {
    if (!this.inputTokenAddress) this.inputTokenAddress = await this.contract.inputToken()
    return this.inputTokenAddress
  }

  /**
   * Address of the COMPY token handed back by a swap (cached after first read).
   * @return {Promise<string>}
   */
  public async getCompyToken(): Promise<string> {
    if (!this.compyTokenAddress) this.compyTokenAddress = await this.contract.compyToken()
    return this.compyTokenAddress
  }

  /**
   * Current swap rate as a human-readable string (e.g. `'1'`, `'2'`, `'0.5'`).
   * On-chain the rate is stored scaled by `RATE_UNIT = 1e18` (a decimal-normalized
   * COMPY-per-input ratio), so it is always converted with 18 decimals.
   * @return {Promise<string>}
   */
  public async getRate(): Promise<string> {
    const rate = await this.contract.getRate()
    return this.unitsToAmount(null, rate, RATE_UNIT_DECIMALS)
  }

  /**
   * Quote how much COMPY a given input amount would yield at the current rate.
   * @param {String} amount input-token amount (human-readable, in the input token's decimals)
   * @return {Promise<string>} COMPY amount (human-readable, in COMPY's decimals)
   */
  public async getCompyAmount(amount: string): Promise<string> {
    const inputToken = await this.getInputToken()
    const compyToken = await this.getCompyToken()
    const inputDecimals = await this.getInputTokenDecimals()
    const compyDecimals = await this.getCompyTokenDecimals()
    const amountUnits = await this.amountToUnits(inputToken, amount, inputDecimals)
    const compyUnits = await this.contract.getCompyAmount(amountUnits)
    return this.unitsToAmount(compyToken, compyUnits, compyDecimals)
  }

  /**
   * Whether the contract is currently paused. A paused contract rejects swaps, so
   * a UI should disable the swap action when this is `true`.
   * @return {Promise<boolean>}
   */
  public async paused(): Promise<boolean> {
    return this.contract.paused()
  }

  /**
   * COMPY liquidity currently held by the swap contract (human-readable, in COMPY's
   * decimals). A swap reverts when it would pay out more than this, so a UI can use
   * it together with `getRate` to cap the input amount.
   * @return {Promise<string>}
   */
  public async getCOMPYBalance(): Promise<string> {
    const compyToken = await this.getCompyToken()
    const compyDecimals = await this.getCompyTokenDecimals()
    const tokenContract = this.getContract(compyToken, minAbi as AbiItem[])
    const balanceUnits = await tokenContract.balanceOf(this.address)
    return this.unitsToAmount(compyToken, balanceUnits, compyDecimals)
  }

  /**
   * Input-token balance currently held by the swap contract (human-readable, in the
   * input token's decimals).
   * @return {Promise<string>}
   */
  public async getInputTokenBalance(): Promise<string> {
    const inputToken = await this.getInputToken()
    const inputDecimals = await this.getInputTokenDecimals()
    const tokenContract = this.getContract(inputToken, minAbi as AbiItem[])
    const balanceUnits = await tokenContract.balanceOf(this.address)
    return this.unitsToAmount(inputToken, balanceUnits, inputDecimals)
  }

  /**
   * Swap `amount` of the input token for COMPY. The caller must have approved the
   * GrantsSwap contract to spend the input token beforehand (see `getInputToken`).
   * @param {String} amount input-token amount to swap (human-readable)
   * @param {Boolean} estimateGas if True, return gas estimate
   * @param {String} [gasLimit] optional pre-computed gas limit (in units). When
   *   provided, the on-chain `estimateGas` simulation is skipped — required for
   *   batched flows (e.g. an ERC-4337 approve+swap UserOp) where allowance is still
   *   0 at build time and the simulation would revert.
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async swapToCOMPY<G extends boolean = false>(
    amount: string,
    estimateGas?: G,
    gasLimit?: string
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.swapToCOMPYTx(amount, gasLimit)
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async swapToCOMPYTx(
    amount: string,
    gasLimit?: string
  ): Promise<TransactionRequest> {
    const inputToken = await this.getInputToken()
    const amountUnits = await this.amountToUnits(inputToken, amount)
    const estGas =
      gasLimit !== undefined
        ? BigInt(gasLimit)
        : await this.contract.swapToCOMPY.estimateGas(amountUnits)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.swapToCOMPY, [amountUnits], overrides)
  }

  /**
   * Swap `amount` of the input token for COMPY using an EIP-2612 permit, so no
   * separate `approve` transaction is needed.
   * @param {String} amount input-token amount to swap (human-readable)
   * @param {GrantsSwapPermit} permit permit signature (`deadline`, `v`, `r`, `s`)
   * @param {Boolean} estimateGas if True, return gas estimate
   * @param {String} [gasLimit] optional pre-computed gas limit (in units). When
   *   provided, the on-chain `estimateGas` simulation is skipped (see `swapToCOMPY`).
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async swapToCOMPYwithPermit<G extends boolean = false>(
    amount: string,
    permit: GrantsSwapPermit,
    estimateGas?: G,
    gasLimit?: string
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.swapToCOMPYwithPermitTx(amount, permit, gasLimit)
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async swapToCOMPYwithPermitTx(
    amount: string,
    permit: GrantsSwapPermit,
    gasLimit?: string
  ): Promise<TransactionRequest> {
    const inputToken = await this.getInputToken()
    const amountUnits = await this.amountToUnits(inputToken, amount)
    const args = [amountUnits, permit.deadline, permit.v, permit.r, permit.s]
    const estGas =
      gasLimit !== undefined
        ? BigInt(gasLimit)
        : await this.contract.swapToCOMPYwithPermit.estimateGas(...args)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.swapToCOMPYwithPermit, args, overrides)
  }
}
