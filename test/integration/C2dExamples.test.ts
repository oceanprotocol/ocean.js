/// # Compute-to-Data (C2D) Code Examples

/// Here are the steps:

/// 0. [Prerequisites](#-Prerequisites)
/// 1. [Initialize services](#-initialize-services)
/// 2. [Create a new node.js project](#-create-a-new-node.js-project)
/// 3. [Install dependencies](#-install-dependencies)
/// 4. [Import dependencies and add variables and constants](#-import-dependencies-and-add-variables-and-constants)
/// 5. [Initialize accounts and deploy contracts](#-initialize-accounts-and-deploy-contracts)
/// 6. [Publish a dataset (Data NFT and Datatoken)](#-publish-a-dataset-data-nft-and-datatoken)
/// 7. [Publish an algorithm (Data NFT and Datatoken)](#-publish-an-algorithm-data-nft-and-datatoken)
/// 8. [Resolve published datasets and algorithms](#-resolve-published-datasets-and-algorithms)
/// 9. [Send datatokens to consumer](#-send-datatokens-to-consumer)
/// 10. [Consumer starts a compute job using a free C2D environment](#-consumer-starts-a-compute-job-using-a-free-c2D-environment)
/// 10. [Check compute status and get download compute results url](#-check-compute-status-and-get-download-compute-results-url)

/// Let's go through each step.

/// ## 0. Prerequisites
/// Before we start it is important that you have all of the necessary prerequisites installed on your computer.
/// - **A Unix based operating system (Linux or Mac)**. If you are a Windows user you can try to run linux inside a virtual machine but this is outside of the scope of this article.
/// - **Git**. Instructions for installing Git can be found here: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
/// - **Node.js** can be downloaded from here: https://nodejs.org/en/download/
/// - **Docker** can be installed from here: https://docs.docker.com/get-docker/. Please note that Docker must run as a non-root user, you can set this up by following these instructions: https://docs.docker.com/engine/install/linux-postinstall/

/// ## 1. Initialize services

/// Ocean.js uses off-chain services for metadata (Aquarius) and consuming datasets (Provider).

/// We start by initializing the services. To do this, we clone the Barge repository and run it. This will run the current default versions of [Aquarius](https://github.com/oceanprotocol/aquarius), [Provider](https://github.com/oceanprotocol/provider), and [Ganache](https://github.com/trufflesuite/ganache) with [our contracts](https://github.com/oceanprotocol/contracts) deployed to it.

/// ```bash
/// git clone https://github.com/oceanprotocol/barge.git
/// cd barge/
/// ./start_ocean.sh --with-provider2 --no-dashboard
/// ```

/// ## 2. Create a new node.js project with Typescript

/// Start by creating a new Node.js project. Open a new terminal and enter the following commands:

/// ```bash
/// mkdir marketplace-quickstart
/// cd marketplace-quickstart
/// npm init
/// # Answer the questions in the command line prompt
/// touch marketplace.ts
/// # On linux press CTRL + D to save
/// ```

/// Next, we need to setup our typescript compiler options. Create a new file called `tsconfig.json` in the root of the `marketplace-quickstart` directory. copy the following content into the file:

/// ```json
/// {
///   "compilerOptions": {
///     "resolveJsonModule": true,
///     "moduleResolution": "node",
///     "esModuleInterop": true,
///     "allowSyntheticDefaultImports": true,
///     "lib": [
///       "ESNext",
///       "dom"
///     ],
///     "declaration": true,
///     "module": "ESNext",
///     "target": "ESNext",
///     "removeComments": false,
///     "experimentalDecorators": true,
///     "preserveConstEnums": true,
///     "outDir": "./",
///     "sourceMap": true,
///     "declarationDir": "./d"
///   },
///   "include": [
///     "marketplace.ts"
///   ]
/// }
/// ```

/// Now you can compile your typescript with the following command:

/// ```bash
/// tsc
/// ```

/// To run your script as we go along, you can use the following command:

/// ```bash
/// node marketplace.js
/// ```

/// ## 3. Install dependencies

/// Install dependencies running the following command in your terminal:

/// ```bash
/// npm install @oceanprotocol/lib crypto-js web3 web3-utils typescript @types/node ts-node
/// ```

/// ## 4. Import dependencies and add variables and constants

/// Now open the `marketplace.ts` file in your text editor.

/// Start by importing all of the necessary dependencies

