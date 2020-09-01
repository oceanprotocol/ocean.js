import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'

import defaultFactoryABI from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import defaultDatatokensABI from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'

/**
 * Provides a interface to DataTokens
 */
export class DataTokens {
  public factoryAddress: string
  public factoryABI: AbiItem | AbiItem[]
  public datatokensABI: AbiItem | AbiItem[]
  public web3: Web3

  /**
   * Instantiate DataTokens (independently of Ocean).
   * @param {String} factoryAddress
   * @param {AbiItem | AbiItem[]} factoryABI
   * @param {AbiItem | AbiItem[]} datatokensABI
   * @param {Web3} web3
   */
  constructor(
    factoryAddress: string,
    factoryABI: AbiItem | AbiItem[],
    datatokensABI: AbiItem | AbiItem[],
    web3: Web3
  ) {
    this.factoryAddress = factoryAddress
    this.factoryABI = factoryABI || (defaultFactoryABI.abi as AbiItem[])
    this.datatokensABI = datatokensABI || (defaultDatatokensABI.abi as AbiItem[])
    this.web3 = web3
  }

  /**
   * Create new datatoken
   * @param {String} metaDataStoreURI
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {String} address
   * @return {Promise<string>} datatoken address
   */
  public async create(
    metaDataStoreURI: string,
    name: string,
    symbol: string,
    cap: string,
    address: string
  ): Promise<string> {
    // Create factory contract object
    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress, {
      from: address
    })
    const estGas = await factory.methods
      .createToken(metaDataStoreURI, name, symbol, this.web3.utils.toWei(cap))
      .estimateGas(function (err, estGas) {
        if (err) console.log('Datatokens: ' + err)
        return estGas
      })
    // Invoke createToken function of the contract
    const trxReceipt = await factory.methods
      .createToken(metaDataStoreURI, name, symbol, this.web3.utils.toWei(cap))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })

    let tokenAddress = null
    try {
      tokenAddress = trxReceipt.events.TokenCreated.returnValues[0]
    } catch (e) {
      console.error(e)
    }
    return tokenAddress
  }

  /**
   * Approve
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {string} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<string>} transactionId
   */
  public async approve(
    dataTokenAddress: string,
    spender: string,
    amount: string,
    address: string
  ): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const trxReceipt = await datatoken.methods
      .approve(spender, this.web3.utils.toWei(amount))
      .send({ from: address })
    return trxReceipt
  }

  /**
   * Mint
   * @param {String} dataTokenAddress
   * @param {String} address
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} toAddress   - only if toAddress is different from the minter
   * @return {Promise<string>} transactionId
   */
  public async mint(
    dataTokenAddress: string,
    address: string,
    amount: string,
    toAddress?: string
  ): Promise<string> {
    const destAddress = toAddress || address
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const estGas = await datatoken.methods
      .mint(destAddress, this.web3.utils.toWei(amount))
      .estimateGas(function (err, estGas) {
        if (err) console.log('Datatokens: ' + err)
        return estGas
      })

    const trxReceipt = await datatoken.methods
      .mint(destAddress, this.web3.utils.toWei(amount))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })

    return trxReceipt
  }

  /**
   * Transfer as number from address to toAddress
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<string>} transactionId
   */
  public async transfer(
    dataTokenAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<string> {
    return this.transferToken(dataTokenAddress, toAddress, amount, address)
  }

  /**
   * Transfer as number from address to toAddress
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<string>} transactionId
   */
  public async transferToken(
    dataTokenAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<string> {
    const weiAmount = this.web3.utils.toWei(amount)
    return this.transferWei(dataTokenAddress, toAddress, weiAmount, address)
  }

  /**
   * Transfer in wei from address to toAddress
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {String} amount Number of datatokens, as number. Expressed as wei
   * @param {String} address
   * @return {Promise<string>} transactionId
   */
  public async transferWei(
    dataTokenAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const trxReceipt = await datatoken.methods
      .transfer(toAddress, amount)
      .send({ from: address })
    return trxReceipt
  }

  /**
   * Transfer from fromAddress to address  (needs an Approve operation before)
   * @param {String} dataTokenAddress
   * @param {String} fromAddress
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<string>} transactionId
   */
  public async transferFrom(
    dataTokenAddress: string,
    fromAddress: string,
    amount: string,
    address: string
  ): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const trxReceipt = await datatoken.methods
      .transferFrom(fromAddress, address, this.web3.utils.toWei(amount))
      .send({ from: address })
    return trxReceipt
  }

  /**
   * Get Address Balance for datatoken
   * @param {String} dataTokenAddress
   * @param {String} address
   * @return {Promise<String>} balance  Number of datatokens. Will be converted from wei
   */
  public async balance(dataTokenAddress: string, address: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const balance = await datatoken.methods.balanceOf(address).call()
    return this.web3.utils.fromWei(balance)
  }

  /**
   * Get Alloance
   * @param {String } dataTokenAddress
   * @param {String} owner
   * @param {String} spender
   */
  public async allowance(
    dataTokenAddress: string,
    owner: string,
    spender: string
  ): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: spender
    })
    const trxReceipt = await datatoken.methods.allowance(owner, spender).call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Get Blob
   * @param {String} dataTokenAddress
   * @param {String} address
   * @return {Promise<string>} string
   */
  public async getBlob(dataTokenAddress: string, address: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const trxReceipt = await datatoken.methods.blob().call()
    return trxReceipt
  }

  /** Get Name
   * @param {String} dataTokenAddress
   * @param {String} address
   * @return {Promise<string>} string
   */
  public async getName(dataTokenAddress: string, address: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const trxReceipt = await datatoken.methods.name().call()
    return trxReceipt
  }

  /** Get Symbol
   * @param {String} dataTokenAddress
   * @param {String} address
   * @return {Promise<string>} string
   */
  public async getSymbol(dataTokenAddress: string, address: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const trxReceipt = await datatoken.methods.symbol().call()
    return trxReceipt
  }

  /** Get Cap
   * @param {String} dataTokenAddress
   * @param {String} address
   * @return {Promise<string>} string
   */
  public async getCap(dataTokenAddress: string, address: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const trxReceipt = await datatoken.methods.cap().call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Convert to wei
   * @param {String} amount
   * @return {Promise<string>} string
   */
  public toWei(amount: string): string {
    return this.web3.utils.toWei(amount)
  }

  /** Convert from wei
   * @param {String} amount
   * @return {Promise<string>} string
   */
  public fromWei(amount: string): string {
    return this.web3.utils.fromWei(amount)
  }
}
