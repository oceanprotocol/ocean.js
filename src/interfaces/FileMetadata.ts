export interface FileMetadata {
  /**
   * File format, if applicable.
   * @type {string}
   * @example "text/csv"
   */
  contentType: string

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
   * File URL.
   * @type {string}
   */
  url?: string
}
