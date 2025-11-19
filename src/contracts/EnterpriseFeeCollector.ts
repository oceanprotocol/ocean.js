import { Signer } from 'ethers'
import ContractABI from '@oceanprotocol/contracts/artifacts/contracts/communityFee/EnterpriseFeeCollector.sol/EnterpriseFeeCollector.json'
import { AbiItem } from '../@types'
import { Config } from '../config'
import { SmartContractWithAddress } from './SmartContractWithAddress'

export class EnterpriseFeeCollectorContract extends SmartContractWithAddress {
  getDefaultAbi() {
    return ContractABI.abi as AbiItem[]
  }

  /**
   * Instantiate EnterpriseFeeCollectorContract class
   * @param {string} address The contract address.
   * @param {Signer} signer The signer object.
   * @param {string | number} [network] Network id or name
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract
   */
  constructor(
    address: string,
    signer: Signer,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    super(address, signer, network, config, abi)
    this.abi = abi || this.getDefaultAbi()
  }

  /**
   * Check if token is allowed
   * @return {Promise<any>} Boolean indicating if token is allowed
   */
  public async isTokenAllowed(token: string): Promise<boolean> {
    return await this.contract.isTokenAllowed(token)
  }

  /**
   * Get Token details
   * @return {Promise<any>} Token details
   */
  public async getToken(token: string): Promise<any> {
    return await this.contract.getToken(token)
  }

  /**
   * Calculate fee
   * @param {string} token Token address
   * @param {string} amount Amount
   * @return {Promise<string>} Fee amount
   */
  public async calculateFee(token: string, amount: number): Promise<any> {
    const weiAmount = this.amountToUnits(token, amount.toString())
    const amountWithFee = await this.contract.calculateFee(token, weiAmount)
    return this.unitsToAmount(token, amountWithFee)
  }
}
