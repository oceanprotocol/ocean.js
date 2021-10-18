import { Contract } from 'web3-eth-contract'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import defaultFactory721ABI from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import { Logger, getFairGasPrice, generateDtName } from '../utils'

/**
 * Provides an interface for NFT DataTokens
 */
export class NFTFactory {
  public GASLIMIT_DEFAULT = 1000000
  public factory721Address: string
  public factory721ABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number
  public factory721: Contract

  /**
   * Instantiate DataTokens.
   * @param {String} factory721Address
   * @param {AbiItem | AbiItem[]} factory721ABI
   * @param {Web3} web3
   */
  constructor(
    factory721Address: string,
    web3: Web3,
    logger: Logger,
    factory721ABI?: AbiItem | AbiItem[],
    startBlock?: number
  ) {
    this.factory721Address = factory721Address
    this.factory721ABI = factory721ABI || (defaultFactory721ABI.abi as AbiItem[])
    this.web3 = web3
    this.logger = logger
    this.startBlock = startBlock || 0
    this.factory721 = new this.web3.eth.Contract(
      this.factory721ABI,
      this.factory721Address
    )
  }

  /**
   * Create new NFT
   * @param {String} address
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {Number} templateIndex NFT template index
   * @return {Promise<string>} NFT datatoken address
   */
  public async createNFT(
    address: string,
    name?: string,
    symbol?: string,
    templateIndex?: number
  ): Promise<string> {
    if (!templateIndex) templateIndex = 1
    // Generate name & symbol if not present
    if (!name || !symbol) {
      ;({ name, symbol } = generateDtName())
    }

    // Get estimated gas value
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory721.methods
        .deployERC721Contract(name, symbol, templateIndex, null)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .deployERC721Contract(name, symbol, templateIndex, null)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    let tokenAddress = null
    try {
      tokenAddress = trxReceipt.events.TokenCreated.returnValues[0]
    } catch (e) {
      this.logger.error(`ERROR: Failed to create datatoken : ${e.message}`)
    }
    return tokenAddress
  }
}
