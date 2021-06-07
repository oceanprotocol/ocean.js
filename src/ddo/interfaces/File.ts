export interface File {
  /**
   * File name.
   * @type {string}
   */
  name?: string

  /**
   * File URL.
   * @type {string}
   */
  url?: string

  /**
   * File index.
   * @type {number}
   */
  index?: number

  /**
   * File format, if applicable.
   * @type {string}
   * @example "text/csv"
   */
  contentType: string

  /**
   * File checksum.
   * @type {[type]}
   */
  checksum?: string

  /**
   * Checksum hash algorithm.
   * @type {[type]}
   */
  checksumType?: string

  /**
   * File content length.
   * @type {[type]}
   */
  contentLength?: string

  /**
   * Resource ID (depending on the source).
   * @type {[type]}
   */
  resourceId?: string

  /**
   * File encoding.
   * @type {string}
   * @example "UTF-8"
   */
  encoding?: string

  /**
   * File compression (e.g. no, gzip, bzip2, etc).
   * @type {string}
   * @example "zip"
   */
  compression?: string

  /**
   * File availability (check fileinfo connectivity)
   * @type {boolean}
   */
  valid?: boolean
}
