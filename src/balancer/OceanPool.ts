import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { TransactionReceipt } from 'web3-core'
import { Pool } from './Pool'
import { EventData, Filter } from 'web3-eth-contract'

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
     * @param {String} fee    Swap fee (as float)
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
      console.error('oceanAddress is not defined')
      return null
    }
    if (parseFloat(weight) > 9 || parseFloat(weight) < 1) {
      console.error('Weight out of bounds (min 1, max9)')
      return null
    }
    const address = await super.createPool(account)
    const oceanWeight = 10 - parseFloat(weight)
    const oceanAmount = (parseFloat(amount) * oceanWeight) / parseFloat(weight)
    this.dtAddress = token

    await this.approve(account, token, address, this.web3.utils.toWei(String(amount)))
    await this.approve(
      account,
      this.oceanAddress,
      address,
      this.web3.utils.toWei(String(oceanAmount))
    )

    await super.setup(
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
   * @param {String} account
   * @param {String} poolAddress
   * @return {String}
   */
  public async getOceanReserve(account: string, poolAddress: string): Promise<string> {
    if (this.oceanAddress == null) {
      console.error('oceanAddress is not defined')
      return null
    }
    return super.getReserve(account, poolAddress, this.oceanAddress)
  }

  /**
   * Get Data Token balance of a pool
   * @param {String} account
   * @param {String} poolAddress
   * @return {String}
   */
  public async getDTReserve(account: string, poolAddress: string): Promise<string> {
    await this.getDTAddress(poolAddress)
    return super.getReserve(account, poolAddress, this.dtAddress)
  }

  /**
   * Buy Data Token from a pool
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount  Data Token amount
   * @param {String} oceanAmount  Ocean Token amount payed
   * @param {String} maxPrice  Maximum price to pay
   * @return {TransactionReceipt}
   */
  public async buyDT(
    account: string,
    poolAddress: string,
    amount: string,
    oceanAmount: string,
    maxPrice: string
  ): Promise<TransactionReceipt> {
    if (this.oceanAddress == null) {
      console.error('oceanAddress is not defined')
      return null
    }
    await this.getDTAddress(poolAddress)

    // TODO - check balances first
    await super.approve(
      account,
      this.oceanAddress,
      poolAddress,
      this.web3.utils.toWei(oceanAmount)
    )

    return this.swapExactAmountOut(
      account,
      poolAddress,
      this.oceanAddress,
      oceanAmount,
      this.dtAddress,
      amount,
      maxPrice
    )
  }

  /**
   * Sell Data Token
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount  Data Token amount
   * @param {String} oceanAmount  Ocean Token amount expected
   * @param {String} maxPrice  Minimum price to sell
   * @return {TransactionReceipt}
   */
  public async sellDT(
    account: string,
    poolAddress: string,
    amount: string,
    oceanAmount: string,
    minPrice: string
  ): Promise<TransactionReceipt> {
    if (this.oceanAddress == null) {
      console.error('oceanAddress is not defined')
      return null
    }
    await this.getDTAddress(poolAddress)
    return this.swapExactAmountOut(
      account,
      poolAddress,
      this.dtAddress,
      amount,
      this.oceanAddress,
      oceanAmount,
      minPrice
    )
  }

  /**
   * Add Data Token amount to pool liquidity
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount Data Token amount
   * @return {TransactionReceipt}
   */
  public async addDTLiquidity(
    account: string,
    poolAddress: string,
    amount: string
  ): Promise<TransactionReceipt> {
    await this.getDTAddress(poolAddress)
    await super.approve(
      account,
      this.dtAddress,
      poolAddress,
      this.web3.utils.toWei(amount)
    )
    const result = await super.joinswapExternAmountIn(
      account,
      poolAddress,
      this.dtAddress,
      amount,
      '0'
    )
    return result
  }

  /**
   * Remove Data Token amount from pool liquidity
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} amount Data Token amount
   * @return {TransactionReceipt}
   */
  public async removeDTLiquidity(
    account: string,
    poolAddress: string,
    amount: string,
    maximumPoolShares: string
  ): Promise<TransactionReceipt> {
    await this.getDTAddress(poolAddress)
    // TODO Check balance of PoolShares before doing exit
    return this.exitswapExternAmountOut(
      account,
      poolAddress,
      this.dtAddress,
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
      console.error('oceanAddress is not defined')
      return null
    }
    await super.approve(
      account,
      this.oceanAddress,
      poolAddress,
      this.web3.utils.toWei(amount)
    )
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
  public removeOceanLiquidity(
    account: string,
    poolAddress: string,
    amount: string,
    maximumPoolShares: string
  ): Promise<TransactionReceipt> {
    if (this.oceanAddress == null) {
      console.error('oceanAddress is not defined')
      return null
    }
    // TODO Check balance of PoolShares before doing exit
    return super.exitswapExternAmountOut(
      account,
      poolAddress,
      this.oceanAddress,
      amount,
      maximumPoolShares
    )
  }

  /**
   * Get Data Token price from pool
   * @param {String} account
   * @param {String} poolAddress
   * @return {String}
   */
  public async getDTPrice(account: string, poolAddress: string): Promise<string> {
    if (this.oceanAddress == null) {
      console.error('oceanAddress is not defined')
      return null
    }
    return this.getOceanNeeded(account, poolAddress, '1')
  }

  /**
   * Search all pools that have Data Token in their composition
   * @param {String} account
   * @param {String} dtAddress
   * @return {String[]}
   */
  public async searchPoolforDT(account: string, dtAddress: string): Promise<string[]> {
    const result: string[] = []
    const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress, {
      from: account
    })
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

  public async getOceanNeeded(
    account: string,
    poolAddress: string,
    dtRequired: string
  ): Promise<string> {
    await this.getDTAddress(poolAddress)
    const tokenBalanceIn = await this.getReserve(account, poolAddress, this.oceanAddress)
    const tokenWeightIn = await this.getDenormalizedWeight(
      account,
      poolAddress,
      this.oceanAddress
    )
    const tokenBalanceOut = await this.getReserve(account, poolAddress, this.dtAddress)
    const tokenWeightOut = await this.getDenormalizedWeight(
      account,
      poolAddress,
      this.dtAddress
    )
    const swapFee = await this.getSwapFee(account, poolAddress)
    return super.calcInGivenOut(
      tokenBalanceIn,
      tokenWeightIn,
      tokenBalanceOut,
      tokenWeightOut,
      dtRequired,
      swapFee
    )
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
   * @param {String} account
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
