/* eslint-disable lines-between-class-members */
import { Datatoken } from './Datatoken'
import { Bytes, Signer } from 'ethers'
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
      dtContract.setAllowListContract,
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
      dtContract.setDenyListContract,
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
    const estGas = await dtContract.estimateGas.setFileObject(fileObject)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.setFileObject,
      fileObject
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /** addConsumer
   * This function allows to add consumer
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} consumer User address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async addConsumer<G extends boolean = false>(
    dtAddress: string,
    consumer: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)
    const estGas = await dtContract.estimateGas.addConsumer(consumer)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.addConsumer,
      consumer
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /** checkConsumer
   * This function allows to add consumer
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {Number} serviceId Service Identifier
   * @param {String} consumer User address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async checkConsumer<G extends boolean = false>(
    dtAddress: string,
    serviceId: number,
    consumer: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)
    const estGas = await dtContract.estimateGas.checkConsumer(serviceId, consumer)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.checkConsumer,
      serviceId,
      consumer
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * getFileObject - It returns the consumer's file object encrypted format.
   * @param {String} dtAddress datatoken address
   * @param {Number} serviceId - service identifier
   * @param {String} providerAddress
   * @param {Bytes} providerSignature
   * @param {Bytes} consumerData
   * @param {Bytes} consumerSignature
   * @param {String} consumerAddress
   * @return {Promise<string>}
   */
  public async getFileObject(
    dtAddress: string,
    serviceId: number,
    providerAddress: string,
    providerSignature: Bytes,
    consumerData: Bytes,
    consumerSignature: Bytes,
    consumerAddress: string
  ): Promise<Bytes> {
    const dtContract = this.getContract(dtAddress)
    const fileObject = await dtContract.getFileObject(
      serviceId,
      providerAddress,
      providerSignature,
      consumerData,
      consumerSignature,
      consumerAddress
    )
    return fileObject
  }
}
