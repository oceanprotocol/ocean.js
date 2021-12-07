export interface PoolCreationParams {
  ssContract: string
  basetokenAddress: string
  basetokenSender: string
  publisherAddress: string
  marketFeeCollector: string
  poolTemplateAddress: string
  rate: string
  basetokenDecimals: number
  vestingAmount: string
  vestedBlocks: number
  initialBasetokenLiquidity: string
  swapFeeLiquidityProvider: number
  swapFeeMarketPlaceRunner: number
}

export interface CurrentFees {
  tokens: string[]
  amounts: string[]
}

export interface TokenInOutMarket {
  tokenIn: string
  tokenOut: string
  marketFeeAddress: string
}

export interface AmountsInMaxFee {
  tokenAmountIn: string
  minAmountOut: string
  swapMarketFee: string
  maxPrice?: string
}

export interface AmountsOutMaxFee {
  tokenAmountOut: string
  maxAmountIn: string
  swapMarketFee: string
  maxPrice?: string
}
