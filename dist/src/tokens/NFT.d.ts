import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { TransactionReceipt } from 'web3-eth';
import { Contract } from 'web3-eth-contract';
import { MetadataProof } from '../../src/@types';
import { Config } from '../models/index.js';
import { MetadataAndTokenURI } from '../@types';
/**
 * ERC721 ROLES
 */
interface Roles {
    manager: boolean;
    deployERC20: boolean;
    updateMetadata: boolean;
    store: boolean;
}
export declare class Nft {
    GASLIMIT_DEFAULT: number;
    factory721Address: string;
    factory721Abi: AbiItem | AbiItem[];
    nftAbi: AbiItem | AbiItem[];
    web3: Web3;
    startBlock: number;
    config: Config;
    constructor(web3: Web3, nftAbi?: AbiItem | AbiItem[], config?: Config);
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
    estGasCreateErc20(nftAddress: string, address: string, minter: string, paymentCollector: string, mpFeeAddress: string, feeToken: string, feeAmount: string, cap: string, name?: string, symbol?: string, templateIndex?: number, contractInstance?: Contract): Promise<any>;
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
    createErc20(nftAddress: string, address: string, minter: string, paymentCollector: string, mpFeeAddress: string, feeToken: string, feeAmount: string, cap: string, name?: string, symbol?: string, templateIndex?: number): Promise<string>;
    /**
     * Estimate gas cost for add manager call
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Owner adress
     * @param {String} manager User adress which is going to be assing manager
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasAddManager(nftAddress: string, address: string, manager: string, contractInstance?: Contract): Promise<any>;
    /**
     * Add Manager for NFT Contract (only NFT Owner can succeed)
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Owner adress
     * @param {String} manager User adress which is going to be assing manager
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    addManager(nftAddress: string, address: string, manager: string): Promise<any>;
    /**
     * Estimate gas cost for removeManager method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Owner adress
     * @param {String} manager User adress which is going to be removed as manager
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasRemoveManager(nftAddress: string, address: string, manager: string, contractInstance?: Contract): Promise<any>;
    /**
     * Removes a specific manager for NFT Contract (only NFT Owner can succeed)
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Owner adress
     * @param {String} manager User adress which is going to be removed as manager
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    removeManager(nftAddress: string, address: string, manager: string): Promise<any>;
    /**
     *  Estimate gas cost for addToCreateERC20List method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} erc20Deployer User adress which is going to have erc20Deployer permission
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasAddErc20Deployer(nftAddress: string, address: string, erc20Deployer: string, contractInstance?: Contract): Promise<any>;
    /**
     * Add ERC20Deployer permission - only Manager can succeed
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} erc20Deployer User adress which is going to have erc20Deployer permission
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    addErc20Deployer(nftAddress: string, address: string, erc20Deployer: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for removeFromCreateERC20List method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} erc20Deployer Address of the user to be revoked ERC20Deployer Permission
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasRemoveErc20Deployer(nftAddress: string, address: string, erc20Deployer: string, contractInstance?: Contract): Promise<any>;
    /**
     * Remove ERC20Deployer permission - only Manager can succeed
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} erc20Deployer Address of the user to be revoked ERC20Deployer Permission
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    removeErc20Deployer(nftAddress: string, address: string, erc20Deployer: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for addToMetadataList method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} metadataUpdater User adress which is going to have Metadata Updater permission
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasAddMetadataUpdater(nftAddress: string, address: string, metadataUpdater: string, contractInstance?: Contract): Promise<any>;
    /**
     * Add Metadata Updater permission - only Manager can succeed
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} metadataUpdater User adress which is going to have Metadata Updater permission
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    addMetadataUpdater(nftAddress: string, address: string, metadataUpdater: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for removeFromMetadataList method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} metadataUpdater Address of the user to be revoked Metadata updater Permission
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    esGasRemoveMetadataUpdater(nftAddress: string, address: string, metadataUpdater: string, contractInstance?: Contract): Promise<any>;
    /**
     * Remove Metadata Updater permission - only Manager can succeed
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} metadataUpdater Address of the user to be revoked Metadata updater Permission
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    removeMetadataUpdater(nftAddress: string, address: string, metadataUpdater: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for addTo725StoreList method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} storeUpdater User adress which is going to have Store Updater permission
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasAddStoreUpdater(nftAddress: string, address: string, storeUpdater: string, contractInstance?: Contract): Promise<any>;
    /**
     * Add Store Updater permission - only Manager can succeed
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} storeUpdater User adress which is going to have Store Updater permission
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    addStoreUpdater(nftAddress: string, address: string, storeUpdater: string): Promise<TransactionReceipt>;
    /**
     *  Estimate gas cost for removeFrom725StoreList method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} storeUpdater Address of the user to be revoked Store Updater Permission
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasRemoveStoreUpdater(nftAddress: string, address: string, storeUpdater: string, contractInstance?: Contract): Promise<any>;
    /**
     * Remove Store Updater permission - only Manager can succeed
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Manager adress
     * @param {String} storeUpdater Address of the user to be revoked Store Updater Permission
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    removeStoreUpdater(nftAddress: string, address: string, storeUpdater: string): Promise<TransactionReceipt>;
    /**
     *  Estimate gas cost for cleanPermissions method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Owner adress
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasCleanPermissions(nftAddress: string, address: string, contractInstance?: Contract): Promise<any>;
    /**
     * This function allows to remove all ROLES at erc721 level: Managers, ERC20Deployer, MetadataUpdater, StoreUpdater
     * Even NFT Owner has to readd himself as Manager
     * Permissions at erc20 level stay.
     * Only NFT Owner  can call it.
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address NFT Owner adress
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    cleanPermissions(nftAddress: string, address: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for transfer NFT method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} nftOwner Current NFT Owner adress
     * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
     * @param {Number} tokenId The id of the token to be transfered
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasTransferNft(nftAddress: string, nftOwner: string, nftReceiver: string, tokenId: number, contractInstance?: Contract): Promise<any>;
    /**
     * Transfers the NFT
     * will clean all permissions both on erc721 and erc20 level.
     * @param {String} nftAddress erc721 contract adress
     * @param {String} nftOwner Current NFT Owner adress
     * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
     * @param {Number} tokenId The id of the token to be transfered
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    transferNft(nftAddress: string, nftOwner: string, nftReceiver: string, tokenId?: number): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for safeTransfer NFT method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} nftOwner Current NFT Owner adress
     * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
     * @param {Number} tokenId The id of the token to be transfered
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasSafeTransferNft(nftAddress: string, nftOwner: string, nftReceiver: string, tokenId: number, contractInstance?: Contract): Promise<any>;
    /**
     * safeTransferNFT Used for transferring the NFT, can be used by an approved relayer
     * will clean all permissions both on erc721 and erc20 level.
     * @param {String} nftAddress erc721 contract adress
     * @param {String} nftOwner Current NFT Owner adress
     * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
     * @param {Number} tokenId The id of the token to be transfered
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    safeTransferNft(nftAddress: string, nftOwner: string, nftReceiver: string, tokenId?: number): Promise<TransactionReceipt>;
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
    estGasSetMetadata(nftAddress: string, metadataUpdater: string, metadataState: number, metadataDecryptorUrl: string, metadataDecryptorAddress: string, flags: string, data: string, metadataHash: string, metadataProofs?: MetadataProof[], contractInstance?: Contract): Promise<any>;
    /**
     * safeTransferNFT Used for transferring the NFT, can be used by an approved relayer
     * will clean all permissions both on erc721 and erc20 level.
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address Caller address NFT Owner adress
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    setMetadata(nftAddress: string, address: string, metadataState: number, metadataDecryptorUrl: string, metadataDecryptorAddress: string, flags: string, data: string, metadataHash: string, metadataProofs?: MetadataProof[]): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for setMetadata  method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} metadataUpdater metadataUpdater address
     * @param {MetaDataAndTokenURI} metadataAndTokenURI metaDataAndTokenURI object
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasSetMetadataAndTokenURI(nftAddress: string, metadataUpdater: string, metadataAndTokenURI: MetadataAndTokenURI, contractInstance?: Contract): Promise<any>;
    /**
     *  Helper function to improve UX sets both MetaData & TokenURI in one tx
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address Caller address
     * @param {MetadataAndTokenURI} metadataAndTokenURI metaDataAndTokenURI object
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    setMetadataAndTokenURI(nftAddress: string, metadataUpdater: string, metadataAndTokenURI: MetadataAndTokenURI): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for setMetadataState  method
     * @param {String} nftAddress erc721 contract adress
     * @param {String} nftOwner Current NFT Owner adress
     * @param {Number} metadataState new metadata state
     * @param {Contract} nftContract optional contract instance
     * @return {Promise<any>}
     */
    estGasSetMetadataState(nftAddress: string, metadataUpdater: string, metadataState: number, contractInstance?: Contract): Promise<any>;
    /**
     * setMetadataState Used for updating the metadata State
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address Caller address => metadata updater
     * @param {Number} metadataState new metadata state
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    setMetadataState(nftAddress: string, address: string, metadataState: number): Promise<TransactionReceipt>;
    /** Estimate gas cost for setTokenURI method
     * @param nftAddress erc721 contract adress
     * @param address user adress
     * @param data input data for TokenURI
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    estSetTokenURI(nftAddress: string, address: string, data: string): Promise<any>;
    /** set TokenURI on an nft
     * @param nftAddress erc721 contract adress
     * @param address user adress
     * @param data input data for TokenURI
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    setTokenURI(nftAddress: string, address: string, data: string): Promise<any>;
    /** Get Owner
     * @param {String} nftAddress erc721 contract adress
     * @return {Promise<string>} string
     */
    getNftOwner(nftAddress: string): Promise<string>;
    /** Get users NFT Permissions
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address user adress
     * @return {Promise<Roles>}
     */
    getNftPermissions(nftAddress: string, address: string): Promise<Roles>;
    /** Get users Metadata, return Metadata details
     * @param {String} nftAddress erc721 contract adress
     * @return {Promise<Objecta>}
     */
    getMetadata(nftAddress: string): Promise<Object>;
    /** Get users ERC20Deployer role
     * @param {String} nftAddress erc721 contract adress
     * @param {String} address user adress
     * @return {Promise<Roles>}
     */
    isErc20Deployer(nftAddress: string, address: string): Promise<boolean>;
    /** Gets data at a given `key`
     * @param {String} nftAddress erc721 contract adress
     * @param {String} key the key which value to retrieve
     * @return {Promise<string>} The data stored at the key
     */
    getData(nftAddress: string, key: string): Promise<string>;
    /** Gets data at a given `key`
     * @param {String} nftAddress erc721 contract adress
     * @param {String} id
     * @return {Promise<string>} The data stored at the key
     */
    getTokenURI(nftAddress: string, id: number): Promise<string>;
}
export {};
