import Web3 from 'web3';
import { AbiItem } from 'web3-utils/types';
import { ConfigHelperConfig } from '../utils/ConfigHelper';
import { Logger } from '../utils';
import { TransactionReceipt } from 'web3-core';
export declare class DataTokens {
    GASLIMIT_DEFAULT: number;
    factoryAddress: string;
    factoryABI: AbiItem | AbiItem[];
    datatokensABI: AbiItem | AbiItem[];
    web3: Web3;
    private logger;
    startBlock: number;
    private config;
    constructor(factoryAddress: string, factoryABI: AbiItem | AbiItem[], datatokensABI: AbiItem | AbiItem[], web3: Web3, logger: Logger, config?: ConfigHelperConfig);
    generateDtName(wordList?: {
        nouns: string[];
        adjectives: string[];
    }): {
        name: string;
        symbol: string;
    };
    create(metadataCacheUri: string, address: string, cap?: string, name?: string, symbol?: string): Promise<string>;
    approve(dataTokenAddress: string, spender: string, amount: string, address: string): Promise<TransactionReceipt>;
    mint(dataTokenAddress: string, address: string, amount: string, toAddress?: string): Promise<TransactionReceipt>;
    transfer(dataTokenAddress: string, toAddress: string, amount: string, address: string): Promise<TransactionReceipt>;
    transferToken(dataTokenAddress: string, toAddress: string, amount: string, address: string): Promise<TransactionReceipt>;
    transferWei(dataTokenAddress: string, toAddress: string, amount: string, address: string): Promise<TransactionReceipt>;
    transferFrom(dataTokenAddress: string, fromAddress: string, amount: string, address: string): Promise<string>;
    balance(dataTokenAddress: string, address: string): Promise<string>;
    allowance(dataTokenAddress: string, owner: string, spender: string): Promise<string>;
    getBlob(dataTokenAddress: string): Promise<string>;
    getName(dataTokenAddress: string): Promise<string>;
    getSymbol(dataTokenAddress: string): Promise<string>;
    getCap(dataTokenAddress: string): Promise<string>;
    toWei(amount: string): string;
    fromWei(amount: string): string;
    startOrder(dataTokenAddress: string, consumer: string, amount: string, serviceId: number, mpFeeAddress: string, address: string): Promise<TransactionReceipt>;
    getPreviousValidOrders(dataTokenAddress: string, amount: string, serviceId: number, timeout: number, address: string): Promise<string>;
    getStartOrderEventSignature(): string;
    proposeMinter(dataTokenAddress: string, newMinterAddress: string, address: string): Promise<TransactionReceipt>;
    approveMinter(dataTokenAddress: string, address: string): Promise<TransactionReceipt>;
    isMinter(dataTokenAddress: string, address: string): Promise<boolean>;
}
