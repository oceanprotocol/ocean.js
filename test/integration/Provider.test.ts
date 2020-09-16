import { Ocean } from '../../src/ocean/Ocean'
import config from './config'
import { assert } from 'console'

describe('Provider tests', () => {
  let ocean
  it('Initialize Ocean', async () => {
    ocean = await Ocean.getInstance(config)
  })
  it('Alice tests invalid provider', async () => {
    const valid = ocean.provider.isValidProvider('http://example.net')
    assert(valid === false)
  })
  it('Alice tests valid provider', async () => {
    const valid = ocean.provider.isValidProvider('http://127.0.0.1:8030')
    assert(valid === true)
  })
})
