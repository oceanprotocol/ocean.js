import FixedRateExchangeAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import { TransactionReceipt } from 'web3-core'
import { AbiItem } from 'web3-utils/types'
import { calculateEstimatedGas, ZERO_ADDRESS } from '../../utils'
import { PriceAndFees, FeesInfo, FixedPriceExchange } from '../../@types'
import { SmartContractWithAddress } from '..'

export class FixedRateExchange extends SmartContractWithAddress {
  getDefaultAbi(): AbiItem | AbiItem[] {
    return FixedRateExchangeAbi.abi as AbiItem[]
  }

  /**
   * Creates unique exchange identifier.
   * @param {String} baseToken baseToken contract address
   * @param {String} datatoken Datatoken contract address
   * @return {Promise<string>} exchangeId
   */
  public async generateExchangeId(baseToken: string, datatoken: string): Promise<string> {
    const exchangeId = await this.contract.methods
      .generateExchangeId(baseToken, datatoken)
      .call()
    return exchangeId
  }

  /**
   * Atomic swap
   * @param {String} exchangeId ExchangeId
   * @param {String} datatokenAmount Amount of datatokens
   * @param {String} maxBaseTokenAmount max amount of baseToken we want to pay for datatokenAmount
   * @param {String} address User address
   * @param {String} consumeMarketAddress consumeMarketAddress
   * @param {String} consumeMarketFee consumeMarketFee in fraction
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async buyDatatokens<G extends boolean = false>(
    address: string,
    exchangeId: string,
    datatokenAmount: string,
    maxBaseTokenAmount: string,
    consumeMarketAddress: string = ZERO_ADDRESS,
    consumeMarketFee: string = '0',
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const exchange = await this.getExchange(exchangeId)
    const consumeMarketFeeFormatted = this.web3.utils.toWei(consumeMarketFee)
    const dtAmountFormatted = await this.amountToUnits(
      exchange.datatoken,
      datatokenAmount,
      +exchange.dtDecimals
    )
    const maxBtFormatted = await this.amountToUnits(
      exchange.baseToken,
      maxBaseTokenAmount,
      +exchange.btDecimals
    )

    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.buyDT,
      exchangeId,
      dtAmountFormatted,
      maxBtFormatted,
      consumeMarketAddress,
      consumeMarketFeeFormatted
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .buyDT(
        exchangeId,
        dtAmountFormatted,
        maxBtFormatted,
        consumeMarketAddress,
        consumeMarketFeeFormatted
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
  }

  /**
   * Atomic swap
   * @param {String} exchangeId ExchangeId
   * @param {String} datatokenAmount Amount of datatokens
   * @param {String} minBaseTokenAmount min amount of baseToken we want to receive back
   * @param {String} address User address
   * @param {String} consumeMarketAddress consumeMarketAddress
   * @param {String} consumeMarketFee consumeMarketFee in fraction
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async sellDatatokens<G extends boolean = false>(
    address: string,
    exchangeId: string,
    datatokenAmount: string,
    minBaseTokenAmount: string,
    consumeMarketAddress: string = ZERO_ADDRESS,
    consumeMarketFee: string = '0',
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const exchange = await this.getExchange(exchangeId)
    const consumeMarketFeeFormatted = this.web3.utils.toWei(consumeMarketFee)
    const dtAmountFormatted = await this.amountToUnits(
      exchange.datatoken,
      datatokenAmount,
      +exchange.dtDecimals
    )
    const minBtFormatted = await this.amountToUnits(
      exchange.baseToken,
      minBaseTokenAmount,
      +exchange.btDecimals
    )
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.sellDT,
      exchangeId,
      dtAmountFormatted,
      minBtFormatted,
      consumeMarketAddress,
      consumeMarketFeeFormatted
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .sellDT(
        exchangeId,
        dtAmountFormatted,
        minBtFormatted,
        consumeMarketAddress,
        consumeMarketFeeFormatted
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
  }

  /**
   * Gets total number of exchanges
   * @param {String} exchangeId ExchangeId
   * @param {Number} datatokenAmount Amount of datatokens
   * @return {Promise<Number>} no of available exchanges
   */
  public async getNumberOfExchanges(): Promise<number> {
    const numExchanges = await this.contract.methods.getNumberOfExchanges().call()
    return numExchanges
  }

