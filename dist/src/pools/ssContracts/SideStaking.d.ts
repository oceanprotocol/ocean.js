import Web3 from 'web3';
import { AbiItem } from 'web3-utils/types';
import { TransactionReceipt } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { Config } from '../../models';
export declare class SideStaking {
    ssAbi: AbiItem | AbiItem[];
    web3: Web3;
    GASLIMIT_DEFAULT: number;
    config: Config;
    constructor(web3: Web3, ssAbi?: AbiItem | AbiItem[], config?: Config);
    amountToUnits(token: string, amount: string): Promise<string>;
    unitsToAmount(token: string, amount: string): Promise<string>;
    /**
     * Get (total vesting amount + token released from the contract when adding liquidity)
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatoken address
     * @return {String}
     */
    getDatatokenCirculatingSupply(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Get actual dts in circulation (vested token withdrawn from the contract +
           token released from the contract when adding liquidity)
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatoken address
     * @return {String}
     */
    getDatatokenCurrentCirculatingSupply(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Get Publisher address
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatoken address
     * @return {String}
     */
    getPublisherAddress(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Get
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @return {String}
     */
    getBaseToken(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Get Pool Address
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @return {String}
     */
    getPoolAddress(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Get baseToken balance in the contract
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @return {String}
     */
    getBaseTokenBalance(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Get dt balance in the staking contract available for being added as liquidity
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @return {String}
     */
    getDatatokenBalance(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Get block when vesting ends
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @return {String} end block for vesting amount
     */
    getvestingEndBlock(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Get total amount vesting
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @return {String}
     */
    getvestingAmount(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Get last block publisher got some vested tokens
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @return {String}
     */
    getvestingLastBlock(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Get how much has been taken from the vesting amount
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @return {String}
     */
    getvestingAmountSoFar(ssAddress: string, datatokenAddress: string): Promise<string>;
    /**
     * Estimate gas cost for getVesting
     * @param {String} account
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estGetVesting(account: string, ssAddress: string, datatokenAddress: string, contractInstance?: Contract): Promise<number>;
    /** Send vested tokens available to the publisher address, can be called by anyone
     *
     * @param {String} account
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @return {TransactionReceipt}
     */
    getVesting(account: string, ssAddress: string, datatokenAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for getVesting
     * @param {String} account
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estSetPoolSwapFee(account: string, ssAddress: string, datatokenAddress: string, poolAddress: string, swapFee: number, contractInstance?: Contract): Promise<number>;
    /** Send vested tokens available to the publisher address, can be called by anyone
     *
     * @param {String} account
     * @param {String} ssAddress side staking contract address
     * @param {String} datatokenAddress datatokenAddress
     * @return {TransactionReceipt}
     */
    setPoolSwapFee(account: string, ssAddress: string, datatokenAddress: string, poolAddress: string, swapFee: number): Promise<TransactionReceipt>;
    /**
     * Get Router address set in side staking contract
     * @param {String} ssAddress side staking contract address
     * @return {String}
     */
    getRouter(ssAddress: string): Promise<string>;
}
