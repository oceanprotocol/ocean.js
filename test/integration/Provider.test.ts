import { assert } from 'chai'
import { getTestConfig, provider } from '../config.js'
import {
  Config,
  ProviderInstance,
  isP2pUri,
  isMaintenanceError,
  PROTOCOL_COMMANDS
} from '../../src/index.js'
import { Signer, Wallet, ZeroAddress } from 'ethers'
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

  it('Alice tests getNodeMetrics', async () => {
    const metrics = await ProviderInstance.getNodeMetrics(config.oceanNodeUri)
    assert(metrics, 'No node metrics returned')
    assert(typeof metrics.collectedAt === 'number', 'metrics missing collectedAt')
    assert(typeof metrics.hasAggregate === 'boolean', 'metrics missing hasAggregate flag')
    assert(metrics.cpu, 'metrics missing cpu block')
    assert(
      typeof metrics.cpu.usagePercent === 'number',
      'metrics missing cpu.usagePercent'
    )
    assert(metrics.memory, 'metrics missing memory block')
    assert(metrics.jobs, 'metrics missing jobs block')
    assert(Array.isArray(metrics.gpu), 'metrics.gpu should be an array')
    assert(Array.isArray(metrics.env), 'metrics.env should be an array')
  })

  it('Alice tests getNodeMetricsHistory', async () => {
    // History is best-effort and gated on NODE_METRICS_HISTORY_ENABLED on the node side; when
    // disabled the node returns 503 and the SDK surfaces null. Tolerate both: a null result is a
    // valid "history not enabled" answer, otherwise validate the shape.
    const history = await ProviderInstance.getNodeMetricsHistory(config.oceanNodeUri)
    if (history === null) return
    assert(typeof history.startTime === 'number', 'history missing startTime')
    assert(typeof history.stopTime === 'number', 'history missing stopTime')
    assert(Array.isArray(history.buckets), 'history.buckets should be an array')
    assert(
      history.count === history.buckets.length,
      'history count must match buckets length'
    )
  })

  it('Alice tests getNodeMetricsHistory with an explicit range', async () => {
    const stopTime = Date.now()
    const startTime = stopTime - 24 * 60 * 60 * 1000 // last 24h
    const history = await ProviderInstance.getNodeMetricsHistory(
      config.oceanNodeUri,
      startTime,
      stopTime
    )
    if (history === null) return
    assert(
      history.startTime >= startTime,
      'returned startTime should be clamped within range'
    )
    assert(
      history.stopTime <= stopTime,
      'returned stopTime should be clamped within range'
    )
    assert(Array.isArray(history.buckets), 'history.buckets should be an array')
  })

  it('Alice tests getEscrowEvents with no filter', async () => {
    const events = await ProviderInstance.getEscrowEvents(config.oceanNodeUri)
    assert(Array.isArray(events), 'escrow events should be an array')
  })

  it('Alice tests getEscrowEvents eventType filter', async () => {
    const events = await ProviderInstance.getEscrowEvents(config.oceanNodeUri, {
      eventType: 'Deposit'
    })
    assert(Array.isArray(events), 'escrow events should be an array')
    for (const e of events) {
      assert(e.eventType === 'Deposit', `expected only Deposit rows, got ${e.eventType}`)
    }
  })

  it('Alice tests getEscrowEvents block range (store-side)', async () => {
    const events = await ProviderInstance.getEscrowEvents(config.oceanNodeUri, {
      ranges: { block: { min: 0, max: 1 } }
    })
    assert(Array.isArray(events), 'escrow events should be an array')
    for (const e of events) {
      assert(e.block >= 0 && e.block <= 1, `block ${e.block} outside [0,1]`)
    }
  })

  it('Alice tests getEscrowEvents rejects an unsupported range field', async () => {
    // A range on a non-range-filterable field makes the node answer 400, which the SDK
    // swallows to []. (gt/lt are dropped before the request on HTTP, so use `min` here.)
    const events = await ProviderInstance.getEscrowEvents(config.oceanNodeUri, {
      ranges: { payer: { min: 1 } }
    })
    assert(Array.isArray(events), 'should surface the node 400 as an empty array')
    assert(events.length === 0, 'an unsupported range field should yield no rows')
  })

  it('Alice tests getAllEscrowEvents returns an array', async () => {
    const events = await ProviderInstance.getAllEscrowEvents(config.oceanNodeUri, {
      eventType: 'Deposit'
    })
    assert(Array.isArray(events), 'all escrow events should be an array')
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

// Requires the barge node image to include ocean-node maintenance mode, and the signer
// (account 0) to be in the node's ALLOWED_ADMINS. Unit coverage lives in
// test/unit/MaintenanceMode.test.ts.
describe('Provider maintenance mode tests', function () {
  this.timeout(60000)
  let adminSigner: Signer
  let providerUrl: string

  before(async () => {
    adminSigner = (await provider.getSigner(0)) as Signer
    providerUrl = (await getTestConfig(adminSigner))?.oceanNodeUri
  })

  after(async () => {
    // never leave the shared node draining
    await ProviderInstance.setMaintenance(providerUrl, adminSigner, false)
  })

  it('enables maintenance and reports it in node status', async () => {
    const res = await ProviderInstance.setMaintenance(providerUrl, adminSigner, true)
    assert(
      res.maintenance === true,
      'setMaintenance(true) should return maintenance=true'
    )
    const status = await ProviderInstance.getNodeStatus(providerUrl)
    assert(status.maintenance?.enabled === true, 'status should show maintenance.enabled')
  })

  it('rejects new compute with a maintenance error', async () => {
    let thrown: any
    try {
      await ProviderInstance.freeComputeStart(
        providerUrl,
        adminSigner,
        'unused-env',
        [],
        { meta: { container: { image: 'x', tag: 'y', entrypoint: 'z' } } } as any
      )
    } catch (e) {
      thrown = e
    }
    // Assert OUTSIDE the catch so a thrown assertion is not swallowed by it.
    assert(
      thrown !== undefined,
      'freeComputeStart should be rejected while in maintenance'
    )
    assert(
      isMaintenanceError(thrown),
      `expected a maintenance error, got: ${thrown?.message}`
    )
  })

  it('disables maintenance again', async () => {
    const res = await ProviderInstance.setMaintenance(providerUrl, adminSigner, false)
    assert(res.maintenance === false)
    const status = await ProviderInstance.getNodeStatus(providerUrl)
    assert(status.maintenance?.enabled === false)
  })
})

describe('Provider admin commands tests', function () {
  this.timeout(120000)
  // The well-known Barge key for the address in the node's ALLOWED_ADMINS.
  const BARGE_ADMIN_KEY =
    '0xc594c6e5def4bab63ac29eed19a134c130388f74f019bc74b8f4389df2837a58'
  let adminSigner: Signer
  let providerUrl: string
  let status: any
  let isAdmin = false
  // Set true only once a test has actually asked the node to STOP its indexer, so the
  // teardown restarts it precisely when it was stopped — never just because we are admin.
  let indexerRestartNeeded = false

  before(async function () {
    const signer = (await provider.getSigner(0)) as Signer
    providerUrl = (await getTestConfig(signer))?.oceanNodeUri
    status = await ProviderInstance.getNodeStatus(providerUrl)
    const admins: string[] = (status?.allowedAdmins?.addresses || []).map((a: string) =>
      a.toLowerCase()
    )
    const signerAddress = (await signer.getAddress()).toLowerCase()
    if (admins.includes(signerAddress)) {
      adminSigner = signer
      isAdmin = true
    } else {
      const bargeAdmin = new Wallet(BARGE_ADMIN_KEY, provider)
      if (admins.includes(bargeAdmin.address.toLowerCase())) {
        adminSigner = bargeAdmin
        isAdmin = true
      }
    }
  })

  beforeEach(function () {
    if (!isAdmin) this.skip()
  })

  after(async () => {
    // Never leave the shared node's indexer stopped (mocha bail is on). Only restart it when a
    // test actually stopped it — a blanket restart on `isAdmin` could start an indexer the
    // node fixture never had running.
    if (isAdmin && indexerRestartNeeded) {
      try {
        await ProviderInstance.handleIndexingThread(
          providerUrl,
          adminSigner,
          'START_THREAD',
          8996
        )
      } catch (e) {
        // Fail loudly: a swallowed failure here leaves the shared indexer stopped for every
        // later test file, so reject the hook with context instead of only logging.
        throw new Error(`admin after-hook: failed to restart indexer (chain 8996): ${e}`)
      }
    }
  })

  it('getNodeDetailedStatus returns id and maintenance disabled', async () => {
    const detailed = await ProviderInstance.getNodeDetailedStatus(providerUrl)
    assert(detailed, 'No detailed status returned')
    assert(detailed.id, 'Detailed status missing id')
    assert(detailed.maintenance?.enabled === false, 'maintenance should be disabled')
  })

  it('getNodeConfig returns an object with a masked private key', async () => {
    const config = await ProviderInstance.getNodeConfig(providerUrl, adminSigner)
    assert(config && typeof config === 'object', 'config should be an object')
    assert(config.keys, 'config should include a keys block')
    const pk = config.keys.privateKey
    // the node returns a masked placeholder string, never the real 0x-prefixed key. Assert the
    // documented mask shape (present, a string, not the raw key) without ever putting the
    // returned value into a diagnostic message.
    assert(
      pk !== undefined && pk !== null,
      'config.keys.privateKey should be present (masked)'
    )
    assert(typeof pk === 'string', 'masked private key should be a string placeholder')
    assert(pk.length > 0, 'masked private key should be a non-empty placeholder')
    assert(!pk.startsWith('0x'), 'private key should be masked, not the raw 0x key')
  })

  it('setNodeConfig re-sends an existing harmless key unchanged', async function () {
    const config = await ProviderInstance.getNodeConfig(providerUrl, adminSigner)
    const forbidden = ['keys', 'supportedNetworks', 'allowedAdmins', 'dbConfig']
    const candidates = Object.keys(config).filter(
      (k) =>
        !forbidden.includes(k) &&
        (typeof config[k] === 'boolean' || typeof config[k] === 'number')
    )
    const key = candidates.includes('unsafeURLs') ? 'unsafeURLs' : candidates[0]
    if (!key) this.skip()
    const res = await ProviderInstance.setNodeConfig(providerUrl, adminSigner, {
      [key]: config[key]
    })
    assert(res && typeof res === 'object', 'setNodeConfig should return an object')
  })

  it('reindexTx returns a job descriptor', async function () {
    let txHash: string | undefined
    let blockNumber = await provider.getBlockNumber()
    while (!txHash && blockNumber >= 0) {
      const block = await provider.getBlock(blockNumber, false)
      if (block?.transactions?.length) txHash = block.transactions[0]
      blockNumber--
    }
    if (!txHash) this.skip()
    const res = await ProviderInstance.reindexTx(providerUrl, adminSigner, 8996, txHash)
    assert(typeof res.jobId === 'string', 'reindexTx should return a string jobId')
  })

  it('handleIndexingThread stops and restarts the indexer', async () => {
    // Mark the restart needed BEFORE the stop: if the STOP_THREAD reply is lost after the node
    // has already acted on it, the teardown still restores the indexer.
    indexerRestartNeeded = true
    await ProviderInstance.handleIndexingThread(
      providerUrl,
      adminSigner,
      'STOP_THREAD',
      8996
    )
    await ProviderInstance.handleIndexingThread(
      providerUrl,
      adminSigner,
      'START_THREAD',
      8996
    )
  })

  it('collectFees returns a transaction hash', async function () {
    const destination = await (await provider.getSigner(1)).getAddress()
    let res
    try {
      res = await ProviderInstance.collectFees(providerUrl, adminSigner, {
        chainId: 8996,
        tokenAddress: ZeroAddress,
        destinationAddress: destination,
        tokenAmount: '0.0001'
      })
    } catch (e: any) {
      if (/balance/i.test(e?.message || '')) this.skip()
      throw e
    }
    assert(/^0x[0-9a-f]{64}$/i.test(res.tx), 'collectFees should return a tx hash')
  })

  it('a non-admin is rejected with HTTP 400', async () => {
    const stranger = Wallet.createRandom()
    let thrown: any
    try {
      await ProviderInstance.getNodeConfig(providerUrl, stranger)
    } catch (e) {
      thrown = e
    }
    assert(thrown !== undefined, 'non-admin getNodeConfig should be rejected')
    assert(thrown.httpStatus === 400, `expected httpStatus 400, got ${thrown.httpStatus}`)
  })

  it('getNodeLog rejects for an unknown log id', async () => {
    let thrown: any
    try {
      await ProviderInstance.getNodeLog(providerUrl, adminSigner, 'does-not-exist')
    } catch (e) {
      thrown = e
    }
    assert(thrown !== undefined, 'getNodeLog should reject for an unknown id')
    // adminSigner is a valid admin, so this must be the node's own unknown-id rejection, not a
    // client-side auth failure. Prove the node actually answered (the lookup was reached) by
    // requiring a numeric httpStatus, and that it is not the signer/auth short-circuit.
    assert(
      typeof thrown.httpStatus === 'number',
      `expected the node to answer the log lookup, got ${thrown.message}`
    )
    assert(
      !String(thrown.message).includes('requires a signer'),
      'rejection must come from the node log lookup, not client-side auth'
    )
  })

  describe('read-only auth tokens', function () {
    let token: string

    // v2 tokens REQUIRE an explicit validUntil (epoch ms), capped at the node's maxTokenLifetime
    // (seconds). Keep tokens short-lived for the test run.
    const tokenValidUntil = () => {
      const maxMs = (status?.authTokenPolicy?.maxTokenLifetime || 300) * 1000
      return Date.now() + Math.min(5 * 60 * 1000, maxMs)
    }

    before(async function () {
      // Needs a node release with scoped auth tokens (ocean-node #1616).
      if (!isAdmin || !status?.authTokenPolicy) this.skip()
      // Scope the token to the two read-only admin commands these tests exercise.
      token = await ProviderInstance.generateAuthToken(adminSigner, providerUrl, {
        validUntil: tokenValidUntil(),
        scope: [PROTOCOL_COMMANDS.FETCH_CONFIG, PROTOCOL_COMMANDS.GET_LOGS]
      })
    })

    it('getNodeConfig accepts the token', async () => {
      const config = await ProviderInstance.getNodeConfig(providerUrl, token)
      assert(config && typeof config === 'object', 'config should be an object')
    })

    it('getNodeLog accepts the token (read-only admin, unknown id still rejects)', async () => {
      // An unscoped admin token is accepted for GET_LOGS; the node then rejects the unknown id,
      // proving the token authenticated (a token-rejection would surface before the lookup).
      let thrown: any
      try {
        await ProviderInstance.getNodeLog(providerUrl, token, 'does-not-exist')
      } catch (e) {
        thrown = e
      }
      assert(thrown !== undefined, 'getNodeLog should reject an unknown id')
      assert(
        !String(thrown.message).includes('requires a signer'),
        'the token must be accepted, not rejected client-side'
      )
      // Prove the node authenticated the token and reached the log lookup (it answered with a
      // status), rather than failing earlier.
      assert(
        typeof thrown.httpStatus === 'number',
        `expected the node to answer the log lookup, got ${thrown.message}`
      )
    })

    it('a token scoped to getLogs only is rejected by getNodeConfig', async () => {
      // Mint a token whose scope is GET_LOGS only, then use it for fetchConfig: the node must
      // reject the out-of-scope command.
      const logsOnly = await ProviderInstance.generateAuthToken(
        adminSigner,
        providerUrl,
        {
          validUntil: tokenValidUntil(),
          scope: [PROTOCOL_COMMANDS.GET_LOGS]
        }
      )
      let thrown: any
      try {
        await ProviderInstance.getNodeConfig(providerUrl, logsOnly)
      } catch (e) {
        thrown = e
      }
      assert(
        thrown !== undefined,
        'a getLogs-scoped token must be rejected for the fetchConfig command'
      )
    })

    it('a mutating call with the token is rejected client-side', async () => {
      let thrown: any
      try {
        await ProviderInstance.setNodeConfig(providerUrl, token, {})
      } catch (e) {
        thrown = e
      }
      assert(thrown !== undefined, 'setNodeConfig with a token should be rejected')
      assert(
        String(thrown.message).includes('requires a signer'),
        `unexpected error: ${thrown.message}`
      )
    })
  })
})
