import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import defaultNftAbi from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import {
  LoggerInstance,
  getFairGasPrice,
  generateDtName,
  setContractDefaults,
  estimateGas,
  ConfigHelper
} from '../utils'
import { Contract } from 'web3-eth-contract'
import { MetadataProof } from '../../src/@types'
import { Config } from '../models/index.js'
import { MetadataAndTokenURI } from '../@types'

/**
 * ERC721 ROLES
 */
interface Roles {
  manager: boolean
  deployERC20: boolean
  updateMetadata: boolean
  store: boolean
}

export class Nft {
  public factory721Address: string
  public factory721Abi: AbiItem | AbiItem[]
  public nftAbi: AbiItem | AbiItem[]
  public web3: Web3
  public startBlock: number
  public config: Config

  constructor(
    web3: Web3,
    network?: string | number,
    nftAbi?: AbiItem | AbiItem[],
    config?: Config
  ) {
    this.nftAbi = nftAbi || (defaultNftAbi.abi as AbiItem[])
    this.web3 = web3
    this.config = config || new ConfigHelper().getConfig(network || 'unknown')
  }

  /**
   *  Estimate gas cost for createERC20 token creation
   * @param {String} nftAddress ERC721 addreess
   * @param {String} address User address
   * @param {String} minter User set as initial minter for the ERC20
   * @param {String} paymentCollector initial paymentCollector for this DT
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
    paymentCollector: string,
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )
    return estimateGas(
      address,
      nftContract.methods.createERC20,
      templateIndex,
      [name, symbol],
      [minter, paymentCollector, mpFeeAddress, feeToken],
      [this.web3.utils.toWei(cap), this.web3.utils.toWei(feeAmount)],
      []
    )
  }

  /**
   * Create new ERC20 datatoken - only user with ERC20Deployer permission can succeed
   * @param {String} nftAddress ERC721 addreess
   * @param {String} address User address
   * @param {String} minter User set as initial minter for the ERC20
   * @param {String} paymentCollector initial paymentCollector for this DT
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
    paymentCollector: string,
    mpFeeAddress: string,
    feeToken: string,
    feeAmount: string,
    cap: string,
    name?: string,
    symbol?: string,
    templateIndex?: number
  ): Promise<string> {
    if ((await this.getNftPermissions(nftAddress, address)).deployERC20 !== true) {
      throw new Error(`Caller is not ERC20Deployer`)
    }
    if (!templateIndex) templateIndex = 1

    // Generate name & symbol if not present
    if (!name || !symbol) {
      ;({ name, symbol } = generateDtName())
    }

    // Create 721contract object
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    const estGas = await estimateGas(
      address,
      nftContract.methods.createERC20,
      templateIndex,
      [name, symbol],
      [minter, paymentCollector, mpFeeAddress, feeToken],
      [this.web3.utils.toWei(cap), this.web3.utils.toWei(feeAmount)],
      []
    )

    // Call createERC20 token function of the contract
    const trxReceipt = await nftContract.methods
      .createERC20(
        templateIndex,
        [name, symbol],
        [minter, paymentCollector, mpFeeAddress, feeToken],
        [this.web3.utils.toWei(cap), this.web3.utils.toWei(feeAmount)],
        []
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )

    return estimateGas(address, nftContract.methods.addManager, manager)
  }

  /**
   * Add Manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be assing manager
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addManager(nftAddress: string, address: string, manager: string) {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await estimateGas(address, nftContract.methods.addManager, manager)

    // Invoke addManager function of the contract
    const trxReceipt = await nftContract.methods.addManager(manager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )
    return estimateGas(address, nftContract.methods.removeManager, manager)
  }

  /**
   * Removes a specific manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be removed as manager
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeManager(nftAddress: string, address: string, manager: string) {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await estimateGas(address, nftContract.methods.removeManager, manager)

    // Invoke removeManager function of the contract
    const trxReceipt = await nftContract.methods.removeManager(manager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )
    return estimateGas(address, nftContract.methods.addToCreateERC20List, erc20Deployer)
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if ((await this.getNftPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    // Estimate gas for addToCreateERC20List method
    const estGas = await estimateGas(
      address,
      nftContract.methods.addToCreateERC20List,
      erc20Deployer
    )

    // Invoke addToCreateERC20List function of the contract
    const trxReceipt = await nftContract.methods
      .addToCreateERC20List(erc20Deployer)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )

    return estimateGas(
      address,
      nftContract.methods.removeFromCreateERC20List,
      erc20Deployer
    )
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if (
      (await this.getNftPermissions(nftAddress, address)).manager !== true ||
      (address === erc20Deployer &&
        (await this.getNftPermissions(nftAddress, address)).deployERC20 !== true)
    ) {
      throw new Error(`Caller is not Manager nor ERC20Deployer`)
    }
    const estGas = await estimateGas(
      address,
      nftContract.methods.removeFromCreateERC20List,
      erc20Deployer
    )

    // Call removeFromCreateERC20List function of the contract
    const trxReceipt = await nftContract.methods
      .removeFromCreateERC20List(erc20Deployer)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )

    return estimateGas(address, nftContract.methods.addToMetadataList, metadataUpdater)
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if ((await this.getNftPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    const estGas = await estimateGas(
      address,
      nftContract.methods.addToMetadataList,
      metadataUpdater
    )

    // Call addToMetadataList function of the contract
    const trxReceipt = await nftContract.methods.addToMetadataList(metadataUpdater).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )

    return estimateGas(
      address,
      nftContract.methods.removeFromMetadataList,
      metadataUpdater
    )
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if (
      (await this.getNftPermissions(nftAddress, address)).manager !== true ||
      (address !== metadataUpdater &&
        (await this.getNftPermissions(nftAddress, address)).updateMetadata !== true)
    ) {
      throw new Error(`Caller is not Manager nor Metadata Updater`)
    }

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
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )

    return estimateGas(address, nftContract.methods.addTo725StoreList, storeUpdater)
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if ((await this.getNftPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    const estGas = await estimateGas(
      address,
      nftContract.methods.addTo725StoreList,
      storeUpdater
    )

    // Call addTo725StoreList function of the contract
    const trxReceipt = await nftContract.methods.addTo725StoreList(storeUpdater).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )

    return estimateGas(address, nftContract.methods.removeFrom725StoreList, storeUpdater)
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if (
      (await this.getNftPermissions(nftAddress, address)).manager !== true ||
      (address !== storeUpdater &&
        (await this.getNftPermissions(nftAddress, address)).store !== true)
    ) {
      throw new Error(`Caller is not Manager nor storeUpdater`)
    }

    const estGas = await estimateGas(
      address,
      nftContract.methods.removeFrom725StoreList,
      storeUpdater
    )

    // Call removeFrom725StoreList function of the contract
    const trxReceipt = await nftContract.methods
      .removeFrom725StoreList(storeUpdater)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )

    return estimateGas(address, nftContract.methods.cleanPermissions)
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await estimateGas(address, nftContract.methods.cleanPermissions)

    // Call cleanPermissions function of the contract
    const trxReceipt = await nftContract.methods.cleanPermissions().send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )

    return estimateGas(
      nftOwner,
      nftContract.methods.transferFrom,
      nftOwner,
      nftReceiver,
      tokenId
    )
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if ((await this.getNftOwner(nftAddress)) !== nftOwner) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const tokenIdentifier = tokenId || 1

    const estGas = await estimateGas(
      nftOwner,
      nftContract.methods.transferFrom,
      nftOwner,
      nftReceiver,
      tokenIdentifier
    )

    // Call transferFrom function of the contract
    const trxReceipt = await nftContract.methods
      .transferFrom(nftOwner, nftReceiver, tokenIdentifier)
      .send({
        from: nftOwner,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )

    return estimateGas(
      nftOwner,
      nftContract.methods.safeTransferFrom,
      nftOwner,
      nftReceiver,
      tokenId
    )
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if ((await this.getNftOwner(nftAddress)) !== nftOwner) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const tokenIdentifier = tokenId || 1

    const estGas = await estimateGas(
      nftOwner,
      nftContract.methods.safeTransferFrom,
      nftOwner,
      nftReceiver,
      tokenIdentifier
    )

    // Call transferFrom function of the contract
    const trxReceipt = await nftContract.methods
      .safeTransferFrom(nftOwner, nftReceiver, tokenIdentifier)
      .send({
        from: nftOwner,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  // TODO: Finish this description
  /**
   * Estimate gas cost for setMetadata  method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} metadataUpdater metadataUpdater address
   * @param {Number} metadataState User which will receive the NFT, will also be set as Manager
   * @param {String} metadataDecryptorUrl
   * @param {Number} tokenId The id of the token to be transfered
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasSetMetadata(
    nftAddress: string,
    metadataUpdater: string,
    metadataState: number,
    metadataDecryptorUrl: string,
    metadataDecryptorAddress: string,
    flags: string,
    data: string,
    metadataHash: string,
    metadataProofs?: MetadataProof[],
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )
    if (!metadataProofs) metadataProofs = []
    return estimateGas(
      metadataUpdater,
      nftContract.methods.setMetaData,
      metadataState,
      metadataDecryptorUrl,
      metadataDecryptorAddress,
      flags,
      data,
      metadataHash,
      metadataProofs
    )
  }

  /**
   * safeTransferNFT Used for transferring the NFT, can be used by an approved relayer
   * will clean all permissions both on erc721 and erc20 level.
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address Caller address NFT Owner adress
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async setMetadata(
    nftAddress: string,
    address: string,
    metadataState: number,
    metadataDecryptorUrl: string,
    metadataDecryptorAddress: string,
    flags: string,
    data: string,
    metadataHash: string,
    metadataProofs?: MetadataProof[]
  ): Promise<TransactionReceipt> {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )
    if (!metadataProofs) metadataProofs = []
    if (!(await this.getNftPermissions(nftAddress, address)).updateMetadata) {
      throw new Error(`Caller is not Metadata updater`)
    }
    const estGas = await estimateGas(
      address,
      nftContract.methods.setMetaData,
      metadataState,
      metadataDecryptorUrl,
      metadataDecryptorAddress,
      flags,
      data,
      metadataHash,
      metadataProofs
    )
    const trxReceipt = await nftContract.methods
      .setMetaData(
        metadataState,
        metadataDecryptorUrl,
        metadataDecryptorAddress,
        flags,
        data,
        metadataHash,
        metadataProofs
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for setMetadata  method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} metadataUpdater metadataUpdater address
   * @param {MetaDataAndTokenURI} metadataAndTokenURI metaDataAndTokenURI object
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasSetMetadataAndTokenURI(
    nftAddress: string,
    metadataUpdater: string,
    metadataAndTokenURI: MetadataAndTokenURI,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )
    const sanitizedMetadataAndTokenURI = {
      ...metadataAndTokenURI,
      metadataProofs: metadataAndTokenURI.metadataProofs || []
    }
    return estimateGas(
      metadataUpdater,
      nftContract.methods.setMetaDataAndTokenURI,
      sanitizedMetadataAndTokenURI
    )
  }

  /**
   *  Helper function to improve UX sets both MetaData & TokenURI in one tx
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address Caller address
   * @param {MetadataAndTokenURI} metadataAndTokenURI metaDataAndTokenURI object
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async setMetadataAndTokenURI(
    nftAddress: string,
    metadataUpdater: string,
    metadataAndTokenURI: MetadataAndTokenURI
  ): Promise<TransactionReceipt> {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )
    if (!(await this.getNftPermissions(nftAddress, metadataUpdater)).updateMetadata) {
      throw new Error(`Caller is not Metadata updater`)
    }
    const sanitizedMetadataAndTokenURI = {
      ...metadataAndTokenURI,
      metadataProofs: metadataAndTokenURI.metadataProofs || []
    }
    const estGas = await estimateGas(
      metadataUpdater,
      nftContract.methods.setMetaDataAndTokenURI,
      sanitizedMetadataAndTokenURI
    )
    const trxReceipt = await nftContract.methods
      .setMetaDataAndTokenURI(sanitizedMetadataAndTokenURI)
      .send({
        from: metadataUpdater,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for setMetadataState  method
   * @param {String} nftAddress erc721 contract adress
   * @param {String} nftOwner Current NFT Owner adress
   * @param {Number} metadataState new metadata state
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasSetMetadataState(
    nftAddress: string,
    metadataUpdater: string,
    metadataState: number,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract =
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.nftAbi, nftAddress),
        this.config
      )

    return estimateGas(
      metadataUpdater,
      nftContract.methods.setMetaDataState,
      metadataState
    )
  }

  /**
   * setMetadataState Used for updating the metadata State
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address Caller address => metadata updater
   * @param {Number} metadataState new metadata state
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async setMetadataState(
    nftAddress: string,
    address: string,
    metadataState: number
  ): Promise<TransactionReceipt> {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    if (!(await this.getNftPermissions(nftAddress, address)).updateMetadata) {
      throw new Error(`Caller is not Metadata updater`)
    }

    const estGas = await estimateGas(
      address,
      nftContract.methods.setMetaDataState,
      metadataState
    )

    // Call transferFrom function of the contract
    const trxReceipt = await nftContract.methods.setMetaDataState(metadataState).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })

    return trxReceipt
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    return estimateGas(address, nftContract.methods.setTokenURI, '1', data)
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
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )

    const estGas = await estimateGas(address, nftContract.methods.setTokenURI, '1', data)
    const trxReceipt = await nftContract.methods.setTokenURI('1', data).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })
    return trxReceipt
  }

  /** Get Owner
   * @param {String} nftAddress erc721 contract adress
   * @return {Promise<string>} string
   */
  public async getNftOwner(nftAddress: string): Promise<string> {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )
    const trxReceipt = await nftContract.methods.ownerOf(1).call()
    return trxReceipt
  }

  /** Get users NFT Permissions
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address user adress
   * @return {Promise<Roles>}
   */
  public async getNftPermissions(nftAddress: string, address: string): Promise<Roles> {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )
    const roles = await nftContract.methods.getPermissions(address).call()
    return roles
  }

  /** Get users Metadata, return Metadata details
   * @param {String} nftAddress erc721 contract adress
   * @return {Promise<Objecta>}
   */
  public async getMetadata(nftAddress: string): Promise<Object> {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )
    return await nftContract.methods.getMetaData().call()
  }

  /** Get users ERC20Deployer role
   * @param {String} nftAddress erc721 contract adress
   * @param {String} address user adress
   * @return {Promise<Roles>}
   */
  public async isErc20Deployer(nftAddress: string, address: string): Promise<boolean> {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )
    const isERC20Deployer = await nftContract.methods.isERC20Deployer(address).call()
    return isERC20Deployer
  }

  /** Gets data at a given `key`
   * @param {String} nftAddress erc721 contract adress
   * @param {String} key the key which value to retrieve
   * @return {Promise<string>} The data stored at the key
   */
  public async getData(nftAddress: string, key: string): Promise<string> {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )
    const data = await nftContract.methods.getData(key).call()
    return data
  }

  /** Gets data at a given `key`
   * @param {String} nftAddress erc721 contract adress
   * @param {String} id
   * @return {Promise<string>} The data stored at the key
   */
  public async getTokenURI(nftAddress: string, id: number): Promise<string> {
    const nftContract = setContractDefaults(
      new this.web3.eth.Contract(this.nftAbi, nftAddress),
      this.config
    )
    const data = await nftContract.methods.tokenURI(id).call()
    return data
  }
}
