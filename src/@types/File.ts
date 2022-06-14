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
  url?: string

  /**
   * HTTP method used
   * @type {string}
   */
  method?: string
}

export interface Files {
  nftAddress: string
  datatokenAddress: string
  files: UrlFile[]
}
