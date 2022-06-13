import Web3 from 'web3'
import { TransactionReceipt } from 'web3-core'
import { AbiItem } from 'web3-utils'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import { LoggerInstance, generateDtName, estimateGas, ZERO_ADDRESS } from '../../utils'
import {
  FreCreationParams,
  DatatokenCreateParams,
  PoolCreationParams,
  DispenserCreationParams,
  NftCreateData,
  Template,
  TokenOrder
} from '../../@types'
import { SmartContractWithAddress } from '..'

/**
 * Provides an interface for NFT Factory contract
 */
export class NftFactory extends SmartContractWithAddress {
  getDefaultAbi(): AbiItem | AbiItem[] {
    return ERC721Factory.abi as AbiItem[]
  }

  /**
   * Get estimated gas cost for deployERC721Contract value
   * @param {String} address
   * @param {String} nftData
   * @return {Promise<string>} NFT datatoken address
   */
  public async estGasCreateNFT(address: string, nftData: NftCreateData): Promise<string> {
    return estimateGas(
      address,
      this.contract.methods.deployERC721Contract,
      nftData.name,
      nftData.symbol,
      nftData.templateIndex,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      nftData.tokenURI,
      nftData.transferable,
      nftData.owner
    )
  }

  /**
   * Create new NFT
   * @param {String} address
   * @param {NFTCreateData} nftData
   * @return {Promise<string>} NFT datatoken address
   */
  public async createNFT(address: string, nftData: NftCreateData): Promise<string> {
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
    const estGas = await estimateGas(
      address,
      this.contract.methods.deployERC721Contract,
      nftData.name,
      nftData.symbol,
      nftData.templateIndex,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      nftData.tokenURI,
      nftData.transferable,
      nftData.owner
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .deployERC721Contract(
        nftData.name,
        nftData.symbol,
        nftData.templateIndex,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        nftData.tokenURI,
        nftData.transferable,
        nftData.owner
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    let tokenAddress = null
    try {
      tokenAddress = trxReceipt.events.NFTCreated.returnValues[0]
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to create datatoken : ${e.message}`)
    }
    return tokenAddress
  }

  /** Get Current NFT Count (NFT created)
   * @return {Promise<number>} Number of NFT created from this factory
   */
  public async getCurrentNFTCount(): Promise<number> {
    const trxReceipt = await this.contract.methods.getCurrentNFTCount().call()
    return trxReceipt
  }

  /** Get Current Datatoken Count
   * @return {Promise<number>} Number of DTs created from this factory
   */
  public async getCurrentTokenCount(): Promise<number> {
    const trxReceipt = await this.contract.methods.getCurrentTokenCount().call()
    return trxReceipt
  }

  /** Get Factory Owner
   * @return {Promise<string>} Factory Owner address
   */
  public async getOwner(): Promise<string> {
    const trxReceipt = await this.contract.methods.owner().call()
    return trxReceipt
  }

  /** Get Current NFT Template Count
   * @return {Promise<number>} Number of NFT Template added to this factory
   */
  public async getCurrentNFTTemplateCount(): Promise<number> {
    const count = await this.contract.methods.getCurrentNFTTemplateCount().call()
    return count
  }

  /** Get Current Template  Datatoken (ERC20) Count
   * @return {Promise<number>} Number of Datatoken Template added to this factory
   */
  public async getCurrentTokenTemplateCount(): Promise<number> {
    const count = await this.contract.methods.getCurrentTemplateCount().call()
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
    const template = await this.contract.methods.getNFTTemplate(index).call()
    return template
  }

  /** Get Datatoken (ERC20) Template
   * @param {Number} index Template index
   * @return {Promise<Template>} DT Template info
   */
  public async getTokenTemplate(index: number): Promise<Template> {
    const template = await this.contract.methods.getTokenTemplate(index).call()
    return template
  }

  /** Check if Datatoken is deployed from the factory
   * @param {String} datatoken Datatoken address we want to check
   * @return {Promise<Boolean>} return true if deployed from this factory
   */
  public async checkDatatoken(datatoken: string): Promise<Boolean> {
    const isDeployed = await this.contract.methods.erc20List(datatoken).call()
    return isDeployed
  }

  /** Check if  NFT is deployed from the factory
   * @param {String} nftAddress nftAddress address we want to check
   * @return {Promise<String>} return address(0) if it's not, or the nftAddress if true
   */
  public async checkNFT(nftAddress: string): Promise<String> {
    const confirmAddress = await this.contract.methods.erc721List(nftAddress).call()
    return confirmAddress
  }

  /**
   * Estimate gas cost for add721TokenTemplate method
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasAddNFTTemplate(
    address: string,
    templateAddress: string
  ): Promise<any> {
    return estimateGas(
      address,
      this.contract.methods.add721TokenTemplate,
      templateAddress
    )
  }

  /**
   * Add a new NFT token template - only factory Owner
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addNFTTemplate(
    address: string,
    templateAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Factory Owner`)
    }
    if (templateAddress === ZERO_ADDRESS) {
      throw new Error(`Template cannot be ZERO address`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.add721TokenTemplate,
      templateAddress
    )

    // Invoke add721TokenTemplate function of the contract
    const trxReceipt = await this.contract.methods
      .add721TokenTemplate(templateAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for disable721TokenTemplate method
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to disable
   * @return {Promise<TransactionReceipt>} current token template count
   */
  public async estGasDisableNFTTemplate(
    address: string,
    templateIndex: number
  ): Promise<any> {
    return estimateGas(
      address,
      this.contract.methods.disable721TokenTemplate,
      templateIndex
    )
  }

  /**
   * Disable token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to disable
   * @return {Promise<TransactionReceipt>} current token template count
   */
  public async disableNFTTemplate(
    address: string,
    templateIndex: number
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Factory Owner`)
    }
    if (templateIndex > (await this.getCurrentNFTTemplateCount())) {
      throw new Error(`Template index doesnt exist`)
    }

    if (templateIndex === 0) {
      throw new Error(`Template index cannot be ZERO`)
    }
    const estGas = await estimateGas(
      address,
      this.contract.methods.disable721TokenTemplate,
      templateIndex
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .disable721TokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Reactivate a previously disabled token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to reactivate
   * @return {Promise<TransactionReceipt>} current token template count
   */
  public async estGasReactivateNFTTemplate(
    address: string,
    templateIndex: number
  ): Promise<any> {
    return estimateGas(
      address,
      this.contract.methods.reactivate721TokenTemplate,
      templateIndex
    )
  }

  /**
   * Reactivate a previously disabled token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to reactivate
   * @return {Promise<TransactionReceipt>} current token template count
   */
  public async reactivateNFTTemplate(
    address: string,
    templateIndex: number
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Factory Owner`)
    }
    if (templateIndex > (await this.getCurrentNFTTemplateCount())) {
      throw new Error(`Template index doesnt exist`)
    }

    if (templateIndex === 0) {
      throw new Error(`Template index cannot be ZERO`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.reactivate721TokenTemplate,
      templateIndex
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .reactivate721TokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addTokenTemplate method
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasAddTokenTemplate(
    address: string,
    templateAddress: string
  ): Promise<any> {
    return estimateGas(address, this.contract.methods.addTokenTemplate, templateAddress)
  }

  /**
   * Add a new NFT token template - only factory Owner
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addTokenTemplate(
    address: string,
    templateAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Factory Owner`)
    }
    if (templateAddress === ZERO_ADDRESS) {
      throw new Error(`Template cannot be address ZERO`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.addTokenTemplate,
      templateAddress
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .addTokenTemplate(templateAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for disableTokenTemplate method
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to disable
   * @return {Promise<TransactionReceipt>} current token template count
   */
  public async estGasDisableTokenTemplate(
    address: string,
    templateIndex: number
  ): Promise<any> {
    return estimateGas(address, this.contract.methods.disableTokenTemplate, templateIndex)
  }

  /**
   * Disable token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to disable
   * @return {Promise<TransactionReceipt>} current token template count
   */
  public async disableTokenTemplate(
    address: string,
    templateIndex: number
  ): Promise<TransactionReceipt> {
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
    const estGas = await estimateGas(
      address,
      this.contract.methods.disableTokenTemplate,
      templateIndex
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .disableTokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for reactivateTokenTemplate method
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to reactivate
   * @return {Promise<TransactionReceipt>} current token template count
   */
  public async estGasReactivateTokenTemplate(
    address: string,
    templateIndex: number
  ): Promise<any> {
    return estimateGas(
      address,
      this.contract.methods.reactivateTokenTemplate,
      templateIndex
    )
  }

  /**
   * Reactivate a previously disabled token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to reactivate
   * @return {Promise<TransactionReceipt>} current token template count
   */
  public async reactivateTokenTemplate(
    address: string,
    templateIndex: number
  ): Promise<TransactionReceipt> {
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

    const estGas = await estimateGas(
      address,
      this.contract.methods.reactivateTokenTemplate,
      templateIndex
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .reactivateTokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /** Estimate gas cost for startMultipleTokenOrder method
   * @param address Caller address
   * @param orders an array of struct tokenOrder
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasStartMultipleTokenOrder(
    address: string,
    orders: TokenOrder[]
  ): Promise<any> {
    return estimateGas(address, this.contract.methods.startMultipleTokenOrder, orders)
  }

  /**
   * @dev startMultipleTokenOrder
   *      Used as a proxy to order multiple services
   *      Users can have inifinite approvals for fees for factory instead of having one approval/ Datatoken contract
   *      Requires previous approval of all :
   *          - consumeFeeTokens
   *          - publishMarketFeeTokens
   *          - ERC20 Datatokens
   * @param address Caller address
   * @param orders an array of struct tokenOrder
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async startMultipleTokenOrder(
    address: string,
    orders: TokenOrder[]
  ): Promise<TransactionReceipt> {
    if (orders.length > 50) {
      throw new Error(`Too many orders`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.startMultipleTokenOrder,
      orders
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods.startMultipleTokenOrder(orders).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for createNftWithDatatoken method
   * @param address Caller address
   * @param _NftCreateData input data for NFT creation
   * @param _ErcCreateData input data for Datatoken creation
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */

  public async estGasCreateNftWithDatatoken(
    address: string,
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams
  ): Promise<any> {
    const ercCreateData = this.getErcCreationParams(dtParams)
    return estimateGas(
      address,
      this.contract.methods.createNftWithErc20,
      nftCreateData,
      ercCreateData
    )
  }

  /**
   * @dev createNftWithDatatoken
   *      Creates a new NFT, then a Datatoken,all in one call
   * @param address Caller address
   * @param _NftCreateData input data for nft creation
   * @param _ErcCreateData input data for Datatoken creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */

  public async createNftWithDatatoken(
    address: string,
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = this.getErcCreationParams(dtParams)

    const estGas = await estimateGas(
      address,
      this.contract.methods.createNftWithErc20,
      nftCreateData,
      ercCreateData
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .createNftWithErc20(nftCreateData, ercCreateData)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for createNftWithDatatokenWithPool method
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param dtParams input data for Datatoken Creation
   * @param poolParams input data for Pool Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasCreateNftWithDatatokenWithPool(
    address: string,
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams,
    poolParams: PoolCreationParams
  ): Promise<any> {
    const ercCreateData = this.getErcCreationParams(dtParams)
    const poolData = await this.getPoolCreationParams(poolParams)
    return estimateGas(
      address,
      this.contract.methods.createNftWithErc20WithPool,
      nftCreateData,
      ercCreateData,
      poolData
    )
  }

  /**
   * @dev createNftWithDatatokenWithPool
   *      Creates a new NFT, then a Datatoken, then a Pool, all in one call
   *      Use this carefully, because if Pool creation fails, you are still going to pay a lot of gas
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param dtParams input data for Datatoken Creation
   * @param poolParams input data for Pool Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftWithDatatokenWithPool(
    address: string,
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams,
    poolParams: PoolCreationParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = this.getErcCreationParams(dtParams)
    const poolData = await this.getPoolCreationParams(poolParams)

    const estGas = await estimateGas(
      address,
      this.contract.methods.createNftWithErc20WithPool,
      nftCreateData,
      ercCreateData,
      poolData
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .createNftWithErc20WithPool(nftCreateData, ercCreateData, poolData)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /** Estimate gas cost for createNftWithDatatokenWithFixedRate method
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param dtParams input data for Datatoken Creation
   * @param freParams input data for FixedRate Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasCreateNftWithDatatokenWithFixedRate(
    address: string,
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams,
    freParams: FreCreationParams
  ): Promise<any> {
    const ercCreateData = this.getErcCreationParams(dtParams)
    const fixedData = await this.getFreCreationParams(freParams)
    return estimateGas(
      address,
      this.contract.methods.createNftWithErc20WithFixedRate,
      nftCreateData,
      ercCreateData,
      fixedData
    )
  }

  /**
   * @dev createNftWithDatatokenWithFixedRate
   *      Creates a new NFT, then a Datatoken, then a FixedRateExchange, all in one call
   *      Use this carefully, because if Fixed Rate creation fails, you are still going to pay a lot of gas
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param dtParams input data for Datatoken Creation
   * @param freParams input data for FixedRate Creation
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftWithDatatokenWithFixedRate(
    address: string,
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams,
    freParams: FreCreationParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = this.getErcCreationParams(dtParams)
    const fixedData = this.getFreCreationParams(freParams)

    const estGas = await estimateGas(
      address,
      this.contract.methods.createNftWithErc20WithFixedRate,
      nftCreateData,
      ercCreateData,
      fixedData
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .createNftWithErc20WithFixedRate(nftCreateData, ercCreateData, fixedData)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /** Estimate gas cost for estGasCreateNftWithDatatokenWithDispenser method
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param dtParams input data for Datatoken Creation
   * @param dispenserParams input data for Dispenser Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasCreateNftWithDatatokenWithDispenser(
    address: string,
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams,
    dispenserParams: DispenserCreationParams
  ): Promise<any> {
    const ercCreateData = this.getErcCreationParams(dtParams)
    return estimateGas(
      address,
      this.contract.methods.createNftWithErc20WithDispenser,
      nftCreateData,
      ercCreateData,
      dispenserParams
    )
  }

  /**
   * @dev createNftWithDatatokenWithDispenser
   *      Creates a new NFT, then a Datatoken, then a Dispenser, all in one call
   *      Use this carefully, because if Dispenser creation fails, you are still going to pay a lot of gas
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param dtParams input data for Datatoken Creation
   * @param dispenserParams input data for Dispenser Creation
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftWithDatatokenWithDispenser(
    address: string,
    nftCreateData: NftCreateData,
    dtParams: DatatokenCreateParams,
    dispenserParams: DispenserCreationParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = this.getErcCreationParams(dtParams)

    dispenserParams.maxBalance = Web3.utils.toWei(dispenserParams.maxBalance)
    dispenserParams.maxTokens = Web3.utils.toWei(dispenserParams.maxTokens)

    const estGas = await estimateGas(
      address,
      this.contract.methods.createNftWithErc20WithDispenser,
      nftCreateData,
      ercCreateData,
      dispenserParams
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .createNftWithErc20WithDispenser(nftCreateData, ercCreateData, dispenserParams)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  private getErcCreationParams(dtParams: DatatokenCreateParams): any {
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
      uints: [Web3.utils.toWei(dtParams.cap), Web3.utils.toWei(dtParams.feeAmount)],
      bytess: []
    }
  }

  private getFreCreationParams(freParams: FreCreationParams): any {
    if (!freParams.allowedConsumer) freParams.allowedConsumer = ZERO_ADDRESS
    const withMint = freParams.withMint ? 1 : 0

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
        Web3.utils.toWei(freParams.fixedRate),
        Web3.utils.toWei(freParams.marketFee),
        withMint
      ]
    }
  }

  private async getPoolCreationParams(poolParams: PoolCreationParams): Promise<any> {
    return {
      addresses: [
        poolParams.ssContract,
        poolParams.baseTokenAddress,
        poolParams.baseTokenSender,
        poolParams.publisherAddress,
        poolParams.marketFeeCollector,
        poolParams.poolTemplateAddress
      ],
      ssParams: [
        Web3.utils.toWei(poolParams.rate),
        poolParams.baseTokenDecimals,
        Web3.utils.toWei(poolParams.vestingAmount),
        poolParams.vestedBlocks,
        await this.amountToUnits(
          poolParams.baseTokenAddress,
          poolParams.initialBaseTokenLiquidity
        )
      ],
      swapFees: [
        Web3.utils.toWei(poolParams.swapFeeLiquidityProvider),
        Web3.utils.toWei(poolParams.swapFeeMarketRunner)
      ]
    }
  }
}
