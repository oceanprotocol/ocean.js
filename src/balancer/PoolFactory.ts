import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import jsonFactoryABI from '@oceanprotocol/contracts/artifacts/BFactory.json'

export class PoolFactory {
  public GASLIMIT_DEFAULT = 5000000
  public web3: Web3 = null
  public factoryABI: AbiItem | AbiItem[]
  public factoryAddress: string

  constructor(
    web3: Web3,
    factoryABI: AbiItem | AbiItem[] = null,
    factoryAddress: string = null,
    gaslimit?: number
  ) {
    this.web3 = web3

    if (factoryABI) this.factoryABI = factoryABI
    else this.factoryABI = jsonFactoryABI.abi as AbiItem[]
    if (factoryAddress) {
      this.factoryAddress = factoryAddress
    }
    if (gaslimit) this.GASLIMIT_DEFAULT = gaslimit
  }

  /**
   * Creates a new pool
   */
  async createPool(account: string): Promise<string> {
    if (this.web3 === null) {
      console.error('Web3 object is null')
      return null
    }

    if (this.factoryAddress === null) {
      console.error('bfactoryAddress is null')
      return null
    }

    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress, {
      from: account
    })

    const transactiondata = await factory.methods
      .newBPool()
      .send({ from: account, gas: this.GASLIMIT_DEFAULT })

    let pooladdress: string

    try {
      pooladdress = transactiondata.events.BPoolRegistered.returnValues[0]
    } catch (e) {
      console.error(e)
    }
    return pooladdress
  }
}
