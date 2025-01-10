/**
 * Represents a JSON Web Token (JWT) used in cryptographic operations.
 */
export interface JWT {
  kty: string // Key type (e.g., 'EC' for Elliptic Curve)
  d: string // Private key (base64url encoded)
  crv: string // Cryptographic curve (e.g., 'secp256k1')
  kid: string // Key ID
  x: string // X-coordinate of the public key (base64url encoded)
}

/**
 * Represents a key used by an issuer to sign credentials.
 */
export interface IssuerKey {
  type: string // Type of the key (e.g., 'JWK')
  jwk: JWT // The JSON Web Token associated with the issuer's key
}

/**
 * Represents the result of signing a credential.
 */
export interface SignedCredential {
  jws: string // JSON Web Signature (JWS) of the credential
  header: Record<string, any> // Protected header used in the JWS
  issuer: string // DID or public key of the issuer
}

/**
 * Represents the common properties of a JSON Web Key (JWK).
 */
interface BaseJWK {
  kty: string // Key type (e.g., 'EC' for Elliptic Curve)
  crv: string // Cryptographic curve (e.g., 'secp256k1')
  x: string // X-coordinate of the public key (base64url encoded)
  y: string // Y-coordinate of the public key (base64url encoded)
  alg: string // Algorithm used (e.g., 'ES256K')
  use: string // Intended use of the key (e.g., 'sig' for signing)
}

/**
 * Represents a JSON Web Key (JWK) for private signing operations.
 */
export interface IssuerKeyJWK extends BaseJWK {
  d: string // Private key (base64url encoded)
}

/**
 * Represents a JSON Web Key (JWK) for public verification operations.
 */
export interface IssuerPublicKeyJWK extends BaseJWK {}
