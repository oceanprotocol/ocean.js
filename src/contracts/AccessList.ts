import { Signer } from 'ethers'
import AccessList from '@oceanprotocol/contracts/artifacts/contracts/accesslists/AccessList.sol/AccessList.json'
import {
  sendTx,
  SAPPHIRE_MAINNET_NETWORK_ID,
  SAPPHIRE_TESTNET_NETWORK_ID
} from '../utils'
import { AbiItem, ReceiptOrEstimate } from '../@types'
import { Config } from '../config'
import { SmartContractWithAddress } from './SmartContractWithAddress'
import * as sapphire from '@oasisprotocol/sapphire-paratime'

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
    return await this.contract.getId()
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
    const estGas = await this.contract.estimateGas.mint(user, tokenUri)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const { chainId } = await this.contract.provider.getNetwork()
    const trxReceipt = await sendTx(
      estGas,
      this.config.confidentialEVM === true &&
        [SAPPHIRE_MAINNET_NETWORK_ID, SAPPHIRE_TESTNET_NETWORK_ID].includes(chainId)
        ? sapphire.wrap(this.signer)
        : this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.mint,
      user,
      tokenUri
    )
    return <ReceiptOrEstimate<G>>trxReceipt
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
    const estGas = await this.contract.estimateGas.batchMint(users, tokenUris)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const { chainId } = await this.contract.provider.getNetwork()
    const trxReceipt = await sendTx(
      estGas,
      this.config.confidentialEVM === true &&
        [SAPPHIRE_MAINNET_NETWORK_ID, SAPPHIRE_TESTNET_NETWORK_ID].includes(chainId)
        ? sapphire.wrap(this.signer)
        : this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.batchMint,
      users,
      tokenUris
    )
    return <ReceiptOrEstimate<G>>trxReceipt
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
    const estGas = await this.contract.estimateGas.burn(tokenId)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const { chainId } = await this.contract.provider.getNetwork()
    const trxReceipt = await sendTx(
      estGas,
      this.config.confidentialEVM === true &&
        [SAPPHIRE_MAINNET_NETWORK_ID, SAPPHIRE_TESTNET_NETWORK_ID].includes(chainId)
        ? sapphire.wrap(this.signer)
        : this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.burn,
      tokenId
    )
    return <ReceiptOrEstimate<G>>trxReceipt
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
    const estGas = await this.contract.estimateGas.transferOwnership(newOwner)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const { chainId } = await this.contract.provider.getNetwork()
    const trxReceipt = await sendTx(
      estGas,
      this.config.confidentialEVM === true &&
        [SAPPHIRE_MAINNET_NETWORK_ID, SAPPHIRE_TESTNET_NETWORK_ID].includes(chainId)
        ? sapphire.wrap(this.signer)
        : this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.transferOwnership,
      newOwner
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Renounce Ownership of an access list, called by owner of access list
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async renounceOwnership<G extends boolean = false>(
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.estimateGas.renounceOwnership()
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const { chainId } = await this.contract.provider.getNetwork()
    const trxReceipt = await sendTx(
      estGas,
      this.config.confidentialEVM === true &&
        [SAPPHIRE_MAINNET_NETWORK_ID, SAPPHIRE_TESTNET_NETWORK_ID].includes(chainId)
        ? sapphire.wrap(this.signer)
        : this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.renounceOwnership
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
