import { Contract } from 'web3-eth-contract'

const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')

export class TestContractHandler {
    public factory: Contract
    public template: Contract
    public accounts: string[]
    public templateBytecode: string
    public factoryBytecode: string
    public factoryAddress: string
    public templateAddress: string

    constructor(
        factoryABI: Contract,
        datatokensABI: Contract,
        templateBytecode: string,
        factoryBytecode: string
    ) {
        this.factory = new web3.eth.Contract(factoryABI)
        this.template = new web3.eth.Contract(datatokensABI)
        this.templateBytecode = templateBytecode
        this.factoryBytecode = factoryBytecode
    }

    public async getAccounts() {
        this.accounts = await web3.eth.getAccounts()
    }

    public async deployContracts(minter: string) {
        let estGas

        const blob = 'https://example.com/dataset-1'
        const cap = 1400000000

        // get est gascost
        estGas = await this.template
            .deploy({
                data: this.templateBytecode,
                arguments: ['Template Contract', 'TEMPLATE', minter, cap, blob]
            })
            .estimateGas(function (err, estGas) {
                return estGas
            })
        // deploy the contract and get it's address
        this.templateAddress = await this.template
            .deploy({
                data: this.templateBytecode,
                arguments: ['Template Contract', 'TEMPLATE', minter, cap, blob]
            })
            .send({
                from: minter,
                gas: estGas + 1,
                gasPrice: '12345678'
            })
            .then(function (contract) {
                return contract.options.address
            })

        estGas = await this.factory
            .deploy({
                data: this.factoryBytecode,
                arguments: [this.templateAddress]
            })
            .estimateGas(function (err, estGas) {
                return estGas
            })
        // deploy the contract and get it's address
        this.factoryAddress = await this.factory
            .deploy({
                data: this.factoryBytecode,
                arguments: [this.templateAddress]
            })
            .send({
                from: minter,
                gas: estGas + 1,
                gasPrice: '12345678'
            })
            .then(function (contract) {
                return contract.options.address
            })
    }
}
