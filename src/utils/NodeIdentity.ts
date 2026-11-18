import { peerIdFromString } from '@libp2p/peer-id'
import { toUtf8Bytes, getBytes } from 'ethers'
import { LoggerInstance } from './Logger'
import { AuthTokenOptions, NodeStatus } from '../@types/Provider'

/**
 * OJ-03 — domain-separation prefix for the status identity challenge. SHARED constant: this MUST
 * byte-match the node's `STATUS_CHALLENGE_DOMAIN`. Do not re-spell it.
 */
export const STATUS_CHALLENGE_DOMAIN = 'ocean-node-status-challenge-v1:'

/**
 * Generate a fresh random challenge (hex string) for the OJ-03 status challenge-response.
 * @param byteLength number of random bytes (default 32)
 */
export function generateClientChallenge(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  // Node >= 22 and browsers both expose a Web Crypto global.
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify a node's `signedChallenge` proves it controls the private key its `peerId` commits to.
 *
 * The node signs `utf8(STATUS_CHALLENGE_DOMAIN + clientChallenge)` with its libp2p IDENTITY key
 * (secp256k1: SHA-256 + DER). We rebuild the identical bytes and verify against the public key
 * extracted from the peerId (`@libp2p/peer-id`). Returns false on any error — callers fail closed.
 *
 * @param peerId the node peerId (status `id`)
 * @param clientChallenge the challenge we sent
 * @param signedChallenge the node's 0x-hex (or bare-hex) signature
 */
export async function verifyNodeChallenge(
  peerId: string,
  clientChallenge: string,
  signedChallenge: string
): Promise<boolean> {
  try {
    if (!peerId || !clientChallenge || !signedChallenge) return false
    const pid = peerIdFromString(peerId)
    const publicKey = pid.publicKey
    if (!publicKey) return false
    const data = toUtf8Bytes(STATUS_CHALLENGE_DOMAIN + clientChallenge)
    const sigHex = signedChallenge.startsWith('0x')
      ? signedChallenge
      : '0x' + signedChallenge
    const sig = getBytes(sigHex)
    return await publicKey.verify(data, sig)
  } catch (e) {
    LoggerInstance.error('verifyNodeChallenge failed:', e)
    return false
  }
}

/**
 * Resolve the issuer peerId to sign a token for, PROVING the node controls it (OJ-03, plan §8.1).
 *
 * Fail-closed by default: if `signedChallenge` is absent (pre-OJ-03 node) or verification fails,
 * throws rather than signing over an unverified peerId. The only bypass is the explicit per-call
 * `allowUnverifiedIssuer` escape hatch (plan §11 L1) — which reintroduces OJ-03 risk and is logged.
 *
 * @param status the status response (fetched WITH a clientChallenge)
 * @param clientChallenge the challenge sent in that status request
 * @param options generateAuthToken options (only `allowUnverifiedIssuer` consulted here)
 * @returns the verified issuer peerId
 */
export async function resolveVerifiedIssuer(
  status: NodeStatus | null,
  clientChallenge: string,
  options?: AuthTokenOptions
): Promise<string> {
  const peerId = status?.id
  if (!peerId) throw new Error('Could not resolve node peerId for signature.')
  if (options?.allowUnverifiedIssuer) {
    LoggerInstance.warn(
      'generateAuthToken: allowUnverifiedIssuer=true — skipping the OJ-03 issuer identity check. ' +
        'The token is signed over an UNVERIFIED peerId and may be usable at a spoofed node. INSECURE.'
    )
    return peerId
  }
  if (!status.signedChallenge) {
    throw new Error(
      'Node did not return a signedChallenge (pre-OJ-03 node?). Refusing to mint a token over an ' +
        'unverified issuer. Pass { allowUnverifiedIssuer: true } to override (insecure).'
    )
  }
  const ok = await verifyNodeChallenge(peerId, clientChallenge, status.signedChallenge)
  if (!ok) {
    throw new Error(
      'Issuer identity challenge failed: the node did not prove control of its peerId. Possible ' +
        'endpoint spoofing (OJ-03). Not minting a token.'
    )
  }
  return peerId
}
