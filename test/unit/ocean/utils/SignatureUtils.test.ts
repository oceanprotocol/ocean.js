import { assert, expect, spy, use } from 'chai'
import spies from 'chai-spies'
import Web3 from 'web3'
import { SignatureUtils } from '../../../../src/ocean/utils/SignatureUtils'
import { Logger } from '../../../../src/utils'

use(spies)

const web3 = new Web3('http://127.0.0.1:8545')

describe('SignatureUtils', () => {
  const publicKey = `0x${'a'.repeat(40)}`
  const text = '0123456789abcde'
  const signature = `0x${'a'.repeat(130)}`

  let signatureUtils: SignatureUtils

  before(async () => {
    signatureUtils = new SignatureUtils(web3, new Logger())
  })

  afterEach(() => {
    spy.restore()
  })

  describe('#signText', () => {
    let personalSignSpy

    beforeEach(() => {
      personalSignSpy = spy.on(web3.eth.personal, 'sign', () => signature)
    })

    it('should sign a text as expected', async () => {
      const signed = await signatureUtils.signText(text, publicKey)

      assert.equal(signed, signature)
      expect(personalSignSpy).to.have.been.called.with(text, publicKey)
    })

    it('should sign a text as expected using password', async () => {
      const signed = await signatureUtils.signText(text, publicKey, 'test')

      assert.equal(signed, signature)
      expect(personalSignSpy).to.have.been.called.with(text, publicKey, 'test')
    })
  })

  describe('#verifyText', () => {
    it('should recover the privateKey of a signed message', async () => {
      const personalRecoverSpy = spy.on(web3.eth.personal, 'ecRecover', () => publicKey)

      const verifiedPublicKey = await signatureUtils.verifyText(text, signature)

      assert.equal(publicKey, verifiedPublicKey)
      expect(personalRecoverSpy).to.have.been.called.with(text, signature)
    })
  })
})
