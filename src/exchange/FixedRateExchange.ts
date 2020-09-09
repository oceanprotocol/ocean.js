import defaultFixedRateExchangeABI from '@oceanprotocol/contracts/artifacts/FixedRateExchange.json'
import BigNumber from 'bignumber.js'
import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'
import Web3 from 'web3'

export interface FixedPricedExchange {
  exchangeID?: string
  exchangeOwner: string
  dataToken: string
  baseToken: string
  fixedRate: string
  active: boolean
  supply: string
}

const DEFAULT_GAS_LIMIT = 300000

export class OceanFixedRateExchange {
  /** Ocean related functions */
  public oceanAddress: string = null
  public fixedRateExchangeAddress: string
  public fixedRateExchangeABI: AbiItem | AbiItem[]
  public web3: Web3
  public contract: Contract = null

  /**
   * Instantiate FixedRateExchange
   * @param {any} web3
   * @param {String} fixedRateExchangeAddress
   * @param {any} fixedRateExchangeABI
   * @param {String} oceanAddress
   */
  constructor(
    web3: Web3,
    fixedRateExchangeAddress: string = null,
    fixedRateExchangeABI: AbiItem | AbiItem[] = null,
    oceanAddress: string = null
  ) {
    this.web3 = web3
    this.fixedRateExchangeAddress = fixedRateExchangeAddress
    this.fixedRateExchangeABI =
      fixedRateExchangeABI || (defaultFixedRateExchangeABI.abi as AbiItem[])
    this.oceanAddress = oceanAddress
    if (web3)
      this.contract = new this.web3.eth.Contract(
        this.fixedRateExchangeABI,
        this.fixedRateExchangeAddress
      )
  }

  /**
   * Creates new exchange pair between Ocean Token and data token.
   * @param {String} dataToken Data Token Contract Address
   * @param {Number} rate exchange rate
   * @param {String} address User address
   * @return {Promise<string>} exchangeId
   */
  public async create(dataToken: string, rate: string, address: string): Promise<string> {
    let estGas
    try {
      /*estGas = await this.contract.methods
        .create(this.oceanAddress, dataToken, this.web3.utils.toWei(rate))
        .estimateGas(function (err, g) {
          if (err) {
            return DEFAULT_GAS_LIMIT
          } else {
            return g
          }
        })
        */
       estGas = DEFAULT_GAS_LIMIT
    } catch (e) {
      estGas = DEFAULT_GAS_LIMIT
    }

    let exchangeId = null
    try {
      const trxReceipt = await this.contract.methods
        .create(this.oceanAddress, dataToken, this.web3.utils.toWei(rate))
        .send({
          from: address,
          gas: estGas + 1
        })
      exchangeId = trxReceipt.events.ExchangeCreated.returnValues[0]
    } catch (e) {
      console.error(e)
    }
    return exchangeId
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
    let estGas
    try {
      estGas = await this.contract.methods
        .swap(exchangeId, this.web3.utils.toWei(String(dataTokenAmount)))
        .estimateGas(function (err, g) {
          if (err) {
            return DEFAULT_GAS_LIMIT
          } else {
            return g
          }
        })
    } catch (e) {
      estGas = DEFAULT_GAS_LIMIT
    }
    try {
      const trxReceipt = await this.contract.methods
        .swap(exchangeId, this.web3.utils.toWei(String(dataTokenAmount)))
        .send({
          from: address,
          gas: estGas + 1
        })
      return trxReceipt
    } catch (e) {
      console.error(e)
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
    let estGas
    try {
      estGas = await this.contract.methods
        .setRate(exchangeId, this.web3.utils.toWei(String(newRate)))
        .estimateGas(function (err, estGas) {
          if (err) {
            // console.log('FixedPriceExchange: ' + err)
            return DEFAULT_GAS_LIMIT
          }
          return estGas
        })
    } catch (e) {
      estGas = DEFAULT_GAS_LIMIT
    }
    const trxReceipt = await this.contract.methods
      .setRate(exchangeId, this.web3.utils.toWei(String(newRate)))
      .send({
        from: address,
        gas: estGas + 1
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
    let estGas
    try {
      estGas = await this.contract.methods
        .activate(exchangeId)
        .estimateGas(function (err, estGas) {
          if (err) {
            // console.log('FixedPriceExchange: ' + err)
            estGas = DEFAULT_GAS_LIMIT
          }
          return estGas
        })
    } catch (e) {
      estGas = DEFAULT_GAS_LIMIT
    }
    const trxReceipt = await this.contract.methods.activate(exchangeId).send({
      from: address,
      gas: estGas + 1
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
    let estGas
    try {
      estGas = await this.contract.methods
        .deactivate(exchangeId)
        .estimateGas(function (err, estGas) {
          if (err) {
            // console.log('FixedPriceExchange: ' + err)
            estGas = DEFAULT_GAS_LIMIT
          }
          return estGas
        })
    } catch (e) {
      estGas = DEFAULT_GAS_LIMIT
    }
    const trxReceipt = await this.contract.methods.deactivate(exchangeId).send({
      from: address,
      gas: estGas + 1
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
  public async getExchange(exchangeId: string): Promise<FixedPricedExchange> {
    const result: FixedPricedExchange = await this.contract.methods
      .getExchange(exchangeId)
      .call()
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
  ): Promise<FixedPricedExchange[]> {
    const result: FixedPricedExchange[] = []
    const events = await this.contract.getPastEvents('ExchangeCreated', {
      filter: { datatoken: dataTokenAddress },
      fromBlock: 0,
      toBlock: 'latest'
    })
    for (let i = 0; i < events.length; i++) {
      const constituents = await this.getExchange(events[i].returnValues[0])
      constituents.exchangeID = events[i].returnValues[0]
      if (constituents.active === true) {
        const supply = new BigNumber(this.web3.utils.fromWei(constituents.supply))
        const required = new BigNumber(minSupply)
        if (supply >= required) {
          result.push(constituents)
        }
      }
    }
    return result
  }
}