/// ```Typescript
import { assert } from 'chai'
import { SHA256 } from 'crypto-js'
import { AbiItem } from 'web3-utils'
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
  DDO,
  NftCreateData,
  DatatokenCreateParams,
  calculateEstimatedGas,
  sendTx
} from '../../src'
import { getAddresses, getTestConfig, web3 } from '../config'

/// ```

/// We add this code to get the default test configuration:

/// ```Typescript
/// const {
///   ConfigHelper,
///   configHelperNetworks
/// } = require('@oceanprotocol/lib')
/// const Web3 = require('web3')
/// const fs = require('fs')
/// const { homedir } = require('os')

/// const web3 = new Web3(process.env.NODE_URI || configHelperNetworks[1].nodeUri)

/// const getTestConfig = async (web3) => {
///   const config = new ConfigHelper().getConfig(await web3.eth.getChainId())
///   config.providerUri = process.env.PROVIDER_URL || config.providerUri
///   return config
/// }

/// const getAddresses = () => {
///   const data = JSON.parse(
///     // eslint-disable-next-line security/detect-non-literal-fs-filename
///     fs.readFileSync(
///       process.env.ADDRESS_FILE ||
///         `${homedir}/.ocean/ocean-contracts/artifacts/address.json`,
///       'utf8'
///     )
///   )
///   return data.development
/// }
/// ```

///  We will need two files to publish, one as Dataset and one as Algorithm, so here we define the files that we intend to publish.
/// ```Typescript
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
      url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/Typescript/algo.js',
      method: 'GET'
    }
  ]
}
/// ```

/// Next, we define the metadata for the Dataset and Algorithm that will describe our data assets. This is what we call the DDOs
/// ```Typescript
const DATASET_DDO: DDO = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'id:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
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
    license: 'https://market.oceanprotocol.com/terms',
    additionalInformation: {
      termsAndConditions: true
    }
  },
  services: [
    {
      id: 'notAnId',
      type: 'compute',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'https://v4.provider.rinkeby.oceanprotocol.com/',
      timeout: 300,
      compute: {
        publisherTrustedAlgorithmPublishers: [],
        publisherTrustedAlgorithms: [],
        allowRawAlgorithm: true,
        allowNetworkAccess: true
      }
    }
  ]
}

const ALGORITHM_DDO: DDO = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
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
      id: 'notAnId',
      type: 'access',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'https://v4.provider.rinkeby.oceanprotocol.com',
      timeout: 300
    }
  ]
}
/// ```

/// Now we define the variables which we will need later
/// ```Typescript
let config: Config
let aquarius: Aquarius
let datatoken: Datatoken
let providerUrl: string
let publisherAccount: string
let consumerAccount: string
let addresses: any
let computeEnvs

let datasetId
let algorithmId
let resolvedDatasetDdo
let resolvedAlgorithmDdo

let computeJobId: string
/// ```

/// Add a `createAsset()`function.
/// ```Typescript
async function createAsset(
  name: string,
  symbol: string,
  owner: string,
  assetUrl: any,
  ddo: any,
  providerUrl: string
) {
  /// ```Typescript
  const nft = new Nft(web3)
  const Factory = new NftFactory(addresses.ERC721Factory, web3)

  /// ```
  /// Now we update the DDO and set the right did
  /// ```Typescript
  const chain = await web3.eth.getChainId()
  ddo.chainId = parseInt(chain.toString(10))
  const nftParamsAsset: NftCreateData = {
    name,
    symbol,
    templateIndex: 1,
    tokenURI: 'aaa',
    transferable: true,
    owner
  }
  const datatokenParams: DatatokenCreateParams = {
    templateIndex: 1,
    cap: '100000',
    feeAmount: '0',
    paymentCollector: ZERO_ADDRESS,
    feeToken: ZERO_ADDRESS,
    minter: owner,
    mpFeeAddress: ZERO_ADDRESS
  }
  /// ```
  /// Now we can make the contract call createNftWithDatatoken
  /// ```Typescript
  const result = await Factory.createNftWithDatatoken(
    owner,
    nftParamsAsset,
    datatokenParams
  )

  const nftAddress = result.events.NFTCreated.returnValues[0]
  const datatokenAddressAsset = result.events.TokenCreated.returnValues[0]
  ddo.nftAddress = web3.utils.toChecksumAddress(nftAddress)
  /// ```
  /// Next we encrypt the file or files using Ocean Provider. The provider is an off chain proxy built specifically for this task
  /// ```Typescript
  assetUrl.datatokenAddress = datatokenAddressAsset
  assetUrl.nftAddress = ddo.nftAddress
  let providerResponse = await ProviderInstance.encrypt(assetUrl, providerUrl)
  ddo.services[0].files = await providerResponse
  ddo.services[0].datatokenAddress = datatokenAddressAsset
  ddo.services[0].serviceEndpoint = providerUrl
  /// ```
  /// Next we update ddo and set the right did
  /// ```Typescript
  ddo.nftAddress = web3.utils.toChecksumAddress(nftAddress)
  ddo.id =
    'did:op:' + SHA256(web3.utils.toChecksumAddress(nftAddress) + chain.toString(10))
  providerResponse = await ProviderInstance.encrypt(ddo, providerUrl)
  const encryptedResponse = await providerResponse
  const validateResult = await aquarius.validate(ddo)
  assert(validateResult.valid, 'Could not validate metadata')
  await nft.setMetadata(
    nftAddress,
    owner,
    0,
    providerUrl,
    '',
    '0x2',
    encryptedResponse,
    validateResult.hash
  )
  return ddo.id
}
/// ```

