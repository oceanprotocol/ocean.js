import { Signer } from 'ethers'
import AccessList from '@oceanprotocol/contracts/artifacts/contracts/accesslists/AccessList.sol/AccessList.json'
import { sendTx } from '../utils'
import { AbiItem, ReceiptOrEstimate } from '../@types'
import { Config } from '../config'
import { SmartContract } from './SmartContract'
import * as sapphire from '@oasisprotocol/sapphire-paratime'

export class AccessListContract extends SmartContract {
  public abiEnterprise: AbiItem[]

  getDefaultAbi() {
    return AccessList.abi as AbiItem[]
  }

  /**
   * Instantiate AccessList class
   * @param {Signer} signer The signer object.
   * @param {string | number} [network] Network id or name
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract
   * @param {AbiItem[]} abiEnterprise Enterprise ABI array of the smart contract
   */
  constructor(
    signer: Signer,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    super(signer, network, config, abi)
    this.signer = sapphire.wrap(signer)
    this.abi = abi || this.getDefaultAbi()
  }

  /**
   * Get Token Uri
   * @return {Promise<string>} Token URI
   */
  public async getTokenUri(accessListAddress: string): Promise<string> {
    const accessListContract = this.getContract(accessListAddress)
    return await accessListContract.tokenURI()
  }

  /**
   * Mint ERC721 contract
   * @param {String} accessListAddress AccessList contract address
   * @param {String} user Minter address
   * @param {String} tokenUri tokenURI
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async mint<G extends boolean = false>(
    accessListAddress: string,
    user: string,
    tokenUri: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const accessListContract = this.getContract(accessListAddress)
    const estGas = await accessListContract.estimateGas.mint(user, tokenUri)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      accessListContract.functions.mint,
      user,
      tokenUri
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Batch Mint ERC721 contract
   * @param {String} accessListAddress AccessList contract address
   * @param {String} users Minter addresses
   * @param {String} tokenUris tokenURI
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async batchMint<G extends boolean = false>(
    accessListAddress: string,
    users: Array<string>,
    tokenUris: Array<string>,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const accessListContract = this.getContract(accessListAddress)
    const estGas = await accessListContract.estimateGas.batchMint(users, tokenUris)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      accessListContract.functions.batchMint,
      users,
      tokenUris
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async burn<G extends boolean = false>(
    accessListAddress: string,
    tokenId: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const accessListContract = this.getContract(accessListAddress)
    const estGas = await accessListContract.estimateGas.burn(tokenId)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      accessListContract.functions.burn,
      tokenId
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
