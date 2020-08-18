import Account from '../../../src/ocean/Account'
import { Provider } from '../../../src/provider/Provider'
import { noZeroX } from '../../../src/utils'
import { ComputeJob } from '../../../src/ocean/interfaces/ComputeJob'
import { Output } from '../../../src/ocean/interfaces/ComputeOutput'
import { MetadataAlgorithm } from '../../../src/ddo/interfaces/MetadataAlgorithm'

export default class ProviderMock extends Provider {
  public async compute(
    method: string,
    did: string,
    consumerAccount: Account,
    algorithmDid?: string,
    algorithmMeta?: MetadataAlgorithm,
    jobId?: string,
    output?: Output,
    txId?: string,
    serviceIndex?: string,
    serviceType?: string,
    tokenAddress?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const address = consumerAccount.getId()

    let signatureMessage = address
    signatureMessage += jobId || ''
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    const signature = await this.createHashSignature(consumerAccount, signatureMessage)

    // construct Brizo URL
    let url = this.getComputeEndpoint()
    url += `?signature=${signature}`
    url += `&documentId=${noZeroX(did)}`
    url += (output && `&output=${JSON.stringify(output)}`) || ''
    url += (algorithmDid && `&algorithmDid=${algorithmDid}`) || ''
    url +=
      (algorithmMeta &&
        `&algorithmMeta=${encodeURIComponent(JSON.stringify(algorithmMeta))}`) ||
      ''
    url += (jobId && `&jobId=${jobId}`) || ''
    url += `&consumerAddress=${address}`
    url += `&transferTxId=${txId}` || ''
    url += `&serviceId=${serviceIndex}` || ''
    url += `&serviceType=${serviceType}` || ''
    url += `&dataToken=${tokenAddress}` || ''
    url += `&consumerAddress=${consumerAccount.getId()}` || ''

    // switch fetch method
    let fetch

    switch (method) {
      case 'post': // start
        fetch = Promise.resolve({
          jobId: '0x1111:001',
          status: 1,
          statusText: 'Job started'
        })
        break
      case 'put': // stop
        fetch = Promise.resolve([
          {
            status: 7,
            statusText: 'Job stopped'
          }
        ])
        break
      case 'delete':
        fetch = Promise.resolve([
          {
            status: 8,
            statusText: 'Job deleted successfully'
          }
        ])
        break
      default:
        // status
        fetch = Promise.resolve([
          {
            owner: '0x1111',
            documentId: 'did:op:2222',
            jobId: '3333',
            dateCreated: '2020-10-01T01:00:00Z',
            dateFinished: '2020-10-01T01:00:00Z',
            status: 5,
            statusText: 'Job finished',
            algorithmLogUrl: 'http://example.net/logs/algo.log',
            resultsUrls: [
              'http://example.net/logs/output/0',
              'http://example.net/logs/output/1'
            ],
            resultsDid:
              'did:op:87bdaabb33354d2eb014af5091c604fb4b0f67dc6cca4d18a96547bffdc27bcf'
          },
          {
            owner: '0x1111',
            documentId: 'did:op:2222',
            jobId: '3334',
            dateCreated: '2020-10-01T01:00:00Z',
            dateFinished: '2020-10-01T01:00:00Z',
            status: 5,
            statusText: 'Job finished',
            algorithmLogUrl: 'http://example.net/logs2/algo.log',
            resultsUrls: [
              'http://example.net/logs2/output/0',
              'http://example.net/logs2/output/1'
            ],
            resultsDid: ''
          }
        ])
        break
    }
    return await fetch
  }
}
