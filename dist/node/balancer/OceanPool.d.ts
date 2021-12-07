import Web3 from 'web3';
import { AbiItem } from 'web3-utils/types';
import { TransactionReceipt } from 'web3-core';
import { Pool } from './Pool';
import { SubscribablePromise, Logger } from '../utils';
import { ConfigHelperConfig } from '../utils/ConfigHelper';
declare type PoolTransactionType = 'swap' | 'join' | 'exit';
export interface PoolDetails {
    poolAddress: string;
    tokens: string[];
}
export interface PoolShare {
    poolAddress: string;
    shares: string;
    did: string;
}
export interface TokensReceived {
    dtAmount: string;
    oceanAmount: string;
}
export interface PoolTransaction {
    poolAddress: string;
    dtAddress: string;
    caller: string;
    transactionHash: string;
    blockNumber: number;
    timestamp: number;
    tokenIn?: string;
    tokenOut?: string;
    tokenAmountIn?: string;
    tokenAmountOut?: string;
    type: PoolTransactionType;
}
export declare enum PoolCreateProgressStep {
    CreatingPool = 0,
    ApprovingDatatoken = 1,
    ApprovingOcean = 2,
    SetupPool = 3
}
export declare class OceanPool extends Pool {
    oceanAddress: string;
    dtAddress: string;
    startBlock: number;
    constructor(web3: Web3, logger: Logger, factoryABI?: AbiItem | AbiItem[], poolABI?: AbiItem | AbiItem[], factoryAddress?: string, oceanAddress?: string, config?: ConfigHelperConfig);
    create(account: string, dtAddress: string, dtAmount: string, dtWeight: string, oceanAmount: string, fee: string): SubscribablePromise<PoolCreateProgressStep, TransactionReceipt>;
    getDTAddress(poolAddress: string): Promise<string>;
    getOceanReserve(poolAddress: string): Promise<string>;
    getDTReserve(poolAddress: string): Promise<string>;
    getMaxBuyQuantity(poolAddress: string, tokenAddress: string): Promise<string>;
    getOceanMaxBuyQuantity(poolAddress: string): Promise<string>;
    getDTMaxBuyQuantity(poolAddress: string): Promise<string>;
    calcInGivenOut(poolAddress: string, tokenInAddress: string, tokenOutAddress: string, tokenOutAmount: string): Promise<string>;
    calcOutGivenIn(poolAddress: string, tokenInAddress: string, tokenOutAddress: string, tokenInAmount: string): Promise<string>;
    calcPoolOutGivenSingleIn(poolAddress: string, tokenInAddress: string, tokenInAmount: string): Promise<string>;
    calcSingleInGivenPoolOut(poolAddress: string, tokenInAddress: string, poolShares: string): Promise<string>;
    calcSingleOutGivenPoolIn(poolAddress: string, tokenOutAddress: string, poolShares: string): Promise<string>;
    calcPoolInGivenSingleOut(poolAddress: string, tokenOutAddress: string, tokenOutAmount: string): Promise<string>;
    getPoolSharesRequiredToRemoveDT(poolAddress: string, dtAmount: string): Promise<string>;
    getDTRemovedforPoolShares(poolAddress: string, poolShares: string): Promise<string>;
    getPoolSharesRequiredToRemoveOcean(poolAddress: string, oceanAmount: string): Promise<string>;
    getOceanRemovedforPoolShares(poolAddress: string, poolShares: string): Promise<string>;
    getTokensRemovedforPoolShares(poolAddress: string, poolShares: string): Promise<TokensReceived>;
    getDTMaxAddLiquidity(poolAddress: string): Promise<string>;
    getOceanMaxAddLiquidity(poolAddress: string): Promise<string>;
    getMaxAddLiquidity(poolAddress: string, tokenAddress: string): Promise<string>;
    getMaxRemoveLiquidity(poolAddress: string, tokenAddress: string): Promise<string>;
    getDTMaxRemoveLiquidity(poolAddress: string): Promise<string>;
    getOceanMaxRemoveLiquidity(poolAddress: string): Promise<string>;
    buyDT(account: string, poolAddress: string, dtAmountWanted: string, maxOceanAmount: string, maxPrice?: string): Promise<TransactionReceipt>;
    buyDTWithExactOcean(account: string, poolAddress: string, minimumdtAmountWanted: string, oceanAmount: string, maxPrice?: string): Promise<TransactionReceipt>;
    sellDT(account: string, poolAddress: string, dtAmount: string, oceanAmountWanted: string, maxPrice?: string): Promise<TransactionReceipt>;
    addDTLiquidity(account: string, poolAddress: string, amount: string): Promise<TransactionReceipt>;
    removeDTLiquidity(account: string, poolAddress: string, amount: string, maximumPoolShares: string): Promise<TransactionReceipt>;
    addOceanLiquidity(account: string, poolAddress: string, amount: string): Promise<TransactionReceipt>;
    removeOceanLiquidityWithMinimum(account: string, poolAddress: string, poolShares: string, minOcean: string): Promise<TransactionReceipt>;
    removeOceanLiquidity(account: string, poolAddress: string, amount: string, maximumPoolShares: string): Promise<TransactionReceipt>;
    removePoolLiquidity(account: string, poolAddress: string, poolShares: string, minDT?: string, minOcean?: string): Promise<TransactionReceipt>;
    getDTPrice(poolAddress: string): Promise<string>;
    searchPoolforDT(dtAddress: string): Promise<string[]>;
    getOceanNeeded(poolAddress: string, dtRequired: string): Promise<string>;
    getOceanReceived(poolAddress: string, dtAmount: string): Promise<string>;
    getDTReceived(poolAddress: string, oceanAmount: string): Promise<string>;
    getDTNeeded(poolAddress: string, OceanRequired: string): Promise<string>;
    getPoolsbyCreator(account?: string): Promise<PoolDetails[]>;
    private getResult;
    getPoolSharesByAddress(account: string): Promise<PoolShare[]>;
    getPoolDetails(poolAddress: string): Promise<PoolDetails>;
    getPoolLogs(poolAddress: string, startBlock?: number, account?: string): Promise<PoolTransaction[]>;
    getAllPoolLogs(account: string): Promise<PoolTransaction[]>;
    private getEventData;
    private computeSlippage;
    computeBuySlippage(poolAddress: string, oceanAmount: string): Promise<string>;
    computeSellSlippage(poolAddress: string, dtAmount: string): Promise<string>;
}
export {};
