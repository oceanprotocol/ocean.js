import { TransactionReceipt } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils/types';
import Web3 from 'web3';
import { SubscribablePromise, Logger } from '../utils';
import { DataTokens } from '../datatokens/Datatokens';
import { ConfigHelperConfig } from '../utils/ConfigHelper';
export interface DispenserToken {
    active: boolean;
    owner: string;
    minterApproved: boolean;
    isTrueMinter: boolean;
    maxTokens: string;
    maxBalance: string;
    balance: string;
}
export declare enum DispenserMakeMinterProgressStep {
    MakeDispenserMinter = 0,
    AcceptingNewMinter = 1
}
export declare enum DispenserCancelMinterProgressStep {
    MakeOwnerMinter = 0,
    AcceptingNewMinter = 1
}
export declare class OceanDispenser {
    GASLIMIT_DEFAULT: number;
    dispenserAddress: string;
    dispenserABI: AbiItem | AbiItem[];
    web3: Web3;
    contract: Contract;
    private logger;
    datatokens: DataTokens;
    startBlock: number;
    private config;
    constructor(web3: Web3, logger: Logger, dispenserAddress: string, dispenserABI: AbiItem | AbiItem[], datatokens: DataTokens, config?: ConfigHelperConfig);
    status(dataTokenAddress: string): Promise<DispenserToken>;
    activate(dataToken: string, maxTokens: string, maxBalance: string, address: string): Promise<TransactionReceipt>;
    deactivate(dataToken: string, address: string): Promise<TransactionReceipt>;
    makeMinter(dataToken: string, address: string): SubscribablePromise<DispenserMakeMinterProgressStep, TransactionReceipt>;
    cancelMinter(dataToken: string, address: string): SubscribablePromise<DispenserCancelMinterProgressStep, TransactionReceipt>;
    dispense(dataToken: string, address: string, amount?: string): Promise<TransactionReceipt>;
    ownerWithdraw(dataToken: string, address: string): Promise<TransactionReceipt>;
    isDispensable(dataToken: string, address: string, amount?: string): Promise<Boolean>;
}
