export interface DepositData {
  token: string
  amount: string
}

export interface PermitData {
  token: string
  amount: string
  deadline: string
  v: number
  r: string
  s: string
}

export interface AuthData {
  token: string
  payee: string
  maxLockedAmount: string
  maxLockSeconds: string
  maxLockCounts: string
}

export interface LockData {
  jobId: string
  payer: string
  amount: string
  expiry: string
  token: string
  startTime: string
}