/// Add a `handleOrder()`function.
/// ```Typescript
async function handleOrder(
  order: ProviderComputeInitialize,
  datatokenAddress: string,
  payerAccount: string,
  consumerAccount: string,
  serviceIndex: number,
  consumeMarkerFee?: ConsumeMarketFee
) {
  const datatoken = new Datatoken(web3)
  const config = await getTestConfig(web3)
  /* We do have 3 possible situations:
     - have validOrder and no providerFees -> then order is valid, providerFees are valid, just use it in startCompute
     - have validOrder and providerFees -> then order is valid but providerFees are not valid, we need to call reuseOrder and pay only providerFees
     - no validOrder -> we need to call startOrder, to pay 1 DT & providerFees
  */
  if (order.providerFee && order.providerFee.providerFeeAmount) {
    await approveWei(
      web3,
      config,
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
/// ```

/// We will put all the following code inside this function, that will be called when the script is run:

/// ```Typescript
/// async function main() {
///   /* all the code goes here */
/// }
///
/// main()
///   .then(() => process.exit(0))
///   .catch(error => {
///     console.error(error);
///     process.exit(1);
///   })
/// ```

/// <!--
describe('Compute to date example tests', async () => {
  /// -->

  /// We load the configuration:
  /// ```Typescript
  before(async () => {
    config = await getTestConfig(web3)
    addresses = getAddresses()
    aquarius = new Aquarius(config.metadataCacheUri)
    providerUrl = config.providerUri
    datatoken = new Datatoken(web3)
    /// ```
    /// As we go along it's a good idea to console log the values so that you check they are right
    /// ```Typescript
    console.log(`Aquarius URL: ${config.metadataCacheUri}`)
    console.log(`Provider URL: ${providerUrl}`)
    console.log(`Deployed contracts address: ${addresses}`)
  }) ///
  /// ```

  /// ## 5. Initialize accounts and deploy contracts
  it('5.1 Initialize accounts', async () => {
    /// ```Typescript
    const accounts = await web3.eth.getAccounts()
    publisherAccount = accounts[0]
    consumerAccount = accounts[1]
    /// ```
    /// Again, lets console log the values so that we can check that they have been saved properly
    /// ```Typescript
    console.log(`Publisher account address: ${publisherAccount}`)
    console.log(`Consumer account address: ${consumerAccount}`)
  }) ///
  /// ```

  it('5.2 Mint OCEAN to publisher account', async () => {
    /// ```Typescript
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
    ] as AbiItem[]
    const tokenContract = new web3.eth.Contract(minAbi, addresses.Ocean)
    const estGas = await calculateEstimatedGas(
      publisherAccount,
      tokenContract.methods.mint,
      publisherAccount,
      web3.utils.toWei('1000')
    )
    await sendTx(
      publisherAccount,
      estGas,
      web3,
      1,
      tokenContract.methods.mint,
      publisherAccount,
      web3.utils.toWei('1000')
    )
  }) ///
  /// ```

  it('5.3 Send some OCEAN to consumer account', async () => {
    /// ```Typescript
    transfer(web3, config, publisherAccount, addresses.Ocean, consumerAccount, '100')
  }) ///
  /// ```

  /// ## 6. Publish a dataset (Data NFT and Datatoken)

  it('6.1 Publish a dataset (create NFT + Datatoken) and set dataset metadata', async () => {
    /// ```Typescript
    datasetId = await createAsset(
      'D1Min',
      'D1M',
      publisherAccount,
      DATASET_ASSET_URL,
      DATASET_DDO,
      providerUrl
    )
    /// ```
    /// Now, let's check that we successfully published a dataset (create NFT + Datatoken)
    /// ```Typescript
    console.log(`Dataset id: ${datasetId}`)
  }) ///
  /// ```

  /// ## 7. Publish an algorithm (Data NFT and Datatoken)

  it('7.1 Publish an algorithm (create NFT + Datatoken) and set algorithm metadata', async () => {
    /// ```Typescript
    algorithmId = await createAsset(
      'D1Min',
      'D1M',
      publisherAccount,
      ALGORITHM_ASSET_URL,
      ALGORITHM_DDO,
      providerUrl
    )
    /// ```
    /// Now, let's check that we successfully published a algorithm (create NFT + Datatoken)
    /// ```Typescript
    console.log(`Algorithm id: ${algorithmId}`)
  }) ///
  /// ```

  /// ## 8. Resolve published datasets and algorithms

  it('8.1 Resolve published datasets and algorithms', async () => {
    /// ```Typescript
    resolvedDatasetDdo = await aquarius.waitForAqua(datasetId)
    assert(resolvedDatasetDdo, 'Cannot fetch DDO from Aquarius')
    resolvedAlgorithmDdo = await aquarius.waitForAqua(algorithmId)
    assert(resolvedAlgorithmDdo, 'Cannot fetch DDO from Aquarius')
  }) ///
  /// ```

  /// ## 9. Send datatokens to consumer

  it('9.1 Send datatokens to publisher', async () => {
    /// ```Typescript
    await datatoken.mint(
      resolvedDatasetDdo.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )

    await datatoken.mint(
      resolvedAlgorithmDdo.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
  }) ///
  /// ```

  /// ## 9. Fetch compute environments from provider

  it('9.1 Fetch compute environments from provider', async () => {
    /// ```Typescript
    computeEnvs = await ProviderInstance.getComputeEnvironments(providerUrl)
    assert(computeEnvs, 'No Compute environments found')
  }) ///
  /// ```

  /// ## 10. Consumer starts a compute job using a free C2D environment

  it('10.1 Start a compute job using a free C2D environment', async () => {
    /// ```Typescript
    const computeEnv = computeEnvs.find((ce) => ce.priceMin === 0)
    /// ```
    /// let's check the free compute environment
    /// ```Typescript
    assert(computeEnv, 'Cannot find the free compute env')

    /// ```
    /// Let's have 5 minute of compute access
    /// ```Typescript
    const mytime = new Date()
    const computeMinutes = 5
    mytime.setMinutes(mytime.getMinutes() + computeMinutes)
    const computeValidUntil = Math.floor(mytime.getTime() / 1000)

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDatasetDdo.id,
        serviceId: resolvedDatasetDdo.services[0].id
      }
    ]
    const dtAddressArray = [resolvedDatasetDdo.services[0].datatokenAddress]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgorithmDdo.id,
      serviceId: resolvedAlgorithmDdo.services[0].id
    }

    const providerInitializeComputeResults = await ProviderInstance.initializeCompute(
      assets,
      algo,
      computeEnv.id,
      computeValidUntil,
      providerUrl,
      consumerAccount
    )
    console.log(
      'compute flow initializeCompute result = ',
      providerInitializeComputeResults
    )
    assert(!('error' in providerInitializeComputeResults), 'Cannot order algorithm')
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
      web3,
      consumerAccount,
      computeEnv.id,
      assets[0],
      algo
    )
    // freeEnvDatasetTxId = assets[0].transferTxId
    // freeEnvAlgoTxId = algo.transferTxId
    assert(computeJobs, 'Cannot start compute job')
    computeJobId = computeJobs[0].jobId
  }) ///
  /// ```

  /// ## 11. Check compute status and get download compute results URL
  it('11.1 Check compute status', async () => {
    /// ```Typescript
    const jobStatus = await ProviderInstance.computeStatus(
      providerUrl,
      consumerAccount,
      computeJobId,
      DATASET_DDO.id
    )
    assert(jobStatus, 'Cannot retrieve compute status!')
    console.log(jobStatus)
  }) ///
  /// ```

  it('11.2 Get download compute results URL', async () => {
    /// ```Typescript
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
  }) ///
  /// ```
}) ///

/// ## Editing this file
/// Please note that C2DExamples.md is an autogenerated file, you should not edit it directly.
/// Updates should be done in `test/integration/C2DExamples.test.ts` and all markdown should have three forward slashes before it
/// e.g. `/// # H1 Title`
