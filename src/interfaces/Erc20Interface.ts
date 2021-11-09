export interface Erc20CreateParams {
  templateIndex: number
  minter: string
  feeManager: string
  mpFeeAddress: string
  feeToken: string
  feeAmount: string
  cap: string
  name?: string
  symbol?: string
}
