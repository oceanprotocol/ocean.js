import { Contract, EventData, EventOptions, Filter } from 'web3-eth-contract'
import { TransactionReceipt } from 'web3-core'
import ContractHandler from '../ContractHandler'

import { Instantiable, InstantiableConfig } from '../../Instantiable.abstract'

export interface EventDataOptions extends EventOptions {
  fromBlock: string | number
  toBlock: string | number
}

export abstract class ContractBase extends Instantiable {
  protected static instance = null

  public contractName: string

  private contract: Contract = null

  get address(): string {
    return this.contract.options.address
  }

  constructor(contractName: string, private optional: boolean = false) {
    super()
    this.contractName = contractName
  }

  public async getEventData(
    eventName: string,
    options: EventDataOptions
  ): Promise<EventData[]> {
    if (!this.contract.events[eventName]) {
      throw new Error(`Event "${eventName}" not found on contract "${this.contractName}"`)
    }
    return this.contract.getPastEvents(eventName, options)
  }

  public getPastEvents(eventName: string, filter: Filter): Promise<EventData[]> {
    return this.getEventData(eventName, {
      filter,
      fromBlock: 0,
      toBlock: 'latest'
    })
  }

  public getAddress(): string {
    return this.contract.options.address
  }

  public getSignatureOfMethod(methodName: string): string {
    const foundMethod = this.searchMethod(methodName)
    return foundMethod.signature
  }

  public getInputsOfMethod(methodName: string): any[] {
    const foundMethod = this.searchMethod(methodName)
    return foundMethod.inputs
  }

  protected async init(config: InstantiableConfig): Promise<void> {
    this.setInstanceConfig(config)
    const contractHandler = new ContractHandler(config)
    this.contract = await contractHandler.get(this.contractName, this.optional)
  }

  protected async getFromAddress(from?: string): Promise<string> {
    if (!from) {
      from = (await this.web3.eth.getAccounts())[0]
    }
    return from
  }

  protected async sendFrom(
    name: string,
    args: any[],
    from?: string
  ): Promise<TransactionReceipt> {
    from = await this.getFromAddress(from)
    return this.send(name, from, args)
  }

  protected async send(
    name: string,
    from: string,
    args: any[]
  ): Promise<TransactionReceipt> {
    if (!this.contract.methods[name]) {
      throw new Error(`Method "${name}" is not part of contract "${this.contractName}"`)
    }
    // Logger.log(name, args)
    const method = this.contract.methods[name]
    try {
      const methodInstance = method(...args)
      const estimatedGas = await methodInstance.estimateGas(args, {
        from
      })
      const tx = methodInstance.send({
        from,
        gas: estimatedGas
      })
      return tx
    } catch (err) {
      const mappedArgs = this.searchMethod(name, args).inputs.map((input, i) => {
        return {
          name: input.name,
          value: args[i]
        }
      })
      this.logger.error('-'.repeat(40))
      this.logger.error(
        `Sending transaction "${name}" on contract "${this.contractName}" failed.`
      )
      this.logger.error(`Error: ${err.message}`)
      this.logger.error(`From: ${from}`)
      this.logger.error(`Parameters: ${JSON.stringify(mappedArgs, null, 2)}`)
      this.logger.error('-'.repeat(40))
      throw err
    }
  }

  protected async call<T extends any>(
    name: string,
    args: any[],
    from?: string
  ): Promise<T> {
    if (!this.contract.methods[name]) {
      throw new Error(`Method ${name} is not part of contract ${this.contractName}`)
    }
    // Logger.log(name)
    try {
      const method = this.contract.methods[name](...args)
      return method.call(from ? { from } : null)
    } catch (err) {
      this.logger.error(
        `Calling method "${name}" on contract "${this.contractName}" failed. Args: ${args}`,
        err
      )
      throw err
    }
  }

  // protected getEvent(eventName: string, filter: { [key: string]: any }) {
  //     if (!this.contract.events[eventName]) {
  //         throw new Error(
  //             `Event ${eventName} is not part of contract ${this.contractName}`
  //         )
  //     }
  //     return this.ocean.keeper.utils.eventHandler.getEvent(this, eventName, filter)
  // }

  private searchMethod(methodName: string, args: any[] = []) {
    const methods = this.contract.options.jsonInterface
      .map((method) => ({
        ...method,
        signature: (method as any).signature
      }))
      .filter((method: any) => method.name === methodName)
    const foundMethod =
      methods.find(({ inputs }) => inputs.length === args.length) || methods[0]
    if (!foundMethod) {
      throw new Error(
        `Method "${methodName}" is not part of contract "${this.contractName}"`
      )
    }
    return foundMethod
  }
}

export default ContractBase
