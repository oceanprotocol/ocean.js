export interface JWT {
  kty: string
  d: string
  crv: string
  kid: string
  x: string
}

export interface IssuerKey {
  type: string
  jwk: JWT
}

export interface SignedCredential {
  jws: string
  header: Record<string, any>
  issuer: string
}

export interface IssuerKeyJWK {
  kty: string
  crv: string
  d: string
  x: string
  y: string
  alg: string
  use: string
}
