import veFeeEstimate from '@oceanprotocol/contracts/artifacts/contracts/ve/veFeeEstimate.vy/veFeeEstimate.json'
import { SmartContractWithAddress } from '../SmartContractWithAddress.js'
import { VeOcean } from './VeOcean.js'
import { AbiItem } from '../../@types/index.js'
/**
 * Provides an interface for veOcean contract
 */
export class VeFeeEstimate extends SmartContractWithAddress {
  getDefaultAbi() {
    return veFeeEstimate.abi as AbiItem[]
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
