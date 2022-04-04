import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { TransactionReceipt } from 'web3-core';
import { AbiItem } from 'web3-utils';
import { Config } from '../models/index.js';
import { ProviderFees, FreCreationParams, Erc20CreateParams, PoolCreationParams, DispenserCreationParams, ConsumeMarketFee } from '../@types/index.js';
interface Template {
    templateAddress: string;
    isActive: boolean;
}
export interface TokenOrder {
    tokenAddress: string;
    consumer: string;
    serviceIndex: number;
    _providerFee: ProviderFees;
    _consumeMarketFee: ConsumeMarketFee;
}
export interface NftCreateData {
    name: string;
    symbol: string;
    templateIndex: number;
    tokenURI: string;
}
/**
 * Provides an interface for NFT Factory contract
 */
export declare class NftFactory {
    GASLIMIT_DEFAULT: number;
    factory721Address: string;
    factory721Abi: AbiItem | AbiItem[];
    web3: Web3;
    config: Config;
    factory721: Contract;
    /**
     * Instantiate Datatokens.
     * @param {String} factory721Address
     * @param {AbiItem | AbiItem[]} factory721ABI
     * @param {Web3} web3
     */
    constructor(factory721Address: string, web3: Web3, factory721Abi?: AbiItem | AbiItem[], config?: Config);
    /**
     * Get estimated gas cost for deployERC721Contract value
     * @param {String} address
     * @param {String} nftData
     * @return {Promise<string>} NFT datatoken address
     */
    estGasCreateNFT(address: string, nftData: NftCreateData): Promise<string>;
    /**
     * Create new NFT
     * @param {String} address
     * @param {NFTCreateData} nftData
     * @return {Promise<string>} NFT datatoken address
     */
    createNFT(address: string, nftData: NftCreateData): Promise<string>;
    /** Get Current NFT Count (NFT created)
     * @return {Promise<number>} Number of NFT created from this factory
     */
    getCurrentNFTCount(): Promise<number>;
    /** Get Current Datatoken Count
     * @return {Promise<number>} Number of DTs created from this factory
     */
    getCurrentTokenCount(): Promise<number>;
    /** Get Factory Owner
     * @return {Promise<string>} Factory Owner address
     */
    getOwner(): Promise<string>;
    /** Get Current NFT Template Count
     * @return {Promise<number>} Number of NFT Template added to this factory
     */
    getCurrentNFTTemplateCount(): Promise<number>;
    /** Get Current Template  Datatoken (ERC20) Count
     * @return {Promise<number>} Number of ERC20 Template added to this factory
     */
    getCurrentTokenTemplateCount(): Promise<number>;
    /** Get NFT Template
     * @param {Number} index Template index
     * @return {Promise<Template>} Number of Template added to this factory
     */
    getNFTTemplate(index: number): Promise<Template>;
    /** Get Datatoken(erc20) Template
     * @param {Number} index Template index
     * @return {Promise<Template>} DT Template info
     */
    getTokenTemplate(index: number): Promise<Template>;
    /** Check if ERC20 is deployed from the factory
     * @param {String} datatoken Datatoken address we want to check
     * @return {Promise<Boolean>} return true if deployed from this factory
     */
    checkDatatoken(datatoken: string): Promise<Boolean>;
    /** Check if  NFT is deployed from the factory
     * @param {String} nftAddress nftAddress address we want to check
     * @return {Promise<String>} return address(0) if it's not, or the nftAddress if true
     */
    checkNFT(nftAddress: string): Promise<String>;
    /**
     * Estimate gas cost for add721TokenTemplate method
     * @param {String} address
     * @param {String} templateAddress template address to add
     * @return {Promise<TransactionReceipt>}
     */
    estGasAddNFTTemplate(address: string, templateAddress: string): Promise<any>;
    /**
     * Add a new erc721 token template - only factory Owner
     * @param {String} address
     * @param {String} templateAddress template address to add
     * @return {Promise<TransactionReceipt>}
     */
    addNFTTemplate(address: string, templateAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for disable721TokenTemplate method
     * @param {String} address
     * @param {Number} templateIndex index of the template we want to disable
     * @return {Promise<TransactionReceipt>} current token template count
     */
    estGasDisableNFTTemplate(address: string, templateIndex: number): Promise<any>;
    /**
     * Disable token template - only factory Owner
     * @param {String} address
     * @param {Number} templateIndex index of the template we want to disable
     * @return {Promise<TransactionReceipt>} current token template count
     */
    disableNFTTemplate(address: string, templateIndex: number): Promise<TransactionReceipt>;
    /**
     * Reactivate a previously disabled token template - only factory Owner
     * @param {String} address
     * @param {Number} templateIndex index of the template we want to reactivate
     * @return {Promise<TransactionReceipt>} current token template count
     */
    estGasReactivateNFTTemplate(address: string, templateIndex: number): Promise<any>;
    /**
     * Reactivate a previously disabled token template - only factory Owner
     * @param {String} address
     * @param {Number} templateIndex index of the template we want to reactivate
     * @return {Promise<TransactionReceipt>} current token template count
     */
    reactivateNFTTemplate(address: string, templateIndex: number): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for addTokenTemplate method
     * @param {String} address
     * @param {String} templateAddress template address to add
     * @return {Promise<TransactionReceipt>}
     */
    estGasAddTokenTemplate(address: string, templateAddress: string): Promise<any>;
    /**
     * Add a new erc721 token template - only factory Owner
     * @param {String} address
     * @param {String} templateAddress template address to add
     * @return {Promise<TransactionReceipt>}
     */
    addTokenTemplate(address: string, templateAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for disableTokenTemplate method
     * @param {String} address
     * @param {Number} templateIndex index of the template we want to disable
     * @return {Promise<TransactionReceipt>} current token template count
     */
    estGasDisableTokenTemplate(address: string, templateIndex: number): Promise<any>;
    /**
     * Disable token template - only factory Owner
     * @param {String} address
     * @param {Number} templateIndex index of the template we want to disable
     * @return {Promise<TransactionReceipt>} current token template count
     */
    disableTokenTemplate(address: string, templateIndex: number): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for reactivateTokenTemplate method
     * @param {String} address
     * @param {Number} templateIndex index of the template we want to reactivate
     * @return {Promise<TransactionReceipt>} current token template count
     */
    estGasReactivateTokenTemplate(address: string, templateIndex: number): Promise<any>;
    /**
     * Reactivate a previously disabled token template - only factory Owner
     * @param {String} address
     * @param {Number} templateIndex index of the template we want to reactivate
     * @return {Promise<TransactionReceipt>} current token template count
     */
    reactivateTokenTemplate(address: string, templateIndex: number): Promise<TransactionReceipt>;
    /** Estimate gas cost for startMultipleTokenOrder method
     * @param address Caller address
     * @param orders an array of struct tokenOrder
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    estGasStartMultipleTokenOrder(address: string, orders: TokenOrder[]): Promise<any>;
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
    startMultipleTokenOrder(address: string, orders: TokenOrder[]): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for createNftWithErc20 method
     * @param address Caller address
     * @param _NftCreateData input data for nft creation
     * @param _ErcCreateData input data for erc20 creation
     *  @return {Promise<TransactionReceipt>} transaction receipt
     */
    estGasCreateNftWithErc20(address: string, nftCreateData: NftCreateData, ercParams: Erc20CreateParams): Promise<any>;
    /**
     * @dev createNftWithErc20
     *      Creates a new NFT, then a ERC20,all in one call
     * @param address Caller address
     * @param _NftCreateData input data for nft creation
     * @param _ErcCreateData input data for erc20 creation
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    createNftWithErc20(address: string, nftCreateData: NftCreateData, ercParams: Erc20CreateParams): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for createNftErc20WithPool method
     * @param address Caller address
     * @param nftCreateData input data for NFT Creation
     * @param ercParams input data for ERC20 Creation
     * @param poolParams input data for Pool Creation
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    estGasCreateNftErc20WithPool(address: string, nftCreateData: NftCreateData, ercParams: Erc20CreateParams, poolParams: PoolCreationParams): Promise<any>;
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
    createNftErc20WithPool(address: string, nftCreateData: NftCreateData, ercParams: Erc20CreateParams, poolParams: PoolCreationParams): Promise<TransactionReceipt>;
    /** Estimate gas cost for createNftErc20WithFixedRate method
     * @param address Caller address
     * @param nftCreateData input data for NFT Creation
     * @param ercParams input data for ERC20 Creation
     * @param freParams input data for FixedRate Creation
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    estGasCreateNftErc20WithFixedRate(address: string, nftCreateData: NftCreateData, ercParams: Erc20CreateParams, freParams: FreCreationParams): Promise<any>;
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
    createNftErc20WithFixedRate(address: string, nftCreateData: NftCreateData, ercParams: Erc20CreateParams, freParams: FreCreationParams): Promise<TransactionReceipt>;
    /** Estimate gas cost for createNftErc20WithFixedRate method
     * @param address Caller address
     * @param nftCreateData input data for NFT Creation
     * @param ercParams input data for ERC20 Creation
     * @param dispenserParams input data for Dispenser Creation
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    estGasCreateNftErc20WithDispenser(address: string, nftCreateData: NftCreateData, ercParams: Erc20CreateParams, dispenserParams: DispenserCreationParams): Promise<any>;
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
    createNftErc20WithDispenser(address: string, nftCreateData: NftCreateData, ercParams: Erc20CreateParams, dispenserParams: DispenserCreationParams): Promise<TransactionReceipt>;
}
export {};
