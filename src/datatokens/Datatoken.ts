import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import defaultDatatokensABI from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Decimal from 'decimal.js'
import { Logger, getFairGasPrice } from '../utils'

/**
 * ERC20 ROLES
 */
interface Roles {
  minter: boolean
  feeManager: boolean
}

export class Datatoken {
  public GASLIMIT_DEFAULT = 1000000
  public factoryAddress: string
  public factoryABI: AbiItem | AbiItem[]
  public datatokensABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number

  /**
   * Instantiate ERC20 DataTokens (independently of Ocean).
   * @param {AbiItem | AbiItem[]} datatokensABI
   * @param {Web3} web3
   */
  constructor(
    web3: Web3,
    logger: Logger,
    datatokensABI?: AbiItem | AbiItem[],
    startBlock?: number
  ) {
    this.web3 = web3
    this.logger = logger
    this.datatokensABI = datatokensABI || (defaultDatatokensABI.abi as AbiItem[])
    this.startBlock = startBlock || 0
  }

  /**
   * Mint
   * @param {String} dataTokenAddress
   * @param {String} address
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} toAddress   - only if toAddress is different from the minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async mint(
    dataTokenAddress: string,
    address: string,
    amount: string,
    toAddress?: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)

    if ((await this.getDTPermissions(dataTokenAddress, address)).minter != true) {
      throw new Error(`Caller is not Minter`)
    }

    const capAvailble = await this.getCap(dataTokenAddress)
    if (new Decimal(capAvailble).gte(amount)) {
      // Estimate gas cost for mint method
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      let estGas
      try {
        estGas = await dtContract.methods
          .mint(toAddress || address, this.web3.utils.toWei(amount))
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }

      // Call mint contract method
      const trxReceipt = await dtContract.methods
        .mint(toAddress || address, this.web3.utils.toWei(amount))
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } else {
      throw new Error(`Mint amount exceeds cap available`)
    }
  }

  /** Returns ERC20 user's permissions for a datatoken
   * @param {String} dtAddress Datatoken adress
   * @param {String} address user adress
   * @return {Promise<Roles>}
   */
  public async getDTPermissions(dtAddress: string, address: string): Promise<Roles> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)
    const roles = await dtContract.methods.permissions(address).call()
    return roles
  }

  /** Returns the DataToken capital
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<string>}
   */
  public async getCap(dtAddress: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dtAddress)
    const cap = await datatoken.methods.cap().call()
    return this.web3.utils.fromWei(cap)
  }
}
