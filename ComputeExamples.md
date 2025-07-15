# Compute-to-Data (C2D) Code Examples

Here are the steps:

0. [Prerequisites](#0-prerequisites)
1. [Initialize services](#1-initialize-services)
2. [Create a new node.js project](#2-create-a-new-nodejs-project-with-typescript)
3. [Install dependencies](#3-install-dependencies)
4. [Import dependencies and add variables and constants](#4-import-dependencies-and-add-variables-constants-and-helper-methods)
5. [Initialize accounts and deploy contracts](#-initialize-accounts-and-deploy-contracts)
6. [Publish a dataset and  an algorithm](#6-publish-assets-dataset-and-algorithm)
7. [Resolve published datasets and algorithms](#7-resolve-assets)
8. [Send datatokens to consumer](#8-send-datatokens-to-consumer)
9. [Consumer fetches compute environment](#9-get-compute-environments)
10. [Consumer starts a free compute job using a free C2D environment](#10-consumer-starts-a-compute-job)
11. [Check compute status and get download compute results url](#11-check-compute-status-and-get-download-compute-results-url)
12. [Consumer starts a paid compute job](#12-consumer-starts-a-paid-compute-job)
13. [Check paid compute job status and get download compute results URL](#13-check-paid-compute-job-status-and-get-download-compute-results-url)

Let's go through each step.

## 0. Prerequisites
Before we start it is important that you have all of the necessary prerequisites installed on your computer.
- **A Unix based operating system (Linux or Mac)**. If you are a Windows user you can try to run linux inside a virtual machine but this is outside of the scope of this article.
- **Git**. Instructions for installing Git can be found here: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
- **Node.js** can be downloaded from here: https://nodejs.org/en/download/
- **Docker** can be installed from here: https://docs.docker.com/get-docker/. Please note that Docker must run as a non-root user, you can set this up by following these instructions: https://docs.docker.com/engine/install/linux-postinstall/

## 1. Initialize services

Ocean.js uses off-chain services for metadata (Aquarius) and consuming datasets (Provider).

We start by initializing the services. To do this, we clone the Barge repository and run it. This will run the current default versions of [Aquarius](https://github.com/oceanprotocol/aquarius), [Provider](https://github.com/oceanprotocol/provider), and [Ganache](https://github.com/trufflesuite/ganache) with [our contracts](https://github.com/oceanprotocol/contracts) deployed to it.

```bash
git clone https://github.com/oceanprotocol/barge.git
cd barge/
./start_ocean.sh --with-provider2 --no-dashboard --with-c2d
```

## 2. Create a new Node.js project with TypeScript

Start by creating a new Node.js project. Open a new terminal and enter the following commands:

```bash
mkdir compute-quickstart
cd compute-quickstart
npm init
# Answer the questions in the command line prompt
touch compute.ts
# On linux press CTRL + D to save
```

Next, we need to setup our TypeScript compiler options. Create a new file called `tsconfig.json` in the root of the `compute-quickstart` directory.

```bash
touch tsconfig.json
# Copy the following json content into the file, On linux press CTRL + D to save
```

```json
{
  "compilerOptions": {
    "lib": ["es6", "es7"],
    "module": "CommonJS",
    "target": "ES5",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "outDir": "./dist/",
    "declaration": true,
    "declarationDir": "./dist/"
  },
  "include": [
    "compute.ts"
  ],
  "exclude": [ "node_modules", "dist" ]
}
```

Now you can compile your TypeScript project.
If you have TypeScript installed use the following command:

```bash
tsc
```

If you don't have TypeScript installed you can install it using the command below and then compile using the above command:

```bash
npm install -g typescript
```

Or if you don't want to install TypeScript use the following command to compile your file:
```bash
npx tsc compute.ts
```

To run your script as we go along, compile the script then you can use the following command:

```bash
node dist/compute.js
```

## 3. Install dependencies

Install dependencies running the following command in your terminal:

```bash
npm install @oceanprotocol/lib crypto-js ethers@5.7.2 typescript @types/node ts-node
```

## 4. Import dependencies and add variables, constants and helper methods

Now open the `compute.ts` file in your text editor.

### 4.1. Dependencies

Start by importing all of the necessary dependencies

```Typescript
import fs from 'fs'
import { homedir } from 'os'

import { ethers, providers, Signer } from 'ethers'
import {
  ProviderInstance,
  Aquarius,
  NftFactory,
  Datatoken,
  Nft,
  ZERO_ADDRESS,
  transfer,
  sleep,
  approveWei,
  ProviderComputeInitialize,
  ConsumeMarketFee,
  ComputeAlgorithm,
  ComputeAsset,
  Config,
  Files,
  NftCreateData,
  DatatokenCreateParams,
  sendTx,
  configHelperNetworks,
  ConfigHelper,
  getEventFromTx,
  amountToUnits,
  isDefined,
  ComputeResourceRequest,
  unitsToAmount
} from '../../src/index.js'
import crypto from 'crypto-js'
import { DDO } from '@oceanprotocol/ddo-js'
import { EscrowContract } from '../../src/contracts/Escrow.js'
const { SHA256 } = crypto
```

### 4.2. Constants and variables

 We will need two files to publish, one as dataset and one as algorithm, so here we define the files that we intend to publish.
```Typescript
const DATASET_ASSET_URL: Files = {
  datatokenAddress: '0x0',
  nftAddress: '0x0',
  files: [
    {
      type: 'url',
      url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
      method: 'GET'
    }
  ]
}

const ALGORITHM_ASSET_URL: Files = {
  datatokenAddress: '0x0',
  nftAddress: '0x0',
  files: [
    {
      type: 'url',
      url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
      method: 'GET'
    }
  ]
}
```

Next, we define the metadata for the dataset and algorithm that will describe our data assets. This is what we call the DDOs
```Typescript
const DATASET_DDO: DDO = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
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
    license: 'https://market.oceanprotocol.com/terms',
    additionalInformation: {
      termsAndConditions: true
    }
  },
  services: [
    {
      id: '1155995dda741e93afe4b1c6ced2d01734a6ec69865cc0997daf1f4db7259a36',
      type: 'compute',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'http://127.0.0.1:8001',
      timeout: 300,
      compute: {
        publisherTrustedAlgorithmPublishers: ['*'] as any,
        publisherTrustedAlgorithms: [
          {
            did: '*',
            filesChecksum: '*',
            containerSectionChecksum: '*'
          }
        ] as any,
        allowRawAlgorithm: false,
        allowNetworkAccess: true
      }
    }
  ]
}

const ALGORITHM_DDO: DDO = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
  chainId: 8996,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'algorithm',
    name: 'algorithm-name',
    description: 'Ocean protocol test algorithm description',
    author: 'oceanprotocol-team',
    license: 'https://market.oceanprotocol.com/terms',
    additionalInformation: {
      termsAndConditions: true
    },
    algorithm: {
      language: 'Node.js',
      version: '1.0.0',
      container: {
        entrypoint: 'node $ALGO',
        image: 'ubuntu',
        tag: 'latest',
        checksum:
          'sha256:2d7ecc9c5e08953d586a6e50c29b91479a48f69ac1ba1f9dc0420d18a728dfc5'
      }
    }
  },
  services: [
    {
      id: 'db164c1b981e4d2974e90e61bda121512e6909c1035c908d68933ae4cfaba6b0',
      type: 'access',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'http://127.0.0.1:8001',
      timeout: 300
    }
  ]
}
```

Now we define the variables which we will need later
```Typescript
let config: Config
let aquariusInstance: Aquarius
let datatoken: Datatoken
let providerUrl: string
let publisherAccount: Signer
let consumerAccount: Signer
let addresses
let computeEnvs

let datasetId: string
let algorithmId: string
let resolvedDatasetDdo: DDO
let resolvedAlgorithmDdo: DDO

let computeJobId: string
let agreementId: string

let computeRoutePath: string
let hasFreeComputeSupport: boolean
```

### 4.3 Helper methods

Now we define the helper methods which we will use later to publish the dataset and algorithm, and also order them

Add a `createAssetHelper()`function.
```Typescript
async function createAssetHelper(
  name: string,
  symbol: string,
  owner: Signer,
  assetUrl: Files,
  ddo: DDO,
  providerUrl: string
) {
  const nft = new Nft(owner, (await owner.provider.getNetwork()).chainId)

  const nftFactory = new NftFactory(
    addresses.ERC721Factory,
    owner,
    await owner.getChainId()
  )

  const chain = (await owner.provider.getNetwork()).chainId

  ddo.chainId = parseInt(chain.toString(10))
  const nftParamsAsset: NftCreateData = {
    name,
    symbol,
    templateIndex: 1,
    tokenURI: 'aaa',
    transferable: true,
    owner: await owner.getAddress()
  }
  const datatokenParams: DatatokenCreateParams = {
    templateIndex: 1,
    cap: '100000',
    feeAmount: '0',
    paymentCollector: ZERO_ADDRESS,
    feeToken: ZERO_ADDRESS,
    minter: await owner.getAddress(),
    mpFeeAddress: ZERO_ADDRESS
  }

  const bundleNFT = await nftFactory.createNftWithDatatoken(
    nftParamsAsset,
    datatokenParams
  )

  const trxReceipt = await bundleNFT.wait()
  // events have been emitted
  const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
  const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')

  const nftAddress = nftCreatedEvent.args.newTokenAddress
  const datatokenAddressAsset = tokenCreatedEvent.args.newTokenAddress
  // create the files encrypted string
  assetUrl.datatokenAddress = datatokenAddressAsset
  assetUrl.nftAddress = nftAddress
  ddo.services[0].files = await ProviderInstance.encrypt(assetUrl, chain, providerUrl)
  ddo.services[0].datatokenAddress = datatokenAddressAsset
  ddo.services[0].serviceEndpoint = providerUrl

  ddo.nftAddress = nftAddress
  ddo.id = 'did:op:' + SHA256(ethers.utils.getAddress(nftAddress) + chain.toString(10))

  const encryptedResponse = await ProviderInstance.encrypt(ddo, chain, providerUrl)
  const validateResult = await aquariusInstance.validate(ddo, owner, providerUrl)
  await nft.setMetadata(
    nftAddress,
    await owner.getAddress(),
    0,
    providerUrl,
    '',
    ethers.utils.hexlify(2),
    encryptedResponse,
    validateResult.hash
  )
  return ddo.id
}
```

Add a `handleOrder()`function.
```Typescript
async function handleOrder(
  order: ProviderComputeInitialize,
  datatokenAddress: string,
  payerAccount: Signer,
  consumerAccount: string,
  serviceIndex: number,
  consumeMarkerFee?: ConsumeMarketFee
) {
  /* We do have 3 possible situations:
     - have validOrder and no providerFees -> then order is valid, providerFees are valid, just use it in startCompute
     - have validOrder and providerFees -> then order is valid but providerFees are not valid, we need to call reuseOrder and pay only providerFees
     - no validOrder -> we need to call startOrder, to pay 1 DT & providerFees
  */
  if (order.providerFee && order.providerFee.providerFeeAmount) {
    await approveWei(
      payerAccount,
      config,
      await payerAccount.getAddress(),
      order.providerFee.providerFeeToken,
      datatokenAddress,
      order.providerFee.providerFeeAmount
    )
  }
  if (order.validOrder) {
    if (!order.providerFee) return order.validOrder
    const tx = await datatoken.reuseOrder(
      datatokenAddress,
      order.validOrder,
      order.providerFee
    )
    const reusedTx = await tx.wait()
    const orderReusedTx = getEventFromTx(reusedTx, 'OrderReused')
    return orderReusedTx.transactionHash
  }
  const tx = await datatoken.startOrder(
    datatokenAddress,
    consumerAccount,
    serviceIndex,
    order.providerFee,
    consumeMarkerFee
  )
  const orderTx = await tx.wait()
  const orderStartedTx = getEventFromTx(orderTx, 'OrderStarted')
  return orderStartedTx.transactionHash
}
```

At the end of your compute.ts file define `async function run(){ }`. We will use this function to add and test the following chunks of code.
<!--
describe('Compute-to-data example tests
-->

We need to load the configuration. Add the following code into your `run(){ }` function
```Typescript
  
    const provider = new providers.JsonRpcProvider(
      process.env.NODE_URI || configHelperNetworks[1].nodeUri
    )
    publisherAccount = (await provider.getSigner(0)) as Signer
    consumerAccount = (await provider.getSigner(1)) as Signer
    const config = new ConfigHelper().getConfig(
      parseInt(String((await publisherAccount.provider.getNetwork()).chainId))
    )
    if (process.env.NODE_URL) {
      config.oceanNodeUri = process.env.NODE_URL
    }
    aquariusInstance = new Aquarius(config?.oceanNodeUri)
    providerUrl = config?.oceanNodeUri
    addresses = JSON.parse(
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.readFileSync(
        process.env.ADDRESS_FILE ||
          `${homedir}/.ocean/ocean-contracts/artifacts/address.json`,
        'utf8'
      )
    ).development

```
As we go along it's a good idea to console log the values so that you check they are right. At the end of your `run(){ ... }` function add the following logs:
```Typescript
    console.log(`Indexer URL: ${config.oceanNodeUri}`)
    console.log(`Provider URL: ${providerUrl}`)
    console.log(`Deployed contracts address: ${addresses}`)
    console.log(`Publisher account address: ${publisherAccount}`)
    console.log(`Consumer account address: ${consumerAccount}`)
  
```

Now at the end of your compute.ts file call you `run()` function. Next, let's compile the file with the `tsc` command in the console and run `node dist/compute.js`.
If everything is working you should see the logs in the console and no errors.
We will use all of the following code snippets in the same way. Add the code snippet and the logs to the end of your `run(){ ... }` function as well as the logs.
Then compile your file with the `tsc` command and run it with `node dist/compute.js`

  ### 5.1 Mint OCEAN to publisher account
You can skip this step if you are running your script against a remote network,
you need to mint oceans to mentioned accounts only if you are using barge to test your script

```Typescript
    const minAbi = [
      {
        constant: false,
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' }
        ],
        name: 'mint',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ]

    const tokenContract = new ethers.Contract(addresses.Ocean, minAbi, publisherAccount)
    const estGasPublisher = await tokenContract.estimateGas.mint(
      await publisherAccount.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )
    await sendTx(
      estGasPublisher,
      publisherAccount,
      1,
      tokenContract.mint,
      await publisherAccount.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )
```
<!--
  }).timeout(40000) ///
--->

  ### 5.2 Send some OCEAN to consumer account
```Typescript
    transfer(
      publisherAccount,
      config,
      addresses.Ocean,
      await consumerAccount.getAddress(),
      '100'
    )
  
```

## 6. Publish assets dataset and algorithm

  ### 6.1 Publish a dataset (create NFT + Datatoken) and set dataset metadata
```Typescript
    datasetId = await createAssetHelper(
      'D1Min',
      'D1M',
      publisherAccount,
      DATASET_ASSET_URL,
      DATASET_DDO,
      providerUrl
    )
```
Now, let's check that we successfully published a dataset (create NFT + Datatoken)
```Typescript
    console.log(`dataset id: ${datasetId}`)
```
<!--
  }).timeout(40000)
-->

  ### 6.2 Publish an algorithm (create NFT + Datatoken) and set algorithm metadata
```Typescript
    algorithmId = await createAssetHelper(
      'D1Min',
      'D1M',
      publisherAccount,
      ALGORITHM_ASSET_URL,
      ALGORITHM_DDO,
      providerUrl
    )
```
Now, let's check that we successfully published a algorithm (create NFT + Datatoken)
```Typescript
    console.log(`algorithm id: ${algorithmId}`)
```
<!--
  }).timeout(40000)
-->
## 7. Resolve assets

  ### 7.1 Resolve published datasets and algorithms
```Typescript
    resolvedDatasetDdo = await aquariusInstance.waitForIndexer(datasetId)
    resolvedAlgorithmDdo = await aquariusInstance.waitForIndexer(algorithmId)
```
<!--
    assert(resolvedDatasetDdo, 'Cannot fetch DDO from Aquarius')
    assert(resolvedAlgorithmDdo, 'Cannot fetch DDO from Aquarius')
  }).timeout(80000)
-->

## 8. Send datatokens to consumer

  ### 8.1 Mint dataset and algorithm datatokens to publisher
```Typescript
    const datatoken = new Datatoken(
      publisherAccount,
      (await publisherAccount.provider.getNetwork()).chainId
    )
    await datatoken.mint(
      resolvedDatasetDdo.services[0].datatokenAddress,
      await publisherAccount.getAddress(),
      '10',
      await consumerAccount.getAddress()
    )

    await datatoken.mint(
      resolvedAlgorithmDdo.services[0].datatokenAddress,
      await publisherAccount.getAddress(),
      '10',
      await consumerAccount.getAddress()
    )
```
<!--
  }).timeout(40000)
-->

## 9. Get compute environments

  ### 9.1 Fetch compute environments from provider
```Typescript
    computeEnvs = await ProviderInstance.getComputeEnvironments(providerUrl)
```
<!--
    assert(computeEnvs, 'No Compute environments found')
  }).timeout(40000)
-->

## 10. Consumer starts a free compute job

  ### 10.1 Start a compute job using a free C2D environment
<!--
    datatoken = new Datatoken(
      consumerAccount,
      (await consumerAccount.provider.getNetwork()).chainId
    )
-->

let's check the free compute environment
```Typescript
    const computeEnv = computeEnvs.find((ce) => isDefined(ce.free))
    console.log('Free compute environment = ', computeEnv)
```
<!--
    assert(computeEnv, 'Cannot find the free compute env')
-->

<!--
    computeRoutePath = await ProviderInstance.getComputeStartRoutes(providerUrl, true)
    if (isDefined(computeRoutePath)) {
      hasFreeComputeSupport = true
  -->

  Let's have 5 minute of compute access
  ```Typescript
      const mytime = new Date()
      const computeMinutes = 5
      mytime.setMinutes(mytime.getMinutes() + computeMinutes)

  ```
  Let's prepare the dataset and algorithm assets to be used in the compute job
  ```Typescript
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
  ```

  Let's start the free compute job
  ```Typescript
      const computeJobs = await ProviderInstance.freeComputeStart(
        providerUrl,
        consumerAccount,
        computeEnv.id,
        assets,
        algo
      )
  ```

  <!--
      assert(computeJobs, 'Cannot start compute job')
  -->

  Let's save the compute job it, we re going to use later
  ```Typescript
      computeJobId = computeJobs[0].jobId
      // eslint-disable-next-line prefer-destructuring
      agreementId = computeJobs[0].agreementId
  ```
  <!--
    } else {
      assert(
        computeRoutePath === null,
        'Route path for free compute is not defined (perhaps because provider does not support it yet?)'
      )
      hasFreeComputeSupport = false
    }
  }).timeout(40000)
-->

## 11. Check compute status and get download compute results URL
  ### 11.1 Check compute status
<!--
    if (!hasFreeComputeSupport) {
      assert(
        computeRoutePath === null,
        'Compute route path for free compute is not defined (perhaps because provider does not support it yet?)'
      )
    } else {
  -->
  You can also add various delays so you see the various states of the compute job
  ```Typescript
      const jobStatus = await ProviderInstance.computeStatus(
        providerUrl,
        await consumerAccount.getAddress(),
        computeJobId,
        agreementId
      )
  ```
  <!--
      assert(jobStatus, 'Cannot retrieve compute status!')
  -->
  Now, let's see the current status of the previously started computer job
  ```Typescript
      console.log('Current status of the compute job: ', jobStatus)
  ```
  <!--
    }
  }).timeout(40000)
