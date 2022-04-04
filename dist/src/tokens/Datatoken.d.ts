import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { TransactionReceipt } from 'web3-eth';
import { Contract } from 'web3-eth-contract';
import { ConsumeMarketFee, FreOrderParams, FreCreationParams, ProviderFees } from '../@types';
import { Nft } from './NFT';
import { Config } from '../models/index.js';
/**
 * ERC20 ROLES
 */
interface Roles {
    minter: boolean;
    paymentManager: boolean;
}
export interface OrderParams {
    consumer: string;
    serviceIndex: number;
    _providerFee: ProviderFees;
    _consumeMarketFee: ConsumeMarketFee;
}
export interface DispenserParams {
    maxTokens: string;
    maxBalance: string;
    withMint?: boolean;
    allowedSwapper?: string;
}
export declare class Datatoken {
    GASLIMIT_DEFAULT: number;
    factoryAddress: string;
    factoryABI: AbiItem | AbiItem[];
    datatokensAbi: AbiItem | AbiItem[];
    datatokensEnterpriseAbi: AbiItem | AbiItem[];
    web3: Web3;
    config: Config;
    nft: Nft;
    /**
     * Instantiate ERC20 Datatokens
     * @param {AbiItem | AbiItem[]} datatokensAbi
     * @param {Web3} web3
     */
    constructor(web3: Web3, datatokensAbi?: AbiItem | AbiItem[], datatokensEnterpriseAbi?: AbiItem | AbiItem[], config?: Config);
    /**
     * Estimate gas cost for mint method
     * @param {String} dtAddress Datatoken address
     * @param {String} spender Spender address
     * @param {string} amount Number of datatokens, as number. Will be converted to wei
     * @param {String} address User adress
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasApprove(dtAddress: string, spender: string, amount: string, address: string, contractInstance?: Contract): Promise<any>;
    /**
     * Approve
     * @param {String} dtAddress Datatoken address
     * @param {String} spender Spender address
     * @param {string} amount Number of datatokens, as number. Will be converted to wei
     * @param {String} address User adress
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    approve(dtAddress: string, spender: string, amount: string, address: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for mint method
     * @param {String} dtAddress Datatoken address
     * @param {String} address Minter address
     * @param {String} amount Number of datatokens, as number. Will be converted to wei
     * @param {String} toAddress only if toAddress is different from the minter
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasMint(dtAddress: string, address: string, amount: string, toAddress?: string, contractInstance?: Contract): Promise<any>;
    /**
     * Estimate gas cost for createFixedRate method
     * @param {String} dtAddress Datatoken address
     * @param {String} address Caller address
     * @param {String} fixedPriceAddress
     * @param {FixedRateParams} fixedRateParams
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasCreateFixedRate(dtAddress: string, address: string, fixedRateParams: FreCreationParams, contractInstance?: Contract): Promise<any>;
    /**
     * Creates a new FixedRateExchange setup.
     * @param {String} dtAddress Datatoken address
     * @param {String} address Caller address
     * @param {String} fixedPriceAddress
     * @param {FixedRateParams} fixedRateParams
     * @return {Promise<TransactionReceipt>} transactionId
     */
    createFixedRate(dtAddress: string, address: string, fixedRateParams: FreCreationParams): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for createDispenser method
     * @param {String} dtAddress Datatoken address
     * @param {String} address Caller address
     * @param {String} dispenserAddress ispenser contract address
     * @param {String} dispenserParams
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasCreateDispenser(dtAddress: string, address: string, dispenserAddress: string, dispenserParams: DispenserParams, contractInstance?: Contract): Promise<any>;
    /**
     * Creates a new Dispenser
     * @param {String} dtAddress Datatoken address
     * @param {String} address Caller address
     * @param {String} dispenserAddress ispenser contract address
     * @param {String} dispenserParams
     * @return {Promise<TransactionReceipt>} transactionId
     */
    createDispenser(dtAddress: string, address: string, dispenserAddress: string, dispenserParams: DispenserParams): Promise<TransactionReceipt>;
    /**
     * Mint
     * @param {String} dtAddress Datatoken address
     * @param {String} address Minter address
     * @param {String} amount Number of datatokens, as number. Will be converted to wei
     * @param {String} toAddress only if toAddress is different from the minter
     * @return {Promise<TransactionReceipt>} transactionId
     */
    mint(dtAddress: string, address: string, amount: string, toAddress?: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for addMinter method
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address
     * @param {String} minter User which is going to be a Minter
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasAddMinter(dtAddress: string, address: string, minter: string, contractInstance?: Contract): Promise<any>;
    /**
     * Add Minter for an ERC20 datatoken
     * only ERC20Deployer can succeed
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address
     * @param {String} minter User which is going to be a Minter
     * @return {Promise<TransactionReceipt>} transactionId
     */
    addMinter(dtAddress: string, address: string, minter: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas for removeMinter method
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address
     * @param {String} minter User which will be removed from Minter permission
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasRemoveMinter(dtAddress: string, address: string, minter: string, contractInstance?: Contract): Promise<any>;
    /**
     * Revoke Minter permission for an ERC20 datatoken
     * only ERC20Deployer can succeed
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address
     * @param {String} minter User which will be removed from Minter permission
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    removeMinter(dtAddress: string, address: string, minter: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas for addPaymentManager method
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address
     * @param {String} paymentManager User which is going to be a Minter
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasAddPaymentManager(dtAddress: string, address: string, paymentManager: string, contractInstance?: Contract): Promise<any>;
    /**
     * Add addPaymentManager (can set who's going to collect fee when consuming orders)
     * only ERC20Deployer can succeed
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address
     * @param {String} paymentManager User which is going to be a Minter
     * @return {Promise<TransactionReceipt>} transactionId
     */
    addPaymentManager(dtAddress: string, address: string, paymentManager: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas for removePaymentManager method
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address
     * @param {String} paymentManager User which will be removed from paymentManager permission
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasRemovePaymentManager(dtAddress: string, address: string, paymentManager: string, contractInstance?: Contract): Promise<any>;
    /**
     * Revoke paymentManager permission for an ERC20 datatoken
     * only ERC20Deployer can succeed
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address
     * @param {String} paymentManager User which will be removed from paymentManager permission
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    removePaymentManager(dtAddress: string, address: string, paymentManager: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas for setPaymentCollector method
     * @param dtAddress datatoken address
     * @param address Caller address
     * @param paymentCollector User to be set as new payment collector
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasSetPaymentCollector(dtAddress: string, address: string, paymentCollector: string, contractInstance?: Contract): Promise<any>;
    /**
     * This function allows to set a new PaymentCollector (receives DT when consuming)
     * If not set the paymentCollector is the NFT Owner
     * only NFT owner can call
     * @param dtAddress datatoken address
     * @param address Caller address
     * @param paymentCollector User to be set as new payment collector
     * @return {Promise<TransactionReceipt>} trxReceipt
     */
    setPaymentCollector(dtAddress: string, address: string, paymentCollector: string): Promise<TransactionReceipt>;
    /** getPaymentCollector - It returns the current paymentCollector
     * @param dtAddress datatoken address
     * @return {Promise<string>}
     */
    getPaymentCollector(dtAddress: string): Promise<string>;
    /**
     * Transfer as number from address to toAddress
     * @param {String} dtAddress Datatoken address
     * @param {String} toAddress Receiver address
     * @param {String} amount Number of datatokens, as number. To be converted to wei.
     * @param {String} address User adress
     * @return {Promise<TransactionReceipt>} transactionId
     */
    transfer(dtAddress: string, toAddress: string, amount: string, address: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas for transfer method
     * @param {String} dtAddress Datatoken address
     * @param {String} toAddress Receiver address
     * @param {String} amount Number of datatokens, as number. Expressed as wei
     * @param {String} address User adress
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasTransfer(dtAddress: string, toAddress: string, amount: string, address: string, contractInstance?: Contract): Promise<any>;
    /**
     * Transfer in wei from address to toAddress
     * @param {String} dtAddress Datatoken address
     * @param {String} toAddress Receiver address
     * @param {String} amount Number of datatokens, as number. Expressed as wei
     * @param {String} address User adress
     * @return {Promise<TransactionReceipt>} transactionId
     */
    transferWei(dtAddress: string, toAddress: string, amount: string, address: string): Promise<TransactionReceipt>;
    /** Estimate gas cost for startOrder method
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address which calls
     * @param {String} consumer Consumer Address
     * @param {Number} serviceIndex  Service index in the metadata
     * @param {providerFees} providerFees provider fees
     * @param {consumeMarketFee} ConsumeMarketFee consume market fees
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasStartOrder(dtAddress: string, address: string, consumer: string, serviceIndex: number, providerFees: ProviderFees, consumeMarketFee?: ConsumeMarketFee, contractInstance?: Contract): Promise<any>;
    /** Start Order: called by payer or consumer prior ordering a service consume on a marketplace.
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address which calls
     * @param {String} consumer Consumer Address
     * @param {Number} serviceIndex  Service index in the metadata
     * @param {providerFees} providerFees provider fees
     * @param {consumeMarketFee} ConsumeMarketFee consume market fees
     * @return {Promise<TransactionReceipt>} string
     */
    startOrder(dtAddress: string, address: string, consumer: string, serviceIndex: number, providerFees: ProviderFees, consumeMarketFee?: ConsumeMarketFee): Promise<TransactionReceipt>;
    /** Estimate gas cost for buyFromFreAndOrder method
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address which calls
     * @param {OrderParams} orderParams Consumer Address
     * @param {FreParams} freParams Amount of tokens that is going to be transfered
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasBuyFromFreAndOrder(dtAddress: string, address: string, orderParams: OrderParams, freParams: FreOrderParams, contractInstance?: Contract): Promise<any>;
    /** Buys 1 DT from the FRE and then startsOrder, while burning that DT
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address which calls
     * @param {OrderParams} orderParams Consumer Address
     * @param {FreParams} freParams Amount of tokens that is going to be transfered
     * @return {Promise<TransactionReceipt>}
     */
    buyFromFreAndOrder(dtAddress: string, address: string, orderParams: OrderParams, freParams: FreOrderParams): Promise<TransactionReceipt>;
    /** Estimate gas cost for buyFromFreAndOrder method
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address which calls
     * @param {OrderParams} orderParams
     * @param {String} dispenserContract
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasBuyFromDispenserAndOrder(dtAddress: string, address: string, orderParams: OrderParams, dispenserContract: string, contractInstance?: Contract): Promise<any>;
    /** Gets DT from dispenser and then startsOrder, while burning that DT
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address which calls
     * @param {OrderParams} orderParams
     * @param {String} dispenserContract
     * @return {Promise<TransactionReceipt>}
     */
    buyFromDispenserAndOrder(dtAddress: string, address: string, orderParams: OrderParams, dispenserContract: string): Promise<TransactionReceipt>;
    /** Estimate gas for setData method
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address
     * @param {String} value Data to be stored into 725Y standard
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasSetData(dtAddress: string, address: string, value: string, contractInstance?: Contract): Promise<any>;
    /** setData
     * This function allows to store data with a preset key (keccak256(ERC20Address)) into NFT 725 Store
     * only ERC20Deployer can succeed
     * @param {String} dtAddress Datatoken address
     * @param {String} address User address
     * @param {String} value Data to be stored into 725Y standard
     * @return {Promise<TransactionReceipt>} transactionId
     */
    setData(dtAddress: string, address: string, value: string): Promise<TransactionReceipt>;
    /** Estimate gas for cleanPermissions method
     * @param dtAddress Datatoken address where we want to clean permissions
     * @param address User adress
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<any>}
     */
    estGasCleanPermissions(dtAddress: string, address: string, contractInstance?: Contract): Promise<any>;
    /**
     * Clean erc20level Permissions (minters, paymentManager and reset the paymentCollector) for an ERC20 datatoken
     * Only NFT Owner (at 721 level) can call it.
     * @param dtAddress Datatoken address where we want to clean permissions
     * @param address User adress
     * @return {Promise<TransactionReceipt>} transactionId
     */
    cleanPermissions(dtAddress: string, address: string): Promise<TransactionReceipt>;
    /** Returns ERC20 user's permissions for a datatoken
     * @param {String} dtAddress Datatoken adress
     * @param {String} address user adress
     * @return {Promise<Roles>}
     */
    getDTPermissions(dtAddress: string, address: string): Promise<Roles>;
    /** Returns the Datatoken capital
     * @param {String} dtAddress Datatoken adress
     * @return {Promise<string>}
     */
    getCap(dtAddress: string): Promise<string>;
    /** It returns the token decimals, how many supported decimal points
     * @param {String} dtAddress Datatoken adress
     * @return {Promise<number>}
     */
    getDecimals(dtAddress: string): Promise<string>;
    /** It returns the token decimals, how many supported decimal points
     * @param {String} dtAddress Datatoken adress
     * @return {Promise<number>}
     */
    getNFTAddress(dtAddress: string): Promise<string>;
    /**  Returns true if address has deployERC20 role
     * @param {String} dtAddress Datatoken adress
     * @param {String} dtAddress Datatoken adress
     * @return {Promise<boolean>}
     */
    isERC20Deployer(dtAddress: string, address: string): Promise<boolean>;
    /**
     * Get Address Balance for datatoken
     * @param {String} dtAddress Datatoken adress
     * @param {String} address user adress
     * @return {Promise<String>} balance  Number of datatokens. Will be converted from wei
     */
    balance(datatokenAddress: string, address: string): Promise<string>;
}
export {};
