import { EventData, EventOptions, Filter } from 'web3-eth-contract';
import { TransactionReceipt } from 'web3-core';
import { Instantiable, InstantiableConfig } from '../../Instantiable.abstract';
export interface EventDataOptions extends EventOptions {
    fromBlock: string | number;
    toBlock: string | number;
}
export declare abstract class ContractBase extends Instantiable {
    private optional;
    protected static instance: any;
    contractName: string;
    private contract;
    get address(): string;
    constructor(contractName: string, optional?: boolean);
    getEventData(eventName: string, options: EventDataOptions): Promise<EventData[]>;
    getPastEvents(eventName: string, filter: Filter): Promise<EventData[]>;
    getAddress(): string;
    getSignatureOfMethod(methodName: string): string;
    getInputsOfMethod(methodName: string): any[];
    protected init(config: InstantiableConfig): Promise<void>;
    protected getFromAddress(from?: string): Promise<string>;
    protected sendFrom(name: string, args: any[], from?: string): Promise<TransactionReceipt>;
    protected send(name: string, from: string, args: any[]): Promise<TransactionReceipt>;
    protected call<T extends any>(name: string, args: any[], from?: string): Promise<T>;
    private searchMethod;
}
export default ContractBase;
