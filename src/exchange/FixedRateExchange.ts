import defaultFixedRateExchangeABI from '@oceanprotocol/contracts/artifacts/FixedRateExchange.json'
import BigNumber from 'bignumber.js'
import { TransactionReceipt } from 'web3-core'
import { Contract, EventData } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'
import Web3 from 'web3'
import {
  SubscribablePromise,
  Logger,
  getFairGasPrice,
  setContractDefaults
} from '../utils'
import { DataTokens } from '../datatokens/Datatokens'
import { ConfigHelperConfig } from '../utils/ConfigHelper'

const MAX_AWAIT_PROMISES = 10

export interface FixedPriceExchange {
  exchangeID?: string
  exchangeOwner: string
  dataToken: string
  baseToken: string
  fixedRate: string
  active: boolean
  supply: string
}

export interface FixedPriceSwap {
  exchangeID: string
  caller: string
  baseTokenAmount: string
  dataTokenAmount: string
}

export enum FixedRateCreateProgressStep {
  CreatingExchange,
  ApprovingDatatoken
}

export class OceanFixedRateExchange {
  public GASLIMIT_DEFAULT = 1000000
  /** Ocean related functions */
  public oceanAddress: string = null
  public fixedRateExchangeAddress: string
  public fixedRateExchangeABI: AbiItem | AbiItem[]
  public web3: Web3
  public contract: Contract = null
  private logger: Logger
  public datatokens: DataTokens
  public startBlock: number
  private config: ConfigHelperConfig

  /**
   * Instantiate FixedRateExchange
   * @param {any} web3
   * @param {String} fixedRateExchangeAddress
   * @param {any} fixedRateExchangeABI
   * @param {String} oceanAddress
   */
  constructor(
    web3: Web3,
    logger: Logger,
    fixedRateExchangeAddress: string = null,
    fixedRateExchangeABI: AbiItem | AbiItem[] = null,
    oceanAddress: string = null,
    datatokens: DataTokens,
    config?: ConfigHelperConfig
  ) {
    this.web3 = web3
    this.fixedRateExchangeAddress = fixedRateExchangeAddress
    this.config = config
    this.startBlock = (config && config.startBlock) || 0
    this.fixedRateExchangeABI =
      fixedRateExchangeABI || (defaultFixedRateExchangeABI.abi as AbiItem[])
    this.oceanAddress = oceanAddress
    this.datatokens = datatokens
    if (web3)
      this.contract = setContractDefaults(
        new this.web3.eth.Contract(
          this.fixedRateExchangeABI,
          this.fixedRateExchangeAddress
        ),
        this.config
      )
    this.logger = logger
  }

  /**
   * Creates new exchange pair between Ocean Token and data token.
   * @param {String} dataToken Data Token Contract Address
   * @param {Number} rate exchange rate
   * @param {String} address User address
   * @param {String} amount Optional, amount of datatokens to be approved for the exchange
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public create(
    dataToken: string,
    rate: string,
    address: string,
    amount?: string
  ): SubscribablePromise<FixedRateCreateProgressStep, TransactionReceipt> {
    return this.createExchange(this.oceanAddress, dataToken, rate, address, amount)
  }

  /**
   * Creates new exchange pair between Ocean Token and data token.
   * @param {String} dataToken Data Token Contract Address
   * @param {Number} rate exchange rate
   * @param {String} address User address
   * @param {String} amount Optional, amount of datatokens to be approved for the exchange
   * @return {Promise<TransactionReceipt>} TransactionReceipt
   */
  public createExchange(
    baseToken: string,
    dataToken: string,
    rate: string,
    address: string,
    amount?: string
  ): SubscribablePromise<FixedRateCreateProgressStep, TransactionReceipt> {
    return new SubscribablePromise(async (observer) => {
      observer.next(FixedRateCreateProgressStep.CreatingExchange)
      let estGas
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      try {
        estGas = await this.contract.methods
          .create(baseToken, dataToken, this.web3.utils.toWei(rate))
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }
      let exchangeId = null
      let trxReceipt = null
      try {
        trxReceipt = await this.contract.methods
          .create(baseToken, dataToken, this.web3.utils.toWei(rate))
          .send({
            from: address,
            gas: estGas + 1,
            gasPrice: await getFairGasPrice(this.web3, this.config)
          })
        exchangeId = trxReceipt.events.ExchangeCreated.returnValues[0]
      } catch (e) {
        this.logger.error(`ERROR: Failed to create new exchange: ${e.message}`)
      }
      if (amount && exchangeId) {
        observer.next(FixedRateCreateProgressStep.ApprovingDatatoken)
        this.datatokens.approve(dataToken, this.fixedRateExchangeAddress, amount, address)
      }
      return trxReceipt
    })
  }

