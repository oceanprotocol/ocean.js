import { AbiItem } from 'web3-utils'
import veFeeEstimate from '@oceanprotocol/contracts/artifacts/contracts/ve/veFeeEstimate.vy/veFeeEstimate.json'
import { SmartContractWithAddress } from '../SmartContractWithAddress'
import { VeOcean } from './VeOcean'
/**
 * Provides an interface for veOcean contract
 */
export class VeFeeEstimate extends SmartContractWithAddress {
  getDefaultAbi(): AbiItem | AbiItem[] {
    return veFeeEstimate.abi as AbiItem[]
  }

  /**
   * estimateClaim
   * @param {String} userAddress user address
   * @return {Promise<string>}
   */
  public async estimateClaim(userAddress: string): Promise<string> {
    const amount = await this.contract.methods.estimateClaim(userAddress).call()
    const veOcean = new VeOcean(
      await this.contract.methods.voting_escrow().call(),
      this.web3
    )
    const amountFormated = await this.unitsToAmount(await veOcean.getToken(), amount)
    return amountFormated
  }
}
