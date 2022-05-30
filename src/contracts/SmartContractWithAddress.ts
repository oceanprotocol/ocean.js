import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import { Config, SmartContract } from '..'
import { setContractDefaults } from '../utils'

export abstract class SmartContractWithAddress extends SmartContract {
  public address: string
  public contract: Contract

  /**
   * Instantiate the smart contract.
   * @param {string} address Address of the smart contract
   * @param {Web3} web3
   * @param {Config} config Configutation of the smart contract
   * @param {string | number} network Network id or name
   * @param {AbiItem | AbiItem[]} abi ABI of the smart contract
   */
  constructor(
    address: string,
    web3: Web3,
    config?: Config,
    network?: string | number,
    abi?: AbiItem | AbiItem[]
  ) {
    super(web3, config, network, abi)
    this.address = address
    this.contract = setContractDefaults(
      new this.web3.eth.Contract(this.getDefaultAbi(), this.address),
      this.config
    )
  }
}
