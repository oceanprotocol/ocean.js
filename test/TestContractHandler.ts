import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'

const communityCollector = '0xeE9300b7961e0a01d9f0adb863C7A227A07AaD75'

export class TestContractHandler {
  public factory: Contract
  public template: Contract
  public accounts: string[]
  public templateBytecode: string
  public factoryBytecode: string
  public factoryAddress: string
  public templateAddress: string
  public web3: Web3

  constructor(
    factoryABI: AbiItem | AbiItem[],
    datatokensABI: AbiItem | AbiItem[],
    templateBytecode: string,
    factoryBytecode: string,
    web3: Web3
  ) {
    this.web3 = web3
    this.factory = new this.web3.eth.Contract(factoryABI)
    this.template = new this.web3.eth.Contract(datatokensABI)
    this.templateBytecode = templateBytecode
    this.factoryBytecode = factoryBytecode
  }

  public async getAccounts(): Promise<string[]> {
    this.accounts = await this.web3.eth.getAccounts()
    return this.accounts
  }

  public async deployContracts(minter: string) {
    let estGas

    const blob = 'https://example.com/dataset-1'
    const cap = 1400000000

    // get est gascost
    estGas = await this.template
      .deploy({
        data: this.templateBytecode,
        arguments: [
          'Template Contract',
          'TEMPLATE',
          minter,
          cap,
          blob,
          communityCollector
        ]
      })
      .estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
    // deploy the contract and get it's address
    this.templateAddress = await this.template
      .deploy({
        data: this.templateBytecode,
        arguments: [
          'Template Contract',
          'TEMPLATE',
          minter,
          cap,
          blob,
          communityCollector
        ]
      })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

    estGas = await this.factory
      .deploy({
        data: this.factoryBytecode,
        arguments: [this.templateAddress, communityCollector]
      })
      .estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
    // deploy the contract and get it's address
    this.factoryAddress = await this.factory
      .deploy({
        data: this.factoryBytecode,
        arguments: [this.templateAddress, communityCollector]
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
