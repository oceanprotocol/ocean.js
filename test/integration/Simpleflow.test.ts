import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Ocean } from '../../src/ocean/Ocean'
import { Config } from '../../src/models/Config'

const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')
const factory = require('@oceanprotocol/contracts/artifacts/development/Factory.json')
const datatokensTemplate = require('@oceanprotocol/contracts/artifacts/development/DataTokenTemplate.json')

describe('Simple flow', () => {
    let owner
    let bob
    let alice
    let contracts
    let datatoken
    let tokenAddress
    let transactionId

    const tokenAmount = 100
    const transferAmount = 1
    const blob = 'http://localhost:8030/api/v1/provider/services'

    describe('#test', () => {
        it('Initialize Ocean contracts v3', async () => {
            contracts = new TestContractHandler(
                factory.abi,
                datatokensTemplate.abi,
                datatokensTemplate.bytecode,
                factory.bytecode,
                web3
            )
            await contracts.getAccounts()
            owner = contracts.accounts[0]
            alice = contracts.accounts[1]
            bob = contracts.accounts[2]
            await contracts.deployContracts(owner)
        })

        it('Alice publishes a dataset', async () => {
            // Alice creates a Datatoken
            datatoken = new DataTokens(
                contracts.factoryAddress,
                factory.abi,
                datatokensTemplate.abi,
                web3
            )
            tokenAddress = await datatoken.create(blob, alice)
        })

        it('Alice mints 100 tokens', async () => {
            await datatoken.mint(tokenAddress, alice, tokenAmount)
        })

        it('Alice transfers 1 token to Bob', async () => {
            const ts = await datatoken.transfer(tokenAddress, bob, tokenAmount, alice)
            transactionId = ts.transactionHash
        })

        it('Bob consumes dataset', async () => {
            const config = new Config()
            const ocean = await Ocean.getInstance(config)
            await ocean.assets.download(tokenAddress, blob, transactionId, bob)
        })
    })
})
