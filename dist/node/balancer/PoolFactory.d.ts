import Web3 from 'web3';
import { AbiItem } from 'web3-utils/types';
import { Logger } from '../utils';
import { TransactionReceipt } from 'web3-core';
import { ConfigHelperConfig } from '../utils/ConfigHelper';
export declare class PoolFactory {
    GASLIMIT_DEFAULT: number;
    web3: Web3;
    factoryABI: AbiItem | AbiItem[];
    factoryAddress: string;
    logger: Logger;
    config: ConfigHelperConfig;
    constructor(web3: Web3, logger: Logger, factoryABI?: AbiItem | AbiItem[], factoryAddress?: string, config?: ConfigHelperConfig);
    createPool(account: string): Promise<TransactionReceipt>;
}
