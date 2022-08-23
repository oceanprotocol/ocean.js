import { TransactionReceipt } from 'web3-core'

export type ReceiptOrEstimate<G extends boolean = false> = G extends false
  ? TransactionReceipt
  : number
