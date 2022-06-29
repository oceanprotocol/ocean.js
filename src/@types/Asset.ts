import { DDO } from './DDO/DDO'

export interface AssetNft {
  /**
   * Contract address of the deployed ERC721 NFT contract.
   * @type {string}
   */
  address: string

  /**
   * Name of NFT set in contract.
   * @type {string}
   */
  name: string

  /**
   * Symbol of NFT set in contract.
   * @type {string}
   */
  symbol: string

  /**
   * ETH account address of the NFT owner.
   * @type {string}
   */
  owner: string

  /**
   * State of the asset reflecting the NFT contract value.
   * 0	Active.
   * 1	End-of-life.
   * 2	Deprecated (by another asset).
   * 3	Revoked by publisher.
   * 4	Ordering is temporary disabled.
   * @type {number}
   */
  state: 0 | 1 | 2 | 3 | 4

  /**
   * Contains the date of NFT creation.
   * @type {string}
   */
  created: string

  /**
   * NFT token URI.
   * @type {string}
   */
  tokenURI: string
}

export interface Purgatory {
  /**
   * If `true`, asset is in purgatory.
   * @type {boolean}
   */
  state: boolean

  /**
   * If asset is in purgatory, contains the reason for being there as defined in `list-purgatory`.
   * @type {string}
   */
  reason: string
}

export interface AssetDatatoken {
  /**
   * Contract address of the deployed ERC20 contract.
   * @type {string}
   */
  address: string

  /**
   * Name of NFT set in contract.
   * @type {string}
   */
  name: string

  /**
   * Symbol of NFT set in contract.
   * @type {string}
   */
  symbol: string

  /**
   * ID of the service the datatoken is attached to.
   * @type {string}
   */
  serviceId: string
}

export interface AssetLastEvent {
  tx: string
  block: number
  from: string
  contract: string
  datetime: string
}

export interface Asset extends DDO {
  /**
   * Contains information about the ERC721 NFT contract which represents the intellectual property of the publisher.
   * @type {string}
   */
  nft: AssetNft

  /**
   * Contains information about the ERC20 datatokens attached to asset services.
   * @type {string}
   */
  datatokens: AssetDatatoken[]

  /**
   * Contains information about the last transaction that created or updated the DDO.
   * @type {string}
   */
  event: AssetLastEvent

  /**
   * The stats section contains different statistics fields.
   * @type {string}
   */
  stats: {
    /**
     * How often an asset was consumed, meaning how often it was either downloaded or used as part of a compute job.
     * @type {string}
     */
    orders: number
  }

  /**
   * Contains information about an asset's purgatory status defined in
   * [`list-purgatory`](https://github.com/oceanprotocol/list-purgatory).
   * Marketplace interfaces are encouraged to prevent certain user actions like adding liquidity on assets in purgatory.
   * @type {Purgatory}
   */
  purgatory: Purgatory
}
