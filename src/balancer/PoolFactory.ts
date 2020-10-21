import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import jsonFactoryABI from '@oceanprotocol/contracts/artifacts/BFactory.json'
import { TransactionReceipt } from 'web3-core'

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
  async createPool(account: string): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      console.error('ERROR: Web3 object is null')
      return null
    }

    if (this.factoryAddress === null) {
      console.error('ERROR: bfactoryAddress is null')
      return null
    }

    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress, {
      from: account
    })
    let txid = null
    try {
      txid = await factory.methods
        .newBPool()
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
      // pooladdress = transactiondata.events.BPoolRegistered.returnValues[0]
    } catch (e) {
      console.error(`ERROR: Failed to create new pool: ${e.message}`)
    }
    return txid
  }
}
