import { Signer } from 'ethers'
import { getTestConfig, provider } from '../config'
import { ProviderInstance } from '../../src'
import { expect } from 'chai'

describe('Auth token tests', async () => {
  let account
  let config
  let providerUrl

  before(async () => {
    account = (await provider.getSigner(0)) as Signer
    config = await getTestConfig(account)
    if (process.env.NODE_URL) {
      config.oceanNodeUri = process.env.NODE_URL
    }
    providerUrl = config?.oceanNodeUri
  })

  it('should generate auth token', async () => {
    const token = await ProviderInstance.generateAuthToken(account, providerUrl)
    expect(token).to.be.a('string')
  })

  it('should invalidate auth token', async () => {
    const token = await ProviderInstance.generateAuthToken(account, providerUrl)
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
