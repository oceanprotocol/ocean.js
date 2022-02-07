export interface Operation {
  /**
   * used only for FixedRate or Dispenser, but needs to be filled even for pool
   * @type {string}
   */
  exchangeIds: string
  /**
   * pool Address
   * @type {string}
   */
  source: string
  /**
   * operation:
   * 0 - swapExactAmountIn
   * 1 - swapExactAmountOut
   * 2 - FixedRateExchange
   * 3 - Dispenser
   * @type {number}
   */
  operation: number
  /**
   * token in address
   * @type {string}
   */
  tokenIn: string
  /**
   * when swapExactAmountIn is EXACT amount IN
   * expressed in Wei
   * @type {string | number}
   */
  amountsIn: string | number
  /**
   * token out address
   * @type {string}
   */
  tokenOut: string
  /**
   * when swapExactAmountIn is MIN amount OUT
   * expressed in Wei
   * @type {string | number}
   */
  amountsOut: string | number
  /**
   * max price (only for pools)
   * expressed in Wei
   * @type {string | number}
   */
  maxPrice: string | number
  /**
   * swap fee amount
   * @type {string}
   */
  swapMarketFee: string
  /**
   * market fee address to receive fees
   * @type {string}
   */
  marketFeeAddress: string
}
