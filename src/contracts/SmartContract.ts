import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { Config, ConfigHelper } from '../config'
import { amountToUnits, unitsToAmount } from '../utils'

export abstract class SmartContract {
  public web3: Web3
  public config: Config
  public abi: AbiItem | AbiItem[]

  abstract getDefaultAbi(): AbiItem | AbiItem[]

  /**
   * Instantiate the smart contract.
   * @param {Web3} web3
   * @param {string | number} network Network id or name
   * @param {Config} config Configutation of the smart contract
   * @param {AbiItem | AbiItem[]} abi ABI of the smart contract
   */
  constructor(
    web3: Web3,
    network?: string | number,
    config?: Config,
    abi?: AbiItem | AbiItem[]
  ) {
    this.web3 = web3
    this.config = config || new ConfigHelper().getConfig(network || 'unknown')
    this.abi = abi || (this.getDefaultAbi() as AbiItem[])
  }

  async amountToUnits(
    token: string,
    amount: string,
    tokenDecimals?: number
  ): Promise<string> {
    return amountToUnits(this.web3, token, amount, tokenDecimals)
  }

  async unitsToAmount(
    token: string,
    amount: string,
    tokenDecimals?: number
  ): Promise<string> {
    return unitsToAmount(this.web3, token, amount, tokenDecimals)
  }
}
