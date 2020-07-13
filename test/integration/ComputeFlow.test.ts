import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Ocean } from '../../src/ocean/Ocean'
import config from './config'
import { assert } from 'console'
import {ComputeJob} from "../../src/ocean/interfaces/ComputeJob";
import {
    Service,
    ServiceComputePrivacy,
    ServiceCompute
} from '../../src/ddo/interfaces/Service'
const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')
const factory = require('@oceanprotocol/contracts/artifacts/development/Factory.json')
const datatokensTemplate = require('@oceanprotocol/contracts/artifacts/development/DataTokenTemplate.json')

describe('Marketplace flow', () => {
    let owner
    let bob
    let ddo
    let alice
    let asset
    let datasetNoRawAlgo
    let datasetWithTrustedAlgo
    let algorithmAsset
    let marketplace
    let contracts
    let datatoken
    let tokenAddress
    let service1
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

    const marketplaceAllowance = 20
    const tokenAmount = 100

    const timeout = 86400

    describe('#MarketplaceComputeFlow-Test', () => {
        it('Initialize Ocean contracts v3', async () => {
            contracts = new TestContractHandler(
                factory.abi,
                datatokensTemplate.abi,
                datatokensTemplate.bytecode,
                factory.bytecode,
                web3
            )

            ocean = await Ocean.getInstance(config)
            owner = (await ocean.accounts.list())[0]
            alice = (await ocean.accounts.list())[1]
            bob = (await ocean.accounts.list())[2]
            marketplace = (await ocean.accounts.list())[3]
            data = { t: 1, url: ocean.config.metadataStoreUri }
            blob = JSON.stringify(data)
            await contracts.deployContracts(owner.getId())
        })

        it('Alice deploys datatoken contract', async () => {
            datatoken = new DataTokens(
                contracts.factoryAddress,
                factory.abi,
                datatokensTemplate.abi,
                web3
            )
            tokenAddress = await datatoken.create(blob, alice.getId())
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
                            url:'https://raw.githubusercontent.com/tbertinmahieux/MSongsDB/master/Tasks_Demos/CoverSongs/shs_dataset_test.txt',
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

        it('Alice publishes dataset with a compute service', async () => {
            price = 10 // in datatoken
            cluster = ocean.compute.createClusterAttributes('Kubernetes', 'http://10.0.0.17/xxx')
            servers = [
                ocean.compute.createServerAttributes('1', 'xlsize', '50', '16', '0', '128gb', '160gb', timeout)
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
            
            const computeService = ocean.compute.createComputeService(
                alice, price, dateCreated, provider
            )
            ddo = await ocean.assets.create(asset, alice, [computeService], tokenAddress)
            assert(ddo.dataToken === tokenAddress)

        })

        //alex
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
            datasetNoRawAlgo = await ocean.assets.create(asset, alice, [computeService], tokenAddress)
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
            datasetWithTrustedAlgo = await ocean.assets.create(asset, alice, [computeService], tokenAddress)
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
                            url:'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
                            contentType: 'text/js',
                            encoding: 'UTF-8'
                            
                        }
                    ],
                    "algorithm": {
                        "language": "js",
                        "format": "docker-image",
                        "version": "0.1",
                        "container": {
                          "entrypoint": "node $ALGO",
                          "image": "node",
                          "tag": "10"
                        }
                      },
                }
            }
            const service1 = await ocean.assets.createAccessServiceAttributes(
                alice,
                price,
                dateCreated,
                0
            )
            algorithmAsset = await ocean.assets.create(algoAsset, alice,[service1],tokenAddress)
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
            const dTamount = 20
            await datatoken
                .transfer(tokenAddress, bob.getId(), dTamount, alice.getId())
                .then(async () => {
                    const balance = await datatoken.balance(tokenAddress, bob.getId())
                    assert(balance.toString() === dTamount.toString())
                })
        })

        it('Bob starts compute job', async () => {
            const algorithmMeta = {
                'language': 'scala',
                'format': 'docker-image',
                'version': '0.1',
                'url': 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
                'container': {
                  'entrypoint': 'node $ALGO',
                  'image': 'node',
                  'tag': '10'
                }
            }

            const output = {

            }
            let order = await ocean.assets.order(ddo.id, computeService.type, bob.getId())
            let computeOrder=JSON.parse(order)
            let tx=await datatoken.transfer(
                computeOrder["dataToken"],
                computeOrder["to"],
                computeOrder["numTokens"],
                computeOrder["from"]
            )
            const response = await ocean.compute.start(
                ddo.id,
                tx.transactionHash,
                tokenAddress,
                bob,
                undefined,
                undefined,
                algorithmMeta,
                output,
                computeService.index,
                computeService.type
            )
            jobId = response.jobId
            assert(response.status>=10)
            
        })

        it('Bob should get status of a compute job', async () => {
            const response = await ocean.compute.status(bob, ddo.id, jobId)
            assert(response[0].jobId==jobId)
        })
    
        it('should get status of all compute jobs for an address', async () => {
            const response = await ocean.compute.status(bob, undefined, undefined)
            assert(response.length>0)
            
        })
    

        // it('Bob restarts compute job', async () => {})

        // it('Bob gets outputs', async () => {})
    })
})
