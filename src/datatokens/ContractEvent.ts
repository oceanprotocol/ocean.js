import ContractBase from './contracts/ContractBase'

interface EventEmitter {
    subscribe: Function
    unsubscribe: Function
}

export interface ContractEventSubscription {
    unsubscribe: () => void
}

export class ContractEvent {
    constructor(
        private eventEmitter: EventEmitter,
        private contract: ContractBase,
        private eventName: string,
        private filter: { [key: string]: any }
    ) {}

    public subscribe(callback: (events: any[]) => void): ContractEventSubscription {
        const onEvent = async (blockNumber: number) => {
            const events = await this.contract.getEventData(this.eventName, {
                filter: this.filter,
                fromBlock: blockNumber,
                toBlock: 'latest'
            })
            if (events.length) {
                callback(events)
            }
        }

        this.eventEmitter.subscribe(onEvent)
        return {
            unsubscribe: () => this.eventEmitter.unsubscribe(onEvent)
        }
    }

    public once(callback?: (events: any[]) => void) {
        return new Promise((resolve) => {
            const subscription = this.subscribe((events) => {
                subscription.unsubscribe()
                if (callback) {
                    callback(events)
                }
                resolve(events)
            })
        })
    }
}
