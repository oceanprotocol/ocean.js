/* eslint-disable lines-between-class-members */
import { Datatoken } from './Datatoken'
import { Bytes, Signer, ethers } from 'ethers'
import ERC20Template4 from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template4.sol/ERC20Template4.json'
import { AbiItem, ReceiptOrEstimate } from '../@types'
import { AccessListContract } from './AccessList'
import { Config } from '../config'
import { sendTx } from '../utils'
import * as sapphire from '@oasisprotocol/sapphire-paratime'

export class Datatoken4 extends Datatoken {
  public accessList: AccessListContract
  public fileObject: Bytes
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
    fileObject: Bytes,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    super(signer, network, config, abi)
    this.accessList = new AccessListContract(this.signer)
    this.abi = this.getDefaultAbi()
    // Wrap signer's address for encrypted data tx
    this.signer = sapphire.wrap(signer)
    this.fileObject = fileObject
  }

  /**
   * getAllowListContract - It returns the current allowList contract address
   * @param dtAddress datatoken address
   * @return {Promise<string>}
   */
  public async getAllowlistContract(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress, this.getDefaultAbi())
    const allowList = await dtContract.getAllowListContract()
    return allowList
  }

  /**
   * getDenyListContract - It returns the current denyList contract address
   * @param dtAddress datatoken address
   * @return {Promise<string>}
   */
  public async getDenyListContract(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress, this.getDefaultAbi())
    const denyList = await dtContract.getDenyListContract()
    return denyList
  }

  /** setAllowListContract
   * This function allows to set another address for allowListContract, only by datatoken deployer
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address Contract address
   * @param {String} consumer User address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async setAllowListContract<G extends boolean = false>(
    dtAddress: string,
    address: string,
    consumer: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if (!(await this.isDatatokenDeployer(dtAddress, consumer))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)
    const estGas = await dtContract.estimateGas.setAllowListContract(address)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.functions.setAllowListContract,
      address
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /** setDenyListContract
   * This function allows to set another address for allowListContract, only by datatoken deployer
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address Contract address
   * @param {String} consumer User address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async setDenyListContract<G extends boolean = false>(
    dtAddress: string,
    address: string,
    consumer: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if (!(await this.isDatatokenDeployer(dtAddress, consumer))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)
    const estGas = await dtContract.estimateGas.setDenyListContract(address)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.functions.setDenyListContract,
      address
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }
  /** setFileObject
   * This function allows to set file object in ecnrypted format, only by datatoken deployer
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async setFileObject<G extends boolean = false>(
    dtAddress: string,
    address: string,
    fileObject: Bytes,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)
    const estGas = await dtContract.estimateGas.setFilesObject(fileObject)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.functions.setFilesObject,
      fileObject
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
