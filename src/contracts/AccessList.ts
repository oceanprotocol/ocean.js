import { Signer, TransactionRequest } from 'ethers'
import AccessList from '@oceanprotocol/contracts/artifacts/contracts/accesslists/AccessList.sol/AccessList.json'
import {
  buildTxOverrides,
  buildUnsignedTx,
  sendPreparedTransaction
} from '../utils/ContractUtils.js'
import { AbiItem, ReceiptOrEstimate } from '../@types/index.js'
import { Config } from '../config/index.js'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'

export class AccessListContract extends SmartContractWithAddress {
  public abiEnterprise: AbiItem[]

  getDefaultAbi() {
    return AccessList.abi as AbiItem[]
  }

  /**
   * Instantiate AccessList class
   * @param {string} address The contract address.
   * @param {Signer} signer The signer object.
   * @param {string | number} [network] Network id or name
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract
   * @param {AbiItem[]} abiEnterprise Enterprise ABI array of the smart contract
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
   * Get Token Uri
   * @return {Promise<string>} Token URI
   */
  public async getTokenUri(tokenId: number): Promise<string> {
    return await this.contract.tokenURI(tokenId)
  }

  /**
   * Get Owner
   * @return {Promise<string>} Owner
   */
  public async getOwner(): Promise<string> {
    return await this.contract.owner()
  }

  /**
   * Get Id
   * @return {Promise<string>} Id
   */
  public async getId(): Promise<number> {
    const id = await this.contract.getId()
    return Number(id)
  }

  /**
   * Get Name of Access list
   * @return {Promise<string>} Name
   */
  public async getName(): Promise<string> {
    return await this.contract.name()
  }

  /**
   * Get Symbol of Access list
   * @return {Promise<string>} Symbol
   */
  public async getSymbol(): Promise<string> {
    return await this.contract.symbol()
  }

  /**
   * Get Address Balance for access list token
   * @param {String} address user adress
   * @return {Promise<String>} balance  Number of datatokens. Will be converted from wei
   */
  public async balance(address: string): Promise<string> {
    const balance = await this.contract.balanceOf(address)
    return await this.unitsToAmount(null, balance, 18)
  }

  /**
   * Add address to access list
   * @param {String} user Minter address
   * @param {String} tokenUri tokenURI
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async mint<G extends boolean = false>(
    user: string,
    tokenUri: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.mint.estimateGas(user, tokenUri)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.mintTx(user, tokenUri, estGas)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async mintTx(
    user: string,
    tokenUri: string,
    estimatedGas?: bigint
  ): Promise<TransactionRequest> {
    const estGas = estimatedGas ?? (await this.contract.mint.estimateGas(user, tokenUri))
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.mint, [user, tokenUri], overrides)
  }

  /**
   * Batch add addresses to the access list
   * @param {String} users Minter addresses
   * @param {String} tokenUris tokenURI
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async batchMint<G extends boolean = false>(
    users: Array<string>,
    tokenUris: Array<string>,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.batchMint.estimateGas(users, tokenUris)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.batchMintTx(users, tokenUris, estGas)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async batchMintTx(
    users: Array<string>,
    tokenUris: Array<string>,
    estimatedGas?: bigint
  ): Promise<TransactionRequest> {
    const estGas =
      estimatedGas ?? (await this.contract.batchMint.estimateGas(users, tokenUris))
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.batchMint, [users, tokenUris], overrides)
  }

  /**
   * Delete address from access list
   * @param {Number} tokenId token ID
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async burn<G extends boolean = false>(
    tokenId: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.burn.estimateGas(tokenId)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.burnTx(tokenId, estGas)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async burnTx(
    tokenId: number,
    estimatedGas?: bigint
  ): Promise<TransactionRequest> {
    const estGas = estimatedGas ?? (await this.contract.burn.estimateGas(tokenId))
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.burn, [tokenId], overrides)
  }

  /**
   * Transfer Ownership of an access list, called by owner of access list
   * @param {Number} newOwner new owner of the access list
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async transferOwnership<G extends boolean = false>(
    newOwner: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.transferOwnership.estimateGas(newOwner)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.transferOwnershipTx(newOwner, estGas)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async transferOwnershipTx(
    newOwner: string,
    estimatedGas?: bigint
  ): Promise<TransactionRequest> {
    const estGas =
      estimatedGas ?? (await this.contract.transferOwnership.estimateGas(newOwner))
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.transferOwnership, [newOwner], overrides)
  }

  /**
   * Renounce Ownership of an access list, called by owner of access list
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async renounceOwnership<G extends boolean = false>(
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.renounceOwnership.estimateGas()
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const tx = await this.renounceOwnershipTx(estGas)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async renounceOwnershipTx(estimatedGas?: bigint): Promise<TransactionRequest> {
    const estGas = estimatedGas ?? (await this.contract.renounceOwnership.estimateGas())
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.renounceOwnership, [], overrides)
  }
}