  /**
   * Creates unique exchange identifier.
   * @param {String} dataToken Data Token Contract Address
   * @param {String} owner Owner of the exchange
   * @return {Promise<string>} exchangeId
   */
  public async generateExchangeId(dataToken: string, owner: string): Promise<string> {
    const exchangeId = await this.contract.methods
      .generateExchangeId(this.oceanAddress, dataToken, owner)
      .call()
    return exchangeId
  }

  /**
   * Atomic swap
   * @param {String} exchangeId ExchangeId
   * @param {Number} dataTokenAmount Amount of Data Tokens
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async buyDT(
    exchangeId: string,
    dataTokenAmount: string,
    address: string
  ): Promise<TransactionReceipt> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.contract.methods
        .swap(exchangeId, this.web3.utils.toWei(String(dataTokenAmount)))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      const trxReceipt = await this.contract.methods
        .swap(exchangeId, this.web3.utils.toWei(String(dataTokenAmount)))
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      return trxReceipt
    } catch (e) {
      this.logger.error(`ERROR: Failed to buy datatokens: ${e.message}`)
      return null
    }
  }

  /**
   * Gets total number of exchanges
   * @param {String} exchangeId ExchangeId
   * @param {Number} dataTokenAmount Amount of Data Tokens
   * @return {Promise<Number>} no of available exchanges
   */
  public async getNumberOfExchanges(): Promise<number> {
    const numExchanges = await this.contract.methods.getNumberOfExchanges().call()
    return numExchanges
  }

  /**
   * Set new rate
   * @param {String} exchangeId ExchangeId
   * @param {Number} newRate New rate
   * @param {String} address User account
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async setRate(
    exchangeId: string,
    newRate: number,
    address: string
  ): Promise<TransactionReceipt> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.contract.methods
        .setRate(exchangeId, this.web3.utils.toWei(String(newRate)))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await this.contract.methods
      .setRate(exchangeId, this.web3.utils.toWei(String(newRate)))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    return trxReceipt
  }

  /**
   * Activate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async activate(
    exchangeId: string,
    address: string
  ): Promise<TransactionReceipt> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === true) return null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.contract.methods
        .toggleExchangeState(exchangeId)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await this.contract.methods.toggleExchangeState(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })
    return trxReceipt
  }

  /**
   * Deactivate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async deactivate(
    exchangeId: string,
    address: string
  ): Promise<TransactionReceipt> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === false) return null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.contract.methods
        .toggleExchangeState(exchangeId)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await this.contract.methods.toggleExchangeState(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })
    return trxReceipt
  }

  /**
   * Get Rate
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>} Rate (converted from wei)
   */
  public async getRate(exchangeId: string): Promise<string> {
    const weiRate = await this.contract.methods.getRate(exchangeId).call()
    return this.web3.utils.fromWei(weiRate)
  }

  /**
   * Get Supply
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>} Rate (converted from wei)
   */
  public async getSupply(exchangeId: string): Promise<string> {
    const weiRate = await this.contract.methods.getSupply(exchangeId).call()
    return this.web3.utils.fromWei(weiRate)
  }

  /**
   * getOceanNeeded
   * @param {String} exchangeId ExchangeId
   * @param {Number} dataTokenAmount Amount of Data Tokens
   * @return {Promise<string>} Ocean amount needed
   */
  public async getOceanNeeded(
    exchangeId: string,
    dataTokenAmount: string
  ): Promise<string> {
    const weiRate = await this.contract.methods
      .CalcInGivenOut(exchangeId, this.web3.utils.toWei(dataTokenAmount))
      .call()
    return this.web3.utils.fromWei(weiRate)
  }

  /**
   * Get exchange details
   * @param {String} exchangeId ExchangeId
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async getExchange(exchangeId: string): Promise<FixedPriceExchange> {
    const result: FixedPriceExchange = await this.contract.methods
      .getExchange(exchangeId)
      .call()
    result.fixedRate = this.web3.utils.fromWei(result.fixedRate)
    result.supply = this.web3.utils.fromWei(result.supply)
    result.exchangeID = exchangeId
    return result
  }

  /**
   * Get all exchanges
   * @param {String} exchangeId ExchangeId
   * @return {Promise<String[]>} Exchanges list
   */
  public async getExchanges(): Promise<string[]> {
    return await this.contract.methods.getExchanges().call()
  }