-->

  ### 11.2 Get download compute results URL
<!--
    if (!hasFreeComputeSupport) {
      assert(
        computeRoutePath === null,
        'Compute route path for free compute is not defined (perhaps because provider does not support it yet?)'
      )
    } else {
  -->

  ```Typescript
      await sleep(10000)
      const downloadURL = await ProviderInstance.getComputeResultUrl(
        providerUrl,
        consumerAccount,
        computeJobId,
        0
      )
  ```
  <!--
      assert(downloadURL, 'Provider getComputeResultUrl failed!')
  -->
  Let's check the compute results url for the specified index
  ```Typescript
      console.log(`Compute results URL: ${downloadURL}`)
  ```
  <!--
    }
  }).timeout(40000)
-->

## 12. Consumer starts a paid compute job

  ### 12.1 Start a compute job using a paid C2D resources
<!--
    datatoken = new Datatoken(
      consumerAccount,
      (await consumerAccount.provider.getNetwork()).chainId
    )
-->

let's select compute environment which have free and paid resources
```Typescript
    const computeEnv = computeEnvs[0]
    console.log('Compute environment = ', computeEnv)
```
<!--
    assert(computeEnv, 'Cannot find the compute env')
-->

<!--
    const paymentToken = addresses.Ocean
    computeRoutePath = await ProviderInstance.getComputeStartRoutes(providerUrl, false)
    if (isDefined(computeRoutePath)) {
  -->

  Let's have 5 minute of compute access
  ```Typescript

      const mytime = new Date()
      const computeMinutes = 5
      mytime.setMinutes(mytime.getMinutes() + computeMinutes)
      const computeValidUntil = Math.floor(mytime.getTime() / 1000)

  ```

  Let's prepare the dataset and algorithm assets to be used in the compute job
  ```Typescript
      const resources: ComputeResourceRequest[] = [
        {
          id: 'cpu',
          amount: 2
        },
        {
          id: 'ram',
          amount: 1000000000
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
  ```

  Triggering initialize compute to see payment options
  ```Typescript
      const providerInitializeComputeResults = await ProviderInstance.initializeCompute(
        assets,
        algo,
        computeEnv.id,
        paymentToken,
        computeValidUntil,
        providerUrl,
        consumerAccount,
        resources,
        (
          await consumerAccount.provider.getNetwork()
        ).chainId
      )

      console.log(
        'providerInitializeComputeResults = ',
        JSON.stringify(providerInitializeComputeResults)
      )

  ```

  <!--
      assert(!('error' in providerInitializeComputeResults), 'Cannot order algorithm')
  -->

  Let's check funds for escrow payment
  ```Typescript
      const escrow = new EscrowContract(
        ethers.utils.getAddress(providerInitializeComputeResults.payment.escrowAddress),
        consumerAccount
      )
      const paymentTokenPublisher = new Datatoken(publisherAccount)
      const balancePublisherPaymentToken = await paymentTokenPublisher.balance(
        paymentToken,
        await publisherAccount.getAddress()
      )
      assert(
        ethers.utils.parseEther(balancePublisherPaymentToken) > ethers.BigNumber.from(0),
        'Balance should be higher than 0'
      )
      const tx = await publisherAccount.sendTransaction({
        to: computeEnv.consumerAddress,
        value: ethers.utils.parseEther('1.5')
      })
      await tx.wait()

      await paymentTokenPublisher.transfer(
        paymentToken,
        ethers.utils.getAddress(computeEnv.consumerAddress),
        (Number(balancePublisherPaymentToken) / 2).toString()
      )
      const amountToDeposit = (
        providerInitializeComputeResults.payment.amount * 2
      ).toString()
      await escrow.verifyFundsForEscrowPayment(
        paymentToken,
        computeEnv.consumerAddress,
        await unitsToAmount(consumerAccount, paymentToken, amountToDeposit),
        providerInitializeComputeResults.payment.amount.toString(),
        providerInitializeComputeResults.payment.minLockSeconds.toString(),
        '10'
      )
  ```

  Let's order assets
  ```Typescript

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
  ```

  Let's start compute job
  ```Typescript
      const computeJobs = await ProviderInstance.computeStart(
        providerUrl,
        consumerAccount,
        computeEnv.id,
        assets,
        algo,
        computeValidUntil,
        paymentToken,
        resources,
        (
          await consumerAccount.provider.getNetwork()
        ).chainId
      )
  ```

  <!--
      assert(computeJobs, 'Cannot start compute job')
  -->

  Let's save the compute job it, we re going to use later
  ```Typescript
      computeJobId = computeJobs[0].jobId
  ```
  <!--
    } else {
      assert(
        computeRoutePath === null,
        'Route path for free compute is not defined (perhaps because provider does not support it yet?)'
      )
      hasFreeComputeSupport = false
    }
  }).timeout(40000)
