export enum CredentialType {
  address = 'address',
  credential3Box = 'credential3Box'
}

export interface CredentialDetail {
  type: CredentialType
  value: string[]
}
