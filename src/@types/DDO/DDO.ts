import { Service, Metadata, Credentials, Event } from '..'

/**
 * DID Descriptor Object.
 * Contains metadata about the asset, and define access in at least one service.
 */
export interface DDO {
  /**
   * Contexts used for validation.
   * @type {string[]}
   */
  '@context': string[]

  /**
   * DID, descentralized ID.
   * Computed as sha256(address of NFT contract + chainId)
   * @type {string}
   */
  id: string

  /**
   * Version information in SemVer notation
   * referring to the DDO spec version
   * @type {string}
   */
  version: string

  /**
   * NFT contract address
   * @type {string}
   */
  nftAddress: string

  /**
   * ChainId of the network the DDO was published to.
   * @type {number}
   */
  chainId: number

  /**
   * Stores an object describing the asset.
   * @type {Metadata}
   */
  metadata: Metadata

  /**
   * Stores an array of services defining access to the asset.
   * @type {Service[]}
   */
  services: Service[]

  /**
   * Describes the credentials needed to access a dataset
   * in addition to the services definition.
   * @type {Credentials}
   */
  credentials?: Credentials

  /**
   * Describes the event of last metadata event
   * @type {Event}
   */
  event?: Event
}
