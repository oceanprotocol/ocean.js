import { TransactionReceipt } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils/types';
import Web3 from 'web3';
import { SubscribablePromise, Logger } from '../utils';
import { DataTokens } from '../datatokens/Datatokens';
import { ConfigHelperConfig } from '../utils/ConfigHelper';
export interface FixedPriceExchange {
    exchangeID?: string;
    exchangeOwner: string;
    dataToken: string;
    baseToken: string;
    fixedRate: string;
    active: boolean;
    supply: string;
}
export interface FixedPriceSwap {
    exchangeID: string;
    caller: string;
    baseTokenAmount: string;
    dataTokenAmount: string;
}
export declare enum FixedRateCreateProgressStep {
    CreatingExchange = 0,
    ApprovingDatatoken = 1
}
export declare class OceanFixedRateExchange {
    GASLIMIT_DEFAULT: number;
    oceanAddress: string;
    fixedRateExchangeAddress: string;
    fixedRateExchangeABI: AbiItem | AbiItem[];
    web3: Web3;
    contract: Contract;
    private logger;
    datatokens: DataTokens;
    startBlock: number;
    private config;
    constructor(web3: Web3, logger: Logger, fixedRateExchangeAddress: string, fixedRateExchangeABI: AbiItem | AbiItem[], oceanAddress: string, datatokens: DataTokens, config?: ConfigHelperConfig);
    create(dataToken: string, rate: string, address: string, amount?: string): SubscribablePromise<FixedRateCreateProgressStep, TransactionReceipt>;
    createExchange(baseToken: string, dataToken: string, rate: string, address: string, amount?: string): SubscribablePromise<FixedRateCreateProgressStep, TransactionReceipt>;
    generateExchangeId(dataToken: string, owner: string): Promise<string>;
    buyDT(exchangeId: string, dataTokenAmount: string, address: string): Promise<TransactionReceipt>;
    getNumberOfExchanges(): Promise<number>;
    setRate(exchangeId: string, newRate: number, address: string): Promise<TransactionReceipt>;
    activate(exchangeId: string, address: string): Promise<TransactionReceipt>;
    deactivate(exchangeId: string, address: string): Promise<TransactionReceipt>;
    getRate(exchangeId: string): Promise<string>;
    getSupply(exchangeId: string): Promise<string>;
    getOceanNeeded(exchangeId: string, dataTokenAmount: string): Promise<string>;
    getExchange(exchangeId: string): Promise<FixedPriceExchange>;
    getExchanges(): Promise<string[]>;
    isActive(exchangeId: string): Promise<boolean>;
    CalcInGivenOut(exchangeId: string, dataTokenAmount: string): Promise<string>;
    searchforDT(dataTokenAddress: string, minSupply: string): Promise<FixedPriceExchange[]>;
    getExchangesbyCreator(account?: string): Promise<FixedPriceExchange[]>;
    getExchangeSwaps(exchangeId: string, account?: string): Promise<FixedPriceSwap[]>;
    getAllExchangesSwaps(account: string): Promise<FixedPriceSwap[]>;
    private getEventData;
}
