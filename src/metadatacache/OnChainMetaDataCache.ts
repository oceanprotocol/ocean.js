import { DDO } from '../ddo/DDO'
import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'
import Web3 from 'web3'
import defaultDDOContractABI from '@oceanprotocol/contracts/artifacts/Metadata.json'
import { didZeroX } from '../utils'

// Using limited, compress-only version
// See https://github.com/LZMA-JS/LZMA-JS#but-i-dont-want-to-use-web-workers
import { LZMA } from 'lzma/src/lzma-c'

/**
 * Provides an interface with Metadata Cache.
 * Metadata Cache provides an off-chain database store for metadata about data assets.
 */
export class OnChainMetadataCache {
  public DDOContractAddress: string
  public DDOContractABI: AbiItem | AbiItem[]
  public web3: Web3
  public DDOContract: Contract = null
  /**
   * Instantiate OnChainMetadata Store for on-chain interaction.
   */
  constructor(
    web3: Web3,
    DDOContractAddress: string = null,
    DDOContractABI: AbiItem | AbiItem[] = null
  ) {
    this.web3 = web3
    this.DDOContractAddress = DDOContractAddress
    this.DDOContractABI = DDOContractABI || (defaultDDOContractABI.abi as AbiItem[])
    if (web3)
      this.DDOContract = new this.web3.eth.Contract(
        this.DDOContractABI,
        this.DDOContractAddress
      )
  }

  /**
   * Compress DDO using xz/lzma2
   */

  public async compressDDO(ddo: DDO): Promise<string> {
    const data = DDO.serialize(ddo)
    // see https://github.com/LZMA-JS/LZMA-JS/issues/44
    LZMA.disableEndMark = true
    const compressed = LZMA.compress(data, 9)
    return this.getHex(compressed)
  }

  /**
   * Publish a new DDO
   * @param {String} did
   * @param {DDO} ddo
   * @param {String} consumerAccount
   * @return {Promise<TransactionReceipt>} exchangeId
   */
  public async publish(
    did: string,
    ddo: DDO,
    consumerAccount: string
  ): Promise<TransactionReceipt> {
    let flags = 0
    const compressed = await this.compressDDO(ddo)
    flags = flags | 1
    return this.publishRaw(didZeroX(did), flags, compressed, consumerAccount)
  }

  /**
   * Update DDO
   * @param {String} did
   * @param {DDO} ddo
   * @param {String} consumerAccount
   * @return {Promise<TransactionReceipt>} exchangeId
   */
  public async update(
    did: string,
    ddo: DDO,
    consumerAccount: string
  ): Promise<TransactionReceipt> {
    let flags = 0
    const compressed = await this.compressDDO(ddo)
    flags = flags | 1
    return this.updateRaw(didZeroX(did), flags, compressed, consumerAccount)
  }

  /**
   * Raw publish ddo
   * @param {String} did
   * @param {Any} flags
   * @param {Any} ddo
   * @param {String} consumerAccount
   * @return {Promise<TransactionReceipt>} exchangeId
   */
  public async publishRaw(
    did: string,
    flags: any,
    data: any,
    consumerAccount: string
  ): Promise<TransactionReceipt> {
    if (!this.DDOContract) {
      console.error('ERROR: Missing DDOContract')
      return null
    }
    try {
      /* const estGas = await this.DDOContract.methods
        .create(didZeroX(did), flags, data)
        .estimateGas(function (err, estGas) {
          if (err) console.error('ERROR: OnChainMetadataCacheEstimateGas: ' + err)
          return estGas
        })
      */
      const trxReceipt = await this.DDOContract.methods
        .create(didZeroX(did), flags, data)
        .send({ from: consumerAccount })
      return trxReceipt
    } catch (e) {
      console.error(`ERROR: Failed to publish raw DDO : ${e.message}`)
      return null
    }
  }

  /**
   * Raw update of a ddo
   * @param {String} did
   * @param {Any} flags
   * @param {Any} ddo
   * @param {String} consumerAccount
   * @return {Promise<TransactionReceipt>} exchangeId
   */
  public async updateRaw(
    did: string,
    flags: any,
    data: any,
    consumerAccount: string
  ): Promise<TransactionReceipt> {
    if (!this.DDOContract) {
      console.error('ERROR: Missing DDOContract')
      return null
    }
    try {
      const trxReceipt = await this.DDOContract.methods
        .update(didZeroX(did), flags, data)
        .send({ from: consumerAccount })
      return trxReceipt
    } catch (e) {
      console.error(`ERROR: Failed to update raw DDO : ${e.message}`)
      return null
    }
  }

  /**
   * Transfer Ownership of a DDO
   * @param {String} did
   * @param {String} newOwner
   * @param {String} consumerAccount
   * @return {Promise<TransactionReceipt>} exchangeId
   */
  public async transferOwnership(
    did: string,
    newOwner: string,
    consumerAccount: string
  ): Promise<TransactionReceipt> {
    if (!this.DDOContract) return null
    try {
      const trxReceipt = await this.DDOContract.methods
        .transferOwnership(didZeroX(did), newOwner)
        .send({
          from: consumerAccount
        })
      return trxReceipt
    } catch (e) {
      console.error(`ERROR: Failed to transfer DDO ownership : ${e.message}`)
      return null
    }
  }

  public getHex(message: any) {
    const hexChar = [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'A',
      'B',
      'C',
      'D',
      'E',
      'F'
    ]
    let hex = ''
    try {
      for (let i = 0; i < message.length; i++) {
        hex += '' + hexChar[(message[i] >> 4) & 0x0f] + hexChar[message[i] & 0x0f]
      }
    } catch (e) {
      console.error(`ERROR: Failed to get hex message value : ${e.message}`)
    }
    const hexMessage = '0x' + hex
    return hexMessage
  }
}
