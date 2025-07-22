import FixedRateExchangeAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import { sendTx } from '../utils/ContractUtils.js'
import {
  PriceAndFees,
  FeesInfo,
  FixedPriceExchange,
  ReceiptOrEstimate,
  AbiItem
} from '../@types/index.js'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'
import { ZERO_ADDRESS } from '../utils/Constants.js'

export class FixedRateExchange extends SmartContractWithAddress {
  getDefaultAbi() {
    return FixedRateExchangeAbi.abi as AbiItem[]
  }

  /**
   * Creates unique exchange identifier.
   * @param {String} baseToken baseToken contract address
   * @param {String} datatoken Datatoken contract address
   * @return {Promise<string>} exchangeId
   */
  public async generateExchangeId(baseToken: string, datatoken: string): Promise<string> {
    const exchangeId = await this.contract.generateExchangeId(baseToken, datatoken)
    return exchangeId
  }

  /**
   * Atomic swap
   * @param {String} exchangeId ExchangeId
   * @param {String} datatokenAmount Amount of datatokens
   * @param {String} maxBaseTokenAmount max amount of baseToken we want to pay for datatokenAmount
   * @param {String} consumeMarketAddress consumeMarketAddress
   * @param {String} consumeMarketFee consumeMarketFee in fraction
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async buyDatatokens<G extends boolean = false>(
    exchangeId: string,
    datatokenAmount: string,
    maxBaseTokenAmount: string,
    consumeMarketAddress: string = ZERO_ADDRESS,
    consumeMarketFee: string = '0',
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    const consumeMarketFeeFormatted = await this.amountToUnits(null, consumeMarketFee, 18)
    const dtAmountFormatted = await this.amountToUnits(
      exchange.datatoken,
      datatokenAmount,
      Number(exchange.dtDecimals)
    )
    const maxBtFormatted = await this.amountToUnits(
      exchange.baseToken,
      maxBaseTokenAmount,
      Number(exchange.btDecimals)
    )

    const estGas = await this.contract.buyDT.estimateGas(
      exchangeId,
      dtAmountFormatted,
      maxBtFormatted,
      consumeMarketAddress,
      consumeMarketFeeFormatted
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.buyDT,
      exchangeId,
      dtAmountFormatted,
      maxBtFormatted,
      consumeMarketAddress,
      consumeMarketFeeFormatted
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Sell datatokenAmount while expecting at least minBaseTokenAmount
   * @param {String} exchangeId ExchangeId
   * @param {String} datatokenAmount Amount of datatokens
   * @param {String} minBaseTokenAmount min amount of baseToken we want to receive back
   * @param {String} consumeMarketAddress consumeMarketAddress
   * @param {String} consumeMarketFee consumeMarketFee in fraction
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async sellDatatokens<G extends boolean = false>(
    exchangeId: string,
    datatokenAmount: string,
    minBaseTokenAmount: string,
    consumeMarketAddress: string = ZERO_ADDRESS,
    consumeMarketFee: string = '0',
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    const consumeMarketFeeFormatted = await this.amountToUnits(null, consumeMarketFee, 18)
    const dtAmountFormatted = await this.amountToUnits(
      exchange.datatoken,
      datatokenAmount,
      Number(exchange.dtDecimals)
    )
    const minBtFormatted = await this.amountToUnits(
      exchange.baseToken,
      minBaseTokenAmount,
      Number(exchange.btDecimals)
    )
    const estGas = await this.contract.sellDT.estimateGas(
      exchangeId,
      dtAmountFormatted,
      minBtFormatted,
      consumeMarketAddress,
      consumeMarketFeeFormatted
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.sellDT,
      exchangeId,
      dtAmountFormatted,
      minBtFormatted,
      consumeMarketAddress,
      consumeMarketFeeFormatted
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Gets total number of exchanges
   * @return {Promise<Number>} no of available exchanges
   */
  public async getNumberOfExchanges(): Promise<number> {
    const numExchanges = await this.contract.getNumberOfExchanges()
    return numExchanges
  }

