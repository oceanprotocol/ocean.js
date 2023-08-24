import { assert } from 'chai'
import { ethers, Signer } from 'ethers'
import { getTestConfig, getAddresses, provider } from '../config'
import {
  Config,
  ProviderInstance,
  Aquarius,
  Datatoken,
  sendTx,
  amountToUnits
} from '../../src'
import { ComputeJob, ComputeAsset, ComputeAlgorithm, Files } from '../../src/@types'
import { createAsset, handleComputeOrder } from './helpers'

let config: Config

let aquarius: Aquarius
let datatoken: Datatoken
let providerUrl: string
let consumerAccount: Signer
let publisherAccount: Signer
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
      serviceEndpoint: 'http://172.15.0.4:8030',
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
      serviceEndpoint: 'http://172.15.0.4:8030',
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
      serviceEndpoint: 'http://172.15.0.4:8030',
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
      serviceEndpoint: 'http://172.15.0.4:8030',
      timeout: 300
    }
  ]
}

function delay(interval: number) {
  return it('should delay', (done) => {
    setTimeout(() => done(), interval)
  }).timeout(interval + 100)
}

async function waitTillJobEnds(): Promise<number> {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const jobStatus = (await ProviderInstance.computeStatus(
        providerUrl,
        await consumerAccount.getAddress(),
        freeComputeJobId,
        resolvedDdoWith5mTimeout.id
      )) as ComputeJob
      if (jobStatus?.status === 70) {
        clearInterval(interval)
        resolve(jobStatus.status)
      }
    }, 10000)
  })
}

