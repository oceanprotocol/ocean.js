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

  it('Alice tests getNodeJobs hits the real /jobs/:job route, not a 404', async function () {
    // getNodeJobs() swallows both "no jobs" and a 404 into the same [] (see
    // HttpProvider.getNodeJobs's catch block), so the assertion above can't tell a working
    // route from a broken one. Hit the exact URL the SDK builds directly to prove the
    // hardcoded '/api/services/jobs/:job' path (the node's own required, non-optional param -
    // confirmed by running its real route handler in isolation) still resolves against a live
    // node instead of regressing to a 404.
    if (isP2pUri(providerUrl)) this.skip()
    const response = await fetch(
      `${providerUrl.replace(/\/+$/, '')}/api/services/jobs/:job`
    )
    assert(
      response.ok,
      `expected the jobs route to resolve (200), got ${response.status}`
    )
    const body = await response.json()
    assert(Array.isArray(body.jobs), 'response body should contain a jobs array')
  })

  it('Alice confirms /api/services/jobs without :job 404s against a live node', async function () {
    // The other half of the story: the node registers this route with a REQUIRED param
    // (`/jobs/:job`, not `/jobs/:job?`), so dropping the segment entirely isn't an option -
    // it 404s. This is why the SDK sends the literal placeholder above instead of just
    // omitting it. Proven here against a live node, not just an isolated route probe.
    if (isP2pUri(providerUrl)) this.skip()
    const response = await fetch(`${providerUrl.replace(/\/+$/, '')}/api/services/jobs`)
    assert(
      response.status === 404,
      `expected a 404 without the :job segment, got ${response.status}`
    )
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
  const fileContent = `persistent-storage-content-${Date.now()}`

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
        yield isP2pUri(nodeUri) ? new TextEncoder().encode(fileContent) : fileContent
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

  it('downloads the uploaded file bytes', async () => {
    const stream = await ProviderInstance.downloadPersistentStorageFile(
      nodeUri,
      ownerSigner,
      bucketId,
      fileName
    )
    const chunks: Uint8Array[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    const downloaded = new TextDecoder().decode(Buffer.concat(chunks))
    assert(downloaded === fileContent, 'Downloaded bytes do not match uploaded content')
  })

  it('creates a bucket with a label and renames it', async () => {
    const created = await ProviderInstance.createPersistentStorageBucket(
      nodeUri,
      ownerSigner,
      {
        accessLists: [],
        label: 'oceanjs-label'
      }
    )
    assert(created?.bucketId, 'Bucket id was not returned')
    assert(created?.label === 'oceanjs-label', 'Bucket label was not returned')

    const renamed = await ProviderInstance.updatePersistentStorageBucket(
      nodeUri,
      ownerSigner,
      created.bucketId,
      'oceanjs-renamed'
    )
    assert(renamed?.label === 'oceanjs-renamed', 'Rename did not return the new label')

    const buckets = await ProviderInstance.getPersistentStorageBuckets(
      nodeUri,
      ownerSigner,
      ownerAddress
    )
    const found = buckets.find((bucket) => bucket.bucketId === created.bucketId)
    assert(found?.label === 'oceanjs-renamed', 'Renamed label not reflected in list')
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
      ownerAddress
    )
    assert(
      buckets.some((bucket) => bucket.bucketId === bucketId),
      'Created bucket is missing from owner list'
    )

    const deleted = await ProviderInstance.deletePersistentStorageFile(
      nodeUri,
      ownerSigner,
      bucketId,
      fileName
    )
    assert(deleted?.success === true, 'Delete did not return success=true')
  })
})
