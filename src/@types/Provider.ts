import { ethers } from 'ethers'

export interface ProviderFees {
  providerFeeAddress: string
  providerFeeToken: string
  providerFeeAmount: string
  v: string
  r: string
  s: string
  providerData: string
  validUntil: string
}

export interface ProviderInitialize {
  datatoken: string
  nonce: string
  computeAddress: string
  providerFee: ProviderFees
}

export interface ProviderComputeInitialize {
  datatoken?: string
  validOrder?: string
  providerFee?: ProviderFees
}

export interface ProviderComputeInitializePayment {
  escrowAddress: string
  chainId: number
  payee: string
  token: string
  amount: number
  minLockSeconds: number
}

export interface ProviderComputeInitializeResults {
  algorithm?: ProviderComputeInitialize
  datasets?: ProviderComputeInitialize[]
  payment?: ProviderComputeInitializePayment
}

export interface ServiceEndpoint {
  serviceName: string
  method: string
  urlPath: string
}
export interface UserCustomParameters {
  [key: string]: any
}