-->

## 13. Check paid compute job status and get download compute results URL
  ### 13.1 Check compute status for paid compute job
<!--
    if (!hasFreeComputeSupport) {
      assert(
        computeRoutePath === null,
        'Compute route path for free compute is not defined (perhaps because provider does not support it yet?)'
      )
    } else {
  -->
  You can also add various delays so you see the various states of the compute job
  ```Typescript
      const jobStatus = await ProviderInstance.computeStatus(
        providerUrl,
        await consumerAccount.getAddress(),
        computeJobId
      )
  ```
  <!--
      assert(jobStatus, 'Cannot retrieve compute status!')
  -->
  Now, let's see the current status of the previously started computer job
  ```Typescript
      console.log('Current status of the compute job: ', jobStatus)
  ```
  <!--
    }
  }).timeout(40000)
-->

  ### 13.2 Get download compute results URL
<!--
    if (!hasFreeComputeSupport) {
      assert(
        computeRoutePath === null,
        'Compute route path for paid compute is not defined (perhaps because provider does not support it yet?)'
      )
    } else {
  -->

  ```Typescript
      await sleep(10000)
      const downloadURL = await ProviderInstance.getComputeResultUrl(
        providerUrl,
        consumerAccount,
        computeJobId,
        0
      )
  ```
  <!--
      assert(downloadURL, 'Provider getComputeResultUrl failed!')
  -->
  Let's check the compute results url for the specified index
  ```Typescript
      console.log(`Compute results URL: ${downloadURL}`)
  ```
  <!--
    }
  }).timeout(40000)
})
-->

## Editing this file
Please note that ComputeExamples.md is an autogenerated file, you should not edit it directly.
Updates should be done in `test/integration/ComputeExamples.test.ts` and all markdown should have three forward slashes before it
e.g. `/// # H1 Title`
