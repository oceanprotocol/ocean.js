import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { Contract } from 'web3-eth-contract'
import defaultRouterABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IFactoryRouter.sol/IFactoryRouter.json'
import { LoggerInstance } from '../../utils'
import { TransactionReceipt } from 'web3-eth'

export class PoolFactory {
  public GASLIMIT_DEFAULT = 1000000
  public web3: Web3 = null
  public routerABI: AbiItem | AbiItem[]

  public routerAddress: string

  public router: Contract

  /**
   * Instantiate PoolFactory.
   * @param {String} routerAddress
   * @param {AbiItem | AbiItem[]} routerABI
   * @param {Web3} web3
   */
  constructor(web3: Web3, routerAddress: string, routerABI?: AbiItem | AbiItem[]) {
    this.web3 = web3
    this.routerAddress = routerAddress
    this.routerABI = routerABI || (defaultRouterABI.abi as AbiItem[])
    this.router = new this.web3.eth.Contract(this.routerABI, this.routerAddress)
  }

  public async deployPool(
    account: string,
    tokens: string[],
    weightsInWei: string[],
    swapFeePercentage: number,
    swapMarketFee: number,
    owner: string
  ): Promise<TransactionReceipt> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .deployPool(tokens, weightsInWei, swapFeePercentage, swapMarketFee, owner)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      LoggerInstance.log('Error estimate gas deployPool')
      LoggerInstance.log(e)
      estGas = gasLimitDefault
    }
    return estGas
  }
}
