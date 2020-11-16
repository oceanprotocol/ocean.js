import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { TransactionReceipt, Log } from 'web3-core'
import { Pool } from './Pool'
import { EventData, Filter } from 'web3-eth-contract'
import BigNumber from 'bignumber.js'
import { SubscribablePromise, Logger, didNoZeroX, didPrefixed } from '../utils'

declare type PoolTransactionType = 'swap' | 'join' | 'exit'

const POOL_MAX_AMOUNT_IN_LIMIT = 0.25 // maximum 1/4 of the pool reserve
const POOL_MAX_AMOUNT_OUT_LIMIT = 0.25 // maximum 1/4 of the pool reserve
const BPFACTORY_DEPLOY_BLOCK = 0
const MAX_AWAIT_PROMISES = 10 // infura has a limit of 10 requests/sec
export interface PoolDetails {
  poolAddress: string
  tokens: string[]
}

export interface PoolShare {
  poolAddress: string
  shares: string
  did: string
}

export interface TokensReceived {
  dtAmount: string
  oceanAmount: string
}

export interface PoolTransaction {
  poolAddress: string
  dtAddress: string
  caller: string
  transactionHash: string
  blockNumber: number
  timestamp: number
  tokenIn?: string
  tokenOut?: string
  tokenAmountIn?: string
  tokenAmountOut?: string
  type: PoolTransactionType
}

export enum PoolCreateProgressStep {
  CreatingPool,
  ApprovingDatatoken,
  ApprovingOcean,
  SetupPool
}

/**
 * Ocean Pools submodule exposed under ocean.pool
 */
export class OceanPool extends Pool {
  public oceanAddress: string = null
  public dtAddress: string = null
  public startBlock: number

  constructor(
    web3: Web3,
    logger: Logger,
    factoryABI: AbiItem | AbiItem[] = null,
    poolABI: AbiItem | AbiItem[] = null,
    factoryAddress: string = null,
    oceanAddress: string = null,
    startBlock?: number
  ) {
    super(web3, logger, factoryABI, poolABI, factoryAddress)
    if (oceanAddress) {
      this.oceanAddress = oceanAddress
    }
    if (startBlock) this.startBlock = startBlock
    else this.startBlock = 0
  }

  /**
     * Create DataToken pool
     @param {String} account
     * @param {String} dtAddress  DataToken address
     * @param {String} dtAmount DataToken amount
     * @param {String} dtWeight DataToken weight
     * @param {String} oceanAmount Ocean amount
     * @param {String} fee Swap fee. E.g. to get a 0.1% swapFee use `0.001`. The maximum allowed swapFee is `0.1` (10%).
     * @return {String}
     */
  public create(
    account: string,
    dtAddress: string,
    dtAmount: string,
    dtWeight: string,
    oceanAmount: string,
    fee: string
  ): SubscribablePromise<PoolCreateProgressStep, TransactionReceipt> {
    if (this.oceanAddress == null) {
      this.logger.error('ERROR: oceanAddress is not defined')
      return null
    }
    if (parseFloat(fee) > 0.1) {
      this.logger.error('ERROR: Swap fee too high. The maximum allowed swapFee is 10%')
      return null
    }
    if (parseFloat(dtAmount) < 2) {
      this.logger.error('ERROR: Amount of DT is too low')
      return null
    }
    if (parseFloat(dtWeight) > 9 || parseFloat(dtWeight) < 1) {
      this.logger.error('ERROR: Weight out of bounds (min 1, max9)')
      return null
    }
    return new SubscribablePromise(async (observer) => {
      observer.next(PoolCreateProgressStep.CreatingPool)
      const createTxid = await super.createPool(account)
      if (!createTxid) {
        this.logger.error('ERROR: Failed to call approve DT token')
        return null
      }
      const address = createTxid.events.BPoolRegistered.returnValues[0]
      const oceanWeight = 10 - parseFloat(dtWeight)
      this.dtAddress = dtAddress
      observer.next(PoolCreateProgressStep.ApprovingDatatoken)
      let txid
      txid = await this.approve(
        account,
        dtAddress,
        address,
        this.web3.utils.toWei(String(dtAmount))
      )
      if (!txid) {
        this.logger.error('ERROR: Failed to call approve DT token')
        return null
      }
      observer.next(PoolCreateProgressStep.ApprovingOcean)
      txid = await this.approve(
        account,
        this.oceanAddress,
        address,
        this.web3.utils.toWei(String(oceanAmount))
      )
      if (!txid) {
        this.logger.error('ERROR: Failed to call approve OCEAN token')
        return null
      }
      observer.next(PoolCreateProgressStep.SetupPool)
      txid = await super.setup(
        account,
        address,
        dtAddress,
        this.web3.utils.toWei(String(dtAmount)),
        this.web3.utils.toWei(String(dtWeight)),
        this.oceanAddress,
        this.web3.utils.toWei(String(oceanAmount)),
        this.web3.utils.toWei(String(oceanWeight)),
        this.web3.utils.toWei(fee)
      )
      if (!txid) {
        this.logger.error('ERROR: Failed to create a new pool')
        return null
      }
      return createTxid
    })
  }

