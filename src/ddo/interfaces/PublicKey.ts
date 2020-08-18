/**
 * Public key data.
 */
export interface PublicKey {
  /**
   * ID of the key.
   * @type {string}
   * @example "did:op:123456789abcdefghi#keys-1"
   */
  id: string

  /**
   * Type of key.
   * @type {string}
   */
  type:
    | 'Ed25519VerificationKey2018'
    | 'RsaVerificationKey2018'
    | 'EdDsaSAPublicKeySecp256k1'
    | 'EthereumECDSAKey'

  /**
   * Key owner.
   * @type {string}
   * @example "did:op:123456789abcdefghi"
   */
  owner: string

  publicKeyPem?: string
  publicKeyBase58?: string
  publicKeyHex?: string
}
