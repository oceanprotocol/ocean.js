export interface Event {
  /**
   * TX id of the last create/update
   * @type {string}
   */
  txid?: string

  /**
   * Block of txid
   * @type {number}
   */
  block?: number

  /**
   * Sender of tx
   * @type {String}
   */
  from?: string

  /**
   * Contract
   * @type {String}
   */
  contract?: string

  /**
   * datetime of tx
   * @type {String}
   */
  datetime?: string
}
