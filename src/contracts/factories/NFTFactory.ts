import Web3 from 'web3'
import { TransactionReceipt } from 'web3-core'
import { AbiItem } from 'web3-utils'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import {
  LoggerInstance,
  getFairGasPrice,
  generateDtName,
  getFreCreationParams,
  getErcCreationParams,
  getPoolCreationParams,
  estimateGas,
  ZERO_ADDRESS
} from '../../utils'
import {
  FreCreationParams,
  Erc20CreateParams,
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
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
   * @return {Promise<number>} Number of ERC20 Template added to this factory
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

  /** Get Datatoken(erc20) Template
   * @param {Number} index Template index
   * @return {Promise<Template>} DT Template info
   */
  public async getTokenTemplate(index: number): Promise<Template> {
    const template = await this.contract.methods.getTokenTemplate(index).call()
    return template
  }

  /** Check if ERC20 is deployed from the factory
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
   * Add a new erc721 token template - only factory Owner
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
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
   * Add a new erc721 token template - only factory Owner
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
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
   *      Users can have inifinite approvals for fees for factory instead of having one approval/ erc20 contract
   *      Requires previous approval of all :
   *          - consumeFeeTokens
   *          - publishMarketFeeTokens
   *          - erc20 datatokens
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
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for createNftWithErc20 method
   * @param address Caller address
   * @param _NftCreateData input data for nft creation
   * @param _ErcCreateData input data for erc20 creation
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */

  public async estGasCreateNftWithErc20(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams
  ): Promise<any> {
    const ercCreateData = getErcCreationParams(ercParams)
    return estimateGas(
      address,
      this.contract.methods.createNftWithErc20,
      nftCreateData,
      ercCreateData
    )
  }

  /**
   * @dev createNftWithErc20
   *      Creates a new NFT, then a ERC20,all in one call
   * @param address Caller address
   * @param _NftCreateData input data for nft creation
   * @param _ErcCreateData input data for erc20 creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */

  public async createNftWithErc20(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = getErcCreationParams(ercParams)

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
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for createNftErc20WithPool method
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param poolParams input data for Pool Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasCreateNftErc20WithPool(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    poolParams: PoolCreationParams
  ): Promise<any> {
    const ercCreateData = getErcCreationParams(ercParams)
    const poolData = await getPoolCreationParams(this.web3, poolParams)
    return estimateGas(
      address,
      this.contract.methods.createNftWithErc20WithPool,
      nftCreateData,
      ercCreateData,
      poolData
    )
  }

  /**
   * @dev createNftErc20WithPool
   *      Creates a new NFT, then a ERC20, then a Pool, all in one call
   *      Use this carefully, because if Pool creation fails, you are still going to pay a lot of gas
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param poolParams input data for Pool Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftErc20WithPool(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    poolParams: PoolCreationParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = getErcCreationParams(ercParams)
    const poolData = await getPoolCreationParams(this.web3, poolParams)

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
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /** Estimate gas cost for createNftErc20WithFixedRate method
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param freParams input data for FixedRate Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasCreateNftErc20WithFixedRate(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    freParams: FreCreationParams
  ): Promise<any> {
    const ercCreateData = getErcCreationParams(ercParams)
    const fixedData = await getFreCreationParams(freParams)
    return estimateGas(
      address,
      this.contract.methods.createNftWithErc20WithFixedRate,
      nftCreateData,
      ercCreateData,
      fixedData
    )
  }

  /**
   * @dev createNftErc20WithFixedRate
   *      Creates a new NFT, then a ERC20, then a FixedRateExchange, all in one call
   *      Use this carefully, because if Fixed Rate creation fails, you are still going to pay a lot of gas
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param freParams input data for FixedRate Creation
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftErc20WithFixedRate(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    freParams: FreCreationParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = getErcCreationParams(ercParams)
    const fixedData = getFreCreationParams(freParams)

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
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /** Estimate gas cost for createNftErc20WithFixedRate method
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param dispenserParams input data for Dispenser Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasCreateNftErc20WithDispenser(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    dispenserParams: DispenserCreationParams
  ): Promise<any> {
    const ercCreateData = getErcCreationParams(ercParams)
    return estimateGas(
      address,
      this.contract.methods.createNftWithErc20WithDispenser,
      nftCreateData,
      ercCreateData,
      dispenserParams
    )
  }

  /**
   * @dev createNftErc20WithDispenser
   *      Creates a new NFT, then a ERC20, then a Dispenser, all in one call
   *      Use this carefully, because if Dispenser creation fails, you are still going to pay a lot of gas
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param dispenserParams input data for Dispenser Creation
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftErc20WithDispenser(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    dispenserParams: DispenserCreationParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = getErcCreationParams(ercParams)

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
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }
}
