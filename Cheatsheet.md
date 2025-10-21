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
const fixedRate = new FixedRateExchange(freAddress, consumerAccount, Number(chainId))
await fixedRate.buyDatatokens(freId, '1', '2')

const resolvedDDO = await aquarius.waitForIndexer(fixedDDO.id)
assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')

// Initialize - obtain proof for ordering assets

const initializeData = await ProviderInstance.initialize(
    resolvedDDO.id,
    resolvedDDO.services[0].id,
    0,
    await consumerAccount.getAddress(),
    providerUrl
)

const providerFees: ProviderFees = {
    providerFeeAddress: initializeData.providerFee.providerFeeAddress,
    providerFeeToken: initializeData.providerFee.providerFeeToken,
    providerFeeAmount: initializeData.providerFee.providerFeeAmount,
    v: initializeData.providerFee.v,
    r: initializeData.providerFee.r,
    s: initializeData.providerFee.s,
    providerData: initializeData.providerFee.providerData,
    validUntil: initializeData.providerFee.validUntil
}
// Starting order after retriving provider fees
const tx = await datatoken.startOrder(
    freDatatokenAddress,
    await consumerAccount.getAddress(),
    0,
    providerFees
)
const orderTx = await tx.wait()
const orderStartedTx = getEventFromTx(orderTx, 'OrderStarted')
console.log(`Order started, tx: ${orderStartedTx.transactionHash}`)

const downloadURL = await ProviderInstance.getDownloadUrl(
      fixedDDO.id,
      fixedDDO.services[0].id,
      0,
      orderStartedTx.transactionHash,
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
const escrow = new EscrowContract(
    getAddress(providerInitializeComputeResults.payment.escrowAddress),
    consumerAccount
)
const amountToDeposit = (providerInitializeComputeResults.payment.amount * 2).toString()
await escrow.verifyFundsForEscrowPayment(
    paymentToken,
    computeEnv.consumerAddress,
    await unitsToAmount(consumerAccount, paymentToken, amountToDeposit),
    providerInitializeComputeResults.payment.amount.toString(),
    providerInitializeComputeResults.payment.minLockSeconds.toString(),
    '10'
)

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

```javascript

const downloadURL = await ProviderInstance.getComputeResultUrl(
        providerUrl,
        consumerAccount,
        computeJobId,
        0
    )


```