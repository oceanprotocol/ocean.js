import { assert } from 'chai'
import { SHA256 } from 'crypto-js'
import { AbiItem } from 'web3-utils'
import { web3, getTestConfig, getAddresses } from '../config'
import {
  Config,
  ProviderInstance,
  Aquarius,
  NftFactory,
  NftCreateData,
  Datatoken,
  Nft,
  ZERO_ADDRESS,
  approveWei,
  calculateEstimatedGas,
  sendTx
} from '../../src'
import {
  DatatokenCreateParams,
  ComputeJob,
  ComputeAsset,
  ComputeAlgorithm,
  ProviderComputeInitialize,
  ConsumeMarketFee,
  Files
} from '../../src/@types'

let config: Config

let aquarius: Aquarius
let datatoken: Datatoken
let providerUrl: string
let consumerAccount: string
let publisherAccount: string
let providerInitializeComputeResults
let computeEnvs
let addresses: any
let ddoWith5mTimeoutId
let ddoWithNoTimeoutId
let algoDdoWith5mTimeoutId
let algoDdoWithNoTimeoutId

let freeComputeJobId: string
let paidComputeJobId: string

let resolvedDdoWith5mTimeout
let resolvedDdoWithNoTimeout
let resolvedAlgoDdoWith5mTimeout
let resolvedAlgoDdoWithNoTimeout

let freeEnvDatasetTxId
let freeEnvAlgoTxId
let paidEnvDatasetTxId
let paidEnvAlgoTxId
let computeValidUntil

const assetUrl: Files = {
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
const ddoWithNoTimeout = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
  chainId: 4,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'dataset',
    name: 'dfgdfgdg',
    description: 'd dfgd fgd dfg dfgdfgd dfgdf',
    tags: [''],
    author: 'dd',
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
      serviceEndpoint: 'https://v4.provider.goerli.oceanprotocol.com',
      timeout: 0,
      compute: {
        publisherTrustedAlgorithmPublishers: [],
        publisherTrustedAlgorithms: [],
        allowRawAlgorithm: true,
        allowNetworkAccess: true
      }
    }
  ]
}

const ddoWith5mTimeout = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
  chainId: 4,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'dataset',
    name: 'dfgdfgdg',
    description: 'd dfgd fgd dfg dfgdfgd dfgdf',
    tags: [''],
    author: 'dd',
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
      serviceEndpoint: 'https://v4.provider.goerli.oceanprotocol.com',
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
const algoAssetUrl: Files = {
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
const algoDdoWithNoTimeout = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
  chainId: 4,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'algorithm',
    name: 'dfgdfgdg',
    description: 'd dfgd fgd dfg dfgdfgd dfgdf',
    tags: [''],
    author: 'dd',
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
      serviceEndpoint: 'https://v4.provider.goerli.oceanprotocol.com',
      timeout: 0
    }
  ]
}

const algoDdoWith5mTimeout = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
  chainId: 4,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'algorithm',
    name: 'dfgdfgdg',
    description: 'd dfgd fgd dfg dfgdfgd dfgdf',
    tags: [''],
    author: 'dd',
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
      serviceEndpoint: 'https://v4.provider.goerli.oceanprotocol.com',
      timeout: 300
    }
  ]
}

