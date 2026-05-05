import { BigNumberish, Signer, TransactionRequest } from 'ethers'
import { Config } from '../config/index.js'
import AccessListFactory from '@oceanprotocol/contracts/artifacts/contracts/accesslists/AccessListFactory.sol/AccessListFactory.json'
import {
  buildTxOverrides,
  buildUnsignedTx,
  sendPreparedTransaction,
  getEventFromTx
} from '../utils/ContractUtils.js'
import { ZERO_ADDRESS } from '../utils/Constants.js'
import { AbiItem, ReceiptOrEstimate } from '../@types/index.js'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'
import { generateDtName } from '../utils/DatatokenName.js'

/**
 * Provides an interface for Access List Factory contract
 */
export class AccesslistFactory extends SmartContractWithAddress {
  getDefaultAbi() {
    return AccessListFactory.abi as AbiItem[]
  }

  /**
   * Instantiate AccessListFactory class
   * @param {string} address The factory contract address.
   * @param {Signer} signer The signer object.
   * @param {string | number} [network] Network id or name
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract
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
   * Create new Access List Contract
   * @param {string} nameAccessList The name for access list.
   * @param {string} symbolAccessList The symbol for access list.
   * @param {string[]} tokenURI Token URIs list.
   * @param {boolean} transferable Default false, to be soulbound.
   * @param {string} owner Owner of the access list.
   * @param {string[]} user Users of the access lists as addresses.
   * @param {Boolean} [estimateGas] if True, return gas estimate
   * @return {Promise<string|BigNumber>} Deployed contract address
   */
  public async deployAccessListContract<G extends boolean = false>(
    nameAccessList: string,
    symbolAccessList: string,
    tokenURI: string[],
    transferable: boolean = false,
    owner: string,
    user: string[],
    estimateGas?: G
  ): Promise<G extends false ? string : BigNumberish> {
    const normalized = this.normalizeDeployAccessListInput(
      nameAccessList,
      symbolAccessList,
      tokenURI,
      transferable,
      owner,
      user
    )
    const estGas = await this.contract.deployAccessListContract.estimateGas(
      normalized.nameAccessList,
      normalized.symbolAccessList,
      normalized.transferable,
      normalized.owner,
      normalized.user,
      normalized.tokenURI
    )
    if (estimateGas) return <G extends false ? string : BigNumberish>estGas
    // Invoke createToken function of the contract
    try {
      const txReq = await this.deployAccessListContractTx(
        nameAccessList,
        symbolAccessList,
        tokenURI,
        transferable,
        owner,
        user
      )
      const tx = await sendPreparedTransaction(this.getSignerAccordingSdk(), txReq)
      if (!tx) {
        const e = 'Tx for deploying new access list was not processed on chain.'
        console.error(e)
        throw e
      }
      const trxReceipt = await tx.wait()
      const events = getEventFromTx(trxReceipt, 'NewAccessList')
      return events.args[0]
    } catch (e) {
      console.error(`Creation of AccessList failed: ${e}`)
    }
  }

  public async deployAccessListContractTx(
    nameAccessList: string,
    symbolAccessList: string,
    tokenURI: string[],
    transferable: boolean = false,
    owner: string,
    user: string[]
  ): Promise<TransactionRequest> {
    const normalized = this.normalizeDeployAccessListInput(
      nameAccessList,
      symbolAccessList,
      tokenURI,
      transferable,
      owner,
      user
    )
    const estGas = await this.contract.deployAccessListContract.estimateGas(
      normalized.nameAccessList,
      normalized.symbolAccessList,
      normalized.transferable,
      normalized.owner,
      normalized.user,
      normalized.tokenURI
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.deployAccessListContract,
      [
        normalized.nameAccessList,
        normalized.symbolAccessList,
        normalized.transferable,
        normalized.owner,
        normalized.user,
        normalized.tokenURI
      ],
      overrides
    )
  }

  /**
   *  Get Factory Owner
   * @return {Promise<string>} Factory Owner address
   */
  public async getOwner(): Promise<string> {
    const owner = await this.contract.owner()
    return owner
  }

  /**
   *  Is a list contract soul bound?
   * @param {String} contractAddress list contract address
   * @return {Promise<boolean>} is soulbound?
   */
  public async isSoulbound(contractAddress: string): Promise<boolean> {
    const isSoulbound = await this.contract.isSoulBound(contractAddress)
    return isSoulbound
  }

  /**
   *  Is a list contract deployed?
   * @param {String} contractAddress list contract address
   * @return {Promise<boolean>} is deployed?
   */
  public async isDeployed(contractAddress: string): Promise<boolean> {
    const isDeployed = await this.contract.isDeployed(contractAddress)
    return isDeployed
  }

  /**
   * changeTemplateAddress - only factory Owner
   * @param {String} owner caller address
   * @param {Number} templateAddress address of the template we want to change
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value, current token template count
   */
  public async changeTemplateAddress<G extends boolean = false>(
    owner: string,
    templateAddress: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.getOwner()) !== owner) {
      throw new Error(`Caller is not Factory Owner`)
    }

    if (templateAddress === ZERO_ADDRESS) {
      throw new Error(`Template address cannot be ZERO address`)
    }

    const estGas = await this.contract.changeTemplateAddress.estimateGas(templateAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const txReq = await this.changeTemplateAddressTx(owner, templateAddress)
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), txReq)

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async changeTemplateAddressTx(
    owner: string,
    templateAddress: string
  ): Promise<TransactionRequest> {
    if ((await this.getOwner()) !== owner) {
      throw new Error(`Caller is not Factory Owner`)
    }

    if (templateAddress === ZERO_ADDRESS) {
      throw new Error(`Template address cannot be ZERO address`)
    }

    const estGas = await this.contract.changeTemplateAddress.estimateGas(templateAddress)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.changeTemplateAddress,
      [templateAddress],
      overrides
    )
  }

  private normalizeDeployAccessListInput(
    nameAccessList: string,
    symbolAccessList: string,
    tokenURI: string[],
    transferable: boolean,
    owner: string,
    user: string[]
  ) {
    let normalizedName = nameAccessList
    let normalizedSymbol = symbolAccessList
    if (!normalizedName || !normalizedSymbol) {
      const { name, symbol } = generateDtName()
      normalizedName = name
      normalizedSymbol = symbol
    }
    return {
      nameAccessList: normalizedName,
      symbolAccessList: normalizedSymbol,
      tokenURI,
      transferable,
      owner,
      user
    }
  }
}
