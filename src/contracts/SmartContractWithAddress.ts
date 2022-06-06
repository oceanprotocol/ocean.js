import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import { Config } from '../config'
import { setContractDefaults } from '../utils'
import { SmartContract } from '.'

export abstract class SmartContractWithAddress extends SmartContract {
  public address: string
  public contract: Contract

  /**
   * Instantiate the smart contract.
   * @param {string} address Address of the smart contract
   * @param {Web3} web3
   * @param {string | number} network Network id or name
   * @param {Config} config Configutation of the smart contract
   * @param {AbiItem | AbiItem[]} abi ABI of the smart contract
   */
  constructor(
    address: string,
    web3: Web3,
    network?: string | number,
    config?: Config,
    abi?: AbiItem | AbiItem[]
  ) {
    super(web3, network, config, abi)
    this.address = address
    this.contract = setContractDefaults(
      new this.web3.eth.Contract(this.getDefaultAbi(), this.address),
      this.config
    )
  }
}
