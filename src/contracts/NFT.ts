import { BigNumber, ethers } from 'ethers'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import { generateDtName, sendTx, getEventFromTx } from '../utils'
import {
  MetadataProof,
  MetadataAndTokenURI,
  NftRoles,
  ReceiptOrEstimate,
  AbiItem
} from '../@types'
import { SmartContract } from './SmartContract'

export class Nft extends SmartContract {
  getDefaultAbi() {
    return ERC721Template.abi as AbiItem[]
  }

  /**
   * Create new ERC20 Datatoken - only user with DatatokenDeployer permission can succeed
   * @param {String} nftAddress NFT address
   * @param {String} address User address
   * @param {String} minter User set as initial minter for the Datatoken
   * @param {String} paymentCollector initial paymentCollector for this DT
   * @param {String} mpFeeAddress Consume marketplace fee address
   * @param {String} feeToken address of the token marketplace wants to add fee on top
   * @param {String} feeAmount amount of feeToken to be transferred to mpFeeAddress on top, will be converted to WEI
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {Number} templateIndex NFT template index
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<string>} ERC20 Datatoken address
   */
  public async createDatatoken<G extends boolean = false>(
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
    estimateGas?: G
  ): Promise<G extends false ? string : BigNumber> {
    if ((await this.getNftPermissions(nftAddress, address)).deployERC20 !== true) {
      throw new Error(`Caller is not DatatokenDeployer`)
    }
    if (!templateIndex) templateIndex = 1

    // Generate name & symbol if not present
    if (!name || !symbol) {
      ;({ name, symbol } = generateDtName())
    }

    // Create 721contract object
    const nftContract = this.getContract(nftAddress)

    const estGas = await nftContract.estimateGas.createERC20(
      templateIndex,
      [name, symbol],
      [minter, paymentCollector, mpFeeAddress, feeToken],
      [
        await this.amountToUnits(null, cap, 18),
        await this.amountToUnits(null, feeAmount, 18)
      ],
      []
    )
    if (estimateGas) return <G extends false ? string : BigNumber>estGas

    const tx = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.createERC20,
      templateIndex,
      [name, symbol],
      [minter, paymentCollector, mpFeeAddress, feeToken],
      [
        await this.amountToUnits(null, cap, 18),
        await this.amountToUnits(null, feeAmount, 18)
      ],
      []
    )
    const trxReceipt = await tx.wait()
    // console.log('trxReceipt =', trxReceipt)
    const event = getEventFromTx(trxReceipt, 'TokenCreated')
    return event?.args[0]
  }

  /**
   * Add Manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be assing manager
   * @param {Boolean} [estimateGas] if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async addManager<G extends boolean = false>(
    nftAddress: string,
    address: string,
    manager: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await nftContract.estimateGas.addManager(manager)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.addManager,
      manager
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Removes a specific manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be removed as manager
   * @param {Boolean} [estimateGas] if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async removeManager<G extends boolean = false>(
    nftAddress: string,
    address: string,
    manager: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await nftContract.estimateGas.removeManager(manager)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.removeManager,
      manager
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Add DatatokenDeployer permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} datatokenDeployer User adress which is going to have DatatokenDeployer permission
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async addDatatokenDeployer<G extends boolean = false>(
    nftAddress: string,
    address: string,
    datatokenDeployer: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    // Estimate gas for addToCreateERC20List method
    const estGas = await nftContract.estimateGas.addToCreateERC20List(datatokenDeployer)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.addToCreateERC20List,
      datatokenDeployer
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Remove DatatokenDeployer permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} datatokenDeployer Address of the user to be revoked DatatokenDeployer Permission
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async removeDatatokenDeployer<G extends boolean = false>(
    nftAddress: string,
    address: string,
    datatokenDeployer: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if (
      (await this.getNftPermissions(nftAddress, address)).manager !== true ||
      (address === datatokenDeployer &&
        (await this.getNftPermissions(nftAddress, address)).deployERC20 !== true)
    ) {
      throw new Error(`Caller is not Manager nor DatatokenDeployer`)
    }
    const estGas = await nftContract.estimateGas.removeFromCreateERC20List(
      datatokenDeployer
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.removeFromCreateERC20List,
      datatokenDeployer
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Add Metadata Updater permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} metadataUpdater User adress which is going to have Metadata Updater permission
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async addMetadataUpdater<G extends boolean = false>(
    nftAddress: string,
    address: string,
    metadataUpdater: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    const estGas = await nftContract.estimateGas.addToMetadataList(metadataUpdater)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.addToMetadataList,
      metadataUpdater
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Remove Metadata Updater permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} metadataUpdater Address of the user to be revoked Metadata updater Permission
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async removeMetadataUpdater<G extends boolean = false>(
    nftAddress: string,
    address: string,
    metadataUpdater: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if (
      (await this.getNftPermissions(nftAddress, address)).manager !== true ||
      (address !== metadataUpdater &&
        (await this.getNftPermissions(nftAddress, address)).updateMetadata !== true)
    ) {
      throw new Error(`Caller is not Manager nor Metadata Updater`)
    }

    const estGas = await nftContract.estimateGas.removeFromMetadataList(metadataUpdater)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.removeFromMetadataList,
      metadataUpdater
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Add Store Updater permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} storeUpdater User adress which is going to have Store Updater permission
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async addStoreUpdater<G extends boolean = false>(
    nftAddress: string,
    address: string,
    storeUpdater: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    const estGas = await nftContract.estimateGas.addTo725StoreList(storeUpdater)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.addTo725StoreList,
      storeUpdater
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Remove Store Updater permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} storeUpdater Address of the user to be revoked Store Updater Permission
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async removeStoreUpdater<G extends boolean = false>(
    nftAddress: string,
    address: string,
    storeUpdater: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if (
      (await this.getNftPermissions(nftAddress, address)).manager !== true ||
      (address !== storeUpdater &&
        (await this.getNftPermissions(nftAddress, address)).store !== true)
    ) {
      throw new Error(`Caller is not Manager nor storeUpdater`)
    }

    const estGas = await nftContract.estimateGas.removeFrom725StoreList(storeUpdater)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.removeFrom725StoreList,
      storeUpdater
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * This function allows to remove all ROLES at NFT level: Managers, DatatokenDeployer, MetadataUpdater, StoreUpdater
   * Even NFT Owner has to readd himself as Manager
   * Permissions at Datatoken level stay.
   * Only NFT Owner  can call it.
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Owner adress
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async cleanPermissions<G extends boolean = false>(
    nftAddress: string,
    address: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await nftContract.estimateGas.cleanPermissions()
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.cleanPermissions
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Transfers the NFT
   * will clean all permissions both on NFT and Datatoken level.
   * @param {String} nftAddress NFT contract address
   * @param {String} nftOwner Current NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async transferNft<G extends boolean = false>(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== nftOwner) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const tokenIdentifier = tokenId || 1

    const estGas = await nftContract.estimateGas.transferFrom(
      nftOwner,
      nftReceiver,
      tokenIdentifier
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.transferFrom,
      nftOwner,
      nftReceiver,
      tokenIdentifier
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * safeTransferNFT Used for transferring the NFT, can be used by an approved relayer
   * will clean all permissions both on NFT and Datatoken level.
   * @param {String} nftAddress NFT contract address
   * @param {String} nftOwner Current NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async safeTransferNft<G extends boolean = false>(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== nftOwner) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const tokenIdentifier = tokenId || 1

    const estGas = await nftContract.estimateGas.safeTransferFrom(
      nftOwner,
      nftReceiver,
      tokenIdentifier
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.safeTransferFrom,
      nftOwner,
      nftReceiver,
      tokenIdentifier
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Creates or update Metadata cached by Aquarius. Also, updates the METADATA_DECRYPTOR key
   * @param {String} nftAddress NFT contract address
   * @param {String} address Caller address NFT Owner adress
   * @param {Number} metadataState
   * @param {String} metadataDecryptorUrl
   * @param {String} metadataDecryptorAddress
   * @param {String} flags
   * @param {String} data
   * @param {String} metadataHash
   * @param {MetadataProof[]} metadataProofs
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async setMetadata<G extends boolean = false>(
    nftAddress: string,
    address: string,
    metadataState: number,
    metadataDecryptorUrl: string,
    metadataDecryptorAddress: string,
    flags: string,
    data: string,
    metadataHash: string,
    metadataProofs?: MetadataProof[],
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)
    if (!metadataProofs) metadataProofs = []
    if (!(await this.getNftPermissions(nftAddress, address)).updateMetadata) {
      throw new Error(`Caller is not Metadata updater`)
    }
    const estGas = await nftContract.estimateGas.setMetaData(
      metadataState,
      metadataDecryptorUrl,
      metadataDecryptorAddress,
      flags,
      data,
      metadataHash,
      metadataProofs
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.setMetaData,
      metadataState,
      metadataDecryptorUrl,
      metadataDecryptorAddress,
      flags,
      data,
      metadataHash,
      metadataProofs
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   *  Helper function to improve UX sets both MetaData & TokenURI in one tx
   * @param {String} nftAddress NFT contract address
   * @param {String} address Caller address
   * @param {MetadataAndTokenURI} metadataAndTokenURI metaDataAndTokenURI object
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async setMetadataAndTokenURI<G extends boolean = false>(
    nftAddress: string,
    metadataUpdater: string,
    metadataAndTokenURI: MetadataAndTokenURI,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)
    if (!(await this.getNftPermissions(nftAddress, metadataUpdater)).updateMetadata) {
      throw new Error(`Caller is not Metadata updater`)
    }
    const sanitizedMetadataAndTokenURI = {
      ...metadataAndTokenURI,
      metadataProofs: metadataAndTokenURI.metadataProofs || []
    }
    const estGas = await nftContract.estimateGas.setMetaDataAndTokenURI(
      sanitizedMetadataAndTokenURI
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.setMetaDataAndTokenURI,
      sanitizedMetadataAndTokenURI
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * setMetadataState Used for updating the metadata State
   * @param {String} nftAddress NFT contract address
   * @param {String} address Caller address => metadata updater
   * @param {Number} metadataState new metadata state
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async setMetadataState<G extends boolean = false>(
    nftAddress: string,
    address: string,
    metadataState: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    if (!(await this.getNftPermissions(nftAddress, address)).updateMetadata) {
      throw new Error(`Caller is not Metadata updater`)
    }

    const estGas = await nftContract.estimateGas.setMetaDataState(metadataState)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.setMetaDataState,
      metadataState
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * set TokenURI on an nft
   * @param {String} nftAddress NFT contract address
   * @param {String} data input data for TokenURI
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async setTokenURI<G extends boolean = false>(
    nftAddress: string,
    data: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const nftContract = this.getContract(nftAddress)

    const estGas = await nftContract.estimateGas.setTokenURI('1', data)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.setTokenURI,
      '1',
      data
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Get NFT Owner
   * @param {String} nftAddress NFT contract address
   * @return {Promise<string>} string
   */
  public async getNftOwner(nftAddress: string): Promise<string> {
    const nftContract = this.getContract(nftAddress)
    const trxReceipt = await nftContract.ownerOf(1)
    return trxReceipt
  }

  /**
   * Gets NFT Permissions for a specified user
   * @param {String} nftAddress NFT contract address
   * @param {String} address user adress
   * @return {Promise<NftRoles>}
   */
  public async getNftPermissions(nftAddress: string, address: string): Promise<NftRoles> {
    const nftContract = this.getContract(nftAddress)
    const roles = await nftContract.getPermissions(address)
    return roles
  }

  /**
   * Returns Metadata details for an NFT
   * @param {String} nftAddress NFT contract address
   * @return {Promise<Objecta>}
   */
  public async getMetadata(nftAddress: string): Promise<Object> {
    const nftContract = this.getContract(nftAddress)
    return await nftContract.getMetaData()
  }

  /**
   * Checks if user has DatatokenDeployer role
   * @param {String} nftAddress NFT contract address
   * @param {String} address user adress
   * @return {Promise<boolean>}
   */
  public async isDatatokenDeployer(
    nftAddress: string,
    address: string
  ): Promise<boolean> {
    const nftContract = this.getContract(nftAddress)
    const isDatatokenDeployer = await nftContract.isERC20Deployer(address)
    return isDatatokenDeployer
  }

  /**
   * Allows users to store data with a preset key (keccak256(ERC20Address)) into NFT 725 Store
   * only ERC20Deployer can succeed
   * @param {string} nftAddress Nft datatoken adress
   * @param {string} address User adress
   * @param {string} key Key of the data to be stored into 725Y standard
   * @param {string} value Data to be stored into 725Y standard
   * @param {boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async setData<G extends boolean = false>(
    nftAddress: string,
    address: string,
    key: string,
    value: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getNftPermissions(nftAddress, address)).store !== true) {
      throw new Error(`User is not ERC20 store updater`)
    }

    const nftContract = this.getContract(nftAddress)

    const keyHash = ethers.utils.keccak256(key)
    const valueHex = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(value))

    const estGas = await nftContract.estimateGas.setNewData(keyHash, valueHex)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      nftContract.setNewData,
      keyHash,
      valueHex
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Gets stored data at a given `key` in an NFT
   * @param {string} nftAddress - The address of the NFT.
   * @param {string} key - The key of the data to get.
   * @return {Promise<string>} The data stored at the key
   */
  public async getData(nftAddress: string, key: string): Promise<string> {
    const nftContract = this.getContract(nftAddress)
    const keyHash = ethers.utils.keccak256(key)
    const data = await nftContract.getData(keyHash)
    return data ? ethers.utils.toUtf8String(data) : null
  }

  /**
   * Gets the token URI of an NFT.
   * @param {string} nftAddress - The address of the NFT.
   * @param {number} id - The ID of the token.
   * @returns {Promise&lt;string&gt;}
   */
  public async getTokenURI(nftAddress: string, id: number): Promise<string> {
    const nftContract = this.getContract(nftAddress)
    const data = await nftContract.tokenURI(id)
    return data
  }
}