  /**
   * Set new rate
   * @param {String} exchangeId ExchangeId
   * @param {String} newRate New rate
   * @param {String} address User account
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async setRate<G extends boolean = false>(
    address: string,
    exchangeId: string,
    newRate: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.setRate,
      exchangeId,
      this.web3.utils.toWei(newRate)
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .setRate(exchangeId, this.web3.utils.toWei(newRate))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
  }

  /**
   * Set new rate
   * @param {String} exchangeId ExchangeId
   * @param {String} newAllowedSwapper newAllowedSwapper (set address zero if we want to remove allowed swapper)
   * @param {String} address User account
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async setAllowedSwapper<G extends boolean = false>(
    address: string,
    exchangeId: string,
    newAllowedSwapper: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.setAllowedSwapper,
      exchangeId,
      newAllowedSwapper
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .setAllowedSwapper(exchangeId, newAllowedSwapper)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
  }

  /**
   * Activate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async activate<G extends boolean = false>(
    address: string,
    exchangeId: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === true) return null
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.toggleExchangeState,
      exchangeId
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods.toggleExchangeState(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })
    return trxReceipt
  }

  /**
   * Deactivate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async deactivate<G extends boolean = false>(
    address: string,
    exchangeId: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === false) return null

    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.toggleExchangeState,
      exchangeId
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods.toggleExchangeState(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
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
    const rate = await this.web3.utils.fromWei(weiRate)
    return rate
  }

  /**
   * Get Datatoken Supply in the exchange
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>}  dt supply formatted
   */
  public async getDatatokenSupply(exchangeId: string): Promise<string> {
    const dtSupply = await this.contract.methods.getDTSupply(exchangeId).call()
    const exchange = await this.getExchange(exchangeId)
    return await this.unitsToAmount(exchange.datatoken, dtSupply, +exchange.dtDecimals)
  }

  /**
   * Get BaseToken Supply in the exchange
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>} dt supply formatted
   */
  public async getBasetokenSupply(exchangeId: string): Promise<string> {
    const btSupply = await this.contract.methods.getBTSupply(exchangeId).call()
    const exchange = await this.getExchange(exchangeId)
    return await this.unitsToAmount(exchange.baseToken, btSupply, +exchange.btDecimals)
  }

  /**
   * Get Allower Swapper (if set this is the only account which can use this exchange, else is set at address(0))
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>} address of allowedSwapper
   */
  public async getAllowedSwapper(exchangeId: string): Promise<string> {
    return await this.contract.methods.getAllowedSwapper(exchangeId).call()
  }

