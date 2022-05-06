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
  getHash,
  Nft,
  sleep,
  ZERO_ADDRESS
} from '../../src'
import {
  ProviderFees,
  Erc20CreateParams,
  ComputeJob,
  Asset,
  ComputeAsset,
  ComputeAlgorithm,
  ProviderComputeInitialize,
  ConsumeMarketFee
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

const assetUrl = [
  {
    type: 'url',
    url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
    method: 'GET'
  }
]
const ddoWithNoTimeout = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.0.0',
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
      serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
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
  version: '4.0.0',
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
      serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
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
const algoAssetUrl = [
  {
    type: 'url',
    url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
    method: 'GET'
  }
]
const algoDdoWithNoTimeout = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.0.0',
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
        checksum: '44e10daa6637893f4276bb8d7301eb35306ece50f61ca34dcab550'
      }
    }
  },
  services: [
    {
      id: 'notAnId',
      type: 'access',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
      timeout: 0
    }
  ]
}

const algoDdoWith1mTimeout = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.0.0',
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
        checksum: '44e10daa6637893f4276bb8d7301eb35306ece50f61ca34dcab550'
      }
    }
  },
  services: [
    {
      id: 'notAnId',
      type: 'access',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
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
    name: name,
    symbol: symbol,
    templateIndex: 1,
    tokenURI: 'aaa',
    transferable: true,
    owner: owner
  }
  const erc20ParamsAsset: Erc20CreateParams = {
    templateIndex: 1,
    cap: '100000',
    feeAmount: '0',
    paymentCollector: ZERO_ADDRESS,
    feeToken: ZERO_ADDRESS,
    minter: owner,
    mpFeeAddress: ZERO_ADDRESS
  }

  const result = await Factory.createNftWithErc20(owner, nftParamsAsset, erc20ParamsAsset)

  const erc721AddressAsset = result.events.NFTCreated.returnValues[0]
  const datatokenAddressAsset = result.events.TokenCreated.returnValues[0]
  // create the files encrypted string
  let providerResponse = await ProviderInstance.encrypt(assetUrl, providerUrl)
  ddo.services[0].files = await providerResponse
  ddo.services[0].datatokenAddress = datatokenAddressAsset
  ddo.services[0].serviceEndpoint = providerUrl
  // update ddo and set the right did
  ddo.nftAddress = web3.utils.toChecksumAddress(erc721AddressAsset)
  ddo.id =
    'did:op:' +
    SHA256(web3.utils.toChecksumAddress(erc721AddressAsset) + chain.toString(10))
  providerResponse = await ProviderInstance.encrypt(ddo, providerUrl)
  const encryptedResponse = await providerResponse
  const validateResult = await aquarius.validate(ddo)
  assert(validateResult.valid, 'Could not validate metadata')
  const res = await nft.setMetadata(
    erc721AddressAsset,
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
    await datatoken.approve(
      order.providerFee.providerFeeToken,
      datatokenAddress,
      order.providerFee.providerFeeAmount,
      payerAccount
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

  it('should start a computeJob', async () => {
    // we choose the first env
    const computeEnv = computeEnvs[0].id
    const computeConsumerAddress = computeEnvs[0].consumerAddress
    // let's have 10 minutesof compute access
    const mytime = new Date()
    mytime.setMinutes(mytime.getMinutes() + 19)
    const computeValidUntil = Math.floor(mytime.getTime() / 1000)
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
      computeEnv,
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
      computeConsumerAddress,
      0
    )
    for (let i = 0; i < providerInitializeComputeResults.datasets.length; i++) {
      assets[i].transferTxId = await handleOrder(
        providerInitializeComputeResults.datasets[i],
        dtAddressArray[i],
        consumerAccount,
        computeConsumerAddress,
        0
      )
    }
    const computeJobs = await ProviderInstance.computeStart(
      providerUrl,
      web3,
      consumerAccount,
      computeEnv,
      assets[0],
      algo
    )
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
    sleep(10000)
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
