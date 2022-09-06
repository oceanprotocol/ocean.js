import { AbiItem } from 'web3-utils'
import dfRewardsABI from '@oceanprotocol/contracts/artifacts/contracts/df/DFRewards.sol/DFRewards.json'
import { calculateEstimatedGas, sendTx } from '../../utils'
import { SmartContractWithAddress } from '../SmartContractWithAddress'
import { ReceiptOrEstimate } from '../../@types'

/**
 * Provides an interface for DFRewards contract
 */
export class DfRewards extends SmartContractWithAddress {
  getDefaultAbi(): AbiItem | AbiItem[] {
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
    const rewards = await this.contract.methods
      .claimable(userAddress, tokenAddress)
      .call()
    const rewardsFormated = await this.unitsToAmount(tokenAddress, rewards)

    return rewardsFormated
  }

  /**
   * claim rewards for any address
   * @param {String} fromUserAddress user that generates the tx
   * @param {String} userAddress user address to claim
   * @param {String} tokenAddress token address
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async claimRewards<G extends boolean = false>(
    fromUserAddress: string,
    userAddress: string,
    tokenAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      fromUserAddress,
      this.contract.methods.claimFor,
      userAddress,
      tokenAddress
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      fromUserAddress,
      estGas + 1,
      this.web3,
      this.config?.gasFeeMultiplier,
      this.contract.methods.claimFor,
      userAddress,
      tokenAddress
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * allocate rewards to address.  An approve must exist before calling this function.
   * @param {String} fromUserAddress user that generates the tx
   * @param {String[]} userAddresses array of users that will receive rewards
   * @param {String[]} amounts array of amounts
   * @param {String} tokenAddress token address
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async allocateRewards<G extends boolean = false>(
    fromUserAddress: string,
    userAddresses: string[],
    amounts: string[],
    tokenAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    for (let i = 0; i < amounts.length; i++) {
      amounts[i] = await this.amountToUnits(tokenAddress, amounts[i])
    }
    const estGas = await calculateEstimatedGas(
      fromUserAddress,
      this.contract.methods.allocate,
      userAddresses,
      amounts,
      tokenAddress
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      fromUserAddress,
      estGas + 1,
      this.web3,
      this.config?.gasFeeMultiplier,
      this.contract.methods.allocate,
      userAddresses,
      amounts,
      tokenAddress
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
