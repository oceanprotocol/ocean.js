import { TransactionRequest } from 'ethers'
import GrantsSwapAbi from '@oceanprotocol/contracts/artifacts/contracts/grants/GrantsSwap.sol/GrantsSwap.json'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'
import { GrantsSwapPermit, ReceiptOrEstimate, AbiItem } from '../@types/index.js'
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
 * Only the user-facing surface is exposed here: read the rate, quote a swap, and
 * execute a swap (with or without an EIP-2612 permit). Owner/admin operations
 * (`setRate`, `pause`, `unpause`, `withdrawTokens`) are intentionally not wrapped.
 *
 * The input token and COMPY can have any decimals (e.g. 6↔18, 6↔12, 6↔6); the
 * contract normalizes the gap internally (`RATE_UNIT` + `mulDiv`). `getCompyAmount`
 * takes the input `amount` in the input token's decimals and returns COMPY in
 * COMPY's decimals. Nothing here assumes token decimals — both are fetched on chain
 * (via `amountToUnits`/`unitsToAmount` given the token address).
 */
export class GrantsSwap extends SmartContractWithAddress {
  private inputTokenAddress: string
  private compyTokenAddress: string

  getDefaultAbi() {
    return GrantsSwapAbi.abi as AbiItem[]
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
    const amountUnits = await this.amountToUnits(inputToken, amount)
    const compyUnits = await this.contract.getCompyAmount(amountUnits)
    return this.unitsToAmount(compyToken, compyUnits)
  }

  /**
   * Swap `amount` of the input token for COMPY. The caller must have approved the
   * GrantsSwap contract to spend the input token beforehand (see `getInputToken`).
   * @param {String} amount input-token amount to swap (human-readable)
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async swapToCOMPY<G extends boolean = false>(
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.swapToCOMPYTx(amount)
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async swapToCOMPYTx(amount: string): Promise<TransactionRequest> {
    const inputToken = await this.getInputToken()
    const amountUnits = await this.amountToUnits(inputToken, amount)
    const estGas = await this.contract.swapToCOMPY.estimateGas(amountUnits)
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
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async swapToCOMPYwithPermit<G extends boolean = false>(
    amount: string,
    permit: GrantsSwapPermit,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.swapToCOMPYwithPermitTx(amount, permit)
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async swapToCOMPYwithPermitTx(
    amount: string,
    permit: GrantsSwapPermit
  ): Promise<TransactionRequest> {
    const inputToken = await this.getInputToken()
    const amountUnits = await this.amountToUnits(inputToken, amount)
    const args = [amountUnits, permit.deadline, permit.v, permit.r, permit.s]
    const estGas = await this.contract.swapToCOMPYwithPermit.estimateGas(...args)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.swapToCOMPYwithPermit, args, overrides)
  }
}
