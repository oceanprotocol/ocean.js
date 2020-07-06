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

    constructor(factoryABI: Contract, factoryBytecode: string, web3: any) {
        this.web3 = web3
        this.factory = new this.web3.eth.Contract(factoryABI)
        this.factoryBytecode = factoryBytecode
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
}
