import { ethers, Signer, Contract } from 'ethers'
import { AbiItem } from '../@types'
import { Config, ConfigHelper } from '../config'
import {
  amountToUnits,
  getFairGasPrice,
  setContractDefaults,
  unitsToAmount
} from '../utils'

export abstract class SmartContract {
  public signer: Signer
  public config: Config
  public abi: AbiItem[]

  abstract getDefaultAbi()

  /**
   * Instantiate the smart contract.
   * @param {Signer} signer The signer object.
   * @param {string | number} [network] Network id or name
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract
   */
  constructor(
    signer: Signer,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    this.signer = signer
    this.config = config || new ConfigHelper().getConfig(network || 'unknown')
    this.abi = abi || this.getDefaultAbi()
  }

  /**
   * Converts an amount of tokens to units
   * @param {string} token - The token to convert
   * @param {string} amount - The amount of tokens to convert
   * @param {number} [tokenDecimals] - The number of decimals of the token
   * @returns {Promise<string>} - The converted amount in units
   */
  protected async amountToUnits(
    token: string,
    amount: string,
    tokenDecimals?: number
  ): Promise<string> {
    return amountToUnits(this.signer, token, amount, tokenDecimals)
  }

  /**
   * Converts an amount of units to tokens
   * @param {string} token - The token to convert
   * @param {string} amount - The amount of units to convert
   * @param {number} [tokenDecimals] - The number of decimals in the token
   * @returns {Promise<string>} - The converted amount in tokens
   */
  protected async unitsToAmount(
    token: string,
    amount: string,
    tokenDecimals?: number
  ): Promise<string> {
    return unitsToAmount(this.signer, token, amount, tokenDecimals)
  }

  /**
   * Retruns the gas price
   * @returns {Promise<string>} - The fair gas price
   */
  protected async getFairGasPrice(): Promise<string> {
    return getFairGasPrice(this.signer, this.config?.gasFeeMultiplier)
  }

  /**
   * Returns a contract instance for the given address
   * @param {string} address - The address of the contract
   * @param {AbiItem[]} [abi] - The ABI of the contract
   * @returns {Contract} - The contract instance
   */
  protected getContract(address: string, abi?: AbiItem[]): Contract {
    const abiToUse = abi || this.abi
    const contract = new ethers.Contract(
      address,
      new ethers.utils.Interface(JSON.stringify(abiToUse)),
      this.signer
    )
    return setContractDefaults(contract, this.config)
  }
}
