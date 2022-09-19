import { AbiItem } from 'web3-utils'
export interface UrlFile {
  type: 'url'

  /**
   * File index.
   * @type {number}
   */
  index?: number

  /**
   * File URL.
   * @type {string}
   */
  url: string

  /**
   * HTTP method used
   * @type {string}
   */
  method: string
}

export interface GraphqlQuery {
  type: 'graphql'

  /**
   * @type {number}
   */
  index?: number

  /**
   * Endpoint URL
   * @type {string}
   */
  url: string

  /**
   * query
   * @type {string}
   */
  query: string
}

export interface Arweave {
  type: 'arweave'

  /**
   * transactionId
   * @type {string}
   */
  transactionId: string
}

export interface Ipfs {
  type: 'ipfs'

  /**
   * hash
   * @type {string}
   */
  hash: string
}

export interface Smartcontract {
  type: 'smartcontract'

  /**
   * Smartcontract address
   * @type {string}
   */
  address: string

  /**
   * ChainId
   * @type {number}
   */
  chainId: number

  /**
   * Function ABI (not the entire smartcontract abi)
   * @type {AbiItem}
   */
  abi: AbiItem
}

export interface Files {
  nftAddress: string
  datatokenAddress: string
  files: UrlFile[] | GraphqlQuery[] | Arweave[] | Smartcontract[] | Ipfs[]
}
