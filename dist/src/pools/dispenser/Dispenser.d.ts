import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import { TransactionReceipt } from 'web3-eth';
import { Datatoken } from '../../tokens';
import { Config } from '../../models/index.js';
export interface DispenserToken {
    active: boolean;
    owner: string;
    maxTokens: string;
    maxBalance: string;
    balance: string;
    isMinter: boolean;
    allowedSwapper: string;
}
export declare class Dispenser {
    GASLIMIT_DEFAULT: number;
    web3: Web3;
    dispenserAddress: string;
    config: Config;
    dispenserAbi: AbiItem | AbiItem[];
    dispenserContract: Contract;
    /**
     * Instantiate Dispenser
     * @param {any} web3
     * @param {String} dispenserAddress
     * @param {any} dispenserABI
     */
    constructor(web3: Web3, dispenserAddress?: string, dispenserAbi?: AbiItem | AbiItem[], config?: Config);
    /**
     * Get information about a datatoken dispenser
     * @param {String} dtAddress
     * @return {Promise<FixedPricedExchange>} Exchange details
     */
    status(dtAdress: string): Promise<DispenserToken>;
    /**
     * Estimate gas cost for create method
     * @param {String} dtAddress Datatoken address
     * @param {String} address Owner address
     * @param {String} maxTokens max tokens to dispense
     * @param {String} maxBalance max balance of requester
     * @param {String} allowedSwapper  if !=0, only this address can request DTs
     * @return {Promise<any>}
     */
    estGasCreate(dtAddress: string, address: string, maxTokens: string, maxBalance: string, allowedSwapper: string): Promise<any>;
    /**
     * Creates a new Dispenser
     * @param {String} dtAddress Datatoken address
     * @param {String} address Owner address
     * @param {String} maxTokens max tokens to dispense
     * @param {String} maxBalance max balance of requester
     * @param {String} allowedSwapper  only account that can ask tokens. set address(0) if not required
     * @return {Promise<TransactionReceipt>} transactionId
     */
    create(dtAddress: string, address: string, maxTokens: string, maxBalance: string, allowedSwapper: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas for activate method
     * @param {String} dtAddress
     * @param {Number} maxTokens max amount of tokens to dispense
     * @param {Number} maxBalance max balance of user. If user balance is >, then dispense will be rejected
     * @param {String} address User address (must be owner of the datatoken)
     * @return {Promise<any>}
     */
    estGasActivate(dtAddress: string, maxTokens: string, maxBalance: string, address: string): Promise<any>;
    /**
     * Activates a new dispener.
     * @param {String} dtAddress refers to datatoken address.
     * @param {Number} maxTokens max amount of tokens to dispense
     * @param {Number} maxBalance max balance of user. If user balance is >, then dispense will be rejected
     * @param {String} address User address (must be owner of the datatoken)
     * @return {Promise<TransactionReceipt>} TransactionReceipt
     */
    activate(dtAddress: string, maxTokens: string, maxBalance: string, address: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas for deactivate method
     * @param {String} dtAddress
     * @param {String} address User address (must be owner of the datatoken)
     * @return {Promise<any>}
     */
    estGasDeactivate(dtAddress: string, address: string): Promise<any>;
    /**
     * Deactivate an existing dispenser.
     * @param {String} dtAddress refers to datatoken address.
     * @param {String} address User address (must be owner of the datatoken)
     * @return {Promise<TransactionReceipt>} TransactionReceipt
     */
    deactivate(dtAddress: string, address: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas for setAllowedSwapper method
     * @param {String} dtAddress refers to datatoken address.
     * @param {String} address User address (must be owner of the datatoken)
     * @param {String} newAllowedSwapper refers to the new allowedSwapper
     * @return {Promise<any>}
     */
    estGasSetAllowedSwapper(dtAddress: string, address: string, newAllowedSwapper: string): Promise<any>;
    /**
     * Sets a new allowedSwapper.
     * @param {String} dtAddress refers to datatoken address.
     * @param {String} address User address (must be owner of the datatoken)
     * @param {String} newAllowedSwapper refers to the new allowedSwapper
     * @return {Promise<TransactionReceipt>} TransactionReceipt
     */
    setAllowedSwapper(dtAddress: string, address: string, newAllowedSwapper: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas for dispense method
     * @param {String} dtAddress refers to datatoken address.
     * @param {String} address User address (must be owner of the datatoken)
     * @param {String} newAllowedSwapper refers to the new allowedSwapper
     * @return {Promise<any>}
     */
    estGasDispense(dtAddress: string, address: string, amount: string, destination: string): Promise<any>;
    /**
     * Dispense datatokens to caller.
     * The dispenser must be active, hold enough DT (or be able to mint more)
     * and respect maxTokens/maxBalance requirements
     * @param {String} dtAddress refers to datatoken address.
     * @param {String} address User address
     * @param {String} amount amount of datatokens required.
     * @param {String} destination who will receive the tokens
     * @return {Promise<TransactionReceipt>} TransactionReceipt
     */
    dispense(dtAddress: string, address: string, amount: string, destination: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas for ownerWithdraw method
     * @param {String} dtAddress refers to datatoken address.
     * @param {String} address User address (must be owner of the datatoken)
     * @param {String} newAllowedSwapper refers to the new allowedSwapper
     * @return {Promise<any>}
     */
    estGasOwnerWithdraw(dtAddress: string, address: string): Promise<any>;
    /**
     * Withdraw all tokens from the dispenser
     * @param {String} dtAddress refers to datatoken address.
     * @param {String} address User address (must be owner of the dispenser)
     * @return {Promise<TransactionReceipt>} TransactionReceipt
     */
    ownerWithdraw(dtAddress: string, address: string): Promise<TransactionReceipt>;
    /**
     * Check if tokens can be dispensed
     * @param {String} dtAddress
     * @param {String} address User address that will receive datatokens
     * @param {String} amount amount of datatokens required.
     * @return {Promise<Boolean>}
     */
    isDispensable(dtAddress: string, datatoken: Datatoken, address: string, amount?: string): Promise<Boolean>;
}
