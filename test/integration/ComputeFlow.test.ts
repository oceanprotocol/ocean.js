import { assert } from 'chai'
import { BigNumber, ethers, Signer } from 'ethers'
import { getTestConfig, getAddresses, provider } from '../config.js'
import {
  Config,
  ProviderInstance,
  Aquarius,
  Datatoken,
  sendTx,
  amountToUnits,
  isDefined
} from '../../src/index.js'
import {
  ComputeJob,
  ComputeAsset,
  ComputeAlgorithm,
  Files
} from '../../src/@types/index.js'
import { createAssetHelper, handleComputeOrder } from './helpers.js'
import { DDO } from '@oceanprotocol/ddo-js'
import { EscrowContract } from '../../src/contracts/Escrow.js'

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
let paymentToken: string

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
let escrow: EscrowContract
let freeComputeRouteSupport = null

const computeJobDuration = 60 * 15 // 15 minutes

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
const ddoWithNoTimeout: DDO = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
  chainId: 8996,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'dataset',
    name: 'dfgdfgdg',
    description: 'd dfgd fgd dfg dfgdfgd dfgdf',
    tags: [''],
    author: 'oceanprotocol',
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
      timeout: 0,
      compute: {
        publisherTrustedAlgorithmPublishers: [] as any,
        publisherTrustedAlgorithms: [] as any,
        allowRawAlgorithm: false,
        allowNetworkAccess: true
      }
    }
  ]
}

const ddoWith5mTimeout: DDO = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
  chainId: 8996,
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
      id: '1155995dda741e93afe4b1c6ced2d01734a6ec69865cc0997daf1f4db7259a36',
      type: 'compute',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'http://127.0.0.1:8001',
      timeout: 300,
      compute: {
        publisherTrustedAlgorithmPublishers: [] as any,
        publisherTrustedAlgorithms: [] as any,
        allowRawAlgorithm: false,
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
const algoDdoWithNoTimeout: DDO = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
  chainId: 8996,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'algorithm',
    name: 'Ocean.js Algo',
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
      id: 'db164c1b981e4d2974e90e61bda121512e6909c1035c908d68933ae4cfaba6b0',
      type: 'access',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'http://127.0.0.1:8001',
      timeout: 0
    }
  ]
}

