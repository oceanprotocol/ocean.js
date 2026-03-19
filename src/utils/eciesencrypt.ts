import { encrypt, PublicKey } from 'eciesjs'

type PublicKeyInput = string | Uint8Array | number[] | Record<number, number>

function normalizePublicKey(publicKey: PublicKeyInput): string {
  if (typeof publicKey === 'string') {
    return publicKey.startsWith('0x') ? publicKey : `0x${publicKey}`
  }

  const bytes =
    publicKey instanceof Uint8Array
      ? publicKey
      : Array.isArray(publicKey)
      ? Uint8Array.from(publicKey)
      : Uint8Array.from(
          Object.keys(publicKey)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => publicKey[Number(key)])
        )

  return `0x${Buffer.from(bytes).toString('hex')}`
}

/**
 * @dev eciesencrypt
 *      Encrypt content using ECIES and return the encrypted content as a hex string
 *
 * @param publicKey public key as hex string, byte array, or numeric-key object
 * @param content content to encrypt
 */
export function eciesencrypt(publicKey: PublicKeyInput, content: string) {
  // Encrypt using ECIES
  const key = PublicKey.fromHex(normalizePublicKey(publicKey))
  const encrypted = encrypt(key.toHex(), Buffer.from(content))

  // Convert to hex string
  const encryptedHex = Buffer.from(encrypted).toString('hex')
  return encryptedHex
}