  /**
   * Check if an exchange is active
   * @param {String} exchangeId ExchangeId
   * @return {Promise<Boolean>} Result
   */
  public async isActive(exchangeId: string): Promise<boolean> {
    const result = await this.contract.methods.isActive(exchangeId).call()
    return result
  }

  /**
   * Calculates how many basetokens are needed to get specifyed amount of datatokens
   * @param {String} exchangeId ExchangeId
   * @param {String} dataTokenAmount dataTokenAmount
   * @return {Promise<String>} Result
   */
  public async CalcInGivenOut(
    exchangeId: string,
    dataTokenAmount: string
  ): Promise<string> {
    const result = await this.contract.methods
      .CalcInGivenOut(exchangeId, this.web3.utils.toWei(dataTokenAmount))
      .call()
    return this.web3.utils.fromWei(result)
  }

  public async searchforDT(
    dataTokenAddress: string,
    minSupply: string
  ): Promise<FixedPriceExchange[]> {
    const result: FixedPriceExchange[] = []
    const events = await this.contract.getPastEvents('ExchangeCreated', {
      filter: { datatoken: dataTokenAddress.toLowerCase() },
      fromBlock: this.startBlock,
      toBlock: 'latest'
    })
    let promises = []
    for (let i = 0; i < events.length; i++) {
      promises.push(this.getExchange(events[i].returnValues[0]))
      if (promises.length > MAX_AWAIT_PROMISES || i === events.length - 1) {
        const results = await Promise.all(promises)
        for (let j = 0; j < results.length; j++) {
          const constituents = results[j]
          if (
            constituents.active === true &&
            constituents.dataToken.toLowerCase() === dataTokenAddress.toLowerCase()
          ) {
            const supply = new BigNumber(constituents.supply)
            const required = new BigNumber(minSupply)
            if (supply.gte(required)) {
              result.push(constituents)
            }
          }
        }
        promises = []
      }
    }
    return result
  }

  /**
   * Get all exchanges, filtered by creator(if any)
   * @param {String} account
   * @return {Promise<FixedPricedExchange[]>}
   */
  public async getExchangesbyCreator(account?: string): Promise<FixedPriceExchange[]> {
    const result: FixedPriceExchange[] = []
    const events = await this.contract.getPastEvents('ExchangeCreated', {
      filter: {},
      fromBlock: this.startBlock,
      toBlock: 'latest'
    })
    for (let i = 0; i < events.length; i++) {
      if (!account || events[i].returnValues[3].toLowerCase() === account.toLowerCase())
        result.push(await this.getExchange(events[i].returnValues[0]))
    }
    return result
  }

  /**
   * Get all swaps for an exchange, filtered by account(if any)
   * @param {String} exchangeId
   * @param {String} account
   * @return {Promise<FixedPricedSwap[]>}
   */
  public async getExchangeSwaps(
    exchangeId: string,
    account?: string
  ): Promise<FixedPriceSwap[]> {
    const result: FixedPriceSwap[] = []
    const events = await this.contract.getPastEvents('Swapped', {
      filter: { exchangeId: exchangeId },
      fromBlock: this.startBlock,
      toBlock: 'latest'
    })
    for (let i = 0; i < events.length; i++) {
      if (!account || events[i].returnValues[1].toLowerCase() === account.toLowerCase())
        result.push(this.getEventData(events[i]))
    }
    return result
  }

  /**
   * Get all swaps for an account
   * @param {String} account
   * @return {Promise<FixedPricedSwap[]>}
   */
  public async getAllExchangesSwaps(account: string): Promise<FixedPriceSwap[]> {
    const result: FixedPriceSwap[] = []
    const events = await this.contract.getPastEvents('ExchangeCreated', {
      filter: {},
      fromBlock: this.startBlock,
      toBlock: 'latest'
    })
    for (let i = 0; i < events.length; i++) {
      const swaps: FixedPriceSwap[] = await this.getExchangeSwaps(
        events[i].returnValues[0],
        account
      )
      swaps.forEach((swap) => {
        result.push(swap)
      })
    }
    return result
  }

  private getEventData(data: EventData): FixedPriceSwap {
    const result: FixedPriceSwap = {
      exchangeID: data.returnValues[0],
      caller: data.returnValues[1],
      baseTokenAmount: this.web3.utils.fromWei(data.returnValues[2]),
      dataTokenAmount: this.web3.utils.fromWei(data.returnValues[3])
    }
    return result
  }
}
