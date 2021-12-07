import config from './config'
import { Provider } from '../../src/provider/Provider'
import { assert } from 'chai'
import { fetchData } from '../../src/utils'

describe('Provider tests', () => {
  let providerInstance: Provider

  it('Initialize Ocean', async () => {
    providerInstance = new Provider()
  })

  it('Alice tests invalid provider', async () => {
    const valid = await providerInstance.isValidProvider('http://example.net', fetchData)
    assert(valid === false)
  })

  it('Alice tests valid provider', async () => {
    const valid = await providerInstance.isValidProvider(
      'http://127.0.0.1:8030',
      fetchData
    )
    assert(valid === true)
  })
})
