import { ConsumeMarketFee, ProviderFees } from '..'

export interface Template {
  templateAddress: string
  isActive: boolean
}

export interface TokenOrder {
  tokenAddress: string
  consumer: string
  serviceIndex: number
  _providerFee: ProviderFees
  _consumeMarketFee: ConsumeMarketFee
}

export interface NftCreateData {
  name: string
  symbol: string
  templateIndex: number
  tokenURI: string
  transferable: boolean
  owner: string
}
