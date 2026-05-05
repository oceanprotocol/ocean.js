import FactoryRouter from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import { TransactionRequest } from 'ethers'
import {
  buildTxOverrides,
  buildUnsignedTx,
  sendPreparedTransaction
} from '../utils/ContractUtils.js'
import { Operation, ReceiptOrEstimate, AbiItem } from '../@types/index.js'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'

/**
 * Provides an interface for FactoryRouter contract
 */
export class Router extends SmartContractWithAddress {
  getDefaultAbi() {
    return FactoryRouter.abi as AbiItem[]
  }

  /**
   * * Buys a batch of datatokens.
   * one single call to buy multiple DT for multiple assets.
   * require tokenIn approvals for router from user. (except for dispenser operations)
   * @param {Operation[]} operations - The operations to execute.
   * @param {boolean} [estimateGas=false] - Whether to return only the estimate gas or not.
   * @return {Promise<ReceiptOrEstimate>} Transaction receipt
   */
  public async buyDatatokenBatch<G extends boolean = false>(
    operations: Operation[],
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.buyDTBatch.estimateGas(operations)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.buyDatatokenBatchTx(operations)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async buyDatatokenBatchTx(operations: Operation[]): Promise<TransactionRequest> {
    const estGas = await this.contract.buyDTBatch.estimateGas(operations)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.buyDTBatch, [operations], overrides)
  }

  /**
   * Checks if a token is on approved tokens list,
   * if true opfFee is lower in pools with that token/DT
   * @param {string} address - The address of the token to check.
   * @return {Promise<boolean>} true if is on the list.
   */
  public async isApprovedToken(address: string): Promise<boolean> {
    return await this.contract.isApprovedToken(address)
  }

  /**
   * Check if an address is a Fixed Rate contract.
   * @param {string} address - The address of the fixed rate exchange to check.
   * @return {Promise<boolean>} true if is a Fixed Rate contract
   */
  public async isFixedPrice(address: string): Promise<boolean> {
    return await this.contract.isFixedRateContract(address)
  }

  /**
   * Get Router Owner
   * @return {Promise<string>} Router Owner address
   */
  public async getOwner(): Promise<string> {
    return await this.contract.routerOwner()
  }

  /**
   * Get NFT Factory address
   * @return {Promise<string>} NFT Factory address
   */
  public async getNFTFactory(): Promise<string> {
    return await this.contract.factory()
  }

