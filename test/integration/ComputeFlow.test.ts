import { assert } from 'chai'
import { SHA256 } from 'crypto-js'
import { web3, getTestConfig, getAddresses } from '../config'
import {
  Config,
  ProviderInstance,
  Aquarius,
  NftFactory,
  NftCreateData,
  Datatoken,
  Nft,
  sleep,
  ZERO_ADDRESS,
  approveWei
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
let computeJobId: string
let providerInitializeComputeResults
let computeEnvs
let addresses: any
let ddoWith1mTimeoutId
let ddoWithNoTimeoutId
let algoDdoWith1mTimeoutId
let algoDdoWithNoTimeoutId

let resolvedDdoWith1mTimeout
let resolvedDdoWithNoTimeout
let resolvedAlgoDdoWith1mTimeout
let resolvedAlgoDdoWithNoTimeout

let freeEnvDatasetTxId
let freeEnvAlgoTxId
let paidEnvDatasetTxId
let paidEnvAlgoTxId

// let's have 2 minutes of compute access
const mytime = new Date()
const computeMinutes = 1
mytime.setMinutes(mytime.getMinutes() + computeMinutes)
let computeValidUntil = Math.floor(mytime.getTime() / 1000)

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
      serviceEndpoint: 'https://v4.provider.rinkeby.oceanprotocol.com',
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

const ddoWith1mTimeout = {
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
      serviceEndpoint: 'https://v4.provider.rinkeby.oceanprotocol.com',
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
          'sha256:42ba2dfce475de1113d55602d40af18415897167d47c2045ec7b6d9746ff148f'
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
      timeout: 0
    }
  ]
}

