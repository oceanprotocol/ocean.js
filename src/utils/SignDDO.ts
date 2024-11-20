import { base64url, importJWK, JWTPayload, SignJWT } from 'jose'
import axios from 'axios'
import { ethers } from 'ethers'
import { IssuerKey, SignedCredential } from '../@types/IssuerSignature'

/**
 * Signs a verifiable credential using Walt.id's issuer API.
 * @param {any} verifiableCredential - The verifiable credential to sign.
 * @param {string} waltIdIssuerApi - URL of the Walt.id issuer API.
 * @param {string} issuerDid - DID of the issuer.
 * @param {IssuerKey} issuerKey - Issuer's key for signing.
 * @returns {Promise<SignedCredential>} - The signed credential's JWS, header, and issuer information.
 * @throws {Error} If the signing process fails.
 */
export async function signCredentialWithWaltId(
  verifiableCredential: any,
  waltIdIssuerApi: string,
  issuerDid: string,
  issuerKey: IssuerKey
): Promise<SignedCredential> {
  try {
    const response = await axios.post(waltIdIssuerApi, {
      credentialData: verifiableCredential,
      issuerDid,
      issuerKey,
      subjectDid: verifiableCredential.credentialSubject.id
    })
    const jws = response.data
    const header = { alg: issuerKey.jwk.kty }
    return { jws, header, issuer: issuerDid }
  } catch (error) {
    console.error('Error signing credential with WaltId:', error)
    throw error
  }
}

/**
 * Signs a verifiable credential locally using a private key.
 * @param {any} verifiableCredential - The verifiable credential to sign.
 * @param {string} privateKey - The private key.
 * @returns {Promise<SignedCredential>} - The signed credential's JWS, header, and issuer information.
 * @throws {Error} If the signing process fails.
 */
export async function signCredential(
  verifiableCredential: any,
  privateKey: string
): Promise<SignedCredential> {
  try {
    const wallet = new ethers.Wallet(privateKey)
    const privateKeyBuffer = Buffer.from(privateKey.substring(2), 'hex')
    const publicKeyHex = wallet._signingKey().publicKey
    const publicKeyBuffer = Buffer.from(publicKeyHex.substring(2), 'hex')

    // Extract x and y coordinates from the public key buffer
    const xBuffer = publicKeyBuffer.slice(1, 33)
    const yBuffer = publicKeyBuffer.slice(33, 65)

    // Base64url-encode the values
    const d = base64url.encode(privateKeyBuffer as any as Uint8Array)
    const x = base64url.encode(xBuffer as any as Uint8Array)
    const y = base64url.encode(yBuffer as any as Uint8Array)

    const privateJwk = {
      kty: 'EC',
      crv: 'secp256k1',
      d,
      x,
      y,
      alg: 'ES256K',
      use: 'sig'
    }

    const key = await importJWK(privateJwk, 'ES256K')

    const jws = await new SignJWT(verifiableCredential as unknown as JWTPayload)
      .setProtectedHeader({ alg: 'ES256K' })
      .setIssuedAt()
      .setIssuer(publicKeyHex)
      .sign(key)
    const header = { alg: 'ES256K' }

    return { jws, header, issuer: publicKeyHex }
  } catch (error) {
    console.error('Error signing credential:', error)
    throw error
  }
}
