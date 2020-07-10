import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Ocean } from '../../src/ocean/Ocean'
import config from './config'
import { assert } from 'console'

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
    let marketplace
    let contracts
    let datatoken
    let tokenAddress
    let service1
    let price
    let ocean
    let accessService
    let data
    let blob

    const marketplaceAllowance = 20
    const tokenAmount = 100

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

        // it('Alice publishes dataset with a compute service', async () => {})

        // it('Alice mints 100 DTs and tranfers them to the compute marketplace', async () => {})

        // it('Markeplace post compute service for sale', async () => {})

        // it('Bob buys datatokens from open market and order a compute service', async () => {})

        // it('Bob starts compute job', async () => {})

        // it('Bob gets the compute job status', async () => {})

        // it('Bob restarts compute job', async () => {})

        // it('Bob gets outputs', async () => {})
    })
})
