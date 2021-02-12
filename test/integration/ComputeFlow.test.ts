import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Ocean } from '../../src/ocean/Ocean'
import { ConfigHelper } from '../../src/utils/ConfigHelper'
import { assert } from 'chai'
import { Service, ServiceComputePrivacy } from '../../src/ddo/interfaces/Service'
import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
import { Account, DDO, Metadata } from '../../src/lib'
import { Cluster, Container, Server } from '../../src/ocean/Compute'
import { LoggerInstance } from '../../src/utils'
import { ComputeInput } from '../../src/ocean/interfaces/ComputeInput'
const web3 = new Web3('http://127.0.0.1:8545')

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

describe('Compute flow', () => {
  let owner: Account
  let bob: Account
  let ddo: DDO
  let ddoAdditional1: DDO
  let ddoAdditional2: DDO
  let alice: Account
  let asset: Metadata
  let datasetNoRawAlgo: DDO
  let datasetWithTrustedAlgo: DDO
  let algorithmAsset: DDO
  let contracts: TestContractHandler
  let datatoken: DataTokens
  let tokenAddress: string
  let tokenAddressNoRawAlgo: string
  let tokenAddressWithTrustedAlgo: string
  let tokenAddressAlgorithm: string
  let tokenAddressAdditional1: string
  let tokenAddressAdditional2: string
  let price: string
  let ocean: Ocean
  let data: { t: number; url: string }
  let blob: string
  let jobId: string
  let computeOrderId: string

  let cluster: Cluster
  let servers: Server[]
  let containers: Container[]
  let providerAttributes: any

  const dateCreated = new Date(Date.now()).toISOString().split('.')[0] + 'Z' // remove milliseconds

  const tokenAmount = '1000'
  const aquaSleep = 10000

  const timeout = 86400
  const algorithmMeta = {
    language: 'js',
    format: 'docker-image',
    version: '0.1',
    url:
      'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
    container: {
      entrypoint: 'node $ALGO',
      image: 'node',
      tag: '10'
    }
  }

  it('Initialize Ocean contracts v3', async () => {
    contracts = new TestContractHandler(
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      datatokensTemplate.bytecode,
      factory.bytecode,
      web3
    )
    const config = new ConfigHelper().getConfig('development')
    config.web3Provider = web3
    ocean = await Ocean.getInstance(config)
    owner = (await ocean.accounts.list())[0]
    alice = (await ocean.accounts.list())[1]
    bob = (await ocean.accounts.list())[2]
    data = { t: 1, url: config.metadataCacheUri }
    blob = JSON.stringify(data)
    await contracts.deployContracts(owner.getId())
  })

  it('Alice deploys datatoken contracts', async () => {
    datatoken = new DataTokens(
      contracts.factoryAddress,
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      web3,
      LoggerInstance
    )
    tokenAddress = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(tokenAddress != null, 'Creation of tokenAddress failed')
    tokenAddressNoRawAlgo = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(tokenAddressNoRawAlgo != null, 'Creation of tokenAddressNoRawAlgo failed')

    tokenAddressWithTrustedAlgo = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(
      tokenAddressWithTrustedAlgo != null,
      'Creation of tokenAddressWithTrustedAlgo failed'
    )

    tokenAddressAlgorithm = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(tokenAddressAlgorithm != null, 'Creation of tokenAddressAlgorithm failed')

    tokenAddressAdditional1 = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(tokenAddressAdditional1 != null, 'Creation of tokenAddressAdditional1 failed')

    tokenAddressAdditional2 = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(tokenAddressAdditional2 != null, 'Creation of tokenAddressAdditional2 failed')
  })

  it('Generates metadata', async () => {
    asset = {
      main: {
        type: 'dataset',
        name: 'UK Weather information 2011',
        dateCreated: dateCreated,
        author: 'Met Office',
        license: 'CC-BY',
        files: [
          {
            url:
              'https://raw.githubusercontent.com/tbertinmahieux/MSongsDB/master/Tasks_Demos/CoverSongs/shs_dataset_test.txt',
            checksum: 'efb2c764274b745f5fc37f97c6b0e764',
            contentLength: '4535431',
            contentType: 'text/csv',
            encoding: 'UTF-8',
            compression: 'zip'
          }
        ]
      }
    }
  })

  it('Alice publishes dataset with a compute service that allows Raw Algo', async () => {
    price = '2' // in datatoken
    cluster = ocean.compute.createClusterAttributes('Kubernetes', 'http://10.0.0.17/xxx')
    servers = [
      ocean.compute.createServerAttributes(
        '1',
        'xlsize',
        '50',
        '16',
        '0',
        '128gb',
        '160gb',
        timeout
      )
    ]
    containers = [
      ocean.compute.createContainerAttributes(
        'tensorflow/tensorflow',
        'latest',
        'sha256:cb57ecfa6ebbefd8ffc7f75c0f00e57a7fa739578a429b6f72a0df19315deadc'
      )
    ]
    providerAttributes = ocean.compute.createProviderAttributes(
      'Azure',
      'Compute service with 16gb ram for each node.',
      cluster,
      containers,
      servers
    )
    const origComputePrivacy = {
      allowRawAlgorithm: true,
      allowNetworkAccess: false,
      trustedAlgorithms: []
    }
    const computeService = ocean.compute.createComputeService(
      alice,
      price,
      dateCreated,
      providerAttributes,
      origComputePrivacy as ServiceComputePrivacy
    )
    ddo = await ocean.assets.create(asset, alice, [computeService], tokenAddress)
    assert(ddo.dataToken === tokenAddress, 'ddo.dataToken !== tokenAddress')
    await sleep(aquaSleep)
  })
  it('Alice publishes a 2nd dataset with a compute service that allows Raw Algo', async () => {
    const price2 = '2' // in datatoken
    const cluster2 = ocean.compute.createClusterAttributes(
      'Kubernetes',
      'http://10.0.0.17/xxx'
    )
    const servers2 = [
      ocean.compute.createServerAttributes(
        '1',
        'xlsize',
        '50',
        '16',
        '0',
        '128gb',
        '160gb',
        timeout
      )
    ]
    const containers2 = [
      ocean.compute.createContainerAttributes(
        'tensorflow/tensorflow',
        'latest',
        'sha256:cb57ecfa6ebbefd8ffc7f75c0f00e57a7fa739578a429b6f72a0df19315deadc'
      )
    ]
    const providerAttributes2 = ocean.compute.createProviderAttributes(
      'Azure',
      'Compute service with 16gb ram for each node.',
      cluster2,
      containers2,
      servers2
    )
    const origComputePrivacy2 = {
      allowRawAlgorithm: true,
      allowNetworkAccess: false,
      trustedAlgorithms: []
    }
    const computeService2 = ocean.compute.createComputeService(
      alice,
      price2,
      dateCreated,
      providerAttributes2,
      origComputePrivacy2 as ServiceComputePrivacy
    )
    ddoAdditional1 = await ocean.assets.create(
      asset,
      alice,
      [computeService2],
      tokenAddressAdditional1
    )
    assert(
      ddoAdditional1.dataToken === tokenAddressAdditional1,
      'ddoAdditional1.dataToken !== tokenAddressAdditional1'
    )
    await sleep(aquaSleep)
  })

  it('Alice publishes a 3rd dataset with a access service', async () => {
    const price3 = '1' // in datatoken
    const publishedDate3 = new Date(Date.now()).toISOString().split('.')[0] + 'Z'
    const service3 = await ocean.assets.createAccessServiceAttributes(
      alice,
      price3,
      publishedDate3,
      0
    )
    ddoAdditional2 = await ocean.assets.create(
      asset,
      alice,
      [service3],
      tokenAddressAdditional2
    )
    assert(
      ddoAdditional2.dataToken === tokenAddressAdditional2,
      'ddoAdditional2.dataToken !== tokenAddressAdditional2'
    )
    await sleep(aquaSleep)
  })

  it('should publish a dataset with a compute service object that does not allow rawAlgo', async () => {
    const origComputePrivacy = {
      allowRawAlgorithm: false,
      allowNetworkAccess: false,
      trustedAlgorithms: []
    }

    const computeService = ocean.compute.createComputeService(
      alice,
      '1000',
      dateCreated,
      providerAttributes,
      origComputePrivacy as ServiceComputePrivacy
    )
    datasetNoRawAlgo = await ocean.assets.create(
      asset,
      alice,
      [computeService],
      tokenAddressNoRawAlgo
    )
    assert(
      datasetNoRawAlgo.dataToken === tokenAddressNoRawAlgo,
      'datasetNoRawAlgo.dataToken !== tokenAddressNoRawAlgo'
    )
    await sleep(aquaSleep)
  })

  it('should publish a dataset with a compute service object that allows only algo with did:op:1234', async () => {
    const origComputePrivacy = {
      allowRawAlgorithm: false,
      allowNetworkAccess: false,
      trustedAlgorithms: ['did:op:1234']
    }

    const computeService = ocean.compute.createComputeService(
      alice,
      '1000',
      dateCreated,
      providerAttributes,
      origComputePrivacy as ServiceComputePrivacy
    )
    datasetWithTrustedAlgo = await ocean.assets.create(
      asset,
      alice,
      [computeService],
      tokenAddressWithTrustedAlgo
    )
    assert(
      datasetWithTrustedAlgo.dataToken === tokenAddressWithTrustedAlgo,
      'datasetWithTrustedAlgo.dataToken !== tokenAddressWithTrustedAlgo'
    )
    await sleep(aquaSleep)
  })

  it('should publish an algorithm', async () => {
    const algoAsset: Metadata = {
      main: {
        type: 'algorithm',
        name: 'Test Algo',
        dateCreated: dateCreated,
        author: 'DevOps',
        license: 'CC-BY',
        files: [
          {
            url:
              'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
            contentType: 'text/js',
            encoding: 'UTF-8'
          }
        ],
        algorithm: {
          language: 'js',
          format: 'docker-image',
          version: '0.1',
          container: {
            entrypoint: 'node $ALGO',
            image: 'node',
            tag: '10'
          }
        }
      }
    }
    const service1 = await ocean.assets.createAccessServiceAttributes(
      alice,
      price,
      dateCreated,
      0
    )
    algorithmAsset = await ocean.assets.create(
      algoAsset,
      alice,
      [service1],
      tokenAddressAlgorithm
    )
    assert(
      algorithmAsset.dataToken === tokenAddressAlgorithm,
      'algorithmAsset.dataToken !== tokenAddressAlgorithm'
    )
    await sleep(aquaSleep)
  })

  it('Alice mints 100 DTs and tranfers them to the compute marketplace', async () => {
    await datatoken.mint(tokenAddress, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressNoRawAlgo, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressWithTrustedAlgo, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressAlgorithm, alice.getId(), tokenAmount)
  })

  it('Bob gets datatokens from Alice to be able to try the compute service', async () => {
    const dTamount = '200'
    await datatoken
      .transfer(tokenAddress, bob.getId(), dTamount, alice.getId())
      .then(async () => {
        const balance = await datatoken.balance(tokenAddress, bob.getId())
        assert(balance.toString() === dTamount.toString())
      })
    await datatoken
      .transfer(tokenAddressNoRawAlgo, bob.getId(), dTamount, alice.getId())
      .then(async () => {
        const balance = await datatoken.balance(tokenAddressNoRawAlgo, bob.getId())
        assert(balance.toString() === dTamount.toString())
      })
    await datatoken
      .transfer(tokenAddressWithTrustedAlgo, bob.getId(), dTamount, alice.getId())
      .then(async () => {
        const balance = await datatoken.balance(tokenAddressWithTrustedAlgo, bob.getId())
        assert(balance.toString() === dTamount.toString())
      })
    await datatoken
      .transfer(tokenAddressAlgorithm, bob.getId(), dTamount, alice.getId())
      .then(async () => {
        const balance = await datatoken.balance(tokenAddressAlgorithm, bob.getId())
        assert(balance.toString() === dTamount.toString())
      })
  })

  it('Bob starts compute job with a raw Algo', async () => {
    const output = {}
    const computeService = ddo.findServiceByType('compute')
    computeOrderId = await ocean.compute.order(
      bob.getId(),
      ddo.id,
      computeService.index,
      undefined,
      algorithmMeta
    )
    assert(computeOrderId != null, 'computeOrderId === null')
    const response = await ocean.compute.start(
      ddo.id,
      computeOrderId,
      tokenAddress,
      bob,
      undefined,
      algorithmMeta,
      output,
      `${computeService.index}`,
      computeService.type
    )
    assert(response, 'Compute error')
    jobId = response.jobId
    assert(response.status >= 1, "response.status it's not >= 1")
    assert(response.jobId, 'Invalid response.jobId')
  })
  it('Bob should get status of a compute job with a specific order txId', async () => {
    assert(jobId != null, 'Jobid is null')
    const response = await ocean.compute.status(
      bob,
      undefined,
      undefined,
      computeOrderId,
      true
    )
    assert(response.length > 0, "Response.length is's not >0")
  })
  it('Bob should get status of a compute job without signing', async () => {
    assert(jobId != null, 'Jobid is null')
    const response = await ocean.compute.status(bob, ddo.id, jobId, undefined, false)
    assert(response[0].jobId === jobId, 'response[0].jobId !== jobId')
  })

  it('should get status of all compute jobs for an address without signing', async () => {
    const response = await ocean.compute.status(
      bob,
      undefined,
      undefined,
      undefined,
      false
    )
    assert(response.length > 0, 'Invalid response length')
  })
  it('Bob should get status of a compute job', async () => {
    assert(jobId != null, 'Jobid is null')
    const response = await ocean.compute.status(bob, ddo.id, jobId)
    assert(response[0].jobId === jobId, 'response[0].jobId !== jobId')
  })

  it('should get status of all compute jobs for an address', async () => {
    const response = await ocean.compute.status(bob, undefined, undefined)
    assert(response.length > 0, 'Invalid response length')
  })
  it('Bob should stop compute job', async () => {
    assert(jobId != null, 'Jobid is null')
    await ocean.compute.stop(bob, ddo.id, jobId)
    const response = await ocean.compute.status(bob, ddo.id, jobId)
    // TODO: typings say that `stopreq` does not exist
    assert((response[0] as any).stopreq === 1, 'Response.stopreq is invalid')
  })
  it('should not allow order the compute service with raw algo for dataset that does not allow raw algo', async () => {
    const service1 = datasetNoRawAlgo.findServiceByType('compute')
    assert(service1 !== null)
    const order = await ocean.compute.order(
      bob.getId(),
      datasetNoRawAlgo.id,
      service1.index,
      undefined,
      algorithmMeta
    )
    assert(order === null, 'Order should be null')
  })
  it('should not allow order the compute service with algoDid != "did:op:1234" for dataset that allows only "did:op:1234" as algo', async () => {
    const service1 = datasetWithTrustedAlgo.findServiceByType('compute')
    assert(service1 !== null)
    const order = await ocean.compute.order(
      bob.getId(),
      datasetWithTrustedAlgo.id,
      service1.index,
      'did:op:77777',
      undefined
    )
    assert(order === null, 'Order should be null')
  })
  it('should start a compute job with a published algo', async () => {
    assert(algorithmAsset != null, 'algorithmAsset should not be null')
    const output = {}
    const serviceAlgo = algorithmAsset.findServiceByType('access')
    const orderalgo = await ocean.assets.order(
      algorithmAsset.id,
      serviceAlgo.type,
      bob.getId()
    )
    assert(orderalgo != null, 'Order should not be null')
    assert(ddo != null, 'ddo should not be null')
    const computeService = ddo.findServiceByType('compute')
    const order = await ocean.compute.order(
      bob.getId(),
      ddo.id,
      computeService.index,
      algorithmAsset.id,
      undefined
    )
    assert(order != null, 'Order should not be null')
    const response = await ocean.compute.start(
      ddo.id,
      order,
      tokenAddress,
      bob,
      algorithmAsset.id,
      undefined,
      output,
      `${computeService.index}`,
      computeService.type,
      orderalgo,
      algorithmAsset.dataToken
    )
    assert(response, 'Compute error')
    jobId = response.jobId
    assert(response.status >= 1, 'Invalid response status')
    assert(response.jobId, 'Invalid jobId')
  })
  it('should start a compute job with a published algo and additional inputs', async () => {
    const output = {}
    assert(algorithmAsset != null, 'algorithmAsset should not be null')
    const serviceAlgo = algorithmAsset.findServiceByType('access')
    const orderalgo = await ocean.assets.order(
      algorithmAsset.id,
      serviceAlgo.type,
      bob.getId()
    )
    assert(orderalgo != null, 'Order should not be null')
    assert(ddo != null, 'ddo should not be null')
    const computeService = ddo.findServiceByType('compute')
    const order = await ocean.compute.order(
      bob.getId(),
      ddo.id,
      computeService.index,
      algorithmAsset.id,
      undefined
    )
    assert(order != null, 'Order should not be null')
    assert(ddoAdditional1 != null, 'ddoAdditional1 should not be null')
    const inputOrder1Service = ddoAdditional1.findServiceByType('compute')
    const inputOrder1 = await ocean.compute.order(
      bob.getId(),
      ddoAdditional1.id,
      inputOrder1Service.index,
      ddoAdditional1.id,
      undefined
    )
    assert(inputOrder1 != null, 'inputOrder1 should not be null')
    assert(ddoAdditional1 != null, 'ddoAdditional1 should not be null')
    const inputOrder2Service = ddoAdditional2.findServiceByType('access')
    const inputOrder2 = await ocean.assets.order(
      ddoAdditional2.id,
      inputOrder2Service.type,
      bob.getId()
    )
    assert(inputOrder2 != null, 'inputOrder2 should not be null')
    const additionalInputs: ComputeInput[] = [
      {
        did: ddoAdditional1.id,
        transferTxId: inputOrder1,
        serviceId: inputOrder1Service.index
      },
      {
        did: ddoAdditional2.id,
        transferTxId: inputOrder2,
        serviceId: inputOrder2Service.index
      }
    ]

    const response = await ocean.compute.start(
      ddo.id,
      order,
      tokenAddress,
      bob,
      algorithmAsset.id,
      undefined,
      output,
      `${computeService.index}`,
      computeService.type,
      orderalgo,
      algorithmAsset.dataToken,
      additionalInputs
    )
    jobId = response.jobId
    assert(response.status >= 1, 'Invalid response.status')
    assert(response.jobId, 'Invalid jobId')
  })
  it('Alice updates Compute Privacy', async () => {
    const newComputePrivacy = {
      allowRawAlgorithm: false,
      allowNetworkAccess: true,
      trustedAlgorithms: ['did:op:1234', 'did:op:1235']
    }
    let computeIndex = 0
    for (let i = 0; i < ddo.service.length; i++) {
      if (ddo.service[i].type === 'compute') {
        computeIndex = i
        break
      }
    }
    assert(computeIndex > 0, 'ComputeIndex should be >0')
    const newDdo = await ocean.compute.editComputePrivacy(
      ddo,
      computeIndex,
      newComputePrivacy
    )
    assert(newDdo !== null, 'newDDO should not be null')
    const txid = await ocean.onChainMetadata.update(ddo.id, newDdo, alice.getId())
    assert(txid !== null, 'TxId should not be null')
    await sleep(aquaSleep)
    const metaData = await ocean.assets.getServiceByType(ddo.id, 'compute')
    assert.equal(
      metaData.attributes.main.privacy.allowRawAlgorithm,
      newComputePrivacy.allowRawAlgorithm,
      'allowRawAlgorithm does not match'
    )
    assert.equal(
      metaData.attributes.main.privacy.allowNetworkAccess,
      newComputePrivacy.allowNetworkAccess,
      'allowNetworkAccess does not match'
    )
    assert.deepEqual(
      metaData.attributes.main.privacy.trustedAlgorithms,
      newComputePrivacy.trustedAlgorithms,
      'allowNetworkAccess does not match'
    )
  })
})
