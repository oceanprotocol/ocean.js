export interface RequestCredential {
  type: string
  format: string
  policies?: (string | Record<string, string | number | boolean>)[]
}
export interface CredentialAddressBased {
  type: string
  values: string[]
}

export interface CredentialPolicyBased {
  vpPolicies?: string[]
  vcPolicies?: string[]
  requestCredentials: RequestCredential[]
}

export interface Credentials {
  allow: CredentialAddressBased[] | CredentialPolicyBased[]
  deny: CredentialAddressBased[] | CredentialPolicyBased[]
}
