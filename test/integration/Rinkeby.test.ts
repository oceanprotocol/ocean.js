import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'

const Web3 = require('web3')
const web3 = new Web3('wss://rinkeby.infura.io/ws/v3/357f2fe737db4304bd2f7285c5602d0d')
const factory = require('@oceanprotocol/contracts/artifacts/development/Factory.json')
const datatokensTemplate = require('@oceanprotocol/contracts/artifacts/development/DataTokenTemplate.json')

describe('Rinkeby test', () => {
    let account
    let contracts
    let datatoken
    let tokenAddress

    const tokenAmount = 100
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
            
            const privateKey = 'PRIVATE_KEY'
            account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey)
            web3.eth.accounts.wallet.add(account)

            await contracts.deployContracts(account.address)
        })

        it('Publish a dataset', async () => {
            datatoken = new DataTokens(
                contracts.factoryAddress,
                factory.abi,
                datatokensTemplate.abi,
                web3
            )

            tokenAddress = await datatoken.create(blob, account.address)
        })

        it('Mint 100 tokens', async () => {
            await datatoken.mint(tokenAddress, account.address, tokenAmount)
        })
    })
})