  /**
   * Get DataToken address of token in this pool
   * @param {String} account
   * @param {String} poolAddress
   * @return {string}
   */
  public async getDTAddress(poolAddress: string): Promise<string> {
    this.dtAddress = null
    const tokens = await this.getCurrentTokens(poolAddress)
    let token: string

    if (tokens != null)
      for (token of tokens) {
        // TODO: Potential timing attack, left side: true
        if (token !== this.oceanAddress) this.dtAddress = token
      }
    return this.dtAddress
  }

  /**
   * Get Ocean Token balance of a pool
   * @param {String} poolAddress
   * @return {String}
   */
  public async getOceanReserve(poolAddress: string): Promise<string> {
    if (this.oceanAddress == null) {
      this.logger.error('ERROR: oceanAddress is not defined')
      return null
    }
    return super.getReserve(poolAddress, this.oceanAddress)
  }

  /**
   * Get datatoken balance of a pool
   * @param {String} poolAddress
   * @return {String}
   */
  public async getDTReserve(poolAddress: string): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    return super.getReserve(poolAddress, dtAddress)
  }

  /**
   * Returns max amount that you can buy.
   * @param poolAddress
   * @param tokenAddress
   */
  public async getMaxBuyQuantity(
    poolAddress: string,
    tokenAddress: string
  ): Promise<string> {
    const balance = await super.getReserve(poolAddress, tokenAddress)
    return String(parseFloat(balance) / 3)
  }

  /**
   * Returns max amount of OCEAN that you can buy.
   * @param poolAddress
   * @param tokenAddress
   */
  public async getOceanMaxBuyQuantity(poolAddress: string): Promise<string> {
    return this.getMaxBuyQuantity(poolAddress, this.oceanAddress)
  }

  /**
   * Returns max amount of DT that you can buy.
   * @param poolAddress
   * @param tokenAddress
   */
  public async getDTMaxBuyQuantity(poolAddress: string): Promise<string> {
    return this.getMaxBuyQuantity(poolAddress, await this.getDTAddress(poolAddress))
  }

  /**
   * Returns tokenInAmount required to get tokenOutAmount
   * @param poolAddress
   * @param tokenInAddress
   * @param tokenOutAddress
   * @param tokenOutAmount
   */
  public async calcInGivenOut(
    poolAddress: string,
    tokenInAddress: string,
    tokenOutAddress: string,
    tokenOutAmount: string
  ): Promise<string> {
    const result = await super.calcInGivenOut(
      poolAddress,
      await super.getReserve(poolAddress, tokenInAddress),
      await super.getDenormalizedWeight(poolAddress, tokenInAddress),
      await super.getReserve(poolAddress, tokenOutAddress),
      await super.getDenormalizedWeight(poolAddress, tokenOutAddress),
      tokenOutAmount,
      await this.getSwapFee(poolAddress)
    )

    return result
  }

  /**
   * Returns tokenOutAmount given tokenInAmount
   * @param poolAddress
   * @param tokenInAddress
   * @param tokenOutAddress
   * @param tokenInAmount
   */
  public async calcOutGivenIn(
    poolAddress: string,
    tokenInAddress: string,
    tokenOutAddress: string,
    tokenInAmount: string
  ): Promise<string> {
    const result = await super.calcOutGivenIn(
      poolAddress,
      await super.getReserve(poolAddress, tokenInAddress),
      await super.getDenormalizedWeight(poolAddress, tokenInAddress),
      await super.getReserve(poolAddress, tokenOutAddress),
      await super.getDenormalizedWeight(poolAddress, tokenOutAddress),
      tokenInAmount,
      await super.getSwapFee(poolAddress)
    )

    return result
  }

  /**
   * Returns no of shares receved for adding a token to the pool
   * @param poolAddress
   * @param tokenInAddress
   * @param tokenInAmount
   */
  public async calcPoolOutGivenSingleIn(
    poolAddress: string,
    tokenInAddress: string,
    tokenInAmount: string
  ): Promise<string> {
    const result = super.calcPoolOutGivenSingleIn(
      poolAddress,
      await super.getReserve(poolAddress, tokenInAddress),
      await super.getDenormalizedWeight(poolAddress, tokenInAddress),
      await super.getPoolSharesTotalSupply(poolAddress),
      await super.getTotalDenormalizedWeight(poolAddress),
      tokenInAmount,
      await super.getSwapFee(poolAddress)
    )
    return result
  }

  /**
   * Returns no of tokens required to get a specific no of poolShares
   * @param poolAddress
   * @param tokenInAddress
   * @param poolShares
   */
  public async calcSingleInGivenPoolOut(
    poolAddress: string,
    tokenInAddress: string,
    poolShares: string
  ): Promise<string> {
    const result = super.calcSingleInGivenPoolOut(
      poolAddress,
      await super.getReserve(poolAddress, tokenInAddress),
      await super.getDenormalizedWeight(poolAddress, tokenInAddress),
      await super.getPoolSharesTotalSupply(poolAddress),
      await super.getTotalDenormalizedWeight(poolAddress),
      poolShares,
      await super.getSwapFee(poolAddress)
    )
    return result
  }

  /**
   * Returns no of tokens received for spending a specific no of poolShares
   * @param poolAddress
   * @param tokenOutAddress
   * @param poolShares
   */
  public async calcSingleOutGivenPoolIn(
    poolAddress: string,
    tokenOutAddress: string,
    poolShares: string
  ): Promise<string> {
    const result = super.calcSingleOutGivenPoolIn(
      poolAddress,
      await super.getReserve(poolAddress, tokenOutAddress),
      await super.getDenormalizedWeight(poolAddress, tokenOutAddress),
      await super.getPoolSharesTotalSupply(poolAddress),
      await super.getTotalDenormalizedWeight(poolAddress),
      poolShares,
      await super.getSwapFee(poolAddress)
    )
    return result
  }

  /**
   * Returns no of pool shares required to  receive a specified amount of tokens
   * @param poolAddress
   * @param tokenOutAddress
   * @param tokenOutAmount
   */
  public async calcPoolInGivenSingleOut(
    poolAddress: string,
    tokenOutAddress: string,
    tokenOutAmount: string
  ): Promise<string> {
    const result = super.calcPoolInGivenSingleOut(
      poolAddress,
      await super.getReserve(poolAddress, tokenOutAddress),
      await super.getDenormalizedWeight(poolAddress, tokenOutAddress),
      await super.getPoolSharesTotalSupply(poolAddress),
      await super.getTotalDenormalizedWeight(poolAddress),
      tokenOutAmount,
      await super.getSwapFee(poolAddress)
    )
    return result
  }

  /**
   * Returns no of pool shares required to  receive specified amount of DT
   * @param poolAddress
   * @param dtAmount
   */
  public async getPoolSharesRequiredToRemoveDT(
    poolAddress: string,
    dtAmount: string
  ): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    return this.calcPoolInGivenSingleOut(poolAddress, dtAddress, dtAmount)
  }

  /**
   * Returns DT amnount received after spending poolShares
   * @param poolAddress
   * @param poolShares
   */
  public async getDTRemovedforPoolShares(
    poolAddress: string,
    poolShares: string
  ): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    return this.calcSingleOutGivenPoolIn(poolAddress, dtAddress, poolShares)
  }

  /**
   * Returns no of pool shares required to  receive specified amount of DT
   * @param poolAddress
   * @param dtAmount
   */
  public async getPoolSharesRequiredToRemoveOcean(
    poolAddress: string,
    oceanAmount: string
  ): Promise<string> {
    return this.calcPoolInGivenSingleOut(poolAddress, this.oceanAddress, oceanAmount)
  }

  /**
   * Returns Ocean amnount received after spending poolShares
   * @param poolAddress
   * @param poolShares
   */
  public async getOceanRemovedforPoolShares(
    poolAddress: string,
    poolShares: string
  ): Promise<string> {
    return this.calcSingleOutGivenPoolIn(poolAddress, this.oceanAddress, poolShares)
  }

  /**
   * Returns Datatoken & Ocean amounts received after spending poolShares
   * @param {String} poolAddress
   * @param {String} poolShares
   * @return {TokensReceived}
   */
  public async getTokensRemovedforPoolShares(
    poolAddress: string,
    poolShares: string
  ): Promise<TokensReceived> {
    try {
      const totalPoolTokens = await this.getPoolSharesTotalSupply(poolAddress)
      const dtReserve = await this.getDTReserve(poolAddress)
      const oceanReserve = await this.getOceanReserve(poolAddress)

      const dtAmount = `${
        (Number(poolShares) / Number(totalPoolTokens)) * Number(dtReserve)
      }`
      const oceanAmount = `${
        (Number(poolShares) / Number(totalPoolTokens)) * Number(oceanReserve)
      }`

      return { dtAmount, oceanAmount }
    } catch (e) {
      this.logger.error(`ERROR: Unable to get token info. ${e.message}`)
    }
  }

  /**
   * Returns max DT amount that you can add to the pool
   * @param poolAddress
   */
  public async getDTMaxAddLiquidity(poolAddress: string): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    return this.getMaxAddLiquidity(poolAddress, dtAddress)
  }

  /**
   * Returns max Ocean amount that you can add to the pool
   * @param poolAddress
   */
  public async getOceanMaxAddLiquidity(poolAddress: string): Promise<string> {
    return this.getMaxAddLiquidity(poolAddress, this.oceanAddress)
  }

  /**
   * Returns max amount of tokens that you can add to the pool
   * @param poolAddress
   * @param tokenAddress
   */
  public async getMaxAddLiquidity(
    poolAddress: string,
    tokenAddress: string
  ): Promise<string> {
    const balance = await super.getReserve(poolAddress, tokenAddress)
    if (parseFloat(balance) > 0) {
      const result = new BigNumber(this.web3.utils.toWei(balance))
        .multipliedBy(POOL_MAX_AMOUNT_IN_LIMIT)
        .integerValue(BigNumber.ROUND_DOWN)
        .minus(1)
      return this.web3.utils.fromWei(result.toString(10))
    } else return '0'
  }

  /**
   * Returns max amount of tokens that you can withdraw from the pool
   * @param poolAddress
   * @param tokenAddress
   */
  public async getMaxRemoveLiquidity(
    poolAddress: string,
    tokenAddress: string
  ): Promise<string> {
    const balance = await super.getReserve(poolAddress, tokenAddress)
    if (parseFloat(balance) > 0) {
      const result = new BigNumber(this.web3.utils.toWei(balance))
        .multipliedBy(POOL_MAX_AMOUNT_OUT_LIMIT)
        .integerValue(BigNumber.ROUND_DOWN)
        .minus(1)
      return this.web3.utils.fromWei(result.toString(10))
    } else return '0'
  }

  /**
   * Returns max amount of DT that you can withdraw from the pool
   * @param poolAddress
   * @param tokenAddress
   */
  public async getDTMaxRemoveLiquidity(poolAddress: string): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    return this.getMaxRemoveLiquidity(poolAddress, dtAddress)
  }

  /**
   * Returns max amount of Ocean that you can withdraw from the pool
   * @param poolAddress
   * @param tokenAddress
   */
  public async getOceanMaxRemoveLiquidity(poolAddress: string): Promise<string> {
    return this.getMaxRemoveLiquidity(poolAddress, this.oceanAddress)
  }

  /**
   * Buy datatoken from a pool
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount  datatoken amount
   * @param {String} oceanAmount  Ocean Token amount payed
   * @param {String} maxPrice  Maximum price to pay
   * @return {TransactionReceipt}
   */
  public async buyDT(
    account: string,
    poolAddress: string,
    dtAmountWanted: string,
    maxOceanAmount: string,
    maxPrice?: string
  ): Promise<TransactionReceipt> {
    if (this.oceanAddress == null) {
      this.logger.error('ERROR: undefined ocean token contract address')
      return null
    }
    const dtAddress = await this.getDTAddress(poolAddress)
    if (
      parseFloat(dtAmountWanted) > parseFloat(await this.getDTMaxBuyQuantity(poolAddress))
    ) {
      this.logger.error('ERROR: Buy quantity exceeds quantity allowed')
      return null
    }
    const calcInGivenOut = await this.getOceanNeeded(poolAddress, dtAmountWanted)

    if (parseFloat(calcInGivenOut) > parseFloat(maxOceanAmount)) {
      this.logger.error('ERROR: Not enough Ocean Tokens')
      return null
    }
    // TODO - check balances first
    const txid = await super.approve(
      account,
      this.oceanAddress,
      poolAddress,
      this.web3.utils.toWei(maxOceanAmount)
    )
    if (!txid) {
      this.logger.error('ERROR: OCEAN approve failed')
      return null
    }
    const tx = await this.swapExactAmountOut(
      account,
      poolAddress,
      this.oceanAddress,
      maxOceanAmount,
      dtAddress,
      dtAmountWanted,
      maxPrice
    )
    return tx
  }

  /**
   * Buy at least datatoken from a pool for a fixed Ocean amount
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount  datatoken amount
   * @param {String} oceanAmount  Ocean Token amount payed
   * @param {String} maxPrice  Maximum price to pay
   * @return {TransactionReceipt}
   */
  public async buyDTWithExactOcean(
    account: string,
    poolAddress: string,
    minimumdtAmountWanted: string,
    OceanAmount: string,
    maxPrice?: string
  ): Promise<TransactionReceipt> {
    if (this.oceanAddress == null) {
      this.logger.error('ERROR: undefined ocean token contract address')
      return null
    }
    const dtAddress = await this.getDTAddress(poolAddress)
    if (
      parseFloat(minimumdtAmountWanted) >
      parseFloat(await this.getDTMaxBuyQuantity(poolAddress))
    ) {
      this.logger.error('ERROR: Buy quantity exceeds quantity allowed')
      return null
    }
    const calcInGivenOut = await this.getOceanNeeded(poolAddress, minimumdtAmountWanted)

    if (parseFloat(calcInGivenOut) > parseFloat(OceanAmount)) {
      this.logger.error('ERROR: Not enough Ocean Tokens')
      return null
    }
    // TODO - check balances first
    const txid = await super.approve(
      account,
      this.oceanAddress,
      poolAddress,
      this.web3.utils.toWei(OceanAmount)
    )
    if (!txid) {
      this.logger.error('ERROR: OCEAN approve failed')
      return null
    }
    const tx = this.swapExactAmountIn(
      account,
      poolAddress,
      this.oceanAddress,
      OceanAmount,
      dtAddress,
      minimumdtAmountWanted,
      maxPrice
    )
    return tx
  }

  /**
   * Sell a specific amount of datatoken to get some ocean tokens
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount  datatoken amount to be sold
   * @param {String} oceanAmount  Ocean Token amount expected
   * @param {String} maxPrice  Minimum price to sell
   * @return {TransactionReceipt}
   */
  public async sellDT(
    account: string,
    poolAddress: string,
    dtAmount: string,
    oceanAmountWanted: string,
    maxPrice?: string
  ): Promise<TransactionReceipt> {
    if (this.oceanAddress == null) {
      this.logger.error('ERROR: oceanAddress is not defined')
      return null
    }
    const dtAddress = await this.getDTAddress(poolAddress)
    if (
      parseFloat(oceanAmountWanted) >
      parseFloat(await this.getOceanMaxBuyQuantity(poolAddress))
    ) {
      this.logger.error('ERROR: Buy quantity exceeds quantity allowed')
      return null
    }
    const calcOutGivenIn = await this.getOceanReceived(poolAddress, dtAmount)

    if (parseFloat(calcOutGivenIn) < parseFloat(oceanAmountWanted)) {
      this.logger.error('ERROR: Not enough datatokens')
      return null
    }
    const txid = await super.approve(
      account,
      dtAddress,
      poolAddress,
      this.web3.utils.toWei(dtAmount)
    )
    if (!txid) {
      this.logger.error('ERROR: DT approve failed')
      return null
    }
    const tx = this.swapExactAmountIn(
      account,
      poolAddress,
      dtAddress,
      dtAmount,
      this.oceanAddress,
      oceanAmountWanted,
      maxPrice
    )
    return tx
  }

  /**
   * Add datatoken amount to pool liquidity
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount datatoken amount
   * @return {TransactionReceipt}
   */
  public async addDTLiquidity(
    account: string,
    poolAddress: string,
    amount: string
  ): Promise<TransactionReceipt> {
    const dtAddress = await this.getDTAddress(poolAddress)
    const maxAmount = await this.getMaxAddLiquidity(poolAddress, dtAddress)
    if (parseFloat(amount) > parseFloat(maxAmount)) {
      this.logger.error('ERROR: Too much reserve to add')
      return null
    }
    const txid = await super.approve(
      account,
      dtAddress,
      poolAddress,
      this.web3.utils.toWei(amount)
    )
    if (!txid) {
      this.logger.error('ERROR: DT approve failed')
      return null
    }
    const result = await super.joinswapExternAmountIn(
      account,
      poolAddress,
      dtAddress,
      amount,
      '0'
    )
    return result
  }

  /**
   * Remove datatoken amount from pool liquidity
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount datatoken amount
   * @return {TransactionReceipt}
   */
  public async removeDTLiquidity(
    account: string,
    poolAddress: string,
    amount: string,
    maximumPoolShares: string
  ): Promise<TransactionReceipt> {
    const dtAddress = await this.getDTAddress(poolAddress)
    const maxAmount = await this.getDTMaxRemoveLiquidity(poolAddress)
    if (parseFloat(amount) > parseFloat(maxAmount)) {
      this.logger.error('ERROR: Too much reserve to remove')
      return null
    }
    const usershares = await this.sharesBalance(account, poolAddress)
    if (parseFloat(usershares) < parseFloat(maximumPoolShares)) {
      this.logger.error('ERROR: Not enough poolShares')
      return null
    }
    const sharesRequired = await this.getPoolSharesRequiredToRemoveDT(poolAddress, amount)
    if (parseFloat(maximumPoolShares) < parseFloat(sharesRequired)) {
      this.logger.error('ERROR: Not enough poolShares')
      return null
    }
    // Balancer bug fix
    if (parseFloat(maximumPoolShares) < parseFloat(sharesRequired))
      maximumPoolShares = String(parseFloat(maximumPoolShares) * 0.9999)
    // Balance bug fix
    return this.exitswapExternAmountOut(
      account,
      poolAddress,
      dtAddress,
      amount,
      maximumPoolShares
    )
  }

  /**
   * Add Ocean Token amount to pool liquidity
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount Ocean Token amount in OCEAN
   * @return {TransactionReceipt}
   */
  public async addOceanLiquidity(
    account: string,
    poolAddress: string,
    amount: string
  ): Promise<TransactionReceipt> {
    if (this.oceanAddress == null) {
      this.logger.error('ERROR: oceanAddress is not defined')
      return null
    }
    const maxAmount = await this.getOceanMaxAddLiquidity(poolAddress)
    if (parseFloat(amount) > parseFloat(maxAmount)) {
      this.logger.error('ERROR: Too much reserve to add')
      return null
    }
    const txid = await super.approve(
      account,
      this.oceanAddress,
      poolAddress,
      this.web3.utils.toWei(amount)
    )
    if (!txid) {
      this.logger.error('ERROR: OCEAN approve failed')
      return null
    }
    const result = await super.joinswapExternAmountIn(
      account,
      poolAddress,
      this.oceanAddress,
      amount,
      '0'
    )
    return result
  }

  /**
   * Remove Ocean Token amount from pool liquidity
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount Ocean Token amount in OCEAN
   * @return {TransactionReceipt}
   */
  public async removeOceanLiquidity(
    account: string,
    poolAddress: string,
    amount: string,
    maximumPoolShares: string
  ): Promise<TransactionReceipt> {
    if (this.oceanAddress == null) {
      this.logger.error('ERROR: oceanAddress is not defined')
      return null
    }
    const maxAmount = await this.getOceanMaxRemoveLiquidity(poolAddress)
    if (parseFloat(amount) > parseFloat(maxAmount)) {
      this.logger.error('ERROR: Too much reserve to remove')
      return null
    }
    const usershares = await this.sharesBalance(account, poolAddress)
    if (parseFloat(usershares) < parseFloat(maximumPoolShares)) {
      this.logger.error('ERROR: Not enough poolShares')
      return null
    }
    const sharesRequired = await this.getPoolSharesRequiredToRemoveOcean(
      poolAddress,
      amount
    )
    if (parseFloat(maximumPoolShares) < parseFloat(sharesRequired)) {
      this.logger.error('ERROR: Not enough poolShares')
      return null
    }
    // Balancer bug fix
    if (parseFloat(maximumPoolShares) < parseFloat(sharesRequired))
      maximumPoolShares = String(parseFloat(maximumPoolShares) * 0.9999)
    // Balance bug fix
    return super.exitswapExternAmountOut(
      account,
      poolAddress,
      this.oceanAddress,
      amount,
      maximumPoolShares
    )
  }

  /**
   * Remove pool liquidity
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} poolShares
   * @param {String} minDT Minimum DT expected (defaults 0)
   * @param {String} poolShares Minim Ocean expected (defaults 0)
   * @return {TransactionReceipt}
   */
  public async removePoolLiquidity(
    account: string,
    poolAddress: string,
    poolShares: string,
    minDT = '0',
    minOcean = '0'
  ): Promise<TransactionReceipt> {
    const usershares = await this.sharesBalance(account, poolAddress)
    if (parseFloat(usershares) < parseFloat(poolShares)) {
      this.logger.error('ERROR: Not enough poolShares')
      return null
    }
    // Balancer bug fix
    if (parseFloat(usershares) === parseFloat(poolShares))
      poolShares = String(parseFloat(poolShares) * 0.9999)
    // Balance bug fix
    return this.exitPool(account, poolAddress, poolShares, [minDT, minOcean])
  }

  /**
   * Get datatoken price from pool
   * @param {String} poolAddress
   * @return {String}
   */
  public async getDTPrice(poolAddress: string): Promise<string> {
    if (this.oceanAddress == null) {
      this.logger.error('ERROR: oceanAddress is not defined')
      return '0'
    }
    return this.getOceanNeeded(poolAddress, '1')
  }

  /**
   * Search all pools that have datatoken in their composition
   * @param {String} dtAddress
   * @return {String[]}
   */
  public async searchPoolforDT(dtAddress: string): Promise<string[]> {
    const result: string[] = []
    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress)
    const events = await factory.getPastEvents('BPoolRegistered', {
      filter: {},
      fromBlock: this.startBlock,
      toBlock: 'latest'
    })
    events.sort((a, b) => (a.blockNumber > b.blockNumber ? 1 : -1))
    for (let i = 0; i < events.length; i++) {
      const constituents = await super.getCurrentTokens(events[i].returnValues[0])
      if (constituents.includes(dtAddress)) result.push(events[i].returnValues[0])
    }
    return result
  }

  public async getOceanNeeded(poolAddress: string, dtRequired: string): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    if (
      parseFloat(dtRequired) > parseFloat(await this.getDTMaxBuyQuantity(poolAddress))
    ) {
      return '0'
    }
    return this.calcInGivenOut(poolAddress, this.oceanAddress, dtAddress, dtRequired)
  }

  /**
   * Calculate how many Ocean Tokens are you going to receive for selling a specific dtAmount (selling DT)
   * @param {String} poolAddress
   * @param {String} dtAmount
   * @return {String[]} - amount of ocean tokens received
   */
  public async getOceanReceived(poolAddress: string, dtAmount: string): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    return this.calcOutGivenIn(poolAddress, dtAddress, this.oceanAddress, dtAmount)
  }

  /**
   * Calculate how many data token are you going to receive for selling a specific oceanAmount (buying DT)
   * @param {String} poolAddress
   * @param {String} oceanAmount
   * @return {String[]} - amount of ocean tokens received
   */
  public async getDTReceived(poolAddress: string, oceanAmount: string): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    return this.calcOutGivenIn(poolAddress, this.oceanAddress, dtAddress, oceanAmount)
  }

  public async getDTNeeded(poolAddress: string, OceanRequired: string): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    if (
      parseFloat(OceanRequired) >
      parseFloat(await this.getOceanMaxBuyQuantity(poolAddress))
    ) {
      return '0'
    }
    return this.calcInGivenOut(poolAddress, dtAddress, this.oceanAddress, OceanRequired)
  }

  /**
   * Search all pools created by an address
   * @param {String} account If empty, will return all pools ever created by anybody
   * @return {PoolDetails[]}
   */
  public async getPoolsbyCreator(account?: string): Promise<PoolDetails[]> {
    const result: PoolDetails[] = []
    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress)

    const events = await factory.getPastEvents('BPoolRegistered', {
      filter: account ? { registeredBy: account } : {},
      fromBlock: this.startBlock,
      toBlock: 'latest'
    })
    for (let i = 0; i < events.length; i++) {
      if (!account || events[i].returnValues[1].toLowerCase() === account.toLowerCase())
        result.push(await this.getPoolDetails(events[i].returnValues[0]))
    }
    return result
  }

  private async getResult(account: string, event: EventData): Promise<PoolShare> {
    const shares = await super.sharesBalance(account, event.returnValues[0])
    if (parseFloat(shares) > 0) {
      const dtAddress = await this.getDTAddress(event.returnValues[0])
      if (dtAddress) {
        const onePool: PoolShare = {
          shares,
          poolAddress: event.returnValues[0],
          did: didPrefixed(didNoZeroX(dtAddress))
        }
        return onePool
      }
    }
  }

  /**
   * Search all pools in which a user has shares
   * @param {String} account
   * @return {AllPoolsShares[]}
   */
  public async getPoolSharesByAddress(account: string): Promise<PoolShare[]> {
    const result: PoolShare[] = []
    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress)
    const events = await factory.getPastEvents('BPoolRegistered', {
      filter: {},
      fromBlock: this.startBlock,
      toBlock: 'latest'
    })
    let promises = []
    for (let i = 0; i < events.length; i++) {
      promises.push(this.getResult(account, events[i]))
      if (promises.length > MAX_AWAIT_PROMISES) {
        const results = await Promise.all(promises)
        for (let j = 0; j < results.length; j++) {
          result.push(results[j])
        }
        promises = []
      }
    }
    if (promises.length > 0) {
      const results = await Promise.all(promises)
      for (let j = 0; j < results.length; j++) {
        result.push(results[j])
      }
      promises = []
    }

    const filteredResult = result.filter((share) => {
      return share !== undefined
    })
    return filteredResult
  }

  /**
   * Get pool details
   * @param {String} poolAddress Pool address
   * @return {PoolDetails}
   */
  public async getPoolDetails(poolAddress: string): Promise<PoolDetails> {
    const tokens = await super.getFinalTokens(poolAddress)
    const details: PoolDetails = { poolAddress, tokens }
    return details
  }

  /**
   * Get all actions from a pool (join,exit,swap)
   * @param {String} poolAddress Pool address
   * @param {String} account Optional, filter for this address
   * @return {PoolTransaction[]}
   */
  public async getPoolLogs(
    poolAddress: string,
    startBlock = 0,
    account?: string
  ): Promise<PoolTransaction[]> {
    const results: PoolTransaction[] = []
    const dtAddress = await this.getDTAddress(poolAddress)
    if (startBlock === 0) startBlock = this.startBlock
    const swapTopic = super.getSwapEventSignature()
    const joinTopic = super.getJoinEventSignature()
    const exitTopic = super.getExitEventSignature()
    let addressTopic
    if (account)
      addressTopic = '0x000000000000000000000000' + account.substring(2).toLowerCase()
    else addressTopic = null
    const events = await this.web3.eth.getPastLogs({
      address: poolAddress,
      topics: [[swapTopic, joinTopic, exitTopic], addressTopic],
      fromBlock: startBlock,
      toBlock: 'latest'
    })

    let promises = []
    for (let i = 0; i < events.length; i++) {
      promises.push(this.getEventData(poolAddress, dtAddress, events[i]))
      if (promises.length > MAX_AWAIT_PROMISES) {
        const data = await Promise.all(promises)
        for (let j = 0; j < data.length; j++) {
          results.push(data[j])
        }
        promises = []
      }
    }
    if (promises.length > 0) {
      const data = await Promise.all(promises)
      for (let j = 0; j < data.length; j++) {
        results.push(data[j])
      }
      promises = []
    }

    // for (let i = 0; i < events.length; i++) {
    //   switch (events[i].topics[0]) {
    //     case swapTopic:
    //       results.push(await this.getEventData('swap', poolAddress, dtAddress, events[i]))
    //       break
    //     case joinTopic:
    //       results.push(await this.getEventData('join', poolAddress, dtAddress, events[i]))
    //       break
    //     case exitTopic:
    //       results.push(await this.getEventData('exit', poolAddress, dtAddress, events[i]))
    //       break
    //   }
    // }
    const eventResults = results.filter((share) => {
      return share !== undefined
    })
    return eventResults
  }

  /**
   * Get all logs on all pools for a specific address
   * @param {String} account
   * @return {PoolTransaction[]}
   */
  public async getAllPoolLogs(account: string): Promise<PoolTransaction[]> {
    const results: PoolTransaction[][] = []
    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress)
    const events = await factory.getPastEvents('BPoolRegistered', {
      filter: {},
      fromBlock: this.startBlock,
      toBlock: 'latest'
    })

    let promises = []
    for (let i = 0; i < events.length; i++) {
      promises.push(
        this.getPoolLogs(events[i].returnValues[0], events[i].blockNumber, account)
      )
      if (promises.length > MAX_AWAIT_PROMISES) {
        const data = await Promise.all(promises)
        for (let j = 0; j < data.length; j++) {
          results.push(data[j])
        }
        promises = []
      }
    }
    if (promises.length > 0) {
      const data = await Promise.all(promises)
      for (let j = 0; j < data.length; j++) {
        results.push(data[j])
      }
      promises = []
    }

    const concatResults = results.reduce((elem1, elem2) => elem1.concat(elem2))

    return concatResults
  }

  private async getEventData(
    poolAddress: string,
    dtAddress: string,
    data: Log
  ): Promise<PoolTransaction> {
    const blockDetails = await this.web3.eth.getBlock(data.blockNumber)
    const swapTopic = super.getSwapEventSignature()
    const joinTopic = super.getJoinEventSignature()
    const exitTopic = super.getExitEventSignature()
    let type: PoolTransactionType
    switch (data.topics[0]) {
      case swapTopic:
        type = 'swap'
        break
      case joinTopic:
        type = 'join'
        break
      case exitTopic:
        type = 'exit'
        break
    }
    let result: PoolTransaction = {
      poolAddress,
      dtAddress,
      caller: data.topics[1],
      transactionHash: data.transactionHash,
      blockNumber: data.blockNumber,
      timestamp: parseInt(String(blockDetails.timestamp)),
      type
    }
    let params
    switch (type) {
      case 'swap':
        params = this.web3.eth.abi.decodeParameters(['uint256', 'uint256'], data.data)
        result = {
          ...result,
          tokenIn: '0x' + data.topics[2].substring(data.topics[2].length - 40),
          tokenOut: '0x' + data.topics[2].substring(data.topics[3].length - 40),
          tokenAmountIn: this.web3.utils.fromWei(params[0]),
          tokenAmountOut: this.web3.utils.fromWei(params[1])
        }
        break
      case 'join':
        params = this.web3.eth.abi.decodeParameters(['uint256'], data.data)
        result = {
          ...result,
          tokenIn: '0x' + data.topics[2].substring(data.topics[2].length - 40),
          tokenAmountIn: this.web3.utils.fromWei(params[0])
        }
        break
      case 'exit':
        params = this.web3.eth.abi.decodeParameters(['uint256'], data.data)
        result = {
          ...result,
          tokenOut: '0x' + data.topics[2].substring(data.topics[2].length - 40),
          tokenAmountOut: this.web3.utils.fromWei(params[0])
        }
        break
    }
    return result
  }

  private async computeSlippage(
    poolAddress: string,
    tokenInBalance: string,
    tokenInWeight: string,
    tokenOutBalance: string,
    tokenOutWeight: string,
    newTokenInBalance: string,
    newTokenOutBalance: string,
    swapfee: string
  ) {
    const initialPrice = await super.calcSpotPrice(
      poolAddress,
      tokenInBalance,
      tokenInWeight,
      tokenOutBalance,
      tokenOutWeight,
      swapfee
    )

    const newPrice = await super.calcSpotPrice(
      poolAddress,
      newTokenInBalance,
      tokenInWeight,
      newTokenOutBalance,
      tokenOutWeight,
      swapfee
    )
    const slippage = (parseFloat(newPrice) * 100) / parseFloat(initialPrice) - 100
    return String(slippage)
  }

  /* Get slippage for buying some datatokens while spending exactly oceanAmount ocean tokens */
  public async computeBuySlippage(
    poolAddress: string,
    oceanAmount: string
  ): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    const dtWeight = await super.getDenormalizedWeight(poolAddress, dtAddress)
    const oceanWeight = await super.getDenormalizedWeight(poolAddress, this.oceanAddress)
    const dtReserve = await super.getReserve(poolAddress, dtAddress)
    const oceanReserve = await super.getReserve(poolAddress, dtAddress)
    const swapFee = await super.getSwapFee(poolAddress)
    const dtReceived = await super.calcOutGivenIn(
      poolAddress,
      oceanReserve,
      oceanWeight,
      dtReserve,
      dtWeight,
      oceanAmount,
      swapFee
    )
    const newDtReserve = new BigNumber(this.web3.utils.toWei(dtReserve)).minus(
      this.web3.utils.toWei(dtReceived)
    )
    const newOceanReserve = new BigNumber(this.web3.utils.toWei(oceanReserve)).plus(
      this.web3.utils.toWei(oceanAmount)
    )
    const slippage = await this.computeSlippage(
      poolAddress,
      oceanReserve,
      oceanWeight,
      dtReserve,
      dtWeight,
      this.web3.utils.fromWei(newOceanReserve.toString()),
      this.web3.utils.fromWei(newDtReserve.toString()),
      swapFee
    )
    return slippage
  }

  /* Get slippage for selling an exact amount of datatokens to get some ocean tokens */
  public async computeSellSlippage(
    poolAddress: string,
    dtAmount: string
  ): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    const dtWeight = await super.getDenormalizedWeight(poolAddress, dtAddress)
    const oceanWeight = await super.getDenormalizedWeight(poolAddress, this.oceanAddress)
    const dtReserve = await super.getReserve(poolAddress, dtAddress)
    const oceanReserve = await super.getReserve(poolAddress, dtAddress)
    const swapFee = await super.getSwapFee(poolAddress)
    const oceanReceived = await super.calcOutGivenIn(
      poolAddress,
      dtReserve,
      dtWeight,
      oceanReserve,
      oceanWeight,
      dtAmount,
      swapFee
    )
    const newDtReserve = new BigNumber(this.web3.utils.toWei(dtReserve)).plus(
      this.web3.utils.toWei(dtAmount)
    )
    const newOceanReserve = new BigNumber(this.web3.utils.toWei(oceanReserve)).minus(
      this.web3.utils.toWei(oceanReceived)
    )
    const slippage = await this.computeSlippage(
      poolAddress,
      dtReserve,
      dtWeight,
      oceanReserve,
      oceanWeight,
      this.web3.utils.fromWei(newDtReserve.toString()),
      this.web3.utils.fromWei(newOceanReserve.toString()),
      swapFee
    )
    return slippage
  }
}
