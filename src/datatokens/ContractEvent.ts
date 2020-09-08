import { EventData, Filter } from 'web3-eth-contract'
import ContractBase from './contracts/ContractBase'

interface EventEmitter {
  subscribe: (onEvent: (blockNumber: number) => void) => void
  unsubscribe: (onEvent: (blockNumber: number) => void) => void
}

export interface ContractEventSubscription {
  unsubscribe: () => void
}

export class ContractEvent {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private eventEmitter: EventEmitter,
    private contract: ContractBase,
    private eventName: string,
    private filter: Filter
  ) {}

  public subscribe(callback: (events: EventData[]) => void): ContractEventSubscription {
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

  public once(callback?: (events: EventData[]) => void): Promise<any[]> {
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
