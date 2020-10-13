import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { TransactionReceipt } from 'web3-core'
import { Pool } from './Pool'
import { EventData, Filter } from 'web3-eth-contract'
import BigNumber from 'bignumber.js'
import Decimal from 'decimal.js'

declare type PoolTransactionType = 'swap' | 'join' | 'exit'

export interface PoolDetails {
  poolAddress: string
  tokens: string[]
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

/**
 * Ocean Pools submodule exposed under ocean.pool
 */
export class OceanPool extends Pool {
  public oceanAddress: string = null
  public dtAddress: string = null

  constructor(
    web3: Web3,
    factoryABI: AbiItem | AbiItem[] = null,
    poolABI: AbiItem | AbiItem[] = null,
    factoryAddress: string = null,
    oceanAddress: string = null,
    gaslimit?: number
  ) {
    super(web3, factoryABI, poolABI, factoryAddress, gaslimit)
    if (oceanAddress) {
      this.oceanAddress = oceanAddress
    }
  }

  /**
     * Create DataToken pool
     @param {String} account
     * @param {String} token  DataToken address
     * @param {String} amount DataToken amount
     * @param {String} weight DataToken weight
     * @param {String} fee Swap fee. E.g. to get a 0.1% swapFee use `0.001`. The maximum allowed swapFee is `0.1` (10%).
     * @return {String}
     */
  public async createDTPool(
    account: string,
    token: string,
    amount: string,
    weight: string,
    fee: string
  ): Promise<string> {
    if (this.oceanAddress == null) {
      console.error('ERROR: oceanAddress is not defined')
      return null
    }
    if (parseFloat(fee) > 0.1) {
      console.error('ERROR: Swap fee too high. The maximum allowed swapFee is 0.1 (10%).')
      return null
    }
    if (parseFloat(weight) > 9 || parseFloat(weight) < 1) {
      console.error('ERROR: Weight out of bounds (min 1, max9)')
      return null
    }
    const address = await super.createPool(account)
    const oceanWeight = 10 - parseFloat(weight)
    const oceanAmount = (parseFloat(amount) * oceanWeight) / parseFloat(weight)
    this.dtAddress = token
    let txid
    txid = await this.approve(
      account,
      token,
      address,
      this.web3.utils.toWei(String(amount))
    )
    if (!txid) {
      console.error('ERROR: Failed to call approve DT token')
      return null
    }
    txid = await this.approve(
      account,
      this.oceanAddress,
      address,
      this.web3.utils.toWei(String(oceanAmount))
    )
    if (!txid) {
      console.error('ERROR: Failed to call approve OCEAN token')
      return null
    }
    txid = await super.setup(
      account,
      address,
      token,
      this.web3.utils.toWei(String(amount)),
      this.web3.utils.toWei(String(weight)),
      this.oceanAddress,
      this.web3.utils.toWei(String(oceanAmount)),
      this.web3.utils.toWei(String(oceanWeight)),
      this.web3.utils.toWei(fee)
    )
    if (!txid) {
      console.error('ERROR: Failed to create a new pool')
      return null
    }
    return address
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
      console.error('ERROR: oceanAddress is not defined')
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
        .dividedBy(3)
        .integerValue(BigNumber.ROUND_DOWN)
        .minus(1)
      return this.web3.utils.fromWei(result.toString())
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
        .dividedBy(4)
        .integerValue(BigNumber.ROUND_DOWN)
        .minus(1)
      return this.web3.utils.fromWei(result.toString())
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
      console.error('ERROR: undefined ocean token contract address')
      return null
    }
    const dtAddress = await this.getDTAddress(poolAddress)
    if (
      parseFloat(dtAmountWanted) > parseFloat(await this.getDTMaxBuyQuantity(poolAddress))
    ) {
      console.error('ERROR: Buy quantity exceeds quantity allowed')
      return null
    }
    const calcInGivenOut = await this.getOceanNeeded(poolAddress, dtAmountWanted)

