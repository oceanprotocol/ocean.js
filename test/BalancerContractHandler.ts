import { Contract } from 'web3-eth-contract'

export class BalancerContractHandler {
    public factory: Contract
    public pool: Contract
    public accounts: string[]
    public poolBytecode: string
    public factoryBytecode: string
    public factoryAddress: string
    public poolAddress: string
    public web3: any

    constructor(
        factoryABI: Contract,
        factoryBytecode: string,
        poolABI: Contract,
        poolBytecode: string,
        web3: any
    ) {
        this.web3 = web3
        this.factory = new this.web3.eth.Contract(factoryABI)
        this.factoryBytecode = factoryBytecode
        this.pool = new this.web3.eth.Contract(poolABI)
        this.poolBytecode = poolBytecode
    }

    public async getAccounts() {
        this.accounts = await this.web3.eth.getAccounts()
    }

    public async deployContracts(minter: string) {
        const estGas = await this.factory
            .deploy({
                data: this.factoryBytecode,
                arguments: []
            })
            .estimateGas(function (err, estGas) {
                if (err) console.log('DeployContracts: ' + err)
                return estGas
            })
        console.log('estGas:' + estGas)
        // deploy the contract and get it's address
        this.factoryAddress = await this.factory
            .deploy({
                data: this.factoryBytecode,
                arguments: []
            })
            .send({
                from: minter,
                gas: estGas + 1,
                gasPrice: '3000000000'
            })
            .then(function (contract) {
                return contract.options.address
            })
    }

    public async SdeployContracts(minter: string) {
        let estGas
        console.log('Trying to deploy SPool')
        console.log('Bytecode size:' + this.poolBytecode.length)
        estGas = await this.pool
            .deploy({
                data: this.poolBytecode,
                arguments: []
            })
            .estimateGas({ from: minter, gas: 9007199254740991 }, function (err, estGas) {
                if (err) console.log('Pool deploy estimate gas: ' + err)
                return estGas
            })
        // deploy the contract and get it's address
        console.log('Pool estGas:' + estGas)
        this.poolAddress = await this.pool
            .deploy({
                data: this.poolBytecode,
                arguments: []
            })
            .send({
                from: minter,
                gas: estGas + 1,
                gasPrice: '3000000000'
            })
            .then(function (contract) {
                return contract.options.address
            })
        console.log('Pool deployed:' + this.poolAddress)
        estGas = await this.factory
            .deploy({
                data: this.factoryBytecode,
                arguments: [this.poolAddress]
            })
            .estimateGas(function (err, estGas) {
                if (err) console.log('DeployContracts: ' + err)
                return estGas
            })
        console.log('estGas:' + estGas)
        // deploy the contract and get it's address
        this.factoryAddress = await this.factory
            .deploy({
                data: this.factoryBytecode,
                arguments: [this.poolAddress]
            })
            .send({
                from: minter,
                gas: estGas + 1,
                gasPrice: '3000000000'
            })
            .then(function (contract) {
                return contract.options.address
            })
    }
}
