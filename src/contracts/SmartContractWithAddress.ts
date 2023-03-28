import { Signer, Contract, ContractFunction } from 'ethers'
import { AbiItem } from '../@types'
import { Config } from '../config'
import { SmartContract } from './SmartContract'
export abstract class SmartContractWithAddress extends SmartContract {
  public address: string
  public contract: Contract

  /**
   * Instantiate the smart contract.
   * @param {string} address Address of the smart contract
   * @param {Signer} signer
   * @param {string | number} network Network id or name
   * @param {Config} config Configutation of the smart contract
   * @param {AbiItem[]} abi ABI of the smart contract
   */
  constructor(
    address: string,
    signer: Signer,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    super(signer, network, config, abi)
    this.address = address
    this.contract = this.getContract(this.address)
  }
}
