import { assert } from 'chai'
import { getTestConfig, provider } from '../config'
import { Config, Provider } from '../../src'
import { Signer } from 'ethers'
import { FileInfo } from '../../src/@types'

describe('Provider tests', async () => {
  let config: Config
  let signer: Signer
  let providerInstance: Provider

  before(async () => {
    signer = (await provider.getSigner(0)) as Signer
    config = await getTestConfig(signer)
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

  it('Alice checks URL fileinfo', async () => {
    const fileinfo: FileInfo[] = await providerInstance.getFileInfo(
      {
        type: 'url',
        url: 'https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-abstract.xml.gz-rss.xml',
        method: 'GET'
      },
      config.providerUri
    )
    assert(fileinfo[0].valid === true, 'Sent file is not valid')
  })

  it('Alice checks Arweave fileinfo', async () => {
    const fileinfo: FileInfo[] = await providerInstance.getFileInfo(
      {
        type: 'arweave',
        transactionId: 'a4qJoQZa1poIv5guEzkfgZYSAD0uYm7Vw4zm_tCswVQ'
      },
      config.providerUri
    )
    assert(fileinfo[0].valid === true, 'Sent file is not valid')
  })

  it('Alice tests compute environments', async () => {
    const computeEnvs = await providerInstance.getComputeEnvironments(config.providerUri)
    assert(computeEnvs, 'No Compute environments found')
  })

  it('Alice tests getNonce', async () => {
    const nonce = await providerInstance.getNonce(
      config.providerUri,
      '0xe2DD09d719Da89e5a3D0F2549c7E24566e947260'
    )
    assert(nonce, 'could not get nonce for the sent address')
  })
})
