export interface FreCreationParams {
  fixedRateAddress: string
  baseTokenAddress: string
  owner: string
  marketFeeCollector: string
  baseTokenDecimals: number
  datatokenDecimals: number
  fixedRate: string
  marketFee: number
  withMint?: boolean // add FixedPriced contract as minter if withMint == true
  allowedConsumer?: string //  only account that consume the exhchange
}

export interface FreOrderParams {
  exchangeContract: string
  exchangeId: string
  maxBasetokenAmount: string
  swapMarketFee: string
  marketFeeAddress: string
}
