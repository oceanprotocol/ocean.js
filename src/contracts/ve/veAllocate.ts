import { AbiItem } from 'web3-utils'
import veAllocateABI from '@oceanprotocol/contracts/artifacts/contracts/ve/veAllocate.sol/veAllocate.json'
import { calculateEstimatedGas, sendTx } from '../../utils'
import { SmartContractWithAddress } from '../SmartContractWithAddress'
import { ReceiptOrEstimate } from '../../@types'
/**
 * Provides an interface for veOcean contract
 */
export class VeAllocate extends SmartContractWithAddress {
  getDefaultAbi(): AbiItem | AbiItem[] {
    return veAllocateABI.abi as AbiItem[]
  }

  /**
   * set a specific percentage*100 of veOcean to a specific nft
   * Maximum allocated percentage is 10000
   * @param {String} userAddress user address
   * @param {String} amount Percentage used (*100)
   * @param {String} nft NFT address to allocate to
   * @param {String} chainId chainId of NFT
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async setAllocation<G extends boolean = false>(
    userAddress: string,
    amount: string,
    nft: string,
    chainId: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      userAddress,
      this.contract.methods.setAllocation,
      amount,
      nft,
      chainId
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      userAddress,
      estGas + 1,
      this.web3,
      this.config?.gasFeeMultiplier,
      this.contract.methods.setAllocation,
      amount,
      nft,
      chainId
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * set a specific percentage*100 of veOcean to a specific nft
   * Maximum allocated percentage is 10000
   * @param {String} userAddress user address
   * @param {String[]} amount Array of percentages used (*100)
   * @param {String[]} nft Array of NFT addresses
   * @param {String[]} chainId Array of chainIds
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async setBatchAllocation<G extends boolean = false>(
    userAddress: string,
    amount: string[],
    nft: string[],
    chainId: number[],
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      userAddress,
      this.contract.methods.setBatchAllocation,
      amount,
      nft,
      chainId
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      userAddress,
      estGas + 1,
      this.web3,
      this.config?.gasFeeMultiplier,
      this.contract.methods.setBatchAllocation,
      amount,
      nft,
      chainId
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
