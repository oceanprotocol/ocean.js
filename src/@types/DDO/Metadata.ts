export interface MetadataAlgorithm {
  /**
   * Language used to implement the software.
   * @type {string}
   */
  language?: string

  /**
   * Version of the software preferably in SemVer notation.
   * @type {string}
   */
  version?: string

  /**
   * Object describing the Docker container image.
   * @type {Object}
   */
  container: {
    /**
     * The command to execute, or script to run inside the Docker image.
     * @type {string}
     */
    entrypoint: string

    /**
     * Name of the Docker image.
     * @type {string}
     */
    image: string

    /**
     * Tag of the Docker image.
     * @type {string}
     */
    tag: string

    /**
     * Checksum of the Docker image.
     * @type {string}
     */
    checksum: string
  }
}

export interface Metadata {
  /**
   * Contains the date of publishing in ISO Date Time
   * @type {string}
   */
  created: string

  /**
   * Contains the the date of last update in ISO Date Time
   * @type {string}
   */
  updated: string

  /**
   * Descriptive name or title of the asset.
   * @type {string}
   */
  name: string

  /**
   * Details of what the resource is.
   * @type {string}
   */
  description: string

  /**
   * Asset type. Includes "dataset" (e.g. csv file), "algorithm" (e.g. Python script).
   * Each type needs a different subset of metadata attributes.
   * @type {'dataset' | 'algorithm'}
   */
  type: 'dataset' | 'algorithm'

  /**
   * Name of the entity generating this data (e.g. Tfl, Disney Corp, etc.).
   * @type {string}
   */
  author: string

  /**
   * Short name referencing the license of the asset.
   * If it’s not specified, the following value will be added: “No License Specified”.
   * @type {string}
   */
  license: string

  /**
   * Mapping of URL strings for data samples, or links to find out more information.
   * Links may be to either a URL or another asset.
   * @type {string[]}
   */
  links?: string[]

  /**
   * Mapping of URL strings for data samples, or links to find out more information.
   * Links may be to either a URL or another asset.
   * @type {string[]}
   */
  tags?: string[]

  /**
   * The party holding the legal copyright. Empty by default.
   * @type {string}
   */
  copyrightHolder?: string

  /**
   *The language of the content. Use one of the language codes from the IETF BCP 47 standard
   * @type {string}
   */
  contentLanguage?: string

  /**
   * Information about asset of typealgorithm
   * @type {MetadataAlgorithm}
   */
  algorithm?: MetadataAlgorithm

  /**
   * Stores additional information, this is customizable by publisher
   * @type {any}
   */
  additionalInformation?: any
}

export interface ValidateMetadata {
  valid: Boolean
  errors?: Object
}
