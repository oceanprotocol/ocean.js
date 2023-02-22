import FixedRateExchangeAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import { ethers } from 'ethers'
import { calculateEstimatedGas, sendTx, ZERO_ADDRESS } from '../utils'
import { PriceAndFees, FeesInfo, FixedPriceExchange, ReceiptOrEstimate } from '../@types'
import { SmartContractWithAddress } from './SmartContractWithAddress'

export class FixedRateExchange extends SmartContractWithAddress {
  getDefaultAbi() {
    return FixedRateExchangeAbi.abi
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
    const consumeMarketFeeFormatted = ethers.parseUnits(consumeMarketFee, 'ether')
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
      this.contract.buyDT,
      exchangeId,
      dtAmountFormatted,
      maxBtFormatted,
      consumeMarketAddress,
      consumeMarketFeeFormatted
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
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
    const consumeMarketFeeFormatted = ethers.parseUnits(consumeMarketFee, 'ether')
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
      this.contract.sellDT,
      exchangeId,
      dtAmountFormatted,
      minBtFormatted,
      consumeMarketAddress,
      consumeMarketFeeFormatted
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
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
   * @param {String} exchangeId ExchangeId
   * @param {Number} datatokenAmount Amount of datatokens
   * @return {Promise<Number>} no of available exchanges
   */
  public async getNumberOfExchanges(): Promise<number> {
    const numExchanges = await this.contract.getNumberOfExchanges()
    return numExchanges
  }

  /**
   * Set new rate
   * @param {String} exchangeId ExchangeId
   * @param {String} newRate New rate
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async setRate<G extends boolean = false>(
    exchangeId: string,
    newRate: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      this.contract.setRate,
      exchangeId,
      ethers.formatEther(newRate)
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.setRate,
      exchangeId,
      ethers.formatEther(newRate)
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Sets a new allowedSwapper
   * @param {String} exchangeId ExchangeId
   * @param {String} newAllowedSwapper newAllowedSwapper (set address zero if we want to remove allowed swapper)
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async setAllowedSwapper<G extends boolean = false>(
    exchangeId: string,
    newAllowedSwapper: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      this.contract.setAllowedSwapper,
      exchangeId,
      newAllowedSwapper
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
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
   * @param {String} address User address
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async activate<G extends boolean = false>(
    exchangeId: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === true) return null
    const estGas = await calculateEstimatedGas(
      this.contract.toggleExchangeState,
      exchangeId
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
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

    const estGas = await calculateEstimatedGas(
      this.contract.toggleExchangeState,
      exchangeId
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.toggleExchangeState,
      exchangeId
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Get Rate
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>} Rate (converted from wei)
   */
  public async getRate(exchangeId: string): Promise<string> {
    const weiRate = await this.contract.getRate(exchangeId)
    const rate = ethers.formatEther(weiRate)
    return rate
  }

  /**
   * Get Datatoken Supply in the exchange
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>}  dt supply formatted
   */
  public async getDatatokenSupply(exchangeId: string): Promise<string> {
    const dtSupply = await this.contract.getDTSupply(exchangeId)
    const exchange = await this.getExchange(exchangeId)
    return await this.unitsToAmount(exchange.datatoken, dtSupply, +exchange.dtDecimals)
  }

  /**
   * Get BaseToken Supply in the exchange
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>} dt supply formatted
   */
  public async getBasetokenSupply(exchangeId: string): Promise<string> {
    const btSupply = await this.contract.getBTSupply(exchangeId)
    const exchange = await this.getExchange(exchangeId)
    return await this.unitsToAmount(exchange.baseToken, btSupply, +exchange.btDecimals)
  }

  /**
   * Get Allower Swapper (if set this is the only account which can use this exchange, else is set at address(0))
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>} address of allowedSwapper
   */
  public async getAllowedSwapper(exchangeId: string): Promise<string> {
    return await this.contract.getAllowedSwapper(exchangeId)
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
    const outDT = await this.contract.calcBaseInGivenOutDT(
      exchangeId,
      await this.amountToUnits(
        fixedRateExchange.datatoken,
        datatokenAmount,
        +fixedRateExchange.dtDecimals
      ),
      ethers.parseUnits(consumeMarketFee, 'ethers')
    )

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
    const amount = await this.contract.calcBaseOutGivenInDT(
      exchangeId,
      await this.amountToUnits(exchange.datatoken, datatokenAmount, +exchange.dtDecimals),
      ethers.parseUnits(consumeMarketFee, 'ethers')
    )

    return await this.unitsToAmount(exchange.baseToken, amount[0], +exchange.btDecimals)
  }

  /**
   * Get exchange details
   * @param {String} exchangeId ExchangeId
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async getExchange(exchangeId: string): Promise<FixedPriceExchange> {
    const exchange: FixedPriceExchange = await this.contract.getExchange(exchangeId)
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
    exchange.fixedRate = ethers.formatEther(exchange.fixedRate)
    exchange.exchangeId = exchangeId
    return exchange
  }

  /**
   * Get fee details for an exchange
   * @param {String} exchangeId ExchangeId
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async getFeesInfo(exchangeId: string): Promise<FeesInfo> {
    const feesInfo: FeesInfo = await this.contract.getFeesInfo(exchangeId)
    feesInfo.opcFee = ethers.formatEther(feesInfo.opcFee.toString())
    feesInfo.marketFee = ethers.formatEther(feesInfo.marketFee.toString())

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
    return await this.contract.getExchanges()
  }

  /**
   * Check if an exchange is active
   * @param {String} exchangeId ExchangeId
   * @return {Promise<Boolean>} Result
   */
  public async isActive(exchangeId: string): Promise<boolean> {
    const active = await this.contract.isActive(exchangeId)
    return active
  }

  /**
   * Activate minting option for fixed rate contract
   * @param {String} exchangeId ExchangeId
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

    const estGas = await calculateEstimatedGas(
      this.contract.toggleMintState,
      exchangeId,
      true
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
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

    const estGas = await calculateEstimatedGas(
      this.contract.toggleMintState,
      exchangeId,
      false
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.toggleMintState,
      exchangeId,
      false
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Collect BaseTokens in the contract (anyone can call this, funds are sent to Datatoken.paymentCollector)
   * @param {String} exchangeId ExchangeId
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
      +fixedrate.btDecimals
    )

    const estGas = await calculateEstimatedGas(
      this.contract.collectBT,
      exchangeId,
      amountWei
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.collectBT,
      exchangeId,
      amountWei
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Collect datatokens in the contract (anyone can call this, funds are sent to Datatoken.paymentCollector)
   * @param {String} exchangeId ExchangeId
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
      +fixedrate.dtDecimals
    )

    const estGas = await calculateEstimatedGas(
      this.contract.collectDT,
      exchangeId,
      amountWei
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.collectDT,
      exchangeId,
      amountWei
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Collect market fee and send it to marketFeeCollector (anyone can call it)
   * @param {String} exchangeId ExchangeId
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async collectMarketFee<G extends boolean = false>(
    exchangeId: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const estGas = await calculateEstimatedGas(this.contract.collectMarketFee, exchangeId)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.collectMarketFee,
      exchangeId
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Collect ocean fee and send it to OPF collector (anyone can call it)
   * @param {String} exchangeId ExchangeId
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async collectOceanFee<G extends boolean = false>(
    exchangeId: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const estGas = await calculateEstimatedGas(this.contract.collectOceanFee, exchangeId)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
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
   * @param {String} exchangeId ExchangeId
   * @return {String} return exchange owner
   */
  async getExchangeOwner(exchangeId: string): Promise<string> {
    const address = await (await this.getExchange(exchangeId)).exchangeOwner
    return address
  }

  /**
   * Set new market fee, only market fee collector can update it
   * @param {String} exchangeId ExchangeId
   * @param {String} newMarketFee New market fee
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async updateMarketFee<G extends boolean = false>(
    exchangeId: string,
    newMarketFee: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      this.contract.updateMarketFee,
      exchangeId,
      ethers.parseUnits(newMarketFee)
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.updateMarketFee,
      exchangeId,
      ethers.parseUnits(newMarketFee)
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Set new market fee collector, only market fee collector can update it
   * @param {String} exchangeId ExchangeId
   * @param {String} newMarketFeeCollector New market fee collector
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transaction receipt
   */
  public async updateMarketFeeCollector<G extends boolean = false>(
    exchangeId: string,
    newMarketFeeCollector: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const estGas = await calculateEstimatedGas(
      this.contract.updateMarketFeeCollector,
      exchangeId,
      newMarketFeeCollector
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas + 1,
      this.signer,
      this.config?.gasFeeMultiplier,
      this.contract.updateMarketFeeCollector,
      exchangeId,
      newMarketFeeCollector
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