    if (parseFloat(calcInGivenOut) > parseFloat(maxOceanAmount)) {
      console.error('ERROR: Not enough Ocean Tokens')
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
      console.error('ERROR: OCEAN approve failed')
      return null
    }
    return this.swapExactAmountOut(
      account,
      poolAddress,
      this.oceanAddress,
      maxOceanAmount,
      dtAddress,
      dtAmountWanted,
      maxPrice
    )
  }

  /**
   * Sell datatoken
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
      console.error('ERROR: oceanAddress is not defined')
      return null
    }
    const dtAddress = await this.getDTAddress(poolAddress)
    if (
      parseFloat(oceanAmountWanted) >
      parseFloat(await this.getOceanMaxBuyQuantity(poolAddress))
    ) {
      console.error('ERROR: Buy quantity exceeds quantity allowed')
      return null
    }
    const calcOutGivenIn = await this.getOceanReceived(poolAddress, dtAmount)

    if (parseFloat(calcOutGivenIn) < parseFloat(oceanAmountWanted)) {
      console.error('ERROR: Not enough datatokens')
      return null
    }
    const txid = await super.approve(
      account,
      dtAddress,
      poolAddress,
      this.web3.utils.toWei(dtAmount)
    )
    if (!txid) {
      console.error('ERROR: DT approve failed')
      return null
    }
    return this.swapExactAmountIn(
      account,
      poolAddress,
      dtAddress,
      dtAmount,
      this.oceanAddress,
      oceanAmountWanted,
      maxPrice
    )
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
      console.error('ERROR: Too much reserve to add')
      return null
    }
    const txid = await super.approve(
      account,
      dtAddress,
      poolAddress,
      this.web3.utils.toWei(amount)
    )
    if (!txid) {
      console.error('ERROR: DT approve failed')
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
      console.error('ERROR: Too much reserve to remove')
      return null
    }
    const usershares = await this.sharesBalance(account, poolAddress)
    if (parseFloat(usershares) < parseFloat(maximumPoolShares)) {
      console.error('ERROR: Not enough poolShares')
      return null
    }
    if (
      parseFloat(maximumPoolShares) <
      parseFloat(await this.getPoolSharesRequiredToRemoveDT(poolAddress, amount))
    ) {
      console.error('ERROR: Not enough poolShares')
      return null
    }
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
      console.error('ERROR: oceanAddress is not defined')
      return null
    }
    const maxAmount = await this.getOceanMaxAddLiquidity(poolAddress)
    if (parseFloat(amount) > parseFloat(maxAmount)) {
      console.error('ERROR: Too much reserve to add')
      return null
    }
    const txid = await super.approve(
      account,
      this.oceanAddress,
      poolAddress,
      this.web3.utils.toWei(amount)
    )
    if (!txid) {
      console.error('ERROR: OCEAN approve failed')
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
      console.error('ERROR: oceanAddress is not defined')
      return null
    }
    const maxAmount = await this.getOceanMaxRemoveLiquidity(poolAddress)
    if (parseFloat(amount) > parseFloat(maxAmount)) {
      console.error('ERROR: Too much reserve to remove')
      return null
    }
    const usershares = await this.sharesBalance(account, poolAddress)
    if (parseFloat(usershares) < parseFloat(maximumPoolShares)) {
      console.error('ERROR: Not enough poolShares')
      return null
    }
    if (
      parseFloat(maximumPoolShares) <
      parseFloat(await this.getPoolSharesRequiredToRemoveOcean(poolAddress, amount))
    ) {
      console.error('ERROR: Not enough poolShares')
      return null
    }
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
      console.error('ERROR: Not enough poolShares')
      return null
    }

    return this.exitPool(account, poolAddress, poolShares, [minDT, minOcean])
  }

  /**
   * Get datatoken price from pool
   * @param {String} poolAddress
   * @return {String}
   */
  public async getDTPrice(poolAddress: string): Promise<string> {
    if (this.oceanAddress == null) {
      console.error('ERROR: oceanAddress is not defined')
      return null
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
      fromBlock: 0,
      toBlock: 'latest'
    })
    for (let i = 0; i < events.length; i++) {
      const constituents = await super.getCurrentTokens(events[i].returnValues[0])
      if (constituents.includes(dtAddress)) result.push(events[i].returnValues[0])
    }
    return result
  }

  public async getOceanNeeded(poolAddress: string, dtRequired: string): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    return this.calcInGivenOut(poolAddress, this.oceanAddress, dtAddress, dtRequired)
  }

  public async getOceanReceived(poolAddress: string, dtSold: string): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
    return this.calcOutGivenIn(poolAddress, dtAddress, this.oceanAddress, dtSold)
  }

  public async getDTNeeded(poolAddress: string, OceanRequired: string): Promise<string> {
    const dtAddress = await this.getDTAddress(poolAddress)
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
      fromBlock: 0,
      toBlock: 'latest'
    })

    for (let i = 0; i < events.length; i++) {
      if (!account || events[i].returnValues[1].toLowerCase() === account.toLowerCase())
        result.push(await this.getPoolDetails(events[i].returnValues[0]))
    }
    return result
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
    account?: string
  ): Promise<PoolTransaction[]> {
    const results: PoolTransaction[] = []
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const dtAddress = await this.getDTAddress(poolAddress)
    const filter: Filter = account ? { caller: account } : {}
    let events: EventData[]

    events = await pool.getPastEvents('LOG_SWAP', {
      filter,
      fromBlock: 0,
      toBlock: 'latest'
    })

    for (let i = 0; i < events.length; i++) {
      if (!account || events[i].returnValues[0].toLowerCase() === account.toLowerCase())
        results.push(await this.getEventData('swap', poolAddress, dtAddress, events[i]))
    }

    events = await pool.getPastEvents('LOG_JOIN', {
      filter,
      fromBlock: 0,
      toBlock: 'latest'
    })

    for (let i = 0; i < events.length; i++) {
      if (!account || events[i].returnValues[0].toLowerCase() === account.toLowerCase())
        results.push(await this.getEventData('join', poolAddress, dtAddress, events[i]))
    }

    events = await pool.getPastEvents('LOG_EXIT', {
      filter,
      fromBlock: 0,
      toBlock: 'latest'
    })
    for (let i = 0; i < events.length; i++) {
      if (!account || events[i].returnValues[0].toLowerCase() === account.toLowerCase())
        results.push(await this.getEventData('exit', poolAddress, dtAddress, events[i]))
    }

    return results
  }

  /**
   * Get all logs on all pools for a specific address
   * @param {String} account
   * @return {PoolTransaction[]}
   */
  public async getAllPoolLogs(account: string): Promise<PoolTransaction[]> {
    const results: PoolTransaction[] = []
    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress)
    const events = await factory.getPastEvents('BPoolRegistered', {
      filter: {},
      fromBlock: 0,
      toBlock: 'latest'
    })

    for (let i = 0; i < events.length; i++) {
      const logs = await this.getPoolLogs(events[i].returnValues[0], account)
      for (let j = 0; j < logs.length; j++) results.push(logs[j])
    }
    return results
  }

  private async getEventData(
    type: PoolTransactionType,
    poolAddress: string,
    dtAddress: string,
    data: EventData
  ): Promise<PoolTransaction> {
    const blockDetails = await this.web3.eth.getBlock(data.blockNumber)
    let result: PoolTransaction = {
      poolAddress,
      dtAddress,
      caller: data.returnValues[0],
      transactionHash: data.transactionHash,
      blockNumber: data.blockNumber,
      timestamp: parseInt(String(blockDetails.timestamp)),
      type
    }

    switch (type) {
      case 'swap':
        result = {
          ...result,
          tokenIn: data.returnValues[1],
          tokenOut: data.returnValues[2],
          tokenAmountIn: this.web3.utils.fromWei(data.returnValues[3]),
          tokenAmountOut: this.web3.utils.fromWei(data.returnValues[4])
        }
        break
      case 'join':
        result = {
          ...result,
          tokenIn: data.returnValues[1],
          tokenAmountIn: this.web3.utils.fromWei(data.returnValues[2])
        }
        break
      case 'exit':
        result = {
          ...result,
          tokenOut: data.returnValues[1],
          tokenAmountOut: this.web3.utils.fromWei(data.returnValues[2])
        }
        break
    }
    return result
  }
}
