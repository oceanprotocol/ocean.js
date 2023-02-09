// import Web3 from 'web3'
// import { Contract } from 'web3-eth-contract'
// import { AbiItem } from 'web3-utils'

import { Signer, InterfaceAbi, Contract } from 'ethers'
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
   * @param {InterfaceAbi} abi ABI of the smart contract
   */
  constructor(
    address: string,
    signer: Signer,
    network?: string | number,
    config?: Config,
    abi?: InterfaceAbi
  ) {
    super(signer, network, config, abi)
    this.address = address
    this.contract = this.getContract(this.address)
  }
}
