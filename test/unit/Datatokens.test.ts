import { assert } from 'chai'
import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'

const Web3 = require('web3')
const factory = require('@oceanprotocol/contracts/artifacts/development/Factory.json')
const datatokensTemplate = require('@oceanprotocol/contracts/artifacts/development/DataTokenTemplate.json')

const web3 = new Web3('http://127.0.0.1:8545')

describe('DataTokens', () => {
    let minter
    let spender
    let balance
    let contracts
    let datatoken
    let tokenAddress
    const tokenAmount = 100
    const blob = 'https://example.com/dataset-1'

    describe('#test', () => {
        it('#deploy', async () => {
            contracts = new TestContractHandler(
                factory.abi,
                datatokensTemplate.abi,
                datatokensTemplate.bytecode,
                factory.bytecode
            )
            await contracts.getAccounts()
            minter = contracts.accounts[0]
            spender = contracts.accounts[1]
            await contracts.deployContracts(minter)
        })

        it('#init', async () => {
            datatoken = new DataTokens(
                contracts.factoryAddress,
                factory.abi,
                datatokensTemplate.abi,
                web3
            )
            assert(datatoken !== null)
        })

        it('#create', async () => {
            tokenAddress = await datatoken.create(blob, minter)
            assert(tokenAddress !== null)
        })

        it('#mint', async () => {
            await datatoken.mint(tokenAddress, minter, tokenAmount)
            balance = await datatoken.balance(tokenAddress, minter)
            assert(balance.toString() === tokenAmount.toString())
        })

        it('#transfer', async () => {
            await datatoken.transfer(tokenAddress, spender, tokenAmount, minter)
            balance = await datatoken.balance(tokenAddress, spender)
            assert(balance.toString() === tokenAmount.toString())
        })

        it('#approve', async () => {
            await datatoken.approve(tokenAddress, minter, tokenAmount, spender)
        })

        it('#transferFrom', async () => {
            await datatoken.transferFrom(tokenAddress, spender, tokenAmount, minter)
            minter = await datatoken.balance(tokenAddress, spender)
            assert(balance.toString() === tokenAmount.toString())
        })
    })
})
