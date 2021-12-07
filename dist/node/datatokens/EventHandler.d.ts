import { ContractEvent } from './ContractEvent';
import ContractBase from './contracts/ContractBase';
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract';
import { Filter } from 'web3-eth-contract';
export declare class EventHandler extends Instantiable {
    get count(): number;
    private events;
    private lastBlock;
    private interval;
    private polling;
    private lastTimeout;
    constructor(config: InstantiableConfig);
    subscribe(callback: (blockNumber: number) => void): {
        unsubscribe: () => void;
    };
    unsubscribe(callback: (blockNumber: number) => void): void;
    getEvent(contract: ContractBase, eventName: string, filter: Filter): ContractEvent;
    private checkBlock;
}
