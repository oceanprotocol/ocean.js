import { assert } from 'chai'
import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'

const Web3 = require('web3')
const web3 = new Web3("http://127.0.0.1:8545")

const factoryABI = require('../../src/datatokens/FactoryABI.json')
const datatokensABI = require('../../src/datatokens/DatatokensABI.json')

describe('Simple flow', () => {

    let owner
    let alice
    let bob
    let marketplace
    let balance
    let contracts
    let datatoken
    let tokenAddress

    let tokenAmount = 100
    let blob = 'https://example.com/dataset-1'

    describe('#test', () => {
        it('Initialize Ocean contracts v3', async () => {
            contracts = new TestContractHandler(factoryABI,datatokensABI)
            await contracts.getAccounts()
            owner = contracts.accounts[0]
            alice = contracts.accounts[1]
            bob = contracts.accounts[2]
            marketplace = contracts.accounts[3]
            await contracts.deployContracts(owner)
        })

        it('Alice publishes a dataset', async () => {
            //Alice's config
            const config={
               network: 'ganache',
               providerUri: 'localhost:8030'
            }

            datatoken = new DataTokens(contracts.factoryAddress, factoryABI, datatokensABI, web3)
            tokenAddress = await datatoken.create(config.providerUri, alice)

            //Alice allows MarketPlace to transfer tokenAmount of DT
            await datatoken.approve(tokenAddress, alice, tokenAmount, marketplace)
        })
    })
})