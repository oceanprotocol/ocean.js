export interface FreCreationParams {
  fixedRateAddress: string
  basetokenAddress: string
  owner: string
  marketFeeCollector: string
  basetokenDecimals: number
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
