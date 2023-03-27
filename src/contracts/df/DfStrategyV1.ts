import dfStrategyV1ABI from '@oceanprotocol/contracts/artifacts/contracts/df/DFStrategyV1.sol/DFStrategyV1.json'
import { sendTx } from '../../utils'
import { SmartContractWithAddress } from '../SmartContractWithAddress'
import { ReceiptOrEstimate, AbiItem } from '../../@types'
/**
 * Provides an interface for dfStrategyV1 contract
 */
export class DfStrategyV1 extends SmartContractWithAddress {
  getDefaultAbi() {
    return dfStrategyV1ABI.abi as AbiItem[]
  }

  /** Get available DF Rewards for multiple tokens
   * @param {String} userAddress user address
   * @param {String} tokenAddresses array of tokens
   * @return {Promise<string[]>}
   */
  public async getMultipleAvailableRewards(
    userAddress: string,
    tokenAddresses: string[]
  ): Promise<string[]> {
    const rewards = await this.contract.claimables(userAddress, tokenAddresses)
    const rewardsFormated: string[] = []
    for (let i = 0; i < rewards.length; i++) {
      rewardsFormated.push(await this.unitsToAmount(tokenAddresses[i], rewards[i]))
    }
    return rewardsFormated
  }

  /**
   * claim multiple token rewards for any address
   * @param {String} userAddress user address to claim
   * @param {String} tokenAddresses array of tokens
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async claimMultipleRewards<G extends boolean = false>(
    userAddress: string,
    tokenAddresses: string[],
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.estimateGas.claimMultiple(
      userAddress,
      tokenAddresses
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.claimMultiple,
      userAddress,
      tokenAddresses
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
