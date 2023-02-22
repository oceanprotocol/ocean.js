import { BigNumber, ethers } from 'ethers'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import { generateDtName, ZERO_ADDRESS, sendTx, getEventFromTx } from '../utils'
import {
  AbiItem,
  FreCreationParams,
  DatatokenCreateParams,
  DispenserCreationParams,
  NftCreateData,
  Template,
  TokenOrder,
  ReceiptOrEstimate
} from '../@types'
import { SmartContractWithAddress } from './SmartContractWithAddress'

/**
 * Provides an interface for NFT Factory contract
 */
export class NftFactory extends SmartContractWithAddress {
  getDefaultAbi() {
    return ERC721Factory.abi as AbiItem[]
  }

  /**
   * Create new NFT
   * @param {NFTCreateData} nftData
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<string>} NFT datatoken address
   */
  public async createNFT<G extends boolean = false>(
    nftData: NftCreateData,
    estimateGas?: G
  ): Promise<G extends false ? string : BigNumber> {
    if (!nftData.templateIndex) nftData.templateIndex = 1

    if (!nftData.name || !nftData.symbol) {
      const { name, symbol } = generateDtName()
      nftData.name = name
      nftData.symbol = symbol
    }
    if (nftData.templateIndex > (await this.getCurrentNFTTemplateCount())) {
      throw new Error(`Template index doesnt exist`)
    }

    if (nftData.templateIndex === 0) {
      throw new Error(`Template index cannot be ZERO`)
    }
    if ((await this.getNFTTemplate(nftData.templateIndex)).isActive === false) {
      throw new Error(`Template is not active`)
    }
    const estGas = await this.contract.estimateGas.deployERC721Contract(
      nftData.name,
      nftData.symbol,
      nftData.templateIndex,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      nftData.tokenURI,
      nftData.transferable,
      nftData.owner
    )
    if (estimateGas) return <G extends false ? string : BigNumber>estGas
    // Invoke createToken function of the contract
    const tx = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.deployERC721Contract,
      nftData.name,
      nftData.symbol,
      nftData.templateIndex,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      nftData.tokenURI,
      nftData.transferable,
      nftData.owner
    )
    const trxReceipt = await tx.wait()
    const events = getEventFromTx(trxReceipt, 'NFTCreated')
    return events.args[0]
  }

  /** Get Current NFT Count (NFT created)
   * @return {Promise<number>} Number of NFT created from this factory
   */
  public async getCurrentNFTCount(): Promise<number> {
    const nftCount = await this.contract.getCurrentNFTCount()
    return nftCount
  }

  /** Get Current Datatoken Count
   * @return {Promise<number>} Number of DTs created from this factory
   */
  public async getCurrentTokenCount(): Promise<number> {
    const tokenCount = await this.contract.getCurrentTokenCount()
    return tokenCount
  }

  /** Get Factory Owner
   * @return {Promise<string>} Factory Owner address
   */
  public async getOwner(): Promise<string> {
    const owner = await this.contract.owner()
    return owner
  }

  /** Get Current NFT Template Count
   * @return {Promise<number>} Number of NFT Template added to this factory
   */
  public async getCurrentNFTTemplateCount(): Promise<number> {
    const count = await this.contract.getCurrentNFTTemplateCount()
    return count
  }

  /** Get Current Template  Datatoken (ERC20) Count
   * @return {Promise<number>} Number of Datatoken Template added to this factory
   */
  public async getCurrentTokenTemplateCount(): Promise<number> {
    const count = await this.contract.getCurrentTemplateCount()
    return count
  }

  /** Get NFT Template
   * @param {Number} index Template index
   * @return {Promise<Template>} Number of Template added to this factory
   */
  public async getNFTTemplate(index: number): Promise<Template> {
    if (index > (await this.getCurrentNFTTemplateCount())) {
      throw new Error(`Template index doesnt exist`)
    }

    if (index === 0) {
      throw new Error(`Template index cannot be ZERO`)
    }
    const template = await this.contract.getNFTTemplate(index)
    return template
  }

  /** Get Datatoken (ERC20) Template
   * @param {Number} index Template index
   * @return {Promise<Template>} DT Template info
   */
  public async getTokenTemplate(index: number): Promise<Template> {
    const template = await this.contract.getTokenTemplate(index)
    return template
  }

  /** Check if Datatoken is deployed from the factory
   * @param {String} datatoken Datatoken address we want to check
   * @return {Promise<Boolean>} return true if deployed from this factory
   */
  public async checkDatatoken(datatoken: string): Promise<Boolean> {
    const isDeployed = await this.contract.erc20List(datatoken)
    return isDeployed
  }

  /** Check if  NFT is deployed from the factory
   * @param {String} nftAddress nftAddress address we want to check
   * @return {Promise<String>} return address(0) if it's not, or the nftAddress if true
   */
  public async checkNFT(nftAddress: string): Promise<String> {
    const confirmAddress = await this.contract.erc721List(nftAddress)
    return confirmAddress
  }

  /**
   * Add a new NFT token template - only factory Owner
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async addNFTTemplate<G extends boolean = false>(
    address: string,
    templateAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Factory Owner`)
    }
    if (templateAddress === ZERO_ADDRESS) {
      throw new Error(`Template cannot be ZERO address`)
    }

    const estGas = await this.contract.estimateGas.add721TokenTemplate(templateAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.add721TokenTemplate,
      templateAddress
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Disable token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to disable
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} current token template count
   */
  public async disableNFTTemplate<G extends boolean = false>(
    address: string,
    templateIndex: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Factory Owner`)
    }
    if (templateIndex > (await this.getCurrentNFTTemplateCount())) {
      throw new Error(`Template index doesnt exist`)
    }

    if (templateIndex === 0) {
      throw new Error(`Template index cannot be ZERO`)
    }
    const estGas = await this.contract.estimateGas.disable721TokenTemplate(templateIndex)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.disable721TokenTemplate,
      templateIndex
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Reactivate a previously disabled token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to reactivate
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} current token template count
   */
  public async reactivateNFTTemplate<G extends boolean = false>(
    address: string,
    templateIndex: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Factory Owner`)
    }
    if (templateIndex > (await this.getCurrentNFTTemplateCount())) {
      throw new Error(`Template index doesnt exist`)
    }

    if (templateIndex === 0) {
      throw new Error(`Template index cannot be ZERO`)
    }

    const estGas = await this.contract.estimateGas.reactivate721TokenTemplate(
      templateIndex
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.reactivate721TokenTemplate,
      templateIndex
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Add a new NFT token template - only factory Owner
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async addTokenTemplate<G extends boolean = false>(
    address: string,
    templateAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Factory Owner`)
    }
    if (templateAddress === ZERO_ADDRESS) {
      throw new Error(`Template cannot be address ZERO`)
    }

    const estGas = await this.contract.estimateGas.addTokenTemplate(templateAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.addTokenTemplate,
      templateAddress
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Disable token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to disable
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} current token template count
   */
  public async disableTokenTemplate<G extends boolean = false>(
    address: string,
    templateIndex: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Factory Owner`)
    }
    if (templateIndex > (await this.getCurrentTokenTemplateCount())) {
      throw new Error(`Template index doesnt exist`)
    }

    if (templateIndex === 0) {
      throw new Error(`Template index cannot be ZERO`)
    }
    if ((await this.getTokenTemplate(templateIndex)).isActive === false) {
      throw new Error(`Template is already disabled`)
    }
    const estGas = await this.contract.estimateGas.disableTokenTemplate(templateIndex)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.disableTokenTemplate,
      templateIndex
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Reactivate a previously disabled token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to reactivate
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} current token template count
   */
  public async reactivateTokenTemplate<G extends boolean = false>(
    address: string,
    templateIndex: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Factory Owner`)
    }
    if (templateIndex > (await this.getCurrentTokenTemplateCount())) {
      throw new Error(`Template index doesnt exist`)
    }

    if (templateIndex === 0) {
      throw new Error(`Template index cannot be ZERO`)
    }
    if ((await this.getTokenTemplate(templateIndex)).isActive === true) {
      throw new Error(`Template is already active`)
    }

    const estGas = await this.contract.estimateGas.reactivateTokenTemplate(templateIndex)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.reactivateTokenTemplate,
      templateIndex
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * @dev startMultipleTokenOrder
   *      Used as a proxy to order multiple services
   *      Users can have inifinite approvals for fees for factory instead of having one approval/ Datatoken contract
   *      Requires previous approval of all :
   *          - consumeFeeTokens
   *          - publishMarketFeeTokens
   *          - ERC20 Datatokens
   * @param orders an array of struct tokenOrder
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async startMultipleTokenOrder<G extends boolean = false>(
    orders: TokenOrder[],
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if (orders.length > 50) {
      throw new Error(`Too many orders`)
    }

    const estGas = await this.contract.estimateGas.startMultipleTokenOrder(orders)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.startMultipleTokenOrder,
      orders
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * @dev createNftWithDatatoken
   *      Creates a new NFT, then a Datatoken,all in one call
   * @param _NftCreateData input data for nft creation
   * @param _ErcCreateData input data for Datatoken creation
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */

  public async createNftWithDatatoken<G extends boolean = false>(
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const ercCreateData = await this.getErcCreationParams(dtParams)
    const estGas = await this.contract.estimateGas.createNftWithErc20(
      nftCreateData,
      ercCreateData
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.createNftWithErc20,
      nftCreateData,
      ercCreateData
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * @dev createNftWithDatatokenWithFixedRate
   *      Creates a new NFT, then a Datatoken, then a FixedRateExchange, all in one call
   *      Use this carefully, because if Fixed Rate creation fails, you are still going to pay a lot of gas
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param dtParams input data for Datatoken Creation
   * @param freParams input data for FixedRate Creation
   * @param {Boolean} estimateGas if True, return gas estimate
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftWithDatatokenWithFixedRate<G extends boolean = false>(
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams,
    freParams: FreCreationParams,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const ercCreateData = await this.getErcCreationParams(dtParams)
    const fixedData = await this.getFreCreationParams(freParams)

    const estGas = await this.contract.estimateGas.createNftWithErc20WithFixedRate(
      nftCreateData,
      ercCreateData,
      fixedData
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.createNftWithErc20WithFixedRate,
      nftCreateData,
      ercCreateData,
      fixedData
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * @dev createNftWithDatatokenWithDispenser
   *      Creates a new NFT, then a Datatoken, then a Dispenser, all in one call
   *      Use this carefully, because if Dispenser creation fails, you are still going to pay a lot of gas
   * @param nftCreateData input data for NFT Creation
   * @param dtParams input data for Datatoken Creation
   * @param dispenserParams input data for Dispenser Creation
   * @param {Boolean} estimateGas if True, return gas estimate
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftWithDatatokenWithDispenser<G extends boolean = false>(
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams,
    dispenserParams: DispenserCreationParams,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const ercCreateData = await this.getErcCreationParams(dtParams)

    dispenserParams.maxBalance = await this.amountToUnits(
      null,
      dispenserParams.maxBalance,
      18
    )

    dispenserParams.maxTokens = await this.amountToUnits(
      null,
      dispenserParams.maxTokens,
      18
    )

    const estGas = await this.contract.estimateGas.createNftWithErc20WithDispenser(
      nftCreateData,
      ercCreateData,
      dispenserParams
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.createNftWithErc20WithDispenser,
      nftCreateData,
      ercCreateData,
      dispenserParams
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  private async getErcCreationParams(dtParams: DatatokenCreateParams): Promise<any> {
    let name: string, symbol: string
    // Generate name & symbol if not present
    if (!dtParams.name || !dtParams.symbol) {
      ;({ name, symbol } = generateDtName())
    }
    return {
      templateIndex: dtParams.templateIndex,
      strings: [dtParams.name || name, dtParams.symbol || symbol],
      addresses: [
        dtParams.minter,
        dtParams.paymentCollector,
        dtParams.mpFeeAddress,
        dtParams.feeToken
      ],
      uints: [
        await this.amountToUnits(null, dtParams.cap, 18),
        await this.amountToUnits(null, dtParams.feeAmount, 18)
      ],
      bytess: []
    }
  }

  private async getFreCreationParams(freParams: FreCreationParams): Promise<any> {
    if (!freParams.allowedConsumer) freParams.allowedConsumer = ZERO_ADDRESS
    const withMint = freParams.withMint === false ? 0 : 1

    return {
      fixedPriceAddress: freParams.fixedRateAddress,
      addresses: [
        freParams.baseTokenAddress,
        freParams.owner,
        freParams.marketFeeCollector,
        freParams.allowedConsumer
      ],
      uints: [
        freParams.baseTokenDecimals,
        freParams.datatokenDecimals,
        await this.amountToUnits(null, freParams.fixedRate, 18),
        await this.amountToUnits(null, freParams.marketFee, 18),
        withMint
      ]
    }
  }
}
