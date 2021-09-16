import { Ocean } from '../../src/ocean/Ocean'
import config from './config'
import { assert } from 'chai'

describe('Provider tests', () => {
  let ocean: Ocean

  it('Initialize Ocean', async () => {
    ocean = await Ocean.getInstance(config)
  })
  it('Alice tests invalid provider', async () => {
    const valid = await ocean.provider.isValidProvider('http://example.net')
    assert(valid === false)
  })
  it('Alice tests valid provider', async () => {
    const valid = await ocean.provider.isValidProvider('http://127.0.0.1:8030')
    assert(valid === true)
  })
  it('Alice should be able to get computeLimits', async () => {
    const computeLimits = await ocean.provider.computeLimits
    assert(computeLimits.algoTimeLimit, 'Invalid algoTimeLimits')
    assert(computeLimits.storageExpiry, 'Invalid storageExpiry')
  })
  it('Check a valid URL', async () => {
    const url = 'https://s3.amazonaws.com/testfiles.oceanprotocol.com/info.0.json'
    const response = await ocean.provider.fileinfo(url)
    assert(response[0].contentLength === '1161')
    assert(response[0].contentType === 'application/json')
  })
  it('Check a invalid URL', async () => {
    const url = 'https://s3.amazonaws.com/testfiles.oceanprotocol.com/nosuchfile'
    const response = await ocean.provider.fileinfo(url)
    assert(response[0].contentLength === undefined)
    assert(response[0].contentType === undefined)
  })
})
