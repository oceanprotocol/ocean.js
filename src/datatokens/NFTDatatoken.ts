import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import defaultNFTDatatokenABI from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import { Logger, getFairGasPrice, generateDtName } from '../utils'

/**
 * ERC721 ROLES
 */
interface Roles {
  manager: boolean
  deployERC20: boolean
  updateMetadata: boolean
  store: boolean
}

export class NFTDataToken {
  public GASLIMIT_DEFAULT = 1000000
  public factory721Address: string
  public factory721ABI: AbiItem | AbiItem[]
  public nftDatatokenABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number

  constructor(
    web3: Web3,
    logger: Logger,
    nftDatatokenABI?: AbiItem | AbiItem[],
    startBlock?: number
  ) {
    this.nftDatatokenABI = nftDatatokenABI || (defaultNFTDatatokenABI.abi as AbiItem[])
    this.web3 = web3
    this.logger = logger
    this.startBlock = startBlock || 0
  }

  /**
   * Create new ERC20 datatoken - only user with ERC20Deployer permission can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} minter User set as initial minter for the ERC20
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {Number} templateIndex NFT template index
   * @return {Promise<string>} ERC20 datatoken address
   */
  public async createERC20(
    nftAddress: string,
    address: string,
    minter: string,
    cap: string,
    name?: string,
    symbol?: string,
    templateIndex?: number
  ): Promise<string> {
    if (!templateIndex) templateIndex = 1

    // Generate name & symbol if not present
    if (!name || !symbol) {
      ;({ name, symbol } = generateDtName())
    }

    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)

    // Estimate gas for ERC20 token creation
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .createERC20(
          templateIndex,
          [name, symbol],
          [minter],
          [this.web3.utils.toWei(cap)],
          null
        )
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createERC20 token function of the contract
    const trxReceipt = await contract721.methods
      .createERC20(
        templateIndex,
        [name, symbol],
        [minter],
        [this.web3.utils.toWei(cap)],
        null
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    let tokenAddress = null
    try {
      tokenAddress = trxReceipt.events.ERC20Created.returnValues[0]
    } catch (e) {
      this.logger.error(`ERROR: Failed to create datatoken : ${e.message}`)
    }
    return tokenAddress
  }
}