  /**
   * Set new rate
   * @param {String} exchangeId Exchange ID
   * @param {String} newRate New rate
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async setRate<G extends boolean = false>(
    exchangeId: string,
    newRate: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.setRate.estimateGas(
      exchangeId,
      await this.amountToUnits(null, newRate, 18)
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.setRate,
      exchangeId,
      await this.amountToUnits(null, newRate, 18)
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Sets a new allowedSwapper
   * @param {String} exchangeId Exchange ID
   * @param {String} newAllowedSwapper  The address of the new allowed swapper (set address zero if we want to remove allowed swapper)
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async setAllowedSwapper<G extends boolean = false>(
    exchangeId: string,
    newAllowedSwapper: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.setAllowedSwapper.estimateGas(
      exchangeId,
      newAllowedSwapper
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.setAllowedSwapper,
      exchangeId,
      newAllowedSwapper
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Activate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async activate<G extends boolean = false>(
    exchangeId: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === true) return null
    const estGas = await this.contract.toggleExchangeState.estimateGas(exchangeId)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.toggleExchangeState,
      exchangeId
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Deactivate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async deactivate<G extends boolean = false>(
    exchangeId: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === false) return null

    const estGas = await this.contract.toggleExchangeState.estimateGas(exchangeId)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.toggleExchangeState,
      exchangeId
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Get Exchange Rate
   * @param {String} exchangeId Exchange ID
   * @return {Promise<string>} Rate (converted from wei)
   */
  public async getRate(exchangeId: string): Promise<string> {
    const weiRate = await this.contract.getRate(exchangeId)
    return await this.unitsToAmount(null, weiRate, 18)
  }

  /**
   * Get Datatoken Supply in the exchange
   * @param {String} exchangeId Exchange Id
   * @return {Promise<string>}  dt supply formatted
   */
  public async getDatatokenSupply(exchangeId: string): Promise<string> {
    const dtSupply = await this.contract.getDTSupply(exchangeId)
    const exchange = await this.getExchange(exchangeId)
    return await this.unitsToAmount(
      exchange.datatoken,
      dtSupply,
      Number(exchange.dtDecimals)
    )
  }

  /**
   * Returns basetoken supply in the exchange
   * @param {String} exchangeId Exchange Id
   * @return {Promise<string>} dt supply formatted
   */
  public async getBasetokenSupply(exchangeId: string): Promise<string> {
    const btSupply = await this.contract.getBTSupply(exchangeId)
    const exchange = await this.getExchange(exchangeId)
    return await this.unitsToAmount(
      exchange.baseToken,
      btSupply,
      Number(exchange.btDecimals)
    )
  }

  /**
   * Get Allower Swapper (if set this is the only account which can use this exchange, else is set at address(0))
   * @param {String} exchangeId Exchange Id
   * @return {Promise<string>} address of allowed swapper
   */
  public async getAllowedSwapper(exchangeId: string): Promise<string> {
    return await this.contract.getAllowedSwapper(exchangeId)
  }

