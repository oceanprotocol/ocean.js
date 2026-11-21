# Ocean.js Cheatsheet

## Prerequisites
- Git, Node.js, Docker
- Install Git: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
- Node.js: https://nodejs.org/en/download/
- Docker: https://docs.docker.com/get-docker/

### Installation & Usage

```bash
npm init
npm install @oceanprotocol/lib crypto-js ethers typescript @types/node ts-node
```

### Configuration

```bash
export NODE_URL='https://compute1.oceanprotocol.com'
export PRIVATE_KEY=<replace_me>
export RPC=<replace_me>
```

### Publish Flow

1. Define DDO object
```javascript

const genericAsset: DDO = {
    '@context': ['https://w3id.org/did/v1'],
    id: 'did:op',
    version: '4.1.0',
    chainId: 8996,
    nftAddress: '0x0',
    metadata: {
      created: '2021-12-20T14:35:20Z',
      updated: '2021-12-20T14:35:20Z',
      type: 'dataset',
      name: 'dataset-name',
      description: 'Ocean protocol test dataset description',
      author: 'oceanprotocol-team',
      license: 'MIT',
      tags: ['white-papers'],
      additionalInformation: { 'test-key': 'test-value' },
      links: ['http://data.ceda.ac.uk/badc/ukcp09/']
    },
    services: [
      {
        id: 'db164c1b981e4d2974e90e61bda121512e6909c1035c908d68933ae4cfaba6b0',
        type: 'access',
        files: '',
        datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
        serviceEndpoint: 'http://127.0.0.1:8001',
        timeout: 0
      }
    ]
  }
```
2. Create NFT + datatoken + dispenser/FRE:

```javascript

const { chainId } = await publisherAccount.provider.getNetwork()
    const factory = new NftFactory(
      addresses.ERC721Factory,
      publisherAccount,
      Number(chainId)
    )

    const nftParams: NftCreateData = {
      name: FRE_NFT_NAME,
      symbol: FRE_NFT_SYMBOL,
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: await publisherAccount.getAddress()
    }

    const datatokenParams: DatatokenCreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: await publisherAccount.getAddress(),
      mpFeeAddress: ZERO_ADDRESS
    }

    const freParams: FreCreationParams = {
      fixedRateAddress: addresses.FixedPrice,
      baseTokenAddress: addresses.Ocean,
      owner: await publisherAccount.getAddress(),
      marketFeeCollector: await publisherAccount.getAddress(),
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: '0.001',
      allowedConsumer: ZERO_ADDRESS,
      withMint: true
    }

    const bundleNFT = await factory.createNftWithDatatokenWithFixedRate(
      nftParams,
      datatokenParams,
      freParams
    )

```
### Consume Flow
As a prerequisite for this flow, publish flow needs to be executed before.
```javascript
const resolvedDDO = await aquarius.waitForIndexer(fixedDDO.id)
assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')

const config = new ConfigHelper().getConfig(Number(chainId))
// On a local/dev chain (8996) without ADDRESS_FILE, ConfigHelper may not populate contract
// addresses. Fall back to your deployment's FixedPrice only when it is missing; keep any
// address the config already supplied (e.g. on public networks).
if (!config.fixedRateExchangeAddress) config.fixedRateExchangeAddress = addresses.FixedPrice
const datatoken = new Datatoken(consumerAccount, Number(chainId))

// Optional: preview the provider fee before ordering. Advisory only — a malicious node/token can
// misreport it, so cross-check providerFeeAmount (base units) and never derive the ceiling from it.
const feePreview = await getProviderFees(resolvedDDO, consumerAccount, config, providerUrl)
// providerFeeAmountFormattedOk is false when the token's decimals() couldn't be read — the
// formatted value is then raw base units, so label it as such instead of as tokens.
const feeText = feePreview.providerFeeAmountFormattedOk
    ? `${feePreview.providerFeeAmountFormatted} ${feePreview.providerFeeToken}`
    : `${feePreview.providerFeeAmount} base units of ${feePreview.providerFeeToken} (token decimals unavailable)`
console.log(`Provider fee (advisory): ${feeText}`)

// The ceiling TOKEN must come from a source YOU trust (your dapp config / a known address), not
// from the node preview — otherwise the node picks which token you approve. Keep it nonzero.
const expectedFeeToken = addresses.Ocean // the token you expect to pay provider fees in

// orderAsset resolves pricing (fixed-rate / dispenser), handles the provider fee and places the
// order in one call. maxProviderFee is an opt-in ceiling: the order throws BEFORE any approval or
// transaction if the node asks for a different token, or more than the cap.
const orderTx = await orderAsset(
    resolvedDDO,
    consumerAccount,
    config,
    datatoken,
    providerUrl,
    undefined, // consumerAddress  (defaults to the signer)
    undefined, // consumeMarketOrderFee
    undefined, // providerFees     (fetched from the node)
    '0',       // consumeMarketFixedSwapFee
    0,         // datatokenIndex
    0,         // serviceIndex
    0,         // fixedRateIndex
    { providerFeeToken: expectedFeeToken, providerFeeAmount: '1' } // allow at most 1 expectedFeeToken
)
console.log(`Order started, tx: ${orderTx.hash}`)

const downloadURL = await ProviderInstance.getDownloadUrl(
      resolvedDDO.id,
      resolvedDDO.services[0].id,
      0,
      orderTx.hash,
      providerUrl,
      consumerAccount
    )

// Lets check that the download URL was successfully received
console.log(`Download URL: ${downloadURL}`)

```
For better UX, it is recommended to have installed VSCode extension.
### Get compute environments

