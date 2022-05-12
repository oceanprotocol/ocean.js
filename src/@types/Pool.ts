export interface PoolCreationParams {
  ssContract: string
  baseTokenAddress: string
  baseTokenSender: string
  publisherAddress: string
  marketFeeCollector: string
  poolTemplateAddress: string
  rate: string
  baseTokenDecimals: number
  vestingAmount: string
  vestedBlocks: number
  initialBaseTokenLiquidity: string
  swapFeeLiquidityProvider: string
  swapFeeMarketRunner: string
}

export interface CurrentFees {
  tokens: string[]
  amounts: string[]
}

export interface TokenInOutMarket {
  tokenIn: string
  tokenOut: string
  marketFeeAddress: string
  tokenInDecimals?: number
  tokenOutDecimals?: number
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

export interface PoolPriceAndFees {
  tokenAmount: string
  liquidityProviderSwapFeeAmount: string
  oceanFeeAmount: string
  publishMarketSwapFeeAmount: string
  consumeMarketSwapFeeAmount: string
}
