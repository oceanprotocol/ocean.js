import { assert } from 'chai'
import { web3, getTestConfig } from '../config'
import { Config, Provider } from '../../src'
import { FileMetadata } from '../../src/@types'

describe('Provider tests', async () => {
  let config: Config
  let providerInstance: Provider

  before(async () => {
    config = await getTestConfig(web3)
  })

  it('Initialize Ocean', async () => {
    providerInstance = new Provider()
  })

  it('Alice tests invalid provider', async () => {
    const valid = await providerInstance.isValidProvider('http://example.net')
    assert(valid === false)
  })

  it('Alice tests valid provider', async () => {
    const valid = await providerInstance.isValidProvider(config.providerUri)
    assert(valid === true)
  })

  it('Alice checks fileinfo', async () => {
    const fileinfo: FileMetadata[] = await providerInstance.checkFileUrl(
      'https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-abstract.xml.gz-rss.xml',
      config.providerUri
    )
    assert(fileinfo[0].valid === true, 'Sent file is not valid')
  })
})
