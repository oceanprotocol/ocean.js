export interface BaseFileInfo {
  /**
   * File type
   * @type {string}
   */
  type: string

  /**
   * File format, if applicable.
   * @type {string}
   * @example "text/csv"
   */
  contentType?: string

  /**
   * File content length.
   * @type {[type]}
   */
  contentLength?: string

  /**
   * File index.
   * @type {number}
   */
  index?: number

  /**
   * Computed file checksum
   * @type {string}
   */
  checksum?: string

  /**
   * check if file exists
   * @type {boolean}
   */
  valid?: boolean
}

export interface UrlFileInfo extends BaseFileInfo {
    /**
   * File type.
   * @type {string}
   */
  type: 'url'

  /**
   * File URL.
   * @type {string}
   */
   url?: string

   /**
    * HTTP method used
    * @type {string}
    */
   method?: string
}

export interface ArweaveFileInfo extends BaseFileInfo {
    /**
   * File type.
   * @type {string}
   */
     type: 'arweave'

  /**
   * Arweave Transaction ID.
   * @type {string}
   */
  transactionId: string
}