  /**
   * calcBaseInGivenDatatokensOut - Calculates how many base tokens are needed to get specified amount of datatokens
   * @param {String} exchangeId ExchangeId
   * @param {string} datatokenAmount Amount of datatokens user wants to buy
   * @param {String} consumeMarketFee consumeMarketFee in fraction
   * @return {Promise<PriceAndFees>} how many base tokens are needed and fees
   */
  public async calcBaseInGivenDatatokensOut(
    exchangeId: string,
    datatokenAmount: string,
    consumeMarketFee: string = '0'
  ): Promise<PriceAndFees> {
    const fixedRateExchange = await this.getExchange(exchangeId)
    const outDT = await this.contract.methods
      .calcBaseInGivenOutDT(
        exchangeId,
        await this.amountToUnits(
          fixedRateExchange.datatoken,
          datatokenAmount,
          +fixedRateExchange.dtDecimals
        ),
        this.web3.utils.toWei(consumeMarketFee)
      )
      .call()

    const priceAndFees = {
      baseTokenAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        outDT.baseTokenAmount,
        +fixedRateExchange.btDecimals
      ),
      marketFeeAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        outDT.marketFeeAmount,
        +fixedRateExchange.btDecimals
      ),
      oceanFeeAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        outDT.oceanFeeAmount,
        +fixedRateExchange.btDecimals
      ),
      consumeMarketFeeAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        outDT.consumeMarketFeeAmount,
        +fixedRateExchange.btDecimals
      )
    } as PriceAndFees
    return priceAndFees
  }

  /**
   * getBTOut - returns amount in baseToken that user will receive for datatokenAmount sold
   * @param {String} exchangeId ExchangeId
   * @param {Number} datatokenAmount Amount of datatokens
   * @param {String} consumeMarketFee consumeMarketFee in fraction
   * @return {Promise<string>} Amount of baseTokens user will receive
   */
  public async getAmountBasetokensOut(
    exchangeId: string,
    datatokenAmount: string,
    consumeMarketFee: string = '0'
  ): Promise<string> {
    const exchange = await this.getExchange(exchangeId)
    const amount = await this.contract.methods
      .calcBaseOutGivenInDT(
        exchangeId,
        await this.amountToUnits(
          exchange.datatoken,
          datatokenAmount,
          +exchange.dtDecimals
        ),
        this.web3.utils.toWei(consumeMarketFee)
      )
      .call()

    return await this.unitsToAmount(exchange.baseToken, amount[0], +exchange.btDecimals)
  }

  /**
   * Get exchange details
   * @param {String} exchangeId ExchangeId
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async getExchange(exchangeId: string): Promise<FixedPriceExchange> {
    const exchange: FixedPriceExchange = await this.contract.methods
      .getExchange(exchangeId)
      .call()
    exchange.dtDecimals = exchange.dtDecimals.toString()
    exchange.btDecimals = exchange.btDecimals.toString()
    exchange.dtBalance = await this.unitsToAmount(
      exchange.datatoken,
      exchange.dtBalance,
      +exchange.dtDecimals
    )
    exchange.btBalance = await this.unitsToAmount(
      exchange.baseToken,
      exchange.btBalance,
      +exchange.btDecimals
    )
    exchange.dtSupply = await this.unitsToAmount(
      exchange.datatoken,
      exchange.dtSupply,
      +exchange.dtDecimals
    )
    exchange.btSupply = await this.unitsToAmount(
      exchange.baseToken,
      exchange.btSupply,
      +exchange.btDecimals
    )
    exchange.fixedRate = this.web3.utils.fromWei(exchange.fixedRate)
    exchange.exchangeId = exchangeId
    return exchange
  }

  /**
   * Get fee details for an exchange
   * @param {String} exchangeId ExchangeId
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async getFeesInfo(exchangeId: string): Promise<FeesInfo> {
    const feesInfo: FeesInfo = await this.contract.methods.getFeesInfo(exchangeId).call()
    feesInfo.opcFee = this.web3.utils.fromWei(feesInfo.opcFee.toString())
    feesInfo.marketFee = this.web3.utils.fromWei(feesInfo.marketFee.toString())

    const exchange = await this.getExchange(exchangeId)
    feesInfo.marketFeeAvailable = await this.unitsToAmount(
      exchange.baseToken,
      feesInfo.marketFeeAvailable,
      +exchange.btDecimals
    )
    feesInfo.oceanFeeAvailable = await this.unitsToAmount(
      exchange.baseToken,
      feesInfo.oceanFeeAvailable,
      +exchange.btDecimals
    )

    feesInfo.exchangeId = exchangeId
    return feesInfo
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
    const active = await this.contract.methods.isActive(exchangeId).call()
    return active
  }

  /**
   * Activate minting option for fixed rate contract
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async activateMint<G extends boolean = false>(
    address: string,
    exchangeId: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.withMint === true) return null

    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.toggleMintState,
      exchangeId,
      true
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .toggleMintState(exchangeId, true)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
  }

  /**
   * Deactivate minting for fixed rate
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async deactivateMint<G extends boolean = false>(
    address: string,
    exchangeId: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.withMint === false) return null

    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.toggleMintState,
      exchangeId,
      false
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .toggleMintState(exchangeId, false)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Collect BaseTokens in the contract (anyone can call this, funds are sent to Datatoken.paymentCollector)
   * @param {String} address User address
   * @param {String} exchangeId ExchangeId
   * @param {String} amount amount to be collected
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async collectBasetokens<G extends boolean = false>(
    address: string,
    exchangeId: string,
    amount: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const fixedrate: FixedPriceExchange = await this.contract.methods
      .getExchange(exchangeId)
      .call()
    const amountWei = await this.amountToUnits(
      fixedrate.baseToken,
      amount,
      +fixedrate.btDecimals
    )

    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.collectBT,
      exchangeId,
      amountWei
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods.collectBT(exchangeId, amountWei).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })
    return trxReceipt
  }

  /**
   * Collect datatokens in the contract (anyone can call this, funds are sent to Datatoken.paymentCollector)
   * @param {String} address User address
   * @param {String} exchangeId ExchangeId
   * @param {String} amount amount to be collected
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async collectDatatokens<G extends boolean = false>(
    address: string,
    exchangeId: string,
    amount: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const fixedrate: FixedPriceExchange = await this.contract.methods
      .getExchange(exchangeId)
      .call()
    const amountWei = await this.amountToUnits(
      fixedrate.datatoken,
      amount,
      +fixedrate.dtDecimals
    )

    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.collectDT,
      exchangeId,
      amountWei
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods.collectDT(exchangeId, amountWei).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })
    return trxReceipt
  }

  /**
   * Collect market fee and send it to marketFeeCollector (anyone can call it)
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async collectMarketFee<G extends boolean = false>(
    address: string,
    exchangeId: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.collectMarketFee,
      exchangeId
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods.collectMarketFee(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })
    return trxReceipt
  }

  /**
   * Collect ocean fee and send it to OPF collector (anyone can call it)
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async collectOceanFee<G extends boolean = false>(
    address: string,
    exchangeId: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.collectOceanFee,
      exchangeId
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods.collectOceanFee(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })
    return trxReceipt
  }

  /**
   * Get OPF Collector of fixed rate contract
   * @return {String}
   */
  async getOPCCollector(): Promise<string> {
    const address = await this.contract.methods.opcCollector().call()
    return address
  }

  /**
   * Get Router address set in fixed rate contract
   * @return {String}
   */
  public async getRouter(): Promise<string> {
    const address = await this.contract.methods.router().call()
    return address
  }

  /**
   * Get Exchange Owner given an exchangeId
   * @param {String} exchangeId ExchangeId
   * @return {String} return exchange owner
   */
  async getExchangeOwner(exchangeId: string): Promise<string> {
    const address = await (await this.getExchange(exchangeId)).exchangeOwner
    return address
  }

  /**
   * Set new market fee, only market fee collector can update it
   * @param {String} address user address
   * @param {String} exchangeId ExchangeId
   * @param {String} newMarketFee New market fee
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async updateMarketFee<G extends boolean = false>(
    address: string,
    exchangeId: string,
    newMarketFee: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.updateMarketFee,
      exchangeId,
      this.web3.utils.toWei(newMarketFee)
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .updateMarketFee(exchangeId, this.web3.utils.toWei(newMarketFee))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
  }

  /**
   * Set new market fee collector, only market fee collector can update it
   * @param {String} address user address
   * @param {String} exchangeId ExchangeId
   * @param {String} newMarketFeeCollector New market fee collector
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async updateMarketFeeCollector<G extends boolean = false>(
    address: string,
    exchangeId: string,
    newMarketFeeCollector: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const estGas = await calculateEstimatedGas(
      address,
      this.contract.methods.updateMarketFeeCollector,
      exchangeId,
      newMarketFeeCollector
    )
    if (estimateGas) return estGas

    const trxReceipt = await this.contract.methods
      .updateMarketFeeCollector(exchangeId, newMarketFeeCollector)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    return trxReceipt
  }
}