```javascript


// Fetch compute envrionments first
const computeEnvs = await ProviderInstance.getComputeEnvironments(providerUrl)

```
For `free start compute` it is not necessary publish flow.


### Free Start Compute

```javascript

// Let's have 5 minute of compute access
const mytime = new Date()
const computeMinutes = 5
mytime.setMinutes(mytime.getMinutes() + computeMinutes)

// Let's prepare the dataset and algorithm assets to be used in the compute job
const assets: ComputeAsset[] = [
{
    documentId: resolvedDatasetDdo.id,
    serviceId: resolvedDatasetDdo.services[0].id
}
]

const algo: ComputeAlgorithm = {
documentId: resolvedAlgorithmDdo.id,
serviceId: resolvedAlgorithmDdo.services[0].id,
meta: resolvedAlgorithmDdo.metadata.algorithm
}

// Let's start the free compute job
const computeJobs = await ProviderInstance.freeComputeStart(
providerUrl,
consumerAccount,
computeEnv.id,
assets,
algo
)

```

### Paid Start Compute


```javascript


const mytime = new Date()
const computeMinutes = 5
mytime.setMinutes(mytime.getMinutes() + computeMinutes)
const computeValidUntil = Math.floor(mytime.getTime() / 1000)

const resources: ComputeResourceRequest[] = [
{
    id: 'cpu',
    amount: 2
},
{
    id: 'ram',
    amount: 2
},
{
    id: 'disk',
    amount: 0
}
]
const assets: ComputeAsset[] = [
{
    documentId: resolvedDatasetDdo.id,
    serviceId: resolvedDatasetDdo.services[0].id
}
]
const dtAddressArray = [resolvedDatasetDdo.services[0].datatokenAddress]
const algo: ComputeAlgorithm = {
    documentId: resolvedAlgorithmDdo.id,
    serviceId: resolvedAlgorithmDdo.services[0].id,
    meta: resolvedAlgorithmDdo.metadata.algorithm
}

const providerInitializeComputeResults = await ProviderInstance.initializeCompute(
    assets,
    algo,
    computeEnv.id,
    paymentToken,
    computeValidUntil,
    providerUrl,
    consumerAccount,
    resources,
    Number(chainId)
)
// Initialize payment contract
// chainId from provider.getNetwork() is a bigint, so convert it for ConfigHelper/EscrowContract.
const config = new ConfigHelper().getConfig(Number(chainId))
// On public networks ConfigHelper populates config.escrow. On a local/dev chain it is unset,
// so load the trusted escrow from your deployment (e.g. ocean-contracts' address.json) first,
// otherwise getAddress(config.escrow) below throws:
//   config.escrow = getAddress('<your deployed Escrow address>')
if (
    getAddress(providerInitializeComputeResults.payment.escrowAddress) !==
    getAddress(config.escrow)
) {
    throw new Error(
        'Escrow address returned by the node does not match the configured escrow'
    )
}
const escrow = new EscrowContract(
    getAddress(config.escrow),
    consumerAccount,
    Number(chainId),
    config
)
const amountToDeposit = (providerInitializeComputeResults.payment.amount * 2).toString()
const escrowValidation = await escrow.verifyFundsForEscrowPayment(
    paymentToken,
    computeEnv.consumerAddress,
    await unitsToAmount(consumerAccount, paymentToken, amountToDeposit),
    await unitsToAmount(consumerAccount, paymentToken, providerInitializeComputeResults.payment.amount.toString()),
    providerInitializeComputeResults.payment.minLockSeconds.toString(),
    '10'
)
// Abort before ordering if the escrow could not be validated/funded.
if (!escrowValidation.isValid) {
    throw new Error(escrowValidation.message)
}

algo.transferTxId = await handleOrder(
    providerInitializeComputeResults.algorithm,
    resolvedAlgorithmDdo.services[0].datatokenAddress,
    consumerAccount,
    computeEnv.consumerAddress,
    0
)
for (let i = 0; i < providerInitializeComputeResults.datasets.length; i++) {
    assets[i].transferTxId = await handleOrder(
        providerInitializeComputeResults.datasets[i],
        dtAddressArray[i],
        consumerAccount,
        computeEnv.consumerAddress,
        0
    )
}

const computeJobs = await ProviderInstance.computeStart(
    providerUrl,
    consumerAccount,
    computeEnv.id,
    assets,
    algo,
    computeValidUntil,
    paymentToken,
    resources,
    Number(chainId)
)
```

