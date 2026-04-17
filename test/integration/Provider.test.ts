import { assert } from 'chai'
import { getTestConfig, provider } from '../config.js'
import { Config, ProviderInstance, isP2pUri } from '../../src/index.js'
import { Signer } from 'ethers'
import { FileInfo } from '../../src/@types/index.js'

describe('Provider tests', async () => {
  let config: Config
  let signer: Signer
  let providerUrl

  before(async () => {
    signer = (await provider.getSigner(0)) as Signer
    config = await getTestConfig(signer)
    providerUrl = config?.oceanNodeUri
  })

  it('Initialize Ocean', async () => {
    // ProviderInstance is the shared singleton, already warmed up by _P2PWarmup for P2P mode
  })

  it('Alice tests invalid provider', async () => {
    const valid = await ProviderInstance.isValidProvider('http://example.net')
    assert(valid === false)
  })

  it('Alice tests valid provider', async () => {
    const valid = await ProviderInstance.isValidProvider(providerUrl)
    assert(valid === true)
  })

  it('Alice checks URL fileinfo', async () => {
    const fileinfo: FileInfo[] = await ProviderInstance.getFileInfo(
      {
        type: 'url',
        url: 'https://raw.githubusercontent.com/oceanprotocol/ocean.js/refs/heads/main/README.md',
        method: 'GET'
      },
      providerUrl
    )
    assert(fileinfo[0].valid === true, 'Sent file is not valid')
  })

  it('Alice checks Arweave fileinfo', async () => {
    const fileinfo: FileInfo[] = await ProviderInstance.getFileInfo(
      {
        type: 'arweave',
        transactionId: 'a4qJoQZa1poIv5guEzkfgZYSAD0uYm7Vw4zm_tCswVQ'
      },
      providerUrl
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
    assert(status.id, 'Status missing id')
    assert(status.address, 'Status missing address')
    assert(status.version, 'Status missing version')
    assert(Array.isArray(status.provider), 'Status missing provider array')
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
    assert(typeof nonce === 'number', 'could not get nonce for the sent address')
    assert(nonce >= 0, 'nonce must be >= 0')
  })
})

describe('Provider persistent storage tests', function () {
  this.timeout(60000)
  let config: Config
  let ownerSigner: Signer
  let deniedSigner: Signer
  let ownerAddress: string
  let chainId: number
  let providerUrl

  let nodeUri: string
  let bucketId: string
  const fileName = `oceanjs-persistent-storage-${Date.now()}.txt`

  before(async () => {
    ownerSigner = (await provider.getSigner(0)) as Signer
    deniedSigner = (await provider.getSigner(1)) as Signer
    config = await getTestConfig(ownerSigner)
    ownerAddress = await ownerSigner.getAddress()
    chainId = Number((await ownerSigner.provider?.getNetwork())?.chainId)
    providerUrl = config?.oceanNodeUri
    nodeUri = providerUrl
    const status = await ProviderInstance.getNodeStatus(providerUrl)
    if (!status.persistentStorage) {
      ;(this as any).skip()
    }
  })

  it('create bucket -> upload -> list -> get object', async () => {
    const created = await ProviderInstance.createPersistentStorageBucket(
      nodeUri,
      ownerSigner,
      {
        accessLists: []
      }
    )
    assert(created?.bucketId, 'Bucket id was not returned')
    ;({ bucketId } = created)

    await ProviderInstance.uploadPersistentStorageFile(
      nodeUri,
      ownerSigner,
      bucketId,
      fileName,
      (async function* () {
        yield isP2pUri(nodeUri)
          ? new TextEncoder().encode(`persistent-storage-${Date.now()}`)
          : `persistent-storage-${Date.now()}`
      })()
    )

    const files = await ProviderInstance.listPersistentStorageFiles(
      nodeUri,
      ownerSigner,
      bucketId
    )
    assert(
      files.some((f) => f.name === fileName),
      'Uploaded file is missing from list'
    )

    const fileObject = await ProviderInstance.getPersistentStorageFileObject(
      nodeUri,
      ownerSigner,
      bucketId,
      fileName
    )
    assert(
      fileObject?.type === 'nodePersistentStorage',
      'Invalid persistent file object type'
    )
    assert(fileObject?.bucketId === bucketId, 'File object has wrong bucket id')
    assert(fileObject?.fileName === fileName, 'File object has wrong file name')
  })

  it('denies a non-owner not in bucket ACL', async () => {
    let denied = false
    try {
      await ProviderInstance.listPersistentStorageFiles(nodeUri, deniedSigner, bucketId)
    } catch {
      denied = true
    }
    assert(denied, 'Expected unauthorized signer to be denied by bucket ACL')
  })

  it('lists owner buckets and deletes uploaded file', async () => {
    const buckets = await ProviderInstance.getPersistentStorageBuckets(
      nodeUri,
      ownerSigner,
      ownerAddress,
      chainId
    )
    assert(
      buckets.some((bucket) => bucket.bucketId === bucketId),
      'Created bucket is missing from owner list'
    )

    const deleted = await ProviderInstance.deletePersistentStorageFile(
      nodeUri,
      ownerSigner,
      bucketId,
      fileName,
      chainId
    )
    assert(deleted?.success === true, 'Delete did not return success=true')
  })
})
