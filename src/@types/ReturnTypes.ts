import { BigNumber, providers } from 'ethers'
export type ReceiptOrEstimate<G extends boolean = false> = G extends false
  ? providers.TransactionResponse
  : BigNumber
export type ReceiptOrDecimal<G extends boolean = false> = G extends false
  ? providers.TransactionResponse
  : number
