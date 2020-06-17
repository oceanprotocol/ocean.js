import { assert } from 'chai'
import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Ocean } from '../../src/ocean/Ocean'
import { Config } from '../../src/models/Config'


const Web3 = require('web3')
const web3 = new Web3("http://127.0.0.1:8545")

const factoryABI = require('../../src/datatokens/FactoryABI.json')
const datatokensABI = require('../../src/datatokens/DatatokensABI.json')

describe('Simple flow', () => {

    let owner
    let bob
    let alice
    let balance
    let contracts
    let datatoken
    let tokenAddress

    let tokenAmount = 100
    let transferAmount = 1
    let blob = 'https://localhost:8030/api/v1/services'

    describe('#test', () => {
        it('Initialize Ocean contracts v3', async () => {
            contracts = new TestContractHandler(factoryABI,datatokensABI)
            await contracts.getAccounts()
            owner = contracts.accounts[0]
            alice = contracts.accounts[1]
            bob = contracts.accounts[2]
            await contracts.deployContracts(owner)
        })

        it('Alice publishes a dataset', async () => {
            //Alice's config
            const config={
               network: 'ganache',
               providerUri: 'localhost:8030'
            }
            // Alice creates a Datatoken
            datatoken = new DataTokens(contracts.factoryAddress, factoryABI, datatokensABI, web3)
            tokenAddress = await datatoken.create(config.providerUri, alice)
        })

        it('Alice mints 100 tokens', async () => {
            datatoken.mint(tokenAddress, alice, tokenAmount)
        })

        it('Alice transfers 1 token to Bob', async () => {
            datatoken.transfer(tokenAddress, bob, tokenAmount, alice)
        })

        it('Bob consumes dataset', async () => {
            const config = new Config()        

            let ocean = await Ocean.getInstance(config)
            ocean.assets.download(tokenAddress, blob, bob)
        })
    })
})