### Get compute job status

```javascript

const jobStatus = await ProviderInstance.computeStatus(
        providerUrl,
        await consumerAccount.getAddress(),
        computeJobId
      )
```

### Get download compute results URL

`getComputeResultUrl` is an HTTP-transport capability. Over a P2P node there is no URL for the
result — the protocol answers with the result bytes — so call `getComputeResult` (a streaming
generator) instead. Use `isP2pUri(providerUrl)` to branch.

```javascript

if (isP2pUri(providerUrl)) {
    // P2P node: no URL, the protocol streams the result bytes back.
    const stream = await ProviderInstance.getComputeResult(
        providerUrl,
        consumerAccount,
        computeJobId,
        0
    )
    const chunks = []
    for await (const chunk of stream) {
        chunks.push(chunk)
    }
    const result = Buffer.concat(chunks)
} else {
    // HTTP node: fetch a downloadable URL for the result.
    const downloadURL = await ProviderInstance.getComputeResultUrl(
        providerUrl,
        consumerAccount,
        computeJobId,
        0
    )
}


```

### Node resource metrics

Read a node's own per-node resource metrics. `getNodeMetrics` returns a live snapshot (CPU,
memory, disk, network, jobs, GPU, and per-env resources); `hasAggregate` is `false` when the node
has no fresh compute aggregate, so every scalar is a structural zero rather than a genuine reading.
`getNodeMetricsHistory` returns hourly averages over an optional `startTime`/`stopTime` range
(epoch ms or ISO-8601 strings; defaults to the node's retention window up to now). Both work over
HTTP and P2P. History is best-effort on the node side — a node without it returns `null`.

```javascript

// Live snapshot
const metrics = await ProviderInstance.getNodeMetrics(providerUrl)
console.log(metrics.hasAggregate, metrics.cpu.usagePercent, metrics.memory.usedBytes)

// Hourly history for the last 24h
const stopTime = Date.now()
const startTime = stopTime - 24 * 60 * 60 * 1000
const history = await ProviderInstance.getNodeMetricsHistory(
    providerUrl,
    startTime,
    stopTime
)
if (history) {
    console.log(`${history.count} hourly buckets`)
}


```

### Put a node in maintenance (admin)

Maintenance (drain) mode makes a node refuse new commitment (`computeStart`,
`freeComputeStart`, `initializeCompute`, `serviceStart`, `serviceExtend`) while jobs and
services that are already running carry on. The signer must be one of the node's admins.
Works over HTTP and P2P node URIs. `enabled` must be a real boolean.

```javascript
// start draining
const { maintenance } = await ProviderInstance.setMaintenance(providerUrl, adminSigner, true)

// observe: on a node that supports maintenance, `maintenance.enabled` is always present.
// Older nodes predate the feature and omit `maintenance` entirely, so the value can be
// absent — hence the optional chaining below. Running counts and the drain ETA (unix
// seconds) appear only in the node's detailed status.
const status = await ProviderInstance.getNodeStatus(providerUrl)
console.log(status?.maintenance?.enabled)

// resume
await ProviderInstance.setMaintenance(providerUrl, adminSigner, false)
```

### Detect a maintenance rejection

A guarded call on a draining node fails with HTTP 503 and `code: 'MAINTENANCE_MODE'`. The
error keeps its old JSON `message`, and now also exposes `httpStatus`, `code` and `body`.
Use `isMaintenanceError` rather than matching text (a 503 without that code is a different
problem, e.g. compute engines not configured).

```javascript
import { isMaintenanceError, MAINTENANCE_MODE_CODE } from '@oceanprotocol/lib'

try {
    await ProviderInstance.freeComputeStart(providerUrl, consumer, environmentId, datasets, algorithm)
} catch (e) {
    if (isMaintenanceError(e)) {
        console.log('Node is draining, pick another node:', e.httpStatus, e.code === MAINTENANCE_MODE_CODE)
    } else {
        throw e
    }
}
```
