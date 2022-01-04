export interface ProviderFees {
  providerFeeAddress: string
  providerFeeToken: string
  providerFeeAmount: string
  providerData: string
  v: string
  r: string
  s: string
}

export interface ProviderInitialize {
  dataToken: string
  nonce: string
  computeAddress: string
  providerFee: ProviderFees
}
