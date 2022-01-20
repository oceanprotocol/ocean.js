import { Contract } from 'web3-eth-contract'
import Web3 from 'web3'
import { TransactionReceipt } from 'web3-core'
import { AbiItem } from 'web3-utils'
import defaultFactory721Abi from '../artifacts/ERC721Factory.sol/ERC721Factory.json'
import {
  LoggerInstance,
  getFairGasPrice,
  generateDtName,
  getFreCreationParams,
  getErcCreationParams,
  getPoolCreationParams
} from '../utils'
import {
  FreCreationParams,
  Erc20CreateParams,
  PoolCreationParams,
  DispenserCreationParams
} from '../interfaces'
import { ProviderFees } from '../@types/index.js'

interface Template {
  templateAddress: string
  isActive: boolean
}

export interface TokenOrder {
  tokenAddress: string
  consumer: string
  serviceIndex: number
  _providerFees: ProviderFees
}

export interface NftCreateData {
  name: string
  symbol: string
  templateIndex: number
  tokenURI: string
}

const addressZERO = '0x0000000000000000000000000000000000000000'
/**
 * Provides an interface for NFT Factory contract
 */
export class NftFactory {
  public GASLIMIT_DEFAULT = 1000000
  public factory721Address: string
  public factory721Abi: AbiItem | AbiItem[]
  public web3: Web3
  public startBlock: number
  public factory721: Contract

  /**
   * Instantiate Datatokens.
   * @param {String} factory721Address
   * @param {AbiItem | AbiItem[]} factory721ABI
   * @param {Web3} web3
   */
  constructor(
    factory721Address: string,
    web3: Web3,
    factory721Abi?: AbiItem | AbiItem[],
    startBlock?: number
  ) {
    this.factory721Address = factory721Address
    this.factory721Abi = factory721Abi || (defaultFactory721Abi.abi as AbiItem[])
    this.web3 = web3
    this.startBlock = startBlock || 0
    this.factory721 = new this.web3.eth.Contract(
      this.factory721Abi,
      this.factory721Address
    )
  }

  /**
   * Get estimated gas cost for deployERC721Contract value
   * @param {String} address
   * @param {String} nftData
   * @return {Promise<string>} NFT datatoken address
   */
  public async estGasCreateNFT(address: string, nftData: NftCreateData): Promise<string> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory721.methods
        .deployERC721Contract(
          nftData.name,
          nftData.symbol,
          nftData.templateIndex,
          addressZERO,
          nftData.tokenURI
        )
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
    const estGas = await this.estGasCreateNFT(address, nftData)

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .deployERC721Contract(
        nftData.name,
        nftData.symbol,
        nftData.templateIndex,
        addressZERO,
        nftData.tokenURI
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
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
    const trxReceipt = await this.factory721.methods.getCurrentNFTCount().call()
    return trxReceipt
  }

  /** Get Current Datatoken Count
   * @return {Promise<number>} Number of DTs created from this factory
   */
  public async getCurrentTokenCount(): Promise<number> {
    const trxReceipt = await this.factory721.methods.getCurrentTokenCount().call()
    return trxReceipt
  }

  /** Get Factory Owner
   * @return {Promise<string>} Factory Owner address
   */
  public async getOwner(): Promise<string> {
    const trxReceipt = await this.factory721.methods.owner().call()
    return trxReceipt
  }

  /** Get Current NFT Template Count
   * @return {Promise<number>} Number of NFT Template added to this factory
   */
  public async getCurrentNFTTemplateCount(): Promise<number> {
    const count = await this.factory721.methods.getCurrentNFTTemplateCount().call()
    return count
  }

  /** Get Current Template  Datatoken (ERC20) Count
   * @return {Promise<number>} Number of ERC20 Template added to this factory
   */
  public async getCurrentTokenTemplateCount(): Promise<number> {
    const count = await this.factory721.methods.getCurrentTemplateCount().call()
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
    const template = await this.factory721.methods.getNFTTemplate(index).call()
    return template
  }