const algoDdoWith1mTimeout = {
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
          'sha256:42ba2dfce475de1113d55602d40af18415897167d47c2045ec7b6d9746ff148f'
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
      timeout: 60
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
  let providerResponse = await ProviderInstance.encrypt(assetUrl, providerUrl)
  ddo.services[0].files = await providerResponse
  ddo.services[0].datatokenAddress = datatokenAddressAsset
  ddo.services[0].serviceEndpoint = providerUrl
  // update ddo and set the right did
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
    ddoWith1mTimeoutId = await createAsset(
      'D1Min',
      'D1M',
      publisherAccount,
      assetUrl,
      ddoWith1mTimeout,
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
    algoDdoWith1mTimeoutId = await createAsset(
      'A1Min',
      'A1M',
      publisherAccount,
      algoAssetUrl,
      algoDdoWith1mTimeout,
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
    resolvedDdoWith1mTimeout = await aquarius.waitForAqua(ddoWith1mTimeoutId)
    assert(resolvedDdoWith1mTimeout, 'Cannot fetch DDO from Aquarius')
    resolvedDdoWithNoTimeout = await aquarius.waitForAqua(ddoWithNoTimeoutId)
    assert(resolvedDdoWithNoTimeout, 'Cannot fetch DDO from Aquarius')
    resolvedAlgoDdoWith1mTimeout = await aquarius.waitForAqua(algoDdoWith1mTimeoutId)
    assert(resolvedAlgoDdoWith1mTimeout, 'Cannot fetch DDO from Aquarius')
    resolvedAlgoDdoWithNoTimeout = await aquarius.waitForAqua(algoDdoWithNoTimeoutId)
    assert(resolvedAlgoDdoWithNoTimeout, 'Cannot fetch DDO from Aquarius')
  })

  it('should send DT to consumer', async () => {
    const datatoken = new Datatoken(web3)
    await datatoken.mint(
      resolvedDdoWith1mTimeout.services[0].datatokenAddress,
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
      resolvedAlgoDdoWith1mTimeout.services[0].datatokenAddress,
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
    // we choose the free env
    const computeEnv = computeEnvs.find((ce) => ce.priceMin === 0)
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith1mTimeout.id,
        serviceId: resolvedDdoWith1mTimeout.services[0].id
      }
    ]
    const dtAddressArray = [resolvedDdoWith1mTimeout.services[0].datatokenAddress]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith1mTimeout.id,
      serviceId: resolvedAlgoDdoWith1mTimeout.services[0].id
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
      resolvedAlgoDdoWith1mTimeout.services[0].datatokenAddress,
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
    computeJobId = computeJobs[0].jobId
  })

  it('should restart a computeJob without paying anything, because order is valid and providerFees are still valid', async () => {
    // wait 1 min time so the other compute job finishes his job
    await sleep(60000)

    // we choose the free env
    const computeEnv = computeEnvs.find((ce) => ce.priceMin === 0)
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith1mTimeout.id,
        serviceId: resolvedDdoWith1mTimeout.services[0].id,
        transferTxId: freeEnvDatasetTxId
      }
    ]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith1mTimeout.id,
      serviceId: resolvedAlgoDdoWith1mTimeout.services[0].id,
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
    computeJobId = computeJobs[0].jobId
  })

  // moving to paid environments

  it('should start a computeJob on a paid environment', async () => {
    // we choose the paid env
    const computeEnv = computeEnvs.find((ce) => ce.priceMin !== 0)
    assert(computeEnv, 'Cannot find the paid compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith1mTimeout.id,
        serviceId: resolvedDdoWith1mTimeout.services[0].id
      }
    ]
    const dtAddressArray = [resolvedDdoWith1mTimeout.services[0].datatokenAddress]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith1mTimeout.id,
      serviceId: resolvedAlgoDdoWith1mTimeout.services[0].id
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
      resolvedAlgoDdoWith1mTimeout.services[0].datatokenAddress,
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
    computeJobId = computeJobs[0].jobId
  })

  it('should restart a computeJob on paid environment, without paying anything, because order is valid and providerFees are still valid', async () => {
    // we choose the paid env
    const computeEnv = computeEnvs.find((ce) => ce.priceMin !== 0)
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith1mTimeout.id,
        serviceId: resolvedDdoWith1mTimeout.services[0].id,
        transferTxId: paidEnvDatasetTxId
      }
    ]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith1mTimeout.id,
      serviceId: resolvedAlgoDdoWith1mTimeout.services[0].id,
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
    computeJobId = computeJobs[0].jobId
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
    const computeEnv = computeEnvs.find((ce) => ce.priceMin === 0)
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith1mTimeout.id,
        serviceId: resolvedDdoWith1mTimeout.services[0].id,
        transferTxId: freeEnvDatasetTxId
      }
    ]
    const dtAddressArray = [resolvedDdoWith1mTimeout.services[0].datatokenAddress]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith1mTimeout.id,
      serviceId: resolvedAlgoDdoWith1mTimeout.services[0].id,
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
      resolvedAlgoDdoWith1mTimeout.services[0].datatokenAddress,
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
    freeEnvDatasetTxId = assets[0].transferTxId
    freeEnvAlgoTxId = algo.transferTxId
    assert(computeJobs, 'Cannot start compute job')
    computeJobId = computeJobs[0].jobId
  })

  it('should start a computeJob using the paid environment, by paying only providerFee (reuseOrder)', async () => {
    // we choose the paid env
    const computeEnv = computeEnvs.find((ce) => ce.priceMin !== 0)
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith1mTimeout.id,
        serviceId: resolvedDdoWith1mTimeout.services[0].id,
        transferTxId: paidEnvDatasetTxId
      }
    ]
    const dtAddressArray = [resolvedDdoWith1mTimeout.services[0].datatokenAddress]
    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith1mTimeout.id,
      serviceId: resolvedAlgoDdoWith1mTimeout.services[0].id,
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
      resolvedAlgoDdoWith1mTimeout.services[0].datatokenAddress,
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
    freeEnvDatasetTxId = assets[0].transferTxId
    freeEnvAlgoTxId = algo.transferTxId
    assert(computeJobs, 'Cannot start compute job')
    computeJobId = computeJobs[0].jobId
  })

  it('Check compute status', async () => {
    const jobStatus = (await ProviderInstance.computeStatus(
      providerUrl,
      consumerAccount,
      computeJobId,
      resolvedDdoWith1mTimeout.id
    )) as ComputeJob
    assert(jobStatus, 'Cannot retrieve compute status!')
  })

  it('Get download compute results url', async () => {
    await sleep(10000)
    const downloadURL = await ProviderInstance.getComputeResultUrl(
      providerUrl,
      web3,
      consumerAccount,
      computeJobId,
      0
    )
    assert(downloadURL, 'Provider getComputeResultUrl failed!')
  })
})
