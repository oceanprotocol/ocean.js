import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import defaultNFTDatatokenABI from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import { LoggerInstance, getFairGasPrice, generateDtName, Logger } from '../utils'

/**
 * ERC721 ROLES
 */
interface Roles {
  manager: boolean
  deployERC20: boolean
  updateMetadata: boolean
  store: boolean
}

export class NFTDatatoken {
  public GASLIMIT_DEFAULT = 1000000
  public factory721Address: string
  public factory721ABI: AbiItem | AbiItem[]
  public nftDatatokenABI: AbiItem | AbiItem[]
  public web3: Web3
  public startBlock: number

  constructor(web3: Web3, nftDatatokenABI?: AbiItem | AbiItem[], startBlock?: number) {
    this.nftDatatokenABI = nftDatatokenABI || (defaultNFTDatatokenABI.abi as AbiItem[])
    this.web3 = web3
    this.startBlock = startBlock || 0
  }

  /**
   * Create new ERC20 datatoken - only user with ERC20Deployer permission can succeed
   * @param {String} nftAddress ERC721 addreess
   * @param {String} address User address
   * @param {String} minter User set as initial minter for the ERC20
   * @param {String} feeManager initial feeManager for this DT
   * @param {String} mpFeeAddress Consume marketplace fee address
   * @param {String} feeToken address of the token marketplace wants to add fee on top
   * @param {String} feeAmount amount of feeToken to be transferred to mpFeeAddress on top, will be converted to WEI
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {Number} templateIndex NFT template index
   * @return {Promise<string>} ERC20 datatoken address
   */
  public async createERC20(
    nftAddress: string,
    address: string,
    minter: string,
    feeManager: string,
    mpFeeAddress: string,
    feeToken: string,
    feeAmount: string,
    cap: string,
    name?: string,
    symbol?: string,
    templateIndex?: number
  ): Promise<string> {
    if (!templateIndex) templateIndex = 1

    // Generate name & symbol if not present
    if (!name || !symbol) {
      ;({ name, symbol } = generateDtName())
    }

    // Create 721contract object
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    // Estimate gas for ERC20 token creation
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .createERC20(
          templateIndex,
          [name, symbol],
          [minter, feeManager, mpFeeAddress, feeToken],
          [this.web3.utils.toWei(cap), this.web3.utils.toWei(feeAmount)],
          []
        )
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call createERC20 token function of the contract
    const trxReceipt = await nftContract.methods
      .createERC20(
        templateIndex,
        [name, symbol],
        [minter, feeManager, mpFeeAddress, feeToken],
        [this.web3.utils.toWei(cap), this.web3.utils.toWei(feeAmount)],
        []
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    let tokenAddress = null
    try {
      tokenAddress = trxReceipt.events.ERC20Created.returnValues[0]
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to create datatoken : ${e.message}`)
    }
    return tokenAddress
  }

  /**
   * Add Manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be assing manager
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addManager(nftAddress: string, address: string, manager: string) {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    if ((await this.getNFTOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    // Estimate gas for add manager call
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .addManager(manager)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addManager function of the contract
    const trxReceipt = await nftContract.methods.addManager(manager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Removes a specific manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be removed as manager
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeManager(nftAddress: string, address: string, manager: string) {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    if ((await this.getNFTOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    // Estimate gas for removeManager method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .removeManager(manager)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke removeManager function of the contract
    const trxReceipt = await nftContract.methods.removeManager(manager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Add ERC20Deployer permission - only Manager can succeed
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} erc20Deployer User adress which is going to have erc20Deployer permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addERC20Deployer(
    nftAddress: string,
    address: string,
    erc20Deployer: string
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    // Estimate gas for addToCreateERC20List method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .addToCreateERC20List(erc20Deployer)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addToCreateERC20List function of the contract
    const trxReceipt = await nftContract.methods
      .addToCreateERC20List(erc20Deployer)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * Remove ERC20Deployer permission - only Manager can succeed
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} erc20Deployer Address of the user to be revoked ERC20Deployer Permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeERC20Deployer(
    nftAddress: string,
    address: string,
    erc20Deployer: string
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    // Estimate gas for removeFromCreateERC20List method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .removeFromCreateERC20List(erc20Deployer)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call removeFromCreateERC20List function of the contract
    const trxReceipt = await nftContract.methods
      .removeFromCreateERC20List(erc20Deployer)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * Add Metadata Updater permission - only Manager can succeed
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} metadataUpdater User adress which is going to have Metadata Updater permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addMetadataUpdater(
    nftAddress: string,
    address: string,
    metadataUpdater: string
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    // Estimate gas cost for addToMetadataList method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .addToMetadataList(metadataUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call addToMetadataList function of the contract
    const trxReceipt = await nftContract.methods.addToMetadataList(metadataUpdater).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Remove Metadata Updater permission - only Manager can succeed
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} metadataUpdater Address of the user to be revoked Metadata updater Permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeMetadataUpdater(
    nftAddress: string,
    address: string,
    metadataUpdater: string
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    // Estimate gas cost for removeFromMetadataList method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .removeFromMetadataList(metadataUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call removeFromMetadataList function of the contract
    const trxReceipt = await nftContract.methods
      .removeFromMetadataList(metadataUpdater)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * Add Store Updater permission - only Manager can succeed
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} storeUpdater User adress which is going to have Store Updater permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addStoreUpdater(
    nftAddress: string,
    address: string,
    storeUpdater: string
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    // Estimate gas cost for addTo725StoreList method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .addTo725StoreList(storeUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call addTo725StoreList function of the contract
    const trxReceipt = await nftContract.methods.addTo725StoreList(storeUpdater).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Remove Store Updater permission - only Manager can succeed
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} storeUpdater Address of the user to be revoked Store Updater Permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeStoreUpdater(
    nftAddress: string,
    address: string,
    storeUpdater: string
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    // Estimate gas cost for removeFrom725StoreList method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .removeFrom725StoreList(storeUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call removeFrom725StoreList function of the contract
    const trxReceipt = await nftContract.methods
      .removeFrom725StoreList(storeUpdater)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * This function allows to remove all ROLES at erc721 level: Managers, ERC20Deployer, MetadataUpdater, StoreUpdater
   * Even NFT Owner has to readd himself as Manager
   * Permissions at erc20 level stay.
   * Only NFT Owner  can call it.
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Owner adress
   * @return {Promise<TransactionReceipt>} trxReceipt
   */

  public async cleanPermissions(
    nftAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    if ((await this.getNFTOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    // Estimate gas cost for cleanPermissions method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .cleanPermissions()
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call cleanPermissions function of the contract
    const trxReceipt = await nftContract.methods.cleanPermissions().send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Transfers the NFT
   * will clean all permissions both on erc721 and erc20 level.
   * @param {String} nftAddress erc721 contract adress
   * @param {String} nftOwner Current NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async transferNFT(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId?: number
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    if ((await this.getNFTOwner(nftAddress)) !== nftOwner) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const tokenIdentifier = tokenId || 1

    // Estimate gas cost for transfer NFT method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .transferFrom(nftOwner, nftReceiver, tokenIdentifier)
        .estimateGas({ from: nftOwner }, (err, estGas) =>
          err ? gasLimitDefault : estGas
        )
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call transferFrom function of the contract
    const trxReceipt = await nftContract.methods
      .transferFrom(nftOwner, nftReceiver, tokenIdentifier)
      .send({
        from: nftOwner,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /** Get Owner
   * @param {String} nftAddress erc721 contract adress
   * @return {Promise<string>} string
   */
  public async getNFTOwner(nftAddress: string): Promise<string> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)
    const trxReceipt = await nftContract.methods.ownerOf(1).call()
    return trxReceipt
  }

  /** Get users NFT Permissions
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address user adress
   * @return {Promise<Roles>}
   */
  public async getNFTPermissions(nftAddress: string, address: string): Promise<Roles> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)
    const roles = await nftContract.methods._getPermissions(address).call()
    return roles
  }

  /** Gets data at a given `key`
   * @param {String} nftAddress erc721 contract adress
   * @param {String} key the key which value to retrieve
   * @return {Promise<string>} The data stored at the key
   */
  public async getData(nftAddress: string, key: string): Promise<string> {
    const nftContract = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)
    const data = await nftContract.methods.getData(key).call()
    return data
  }
}
