export enum CredentialType {
  address = 'address',
  credential3Box = 'credential3Box',
  domain = 'domain'
}

export type CredentialAction = 'allow' | 'deny'

export interface Credential {
  type: CredentialType
  value: string[]
}

export interface Credentials {
  allow?: Credential[]
  deny?: Credential[]
}
