import { BigNumber, Signer } from 'ethers'
import { Config } from '../config'
import AccessListFactory from '@oceanprotocol/contracts/artifacts/contracts/accesslists/AccessListFactory.sol/AccessListFactory.json'
import { generateDtName, sendTx, getEventFromTx, ZERO_ADDRESS } from '../utils'
import { AbiItem, ReceiptOrEstimate } from '../@types'
import { SmartContractWithAddress } from './SmartContractWithAddress'

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
   * @param {AccessListData} listData The data needed to create an NFT.
   * @param {Boolean} [estimateGas] if True, return gas estimate
   * @return {Promise<string|BigNumber>} The transaction hash or the gas estimate.
   */
  public async deployAccessListContract<G extends boolean = false>(
    nameAccessList: string,
    symbolAccessList: string,
    tokenURI: string[],
    transferable: boolean = false,
    owner: string,
    user: string[],
    estimateGas?: G
  ): Promise<G extends false ? string : BigNumber> {
    if (!nameAccessList || !symbolAccessList) {
      const { name, symbol } = generateDtName()
      nameAccessList = name
      symbolAccessList = symbol
    }
    const estGas = await this.contract.estimateGas.deployAccessListContract(
      nameAccessList,
      symbolAccessList,
      transferable,
      owner,
      user,
      tokenURI
    )
    if (estimateGas) return <G extends false ? string : BigNumber>estGas
    // Invoke createToken function of the contract
    const tx = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.deployAccessListContract,
      nameAccessList,
      symbolAccessList,
      transferable,
      owner,
      user,
      tokenURI
    )
    const trxReceipt = await tx.wait()
    const events = getEventFromTx(trxReceipt, 'NewAccessList')
    return events.args[0]
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
   * @return {Promise<ReceiptOrEstimate>} current token template count
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

    const estGas = await this.contract.estimateGas.changeTemplateAddress(templateAddress)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.functions.changeTemplateAddress,
      templateAddress
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }
}