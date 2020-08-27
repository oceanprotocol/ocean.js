import defaultFixedRateExchangeABI from '@oceanprotocol/contracts/artifacts/FixedRateExchange.json'

export interface FixedPricedExchange {
  exchangeOwner: string
  dataToken: string
  baseToken: string
  fixedRate: number
  active: boolean
}

export class OceanFixedRateExchange {
  /** Ocean related functions */
  public oceanAddress: string = null
  public fixedRateExchangeAddress: string
  public fixedRateExchangeABI: any
  public web3: any
  public contract: any = null

  /**
   * Instantiate FixedRateExchange
   * @param {any} web3
   * @param {String} fixedRateExchangeAddress
   * @param {any} fixedRateExchangeABI
   * @param {String} oceanAddress
   */
  constructor(
    web3: any,
    fixedRateExchangeAddress: string = null,
    fixedRateExchangeABI: any = null,
    oceanAddress: string = null
  ) {
    this.web3 = web3
    this.fixedRateExchangeAddress = fixedRateExchangeAddress
    this.fixedRateExchangeABI = fixedRateExchangeABI || defaultFixedRateExchangeABI.abi
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
    const estGas = await this.contract.methods
      .create(this.oceanAddress, dataToken, this.web3.utils.toWei(rate))
      .estimateGas(function (err, estGas) {
        if (err) console.log('FixedPriceExchange: ' + err)
        return estGas
      })
    const trxReceipt = await this.contract.methods
      .create(this.oceanAddress, dataToken, this.web3.utils.toWei(rate))
      .send({
        from: address,
        gas: estGas + 1
      })

    let exchangeId = null
    try {
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
   * @return {Promise<any>} transaction receipt
   */
  public async swap(
    exchangeId: string,
    dataTokenAmount: string,
    address: string
  ): Promise<any> {

    let estGas
    try {
        estGas = await this.contract.methods
            .swap(exchangeId, this.web3.utils.toWei(String(dataTokenAmount)))
            .estimateGas(function (err, g) {
                if (err) {
                    console.log('FixedPriceExchange: ' + err)
                    return 200000
                } else {
                    return g
                }
            })
    } catch (e) {
        console.log('FixedPriceExchange: ' + e)
        estGas = 200000
    }
    console.log('estGas: ' + estGas)
    const trxReceipt = await this.contract.methods
      .swap(exchangeId, this.web3.utils.toWei(String(dataTokenAmount)))
      .send({
        from: address,
        gas: estGas + 1
      })
    return trxReceipt
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
   * @return {Promise<any>} transaction receipt
   */
  public async setRate(
    exchangeId: string,
    newRate: number,
    address: string
  ): Promise<any> {
    const estGas = await this.contract.methods
      .setRate(exchangeId, this.web3.utils.toWei(String(newRate)))
      .estimateGas(function (err, estGas) {
        if (err) console.log('FixedPriceExchange: ' + err)
        return estGas
      })
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
   * @return {Promise<any>} transaction receipt
   */
  public async activate(exchangeId: string, address: string): Promise<any> {
    const estGas = await this.contract.methods
      .activate(exchangeId)
      .estimateGas(function (err, estGas) {
        if (err) console.log('FixedPriceExchange: ' + err)
        return estGas
      })
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
   * @return {Promise<any>} transaction receipt
   */
  public async deactivate(exchangeId: string, address: string): Promise<any> {
    const estGas = await this.contract.methods
      .deactivate(exchangeId)
      .estimateGas(function (err, estGas) {
        if (err) console.log('FixedPriceExchange: ' + err)
        return estGas
      })
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
    const result = await this.contract.methods.getExchanges().call()
    return result
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
}
