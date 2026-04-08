import { assert } from 'chai'
import { getTestConfig, provider } from '../config.js'
import { Config, ProviderInstance } from '../../src/index.js'
import { Signer } from 'ethers'
import { FileInfo } from '../../src/@types/index.js'

describe('Provider tests', async () => {
  let config: Config
  let signer: Signer

  before(async () => {
    signer = (await provider.getSigner(0)) as Signer
    config = await getTestConfig(signer)
  })

  it('Initialize Ocean', async () => {
    // ProviderInstance is the shared singleton, already warmed up by _P2PWarmup for P2P mode
  })

  it('Alice tests invalid provider', async () => {
    const valid = await ProviderInstance.isValidProvider('http://example.net')
    assert(valid === false)
  })

  it('Alice tests valid provider', async () => {
    const valid = await ProviderInstance.isValidProvider(config.oceanNodeUri)
    assert(valid === true)
  })

  it('Alice checks URL fileinfo', async () => {
    const fileinfo: FileInfo[] = await ProviderInstance.getFileInfo(
      {
        type: 'url',
        url: 'https://raw.githubusercontent.com/oceanprotocol/ocean.js/refs/heads/main/README.md',
        method: 'GET'
      },
      config.oceanNodeUri
    )
    assert(fileinfo[0].valid === true, 'Sent file is not valid')
  })

  it('Alice checks Arweave fileinfo', async () => {
    const fileinfo: FileInfo[] = await ProviderInstance.getFileInfo(
      {
        type: 'arweave',
        transactionId: 'a4qJoQZa1poIv5guEzkfgZYSAD0uYm7Vw4zm_tCswVQ'
      },
      config.oceanNodeUri
    )
    assert(fileinfo[0].valid === true, 'Sent file is not valid')
  })

  it('Alice tests compute environments', async () => {
    const computeEnvs = await ProviderInstance.getComputeEnvironments(config.oceanNodeUri)
    assert(computeEnvs, 'No Compute environments found')
  })

  it('Alice tests getNodeStatus', async () => {
    const status = await ProviderInstance.getNodeStatus(config.oceanNodeUri)
    assert(status, 'No status returned')
    assert(status.providerAddress, 'Status missing provider address')
    assert(status.nodeId, 'Status missing nodeId')
    assert(Array.isArray(status.chainIds), 'Status missing chainIds')
  })

  it('Alice tests getNodeJobs', async () => {
    const jobs = await ProviderInstance.getNodeJobs(config.oceanNodeUri)
    assert(Array.isArray(jobs), 'Jobs should be an array')
  })

  it('Alice tests getNonce', async () => {
    const nonce = await ProviderInstance.getNonce(
      config.oceanNodeUri,
      '0xBE5449a6A97aD46c8558A3356267Ee5D2731ab5e'
    )
    console.log('Nonce: ', nonce)
    assert(nonce, 'could not get nonce for the sent address')
  })
})