  /**
   * calcBaseInGivenDatatokensOut - Calculates how many base tokens are needed to get specified amount of datatokens
   * @param {String} exchangeId Exchange Id
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
    const outDT = await this.contract.calcBaseInGivenOutDT(
      exchangeId,
      await this.amountToUnits(
        fixedRateExchange.datatoken,
        datatokenAmount,
        Number(fixedRateExchange.dtDecimals)
      ),
      await this.amountToUnits(null, consumeMarketFee, 18)
    )
    const priceAndFees = {
      baseTokenAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        outDT.baseTokenAmount,
        Number(fixedRateExchange.btDecimals)
      ),
      marketFeeAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        outDT.publishMarketFeeAmount,
        Number(fixedRateExchange.btDecimals)
      ),
      oceanFeeAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        outDT.oceanFeeAmount,
        Number(fixedRateExchange.btDecimals)
      ),
      consumeMarketFeeAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        outDT.consumeMarketFeeAmount,
        Number(fixedRateExchange.btDecimals)
      )
    } as PriceAndFees
    return priceAndFees
  }

  /**
   * Returns amount in baseToken that user will receive for datatokenAmount sold
   * @param {String} exchangeId Exchange Id
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
    const amount = await this.contract.calcBaseOutGivenInDT(
      exchangeId,
      await this.amountToUnits(
        exchange.datatoken,
        datatokenAmount,
        Number(exchange.dtDecimals)
      ),
      await this.amountToUnits(null, consumeMarketFee, 18)
    )

    return await this.unitsToAmount(
      exchange.baseToken,
      amount[0],
      Number(exchange.btDecimals)
    )
  }

  /**
   * Get exchange details
   * @param {String} exchangeId Exchange Id
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async getExchange(exchangeId: string): Promise<FixedPriceExchange> {
    const result: FixedPriceExchange = await this.contract.getExchange(exchangeId)
    const exchange: FixedPriceExchange = {
      active: result.active,
      datatoken: result.datatoken,
      baseToken: result.baseToken,
      withMint: result.withMint,
      exchangeOwner: result.exchangeOwner,
      allowedSwapper: result.allowedSwapper,
      dtDecimals: result.dtDecimals.toString(),
      btDecimals: result.btDecimals.toString(),
      dtBalance: await this.unitsToAmount(
        result.datatoken,
        result.dtBalance,
        Number(result.dtDecimals)
      ),
      btBalance: await this.unitsToAmount(
        result.baseToken,
        result.btBalance,
        Number(result.btDecimals)
      ),
      dtSupply: await this.unitsToAmount(
        result.datatoken,
        result.dtSupply,
        Number(result.dtDecimals)
      ),
      btSupply: await this.unitsToAmount(
        result.baseToken,
        result.btSupply,
        Number(result.btDecimals)
      ),
      fixedRate: await this.unitsToAmount(null, result.fixedRate, 18),
      exchangeId
    }
    return exchange
  }

  /**
   * Get fee details for an exchange
   * @param {String} exchangeId Exchange Id
   * @return {Promise<FeesInfo>} Exchange details
   */
  public async getFeesInfo(exchangeId: string): Promise<FeesInfo> {
    const result: FeesInfo = await this.contract.getFeesInfo(exchangeId)
    const exchange = await this.getExchange(exchangeId)
    const feesInfo: FeesInfo = {
      opcFee: await this.unitsToAmount(null, result.opcFee.toString(), 18),
      marketFee: await this.unitsToAmount(null, result.marketFee.toString(), 18),
      marketFeeCollector: result.marketFeeCollector,
      marketFeeAvailable: await this.unitsToAmount(
        exchange.baseToken,
        result.marketFeeAvailable,
        Number(exchange.btDecimals)
      ),
      oceanFeeAvailable: await this.unitsToAmount(
        exchange.baseToken,
        result.oceanFeeAvailable,
        Number(exchange.btDecimals)
      ),

      exchangeId
    }
    return feesInfo
  }

  /**
   * Returns all exchanges
   * @param {String} exchangeId Exchang eId
   * @return {Promise<String[]>} Exchanges list
   */
  public async getExchanges(): Promise<string[]> {
    return await this.contract.getExchanges()
  }

  /**
   * Check if an exchange is active
   * @param {String} exchangeId ExchangeId
   * @return {Promise<Boolean>}
   */
  public async isActive(exchangeId: string): Promise<boolean> {
    const active = await this.contract.isActive(exchangeId)
    return active
  }

