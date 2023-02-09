// import { TransactionReceipt } from 'web3-core'
import { TransactionResponse } from 'ethers'
export type ReceiptOrEstimate<G extends boolean = false> = G extends false
  ? TransactionResponse
  : bigint
