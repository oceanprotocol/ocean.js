import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'

import defaultFactoryABI from '@oceanprotocol/contracts/ocean_abis/DTFactory.json'
import defaultDatatokensABI from '@oceanprotocol/contracts/ocean_abis/DataTokenTemplate.json'
import { Logger, getFairGasPrice } from '../utils'
import wordListDefault from '../data/words.json'
import { TransactionReceipt } from 'web3-core'
import BigNumber from 'bignumber.js'
import Decimal from 'decimal.js'

/**
 * Provides an interface to DataTokens
 */
export class DataTokens {
  public GASLIMIT_DEFAULT = 1000000
  public factoryAddress: string
  public factoryABI: AbiItem | AbiItem[]
  public datatokensABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number
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
    web3: Web3,
    logger: Logger,
    startBlock?: number
  ) {
    this.factoryAddress = factoryAddress
    this.factoryABI = factoryABI || (defaultFactoryABI.abi as AbiItem[])
    this.datatokensABI = datatokensABI || (defaultDatatokensABI.abi as AbiItem[])
    this.web3 = web3
    this.logger = logger
    this.startBlock = startBlock || 0
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
   * @param {String} metadataCacheUri
   * @param {String} address
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @return {Promise<string>} datatoken address
   */
  public async create(
    metadataCacheUri: string,
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
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await factory.methods
        .createToken(metadataCacheUri, name, symbol, this.web3.utils.toWei(cap))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await factory.methods
      .createToken(metadataCacheUri, name, symbol, this.web3.utils.toWei(cap))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    let tokenAddress = null
    try {
      tokenAddress = trxReceipt.events.TokenCreated.returnValues[0]
    } catch (e) {
      this.logger.error(`ERROR: Failed to create datatoken : ${e.message}`)
    }
    return tokenAddress
  }

  /**
   * Approve
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {string} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async approve(
    dataTokenAddress: string,
    spender: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .approve(spender, this.web3.utils.toWei(amount))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await datatoken.methods
      .approve(spender, this.web3.utils.toWei(amount))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    return trxReceipt
  }

  /**
   * Mint
   * @param {String} dataTokenAddress
   * @param {String} address
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} toAddress   - only if toAddress is different from the minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async mint(
    dataTokenAddress: string,
    address: string,
    amount: string,
    toAddress?: string
  ): Promise<TransactionReceipt> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const capAvailble = await this.getCap(dataTokenAddress)
    if (new Decimal(capAvailble).gte(amount)) {
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      let estGas
      try {
        estGas = await datatoken.methods
          .mint(toAddress || address, this.web3.utils.toWei(amount))
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }
      const trxReceipt = await datatoken.methods
        .mint(toAddress || address, this.web3.utils.toWei(amount))
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } else {
      throw new Error(`Mint amount exceeds cap available`)
    }
  }

  /**
   * Transfer as number from address to toAddress
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async transfer(
    dataTokenAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    return this.transferToken(dataTokenAddress, toAddress, amount, address)
  }

  /**
   * Transfer as number from address to toAddress
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async transferToken(
    dataTokenAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    const weiAmount = this.web3.utils.toWei(amount)
    return this.transferWei(dataTokenAddress, toAddress, weiAmount, address)
  }

  /**
   * Transfer in wei from address to toAddress
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {String} amount Number of datatokens, as number. Expressed as wei
   * @param {String} address
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async transferWei(
    dataTokenAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .transfer(toAddress, amount)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await datatoken.methods.transfer(toAddress, amount).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })
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
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .transferFrom(fromAddress, address, this.web3.utils.toWei(amount))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await datatoken.methods
      .transferFrom(fromAddress, address, this.web3.utils.toWei(amount))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
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
   * @return {Promise<string>} string
   */
  public async getBlob(dataTokenAddress: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
    const trxReceipt = await datatoken.methods.blob().call()
    return trxReceipt
  }

  /** Get Name
   * @param {String} dataTokenAddress
   * @return {Promise<string>} string
   */
  public async getName(dataTokenAddress: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
    const trxReceipt = await datatoken.methods.name().call()
    return trxReceipt
  }

  /** Get Symbol
   * @param {String} dataTokenAddress
   * @return {Promise<string>} string
   */
  public async getSymbol(dataTokenAddress: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
    const trxReceipt = await datatoken.methods.symbol().call()
    return trxReceipt
  }

  /** Get Cap
   * @param {String} dataTokenAddress
   * @return {Promise<string>} string
   */
  public async getCap(dataTokenAddress: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
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
   * @param {String} consumer consumer Address
   * @param {String} amount
   * @param {Number} serviceId
   * @param {String} mpFeeAddress
   * @param {String} address consumer Address
   * @return {Promise<string>} string
   */
  public async startOrder(
    dataTokenAddress: string,
    consumer: string,
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
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      let estGas
      try {
        estGas = await datatoken.methods
          .startOrder(
            consumer,
            this.web3.utils.toWei(amount),
            String(serviceId),
            mpFeeAddress
          )
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }
      const trxReceipt = await datatoken.methods
        .startOrder(
          consumer,
          this.web3.utils.toWei(amount),
          String(serviceId),
          mpFeeAddress
        )
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } catch (e) {
      this.logger.error(`ERROR: Failed to start order : ${e.message}`)
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
    let fromBlock
    if (timeout > 0) {
      const lastBlock = await this.web3.eth.getBlockNumber()
      fromBlock = lastBlock - timeout
      if (fromBlock < this.startBlock) fromBlock = this.startBlock
    } else {
      fromBlock = this.startBlock
    }
    const events = await datatoken.getPastEvents('OrderStarted', {
      filter: { consumer: address },
      fromBlock,
      toBlock: 'latest'
    })
    for (let i = 0; i < events.length; i++) {
      if (
        String(events[i].returnValues.amount) === this.web3.utils.toWei(String(amount)) &&
        String(events[i].returnValues.serviceId) === String(serviceId) &&
        events[i].returnValues.consumer.toLowerCase() === address.toLowerCase()
      ) {
        if (timeout === 0) return events[i].transactionHash
        const blockDetails = await this.web3.eth.getBlock(events[i].blockHash)
        const expiry = new BigNumber(blockDetails.timestamp).plus(timeout)
        const unixTime = new BigNumber(Math.floor(Date.now() / 1000))
        if (unixTime.isLessThan(expiry)) return events[i].transactionHash
      }
    }
    return null
  }

  public getStartOrderEventSignature(): string {
    const abi = this.datatokensABI as AbiItem[]
    const eventdata = abi.find(function (o) {
      if (o.name === 'OrderStarted' && o.type === 'event') return o
    })
    const topic = this.web3.eth.abi.encodeEventSignature(eventdata as any)
    return topic
  }

  /**
   * Purpose a new minter
   * @param {String} dataTokenAddress
   * @param {String} newMinter
   * @param {String} address - only current minter can call this
   * @return {Promise<string>} transactionId
   */
  public async proposeMinter(
    dataTokenAddress: string,
    newMinterAddress: string,
    address: string
  ): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .proposeMinter(newMinterAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      const trxReceipt = await datatoken.methods.proposeMinter(newMinterAddress).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
      return trxReceipt
    } catch (e) {
      return null
    }
  }

  /**
   * Approve minter role
   * @param {String} dataTokenAddress
   * @param {String} address - only proposad minter can call this
   * @return {Promise<string>} transactionId
   */
  public async approveMinter(dataTokenAddress: string, address: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .approveMinter()
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      const trxReceipt = await datatoken.methods.approveMinter().send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
      return trxReceipt
    } catch (e) {
      return null
    }
  }

  /** Check if an address has the minter role
   * @param {String} dataTokenAddress
   * * @param {String} address
   * @return {Promise<string>} string
   */
  public async isMinter(dataTokenAddress: string, address: string): Promise<boolean> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
    const trxReceipt = await datatoken.methods.isMinter(address).call()
    return trxReceipt
  }
}
