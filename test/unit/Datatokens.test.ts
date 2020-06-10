import { assert } from 'chai'
import { TestContractHandler } from './TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'

const Web3 = require('web3')
const web3 = new Web3("http://127.0.0.1:8545")

const factoryABI = require('../../src/datatokens/FactoryABI.json')
const datatokensABI = require('../../src/datatokens/DatatokensABI.json')

describe('DataTokens', () => {

    let minter
    let contracts
    let datatoken
    let tokenAddress

    let tokenAmount = 100
    let blob = 'https://example.com/dataset-1'

    beforeEach(async () => {
      contracts = new TestContractHandler(factoryABI,datatokensABI)
      await contracts.getAccounts()

      minter = contracts.accounts[0]
      await contracts.deployContracts(minter)
    })

    describe('#test', () => {
        it('should create Datatoken object', async () => {
            datatoken = new DataTokens(contracts.factoryAddress, factoryABI, datatokensABI, web3)
            assert(datatoken !== null)
        })

        it('should create Datatoken contract', async () => {
            tokenAddress = await datatoken.create(blob, minter)
            assert(tokenAddress !== null)
        })

        it('should mint Datatokens', async () => {
            const tokenAddress = await datatoken.create(blob, minter)
            await datatoken.mint(tokenAddress, minter, tokenAmount)
            let balance = await datatoken.balance(tokenAddress, minter)
            // assert(balance === tokenAmount)
        })
    })
})