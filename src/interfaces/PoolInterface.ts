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
