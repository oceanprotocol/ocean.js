import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { TransactionReceipt } from 'web3-core';
import { AbiItem } from 'web3-utils';
import { Operation } from '../@types/Router';
import { Config } from '../models/index.js';
/**
 * Provides an interface for FactoryRouter contract
 */
export declare class Router {
    GASLIMIT_DEFAULT: number;
    routerAddress: string;
    RouterAbi: AbiItem | AbiItem[];
    web3: Web3;
    config: Config;
    router: Contract;
    /**
     * Instantiate Router.
     * @param {String} routerAddress
     * @param {AbiItem | AbiItem[]} Router
     * @param {Web3} web3
     */
    constructor(routerAddress: string, web3: Web3, RouterAbi?: AbiItem | AbiItem[], config?: Config);
    /**
     * Estimate gas cost for buyDTBatch method
     * @param {String} address
     * @param {Operation} operations Operations objects array
     * @return {Promise<TransactionReceipt>} Transaction receipt
     */
    estGasBuyDTBatch(address: string, operations: Operation[]): Promise<any>;
    /**
     * BuyDTBatch
     * @param {String} address
     * @param {Operation} operations Operations objects array
     * @return {Promise<TransactionReceipt>} Transaction receipt
     */
    buyDTBatch(address: string, operations: Operation[]): Promise<TransactionReceipt>;
    /** Check if a token is on approved tokens list, if true opfFee is lower in pools with that token/DT
     * @return {Promise<boolean>} true if is on the list.
     */
    isApprovedToken(address: string): Promise<boolean>;
    /** Check if an address is a side staking contract.
     * @return {Promise<boolean>} true if is a SS contract
     */
    isSideStaking(address: string): Promise<boolean>;
    /** Check if an address is a Fixed Rate contract.
     * @return {Promise<boolean>} true if is a Fixed Rate contract
     */
    isFixedPrice(address: string): Promise<boolean>;
    /** Get Router Owner
     * @return {Promise<string>} Router Owner address
     */
    getOwner(): Promise<string>;
    /** Get NFT Factory address
     * @return {Promise<string>} NFT Factory address
     */
    getNFTFactory(): Promise<string>;
    /** Check if an address is a pool template contract.
     * @return {Promise<boolean>} true if is a Template
     */
    isPoolTemplate(address: string): Promise<boolean>;
    /**
     * Estimate gas cost for addApprovedToken
     * @param {String} address
     * @param {String} tokenAddress token address we want to add
     * @param {Contract} routerContract optional contract instance
     * @return {Promise<any>}
     */
    estGasAddApprovedToken(address: string, tokenAddress: string, contractInstance?: Contract): Promise<any>;
    /**
     * Add a new token to oceanTokens list, pools with baseToken in this list have NO opf Fee
     * @param {String} address caller address
     * @param {String} tokenAddress token address to add
     * @return {Promise<TransactionReceipt>}
     */
    addApprovedToken(address: string, tokenAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for removeApprovedToken
     * @param {String} address caller address
     * @param {String} tokenAddress token address we want to add
     * @param {Contract} routerContract optional contract instance
     * @return {Promise<any>}
     */
    estGasRemoveApprovedToken(address: string, tokenAddress: string, contractInstance?: Contract): Promise<any>;
    /**
     * Remove a token from oceanTokens list, pools without baseToken in this list have a opf Fee
     * @param {String} address
     * @param {String} tokenAddress address to remove
     * @return {Promise<TransactionReceipt>}
     */
    removeApprovedToken(address: string, tokenAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for addSSContract method
     * @param {String} address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    estGasAddSSContract(address: string, tokenAddress: string): Promise<any>;
    /**
     * Add a new contract to ssContract list, after is added, can be used when deploying a new pool
     * @param {String} address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    addSSContract(address: string, tokenAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for removeSSContract method
     * @param {String} address caller address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    estGasRemoveSSContract(address: string, tokenAddress: string): Promise<any>;
    /**
     * Removes a new contract from ssContract list
     * @param {String} address caller address
     * @param {String} tokenAddress contract address to removed
     * @return {Promise<TransactionReceipt>}
     */
    removeSSContract(address: string, tokenAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for addFixedRateContract method
     * @param {String} address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    estGasAddFixedRateContract(address: string, tokenAddress: string): Promise<any>;
    /**
     * Add a new contract to fixedRate list, after is added, can be used when deploying a new pool
     * @param {String} address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    addFixedRateContract(address: string, tokenAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for addFixedRateContract method
     * @param {String} address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    estGasRemoveFixedRateContract(address: string, tokenAddress: string): Promise<any>;
    /**
     * Removes a contract from fixedRate list
     * @param {String} address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    removeFixedRateContract(address: string, tokenAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for addDispenserContract method
     * @param {String} address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    estGasAddDispenserContract(address: string, tokenAddress: string): Promise<any>;
    /**
     * Add a new contract to dispenser list, after is added, can be used when deploying a new pool
     * @param {String} address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    addDispenserContract(address: string, tokenAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for addDispenserContract method
     * @param {String} address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    estGasRemoveDispenserContract(address: string, tokenAddress: string): Promise<any>;
    /**
     * Add a new contract to dispenser list, after is added, can be used when deploying a new pool
     * @param {String} address
     * @param {String} tokenAddress contract address to add
     * @return {Promise<TransactionReceipt>}
     */
    removeDispenserContract(address: string, tokenAddress: string): Promise<TransactionReceipt>;
    /** Get OPF Fee per token
     * @return {Promise<number>} OPC fee for a specific baseToken
     */
    getOPCFee(baseToken: string): Promise<number>;
    /** Get Current OPF Fee
     * @return {Promise<number>} OPF fee
     */
    getCurrentOPCFee(): Promise<number>;
    /**
     * Estimate gas cost for updateOPFFee method
     * @param {String} address
     * @param {String} newFee new OPF Fee
     * @return {Promise<TransactionReceipt>}
     */
    estGasUpdateOPCFee(address: string, newSwapOceanFee: number, newSwapNonOceanFee: number, newConsumeFee: number, newProviderFee: number): Promise<any>;
    /**
     * Add a new contract to fixedRate list, after is added, can be used when deploying a new pool
     * @param {String} address
     * @param {number} newSwapOceanFee Amount charged for swapping with ocean approved tokens
     * @param {number} newSwapNonOceanFee Amount charged for swapping with non ocean approved tokens
     * @param {number} newConsumeFee Amount charged from consumeFees
     * @param {number} newProviderFee Amount charged for providerFees
     * @return {Promise<TransactionReceipt>}
     */
    updateOPCFee(address: string, newSwapOceanFee: number, newSwapNonOceanFee: number, newConsumeFee: number, newProviderFee: number): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for addPoolTemplate method
     * @param {String} address
     * @param {String} templateAddress template address to add
     * @return {Promise<TransactionReceipt>}
     */
    estGasAddPoolTemplate(address: string, templateAddress: string): Promise<any>;
    /**
     * Add a new template to poolTemplates mapping, after template is added,it can be used
     * @param {String} address
     * @param {String} templateAddress template address to add
     * @return {Promise<TransactionReceipt>}
     */
    addPoolTemplate(address: string, templateAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for removePoolTemplate method
     * @param {String} address
     * @param {String} templateAddress template address to remove
     * @return {Promise<TransactionReceipt>}
     */
    estGasRemovePoolTemplate(address: string, templateAddress: string): Promise<any>;
    /**
     * Remove template from poolTemplates mapping, after template is removed,it can be used anymore
     * @param {String} address
     * @param {String} templateAddress template address to remove
     * @return {Promise<TransactionReceipt>}
     */
    removePoolTemplate(address: string, templateAddress: string): Promise<TransactionReceipt>;
}
