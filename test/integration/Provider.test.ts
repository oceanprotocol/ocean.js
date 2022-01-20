import { Provider } from '../../src/provider/Provider'
import { assert } from 'chai'
import { fetchData, crossFetchGeneric } from '../../src/utils'
import { FileMetadata } from '../../src/@types'

describe('Provider tests', () => {
  let providerInstance: Provider

  it('Initialize Ocean', async () => {
    providerInstance = new Provider()
  })

  it('Alice tests invalid provider', async () => {
    const valid = await providerInstance.isValidProvider(
      'http://example.net',
      crossFetchGeneric
    )
    assert(valid === false)
  })

  it('Alice tests valid provider', async () => {
    const valid = await providerInstance.isValidProvider(
      'http://127.0.0.1:8030',
      crossFetchGeneric
    )
    assert(valid === true)
  })

  it('Alice checks fileinfo', async () => {
    const fileinfo: FileMetadata[] = await providerInstance.checkFileUrl(
      'https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-abstract.xml.gz-rss.xml',
      'http://127.0.0.1:8030',
      crossFetchGeneric
    )
    assert(fileinfo[0].valid === true, 'Sent file is not valid')
  })
})
