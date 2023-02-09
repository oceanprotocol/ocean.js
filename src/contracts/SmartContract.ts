// import Web3 from 'web3'
// import { Contract } from 'web3-eth-contract'
// import { AbiItem } from 'web3-utils'
import { ethers, Signer, Interface, Contract, InterfaceAbi } from 'ethers'
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
  public abi: InterfaceAbi

  abstract getDefaultAbi()

  /**
   * Instantiate the smart contract.
   * @param {Signer} signer
   * @param {string | number} network Network id or name
   * @param {Config} config Configutation of the smart contract
   * @param {AbiItem | AbiItem[]} abi ABI of the smart contract
   */
  constructor(
    signer: Signer,
    network?: string | number,
    config?: Config,
    abi?: InterfaceAbi
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

  protected getContract(address: string, account?: string, abi?: InterfaceAbi): Contract {
    const contract = new ethers.Contract(address, abi || this.abi, this.signer)
    return setContractDefaults(contract, this.config)
  }
}
