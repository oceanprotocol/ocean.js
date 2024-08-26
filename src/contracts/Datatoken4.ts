import { Datatoken } from './Datatoken'
import { Signer } from 'ethers'
import ERC20Template4 from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template4.sol/ERC20Template4.json'
import { AbiItem, ReceiptOrEstimate } from '../@types'
import { AccessListContract } from './AccessList'
import { Config } from '../config'
import { sendTx } from '../utils'

export class Datatoken4 extends Datatoken {
  public accessList: AccessListContract
  getDefaultAbi() {
    return ERC20Template4.abi as AbiItem[]
  }

  /**
   * Instantiate Datatoken class
   * @param {Signer} signer The signer object.
   * @param {string | number} [network] Network id or name
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract
   */
  constructor(
    signer: Signer,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    super(signer, network, config, abi)
    this.accessList = new AccessListContract(this.signer)
  }

  /**
   * getAllowListContract - It returns the current allowList contract address
   * @param dtAddress datatoken address
   * @return {Promise<string>}
   */
  public async getAllowListContract(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
    const allowList = await dtContract.getAllowListContract()
    return allowList
  }

  /**
   * getDenyListContract - It returns the current denyList contract address
   * @param dtAddress datatoken address
   * @return {Promise<string>}
   */
  public async getDenyListContract(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
    const denyList = await dtContract.getDenyListContract()
    return denyList
  }

  /** setAllowListContract
   * This function allows to set another address for allowListContract, only by datatoken deployer
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async setAllowListContract<G extends boolean = false>(
    dtAddress: string,
    address: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)
    const estGas = await dtContract.estimateGas.setAllowListContract(address)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.setAllowListContract,
      address
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /** setDenyListContract
   * This function allows to set another address for allowListContract, only by datatoken deployer
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async setDenyListContract<G extends boolean = false>(
    dtAddress: string,
    address: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)
    const estGas = await dtContract.estimateGas.setDenyListContract(address)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.setDenyListContract,
      address
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
