import { Signer } from 'ethers'
import { getTestConfig, provider } from '../config'
import { ProviderInstance, sleep } from '../../src'
import { expect } from 'chai'

describe('Auth token tests', async () => {
  let account
  let config
  let providerUrl

  before(async () => {
    account = (await provider.getSigner(0)) as Signer
    config = await getTestConfig(account)
    providerUrl = config?.oceanNodeUri
  })

  it('should generate auth token', async () => {
    await sleep(100)
    // Scoped-token change (plan §10.1): generateAuthToken now mints a node-scoped v2 token and
    // REQUIRES an explicit validUntil (within the node's maxTokenLifetime).
    const token = await ProviderInstance.generateAuthToken(account, providerUrl, {
      validUntil: Date.now() + 60 * 60 * 1000
    })
    expect(token).to.be.a('string')
  })

  it('should generate an unrestricted auth token when opted in', async () => {
    await sleep(100)
    const token = await ProviderInstance.generateAuthToken(account, providerUrl, {
      audience: 'any',
      validUntil: Date.now() + 60 * 60 * 1000
    })
    expect(token).to.be.a('string')
  })

  it('should throw a validUntil-specific error when validUntil is missing', async () => {
    await sleep(100)
    let message = ''
    try {
      await ProviderInstance.generateAuthToken(account, providerUrl)
    } catch (e) {
      message = (e as Error)?.message ?? ''
    }
    // Must fail specifically on the missing expiry — not silently pass on a nonce-lookup or
    // signedChallenge error (which would mean the node/test environment is misconfigured).
    expect(message.toLowerCase()).to.contain('validuntil')
  })

  it('should invalidate auth token', async () => {
    await sleep(100)
    const token = await ProviderInstance.generateAuthToken(account, providerUrl, {
      validUntil: Date.now() + 60 * 60 * 1000
    })
    expect(token).to.be.a('string')

    const invalidatedToken = await ProviderInstance.invalidateAuthToken(
      account,
      token,
      providerUrl
    )
    expect(invalidatedToken).to.be.a('object')
    expect(invalidatedToken.success).to.equal(true)
  })
})
