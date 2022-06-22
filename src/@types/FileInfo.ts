export interface FileInfo {
  /**
   * File URL.
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
   * File URL.
   * @type {string}
   */
  url?: string

  /**
   * HTTP method used
   * @type {string}
   */
  method?: string

  /**
   * check if file exists
   * @type {boolean}
   */
  valid?: boolean
}
