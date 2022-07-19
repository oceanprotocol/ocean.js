# Compute-to-Data (C2D) Code Examples

Here are the steps:

0. [Prerequisites](#-Prerequisites)
1. [Initialize services](#-initialize-services)
2. [Create a new node.js project](#-create-a-new-node.js-project)
3. [Install dependencies](#-install-dependencies)
4. [Import dependencies and add variables and constants](#-import-dependencies-and-add-variables-and-constants)
5. [Initialize accounts and deploy contracts](#-initialize-accounts-and-deploy-contracts)
6. [Publish a dataset (Data NFT and Datatoken)](#-publish-a-dataset-data-nft-and-datatoken)
7. [Publish an algorithm (Data NFT and Datatoken)](#-publish-an-algorithm-data-nft-and-datatoken)
8. [Resolve published datasets and algorithms](#-resolve-published-datasets-and-algorithms)
9. [Send datatokens to consumer](#-send-datatokens-to-consumer)
10. [Consumer starts a compute job using a free C2D environment](#-consumer-starts-a-compute-job-using-a-free-c2D-environment)
10. [Check compute status and get download compute results url](#-check-compute-status-and-get-download-compute-results-url)

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
./start_ocean.sh --with-provider2 --no-dashboard
```

## 2. Create a new node.js project

Start by creating a new Node.js project. Open a new terminal and enter the following commands:

```bash
mkdir marketplace-quickstart
cd marketplace-quickstart
npm init
# Answer the questions in the command line prompt
cat > marketplace.js
# On linux press CTRL + D to save
```

## 3. Install dependencies

Install dependencies running the following command in your terminal:

```bash
npm install @oceanprotocol/lib crypto-js web3
```

## 4. Import dependencies and add variables and constants

Now open the `marketplace.js` file in your text editor.

Start by importing all of the necessary dependencies

```Typescript

import { SHA256 } from 'crypto-js'
import {
  Config,
  ProviderInstance,
  Aquarius,
  NftFactory,
  NftCreateData,
  Datatoken,
  Nft,
  ZERO_ADDRESS,
  Erc20CreateParams,
  Files,
  transfer,
  ComputeAsset,
  ComputeAlgorithm,
  ComputeJob,
  sleep,
  ProviderComputeInitialize,
  ConsumeMarketFee,
  approveWei
} from '@oceanprotocol/lib'
import { web3, getTestConfig, getAddresses } from '@oceanprotocol/lib/dist/test/config'
```

Add a `handleOrder()`function.
```Typescript
async function handleOrder(
  order: ProviderComputeInitialize,
  datatokenAddress: string,
  payerAccount: string,
  consumerAccount: string,
  serviceIndex: number,
  consumeMarkerFee?: ConsumeMarketFee
) {
  const datatoken = new Datatoken(web3)
  /* We do have 3 possible situations:
     - have validOrder and no providerFees -> then order is valid, providerFees are valid, just use it in startCompute
     - have validOrder and providerFees -> then order is valid but providerFees are not valid, we need to call reuseOrder and pay only providerFees
     - no validOrder -> we need to call startOrder, to pay 1 DT & providerFees
  */
  if (order.providerFee && order.providerFee.providerFeeAmount) {
    await approveWei(
      web3,
      payerAccount,
      order.providerFee.providerFeeToken,
      datatokenAddress,
      order.providerFee.providerFeeAmount
    )
  }
  if (order.validOrder) {
    if (!order.providerFee) return order.validOrder
    const tx = await datatoken.reuseOrder(
      datatokenAddress,
      payerAccount,
      order.validOrder,
      order.providerFee
    )
    return tx.transactionHash
  }
  const tx = await datatoken.startOrder(
    datatokenAddress,
    payerAccount,
    consumerAccount,
    serviceIndex,
    order.providerFee,
    consumeMarkerFee
  )
  return tx.transactionHash
}
```

<!--
describe('Compute flow tests
-->

Now we define the variables which we will need later
```Typescript
  let config: Config
  let aquarius: Aquarius
  let providerUrl: any
  let publisherAccount: string
  let consumerAccount: string
  let addresses: any
  let datasetNftAddress: string
  let datasetDatatokenAddress: string
  let algorithmNftAddress: string
  let algorithmDatatokenAddress: string
  let computeJobId: string
```

 We will need two files to publish, one as Dataset and one as Algorithm, so here we define the files that we intend to publish.
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
        url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
        method: 'GET'
      }
    ]
  }
```

Next, we define the metadata for the Dataset and Algorithm that will describe our data assets. This is what we call the DDOs
```Typescript
  const DATASET_DDO: any = {
    '@context': ['https://w3id.org/did/v1'],
    id: '',
    version: '4.1.0',
    chainId: 4,
    nftAddress: '0x0',
    metadata: {
      created: '2021-12-20T14:35:20Z',
      updated: '2021-12-20T14:35:20Z',
      type: 'dataset',
      name: 'dataset-name',
      description: 'Ocean protocol test dataset description',
      author: 'oceanprotocol-team',
      license: 'MIT'
    },
    services: [
      {
        id: 'testFakeId',
        type: 'compute',
        files: '',
        datatokenAddress: '0x0',
        serviceEndpoint: 'https://v4.provider.rinkeby.oceanprotocol.com/',
        timeout: 60,
        compute: {
          publisherTrustedAlgorithmPublishers: [],
          publisherTrustedAlgorithms: [],
          allowRawAlgorithm: true,
          allowNetworkAccess: true
        }
      }
    ]
  }

  const ALGORITHM_DDO: any = {
    '@context': ['https://w3id.org/did/v1'],
    id: '',
    version: '4.1.0',
    chainId: 4,
    nftAddress: '0x0',
    metadata: {
      created: '2021-12-20T14:35:20Z',
      updated: '2021-12-20T14:35:20Z',
      type: 'algorithm',
      name: 'algorithm-name',
      description: 'Ocean protocol test algorithm description',
      author: 'oceanprotocol-team',
      license: 'MIT',
      algorithm: {
        language: 'Node.js',
        version: '1.0.0',
        container: {
          entrypoint: 'node $ALGO',
          image: 'ubuntu',
          tag: 'latest',
          checksum: '44e10daa6637893f4276bb8d7301eb35306ece50f61ca34dcab550'
        }
      }
    },
    services: [
      {
        id: 'testFakeId',
        type: 'access',
        files: '',
        datatokenAddress: '0x0',
        serviceEndpoint: 'https://v4.provider.rinkeby.oceanprotocol.com/',
        timeout: 60
      }
    ]
  }
```

We load the configuration:
```Typescript
  
    config = await getTestConfig(web3)
    aquarius = new Aquarius(config.metadataCacheUri)
    providerUrl = config.providerUri
```
As we go along it's a good idea to console log the values so that you check they are right
```Typescript
    console.log(`Aquarius URL: ${config.metadataCacheUri}`)
    console.log(`Provider URL: ${providerUrl}`)
  
```

## 5. Initialize accounts and deploy contracts
  ### 5.1 Initialize accounts
```Typescript
    const accounts = await web3.eth.getAccounts()
    publisherAccount = accounts[0]
    consumerAccount = accounts[1]
```
Again, lets console log the values so that we can check that they have been saved properly
```Typescript
    console.log(`Publisher account address: ${publisherAccount}`)
    console.log(`Consumer account address: ${consumerAccount}`)
  
```

  ### 5.2 Get the address of the deployed contracts
```Typescript
    addresses = getAddresses()
  
```

  ### 5.3 Send some OCEAN to consumer account
```Typescript
    transfer(web3, publisherAccount, addresses.Ocean, consumerAccount, '100')
  
```

## 6. Publish a dataset (Data NFT and Datatoken)

  ### 6.1 Publish a dataset (create NFT + Datatoken)
```Typescript
    const factory = new NftFactory(addresses.ERC721Factory, web3)

    const nftParams: NftCreateData = {
      name: 'DATA 1',
      symbol: 'D1',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

```
Now we can make the contract call
```Typescript
    const tx = await factory.createNftWithErc20(publisherAccount, nftParams, erc20Params)

    datasetNftAddress = tx.events.NFTCreated.returnValues[0]
    datasetDatatokenAddress = tx.events.TokenCreated.returnValues[0]
```
Now, we did quite a few things there. Let's check that we successfully published a dataset (create NFT + Datatoken)
```Typescript
    console.log(`Dataset NFT address: ${datasetNftAddress}`)
    console.log(`Dataset Datatoken address: ${datasetDatatokenAddress}`)
  
```

  ### 6.2 Set metadata in the dataset NFT
```Typescript
    const nft = new Nft(web3)
```
Now we update the DDO and set the right did
```Typescript
    DATASET_DDO.chainId = await web3.eth.getChainId()
    DATASET_DDO.id =
      'did:op:' +
      SHA256(
        web3.utils.toChecksumAddress(datasetNftAddress) + DATASET_DDO.chainId.toString(10)
      )
    DATASET_DDO.nftAddress = web3.utils.toChecksumAddress(datasetNftAddress)
```
Next we encrypt the file or files using Ocean Provider. The provider is an off chain proxy built specifically for this task
```Typescript
    DATASET_ASSET_URL.datatokenAddress = datasetDatatokenAddress
    DATASET_ASSET_URL.nftAddress = DATASET_DDO.nftAddress
    const encryptedFiles = await ProviderInstance.encrypt(DATASET_ASSET_URL, providerUrl)
    DATASET_DDO.services[0].files = await encryptedFiles
    DATASET_DDO.services[0].datatokenAddress = datasetDatatokenAddress
    DATASET_DDO.services[0].serviceEndpoint = providerUrl
```
Now let's console log the result to check everything is working
```Typescript
    console.log(`Dataset DID: ${DATASET_DDO.id}`)

    const providerResponse = await ProviderInstance.encrypt(DATASET_DDO, providerUrl)
    const encryptedDDO = await providerResponse

    const validateResult = await aquarius.validate(DATASET_DDO)
    assert(validateResult.valid, 'Could not validate metadata')
    await nft.setMetadata(
      datasetNftAddress,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedDDO,
      validateResult.hash
    )
  
```

## 7. Publish an algorithm (Data NFT and Datatoken)

  ### 7.1 Publish an algorithm (create NFT + Datatoken)
```Typescript
    const factory = new NftFactory(addresses.ERC721Factory, web3)

    const nftParams: NftCreateData = {
      name: 'ALGO 1',
      symbol: 'A1',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

```
Now we can make the contract call
```Typescript
    const tx = await factory.createNftWithErc20(publisherAccount, nftParams, erc20Params)

    algorithmNftAddress = tx.events.NFTCreated.returnValues[0]
    algorithmDatatokenAddress = tx.events.TokenCreated.returnValues[0]
```
Now, we did quite a few things there. Let's check that we successfully published an algorithm (create NFT + Datatoken)
```Typescript
    console.log(`Algorithm NFT address: ${algorithmNftAddress}`)
    console.log(`Algorithm Datatoken address: ${algorithmDatatokenAddress}`)
  
```

  ### 7.2 Set metadata in the algorithm NFT
```Typescript
    const nft = new Nft(web3)
```
Now we update the DDO and set the right did
```Typescript
    ALGORITHM_DDO.chainId = await web3.eth.getChainId()
    ALGORITHM_DDO.id =
      'did:op:' +
      SHA256(
        web3.utils.toChecksumAddress(algorithmNftAddress) +
          ALGORITHM_DDO.chainId.toString(10)
      )
    ALGORITHM_DDO.nftAddress = web3.utils.toChecksumAddress(algorithmNftAddress)
```
Next we encrypt the file or files using Ocean Provider. The provider is an off chain proxy built specifically for this task
```Typescript
    ALGORITHM_ASSET_URL.datatokenAddress = algorithmDatatokenAddress
    ALGORITHM_ASSET_URL.nftAddress = ALGORITHM_DDO.nftAddress
    const encryptedFiles = await ProviderInstance.encrypt(
      ALGORITHM_ASSET_URL,
      providerUrl
    )
    ALGORITHM_DDO.services[0].files = await encryptedFiles
    ALGORITHM_DDO.services[0].datatokenAddress = algorithmDatatokenAddress
    ALGORITHM_DDO.services[0].serviceEndpoint = providerUrl
```
Now let's console log the result to check everything is working
```Typescript
    console.log(`Algorithm DID: ${ALGORITHM_DDO.id}`)

    const providerResponse = await ProviderInstance.encrypt(ALGORITHM_DDO, providerUrl)
    const encryptedDDO = await providerResponse

    const validateResult = await aquarius.validate(ALGORITHM_DDO)
    assert(validateResult.valid, 'Could not validate metadata')
    await nft.setMetadata(
      algorithmNftAddress,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedDDO,
      validateResult.hash
    )
  
```

## 8. Resolve published datasets and algorithms

  ### 8.1 Resolve published datasets and algorithms
```Typescript
    const resolvedDatasetDdo = await aquarius.waitForAqua(DATASET_DDO.id)
    assert(resolvedDatasetDdo, 'Cannot fetch DDO from Aquarius')
    const resolvedAlgorithmDdo = await aquarius.waitForAqua(ALGORITHM_DDO.id)
    assert(resolvedAlgorithmDdo, 'Cannot fetch DDO from Aquarius')
  
```

## 9. Send datatokens to consumer

  ### 9.1 Send datatokens to publisher
```Typescript
    const datatoken = new Datatoken(web3)

    await datatoken.mint(datasetDatatokenAddress, publisherAccount, '10', consumerAccount)
    await datatoken.mint(
      algorithmDatatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
  
```

## 10. Consumer starts a compute job using a free C2D environment

  ### 10.1 Start a compute job using a free C2D environment
```Typescript
    const computeEnvs = await ProviderInstance.getComputeEnvironments(providerUrl)
    assert(computeEnvs, 'No Compute environments found')

    // we choose the free env
    const computeEnv = computeEnvs.find((ce) => ce.priceMin === 0)
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: DATASET_DDO.id,
        serviceId: DATASET_DDO.services[0].id
      }
    ]
    const dtAddressArray = [DATASET_DDO.services[0].datatokenAddress]

    const algo: ComputeAlgorithm = {
      documentId: ALGORITHM_DDO.id,
      serviceId: ALGORITHM_DDO.services[0].id
    }

    // let's have 2 minutes of compute access
    const mytime = new Date()
    const computeMinutes = 1
    mytime.setMinutes(mytime.getMinutes() + computeMinutes)
    const computeValidUntil = Math.floor(mytime.getTime() / 1000)

    const providerInitializeComputeResults = await ProviderInstance.initializeCompute(
      assets,
      algo,
      computeEnv.id,
      computeValidUntil,
      providerUrl,
      consumerAccount
    )

    assert(
      !('error' in providerInitializeComputeResults.algorithm),
      'Cannot order algorithm'
    )

    algo.transferTxId = await handleOrder(
      providerInitializeComputeResults.algorithm,
      ALGORITHM_DDO.services[0].datatokenAddress,
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
      web3,
      consumerAccount,
      computeEnv.id,
      assets[0],
      algo
    )
    assert(computeJobs, 'Cannot start compute job')
    computeJobId = computeJobs[0].jobId
  
```

## 11. Check compute status and get download compute results URL
  ### 11.1 Check compute status
```Typescript
    const jobStatus = (await ProviderInstance.computeStatus(
      providerUrl,
      consumerAccount,
      computeJobId,
      DATASET_DDO.id
    )) as ComputeJob
    assert(jobStatus, 'Cannot retrieve compute status!')
    console.log(jobStatus)
  
```

  ### 11.2 Get download compute results URL
```Typescript
    await sleep(10000)
    const downloadURL = await ProviderInstance.getComputeResultUrl(
      providerUrl,
      web3,
      consumerAccount,
      computeJobId,
      0
    )
    assert(downloadURL, 'Provider getComputeResultUrl failed!')
    console.log(`Compute results URL: ${downloadURL}`)
  
```


## Editing this file
Please note that C2DExamples.md is an autogenerated file, you should not edit it directly.
Updates should be done in `test/integration/C2DExamples.test.ts` and all markdown should have three forward slashes before it
e.g. `/// # H1 Title`
