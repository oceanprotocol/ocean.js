import { Signer, Contract } from 'ethers'
import { AbiItem } from '../@types/index.js'
import { Config } from '../config/index.js'
import { SmartContract } from './SmartContract.js'
export abstract class SmartContractWithAddress extends SmartContract {
  public address: string
  public contract: Contract

  /**
   * Instantiate the smart contract.
   * @param {string} address The address of the contract.
   * @param {Signer} signer The signer object.
   * @param {string | number} network Network id or name
   * @param {Config} config The configuration object.
   * @param {AbiItem[]} abi ABI array of the smart contract
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
