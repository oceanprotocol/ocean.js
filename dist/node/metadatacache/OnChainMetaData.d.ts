import { DDO } from '../ddo/DDO';
import { TransactionReceipt } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils/types';
import Web3 from 'web3';
import { Logger } from '../utils';
import { ConfigHelperConfig } from '../utils/ConfigHelper';
import { MetadataCache } from '../metadatacache/MetadataCache';
export interface rawMetadata {
    flags: number;
    data: any;
}
export declare class OnChainMetadata {
    GASLIMIT_DEFAULT: number;
    DDOContractAddress: string;
    DDOContractABI: AbiItem | AbiItem[];
    web3: Web3;
    DDOContract: Contract;
    private logger;
    metadataCache: MetadataCache;
    private config;
    constructor(web3: Web3, logger: Logger, DDOContractAddress: string, DDOContractABI: AbiItem | AbiItem[], metadataCache: MetadataCache, config?: ConfigHelperConfig);
    compressDDO(data: any): Promise<string>;
    publish(did: string, ddo: DDO, consumerAccount: string, encrypt?: boolean, validate?: boolean): Promise<TransactionReceipt>;
    update(did: string, ddo: DDO, consumerAccount: string, encrypt?: boolean, validate?: boolean): Promise<TransactionReceipt>;
    prepareRawData(ddo: DDO, encrypt?: boolean): Promise<rawMetadata>;
    publishRaw(did: string, flags: any, data: any, consumerAccount: string): Promise<TransactionReceipt>;
    updateRaw(did: string, flags: any, data: any, consumerAccount: string): Promise<TransactionReceipt>;
    transferOwnership(did: string, newOwner: string, consumerAccount: string): Promise<TransactionReceipt>;
    getHex(message: any): string;
}