const algoDdoWith5mTimeout: DDO = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.1.0',
  chainId: 8996,
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
      id: 'db164c1b981e4d2974e90e61bda121512e6909c1035c908d68933ae4cfaba6b0',
      type: 'access',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'http://127.0.0.1:8001',
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
        freeComputeJobId
      )) as ComputeJob
      if (jobStatus?.[0]?.status === 70) {
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
    aquarius = new Aquarius(config?.oceanNodeUri)
    providerUrl = config?.oceanNodeUri
    addresses = getAddresses()
    paymentToken = addresses.Ocean
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
      amountToUnits(null, null, '100000', 18)
    )

    await sendTx(
      estGasPublisher,
      publisherAccount,
      1,
      tokenContract.mint,
      await publisherAccount.getAddress(),
      amountToUnits(null, null, '60000000', 18)
    )

    // mint ocean to consumer
    const estGasConsumer = await tokenContract.estimateGas.mint(
      await consumerAccount.getAddress(),
      amountToUnits(null, null, '60000000', 18)
    )

    await sendTx(
      estGasConsumer,
      consumerAccount,
      1,
      tokenContract.mint,
      await consumerAccount.getAddress(),
      amountToUnits(null, null, '100000', 18)
    )

    ddoWith5mTimeoutId = await createAssetHelper(
      'D1Min',
      'D1M',
      publisherAccount,
      assetUrl,
      ddoWith5mTimeout,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    ddoWithNoTimeoutId = await createAssetHelper(
      'D1Min',
      'D1M',
      publisherAccount,
      assetUrl,
      ddoWithNoTimeout,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )
    algoDdoWith5mTimeoutId = await createAssetHelper(
      'A1Min',
      'A1M',
      publisherAccount,
      algoAssetUrl,
      algoDdoWith5mTimeout,
      providerUrl,
      addresses.ERC721Factory,
      aquarius
    )

    algoDdoWithNoTimeoutId = await createAssetHelper(
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
    resolvedDdoWith5mTimeout = await aquarius.waitForIndexer(ddoWith5mTimeoutId)
    assert(resolvedDdoWith5mTimeout, 'Cannot fetch DDO from Aquarius')
    resolvedDdoWithNoTimeout = await aquarius.waitForIndexer(ddoWithNoTimeoutId)
    assert(resolvedDdoWithNoTimeout, 'Cannot fetch DDO from Aquarius')
    resolvedAlgoDdoWith5mTimeout = await aquarius.waitForIndexer(algoDdoWith5mTimeoutId)
    assert(resolvedAlgoDdoWith5mTimeout, 'Cannot fetch DDO from Aquarius')
    resolvedAlgoDdoWithNoTimeout = await aquarius.waitForIndexer(algoDdoWithNoTimeoutId)
    assert(resolvedAlgoDdoWithNoTimeout, 'Cannot fetch DDO from Aquarius')
  }).timeout(40000)

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
  }).timeout(40000)

  it('should fetch compute environments from provider', async () => {
    // get compute environments
    computeEnvs = await ProviderInstance.getComputeEnvironments(providerUrl)
    assert(computeEnvs, 'No Compute environments found')
  }).timeout(40000)

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
    const computeEnv = computeEnvs.find((ce) => ce.priceMin === 0 || isDefined(ce.free))
    assert(computeEnv, 'Cannot find the free compute env')

    const assets: ComputeAsset[] = [
      {
        documentId: resolvedDdoWith5mTimeout.id,
        serviceId: resolvedDdoWith5mTimeout.services[0].id
      }
    ]

    const algo: ComputeAlgorithm = {
      documentId: resolvedAlgoDdoWith5mTimeout.id,
      serviceId: resolvedAlgoDdoWith5mTimeout.services[0].id,
      meta: resolvedAlgoDdoWith5mTimeout.metadata.algorithm
    }

    freeComputeRouteSupport = await ProviderInstance.getComputeStartRoutes(
      providerUrl,
      true
    )
    if (freeComputeRouteSupport) {
      const computeJobs = await ProviderInstance.freeComputeStart(
        providerUrl,
        consumerAccount,
        computeEnv.id,
        assets,
        algo
      )
      console.log('Compute jobs: ', computeJobs)
      freeEnvDatasetTxId = assets[0].transferTxId
      freeEnvAlgoTxId = algo.transferTxId
      assert(computeJobs, 'Cannot start compute job')
      freeComputeJobId = computeJobs[0].jobId
    } else {
      assert(
        freeComputeRouteSupport === null,
        'Cannot start free compute job. provider at ' +
          providerUrl +
          ' does not implement freeCompute route'
      )
    }
  }).timeout(40000)

  it('Check compute status', async () => {
    const jobStatus = (await ProviderInstance.computeStatus(
      providerUrl,
      await consumerAccount.getAddress(),
      freeComputeJobId
    )) as ComputeJob
    assert(jobStatus, 'Cannot retrieve compute status!')
  }).timeout(40000)

  //   // moving to paid environments

  it('Should fast forward time and set a new computeValidUntil', async () => {
    const mytime = new Date()
    const computeMinutes = 2
    mytime.setMinutes(mytime.getMinutes() + computeMinutes)
    computeValidUntil = Math.floor(mytime.getTime() / 1000)
  })

  it('should start a computeJob on a paid environment', async () => {
    // we choose the paid env
    computeEnvs = await ProviderInstance.getComputeEnvironments(providerUrl)
    const computeEnv = computeEnvs[0] // it is only one environment with paid and free resources
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
      paymentToken,
      computeValidUntil,
      providerUrl,
      consumerAccount
    )
    console.log(
      `providerInitializeComputeResults1: ${JSON.stringify(
        providerInitializeComputeResults
      )}`
    )
    assert(providerInitializeComputeResults.payment, ' Payment structure does not exists')
    assert(
      providerInitializeComputeResults.payment.escrowAddress === addresses.Escrow,
      'Incorrect escrow address'
    )
    assert(
      providerInitializeComputeResults.payment.payee === computeEnv.consumerAddress,
      'Incorrect payee address'
    )
    assert(
      providerInitializeComputeResults.payment.token === paymentToken,
      'Incorrect payment token address'
    )
    const { price } = computeEnv.fees[await consumerAccount.getChainId()][0].prices[0]
    assert(
      Number(
        ethers.utils.formatUnits(providerInitializeComputeResults.payment.amount, 18)
      ) ===
        (computeEnv.maxJobDuration / 60) * price,
      'Incorrect payment token amount'
    ) // 60 minutes per price 1 -> amount = 60
    assert(
      !('error' in providerInitializeComputeResults.algorithm),
      'Cannot order algorithm'
    )
    // escrow adding funds for paid compute
    escrow = new EscrowContract(
      ethers.utils.getAddress(providerInitializeComputeResults.payment.escrowAddress),
      consumerAccount
    )
    const paymentTokenContract = new Datatoken(consumerAccount)
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
    const balanceOfPaymentToken = await paymentTokenContract.balance(
      paymentToken,
      await consumerAccount.getAddress()
    )

    await paymentTokenContract.approve(
      ethers.utils.getAddress(paymentToken),
      ethers.utils.getAddress(providerInitializeComputeResults.payment.escrowAddress),
      (Number(balanceOfPaymentToken) * 2).toString()
    )
    await escrow.deposit(paymentToken, balanceOfPaymentToken)
    await escrow.authorize(
      ethers.utils.getAddress(paymentToken),
      ethers.utils.getAddress(computeEnv.consumerAddress),
      (Number(balanceOfPaymentToken) / 4).toString(),
      providerInitializeComputeResults.payment.minLockSeconds.toString(),
      '10'
    )
    const auth = await escrow.getAuthorizations(
      paymentToken,
      await consumerAccount.getAddress(),
      computeEnv.consumerAddress
    )
    const funds = await escrow.getUserFunds(
      await consumerAccount.getAddress(),
      paymentToken
    )
    assert(BigNumber.from(funds[0]) > BigNumber.from(0), 'Should have funds in escrow')
    assert(auth.length > 0, 'Should have authorization')
    assert(
      BigInt(auth[0].maxLockedAmount.toString()) > BigInt(0),
      ' Should have maxLockedAmount in auth'
    )
    assert(
      BigInt(auth[0].maxLockCounts.toString()) > BigInt(0),
      ' Should have maxLockCounts in auth'
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
    algo.meta = resolvedAlgoDdoWith5mTimeout.metadata.algorithm
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
      assets,
      algo,
      computeJobDuration,
      paymentToken,
      computeEnv.resources,
      8996
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
    computeEnvs = await ProviderInstance.getComputeEnvironments(providerUrl)
    const computeEnv = computeEnvs[0]
    assert(computeEnv, 'Cannot find the paid compute env')

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
      paymentToken,
      computeJobDuration,
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
      consumerAccount,
      computeEnv.id,
      assets,
      algo,
      computeJobDuration,
      paymentToken
    )
    assert(computeJobs, 'Cannot start compute job')
  })

  delay(1200)

  // move to reuse Orders

  it('Should fast forward time and set a new computeValidUntil', async () => {
    const mytime = new Date()
    const computeMinutes = 5
    mytime.setMinutes(mytime.getMinutes() + computeMinutes)
    computeValidUntil = Math.floor(mytime.getTime() / 1000)
  })

  it('should start a computeJob using the paid environment, by paying only providerFee (reuseOrder)', async () => {
    // we choose the paid env
    computeEnvs = await ProviderInstance.getComputeEnvironments(providerUrl)
    const computeEnv = computeEnvs[0]
    assert(computeEnv, 'Cannot find the paid compute env')

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
      paymentToken,
      computeValidUntil,
      providerUrl,
      consumerAccount
    )
    console.log(
      `providerInitializeComputeResults2 reuse: ${JSON.stringify(
        providerInitializeComputeResults
      )}`
    )
    assert(
      providerInitializeComputeResults.algorithm.validOrder,
      'We should have a valid order for algorithm'
    )
    assert(
      providerInitializeComputeResults.datasets[0].validOrder,
      'We should have a valid order for dataset'
    )
    assert(providerInitializeComputeResults.payment, ' Payment structure does not exists')
    assert(
      providerInitializeComputeResults.payment.escrowAddress === addresses.Escrow,
      'Incorrect escrow address'
    )
    assert(
      providerInitializeComputeResults.payment.payee === computeEnv.consumerAddress,
      'Incorrect payee address'
    )
    assert(
      providerInitializeComputeResults.payment.token === paymentToken,
      'Incorrect payment token address'
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
    // providerFees are not expired, meaning no reuseOrder triggered
    assert(
      algo.transferTxId === paidEnvAlgoTxId ||
        assets[0].transferTxId === paidEnvDatasetTxId,
      'We should use the same orders, because providerFee is not expired'
    )
    const computeJobs = await ProviderInstance.computeStart(
      providerUrl,
      consumerAccount,
      computeEnv.id,
      assets,
      algo,
      computeJobDuration,
      paymentToken
    )
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
