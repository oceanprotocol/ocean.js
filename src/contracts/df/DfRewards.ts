import dfRewardsABI from '@oceanprotocol/contracts/artifacts/contracts/df/DFRewards.sol/DFRewards.json'
import { sendTx } from '../../utils'
import { SmartContractWithAddress } from '../SmartContractWithAddress'
import { AbiItem, ReceiptOrEstimate } from '../../@types'

/**
 * Provides an interface for DFRewards contract
 */
export class DfRewards extends SmartContractWithAddress {
  getDefaultAbi() {
    return dfRewardsABI.abi as AbiItem[]
  }

  /** Get available DF Rewards for a token
   * @param {String} userAddress user address
   * @param {String} tokenAddress token address
   * @return {Promise<string>}
   */
  public async getAvailableRewards(
    userAddress: string,
    tokenAddress: string
  ): Promise<string> {
    const rewards = await this.contract.claimable(userAddress, tokenAddress)
    const rewardsFormated = await this.unitsToAmount(tokenAddress, rewards)

    return rewardsFormated
  }

  /**
   * claim rewards for any address
   * @param {String} userAddress user address to claim
   * @param {String} tokenAddress token address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async claimRewards<G extends boolean = false>(
    userAddress: string,
    tokenAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.estimateGas.claimFor(userAddress, tokenAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.claimFor,
      userAddress,
      tokenAddress
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * allocate rewards to address.  An approve must exist before calling this function.
   * @param {String[]} userAddresses array of users that will receive rewards
   * @param {String[]} amounts array of amounts
   * @param {String} tokenAddress token address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async allocateRewards<G extends boolean = false>(
    userAddresses: string[],
    amounts: string[],
    tokenAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    for (let i = 0; i < amounts.length; i++) {
      amounts[i] = await this.amountToUnits(tokenAddress, amounts[i])
    }
    const estGas = await this.contract.estimateGas.allocate(
      userAddresses,
      amounts,
      tokenAddress
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.allocate,
      userAddresses,
      amounts,
      tokenAddress
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
