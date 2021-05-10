import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'

export class DispenserContractHandler {
  public contract: Contract
  public accounts: string[]
  public contractBytecode: string
  public contractAddress: string
  public web3: Web3

  constructor(contractABI: AbiItem[], contractBytecode: string, web3: Web3) {
    this.web3 = web3
    this.contract = new this.web3.eth.Contract(contractABI)
    this.contractBytecode = contractBytecode
  }

  public async getAccounts(): Promise<string[]> {
    this.accounts = await this.web3.eth.getAccounts()
    return this.accounts
  }

  public async deployContracts() {
    await this.getAccounts()
    // get est gascost
    const estGas = await this.contract
      .deploy({
        data: this.contractBytecode,
        arguments: []
      })
      .estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
    // deploy the contract and get it's address
    this.contractAddress = await this.contract
      .deploy({
        data: this.contractBytecode,
        arguments: []
      })
      .send({
        from: this.accounts[0],
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })
  }
}
