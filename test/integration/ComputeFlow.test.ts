import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Ocean } from '../../src/ocean/Ocean'
import { ConfigHelper } from '../../src/utils/ConfigHelper'

import { assert } from 'console'
import { ServiceComputePrivacy } from '../../src/ddo/interfaces/Service'
import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
const web3 = new Web3('http://127.0.0.1:8545')

describe('Compute flow', () => {
  let owner
  let bob
  let ddo
  let alice
  let asset
  let datasetNoRawAlgo
  let datasetWithTrustedAlgo
  let algorithmAsset
  let contracts
  let datatoken
  let tokenAddress
  let price
  let ocean
  let computeService
  let data
  let blob
  let jobId

  let cluster
  let servers
  let containers
  let provider

  const dateCreated = new Date(Date.now()).toISOString().split('.')[0] + 'Z' // remove milliseconds

  const marketplaceAllowance = '20'
  const tokenAmount = '100'

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
    data = { t: 1, url: ocean.config.metadataStoreUri }
    blob = JSON.stringify(data)
    await contracts.deployContracts(owner.getId())
  })

  it('Alice deploys datatoken contract', async () => {
    datatoken = new DataTokens(
      contracts.factoryAddress,
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      web3
    )
    tokenAddress = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(tokenAddress != null)
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
    price = datatoken.toWei('2') // in datatoken
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
    provider = ocean.compute.createProviderAttributes(
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
      provider,
      origComputePrivacy as ServiceComputePrivacy
    )
    ddo = await ocean.assets.create(asset, alice, [computeService], tokenAddress)
    assert(ddo.dataToken === tokenAddress)
  })

  // alex
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
      provider,
      origComputePrivacy as ServiceComputePrivacy
    )
    datasetNoRawAlgo = await ocean.assets.create(
      asset,
      alice,
      [computeService],
      tokenAddress
    )
    assert(datasetNoRawAlgo.dataToken === tokenAddress)
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
      provider,
      origComputePrivacy as ServiceComputePrivacy
    )
    datasetWithTrustedAlgo = await ocean.assets.create(
      asset,
      alice,
      [computeService],
      tokenAddress
    )
    assert(datasetWithTrustedAlgo.dataToken === tokenAddress)
  })

  it('should publish an algorithm', async () => {
    const algoAsset = {
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
    algorithmAsset = await ocean.assets.create(algoAsset, alice, [service1], tokenAddress)
    assert(algorithmAsset.dataToken === tokenAddress)
  })

  it('Alice mints 100 DTs and tranfers them to the compute marketplace', async () => {
    await datatoken.mint(tokenAddress, alice.getId(), tokenAmount)
  })

  it('Marketplace posts compute service for sale', async () => {
    computeService = await ocean.assets.getServiceByType(ddo.id, 'compute')
    assert(computeService.attributes.main.cost === price)
  })

  it('Bob gets datatokens from Alice to be able to try the compute service', async () => {
    const dTamount = '20'
    await datatoken
      .transfer(tokenAddress, bob.getId(), dTamount, alice.getId())
      .then(async () => {
        const balance = await datatoken.balance(tokenAddress, bob.getId())
        assert(balance.toString() === dTamount.toString())
      })
  })

  it('Bob starts compute job with a raw Algo', async () => {
    const output = {}
    const order = await ocean.compute.order(
      bob.getId(),
      ddo.id,
      computeService.index,
      undefined,
      algorithmMeta
    )
    assert(order != null)
    const computeOrder = JSON.parse(order)
    const tx = await datatoken.transferWei(
      computeOrder.dataToken,
      computeOrder.to,
      String(computeOrder.numTokens),
      computeOrder.from
    )
    const response = await ocean.compute.start(
      ddo.id,
      tx.transactionHash,
      tokenAddress,
      bob,
      undefined,
      algorithmMeta,
      output,
      computeService.index,
      computeService.type
    )
    jobId = response.jobId
    assert(response.status >= 10)
  })

  it('Bob should get status of a compute job', async () => {
    const response = await ocean.compute.status(bob, ddo.id, jobId)
    assert(response[0].jobId === jobId)
  })

  it('should get status of all compute jobs for an address', async () => {
    const response = await ocean.compute.status(bob, undefined, undefined)
    assert(response.length > 0)
  })
  it('Bob should stop compute job', async () => {
    await ocean.compute.stop(bob, ddo.id, jobId)
    const response = await ocean.compute.status(bob, ddo.id, jobId)
    assert(response[0].stopreq === 1)
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
    assert(order === null)
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
    assert(order === null)
  })
  it('should start a compute job with a published algo', async () => {
    const output = {}
    const serviceAlgo = algorithmAsset.findServiceByType('access')
    const orderalgo = await ocean.assets.order(
      algorithmAsset.id,
      serviceAlgo.type,
      bob.getId()
    )
    const algoOrder = JSON.parse(orderalgo)
    const algoTx = await datatoken.transferWei(
      algoOrder.dataToken,
      algoOrder.to,
      String(algoOrder.numTokens),
      algoOrder.from
    )
    const order = await ocean.compute.order(
      bob.getId(),
      ddo.id,
      computeService.index,
      algorithmAsset.id,
      undefined
    )
    assert(order != null)
    const computeOrder = JSON.parse(order)
    const tx = await datatoken.transferWei(
      computeOrder.dataToken,
      computeOrder.to,
      String(computeOrder.numTokens),
      computeOrder.from
    )
    const response = await ocean.compute.start(
      ddo.id,
      tx.transactionHash,
      tokenAddress,
      bob,
      algorithmAsset.id,
      undefined,
      output,
      computeService.index,
      computeService.type,
      algoTx.transactionHash,
      algorithmAsset.dataToken
    )
    jobId = response.jobId
    assert(response.status >= 10)
  })

  // it('Bob restarts compute job', async () => {})
  // it('Bob gets outputs', async () => {})
})
