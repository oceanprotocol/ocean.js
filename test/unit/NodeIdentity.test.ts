import { expect } from 'chai'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { toUtf8Bytes, hexlify } from 'ethers'
import {
  verifyNodeChallenge,
  generateClientChallenge,
  resolveVerifiedIssuer,
  STATUS_CHALLENGE_DOMAIN
} from '../../src/utils/NodeIdentity.js'

// OJ-03 (plan §8.1): verify the client-side identity check against REAL libp2p signatures, exactly
// as a node's signWithIdentityKey would produce them.
describe('OJ-03 node identity challenge (client verify)', () => {
  it('generateClientChallenge returns a random hex string', () => {
    const a = generateClientChallenge()
    const b = generateClientChallenge()
    expect(a).to.match(/^[0-9a-f]+$/)
    expect(a.length).to.equal(64)
    expect(a).to.not.equal(b)
  })

  it('verifies a correct signedChallenge produced with the node identity key', async () => {
    const key = await generateKeyPair('secp256k1')
    const peerId = peerIdFromPrivateKey(key).toString()
    const challenge = generateClientChallenge()
    const sig = await key.sign(toUtf8Bytes(STATUS_CHALLENGE_DOMAIN + challenge))
    const ok = await verifyNodeChallenge(peerId, challenge, hexlify(sig))
    expect(ok).to.equal(true)
  })

  it('rejects a signature over the bare challenge (domain separation)', async () => {
    const key = await generateKeyPair('secp256k1')
    const peerId = peerIdFromPrivateKey(key).toString()
    const challenge = generateClientChallenge()
    const sig = await key.sign(toUtf8Bytes(challenge)) // missing the domain prefix
    expect(await verifyNodeChallenge(peerId, challenge, hexlify(sig))).to.equal(false)
  })

  it('rejects a signature from a DIFFERENT key (spoofed endpoint)', async () => {
    const victim = await generateKeyPair('secp256k1')
    const attacker = await generateKeyPair('secp256k1')
    const victimPeerId = peerIdFromPrivateKey(victim).toString()
    const challenge = generateClientChallenge()
    // attacker signs but claims victim's peerId
    const sig = await attacker.sign(toUtf8Bytes(STATUS_CHALLENGE_DOMAIN + challenge))
    expect(await verifyNodeChallenge(victimPeerId, challenge, hexlify(sig))).to.equal(false)
  })

  it('resolveVerifiedIssuer fails closed when signedChallenge is absent', async () => {
    const key = await generateKeyPair('secp256k1')
    const peerId = peerIdFromPrivateKey(key).toString()
    let threw = false
    try {
      await resolveVerifiedIssuer({ id: peerId } as any, 'abcd')
    } catch {
      threw = true
    }
    expect(threw).to.equal(true)
  })

  it('resolveVerifiedIssuer returns the verified peerId on success', async () => {
    const key = await generateKeyPair('secp256k1')
    const peerId = peerIdFromPrivateKey(key).toString()
    const challenge = generateClientChallenge()
    const signedChallenge = hexlify(
      await key.sign(toUtf8Bytes(STATUS_CHALLENGE_DOMAIN + challenge))
    )
    const resolved = await resolveVerifiedIssuer(
      { id: peerId, signedChallenge } as any,
      challenge
    )
    expect(resolved).to.equal(peerId)
  })

  it('resolveVerifiedIssuer honors allowUnverifiedIssuer escape hatch', async () => {
    const resolved = await resolveVerifiedIssuer({ id: 'somePeer' } as any, 'abcd', {
      allowUnverifiedIssuer: true
    })
    expect(resolved).to.equal('somePeer')
  })
})