  /**
   * Adds a token to the list of tokens with reduced fees
   * @param {String} address caller address
   * @param {String} tokenAddress token address to add
   * @param {Boolean} [estimateGas] if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async addApprovedToken<G extends boolean = false>(
    address: string,
    tokenAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.contract.addApprovedToken.estimateGas(tokenAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const tx = await this.addApprovedTokenTx(address, tokenAddress)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async addApprovedTokenTx(
    address: string,
    tokenAddress: string
  ): Promise<TransactionRequest> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }
    const estGas = await this.contract.addApprovedToken.estimateGas(tokenAddress)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.addApprovedToken, [tokenAddress], overrides)
  }

  /**
   * Removes a token if exists from the list of tokens with reduced fees
   * @param {String} address caller address
   * @param {String} tokenAddress token address to remove
   * @param {Boolean} [estimateGas] if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async removeApprovedToken<G extends boolean = false>(
    address: string,
    tokenAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.contract.removeApprovedToken.estimateGas(tokenAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const tx = await this.removeApprovedTokenTx(address, tokenAddress)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async removeApprovedTokenTx(
    address: string,
    tokenAddress: string
  ): Promise<TransactionRequest> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }
    const estGas = await this.contract.removeApprovedToken.estimateGas(tokenAddress)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.removeApprovedToken, [tokenAddress], overrides)
  }

  /**
   * Adds an address to the list of fixed rate contracts
   * @param {String} address caller address
   * @param {String} tokenAddress contract address to add
   * @param {Boolean} [estimateGas] if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async addFixedRateContract<G extends boolean = false>(
    address: string,
    tokenAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.contract.addFixedRateContract.estimateGas(tokenAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const tx = await this.addFixedRateContractTx(address, tokenAddress)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async addFixedRateContractTx(
    address: string,
    tokenAddress: string
  ): Promise<TransactionRequest> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }
    const estGas = await this.contract.addFixedRateContract.estimateGas(tokenAddress)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.addFixedRateContract, [tokenAddress], overrides)
  }

  /**
   * Removes an address from the list of fixed rate contracts
   * @param {String} address caller address
   * @param {String} tokenAddress contract address to add
   * @param {Boolean} [estimateGas] if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async removeFixedRateContract<G extends boolean = false>(
    address: string,
    tokenAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.contract.removeFixedRateContract.estimateGas(tokenAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const tx = await this.removeFixedRateContractTx(address, tokenAddress)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async removeFixedRateContractTx(
    address: string,
    tokenAddress: string
  ): Promise<TransactionRequest> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }
    const estGas = await this.contract.removeFixedRateContract.estimateGas(tokenAddress)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.removeFixedRateContract,
      [tokenAddress],
      overrides
    )
  }

  /**
   * Adds an address to the list of dispensers
   * @param {String} address caller address
   * @param {String} tokenAddress contract address to add
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async addDispenserContract<G extends boolean = false>(
    address: string,
    tokenAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.contract.addDispenserContract.estimateGas(tokenAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const tx = await this.addDispenserContractTx(address, tokenAddress)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async addDispenserContractTx(
    address: string,
    tokenAddress: string
  ): Promise<TransactionRequest> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }
    const estGas = await this.contract.addDispenserContract.estimateGas(tokenAddress)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.addDispenserContract, [tokenAddress], overrides)
  }

  /**
   * Removes an address from the list of dispensers
   * @param {String} address caller address
   * @param {String} tokenAddress address Contract to be removed
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async removeDispenserContract<G extends boolean = false>(
    address: string,
    tokenAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.contract.removeDispenserContract.estimateGas(tokenAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const tx = await this.removeDispenserContractTx(address, tokenAddress)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async removeDispenserContractTx(
    address: string,
    tokenAddress: string
  ): Promise<TransactionRequest> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }
    const estGas = await this.contract.removeDispenserContract.estimateGas(tokenAddress)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.removeDispenserContract,
      [tokenAddress],
      overrides
    )
  }

  /** Get OPF Fee per token
   * @return {Promise<number>} OPC fee for a specific baseToken
   */
  public async getOPCFee(baseToken: string): Promise<number> {
    const fee = await this.contract.getOPCFee(baseToken)
    return Number(fee)
  }

  /** Get Current OPF Fee
   * @return {Promise<number>} OPF fee
   */
  public async getCurrentOPCFee(): Promise<number> {
    const fee = await this.contract.swapOceanFee()
    return Number(fee)
  }

  /**
   * Updates OP Community Fees
   * @param {String} address caller address
   * @param {number} newSwapOceanFee Amount charged for swapping with ocean approved tokens
   * @param {number} newSwapNonOceanFee Amount charged for swapping with non ocean approved tokens
   * @param {number} newConsumeFee Amount charged from consumeFees
   * @param {number} newProviderFee Amount charged for providerFees
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async updateOPCFee<G extends boolean = false>(
    address: string,
    newSwapOceanFee: number,
    newSwapNonOceanFee: number,
    newConsumeFee: number,
    newProviderFee: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.contract.updateOPCFee.estimateGas(
      newSwapOceanFee,
      newSwapNonOceanFee,
      newConsumeFee,
      newProviderFee
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const tx = await this.updateOPCFeeTx(
      address,
      newSwapOceanFee,
      newSwapNonOceanFee,
      newConsumeFee,
      newProviderFee
    )
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async updateOPCFeeTx(
    address: string,
    newSwapOceanFee: number,
    newSwapNonOceanFee: number,
    newConsumeFee: number,
    newProviderFee: number
  ): Promise<TransactionRequest> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }
    const estGas = await this.contract.updateOPCFee.estimateGas(
      newSwapOceanFee,
      newSwapNonOceanFee,
      newConsumeFee,
      newProviderFee
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.updateOPCFee,
      [newSwapOceanFee, newSwapNonOceanFee, newConsumeFee, newProviderFee],
      overrides
    )
  }
}
