import { encrypt, PublicKey } from 'eciesjs'

/**
 * @dev eciesencrypt
 *      Encrypt content using ECIES and return the encrypted content as a hex string
 *
 * @param publicKey public key string '0x...'
 * @param content content to encrypt
 */
export function eciesencrypt(publicKey: string, content: string) {
  // Encrypt using ECIES
  const key = PublicKey.fromHex(publicKey)
  const encrypted = encrypt(key.toHex(), Buffer.from(content))

  // Convert to hex string
  const encryptedHex = Buffer.from(encrypted).toString('hex')
  return encryptedHex
}
