import veFeeABI from '@oceanprotocol/contracts/artifacts/contracts/ve/veFeeDistributor.vy/veFeeDistributor.json'
import { sendTx } from '../../utils'
import { SmartContractWithAddress } from '../SmartContractWithAddress'
import { ReceiptOrEstimate, AbiItem } from '../../@types'
/**
 * Provides an interface for veOcean contract
 */
export class VeFeeDistributor extends SmartContractWithAddress {
  getDefaultAbi() {
    return veFeeABI.abi as AbiItem[]
  }

  /**
   * Claim fees for `userAddress`
   * Each call to claim look at a maximum of 50 user veOCEAN points.
         For accounts with many veOCEAN related actions, this function
         may need to be called more than once to claim all available
         fees. In the `Claimed` event that fires, if `claim_epoch` is
         less than `max_epoch`, the account may claim again
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async claim<G extends boolean = false>(
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.estimateGas.claim()
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas.add(20000),
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.claim
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Make multiple fee claims in a single call
    Used to claim for many accounts at once, or to make
         multiple claims for the same address when that address
         has significant veOCEAN history
   * @param {String} addresses array of addresses to claim
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async claimMany<G extends boolean = false>(
    addresses: string[],
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.estimateGas.claim_many(addresses)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas.add(20000),
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.claim_many,
      addresses
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
