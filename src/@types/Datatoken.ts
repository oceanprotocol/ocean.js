import { ProviderFees } from '..'

export interface Erc20CreateParams {
  templateIndex: number
  minter: string
  paymentCollector: string
  mpFeeAddress: string
  feeToken: string
  feeAmount: string
  cap: string
  name?: string
  symbol?: string
}

export interface ConsumeMarketFee {
  consumeMarketFeeAddress: string
  consumeMarketFeeToken: string // address of the token marketplace wants to add fee on top
  consumeMarketFeeAmount: string
}

export interface PublishingMarketFee {
  publishMarketFeeAddress: string
  publishMarketFeeToken: string
  publishMarketFeeAmount: string
}

export interface DatatokenRoles {
  minter: boolean
  paymentManager: boolean
}

export interface OrderParams {
  consumer: string
  serviceIndex: number
  _providerFee: ProviderFees
  _consumeMarketFee: ConsumeMarketFee
}

export interface DispenserParams {
  maxTokens: string
  maxBalance: string
  withMint?: boolean // true if we want to allow the dispenser to be a minter
  allowedSwapper?: string // only account that can ask tokens. set address(0) if not required
}
