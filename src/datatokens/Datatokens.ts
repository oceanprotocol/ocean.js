import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'

import defaultFactoryABI from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import defaultDatatokensABI from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'

import wordListDefault from '../data/words.json'
import { TransactionReceipt } from 'web3-core'
import BigNumber from 'bignumber.js'

/**
 * Provides an interface to DataTokens
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
   * Generate new datatoken name & symbol from a word list
   * @return {<{ name: String; symbol: String }>} datatoken name & symbol. Produces e.g. "Endemic Jellyfish Token" & "ENDJEL-45"
   */
  public generateDtName(wordList?: {
    nouns: string[]
    adjectives: string[]
  }): { name: string; symbol: string } {
    const list = wordList || wordListDefault
    const random1 = Math.floor(Math.random() * list.adjectives.length)
    const random2 = Math.floor(Math.random() * list.nouns.length)
    const indexNumber = Math.floor(Math.random() * 100)

    // Capitalized adjective & noun
    const adjective = list.adjectives[random1].replace(/^\w/, (c) => c.toUpperCase())
    const noun = list.nouns[random2].replace(/^\w/, (c) => c.toUpperCase())

    const name = `${adjective} ${noun} Token`
    // use first 3 letters of name, uppercase it, and add random number
    const symbol = `${(
      adjective.substring(0, 3) + noun.substring(0, 3)
    ).toUpperCase()}-${indexNumber}`

    return { name, symbol }
  }

  /**
   * Create new datatoken
   * @param {String} metaDataStoreURI
   * @param {String} address
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @return {Promise<string>} datatoken address
   */
  public async create(
    metaDataStoreURI: string,
    address: string,
    cap?: string,
    name?: string,
    symbol?: string
  ): Promise<string> {
    if (!cap) cap = '1000'

    // Generate name & symbol if not present
    if (!name || !symbol) {
      ;({ name, symbol } = this.generateDtName())
    }

    // Create factory contract object
    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress, {
      from: address
    })
    const estGas = await factory.methods
      .createToken(metaDataStoreURI, name, symbol, this.web3.utils.toWei(cap))
      .estimateGas(function (err: string, estGas: string) {
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

  /** Start Order
   * @param {String} dataTokenAddress
   * @param {String} amount
   * @param {Number} serviceId
   * @param {String} mpFeeAddress
   * @param {String} address consumer Address
   * @return {Promise<string>} string
   */
  public async startOrder(
    dataTokenAddress: string,
    amount: string,
    serviceId: number,
    mpFeeAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    if (!mpFeeAddress) mpFeeAddress = '0x0000000000000000000000000000000000000000'
    try {
      const trxReceipt = await datatoken.methods
        .startOrder(this.web3.utils.toWei(amount), String(serviceId), mpFeeAddress)
        .send({ from: address, gas: 600000 })
      return trxReceipt
    } catch (e) {
      console.error(e)
      return null
    }
  }

  /** Search and return txid for a previous valid order with the same params
   * @param {String} dataTokenAddress
   * @param {String} amount
   * @param {String} did
   * @param {Number} serviceId
   * @param {Number} timeout service timeout
   * @param {String} address consumer Address
   * @return {Promise<string>} string
   */
  public async getPreviousValidOrders(
    dataTokenAddress: string,
    amount: string,
    serviceId: number,
    timeout: number,
    address: string
  ): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const events = await datatoken.getPastEvents('OrderStarted', {
      fromBlock: 0,
      toBlock: 'latest'
    })
    for (let i = 0; i < events.length; i++) {
      if (
        String(events[i].returnValues.amount) === this.web3.utils.toWei(String(amount)) &&
        String(events[i].returnValues.serviceId) === String(serviceId)
      ) {
        const transaction = await this.web3.eth.getTransaction(events[i].transactionHash)
        if (transaction.from === address) {
          if (timeout === 0) return events[i].transactionHash
          const blockDetails = await this.web3.eth.getBlock(events[i].blockHash)
          const expiry = new BigNumber(blockDetails.timestamp).plus(timeout)
          const unixTime = new BigNumber(Math.floor(Date.now() / 1000))
          if (unixTime.isLessThan(expiry)) return events[i].transactionHash
        }
      }
    }
    return null
  }
}
