/**
 * Curation attributes of Assets Metadata.
 * @see https://github.com/oceanprotocol/OEPs/tree/master/8
 */
export interface Curation {
  /**
   * Decimal value between 0 and 1. 0 is the default value.
   * @type {number}
   * @example 0.93
   */
  rating: number

  /**
   * Number of votes. 0 is the default value.
   * @type {number}
   * @example 123
   */
  numVotes: number

  /**
   * Schema applied to calculate the rating.
   * @type {string}
   * @example "Binary Voting"
   */
  schema?: string

  /**
   * Flag unsuitable content.
   * @type {boolean}
   * @example true
   */
  isListed?: boolean
}
