import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'
import FixedRateExchangeAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import {
  LoggerInstance,
  getFairGasPrice,
  estimateGas,
  ZERO_ADDRESS,
  PriceAndFees,
  SmartContractWithAddress
} from '../..'
import { FeesInfo, FixedPriceExchange } from '../../@types'

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
   * Estimate gas cost for buyDT
   * @param {String} account
   * @param {String} dtAmount datatoken amount we want to buy
   * @param {String} datatokenAddress datatokenAddress
   * @param {String} consumeMarketAddress consumeMarketAddress
   * @param {String} consumeMarketFee fee recieved by the consume market when a dt is bought from a fixed rate exchange, percent
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasBuyDT(
    account: string,
    datatokenAddress: string,
    dtAmount: string,
    maxBaseTokenAmount: string,
    consumeMarketAddress: string,
    consumeMarketFee: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(
      account,
      fixedRate.methods.buyDT,
      datatokenAddress,
      dtAmount,
      maxBaseTokenAmount,
      consumeMarketAddress,
      consumeMarketFee
    )
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
  public async buyDT(
    address: string,
    exchangeId: string,
    datatokenAmount: string,
    maxBaseTokenAmount: string,
    consumeMarketAddress: string = ZERO_ADDRESS,
    consumeMarketFee: string = '0'
  ): Promise<TransactionReceipt> {
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

    const estGas = await estimateGas(
      address,
      this.contract.methods.buyDT,
      exchangeId,
      dtAmountFormatted,
      maxBtFormatted,
      consumeMarketAddress,
      consumeMarketFeeFormatted
    )
    try {
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
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to buy datatokens: ${e.message}`)
      return null
    }
  }

  /**
   * Estimate gas cost for sellDT
   * @param {String} account
   * @param {String} dtAmount datatoken amount we want to sell
   * @param {String} datatokenAddress datatokenAddress
   * @param {String} consumeMarketAddress consumeMarketAddress
   * @param {String} consumeMarketFee consumeMarketFee
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasSellDT(
    account: string,
    datatokenAddress: string,
    dtAmount: string,
    maxBaseTokenAmount: string,
    consumeMarketAddress: string,
    consumeMarketFee: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(
      account,
      fixedRate.methods.sellDT,
      datatokenAddress,
      dtAmount,
      maxBaseTokenAmount,
      consumeMarketAddress,
      consumeMarketFee
    )
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
  public async sellDT(
    address: string,
    exchangeId: string,
    datatokenAmount: string,
    minBaseTokenAmount: string,
    consumeMarketAddress: string = ZERO_ADDRESS,
    consumeMarketFee: string = '0'
  ): Promise<TransactionReceipt> {
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
    const estGas = await estimateGas(
      address,
      this.contract.methods.sellDT,
      exchangeId,
      dtAmountFormatted,
      minBtFormatted,
      consumeMarketAddress,
      consumeMarketFeeFormatted
    )
    try {
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
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to sell datatokens: ${e.message}`)
      return null
    }
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
   * Estimate gas cost for setRate
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {String} newRate New rate
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasSetRate(
    account: string,
    exchangeId: string,
    newRate: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(
      account,
      fixedRate.methods.setRate,
      exchangeId,
      await this.web3.utils.toWei(newRate)
    )
  }

  /**
   * Set new rate
   * @param {String} exchangeId ExchangeId
   * @param {String} newRate New rate
   * @param {String} address User account
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async setRate(
    address: string,
    exchangeId: string,
    newRate: string
  ): Promise<TransactionReceipt> {
    const estGas = await estimateGas(
      address,
      this.contract.methods.setRate,
      exchangeId,
      this.web3.utils.toWei(newRate)
    )
    const trxReceipt = await this.contract.methods
      .setRate(exchangeId, this.web3.utils.toWei(newRate))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    return trxReceipt
  }

  /**
   * Estimate gas cost for setRate
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {String} newAllowedSwapper new allowed swapper address
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasSetAllowedSwapper(
    account: string,
    exchangeId: string,
    newAllowedSwapper: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(
      account,
      fixedRate.methods.setAllowedSwapper,
      exchangeId,
      newAllowedSwapper
    )
  }

  /**
   * Set new rate
   * @param {String} exchangeId ExchangeId
   * @param {String} newAllowedSwapper newAllowedSwapper (set address zero if we want to remove allowed swapper)
   * @param {String} address User account
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async setAllowedSwapper(
    address: string,
    exchangeId: string,
    newAllowedSwapper: string
  ): Promise<TransactionReceipt> {
    const estGas = await estimateGas(
      address,
      this.contract.methods.setAllowedSwapper,
      exchangeId,
      newAllowedSwapper
    )
    const trxReceipt = await this.contract.methods
      .setAllowedSwapper(exchangeId, newAllowedSwapper)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    return trxReceipt
  }

  /**
   * Estimate gas cost for activate
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasActivate(
    account: string,
    exchangeId: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(account, fixedRate.methods.toggleExchangeState, exchangeId)
  }

  /**
   * Activate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async activate(
    address: string,
    exchangeId: string
  ): Promise<TransactionReceipt> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === true) return null
    const estGas = await estimateGas(
      address,
      this.contract.methods.toggleExchangeState,
      exchangeId
    )
    const trxReceipt = await this.contract.methods.toggleExchangeState(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })
    return trxReceipt
  }

  /**
   * Estimate gas cost for deactivate
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasDeactivate(
    account: string,
    exchangeId: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(account, fixedRate.methods.toggleExchangeState, exchangeId)
  }

  /**
   * Deactivate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async deactivate(
    address: string,
    exchangeId: string
  ): Promise<TransactionReceipt> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === false) return null

    const estGas = await estimateGas(
      address,
      this.contract.methods.toggleExchangeState,
      exchangeId
    )

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
    const rate = await this.web3.utils.fromWei(weiRate)
    return rate
  }

  /**
   * Get Datatoken Supply in the exchange
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>}  dt supply formatted
   */
  public async getDTSupply(exchangeId: string): Promise<string> {
    const dtSupply = await this.contract.methods.getDTSupply(exchangeId).call()
    const exchange = await this.getExchange(exchangeId)
    return await this.unitsToAmount(exchange.datatoken, dtSupply, +exchange.dtDecimals)
  }

  /**
   * Get BaseToken Supply in the exchange
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>} dt supply formatted
   */
  public async getBTSupply(exchangeId: string): Promise<string> {
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
   * calcBaseInGivenOutDT - Calculates how many base tokens are needed to get specified amount of datatokens
   * @param {String} exchangeId ExchangeId
   * @param {string} datatokenAmount Amount of datatokens user wants to buy
   * @param {String} consumeMarketFee consumeMarketFee in fraction
   * @return {Promise<PriceAndFees>} how many base tokens are needed and fees
   */
  public async calcBaseInGivenOutDT(
    exchangeId: string,
    datatokenAmount: string,
    consumeMarketFee: string = '0'
  ): Promise<PriceAndFees> {
    const fixedRateExchange = await this.getExchange(exchangeId)
    const result = await this.contract.methods
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
        result.baseTokenAmount,
        +fixedRateExchange.btDecimals
      ),
      marketFeeAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        result.marketFeeAmount,
        +fixedRateExchange.btDecimals
      ),
      oceanFeeAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        result.oceanFeeAmount,
        +fixedRateExchange.btDecimals
      ),
      consumeMarketFeeAmount: await this.unitsToAmount(
        fixedRateExchange.baseToken,
        result.consumeMarketFeeAmount,
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
  public async getAmountBTOut(
    exchangeId: string,
    datatokenAmount: string,
    consumeMarketFee: string = '0'
  ): Promise<string> {
    const exchange = await this.getExchange(exchangeId)
    const result = await this.contract.methods
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

    return await this.unitsToAmount(exchange.baseToken, result[0], +exchange.btDecimals)
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
    result.dtDecimals = result.dtDecimals.toString()
    result.btDecimals = result.btDecimals.toString()
    result.dtBalance = await this.unitsToAmount(
      result.datatoken,
      result.dtBalance,
      +result.dtDecimals
    )
    result.btBalance = await this.unitsToAmount(
      result.baseToken,
      result.btBalance,
      +result.btDecimals
    )
    result.dtSupply = await this.unitsToAmount(
      result.datatoken,
      result.dtSupply,
      +result.dtDecimals
    )
    result.btSupply = await this.unitsToAmount(
      result.baseToken,
      result.btSupply,
      +result.btDecimals
    )
    result.fixedRate = this.web3.utils.fromWei(result.fixedRate)
    result.exchangeId = exchangeId
    return result
  }

  /**
   * Get fee details for an exchange
   * @param {String} exchangeId ExchangeId
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async getFeesInfo(exchangeId: string): Promise<FeesInfo> {
    const result: FeesInfo = await this.contract.methods.getFeesInfo(exchangeId).call()
    result.opcFee = this.web3.utils.fromWei(result.opcFee.toString())
    result.marketFee = this.web3.utils.fromWei(result.marketFee.toString())

    const exchange = await this.getExchange(exchangeId)
    result.marketFeeAvailable = await this.unitsToAmount(
      exchange.baseToken,
      result.marketFeeAvailable,
      +exchange.btDecimals
    )
    result.oceanFeeAvailable = await this.unitsToAmount(
      exchange.baseToken,
      result.oceanFeeAvailable,
      +exchange.btDecimals
    )

    result.exchangeId = exchangeId
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
   * Estimate gas cost for activate
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasActivateMint(
    account: string,
    exchangeId: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(account, fixedRate.methods.toggleMintState, exchangeId, true)
  }

  /**
   * Activate minting option for fixed rate contract
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async activateMint(
    address: string,
    exchangeId: string
  ): Promise<TransactionReceipt> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.withMint === true) return null

    const estGas = await estimateGas(
      address,
      this.contract.methods.toggleMintState,
      exchangeId,
      true
    )
    const trxReceipt = await this.contract.methods
      .toggleMintState(exchangeId, true)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    return trxReceipt
  }

  /**
   * Estimate gas cost for deactivate
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasDeactivateMint(
    account: string,
    exchangeId: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(
      account,
      fixedRate.methods.toggleMintState(exchangeId, false),
      exchangeId,
      false
    )
  }

  /**
   * Deactivate minting for fixed rate
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async deactivateMint(
    address: string,
    exchangeId: string
  ): Promise<TransactionReceipt> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.withMint === false) return null

    const estGas = await estimateGas(
      address,
      this.contract.methods.toggleMintState,
      exchangeId,
      false
    )

    const trxReceipt = await this.contract.methods
      .toggleMintState(exchangeId, false)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for collectBT
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {String} amount amount to be collected
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasCollectBT(
    account: string,
    exchangeId: string,
    amount: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract
    const fixedrate: FixedPriceExchange = await this.contract.methods
      .getExchange(exchangeId)
      .call()
    const amountWei = await this.amountToUnits(
      fixedrate.baseToken,
      amount,
      +fixedrate.btDecimals
    )
    return estimateGas(account, fixedRate.methods.collectBT, exchangeId, amountWei)
  }

  /**
   * Collect BaseTokens in the contract (anyone can call this, funds are sent to erc20.paymentCollector)
   * @param {String} address User address
   * @param {String} exchangeId ExchangeId
   * @param {String} amount amount to be collected
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async collectBT(
    address: string,
    exchangeId: string,
    amount: string
  ): Promise<TransactionReceipt> {
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

    const estGas = await estimateGas(
      address,
      this.contract.methods.collectBT,
      exchangeId,
      amountWei
    )

    const trxReceipt = await this.contract.methods.collectBT(exchangeId, amountWei).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })
    return trxReceipt
  }

  /**
   * Estimate gas cost for collecDT
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {String} amount amount to be collected
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasCollectDT(
    account: string,
    exchangeId: string,
    amount: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract
    const fixedrate: FixedPriceExchange = await this.contract.methods
      .getExchange(exchangeId)
      .call()

    const amountWei = await this.amountToUnits(
      fixedrate.datatoken,
      amount,
      +fixedrate.dtDecimals
    )
    return estimateGas(account, fixedRate.methods.collectDT, exchangeId, amountWei)
  }

  /**
   * Collect datatokens in the contract (anyone can call this, funds are sent to erc20.paymentCollector)
   * @param {String} address User address
   * @param {String} exchangeId ExchangeId
   * @param {String} amount amount to be collected
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async collectDT(
    address: string,
    exchangeId: string,
    amount: string
  ): Promise<TransactionReceipt> {
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

    const estGas = await estimateGas(
      address,
      this.contract.methods.collectDT,
      exchangeId,
      amountWei
    )

    const trxReceipt = await this.contract.methods.collectDT(exchangeId, amountWei).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })
    return trxReceipt
  }

  /**
   * Estimate gas cost for collecMarketFee
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasCollectMarketFee(
    account: string,
    exchangeId: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(account, fixedRate.methods.collectMarketFee, exchangeId)
  }

  /**
   * Collect market fee and send it to marketFeeCollector (anyone can call it)
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async collectMarketFee(
    address: string,
    exchangeId: string
  ): Promise<TransactionReceipt> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const estGas = await estimateGas(
      address,
      this.contract.methods.collectMarketFee,
      exchangeId
    )
    const trxReceipt = await this.contract.methods.collectMarketFee(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })
    return trxReceipt
  }

  /**
   * Estimate gas cost for collectOceanFee
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasCollectOceanFee(
    account: string,
    exchangeId: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(account, fixedRate.methods.collectMarketFee, exchangeId)
  }

  /**
   * Collect ocean fee and send it to OPF collector (anyone can call it)
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async collectOceanFee(
    address: string,
    exchangeId: string
  ): Promise<TransactionReceipt> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null

    const estGas = await estimateGas(
      address,
      this.contract.methods.collectOceanFee,
      exchangeId
    )
    const trxReceipt = await this.contract.methods.collectOceanFee(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })
    return trxReceipt
  }

  /**
   * Get OPF Collector of fixed rate contract
   * @return {String}
   */
  async getOPCCollector(): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.opcCollector().call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get OPC Collector address: ${e.message}`)
    }
    return result
  }

  /**
   * Get Router address set in fixed rate contract
   * @return {String}
   */
  async getRouter(): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.router().call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get Router address: ${e.message}`)
    }
    return result
  }

  /**
   * Get Exchange Owner given an exchangeId
   * @param {String} exchangeId ExchangeId
   * @return {String} return exchange owner
   */
  async getExchangeOwner(exchangeId: string): Promise<string> {
    let result = null
    try {
      result = await (await this.getExchange(exchangeId)).exchangeOwner
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get OPF Collector address: ${e.message}`)
    }
    return result
  }

  /**
   * Estimate gas cost for updateMarketFee
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {String} newMarketFee New market fee
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasUpdateMarketFee(
    account: string,
    exchangeId: string,
    newMarketFee: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(
      account,
      fixedRate.methods.updateMarketFee,
      exchangeId,
      newMarketFee
    )
  }

  /**
   * Set new market fee, only market fee collector can update it
   * @param {String} address user address
   * @param {String} exchangeId ExchangeId
   * @param {String} newMarketFee New market fee
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async updateMarketFee(
    address: string,
    exchangeId: string,
    newMarketFee: string
  ): Promise<TransactionReceipt> {
    const estGas = await estimateGas(
      address,
      this.contract.methods.updateMarketFee,
      exchangeId,
      this.web3.utils.toWei(newMarketFee)
    )
    const trxReceipt = await this.contract.methods
      .updateMarketFee(exchangeId, this.web3.utils.toWei(newMarketFee))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    return trxReceipt
  }

  /**
   * Estimate gas cost for updateMarketFeeCollector
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {String} newMarketFee New market fee collector
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGasUpdateMarketFeeCollector(
    account: string,
    exchangeId: string,
    newMarketFeeCollector: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate = contractInstance || this.contract

    return estimateGas(
      account,
      fixedRate.methods.updateMarketFeeCollector,
      exchangeId,
      newMarketFeeCollector
    )
  }

  /**
   * Set new market fee collector, only market fee collector can update it
   * @param {String} address user address
   * @param {String} exchangeId ExchangeId
   * @param {String} newMarketFeeCollector New market fee collector
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async updateMarketFeeCollector(
    address: string,
    exchangeId: string,
    newMarketFeeCollector: string
  ): Promise<TransactionReceipt> {
    const estGas = await estimateGas(
      address,
      this.contract.methods.updateMarketFeeCollector,
      exchangeId,
      newMarketFeeCollector
    )
    const trxReceipt = await this.contract.methods
      .updateMarketFeeCollector(exchangeId, newMarketFeeCollector)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    return trxReceipt
  }
}
