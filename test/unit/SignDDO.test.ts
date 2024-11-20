import { assert } from 'chai'
import { ethers } from 'ethers'
import { signCredential, verifyCredential } from '../../src'

const mockVerifiableCredential = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  type: ['VerifiableCredential'],
  credentialSubject: { id: 'did:example:123' },
  issuer: 'did:example:issuer',
  issuanceDate: '2023-01-01T00:00:00Z'
}

describe('Credential Signing and Verification Functions', () => {
  describe('signCredential', () => {
    it('should sign the credential using a private key', async () => {
      const privateKey =
        '0xc494c6e5def4bab63ac29eed19a134c130355f74f019bc74b8f4389df2837a57'

      const result = await signCredential(mockVerifiableCredential, privateKey)

      assert.isString(result.jws, 'JWS should be a string')
      assert.isObject(result.header, 'Header should be an object')
      assert.equal(result.header.alg, 'ES256K', 'Algorithm should be ES256K')
      assert.isString(result.issuer, 'Issuer should be a string')
    })
  })

  describe('verifyCredential', () => {
    it('should verify the signed credential with the correct public key', async () => {
      const privateKey =
        '0xc494c6e5def4bab63ac29eed19a134c130355f74f019bc74b8f4389df2837a57'
      const wallet = new ethers.Wallet(privateKey)
      const { publicKey } = wallet._signingKey()

      const { jws } = await signCredential(mockVerifiableCredential, privateKey)

      const payload = await verifyCredential(jws, publicKey)
      assert.deepEqual(
        {
          type: payload.type,
          credentialSubject: payload.credentialSubject,
          issuer: payload.issuer,
          issuanceDate: payload.issuanceDate
        },
        {
          type: mockVerifiableCredential.type,
          credentialSubject: mockVerifiableCredential.credentialSubject,
          issuer: mockVerifiableCredential.issuer,
          issuanceDate: mockVerifiableCredential.issuanceDate
        },
        'Payload should match the original credential'
      )
    })

    it('should throw an error if verification fails due to an invalid signature', async () => {
      const privateKey =
        '0xc494c6e5def4bab63ac29eed19a134c130355f74f019bc74b8f4389df2837a57'
      const invalidPublicKey =
        '0x0491d20394c7c2b191c6db3a3a9e7eac21d9c6741dcf66010e0a743530d8c1b05656fb9b555ebc4162df5d1cf3e372a4e0230205932c27fcd998bdbe26399236f9'

      const { jws } = await signCredential(mockVerifiableCredential, privateKey)

      try {
        await verifyCredential(jws, invalidPublicKey)
        assert.fail('Expected error to be thrown')
      } catch (error) {
        assert.include(
          error.message,
          'Invalid JWK EC key',
          'Error should indicate failed verification'
        )
      }
    })
  })
})