  /**
   * Activate minting option for fixed rate contract
   * @param {String} exchangeId Exchang eId
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async activateMint<G extends boolean = false>(
    exchangeId: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.withMint === true) return null

    const estGas = await this.contract.toggleMintState.estimateGas(exchangeId, true)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.toggleMintState,
      exchangeId,
      true
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Deactivate minting for fixed rate
   * @param {String} exchangeId ExchangeId
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async deactivateMint<G extends boolean = false>(
    exchangeId: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.withMint === false) return null

    const estGas = await this.contract.toggleMintState.estimateGas(exchangeId, false)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.toggleMintState,
      exchangeId,
      false
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Collect BaseTokens in the contract (anyone can call this, funds are sent to Datatoken.paymentCollector)
   * @param {String} exchangeId Exchange Id
   * @param {String} amount amount to be collected
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async collectBasetokens<G extends boolean = false>(
    exchangeId: string,
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const fixedrate: FixedPriceExchange = await this.contract.getExchange(exchangeId)
    const amountWei = await this.amountToUnits(
      fixedrate.baseToken,
      amount,
      Number(fixedrate.btDecimals)
    )

    const estGas = await this.contract.collectBT.estimateGas(exchangeId, amountWei)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.collectBT,
      exchangeId,
      amountWei
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Collect datatokens in the contract (anyone can call this, funds are sent to Datatoken.paymentCollector)
   * @param {String} exchangeId Exchange Id
   * @param {String} amount amount to be collected
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async collectDatatokens<G extends boolean = false>(
    exchangeId: string,
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const fixedrate: FixedPriceExchange = await this.contract.getExchange(exchangeId)
    const amountWei = await this.amountToUnits(
      fixedrate.datatoken,
      amount,
      Number(fixedrate.dtDecimals)
    )

    const estGas = await this.contract.collectDT.estimateGas(exchangeId, amountWei)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.collectDT,
      exchangeId,
      amountWei
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Collect market fee and send it to marketFeeCollector (anyone can call it)
   * @param {String} exchangeId Exchange Id
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async collectMarketFee<G extends boolean = false>(
    exchangeId: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const estGas = await this.contract.collectMarketFee.estimateGas(exchangeId)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.collectMarketFee,
      exchangeId
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Collect ocean fee and send it to OPF collector (anyone can call it)
   * @param {String} exchangeId Exchange Id
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async collectOceanFee<G extends boolean = false>(
    exchangeId: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const estGas = await this.contract.collectOceanFee.estimateGas(exchangeId)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.collectOceanFee,
      exchangeId
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Get OPF Collector of fixed rate contract
   * @return {String}
   */
  async getOPCCollector(): Promise<string> {
    const address = await this.contract.opcCollector()
    return address
  }

  /**
   * Get Router address set in fixed rate contract
   * @return {String}
   */
  public async getRouter(): Promise<string> {
    const address = await this.contract.router()
    return address
  }

  /**
   * Get Exchange Owner given an exchangeId
   * @param {String} exchangeId Exchange Id
   * @return {String} return exchange owner
   */
  async getExchangeOwner(exchangeId: string): Promise<string> {
    const address = await (await this.getExchange(exchangeId)).exchangeOwner
    return address
  }

  /**
   * Set new market fee, only market fee collector can update it
   * @param {String} exchangeId Exchange Id
   * @param {String} newMarketFee New market fee
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async updateMarketFee<G extends boolean = false>(
    exchangeId: string,
    newMarketFee: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.updateMarketFee.estimateGas(
      exchangeId,
      await this.amountToUnits(null, newMarketFee, 18)
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.updateMarketFee,
      exchangeId,
      await this.amountToUnits(null, newMarketFee, 18)
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Set new market fee collector, only market fee collector can update it
   * @param {String} exchangeId Exchange Id
   * @param {String} newMarketFeeCollector New market fee collector
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async updateMarketFeeCollector<G extends boolean = false>(
    exchangeId: string,
    newMarketFeeCollector: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await this.contract.updateMarketFeeCollector.estimateGas(
      exchangeId,
      newMarketFeeCollector
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.updateMarketFeeCollector,
      exchangeId,
      newMarketFeeCollector
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
