import veAllocateABI from '@oceanprotocol/contracts/artifacts/contracts/ve/veAllocate.sol/veAllocate.json'
import { sendTx } from '../../utils'
import { SmartContractWithAddress } from '../SmartContractWithAddress'
import { ReceiptOrEstimate, AbiItem } from '../../@types'
/**
 * Provides an interface for veOcean contract
 */
export class VeAllocate extends SmartContractWithAddress {
  getDefaultAbi() {
    return veAllocateABI.abi as AbiItem[]
  }

  /**
   * set a specific percentage of veOcean to a specific nft
   * Maximum allocated percentage is 10000, so 1% is specified as 100
   * @param {String} amount Percentage used
   * @param {String} nft NFT address to allocate to
   * @param {String} chainId chainId of NFT
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async setAllocation<G extends boolean = false>(
    amount: string,
    nft: string,
    chainId: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.estimateGas.setAllocation(amount, nft, chainId)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas.add(20000),
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.setAllocation,
      amount,
      nft,
      chainId
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * set specific percetage of veOcean to multiple nfts
   * Maximum allocated percentage is 10000, so 1% is specified as 100
   * @param {String[]} amount Array of percentages used
   * @param {String[]} nft Array of NFT addresses
   * @param {String[]} chainId Array of chainIds
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async setBatchAllocation<G extends boolean = false>(
    amount: string[],
    nft: string[],
    chainId: number[],
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.estimateGas.setBatchAllocation(
      amount,
      nft,
      chainId
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    // Invoke function of the contract
    const trxReceipt = await sendTx(
      estGas.add(20000),
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.setBatchAllocation,
      amount,
      nft,
      chainId
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /** Get totalAllocation for address
   * @param {String} userAddress user address
   * @return {Promise<number>}
   */
  public async getTotalAllocation(userAddress: string): Promise<number> {
    const allocation = await this.contract.getTotalAllocation(userAddress)
    return allocation
  }

  /** Get getveAllocation for address, nft, chainId
   * @param {String} userAddress user address
   * @param {String} nft NFT address to allocate to
   * @param {String} chainId chainId of NFT
   * @return {Promise<number>}
   */
  public async getVeAllocation(
    userAddress: string,
    nft: string,
    chainId: string
  ): Promise<number> {
    const allocation = await this.contract.getveAllocation(userAddress, nft, chainId)
    return allocation
  }
}
