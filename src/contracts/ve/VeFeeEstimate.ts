// import { AbiItem } from 'web3-utils'
import { ethers, InterfaceAbi, Interface } from 'ethers'
import veFeeEstimate from '@oceanprotocol/contracts/artifacts/contracts/ve/veFeeEstimate.vy/veFeeEstimate.json'
import { SmartContractWithAddress } from '../SmartContractWithAddress'
import { VeOcean } from './VeOcean'
/**
 * Provides an interface for veOcean contract
 */
export class VeFeeEstimate extends SmartContractWithAddress {
  getDefaultAbi() {
    return veFeeEstimate.abi
  }

  /**
   * estimateClaim
   * @param {String} userAddress user address
   * @return {Promise<string>}
   */
  public async estimateClaim(userAddress: string): Promise<string> {
    const amount = await this.contract.estimateClaim(userAddress)
    const veOcean = new VeOcean(await this.contract.voting_escrow(), this.signer)
    const amountFormated = await this.unitsToAmount(await veOcean.getToken(), amount)
    return amountFormated
  }
}
