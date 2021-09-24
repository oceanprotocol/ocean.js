import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Ocean } from '../../src/ocean/Ocean'
import { ConfigHelper } from '../../src/utils/ConfigHelper'
import { assert } from 'chai'
import { ServiceComputePrivacy } from '../../src/ddo/interfaces/Service'
import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
import { Account, DDO, Metadata } from '../../src/lib'
import { Cluster, Container, Server } from '../../src/ocean/Compute'
import { LoggerInstance } from '../../src/utils'
import { ComputeInput, ComputeAlgorithm } from '../../src/ocean/interfaces/Compute'
const web3 = new Web3('http://127.0.0.1:8545')
const fetch = require('cross-fetch')

/*       How to handle a compute job
1. find your algorithm
2. find your primary compute dataset
3. check with ocean.compute.isOrderable if such a job is possible (that algo is allowed by that compute dataset)
4. find additional datasets (if wanted)
5. check each one with ocean.compute.isOrderable if such a job is possible (that algo is allowed by that dataset. An access dataset will allow any algo, but a compute might not)
6. order algoritm using ocean.compute.orderAlgorithm
7. order all assets (primary + additional) using ocean.compute.orderAsset
8. start the job
9. get the status
*/

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
  let datasetWithBogusProvider: DDO
  let algorithmAsset: DDO
  let algorithmAssetwithCompute: DDO
  let algorithmAssetRemoteProvider: DDO
  let algorithmAssetRemoteProviderWithCompute: DDO
  let algorithmAssetWithCustomData: DDO
  let contracts: TestContractHandler
  let datatoken: DataTokens
  let tokenAddress: string
  let tokenAddressNoRawAlgo: string
  let tokenAddressWithTrustedAlgo: string
  let tokenAddressWithBogusProvider: string
  let tokenAddressAlgorithm: string
  let tokenAddressAlgorithmwithCompute: string
  let tokenAddressAlgorithmRemoteProvider: string
  let tokenAddressAlgorithmRemoteProviderWithCompute: string
  let tokenAddressAdditional1: string
  let tokenAddressAdditional2: string
  let tokenAddressWithCustomData: string
  let price: string
  let ocean: Ocean
  let data: { t: number; url: string }
  let blob: string
  let jobId: string
  let computeOrderId: string
  let computeAddress: string

  let cluster: Cluster
  let servers: Server[]
  let containers: Container[]
  let providerAttributes: any

  const dateCreated = new Date(Date.now()).toISOString().split('.')[0] + 'Z' // remove milliseconds

  const tokenAmount = '1000'

  const timeout = 86400
  const algorithmMeta = {
    language: 'js',
    format: 'docker-image',
    version: '0.1',
    url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
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
      'AssetWithNoRawDT',
      'AWNRDT'
    )
    assert(tokenAddressNoRawAlgo != null, 'Creation of tokenAddressNoRawAlgo failed')

    tokenAddressWithTrustedAlgo = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AssetWithTrustedDT',
      'AWTDT'
    )
    assert(
      tokenAddressWithTrustedAlgo != null,
      'Creation of tokenAddressWithTrustedAlgo failed'
    )
    tokenAddressWithBogusProvider = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AssetWithTrustedDT',
      'AWTDT'
    )
    assert(
      tokenAddressWithBogusProvider != null,
      'Creation of tokenAddressWithBogusProvider failed'
    )

    tokenAddressAlgorithm = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AlgoDT',
      'ALGDT'
    )
    assert(tokenAddressAlgorithm != null, 'Creation of tokenAddressAlgorithm failed')

    tokenAddressAlgorithmwithCompute = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AlgoDTwCompute',
      'ALGwC'
    )
    assert(tokenAddressAlgorithm != null, 'Creation of tokenAddressAlgorithm failed')

    tokenAddressAlgorithmRemoteProvider = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'RemoteAlgoDT',
      'RALGDT'
    )
    assert(
      tokenAddressAlgorithmRemoteProvider != null,
      'Creation of tokenAddressAlgorithmRemoteProvider failed'
    )
    tokenAddressAlgorithmRemoteProviderWithCompute = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'RemoteAlgoDTwC',
      'RALGDTwC'
    )
    assert(
      tokenAddressAlgorithmRemoteProviderWithCompute != null,
      'Creation of tokenAddressAlgorithmRemoteProviderWithCompute failed'
    )

    tokenAddressAdditional1 = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'Additional DT',
      'Add1'
    )
    assert(tokenAddressAdditional1 != null, 'Creation of tokenAddressAdditional1 failed')

    tokenAddressAdditional2 = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'Additional DT2',
      'Add2'
    )
    assert(tokenAddressAdditional2 != null, 'Creation of tokenAddressAdditional2 failed')

    tokenAddressWithCustomData = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'WCD',
      'WCD'
    )
    assert(
      tokenAddressWithCustomData != null,
      'Creation of tokenAddressWithCustomData failed'
    )
  })

  it('Generates metadata', async () => {
    asset = {
      main: {
        type: 'dataset',
        name: 'UK Weather information 2011',
        dateCreated: dateCreated,
        datePublished: dateCreated,
        author: 'Met Office',
        license: 'CC-BY',
        files: [
          {
            url: 'https://raw.githubusercontent.com/tbertinmahieux/MSongsDB/master/Tasks_Demos/CoverSongs/shs_dataset_test.txt',
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
      allowAllPublishedAlgorithms: false,
      allowNetworkAccess: false,
      publisherTrustedAlgorithms: []
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
    const storeTx = await ocean.onChainMetadata.publish(ddo.id, ddo, alice.getId())
    assert(storeTx)
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
      allowAllPublishedAlgorithms: true,
      allowNetworkAccess: false,
      publisherTrustedAlgorithms: []
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
    const storeTx = await ocean.onChainMetadata.publish(
      ddoAdditional1.id,
      ddoAdditional1,
      alice.getId()
    )
    assert(storeTx)
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
    const storeTx = await ocean.onChainMetadata.publish(
      ddoAdditional2.id,
      ddoAdditional2,
      alice.getId()
    )
    assert(storeTx)
  })

  it('should publish a dataset with a compute service object that does not allow rawAlgo', async () => {
    const origComputePrivacy = {
      allowRawAlgorithm: false,
      allowNetworkAccess: false,
      allowAllPublishedAlgorithms: false,
      publisherTrustedAlgorithms: []
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
    const storeTx = await ocean.onChainMetadata.publish(
      datasetNoRawAlgo.id,
      datasetNoRawAlgo,
      alice.getId()
    )
    assert(storeTx)
  })

  it('should publish a dataset with a compute service object that allows only algo with did:op:1234', async () => {
    const origComputePrivacy = {
      allowRawAlgorithm: false,
      allowNetworkAccess: false,
      allowAllPublishedAlgorithms: false,
      publisherTrustedAlgorithms: [
        {
          did: 'did:op:1234',
          filesChecksum: '1234',
          containerSectionChecksum: '1234'
        }
      ]
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
    const storeTx = await ocean.onChainMetadata.publish(
      datasetWithTrustedAlgo.id,
      datasetWithTrustedAlgo,
      alice.getId()
    )
    assert(storeTx)
  })

  it('should publish an algorithm', async () => {
    const algoAsset: Metadata = {
      main: {
        type: 'algorithm',
        name: 'Test Algo',
        dateCreated: dateCreated,
        datePublished: dateCreated,
        author: 'DevOps',
        license: 'CC-BY',
        files: [
          {
            url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
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
    const storeTx = await ocean.onChainMetadata.publish(
      algorithmAsset.id,
      algorithmAsset,
      alice.getId()
    )
    assert(storeTx)
  })

  it('should publish an algorithm with a compute service', async () => {
    const algoAssetwithCompute: Metadata = {
      main: {
        type: 'algorithm',
        name: 'Test Algo with Compute',
        dateCreated: dateCreated,
        datePublished: dateCreated,
        author: 'DevOps',
        license: 'CC-BY',
        files: [
          {
            url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
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
    const origComputePrivacy = {
      allowRawAlgorithm: false,
      allowNetworkAccess: false,
      allowAllPublishedAlgorithms: false,
      publisherTrustedAlgorithms: []
    }
    const service1 = ocean.compute.createComputeService(
      alice,
      '1',
      dateCreated,
      providerAttributes,
      origComputePrivacy as ServiceComputePrivacy
    )

    algorithmAssetwithCompute = await ocean.assets.create(
      algoAssetwithCompute,
      alice,
      [service1],
      tokenAddressAlgorithmwithCompute
    )
    assert(
      algorithmAssetwithCompute.dataToken === tokenAddressAlgorithmwithCompute,
      'algorithmAssetwithCompute.dataToken !== tokenAddressAlgorithm'
    )
    const storeTx = await ocean.onChainMetadata.publish(
      algorithmAssetwithCompute.id,
      algorithmAssetwithCompute,
      alice.getId()
    )
    assert(storeTx)
  })
  it('should wait for all assets to be published', async () => {
    await ocean.metadataCache.waitForAqua(ddo.id)
    await ocean.metadataCache.waitForAqua(ddoAdditional1.id)
    await ocean.metadataCache.waitForAqua(ddoAdditional2.id)
    await ocean.metadataCache.waitForAqua(datasetNoRawAlgo.id)
    await ocean.metadataCache.waitForAqua(datasetWithTrustedAlgo.id)
    await ocean.metadataCache.waitForAqua(algorithmAsset.id)
    await ocean.metadataCache.waitForAqua(algorithmAssetwithCompute.id)
  })
  it('should publish an algorithm using the 2nd provider', async () => {
    const remoteProviderUri = 'http://172.15.0.7:8030'
    const algoAssetRemoteProvider: Metadata = {
      main: {
        type: 'algorithm',
        name: 'Remote Algorithm',
        dateCreated: dateCreated,
        datePublished: dateCreated,
        author: 'DevOps',
        license: 'CC-BY',
        files: [
          {
            url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
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
    const service1RemoteProvider = await ocean.assets.createAccessServiceAttributes(
      alice,
      price,
      dateCreated,
      0,
      remoteProviderUri
    )
    algorithmAssetRemoteProvider = await ocean.assets.create(
      algoAssetRemoteProvider,
      alice,
      [service1RemoteProvider],
      tokenAddressAlgorithmRemoteProvider,
      null,
      null,
      null,
      remoteProviderUri // only barge has 2 providers
    )
    assert(
      algorithmAssetRemoteProvider.dataToken === tokenAddressAlgorithmRemoteProvider,
      'algorithmAssetRemoteProvider.dataToken !== tokenAddressAlgorithmRemoteProvider'
    )
    const storeTx = await ocean.onChainMetadata.publish(
      algorithmAssetRemoteProvider.id,
      algorithmAssetRemoteProvider,
      alice.getId()
    )
    assert(storeTx)
    await ocean.metadataCache.waitForAqua(algorithmAssetRemoteProvider.id)
    const checkDDO = await ocean.assets.resolve(algorithmAssetRemoteProvider.id)
    const checkService = checkDDO.findServiceByType('access')
    assert(
      checkService.serviceEndpoint === remoteProviderUri,
      'algorithmAssetRemoteProvider serviceEndpoint is not the remote provider'
    )
  })

  it('should publish an algorithm with a compute service using the 2nd provider', async () => {
    const remoteProviderUri = 'http://172.15.0.7:8030'
    const algoAssetRemoteProviderWithCompute: Metadata = {
      main: {
        type: 'algorithm',
        name: 'Remote Algorithm',
        dateCreated: dateCreated,
        datePublished: dateCreated,
        author: 'DevOps',
        license: 'CC-BY',
        files: [
          {
            url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
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
    const origComputePrivacy = {
      allowRawAlgorithm: false,
      allowNetworkAccess: false,
      allowAllPublishedAlgorithms: false,
      publisherTrustedAlgorithms: []
    }
    const service1 = ocean.compute.createComputeService(
      alice,
      '1',
      dateCreated,
      providerAttributes,
      origComputePrivacy as ServiceComputePrivacy,
      3600,
      remoteProviderUri
    )
    algorithmAssetRemoteProviderWithCompute = await ocean.assets.create(
      algoAssetRemoteProviderWithCompute,
      alice,
      [service1],
      tokenAddressAlgorithmRemoteProviderWithCompute,
      null,
      null,
      null,
      remoteProviderUri // only barge has 2 providers
    )
    assert(
      algorithmAssetRemoteProviderWithCompute.dataToken ===
        tokenAddressAlgorithmRemoteProviderWithCompute,
      'algorithmAssetRemoteProvider.dataToken !== tokenAddressAlgorithmRemoteProvider'
    )
    const storeTx = await ocean.onChainMetadata.publish(
      algorithmAssetRemoteProviderWithCompute.id,
      algorithmAssetRemoteProviderWithCompute,
      alice.getId()
    )
    assert(storeTx)
    await ocean.metadataCache.waitForAqua(algorithmAssetRemoteProviderWithCompute.id)
    const checkDDO = await ocean.assets.resolve(
      algorithmAssetRemoteProviderWithCompute.id
    )
    const checkService = checkDDO.findServiceByType('compute')
    assert(
      checkService.serviceEndpoint === remoteProviderUri,
      'algorithmAssetRemoteProviderWithCompute serviceEndpoint is not the remote provider'
    )
  })

  it('should publish an algorithm whith CustomData', async () => {
    const assetWithCustomData: Metadata = {
      main: {
        type: 'algorithm',
        name: 'Test Algo with CustomData',
        dateCreated: dateCreated,
        datePublished: dateCreated,
        author: 'DevOps',
        license: 'CC-BY',
        files: [
          {
            url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
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
    const customdata = {
      userCustomParameters: [
        {
          name: 'firstname',
          type: 'text',
          label: 'Your first name',
          required: true,
          description: 'Your name'
        },
        {
          name: 'lastname',
          type: 'text',
          label: 'Your last name',
          required: false,
          description: 'Your last name'
        }
      ],
      algoCustomParameters: [
        {
          name: 'iterations',
          type: 'number',
          label: 'Iterations',
          required: true,
          description: 'No of passes'
        },
        {
          name: 'chunk',
          type: 'number',
          label: 'Chunks',
          required: false,
          description: 'No of chunks'
        }
      ]
    }
    const service1 = await ocean.assets.createAccessServiceAttributes(
      alice,
      price,
      dateCreated,
      0,
      null,
      customdata
    )
    algorithmAssetWithCustomData = await ocean.assets.create(
      assetWithCustomData,
      alice,
      [service1],
      tokenAddressWithCustomData
    )
    assert(
      algorithmAssetWithCustomData.dataToken === tokenAddressWithCustomData,
      'algorithmAssetWithCustomData.dataToken !== tokenAddressWithCustomData'
    )
    const storeTx = await ocean.onChainMetadata.publish(
      algorithmAssetWithCustomData.id,
      algorithmAssetWithCustomData,
      alice.getId()
    )
    assert(storeTx)
    await ocean.metadataCache.waitForAqua(algorithmAssetWithCustomData.id)
  })

  it('Alice mints 100 DTs and tranfers them to the compute marketplace', async () => {
    await datatoken.mint(tokenAddress, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressNoRawAlgo, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressWithTrustedAlgo, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressWithBogusProvider, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressAlgorithm, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressAlgorithmwithCompute, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressAlgorithmRemoteProvider, alice.getId(), tokenAmount)
    await datatoken.mint(
      tokenAddressAlgorithmRemoteProviderWithCompute,
      alice.getId(),
      tokenAmount
    )
    await datatoken.mint(tokenAddressAdditional1, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressAdditional2, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressWithCustomData, alice.getId(), tokenAmount)
  })

  it('Bob gets datatokens from Alice to be able to try the compute service', async () => {
    let balance
    const dTamount = '200'
    await datatoken.transfer(tokenAddress, bob.getId(), dTamount, alice.getId())
    balance = await datatoken.balance(tokenAddress, bob.getId())
    assert(balance.toString() === dTamount.toString())

    await datatoken.transfer(tokenAddressNoRawAlgo, bob.getId(), dTamount, alice.getId())
    balance = await datatoken.balance(tokenAddressNoRawAlgo, bob.getId())
    assert(balance.toString() === dTamount.toString())

    await datatoken.transfer(
      tokenAddressWithTrustedAlgo,
      bob.getId(),
      dTamount,
      alice.getId()
    )
    balance = await datatoken.balance(tokenAddressWithTrustedAlgo, bob.getId())
    assert(balance.toString() === dTamount.toString())

    await datatoken.transfer(
      tokenAddressWithBogusProvider,
      bob.getId(),
      dTamount,
      alice.getId()
    )
    balance = await datatoken.balance(tokenAddressWithBogusProvider, bob.getId())
    assert(balance.toString() === dTamount.toString())

    await datatoken.transfer(tokenAddressAlgorithm, bob.getId(), dTamount, alice.getId())
    balance = await datatoken.balance(tokenAddressAlgorithm, bob.getId())
    assert(balance.toString() === dTamount.toString())

    await datatoken.transfer(
      tokenAddressAlgorithmwithCompute,
      bob.getId(),
      dTamount,
      alice.getId()
    )
    balance = await datatoken.balance(tokenAddressAlgorithmwithCompute, bob.getId())
    assert(balance.toString() === dTamount.toString())

    await datatoken.transfer(
      tokenAddressAlgorithmRemoteProvider,
      bob.getId(),
      dTamount,
      alice.getId()
    )
    balance = await datatoken.balance(tokenAddressAlgorithmRemoteProvider, bob.getId())
    assert(balance.toString() === dTamount.toString())

    await datatoken.transfer(
      tokenAddressAlgorithmRemoteProviderWithCompute,
      bob.getId(),
      dTamount,
      alice.getId()
    )
    balance = await datatoken.balance(
      tokenAddressAlgorithmRemoteProviderWithCompute,
      bob.getId()
    )
    assert(balance.toString() === dTamount.toString())

    await datatoken.transfer(
      tokenAddressAdditional1,
      bob.getId(),
      dTamount,
      alice.getId()
    )
    balance = await datatoken.balance(tokenAddressAdditional1, bob.getId())
    assert(balance.toString() === dTamount.toString())

    await datatoken.transfer(
      tokenAddressAdditional2,
      bob.getId(),
      dTamount,
      alice.getId()
    )
    balance = await datatoken.balance(tokenAddressAdditional2, bob.getId())
    assert(balance.toString() === dTamount.toString())

    await datatoken.transfer(
      tokenAddressWithCustomData,
      bob.getId(),
      dTamount,
      alice.getId()
    )
    balance = await datatoken.balance(tokenAddressWithCustomData, bob.getId())
    assert(balance.toString() === dTamount.toString())
  })

  it('Bob starts compute job with a raw Algo', async () => {
    const output = {}
    const computeService = ddo.findServiceByType('compute')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)

    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const algoDefinition: ComputeAlgorithm = {
      meta: algorithmMeta
    }
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition
    )
    assert(allowed === true)
    computeOrderId = await ocean.compute.orderAsset(
      bob.getId(),
      ddo,
      computeService.index,
      algoDefinition,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(computeOrderId != null, 'computeOrderId === null')
    const response = await ocean.compute.start(
      ddo,
      computeOrderId,
      tokenAddress,
      bob,
      algoDefinition,
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
      undefined,
      undefined,
      computeOrderId,
      true
    )
    assert(response.length > 0, "Response.length is's not >0")
  })
  it('Bob should get status of a compute job without signing', async () => {
    assert(jobId != null, 'Jobid is null')
    const response = await ocean.compute.status(
      bob,
      ddo.id,
      undefined,
      undefined,
      jobId,
      undefined,
      false
    )
    assert(response[0].jobId === jobId, 'response[0].jobId !== jobId')
  })

  it('should get status of all compute jobs for an address without signing', async () => {
    const response = await ocean.compute.status(
      bob,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      false
    )
    assert(response.length > 0, 'Invalid response length')
  })
  it('Bob should get status of a compute job', async () => {
    assert(jobId != null, 'Jobid is null')
    const response = await ocean.compute.status(bob, ddo.id, undefined, undefined, jobId)
    assert(response[0].jobId === jobId, 'response[0].jobId !== jobId')
  })

  it('should get status of all compute jobs for an address', async () => {
    const response = await ocean.compute.status(bob, undefined, undefined)
    assert(response.length > 0, 'Invalid response length')
  })
  it('Bob should stop compute job', async () => {
    assert(jobId != null, 'Jobid is null')
    await ocean.compute.stop(bob, ddo, jobId)
    const response = await ocean.compute.status(bob, ddo.id, undefined, undefined, jobId)
    // TODO: typings say that `stopreq` does not exist
    assert((response[0] as any).stopreq === 1, 'Response.stopreq is invalid')
  })
  it('should not allow order the compute service with raw algo for dataset that does not allow raw algo', async () => {
    const service1 = datasetNoRawAlgo.findServiceByType('compute')
    assert(service1 !== null)
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(
      datasetNoRawAlgo.id,
      service1.index
    )
    const algoDefinition: ComputeAlgorithm = {
      meta: algorithmMeta
    }
    try {
      const order = await ocean.compute.orderAsset(
        bob.getId(),
        datasetNoRawAlgo,
        service1.index,
        algoDefinition,
        null, // no marketplace fee
        computeAddress // CtD is the consumer of the dataset
      )
      assert(order === null, 'Order should be null')
    } catch (error) {
      assert(error != null, 'Order should throw error')
    }
  })
  it('should not allow order the compute service with algoDid != "did:op:1234" for dataset that allows only "did:op:1234" as algo', async () => {
    const service1 = datasetWithTrustedAlgo.findServiceByType('compute')
    assert(service1 !== null)

    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(
      datasetWithTrustedAlgo.id,
      service1.index
    )
    const algoDefinition: ComputeAlgorithm = {
      did: 'did:op:7777'
    }
    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const allowed = await ocean.compute.isOrderable(
      datasetWithTrustedAlgo,
      service1.index,
      algoDefinition
    )
    assert(allowed === false)

    // try even futher, since we now this should fail
    try {
      const order = await ocean.compute.orderAsset(
        bob.getId(),
        datasetWithTrustedAlgo,
        service1.index,
        algoDefinition,
        null, // no marketplace fee
        computeAddress // CtD is the consumer of the dataset
      )
      assert(order === null, 'Order should be null')
    } catch (error) {
      assert(error != null, 'Order should throw error')
    }
  })

  it('should not allow  a compute job with a published algo because asset does not allow allowAllPublishedAlgorithms', async () => {
    const computeService = ddo.findServiceByType('compute')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    assert(ddo != null, 'ddo should not be null')
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAsset.id
    }
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAsset
    )
    assert(allowed === false)

    try {
      const order = await ocean.compute.orderAsset(
        bob.getId(),
        ddo,
        computeService.index,
        algoDefinition,
        null, // no marketplace fee
        computeAddress // CtD is the consumer of the dataset
      )
      assert(order === null, 'Order should be null')
    } catch (error) {
      assert(error != null, 'Order should throw error')
    }
  })

  it('Alice updates Compute Privacy', async () => {
    const newComputePrivacy = {
      allowRawAlgorithm: false,
      allowNetworkAccess: true,
      allowAllPublishedAlgorithms: false, // is false, in order to test enableAllowAllPublishedAlgorithms below
      publisherTrustedAlgorithms: [
        {
          did: 'did:op:1234',
          filesChecksum: '1234',
          containerSectionChecksum: '1234'
        },
        {
          did: 'did:op:12345',
          filesChecksum: '1234',
          containerSectionChecksum: '1234'
        },
        {
          did: algorithmAssetRemoteProviderWithCompute.id,
          filesChecksum: '1234',
          containerSectionChecksum: '1234'
        }
      ]
    }
    const computeService = ddo.findServiceByType('compute')
    assert(computeService, 'ComputeIndex should be >0')
    let newDdo = await ocean.compute.editComputePrivacy(
      ddo,
      computeService.index,
      newComputePrivacy
    )
    newDdo = await ocean.compute.toggleAllowAllPublishedAlgorithms(
      newDdo,
      computeService.index,
      true
    )
    assert(newDdo !== null, 'newDDO should not be null')
    const txid = await ocean.onChainMetadata.update(ddo.id, newDdo, alice.getId())
    assert(txid !== null, 'TxId should not be null')
    await ocean.metadataCache.waitForAqua(ddo.id, txid.transactionHash)
    const metaData = await ocean.assets.getServiceByType(ddo.id, 'compute')
    assert.equal(
      metaData.attributes.main.privacy.allowRawAlgorithm,
      newComputePrivacy.allowRawAlgorithm,
      'allowRawAlgorithm does not match'
    )
    assert.equal(
      metaData.attributes.main.privacy.allowAllPublishedAlgorithms,
      true,
      'allowAllPublishedAlgorithms does not match'
    )
    assert.equal(
      metaData.attributes.main.privacy.allowNetworkAccess,
      newComputePrivacy.allowNetworkAccess,
      'allowNetworkAccess does not match'
    )
    assert.deepEqual(
      metaData.attributes.main.privacy.publisherTrustedAlgorithms,
      newComputePrivacy.publisherTrustedAlgorithms,
      'allowNetworkAccess does not match'
    )
  })
  it('should not allow  a compute job with dataset/algo compute services served by different providers', async () => {
    const computeService = ddo.findServiceByType('compute')
    assert(
      algorithmAssetRemoteProviderWithCompute != null,
      'algorithmAsset should not be null'
    )
    const serviceAlgo =
      algorithmAssetRemoteProviderWithCompute.findServiceByType('compute')
    assert(serviceAlgo != null, 'serviceAlgo should not be null')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    assert(ddo != null, 'ddo should not be null')
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAssetRemoteProviderWithCompute.id,
      serviceIndex: serviceAlgo.index
    }
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAssetRemoteProviderWithCompute
    )
    assert(allowed === false)
    try {
      const order = await ocean.compute.orderAsset(
        bob.getId(),
        ddo,
        computeService.index,
        algoDefinition,
        null, // no marketplace fee
        computeAddress // CtD is the consumer of the dataset
      )
      assert(order === null, 'Order should be null')
    } catch (error) {
      assert(error != null, 'Order should throw error')
    }
  })
  it('should start a compute job with a published algo that has a compute service', async () => {
    const output = {}
    const computeService = ddo.findServiceByType('compute')
    assert(algorithmAsset != null, 'algorithmAsset should not be null')
    const serviceAlgo = algorithmAssetwithCompute.findServiceByType('compute')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    assert(ddo != null, 'ddo should not be null')
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAssetwithCompute.id,
      serviceIndex: serviceAlgo.index
    }
    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAssetwithCompute
    )
    assert(allowed === true)
    const order = await ocean.compute.orderAsset(
      bob.getId(),
      ddo,
      computeService.index,
      algoDefinition,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(order != null, 'Order should not be null')
    // order the algorithm
    const orderalgo = await ocean.compute.orderAlgorithm(
      algorithmAssetwithCompute,
      serviceAlgo.type,
      bob.getId(),
      serviceAlgo.index,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(orderalgo != null, 'Order should not be null')
    algoDefinition.transferTxId = orderalgo
    algoDefinition.dataToken = algorithmAssetwithCompute.dataToken
    const response = await ocean.compute.start(
      ddo,
      order,
      tokenAddress,
      bob,
      algoDefinition,
      output,
      `${computeService.index}`,
      computeService.type,
      undefined
    )
    assert(response, 'Compute error')
    jobId = response.jobId
    assert(response.status >= 1, 'Invalid response status')
    assert(response.jobId, 'Invalid jobId')
  })

  it('should start a compute job with a published algo', async () => {
    const output = {}
    const computeService = ddo.findServiceByType('compute')
    assert(algorithmAsset != null, 'algorithmAsset should not be null')
    const serviceAlgo = algorithmAsset.findServiceByType('access')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    assert(ddo != null, 'ddo should not be null')
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAsset.id,
      serviceIndex: serviceAlgo.index
    }
    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAsset
    )
    assert(allowed === true)
    const order = await ocean.compute.orderAsset(
      bob.getId(),
      ddo,
      computeService.index,
      algoDefinition,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(order != null, 'Order should not be null')
    // order the algorithm
    const orderalgo = await ocean.compute.orderAlgorithm(
      algorithmAsset,
      serviceAlgo.type,
      bob.getId(),
      serviceAlgo.index,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(orderalgo != null, 'Order should not be null')
    algoDefinition.transferTxId = orderalgo
    algoDefinition.dataToken = algorithmAsset.dataToken
    const response = await ocean.compute.start(
      ddo,
      order,
      tokenAddress,
      bob,
      algoDefinition,
      output,
      `${computeService.index}`,
      computeService.type,
      undefined
    )
    assert(response, 'Compute error')
    jobId = response.jobId
    assert(response.status >= 1, 'Invalid response status')
    assert(response.jobId, 'Invalid jobId')
  })

  it('should start a compute job with a dataset on provider1 and published algo on provider2', async () => {
    const output = {}
    assert(ddo != null, 'ddo should not be null')
    const computeService = ddo.findServiceByType('compute')
    assert(
      algorithmAssetRemoteProvider != null,
      'algorithmAssetRemoteProvider should not be null'
    )
    const serviceAlgo = algorithmAssetRemoteProvider.findServiceByType('access')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAssetRemoteProvider.id,
      serviceIndex: serviceAlgo.index
    }
    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAssetRemoteProvider
    )
    assert(allowed === true)
    const order = await ocean.compute.orderAsset(
      bob.getId(),
      ddo,
      computeService.index,
      algoDefinition,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(order != null, 'Order should not be null')
    const orderalgo = await ocean.compute.orderAlgorithm(
      algorithmAssetRemoteProvider,
      serviceAlgo.type,
      bob.getId(),
      serviceAlgo.index,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(orderalgo != null, 'Order should not be null')
    algoDefinition.transferTxId = orderalgo
    algoDefinition.dataToken = algorithmAssetRemoteProvider.dataToken
    const response = await ocean.compute.start(
      ddo,
      order,
      tokenAddress,
      bob,
      algoDefinition,
      output,
      `${computeService.index}`,
      computeService.type
    )
    assert(response, 'Compute error')
    assert(response.status >= 1, 'Invalid response status')
    assert(response.jobId, 'Invalid jobId')
  })

  it('should start a compute job with a published algo and additional inputs', async () => {
    const output = {}
    assert(ddo != null, 'ddo should not be null')
    const computeService = ddo.findServiceByType('compute')
    assert(algorithmAsset != null, 'algorithmAsset should not be null')
    const serviceAlgo = algorithmAsset.findServiceByType('access')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAsset.id,
      serviceIndex: serviceAlgo.index
    }
    let allowed
    allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAsset
    )
    assert(allowed === true)
    const order = await ocean.compute.orderAsset(
      bob.getId(),
      ddo,
      computeService.index,
      algoDefinition,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(order != null, 'Order should not be null')
    // order the algo
    const orderalgo = await ocean.compute.orderAlgorithm(
      algorithmAsset,
      serviceAlgo.type,
      bob.getId(),
      serviceAlgo.index,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(orderalgo != null, 'Order should not be null')
    // 1st additional input
    assert(ddoAdditional1 != null, 'ddoAdditional1 should not be null')
    const inputOrder1Service = ddoAdditional1.findServiceByType('compute')
    allowed = await ocean.compute.isOrderable(
      ddoAdditional1,
      inputOrder1Service.index,
      algoDefinition,
      ddoAdditional1
    )
    assert(allowed === true)
    const inputOrder1 = await ocean.compute.orderAsset(
      bob.getId(),
      ddoAdditional1,
      inputOrder1Service.index,
      algoDefinition,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(inputOrder1 != null, 'inputOrder1 should not be null')
    assert(ddoAdditional1 != null, 'ddoAdditional1 should not be null')
    // 2nd additional input
    const inputOrder2Service = ddoAdditional2.findServiceByType('access')
    allowed = await ocean.compute.isOrderable(
      ddoAdditional2,
      inputOrder2Service.index,
      algoDefinition,
      ddoAdditional2
    )
    assert(allowed === true)
    const inputOrder2 = await ocean.compute.orderAsset(
      bob.getId(),
      ddoAdditional2,
      inputOrder2Service.index,
      algoDefinition,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(inputOrder2 != null, 'inputOrder2 should not be null')
    const additionalInputs: ComputeInput[] = [
      {
        documentId: ddoAdditional1.id,
        transferTxId: inputOrder1,
        serviceId: inputOrder1Service.index
      },
      {
        documentId: ddoAdditional2.id,
        transferTxId: inputOrder2,
        serviceId: inputOrder2Service.index
      }
    ]
    algoDefinition.transferTxId = orderalgo
    algoDefinition.dataToken = algorithmAsset.dataToken
    const response = await ocean.compute.start(
      ddo,
      order,
      tokenAddress,
      bob,
      algoDefinition,
      output,
      `${computeService.index}`,
      computeService.type,
      additionalInputs
    )
    assert(response.status >= 1, 'Invalid response.status')
    assert(response.jobId, 'Invalid jobId')
  })
  it('should not be able start a compute job with a published algo that requires userdata without providing that', async () => {
    const computeService = ddo.findServiceByType('compute')
    assert(algorithmAssetWithCustomData != null, 'algorithmAsset should not be null')
    const serviceAlgo = algorithmAssetWithCustomData.findServiceByType('access')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    assert(ddo != null, 'ddo should not be null')
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAssetWithCustomData.id,
      serviceIndex: serviceAlgo.index
    }
    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAssetWithCustomData
    )
    assert(allowed === true)
    const order = await ocean.compute.orderAsset(
      bob.getId(),
      ddo,
      computeService.index,
      algoDefinition,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(order != null, 'Order should not be null')
    // order the algorithm, without providing userdata
    try {
      const orderalgo = await ocean.compute.orderAlgorithm(
        algorithmAssetWithCustomData,
        serviceAlgo.type,
        bob.getId(),
        serviceAlgo.index,
        null, // no marketplace fee
        computeAddress // CtD is the consumer of the dataset
      )
      assert(orderalgo === null, 'Order should be null')
    } catch (error) {
      assert(error != null, 'Order should throw error')
    }
  })

  it('should not be able to start a compute job with a published algo that requires algodata without providing that', async () => {
    const output = {}
    const computeService = ddo.findServiceByType('compute')
    assert(algorithmAssetWithCustomData != null, 'algorithmAsset should not be null')
    const serviceAlgo = algorithmAssetWithCustomData.findServiceByType('access')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    assert(ddo != null, 'ddo should not be null')
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAssetWithCustomData.id,
      serviceIndex: serviceAlgo.index
    }
    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAssetWithCustomData
    )
    assert(allowed === true)
    const bobUserData = {
      firstname: 'Bob',
      lastname: 'Doe'
    }
    const order = await ocean.compute.orderAsset(
      bob.getId(),
      ddo,
      computeService.index,
      algoDefinition,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(order != null, 'Order should not be null')

    const orderalgo = await ocean.compute.orderAlgorithm(
      algorithmAssetWithCustomData,
      serviceAlgo.type,
      bob.getId(),
      serviceAlgo.index,
      null, // no marketplace fee
      computeAddress, // CtD is the consumer of the dataset
      bobUserData
    )
    assert(orderalgo != null, 'Order should be null')
    algoDefinition.transferTxId = orderalgo
    algoDefinition.dataToken = algorithmAsset.dataToken
    const response = await ocean.compute.start(
      ddo,
      order,
      tokenAddress,
      bob,
      algoDefinition,
      output,
      `${computeService.index}`,
      computeService.type,
      undefined
    )
    assert(response === null, 'Compute should not start')
  })
  it('should be able to start a compute job with a published algo that requires algodata by providing that', async () => {
    const output = {}
    const computeService = ddo.findServiceByType('compute')
    assert(algorithmAssetWithCustomData != null, 'algorithmAsset should not be null')
    const serviceAlgo = algorithmAssetWithCustomData.findServiceByType('access')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    assert(ddo != null, 'ddo should not be null')
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAssetWithCustomData.id,
      serviceIndex: serviceAlgo.index,
      algoCustomParameters: {
        iterations: 20,
        chunk: 1
      }
    }
    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAssetWithCustomData
    )
    assert(allowed === true)
    const bobUserData = {
      firstname: 'Bob',
      lastname: 'Doe'
    }

    const order = await ocean.compute.orderAsset(
      bob.getId(),
      ddo,
      computeService.index,
      algoDefinition,
      null, // no marketplace fee
      computeAddress // CtD is the consumer of the dataset
    )
    assert(order != null, 'Order should not be null')

    const orderalgo = await ocean.compute.orderAlgorithm(
      algorithmAssetWithCustomData,
      serviceAlgo.type,
      bob.getId(),
      serviceAlgo.index,
      null, // no marketplace fee
      computeAddress, // CtD is the consumer of the dataset
      bobUserData
    )
    assert(orderalgo != null, 'Order should be null')
    algoDefinition.transferTxId = orderalgo
    algoDefinition.dataToken = algorithmAssetWithCustomData.dataToken
    const response = await ocean.compute.start(
      ddo,
      order,
      tokenAddress,
      bob,
      algoDefinition,
      output,
      `${computeService.index}`,
      computeService.type,
      undefined
    )
    assert(response, 'Compute error')
    jobId = response.jobId
    assert(response.status >= 1, 'Invalid response status')
    assert(response.jobId, 'Invalid jobId')
  })
  it('Alice updates Compute Privacy, allowing some published algos', async () => {
    const computeService = ddo.findServiceByType('compute')
    assert(computeService, 'ComputeIndex should be >0')

    let newDdo = await ocean.compute.toggleAllowAllPublishedAlgorithms(
      ddo,
      computeService.index,
      false
    )
    assert(newDdo !== null, 'newDDO should not be null')
    // allow algorithmAsset
    newDdo = await ocean.compute.addTrustedAlgorithmtoAsset(
      newDdo,
      computeService.index,
      algorithmAsset.id
    )
    let isAlgoAllowed = await ocean.compute.isAlgorithmTrusted(
      newDdo,
      computeService.index,
      algorithmAsset.id
    )
    assert(isAlgoAllowed, 'Algorithm is not allowed')
    // add algorithmAssetRemoteProvider as trusted as well
    newDdo = await ocean.compute.addTrustedAlgorithmtoAsset(
      ddo,
      computeService.index,
      algorithmAssetRemoteProvider.id
    )
    isAlgoAllowed = await ocean.compute.isAlgorithmTrusted(
      newDdo,
      computeService.index,
      algorithmAssetRemoteProvider.id
    )
    assert(isAlgoAllowed, 'Algorithm is not allowed')
    assert(newDdo !== null, 'newDDO should not be null')
    const txid = await ocean.onChainMetadata.update(ddo.id, newDdo, alice.getId())
    assert(txid !== null, 'TxId should not be null')
    await ocean.metadataCache.waitForAqua(ddo.id, txid.transactionHash)
  })
  it('Alice updates Compute Privacy, removing a previously allowed published algo', async () => {
    const computeService = ddo.findServiceByType('compute')
    assert(computeService, 'ComputeIndex should be >0')
    // allow algorithmAsset
    const newDdo = await ocean.compute.removeTrustedAlgorithmFromAsset(
      ddo,
      computeService.index,
      algorithmAsset.id
    )
    assert(newDdo !== null, 'newDDO should not be null')
    const isAlgoAllowed = await ocean.compute.isAlgorithmTrusted(
      newDdo,
      computeService.index,
      algorithmAsset.id
    )
    assert(isAlgoAllowed === false, 'Algorithm is still allowed')
  })
  it('Alice is updating the algoritm, changing the container section.', async () => {
    const newAlgoDDo = algorithmAsset
    const serviceMetadata = newAlgoDDo.findServiceByType('metadata')
    newAlgoDDo.service[serviceMetadata.index].attributes.main.algorithm.container.image =
      'dummyimage'
    const txid = await ocean.onChainMetadata.update(
      newAlgoDDo.id,
      newAlgoDDo,
      alice.getId()
    )
    assert(txid !== null, 'TxId should not be null')
    await ocean.metadataCache.waitForAqua(newAlgoDDo.id, txid.transactionHash)
  })
  it('Bob should not be able to run a compute job, because algo is changed.', async () => {
    const computeService = ddo.findServiceByType('compute')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    assert(ddo != null, 'ddo should not be null')
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAsset.id
    }
    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAsset
    )
    assert(allowed === false, 'This should fail, the algo container section was changed!')
  })
  it('Alice is updating the 2ndalgoritm, changing the files section.', async () => {
    const newAlgoDDo = algorithmAssetRemoteProvider
    const serviceMetadata = newAlgoDDo.findServiceByType('metadata')
    const newFile = {
      checksum: '1',
      contentLength: '2',
      contentType: 'text/csv',
      encoding: 'UTF-8',
      compression: 'zip',
      index: 1
    }
    newAlgoDDo.service[serviceMetadata.index].attributes.main.files.push(newFile)
    const txid = await ocean.onChainMetadata.update(
      newAlgoDDo.id,
      newAlgoDDo,
      alice.getId()
    )
    assert(txid !== null, 'TxId should not be null')
    await ocean.metadataCache.waitForAqua(newAlgoDDo.id, txid.transactionHash)
  })
  it('Bob should not be able to run a compute job, because algo files section is changed.', async () => {
    const computeService = ddo.findServiceByType('compute')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(ddo.id, computeService.index)
    assert(ddo != null, 'ddo should not be null')
    const algoDefinition: ComputeAlgorithm = {
      did: algorithmAssetRemoteProvider.id
    }
    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const allowed = await ocean.compute.isOrderable(
      ddo,
      computeService.index,
      algoDefinition,
      algorithmAssetRemoteProvider
    )
    assert(allowed === false, 'This should fail, the algo files section was changed!')
  })

  it('should force publish a dataset with a compute service served by a non existant provider', async () => {
    // will create a service with ocean.provider for metadata service, but bogus provider for compute service
    const bogusRemoteProviderUri = 'http://172.15.0.7:2030'
    const origComputePrivacy = {
      allowRawAlgorithm: false,
      allowNetworkAccess: false,
      publisherTrustedAlgorithms: []
    }

    const computeService = ocean.compute.createComputeService(
      alice,
      '1000',
      dateCreated,
      providerAttributes,
      origComputePrivacy as ServiceComputePrivacy,
      3600,
      bogusRemoteProviderUri
    )
    datasetWithBogusProvider = await ocean.assets.create(
      asset,
      alice,
      [computeService],
      tokenAddressWithBogusProvider
    )
    assert(
      datasetWithBogusProvider.dataToken === tokenAddressWithBogusProvider,
      'datasetWithBogusProvider.dataToken !== tokenAddressWithBogusProvider'
    )
    const storeTx = await ocean.onChainMetadata.publish(
      datasetWithBogusProvider.id,
      datasetWithBogusProvider,
      alice.getId()
    )
    assert(storeTx)
    await ocean.metadataCache.waitForAqua(datasetWithBogusProvider.id)
  })
  it('Bob should fail to start a compute job for a bogus provider with a raw Algo', async () => {
    const output = {}
    const computeService = datasetWithBogusProvider.findServiceByType('compute')
    // get the compute address first
    computeAddress = await ocean.compute.getComputeAddress(
      datasetWithBogusProvider.id,
      computeService.index
    )
    const algoDefinition: ComputeAlgorithm = {
      meta: algorithmMeta
    }
    // check if asset is orderable. otherwise, you might pay for it, but it has some algo restrictions
    const allowed = await ocean.compute.isOrderable(
      datasetWithBogusProvider,
      computeService.index,
      algoDefinition,
      datasetWithBogusProvider
    )
    assert(allowed === false)
    // we know that it is not Orderable, but we are trying to force it

    try {
      const order = await ocean.compute.orderAsset(
        bob.getId(),
        datasetWithBogusProvider,
        computeService.index,
        algoDefinition,
        null, // no marketplace fee
        computeAddress // CtD is the consumer of the dataset
      )
      assert(order === null, 'Order should be null')
    } catch (error) {
      assert(error != null, 'Order should throw error')
    }

    // we are forcing a bogus orderId
    computeOrderId = '1234'
    const response = await ocean.compute.start(
      datasetWithBogusProvider,
      computeOrderId,
      tokenAddress,
      bob,
      algoDefinition,
      output,
      `${computeService.index}`,
      computeService.type
    )
    assert(response === null || response === undefined, 'Compute error')
  })

  it('Bob should failed to get status of all compute jobs from a dataset with bogus provider', async () => {
    const response = await ocean.compute.status(
      bob,
      datasetWithBogusProvider.id,
      undefined,
      undefined,
      undefined,
      undefined,
      false
    )
    assert(response === null || response === undefined, 'Invalid response')
  })
  it('Bob should fail to stop a fake compute job on a bogus provider', async () => {
    const jobid = '1234'
    const response = await ocean.compute.stop(bob, datasetWithBogusProvider, jobid)
    assert(response === null || response === undefined, 'Invalid response')
  })
})
