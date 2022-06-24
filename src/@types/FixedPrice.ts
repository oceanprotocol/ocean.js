export interface FreCreationParams {
  fixedRateAddress: string
  baseTokenAddress: string
  owner: string
  marketFeeCollector: string
  baseTokenDecimals: number
  datatokenDecimals: number
  fixedRate: string
  marketFee: string
  withMint?: boolean // add FixedPriced contract as minter if withMint == true
  allowedConsumer?: string //  only account that consume the exhchange
}

export interface FreOrderParams {
  exchangeContract: string
  exchangeId: string
  maxBaseTokenAmount: string,
  baseTokenAddress?: string,
  baseTokenDecimals?:number,
  swapMarketFee: string
  marketFeeAddress: string
}

export interface PriceAndFees {
  baseTokenAmount: string
  oceanFeeAmount: string
  marketFeeAmount: string
  consumeMarketFeeAmount: string
}
