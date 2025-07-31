import { BigNumberish, TransactionResponse } from 'ethers'
export type ReceiptOrEstimate<G extends boolean = false> = G extends false
  ? TransactionResponse
  : BigNumberish
export type ReceiptOrDecimal<G extends boolean = false> = G extends false
  ? TransactionResponse
  : number
