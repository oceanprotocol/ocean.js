import Web3 from 'web3'
import * as jsonFactoryABI from '@oceanprotocol/contracts/artifacts/SFactory.json'

export class PoolFactory {
  public GASLIMIT_DEFAULT = 5000000
  public web3: any = null
  public FactoryABI: any
  public factoryAddress: any

  constructor(
    web3: Web3,
    FactoryABI: any = null,
    factoryAddress: string = null,
    gaslimit?: number
  ) {
    this.web3 = web3

    if (FactoryABI) this.FactoryABI = FactoryABI
    else this.FactoryABI = jsonFactoryABI.abi
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

    const factory = new this.web3.eth.Contract(this.FactoryABI, this.factoryAddress, {
      from: account
    })

    const transactiondata = await factory.methods
      .newSPool()
      .send({ from: account, gas: this.GASLIMIT_DEFAULT })

    let pooladdress: string

    try {
      pooladdress = transactiondata.events.SPoolRegistered.returnValues[0]
    } catch (e) {
      console.error(e)
    }
    return pooladdress
  }
}