  /** Get Datatoken(erc20) Template
   * @param {Number} index Template index
   * @return {Promise<Template>} DT Template info
   */
  public async getTokenTemplate(index: number): Promise<Template> {
    const template = await this.factory721.methods.getTokenTemplate(index).call()
    return template
  }

  /** Check if ERC20 is deployed from the factory
   * @param {String} datatoken Datatoken address we want to check
   * @return {Promise<Boolean>} return true if deployed from this factory
   */
  public async checkDatatoken(datatoken: string): Promise<Boolean> {
    const isDeployed = await this.factory721.methods.erc20List(datatoken).call()
    return isDeployed
  }

  /** Check if  NFT is deployed from the factory
   * @param {String} nftAddress nftAddress address we want to check
   * @return {Promise<String>} return address(0) if it's not, or the nftAddress if true
   */
  public async checkNFT(nftAddress: string): Promise<String> {
    const confirmAddress = await this.factory721.methods.erc721List(nftAddress).call()
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
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory721.methods
        .add721TokenTemplate(templateAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
    if (templateAddress === addressZERO) {
      throw new Error(`Template cannot be ZERO address`)
    }

    const estGas = await this.estGasAddNFTTemplate(address, templateAddress)

    // Invoke add721TokenTemplate function of the contract
    const trxReceipt = await this.factory721.methods
      .add721TokenTemplate(templateAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
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
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory721.methods
        .disable721TokenTemplate(templateIndex)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
    const estGas = await this.estGasDisableNFTTemplate(address, templateIndex)

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .disable721TokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
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
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory721.methods
        .reactivate721TokenTemplate(templateIndex)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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

    const estGas = await this.estGasReactivateNFTTemplate(address, templateIndex)

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .reactivate721TokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
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
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory721.methods
        .addTokenTemplate(templateAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
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
    if (templateAddress === addressZERO) {
      throw new Error(`Template cannot be address ZERO`)
    }

    const estGas = await this.estGasAddTokenTemplate(address, templateAddress)

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .addTokenTemplate(templateAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
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
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory721.methods
        .disableTokenTemplate(templateIndex)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
    if (templateIndex > (await this.getCurrentNFTTemplateCount())) {
      throw new Error(`Template index doesnt exist`)
    }

    if (templateIndex === 0) {
      throw new Error(`Template index cannot be ZERO`)
    }
    if ((await this.getNFTTemplate(templateIndex)).isActive === false) {
      throw new Error(`Template is already disabled`)
    }
    const estGas = await this.estGasDisableTokenTemplate(address, templateIndex)

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .disableTokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
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
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory721.methods
        .reactivateTokenTemplate(templateIndex)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
    if (templateIndex > (await this.getCurrentNFTTemplateCount())) {
      throw new Error(`Template index doesnt exist`)
    }

    if (templateIndex === 0) {
      throw new Error(`Template index cannot be ZERO`)
    }
    if ((await this.getTokenTemplate(templateIndex)).isActive === true) {
      throw new Error(`Template is already active`)
    }

    const estGas = await this.estGasReactivateTokenTemplate(address, templateIndex)

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .reactivateTokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
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
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory721.methods
        .startMultipleTokenOrder(orders)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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

    const estGas = await this.estGasStartMultipleTokenOrder(address, orders)

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .startMultipleTokenOrder(orders)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for createNftWithErc method
   * @param address Caller address
   * @param _NftCreateData input data for nft creation
   * @param _ErcCreateData input data for erc20 creation
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */

  public async estGasCreateNftWithErc(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams
  ): Promise<any> {
    // Get estimated gas value
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      const ercCreateData = getErcCreationParams(ercParams)
      estGas = await this.factory721.methods
        .createNftWithErc(nftCreateData, ercCreateData)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * @dev createNftWithErc
   *      Creates a new NFT, then a ERC20,all in one call
   * @param address Caller address
   * @param _NftCreateData input data for nft creation
   * @param _ErcCreateData input data for erc20 creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */

  public async createNftWithErc(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = getErcCreationParams(ercParams)

    const estGas = await this.estGasCreateNftWithErc(address, nftCreateData, ercParams)
    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .createNftWithErc(nftCreateData, ercCreateData)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for createNftErcWithPool method
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param poolParams input data for Pool Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasCreateNftErcWithPool(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    poolParams: PoolCreationParams
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      const ercCreateData = getErcCreationParams(ercParams)
      const poolData = getPoolCreationParams(poolParams)
      estGas = await this.factory721.methods
        .createNftErcWithPool(nftCreateData, ercCreateData, poolData)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * @dev createNftErcWithPool
   *      Creates a new NFT, then a ERC20, then a Pool, all in one call
   *      Use this carefully, because if Pool creation fails, you are still going to pay a lot of gas
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param poolParams input data for Pool Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftErcWithPool(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    poolParams: PoolCreationParams
  ): Promise<TransactionReceipt> {
    const estGas = await this.estGasCreateNftErcWithPool(
      address,
      nftCreateData,
      ercParams,
      poolParams
    )
    const ercCreateData = getErcCreationParams(ercParams)
    const poolData = getPoolCreationParams(poolParams)

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .createNftErcWithPool(nftCreateData, ercCreateData, poolData)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /** Estimate gas cost for createNftErcWithFixedRate method
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param freParams input data for FixedRate Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasCreateNftErcWithFixedRate(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    freParams: FreCreationParams
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas

    const ercCreateData = getErcCreationParams(ercParams)

    const fixedData = getFreCreationParams(freParams)

    try {
      estGas = await this.factory721.methods
        .createNftErcWithFixedRate(nftCreateData, ercCreateData, fixedData)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * @dev createNftErcWithFixedRate
   *      Creates a new NFT, then a ERC20, then a FixedRateExchange, all in one call
   *      Use this carefully, because if Fixed Rate creation fails, you are still going to pay a lot of gas
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param freParams input data for FixedRate Creation
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftErcWithFixedRate(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    freParams: FreCreationParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = getErcCreationParams(ercParams)
    const fixedData = getFreCreationParams(freParams)

    const estGas = await this.estGasCreateNftErcWithFixedRate(
      address,
      nftCreateData,
      ercParams,
      freParams
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .createNftErcWithFixedRate(nftCreateData, ercCreateData, fixedData)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /** Estimate gas cost for createNftErcWithFixedRate method
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param dispenserParams input data for Dispenser Creation
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasCreateNftErcWithDispenser(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    dispenserParams: DispenserCreationParams
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas

    const ercCreateData = getErcCreationParams(ercParams)

    try {
      estGas = await this.factory721.methods
        .createNftErcWithDispenser(nftCreateData, ercCreateData, dispenserParams)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
      LoggerInstance.error('Failed to estimate gas for createNftErcWithDispenser', e)
    }
    return estGas
  }

  /**
   * @dev createNftErcWithDispenser
   *      Creates a new NFT, then a ERC20, then a Dispenser, all in one call
   *      Use this carefully, because if Dispenser creation fails, you are still going to pay a lot of gas
   * @param address Caller address
   * @param nftCreateData input data for NFT Creation
   * @param ercParams input data for ERC20 Creation
   * @param dispenserParams input data for Dispenser Creation
   *  @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async createNftErcWithDispenser(
    address: string,
    nftCreateData: NftCreateData,
    ercParams: Erc20CreateParams,
    dispenserParams: DispenserCreationParams
  ): Promise<TransactionReceipt> {
    const ercCreateData = getErcCreationParams(ercParams)

    const estGas = await this.estGasCreateNftErcWithDispenser(
      address,
      nftCreateData,
      ercParams,
      dispenserParams
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .createNftErcWithDispenser(nftCreateData, ercCreateData, dispenserParams)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }
}
