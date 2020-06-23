import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Ocean } from '../../src/ocean/Ocean'
import { Config } from '../../src/models/Config'
import Accounts from "../../src/ocean/Account" // ??

const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')
const factory = require('@oceanprotocol/contracts/artifacts/development/Factory.json')
const datatokensTemplate = require('@oceanprotocol/contracts/artifacts/development/DataTokenTemplate.json')

describe('Marketplace flow', () => {
    let owner
    let bob
    let asset
    let contracts
    let datatoken
    let tokenAddress
    let transactionId

    let alice = new Accounts()

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
            bob = contracts.accounts[2]

            await alice.setId(contracts.accounts[1])
            await alice.setPassword("0x4a608ef70ce229351d37be7b07ddd7a3ce46709911cf8c8c4bcabd8a6c563711")

            await contracts.deployContracts(owner)
        })

        it('Generates metadata', async () => {

            asset = {
                main: {
                    type: 'dataset',
                    name: 'test-dataset',
                    dateCreated:
                        new Date(Date.now())
                            .toISOString()
                            .split('.')[0] + 'Z', // remove milliseconds
                    author: 'oceanprotocol-team',
                    license: 'MIT'
                }            
            }
        })

        it('Alice publishes a dataset', async () => {
            // Alice creates a Datatoken
            datatoken = new DataTokens(
                contracts.factoryAddress,
                factory.abi,
                datatokensTemplate.abi,
                web3
            )

            const config = new Config()
            const ocean = await Ocean.getInstance(config)

            tokenAddress = await datatoken.create(blob, alice.getId())
            await ocean.assets.create(asset, alice, [], tokenAddress)
        })

        // it('Alice mints 100 tokens', async () => {
        //     await datatoken.mint(ddo, alice, tokenAmount)
        // })

        // it('Bob gets 1 datatoken', async () => {
        //     const ts = await datatoken.transfer(ddo, bob, transferAmount, alice)
        //     transactionId = ts.transactionHash
        // })

        // it('Bob consumes dataset', async () => {
        //     const config = new Config()
        //     const ocean = await Ocean.getInstance(config)
        //     await ocean.assets.download(ddo, blob, transactionId, bob)
        // })
    })
})
