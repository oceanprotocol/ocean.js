import { JsonRpcSigner, Signer, getBytes, ethers } from 'ethers'
import { LoggerInstance } from './Logger'
import { PROTOCOL_COMMANDS } from '../@types/Provider'

/**
 * Scoped auth tokens — current token format version. SHARED wire contract with ocean-node: this
 * MUST byte-match the node's `AUTH_TOKEN_VERSION`. ocean.js is the signer; ocean-node the verifier.
 */
export const AUTH_TOKEN_VERSION = 2

/**
 * Build the v2 scoped-auth-token signed message (plan §3.2). Byte-identical to the node's
 * `buildCreateAuthTokenSignatureMessage`. The golden vectors in both repos' tests pin these bytes.
 *
 * message =
 *   address + nonce + "createAuthToken" + issuerPeerId
 *   + "|v:" + V + "|aud:" + AUD + "|cmd:" + CMD + "|exp:" + EXP
 *
 * AUD/CMD are canonicalized: dedup via `new Set` BEFORE `.sort()` (default ascending string sort),
 * comma-joined. Omitted ⇒ empty string. Never pass `[]` (the node rejects it).
 */
export function buildCreateAuthTokenSignatureMessage(fields: {
  address: string
  nonce: string | number
  issuerPeerId: string
  audience?: string[]
  scope?: string[]
  validUntil: number // epoch ms, required for v2
}): string {
  const aud = fields.audience?.length
    ? Array.from(new Set(fields.audience)).sort().join(',')
    : ''
  const cmd = fields.scope?.length
    ? Array.from(new Set(fields.scope)).sort().join(',')
    : ''
  const V = String(AUTH_TOKEN_VERSION)
  return (
    String(fields.address) +
    String(fields.nonce) +
    String(PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN) +
    String(fields.issuerPeerId ?? '') +
    '|v:' +
    V +
    '|aud:' +
    aud +
    '|cmd:' +
    cmd +
    '|exp:' +
    String(fields.validUntil)
  )
}

/**
 * Signs the hash of a message using the provided signer.
 * @param {Signer} signer - The signer to use for signing the hash.
 * @param {string} message - The message to sign.
 * @returns {Promise<string>} - A Promise that resolves to the signature of the hash of the message.
 */
export async function signHash(signer: Signer, message: string) {
  // Since ganache has no support yet for personal_sign, we must use the legacy implementation
  // const signedMessage = await user2.signMessage(message)

  const messageHashBytes = getBytes(message)
  let signedMessage = await (signer as JsonRpcSigner)._legacySignMessage(messageHashBytes)
  signedMessage = signedMessage.substr(2) // remove 0x
  const r = '0x' + signedMessage.slice(0, 64)
  const s = '0x' + signedMessage.slice(64, 128)
  let v = '0x' + signedMessage.slice(128, 130)
  if (v === '0x00') v = '0x1b'
  if (v === '0x01') v = '0x1c'

  return { v, r, s }
}

export async function signRequest(signer: Signer, message: string): Promise<string> {
  const consumerMessage = ethers.solidityPackedKeccak256(
    ['bytes'],
    [ethers.hexlify(ethers.toUtf8Bytes(message))]
  )
  const messageHashBytes = ethers.toBeArray(consumerMessage)
  try {
    return await signer.signMessage(messageHashBytes)
  } catch (error) {
    // LoggerInstance.error('Sign message error: ', error)
    const network = await signer.provider.getNetwork()
    const chainId = Number(network.chainId)
    if (Number(chainId) === 8996) {
      console.log('Signing message with _legacySignMessage')
      return await (signer as JsonRpcSigner)._legacySignMessage(messageHashBytes)
    }
  }
}
