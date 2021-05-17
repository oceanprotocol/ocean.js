/**
 * Status attributes of Assets Metadata.
 * @see https://github.com/oceanprotocol/OEPs/tree/master/8
 */
export interface Status {
  /**
   * Use to flag unsuitable content. True by default. If it's false, the content must not be returned.
   * @type {boolean}
   * @example true
   */
  isListed?: boolean

  /**
   * Flag retired content. False by default. If it's true, the content may either not be returned, or returned with a note about retirement.
   * @type {boolean}
   * @example false
   */
  isRetired?: boolean

  /**
   * For temporarily disabling ordering assets, e.g. when file host is in maintenance. False by default. If it's true, no ordering of assets for download or compute should be allowed.
   * @type {boolean}
   * @example false
   */
  isOrderDisabled?: boolean
}
