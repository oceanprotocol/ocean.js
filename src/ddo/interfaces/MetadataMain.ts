import { MetadataAlgorithm } from './MetadataAlgorithm'
import { File } from './File'

/**
 * Main attributes of assets metadata.
 * @see https://github.com/oceanprotocol/OEPs/tree/master/8
 */
export interface MetadataMain {
  /**
   * Descriptive name of the Asset.
   * @type {string}
   * @example "UK Weather information 2011"
   */
  name: string

  /**
   * Type of the Asset. Helps to filter by the type of asset ("dataset" or "algorithm").
   * @type {string}
   * @example "dataset"
   */
  type: 'dataset' | 'algorithm'

  /**
   * The date on which the asset was created by the originator in
   * ISO 8601 format, Coordinated Universal Time.
   * @type {string}
   * @example "2019-01-31T08:38:32Z"
   */
  dateCreated: string

  /**
   * The date on which the asset DDO was registered into the metadata store.
   * This value is created automatically by Aquarius upon registering,
   * so this value can't be set.
   * @type {string}
   * @example "2019-01-31T08:38:32Z"
   */
  datePublished?: string

  /**
   * Name of the entity generating this data (e.g. Tfl, Disney Corp, etc.).
   * @type {string}
   * @example "Met Office"
   */
  author: string

  /**
   * Short name referencing the license of the asset (e.g. Public Domain, CC-0, CC-BY, No License Specified, etc. ).
   * If it's not specified, the following value will be added: "No License Specified".
   * @type {string}
   * @example "CC-BY"
   */
  license: string

  /**
   * Array of File objects including the encrypted file urls and some additional information.
   * @type {File[]}
   */
  files: File[]

  /**
   * Metadata used only for assets with type `algorithm`.
   * @type {MetaDataAlgorithm}
   */
  algorithm?: MetadataAlgorithm
}
