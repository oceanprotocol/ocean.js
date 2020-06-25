import { assert, expect, spy, use } from 'chai'
import spies from 'chai-spies'
import Web3 from 'web3'
import config from '../../config'

import { Ocean } from '../../../../src/ocean/Ocean'

use(spies)

describe('SignatureUtils', () => {
    const publicKey = `0x${'a'.repeat(40)}`
    const text = '0123456789abcde'
    const signature = `0x${'a'.repeat(130)}`
    let web3: Web3
    let ocean: Ocean

    before(async () => {
        ocean = await Ocean.getInstance(config)
        web3 = (ocean as any).web3
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
            const signed = await ocean.utils.signature.signText(text, publicKey)

            assert.equal(signed, signature)
            expect(personalSignSpy).to.have.been.called.with(text, publicKey)
        })

        it('should sign a text as expected using password', async () => {
            const signed = await ocean.utils.signature.signText(text, publicKey, 'test')

            assert.equal(signed, signature)
            expect(personalSignSpy).to.have.been.called.with(text, publicKey, 'test')
        })
    })

    describe('#verifyText', () => {
        it('should recover the privateKey of a signed message', async () => {
            const personalRecoverSpy = spy.on(
                web3.eth.personal,
                'ecRecover',
                () => publicKey
            )

            const verifiedPublicKey = await ocean.utils.signature.verifyText(
                text,
                signature
            )

            assert.equal(publicKey, verifiedPublicKey)
            expect(personalRecoverSpy).to.have.been.called.with(text, signature)
        })
    })
})
