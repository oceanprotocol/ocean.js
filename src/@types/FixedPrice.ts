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
  maxBaseTokenAmount: string
  swapMarketFee: string
  marketFeeAddress: string
}

export interface PriceAndFees {
  baseTokenAmount: string
  oceanFeeAmount: string
  marketFeeAmount: string
  consumeMarketFeeAmount: string
}

export interface FixedPriceExchange {
  active: boolean
  exchangeOwner: string
  datatoken: string
  baseToken: string
  fixedRate: string
  dtDecimals: string
  btDecimals: string
  dtBalance: string
  btBalance: string
  dtSupply: string
  btSupply: string
  withMint: boolean
  allowedSwapper: string
  exchangeId?: string
}

export interface FeesInfo {
  opcFee: string
  marketFee: string
  marketFeeCollector: string
  marketFeeAvailable: string
  oceanFeeAvailable: string
  exchangeId: string
}