describe('Compute flow tests', async () => {
  before(async () => {
    publisherAccount = (await provider.getSigner(0)) as Signer
    consumerAccount = (await provider.getSigner(1)) as Signer
    config = await getTestConfig(publisherAccount)
    aquarius = new Aquarius(config?.metadataCacheUri)
    providerUrl = config?.providerUri
    addresses = getAddresses()
  })

  it('should publish datasets and algorithms', async () => {
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

    // mint ocean to consumer
    const estGasConsumer = await tokenContract.estimateGas.mint(
      await consumerAccount.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )

    await sendTx(
      estGasConsumer,
      consumerAccount,
      1,
      tokenContract.mint,
      await consumerAccount.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )

    ddoWith5mTimeoutId = await createAsset(
      'D1Min',
      'D1M',
      publisherAccount,
      assetUrl,
      ddoWith5mTimeout,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    ddoWithNoTimeoutId = await createAsset(
      'D1Min',
      'D1M',
      publisherAccount,
      assetUrl,
      ddoWithNoTimeout,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    algoDdoWith5mTimeoutId = await createAsset(
      'A1Min',
      'A1M',
      publisherAccount,
      algoAssetUrl,
      algoDdoWith5mTimeout,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )

    algoDdoWithNoTimeoutId = await createAsset(
      'A1Min',
      'A1M',
      publisherAccount,
      algoAssetUrl,
      algoDdoWithNoTimeout,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
  })

  delay(10000)

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
    const datatoken = new Datatoken(
      publisherAccount,
      (await publisherAccount.provider.getNetwork()).chainId
    )
    await datatoken.mint(
      resolvedDdoWith5mTimeout.services[0].datatokenAddress,
      await publisherAccount.getAddress(),
      '10',
      await consumerAccount.getAddress()
    )
    await datatoken.mint(
      resolvedDdoWithNoTimeout.services[0].datatokenAddress,
      await publisherAccount.getAddress(),
      '10',
      await consumerAccount.getAddress()
    )
    await datatoken.mint(
      resolvedAlgoDdoWith5mTimeout.services[0].datatokenAddress,
      await publisherAccount.getAddress(),
      '10',
      await consumerAccount.getAddress()
    )
    await datatoken.mint(
      resolvedAlgoDdoWithNoTimeout.services[0].datatokenAddress,
      await publisherAccount.getAddress(),
      '10',
      await consumerAccount.getAddress()
    )
  })

  it('should fetch compute environments from provider', async () => {
    // get compute environments
    computeEnvs = await ProviderInstance.getComputeEnvironments(providerUrl)
    assert(computeEnvs, 'No Compute environments found')
  })

  it('should start a computeJob using the free environment', async () => {
    datatoken = new Datatoken(
      consumerAccount,
      (await consumerAccount.provider.getNetwork()).chainId
    )
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
      await consumerAccount.getAddress()
    )
    assert(
      !('error' in providerInitializeComputeResults.algorithm),
      'Cannot order algorithm'
    )
    algo.transferTxId = await handleComputeOrder(
      providerInitializeComputeResults.algorithm,
      resolvedAlgoDdoWith5mTimeout.services[0].datatokenAddress,
      consumerAccount,
      computeEnv.consumerAddress,
      0,
      datatoken,
      config
    )

    for (let i = 0; i < providerInitializeComputeResults.datasets.length; i++) {
      assets[i].transferTxId = await handleComputeOrder(
        providerInitializeComputeResults.datasets[i],
        dtAddressArray[i],
        consumerAccount,
        computeEnv.consumerAddress,
        0,
        datatoken,
        config
      )
    }
    const computeJobs = await ProviderInstance.computeStart(
      providerUrl,
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

  const jobFinished = await waitTillJobEnds()
  console.log('Job finished: ', jobFinished)

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
      await consumerAccount.getAddress()
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
      consumerAccount,
      computeEnv.id,
      assets[0],
      algo
    )
    assert(computeJobs, 'Cannot start compute job')
  })

  //   // moving to paid environments

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
      await consumerAccount.getAddress()
    )
    assert(
      !('error' in providerInitializeComputeResults.algorithm),
      'Cannot order algorithm'
    )
    algo.transferTxId = await handleComputeOrder(
      providerInitializeComputeResults.algorithm,
      resolvedAlgoDdoWith5mTimeout.services[0].datatokenAddress,
      consumerAccount,
      computeEnv.consumerAddress,
      0,
      datatoken,
      config
    )
    for (let i = 0; i < providerInitializeComputeResults.datasets.length; i++) {
      assets[i].transferTxId = await handleComputeOrder(
        providerInitializeComputeResults.datasets[i],
        dtAddressArray[i],
        consumerAccount,
        computeEnv.consumerAddress,
        0,
        datatoken,
        config
      )
    }

    const computeJobs = await ProviderInstance.computeStart(
      providerUrl,
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
      await consumerAccount.getAddress(),
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
      await consumerAccount.getAddress()
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
      await consumerAccount.getAddress()
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
    algo.transferTxId = await handleComputeOrder(
      providerInitializeComputeResults.algorithm,
      resolvedAlgoDdoWith5mTimeout.services[0].datatokenAddress,
      consumerAccount,
      computeEnv.consumerAddress,
      0,
      datatoken,
      config
    )
    for (let i = 0; i < providerInitializeComputeResults.datasets.length; i++) {
      assets[i].transferTxId = await handleComputeOrder(
        providerInitializeComputeResults.datasets[i],
        dtAddressArray[i],
        consumerAccount,
        computeEnv.consumerAddress,
        0,
        datatoken,
        config
      )
    }
    assert(
      algo.transferTxId !== freeEnvAlgoTxId ||
        assets[0].transferTxId !== freeEnvDatasetTxId,
      'We should not use the same orders, because providerFee must be paid'
    )
    const computeJobs = await ProviderInstance.computeStart(
      providerUrl,
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
      await consumerAccount.getAddress()
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
    algo.transferTxId = await handleComputeOrder(
      providerInitializeComputeResults.algorithm,
      resolvedAlgoDdoWith5mTimeout.services[0].datatokenAddress,
      consumerAccount,
      computeEnv.consumerAddress,
      0,
      datatoken,
      config
    )
    for (let i = 0; i < providerInitializeComputeResults.datasets.length; i++) {
      assets[i].transferTxId = await handleComputeOrder(
        providerInitializeComputeResults.datasets[i],
        dtAddressArray[i],
        consumerAccount,
        computeEnv.consumerAddress,
        0,
        datatoken,
        config
      )
    }
    assert(
      algo.transferTxId !== paidEnvAlgoTxId ||
        assets[0].transferTxId !== paidEnvDatasetTxId,
      'We should not use the same orders, because providerFee must be paid'
    )
    const computeJobs = await ProviderInstance.computeStart(
      providerUrl,
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
      await consumerAccount.getAddress(),
      freeComputeJobId,
      resolvedDdoWith5mTimeout.id
    )) as ComputeJob
    assert(jobStatus, 'Cannot retrieve compute status!')
  })

  it('Get download compute results url', async () => {
    const downloadURL = await ProviderInstance.getComputeResultUrl(
      providerUrl,
      consumerAccount,
      freeComputeJobId,
      0
    )
    assert(downloadURL, 'Provider getComputeResultUrl failed!')
  })
})