async function createAsset(
  name: string,
  symbol: string,
  owner: string,
  assetUrl: any,
  ddo: any,
  providerUrl: string
) {
  const nft = new Nft(web3)
  const Factory = new NftFactory(addresses.ERC721Factory, web3)

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

  const result = await Factory.createNftWithDatatoken(
    owner,
    nftParamsAsset,
    datatokenParams
  )

  const nftAddress = result.events.NFTCreated.returnValues[0]
  const datatokenAddressAsset = result.events.TokenCreated.returnValues[0]
  ddo.nftAddress = web3.utils.toChecksumAddress(nftAddress)
  // create the files encrypted string
  assetUrl.datatokenAddress = datatokenAddressAsset
  assetUrl.nftAddress = ddo.nftAddress
  let providerResponse = await ProviderInstance.encrypt(assetUrl, chain, providerUrl)
  ddo.services[0].files = await providerResponse
  ddo.services[0].datatokenAddress = datatokenAddressAsset
  ddo.services[0].serviceEndpoint = providerUrl
  // update ddo and set the right did
  ddo.nftAddress = web3.utils.toChecksumAddress(nftAddress)
  ddo.id =
    'did:op:' + SHA256(web3.utils.toChecksumAddress(nftAddress) + chain.toString(10))
  providerResponse = await ProviderInstance.encrypt(ddo, chain, providerUrl)
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

async function handleOrder(
  order: ProviderComputeInitialize,
  datatokenAddress: string,
  payerAccount: string,
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

function delay(interval: number) {
  return it('should delay', (done) => {
    setTimeout(() => done(), interval)
  }).timeout(interval + 100)
}

describe('Simple compute tests', async () => {
  before(async () => {
    config = await getTestConfig(web3)
    addresses = getAddresses()
    aquarius = new Aquarius(config.metadataCacheUri)
    providerUrl = config.providerUri
    datatoken = new Datatoken(web3)
  })

  it('should publish datasets and algorithms', async () => {
    const accounts = await web3.eth.getAccounts()
    publisherAccount = accounts[0]
    consumerAccount = accounts[1]
    // mint Ocean
    /// <!--
    // mint ocean to publisherAccount
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

    ddoWith5mTimeoutId = await createAsset(
      'D1Min',
      'D1M',
      publisherAccount,
      assetUrl,
      ddoWith5mTimeout,
      providerUrl
    )
    ddoWithNoTimeoutId = await createAsset(
      'D1Min',
      'D1M',
      publisherAccount,
      assetUrl,
      ddoWithNoTimeout,
      providerUrl
    )
    algoDdoWith5mTimeoutId = await createAsset(
      'A1Min',
      'A1M',
      publisherAccount,
      algoAssetUrl,
      algoDdoWith5mTimeout,
      providerUrl
    )

    algoDdoWithNoTimeoutId = await createAsset(
      'A1Min',
      'A1M',
      publisherAccount,
      algoAssetUrl,
      algoDdoWithNoTimeout,
      providerUrl
    )
  })

  it('should resolve published datasets and algorithms', async () => {
    resolvedDdoWith5mTimeout = await aquarius.waitForAqua(ddoWith5mTimeoutId)
    assert(resolvedDdoWith5mTimeout, 'Cannot fetch DDO from Aquarius')
    resolvedDdoWithNoTimeout = await aquarius.waitForAqua(ddoWithNoTimeoutId)
    assert(resolvedDdoWithNoTimeout, 'Cannot fetch DDO from Aquarius')
    resolvedAlgoDdoWith5mTimeout = await aquarius.waitForAqua(algoDdoWith5mTimeoutId)
    assert(resolvedAlgoDdoWith5mTimeout, 'Cannot fetch DDO from Aquarius')
    resolvedAlgoDdoWithNoTimeout = await aquarius.waitForAqua(algoDdoWithNoTimeoutId)
    assert(resolvedAlgoDdoWithNoTimeout, 'Cannot fetch DDO from Aquarius')
  })

  it('should send DT to consumer', async () => {
    const datatoken = new Datatoken(web3)
    await datatoken.mint(
      resolvedDdoWith5mTimeout.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    await datatoken.mint(
      resolvedDdoWithNoTimeout.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    await datatoken.mint(
      resolvedAlgoDdoWith5mTimeout.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
    await datatoken.mint(
      resolvedAlgoDdoWithNoTimeout.services[0].datatokenAddress,
      publisherAccount,
      '10',
      consumerAccount
    )
  })

  it('should fetch compute environments from provider', async () => {
    // get compute environments
    computeEnvs = await ProviderInstance.getComputeEnvironments(providerUrl)
    assert(computeEnvs, 'No Compute environments found')
  })

  it('should start a computeJob using the free environment', async () => {
    // let's have 5 minute of compute access
    const mytime = new Date()
    const computeMinutes = 5
    mytime.setMinutes(mytime.getMinutes() + computeMinutes)
    computeValidUntil = Math.floor(mytime.getTime() / 1000)

    // we choose the free env
    const computeEnv = computeEnvs[resolvedDdoWith5mTimeout.chainId].find(
      (ce) => ce.priceMin === 0
    )
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith5mTimeout.id,
        serviceId: resolvedDdoWith5mTimeout.services[0].id
      }
    ]
    const dtAddressArray = [resolvedDdoWith5mTimeout.services[0].datatokenAddress]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith5mTimeout.id,
      serviceId: resolvedAlgoDdoWith5mTimeout.services[0].id
    }

    providerInitializeComputeResults = await ProviderInstance.initializeCompute(
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
    assert(
      !('error' in providerInitializeComputeResults.algorithm),
      'Cannot order algorithm'
    )
    algo.transferTxId = await handleOrder(
      providerInitializeComputeResults.algorithm,
      resolvedAlgoDdoWith5mTimeout.services[0].datatokenAddress,
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
    freeEnvDatasetTxId = assets[0].transferTxId
    freeEnvAlgoTxId = algo.transferTxId
    assert(computeJobs, 'Cannot start compute job')
    freeComputeJobId = computeJobs[0].jobId
  })

  delay(100000)

  it('Check compute status', async () => {
    const jobStatus = (await ProviderInstance.computeStatus(
      providerUrl,
      consumerAccount,
      freeComputeJobId,
      resolvedDdoWith5mTimeout.id
    )) as ComputeJob
    assert(jobStatus, 'Cannot retrieve compute status!')
  })

  // move to start orders with initial txid's and provider fees
  it('should restart a computeJob without paying anything, because order is valid and providerFees are still valid', async () => {
    // we choose the free env
    const computeEnv = computeEnvs[resolvedDdoWith5mTimeout.chainId].find(
      (ce) => ce.priceMin === 0
    )
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith5mTimeout.id,
        serviceId: resolvedDdoWith5mTimeout.services[0].id,
        transferTxId: freeEnvDatasetTxId
      }
    ]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith5mTimeout.id,
      serviceId: resolvedAlgoDdoWith5mTimeout.services[0].id,
      transferTxId: freeEnvAlgoTxId
    }
    providerInitializeComputeResults = await ProviderInstance.initializeCompute(
      assets,
      algo,
      computeEnv.id,
      computeValidUntil,
      providerUrl,
      consumerAccount
    )
    assert(
      providerInitializeComputeResults.algorithm.validOrder,
      'We should have a valid order for algorithm'
    )
    assert(
      !providerInitializeComputeResults.algorithm.providerFee,
      'We should not pay providerFees again for algorithm'
    )
    assert(
      providerInitializeComputeResults.datasets[0].validOrder,
      'We should have a valid order for dataset'
    )
    assert(
      !providerInitializeComputeResults.datasets[0].providerFee,
      'We should not pay providerFees again for dataset'
    )
    algo.transferTxId = providerInitializeComputeResults.algorithm.validOrder
    assets[0].transferTxId = providerInitializeComputeResults.datasets[0].validOrder
    assert(
      algo.transferTxId === freeEnvAlgoTxId &&
        assets[0].transferTxId === freeEnvDatasetTxId,
      'We should use the same orders, because no fess must be paid'
    )
    const computeJobs = await ProviderInstance.computeStart(
      providerUrl,
      web3,
      consumerAccount,
      computeEnv.id,
      assets[0],
      algo
    )
    assert(computeJobs, 'Cannot start compute job')
  })

  // moving to paid environments

  it('should start a computeJob on a paid environment', async () => {
    // we choose the paid env
    const computeEnv = computeEnvs[resolvedDdoWith5mTimeout.chainId].find(
      (ce) => ce.priceMin !== 0
    )
    assert(computeEnv, 'Cannot find the paid compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith5mTimeout.id,
        serviceId: resolvedDdoWith5mTimeout.services[0].id
      }
    ]
    const dtAddressArray = [resolvedDdoWith5mTimeout.services[0].datatokenAddress]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith5mTimeout.id,
      serviceId: resolvedAlgoDdoWith5mTimeout.services[0].id
    }

    providerInitializeComputeResults = await ProviderInstance.initializeCompute(
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
      resolvedAlgoDdoWith5mTimeout.services[0].datatokenAddress,
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
    paidEnvDatasetTxId = assets[0].transferTxId
    paidEnvAlgoTxId = algo.transferTxId
    assert(computeJobs, 'Cannot start compute job')
    paidComputeJobId = computeJobs[0].jobId
  })

  delay(100000)

  it('Check compute status', async () => {
    const jobStatus = (await ProviderInstance.computeStatus(
      providerUrl,
      consumerAccount,
      paidComputeJobId,
      resolvedDdoWith5mTimeout.id
    )) as ComputeJob
    assert(jobStatus, 'Cannot retrieve compute status!')
  })

  it('should restart a computeJob on paid environment, without paying anything, because order is valid and providerFees are still valid', async () => {
    // we choose the paid env
    const computeEnv = computeEnvs[resolvedDdoWith5mTimeout.chainId].find(
      (ce) => ce.priceMin !== 0
    )
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith5mTimeout.id,
        serviceId: resolvedDdoWith5mTimeout.services[0].id,
        transferTxId: paidEnvDatasetTxId
      }
    ]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith5mTimeout.id,
      serviceId: resolvedAlgoDdoWith5mTimeout.services[0].id,
      transferTxId: paidEnvAlgoTxId
    }

    providerInitializeComputeResults = await ProviderInstance.initializeCompute(
      assets,
      algo,
      computeEnv.id,
      computeValidUntil,
      providerUrl,
      consumerAccount
    )
    assert(
      providerInitializeComputeResults.algorithm.validOrder,
      'We should have a valid order for algorithm'
    )
    assert(
      !providerInitializeComputeResults.algorithm.providerFee,
      'We should not pay providerFees again for algorithm'
    )
    assert(
      providerInitializeComputeResults.datasets[0].validOrder,
      'We should have a valid order for dataset'
    )
    assert(
      !providerInitializeComputeResults.datasets[0].providerFee,
      'We should not pay providerFees again for dataset'
    )
    algo.transferTxId = providerInitializeComputeResults.algorithm.validOrder
    assets[0].transferTxId = providerInitializeComputeResults.datasets[0].validOrder
    assert(
      algo.transferTxId === paidEnvAlgoTxId &&
        assets[0].transferTxId === paidEnvDatasetTxId,
      'We should use the same orders, because no fess must be paid'
    )
    const computeJobs = await ProviderInstance.computeStart(
      providerUrl,
      web3,
      consumerAccount,
      computeEnv.id,
      assets[0],
      algo
    )
    assert(computeJobs, 'Cannot start compute job')
  })

  // move to reuse Orders

  it('Should fast forward time and set a new computeValidUntil', async () => {
    const mytime = new Date()
    const computeMinutes = 5
    mytime.setMinutes(mytime.getMinutes() + computeMinutes)
    computeValidUntil = Math.floor(mytime.getTime() / 1000)
  })

  it('should start a computeJob using the free environment, by paying only providerFee (reuseOrder)', async () => {
    // we choose the free env
    const computeEnv = computeEnvs[resolvedDdoWith5mTimeout.chainId].find(
      (ce) => ce.priceMin === 0
    )
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith5mTimeout.id,
        serviceId: resolvedDdoWith5mTimeout.services[0].id,
        transferTxId: freeEnvDatasetTxId
      }
    ]
    const dtAddressArray = [resolvedDdoWith5mTimeout.services[0].datatokenAddress]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith5mTimeout.id,
      serviceId: resolvedAlgoDdoWith5mTimeout.services[0].id,
      transferTxId: freeEnvAlgoTxId
    }

    providerInitializeComputeResults = await ProviderInstance.initializeCompute(
      assets,
      algo,
      computeEnv.id,
      computeValidUntil,
      providerUrl,
      consumerAccount
    )
    assert(
      providerInitializeComputeResults.algorithm.validOrder,
      'We should have a valid order for algorithm'
    )
    assert(
      providerInitializeComputeResults.datasets[0].validOrder,
      'We should have a valid order for dataset'
    )

    assert(
      providerInitializeComputeResults.algorithm.providerFee ||
        providerInitializeComputeResults.datasets[0].providerFee,
      'We should pay providerFees again for algorithm or dataset. Cannot have empty for both'
    )

    assert(
      !('error' in providerInitializeComputeResults.algorithm),
      'Cannot order algorithm'
    )
    algo.transferTxId = await handleOrder(
      providerInitializeComputeResults.algorithm,
      resolvedAlgoDdoWith5mTimeout.services[0].datatokenAddress,
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
    assert(
      algo.transferTxId !== freeEnvAlgoTxId ||
        assets[0].transferTxId !== freeEnvDatasetTxId,
      'We should not use the same orders, because providerFee must be paid'
    )
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
  })

  it('should start a computeJob using the paid environment, by paying only providerFee (reuseOrder)', async () => {
    // we choose the paid env
    const computeEnv = computeEnvs[resolvedDdoWith5mTimeout.chainId].find(
      (ce) => ce.priceMin !== 0
    )
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith5mTimeout.id,
        serviceId: resolvedDdoWith5mTimeout.services[0].id,
        transferTxId: paidEnvDatasetTxId
      }
    ]
    const dtAddressArray = [resolvedDdoWith5mTimeout.services[0].datatokenAddress]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith5mTimeout.id,
      serviceId: resolvedAlgoDdoWith5mTimeout.services[0].id,
      transferTxId: paidEnvAlgoTxId
    }

    providerInitializeComputeResults = await ProviderInstance.initializeCompute(
      assets,
      algo,
      computeEnv.id,
      computeValidUntil,
      providerUrl,
      consumerAccount
    )
    assert(
      providerInitializeComputeResults.algorithm.validOrder,
      'We should have a valid order for algorithm'
    )
    assert(
      providerInitializeComputeResults.datasets[0].validOrder,
      'We should have a valid order for dataset'
    )
    assert(
      providerInitializeComputeResults.algorithm.providerFee ||
        providerInitializeComputeResults.datasets[0].providerFee,
      'We should pay providerFees again for algorithm or dataset. Cannot have empty for both'
    )

    assert(
      !('error' in providerInitializeComputeResults.algorithm),
      'Cannot order algorithm'
    )
    algo.transferTxId = await handleOrder(
      providerInitializeComputeResults.algorithm,
      resolvedAlgoDdoWith5mTimeout.services[0].datatokenAddress,
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
    assert(
      algo.transferTxId !== paidEnvAlgoTxId ||
        assets[0].transferTxId !== paidEnvDatasetTxId,
      'We should not use the same orders, because providerFee must be paid'
    )
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
  })

  it('Check compute status', async () => {
    const jobStatus = (await ProviderInstance.computeStatus(
      providerUrl,
      consumerAccount,
      freeComputeJobId,
      resolvedDdoWith5mTimeout.id
    )) as ComputeJob
    assert(jobStatus, 'Cannot retrieve compute status!')
  })

  it('Get download compute results url', async () => {
    const downloadURL = await ProviderInstance.getComputeResultUrl(
      providerUrl,
      web3,
      consumerAccount,
      freeComputeJobId,
      0
    )
    assert(downloadURL, 'Provider getComputeResultUrl failed!')
  })
})
