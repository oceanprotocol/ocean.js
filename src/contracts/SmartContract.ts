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
   * @param {Signer} signer
   * @param {string | number} network Network id or name
   * @param {Config} config Configutation of the smart contract
   * @param {AbiItem[]} abi ABI of the smart contract
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

  protected async amountToUnits(
    token: string,
    amount: string,
    tokenDecimals?: number
  ): Promise<string> {
    return amountToUnits(this.signer, token, amount, tokenDecimals)
  }

  protected async unitsToAmount(
    token: string,
    amount: string,
    tokenDecimals?: number
  ): Promise<string> {
    return unitsToAmount(this.signer, token, amount, tokenDecimals)
  }

  protected async getFairGasPrice(): Promise<string> {
    return getFairGasPrice(this.signer, this.config?.gasFeeMultiplier)
  }

  protected getContract(address: string, account?: string, abi?: AbiItem[]): Contract {
    const abiToUse = abi || this.abi
    const contract = new ethers.Contract(
      address,
      new ethers.utils.Interface(JSON.stringify(abiToUse)),
      this.signer
    )
    return setContractDefaults(contract, this.config)
  }
}
