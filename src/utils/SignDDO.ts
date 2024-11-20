import { base64url, importJWK, JWTPayload, jwtVerify, SignJWT } from 'jose'
import axios from 'axios'
import { IssuerKey, IssuerKeyJWK, SignedCredential } from '../@types/IssuerSignature'

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
 * @param {IssuerKeyJWK} issuerKeyJWK - the JWK from private key.
 * @param {string} publicKeyHex - the public key
 * @returns {Promise<SignedCredential>} - The signed credential's JWS, header, and issuer information.
 * @throws {Error} If the signing process fails.
 */
export async function signCredential(
  verifiableCredential: any,
  issuerKeyJWK: IssuerKeyJWK,
  publicKeyHex: string
): Promise<SignedCredential> {
  try {
    const key = await importJWK(issuerKeyJWK, 'ES256K')

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

/**
 * Verifies a verifiable credential's JWS using the issuer's public key.
 * @param {string} jws - The JSON Web Signature (JWS) to verify.
 * @param {string} issuerPublicKey - The public key of the issuer in hexadecimal format.
 * @returns {Promise<JWTPayload>} - The verified payload of the credential.
 * @throws {Error} If the verification fails.
 */
export async function verifyCredential(
  jws: string,
  issuerPublicKey: string
): Promise<JWTPayload> {
  const publicKeyBuffer = Buffer.from(issuerPublicKey.substring(2), 'hex')
  const xBuffer = publicKeyBuffer.slice(1, 33)
  const yBuffer = publicKeyBuffer.slice(33, 65)

  const x = base64url.encode(xBuffer as any as Uint8Array)
  const y = base64url.encode(yBuffer as any as Uint8Array)

  const publicJwk = {
    kty: 'EC',
    crv: 'secp256k1',
    x,
    y,
    alg: 'ES256K',
    use: 'sig'
  }

  const key = await importJWK(publicJwk, 'ES256K')

  try {
    const { payload } = await jwtVerify(jws, key)
    return payload
  } catch (error) {
    console.error('Verification failed:', error)
    throw error
  }
}
