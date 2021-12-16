import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import defaultNftAbi from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import { LoggerInstance, getFairGasPrice, generateDtName } from '../utils'
import { Contract } from 'web3-eth-contract'

/**
 * ERC721 ROLES
 */
interface Roles {
  manager: boolean
  deployErc20: boolean
  updateMetadata: boolean
  store: boolean
}

export class Nft {
  public GASLIMIT_DEFAULT = 1000000
  public factory721Address: string
  public factory721Abi: AbiItem | AbiItem[]
  public nftAbi: AbiItem | AbiItem[]
  public web3: Web3
  public startBlock: number

  constructor(web3: Web3, nftAbi?: AbiItem | AbiItem[], startBlock?: number) {
    this.nftAbi = nftAbi || (defaultNftAbi.abi as AbiItem[])
    this.web3 = web3
    this.startBlock = startBlock || 0
  }

  /**
   *  Estimate gas cost for createERC20 token creation
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
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasCreateErc20(
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
    templateIndex?: number,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)
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
    return estGas
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
  public async createErc20(
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
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const estGas = await this.estGasCreateErc20(
      nftAddress,
      address,
      minter,
      feeManager,
      mpFeeAddress,
      feeToken,
      feeAmount,
      cap,
      name,
      symbol,
      templateIndex,
      nftContract
    )

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
      tokenAddress = trxReceipt.events.TokenCreated.returnValues[0]
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to create datatoken : ${e.message}`)
    }
    return tokenAddress
  }

  /**
   * Estimate gas cost for add manager call
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be assing manager
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasAddManager(
    nftAddress: string,
    address: string,
    manager: string,
    contractInstance?: Contract
  ) {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .addManager(manager)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Add Manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be assing manager
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addManager(nftAddress: string, address: string, manager: string) {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await this.estGasAddManager(nftAddress, address, manager, nftContract)

    // Invoke addManager function of the contract
    const trxReceipt = await nftContract.methods.addManager(manager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removeManager method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be removed as manager
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasRemoveManager(
    nftAddress: string,
    address: string,
    manager: string,
    contractInstance?: Contract
  ) {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .removeManager(manager)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Removes a specific manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be removed as manager
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeManager(nftAddress: string, address: string, manager: string) {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await this.estGasRemoveManager(
      nftAddress,
      address,
      manager,
      nftContract
    )

    // Invoke removeManager function of the contract
    const trxReceipt = await nftContract.methods.removeManager(manager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   *  Estimate gas cost for addToCreateERC20List method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} erc20Deployer User adress which is going to have erc20Deployer permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasAddErc20Deployer(
    nftAddress: string,
    address: string,
    erc20Deployer: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .addToCreateERC20List(erc20Deployer)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
  }

  /**
   * Add ERC20Deployer permission - only Manager can succeed
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} erc20Deployer User adress which is going to have erc20Deployer permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addErc20Deployer(
    nftAddress: string,
    address: string,
    erc20Deployer: string
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    // if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
    //   throw new Error(`Caller is not Manager`)
    // }

    // Estimate gas for addToCreateERC20List method
    const estGas = await this.estGasAddErc20Deployer(
      nftAddress,
      address,
      erc20Deployer,
      nftContract
    )

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
   * Estimate gas cost for removeFromCreateERC20List method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} erc20Deployer Address of the user to be revoked ERC20Deployer Permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasRemoveErc20Deployer(
    nftAddress: string,
    address: string,
    erc20Deployer: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .removeFromCreateErc20List(erc20Deployer)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
  }

  /**
   * Remove ERC20Deployer permission - only Manager can succeed
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} erc20Deployer Address of the user to be revoked ERC20Deployer Permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeErc20Deployer(
    nftAddress: string,
    address: string,
    erc20Deployer: string
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    // if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
    //   throw new Error(`Caller is not Manager`)
    // }

    const estGas = await this.estGasRemoveErc20Deployer(
      nftAddress,
      address,
      erc20Deployer,
      nftContract
    )

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
   * Estimate gas cost for addToMetadataList method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} metadataUpdater User adress which is going to have Metadata Updater permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasAddMetadataUpdater(
    nftAddress: string,
    address: string,
    metadataUpdater: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .addToMetadataList(metadataUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    // if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
    //   throw new Error(`Caller is not Manager`)
    // }

    const estGas = await this.estGasAddMetadataUpdater(
      nftAddress,
      address,
      metadataUpdater,
      nftContract
    )

    // Call addToMetadataList function of the contract
    const trxReceipt = await nftContract.methods.addToMetadataList(metadataUpdater).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removeFromMetadataList method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} metadataUpdater Address of the user to be revoked Metadata updater Permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async esGasRemoveMetadataUpdater(
    nftAddress: string,
    address: string,
    metadataUpdater: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .removeFromMetadataList(metadataUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
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
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    // if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
    //   throw new Error(`Caller is not Manager`)
    // }

    const estGas = await this.esGasRemoveMetadataUpdater(
      nftAddress,
      address,
      metadataUpdater,
      nftContract
    )

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
   * Estimate gas cost for addTo725StoreList method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} storeUpdater User adress which is going to have Store Updater permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasAddStoreUpdater(
    nftAddress: string,
    address: string,
    storeUpdater: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .addTo725StoreList(storeUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    // if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
    //   throw new Error(`Caller is not Manager`)
    // }

    const estGas = await this.estGasAddStoreUpdater(
      nftAddress,
      address,
      storeUpdater,
      nftContract
    )

    // Call addTo725StoreList function of the contract
    const trxReceipt = await nftContract.methods.addTo725StoreList(storeUpdater).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   *  Estimate gas cost for removeFrom725StoreList method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Manager adress
   * @param {String} storeUpdater Address of the user to be revoked Store Updater Permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasRemoveStoreUpdater(
    nftAddress: string,
    address: string,
    storeUpdater: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .removeFrom725StoreList(storeUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    // if ((await this.getNFTPermissions(nftAddress, address)).manager !== true) {
    //   throw new Error(`Caller is not Manager`)
    // }

    const estGas = await this.estGasRemoveStoreUpdater(
      nftAddress,
      address,
      storeUpdater,
      nftContract
    )

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
   *  Estimate gas cost for cleanPermissions method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Owner adress
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasCleanPermissions(
    nftAddress: string,
    address: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .cleanPermissions()
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await this.estGasCleanPermissions(nftAddress, address, nftContract)

    // Call cleanPermissions function of the contract
    const trxReceipt = await nftContract.methods.cleanPermissions().send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for transfer NFT method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} nftOwner Current NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasTransferNft(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId: number,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .transferFrom(nftOwner, nftReceiver, tokenId)
        .estimateGas({ from: nftOwner }, (err, estGas) =>
          err ? gasLimitDefault : estGas
        )
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
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
  public async transferNft(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId?: number
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== nftOwner) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const tokenIdentifier = tokenId || 1

    const estGas = await this.estGasTransferNft(
      nftAddress,
      nftOwner,
      nftReceiver,
      tokenIdentifier,
      nftContract
    )

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

  /**
   * Estimate gas cost for safeTransfer NFT method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} nftOwner Current NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasSafeTransferNft(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId: number,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .safeTransferFrom(nftOwner, nftReceiver, tokenId)
        .estimateGas({ from: nftOwner }, (err, estGas) =>
          err ? gasLimitDefault : estGas
        )
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
  }

  /**
   * safeTransferNFT Used for transferring the NFT, can be used by an approved relayer
   * will clean all permissions both on erc721 and erc20 level.
   * @param {String} nftAddress erc721 contract adress
   * @param {String} nftOwner Current NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async safeTransferNft(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId?: number
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== nftOwner) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const tokenIdentifier = tokenId || 1

    const estGas = await this.estGasSafeTransferNft(
      nftAddress,
      nftOwner,
      nftReceiver,
      tokenIdentifier,
      nftContract
    )

    // Call transferFrom function of the contract
    const trxReceipt = await nftContract.methods
      .safeTransferFrom(nftOwner, nftReceiver, tokenIdentifier)
      .send({
        from: nftOwner,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  // TODO: Finish this description
  /**
   * Estimate gas cost for setMetadata  method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} nftOwner Current NFT Owner adress
   * @param {Number} metadataState User which will receive the NFT, will also be set as Manager
   * @param {String} metaDataDecryptorUrl
   * @param {Number} tokenId The id of the token to be transfered
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasSetMetadata(
    nftAddress: string,
    nftOwner: string,
    metadataState: number,
    metaDataDecryptorUrl: string,
    metaDataDecryptorAddress: string,
    flags: string,
    data: string,
    metadataHash: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance || new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .setMetaData(
          metadataState,
          metaDataDecryptorUrl,
          metaDataDecryptorAddress,
          flags,
          data,
          metadataHash
        )
        .estimateGas({ from: nftOwner }, (err, estGas) =>
          err ? gasLimitDefault : estGas
        )
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
  }

  /**
   * safeTransferNFT Used for transferring the NFT, can be used by an approved relayer
   * will clean all permissions both on erc721 and erc20 level.
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address Caller address NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async setMetadata(
    nftAddress: string,
    address: string,
    metadataState: number,
    metaDataDecryptorUrl: string,
    metaDataDecryptorAddress: string,
    flags: string,
    data: string,
    metadataHash: string
  ): Promise<TransactionReceipt> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    // if (!(await this.getNFTPermissions(nftAddress, address)).updateMetadata) {
    //   throw new Error(`Caller is not NFT Owner`)
    // }

    const estGas = await this.estGasSetMetadata(
      nftAddress,
      address,
      metadataState,
      metaDataDecryptorUrl,
      metaDataDecryptorAddress,
      flags,
      data,
      metadataHash,
      nftContract
    )

    // Call transferFrom function of the contract
    const trxReceipt = await nftContract.methods
      .setMetaData(
        metadataState,
        metaDataDecryptorUrl,
        metaDataDecryptorAddress,
        flags,
        data,
        metadataHash
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /** Get Owner
   * @param {String} nftAddress erc721 contract adress
   * @return {Promise<string>} string
   */
  public async getNftOwner(nftAddress: string): Promise<string> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)
    const trxReceipt = await nftContract.methods.ownerOf(1).call()
    return trxReceipt
  }

  /** Get users NFT Permissions
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address user adress
   * @return {Promise<Roles>}
   */
  public async getNftPermissions(nftAddress: string, address: string): Promise<Roles> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)
    const roles = await nftContract.methods.getPermissions(address).call()
    return roles
  }

  /** Get users ERC20Deployer role
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address user adress
   * @return {Promise<Roles>}
   */
  public async isErc20Deployer(nftAddress: string, address: string): Promise<boolean> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)
    const isERC20Deployer = await nftContract.methods.isERC20Deployer(address).call()
    return isERC20Deployer
  }

  /** Gets data at a given `key`
   * @param {String} nftAddress erc721 contract adress
   * @param {String} key the key which value to retrieve
   * @return {Promise<string>} The data stored at the key
   */
  public async getData(nftAddress: string, key: string): Promise<string> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)
    const data = await nftContract.methods.getData(key).call()
    return data
  }

  /** Estimate gas cost for setTokenURI method
   * @param nftAddress erc721 contract adress
   * @param address user adress
   * @param data input data for TokenURI
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estSetTokenURI(
    nftAddress: string,
    address: string,
    data: string
  ): Promise<any> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await nftContract.methods
        .setTokenURI('1', data)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
  }

  /** set TokenURI on an nft
   * @param nftAddress erc721 contract adress
   * @param address user adress
   * @param data input data for TokenURI
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async setTokenURI(
    nftAddress: string,
    address: string,
    data: string
  ): Promise<any> {
    const nftContract = new this.web3.eth.Contract(this.nftAbi, nftAddress)

    const estGas = await this.estSetTokenURI(nftAddress, address, data)
    const trxReceipt = await nftContract.methods.setTokenURI('1', data).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })
    return trxReceipt
  }
}
