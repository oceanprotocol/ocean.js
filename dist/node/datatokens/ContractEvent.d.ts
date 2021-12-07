import { EventData, Filter } from 'web3-eth-contract';
import ContractBase from './contracts/ContractBase';
interface EventEmitter {
    subscribe: (onEvent: (blockNumber: number) => void) => void;
    unsubscribe: (onEvent: (blockNumber: number) => void) => void;
}
export interface ContractEventSubscription {
    unsubscribe: () => void;
}
export declare class ContractEvent {
    private eventEmitter;
    private contract;
    private eventName;
    private filter;
    constructor(eventEmitter: EventEmitter, contract: ContractBase, eventName: string, filter: Filter);
    subscribe(callback: (events: EventData[]) => void): ContractEventSubscription;
    once(callback?: (events: EventData[]) => void): Promise<any[]>;
}
export {};
