import { TestContractHandler } from '../TestContractHandler'

const Web3 = require('web3')
const web3 = new Web3('wss://rinkeby.infura.io/ws/v3/357f2fe737db4304bd2f7285c5602d0d')
const factory = require('@oceanprotocol/contracts/artifacts/development/Factory.json')
const datatokensTemplate = require('@oceanprotocol/contracts/artifacts/development/DataTokenTemplate.json')

describe('Rinkeby test', () => {
    let contracts

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
            const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey)
            web3.eth.accounts.wallet.add(account)

            await contracts.deployContracts(account.address)
        })

    })
})