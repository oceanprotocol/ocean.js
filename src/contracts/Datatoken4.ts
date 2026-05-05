/* eslint-disable lines-between-class-members */
import { Datatoken } from './Datatoken.js'
import { Signer, TransactionRequest } from 'ethers'
import ERC20Template4 from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template4.sol/ERC20Template4.json'
import { AbiItem, ReceiptOrEstimate } from '../@types/index.js'
import { AccessListContract } from './AccessList.js'
import { Config } from '../config/index.js'
import {
  buildTxOverrides,
  buildUnsignedTx,
  sendPreparedTransaction
} from '../utils/ContractUtils.js'

export class Datatoken4 extends Datatoken {
  public accessList: AccessListContract
  public fileObject: Uint8Array
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
    fileObject: Uint8Array,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    super(signer, network, config, abi)
    this.abi = this.getDefaultAbi()
    this.fileObject = fileObject
  }

  public setFileObj(fileObj: Uint8Array): void {
    this.fileObject = fileObj
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
  public async getDenylistContract(dtAddress: string): Promise<string> {
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
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
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
    const estGas = await dtContract.setAllowListContract.estimateGas(address)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.setAllowListContractTx(dtAddress, address, consumer, estGas)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async setAllowListContractTx(
    dtAddress: string,
    address: string,
    consumer: string,
    estimatedGas?: bigint
  ): Promise<TransactionRequest> {
    if (!(await this.isDatatokenDeployer(dtAddress, consumer))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)
    const estGas =
      estimatedGas ?? (await dtContract.setAllowListContract.estimateGas(address))
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(dtContract.setAllowListContract, [address], overrides)
  }

  /** setDenyListContract
   * This function allows to set another address for allowListContract, only by datatoken deployer
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address Contract address
   * @param {String} consumer User address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
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
    const estGas = await dtContract.setDenyListContract.estimateGas(address)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.setDenyListContractTx(dtAddress, address, consumer, estGas)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async setDenyListContractTx(
    dtAddress: string,
    address: string,
    consumer: string,
    estimatedGas?: bigint
  ): Promise<TransactionRequest> {
    if (!(await this.isDatatokenDeployer(dtAddress, consumer))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)
    const estGas =
      estimatedGas ?? (await dtContract.setDenyListContract.estimateGas(address))
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(dtContract.setDenyListContract, [address], overrides)
  }
  /** setFileObject
   * This function allows to set file object in ecnrypted format, only by datatoken deployer
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async setFileObject<G extends boolean = false>(
    dtAddress: string,
    address: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)
    const estGas = await dtContract.setFilesObject.estimateGas(this.fileObject)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const tx = await this.setFileObjectTx(dtAddress, address, estGas)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async setFileObjectTx(
    dtAddress: string,
    address: string,
    estimatedGas?: bigint
  ): Promise<TransactionRequest> {
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)
    const estGas =
      estimatedGas ?? (await dtContract.setFilesObject.estimateGas(this.fileObject))
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(dtContract.setFilesObject, [this.fileObject], overrides)
  }

  /**
   * getFileObject - It returns the consumer's file object encrypted format.
   * @param {String} dtAddress datatoken address
   * @param {Number} serviceIndex - service index
   * @param {String} providerAddress
   * @param {Bytes} providerSignature
   * @param {Bytes} consumerData
   * @param {Bytes} consumerSignature
   * @param {String} consumerAddress
   * @return {Promise<Bytes>} returns file object
   */
  public async getFileObject(
    dtAddress: string,
    serviceIndex: number,
    providerAddress: string,
    providerSignature: Uint8Array,
    consumerData: Uint8Array,
    consumerSignature: Uint8Array,
    consumerAddress: string
  ): Promise<Uint8Array> {
    const dtContract = this.getContract(dtAddress, this.getDefaultAbi())
    const fileObject = await dtContract.getFileObject(
      serviceIndex,
      providerAddress,
      providerSignature,
      consumerData,
      consumerSignature,
      consumerAddress
    )
    return fileObject
  }
}
