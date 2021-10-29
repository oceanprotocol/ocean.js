import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import { Logger, getFairGasPrice } from '../../utils'
import BigNumber from 'bignumber.js'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import defaultPool from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import defaultERC20ABI from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Decimal from 'decimal.js'

const MaxUint256 =
  '115792089237316195423570985008687907853269984665640564039457584007913129639934'
/**
 * Provides an interface to Ocean friendly fork from Balancer BPool
 */
// TODO: Add decimals handling
export class Pool {
  public poolABI: AbiItem | AbiItem[]
  public web3: Web3
  public GASLIMIT_DEFAULT = 1000000
  private logger: Logger

  constructor(web3: Web3, logger: Logger, poolABI: AbiItem | AbiItem[] = null) {
    if (poolABI) this.poolABI = poolABI
    else this.poolABI = PoolTemplate.abi as AbiItem[]
    this.web3 = web3
    this.logger = logger
  }

  /**
   * Get Alloance for both DataToken and Ocean
   * @param {String } tokenAdress
   * @param {String} owner
   * @param {String} spender
   */
  public async allowance(
    tokenAddress: string,
    owner: string,
    spender: string
  ): Promise<string> {
    const tokenAbi = defaultERC20ABI.abi as AbiItem[]
    const datatoken = new this.web3.eth.Contract(tokenAbi, tokenAddress)
    const trxReceipt = await datatoken.methods.allowance(owner, spender).call()
    return (await this.unitsToAmount(tokenAddress, trxReceipt)).toString()
  }

  /**
   * Approve spender to spent amount tokens
   * @param {String} account
   * @param {String} tokenAddress
   * @param {String} spender
   * @param {String} amount  (always expressed as wei)
   * @param {String} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
   */
  async approve(
    account: string,
    tokenAddress: string,
    spender: string,
    amount: string,
    force = false
  ): Promise<TransactionReceipt | string> {
    const minABI = [
      {
        constant: false,
        inputs: [
          {
            name: '_spender',
            type: 'address'
          },
          {
            name: '_value',
            type: 'uint256'
          }
        ],
        name: 'approve',
        outputs: [
          {
            name: '',
            type: 'bool'
          }
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ] as AbiItem[]
    const token = new this.web3.eth.Contract(minABI, tokenAddress, {
      from: account
    })
    if (!force) {
      const currentAllowence = await this.allowance(tokenAddress, account, spender)
      if (
        new Decimal(this.web3.utils.toWei(currentAllowence)).greaterThanOrEqualTo(amount)
      ) {
        return currentAllowence
      }
    }
    let result = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await token.methods
        .approve(spender, await this.amountToUnits(tokenAddress, amount))
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    try {
      result = await token.methods
        .approve(spender, await this.amountToUnits(tokenAddress, amount))
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      this.logger.error(`ERRPR: Failed to approve spender to spend tokens : ${e.message}`)
    }
    return result
  }

  /**
   * Get user shares of pool tokens
   * @param {String} account
   * @param {String} poolAddress
   * @return {String}
   */
  async sharesBalance(account: string, poolAddress: string): Promise<string> {
    let result = null
    try {
      const token = new this.web3.eth.Contract(this.poolABI, poolAddress)
      const balance = await token.methods.balanceOf(account).call()
      result = this.web3.utils.fromWei(balance)
    } catch (e) {
      this.logger.error(`ERROR: Failed to get shares of pool : ${e.message}`)
    }
    return result
  }

  /**
   * Set pool fee
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} fee 0.1=10% fee(max allowed)
   */
  async setSwapFee(
    account: string,
    poolAddress: string,
    fee: string
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods.setSwapFee(this.web3.utils.toWei(fee)).send({
        from: account,
        gas: this.GASLIMIT_DEFAULT,
        gasPrice: await getFairGasPrice(this.web3)
      })
    } catch (e) {
      this.logger.error(`ERROR: Failed to set pool swap fee: ${e.message}`)
    }
    return result
  }

  /**
   * Get number of tokens composing this pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getNumTokens(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    try {
      result = await pool.methods.getNumTokens().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get number of tokens: ${e.message}`)
    }
    return result
  }

  /**
   * Get total supply of pool shares
   * @param {String} poolAddress
   * @return {String}
   */
  async getPoolSharesTotalSupply(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let amount = null
    try {
      const result = await pool.methods.totalSupply().call()
      amount = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to get total supply of pool shares: ${e.message}`)
    }
    return amount
  }

  /**
   * Get tokens composing this pool
   * @param {String} poolAddress
   * @return {String[]}
   */
  async getCurrentTokens(poolAddress: string): Promise<string[]> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    try {
      result = await pool.methods.getCurrentTokens().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get tokens composing this pool: ${e.message}`)
    }
    return result
  }

  /**
   * Get the final tokens composing this pool
   * @param {String} poolAddress
   * @return {String[]}
   */
  async getFinalTokens(poolAddress: string): Promise<string[]> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    try {
      result = await pool.methods.getFinalTokens().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get the final tokens composing this pool`)
    }
    return result
  }

  /**
   * Get controller address of this pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getController(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    try {
      result = await pool.methods.getController().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get pool controller address: ${e.message}`)
    }
    return result
  }

  /**
   * Get basetoken address of this pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getBasetoken(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    try {
      result = await pool.methods.getBaseTokenAddress().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get basetoken address: ${e.message}`)
    }
    return result
  }

  /**
   * Get datatoken address of this pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getDatatoken(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    try {
      result = await pool.methods.getDataTokenAddress().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get datatoken address: ${e.message}`)
    }
    return result
  }

  /**
   * Get marketFeeCollector of this pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getMarketFeeCollector(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    try {
      result = await pool.methods._marketCollector().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get marketFeeCollector address: ${e.message}`)
    }
    return result
  }

  /**
   * Get OPF Collector of this pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getOPFCollector(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    try {
      result = await pool.methods._opfCollector().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get OPF Collector address: ${e.message}`)
    }
    return result
  }

  /**
   * Get if a token is bounded to a pool
   * @param {String} poolAddress
   * @param {String} token  Address of the token
   * @return {Boolean}
   */
  async isBound(poolAddress: string, token: string): Promise<boolean> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    try {
      result = await pool.methods.isBound(token).call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to check whether a token \
      bounded to a pool. ${e.message}`)
    }
    return result
  }

  /**
   * Get how many tokens are in the pool
   * @param {String} poolAddress
   * @param {String} token  Address of the token
   * @return {String}
   */
  async getReserve(poolAddress: string, token: string): Promise<string> {
    let amount = null
    try {
      const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
      const result = await pool.methods.getBalance(token).call()
      amount = await this.unitsToAmount(token, result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to get how many tokens \
      are in the pool: ${e.message}`)
    }
    return amount.toString()
  }

  /**
   * Get if a pool is finalized
   * @param {String} poolAddress
   * @return {Boolean}
   */
  async isFinalized(poolAddress: string): Promise<boolean> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    try {
      result = await pool.methods.isFinalized().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to check whether pool is finalized: ${e.message}`)
    }
    return result
  }

  /**
   * Get pool fee
   * @param {String} poolAddress
   * @return {String} Swap fee. To get the percentage value, substract by 100. E.g. `0.1` represents a 10% swap fee.
   */
  async getSwapFee(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let fee = null
    try {
      const result = await pool.methods.getSwapFee().call()
      fee = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to get pool fee: ${e.message}`)
    }
    return fee
  }

  /**
   * The normalized weight of a token. The combined normalized weights of all tokens will sum up to 1. (Note: the actual sum may be 1 plus or minus a few wei due to division precision loss)
   * @param {String} poolAddress
   * @param {String} token
   * @return {String}
   */
  async getNormalizedWeight(poolAddress: string, token: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let weight = null
    try {
      const result = await pool.methods.getNormalizedWeight(token).call()
      weight = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to get normalized weight of a token: ${e.message}`)
    }
    return weight
  }

  /**
   * getDenormalizedWeight of a token in pool
   * @param {String} poolAddress
   * @param {String} token
   * @return {String}
   */
  async getDenormalizedWeight(poolAddress: string, token: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let weight = null
    try {
      const result = await pool.methods.getDenormalizedWeight(token).call()
      weight = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error('ERROR: Failed to get denormalized weight of a token in pool')
    }
    return weight
  }

  /**
   * getTotalDenormalizedWeight in pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getTotalDenormalizedWeight(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let weight = null
    try {
      const result = await pool.methods.getTotalDenormalizedWeight().call()
      weight = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error('ERROR: Failed to get total denormalized weight in pool')
    }
    return weight
  }

  /**
   * Get Market Fees available to be collected for a specific token
   * @param {String} poolAddress
   * @param {String} token token we want to check fees
   * @return {String}
   */
  async getMarketFees(poolAddress: string, token: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let weight = null
    try {
      const result = await pool.methods.marketFees(token).call()
      weight = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to get market fees for a token: ${e.message}`)
    }
    return weight
  }

  /**
   * Get Community Fees available to be collected for a specific token
   * @param {String} poolAddress
   * @param {String} token token we want to check fees
   * @return {String}
   */
  async getCommunityFees(poolAddress: string, token: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let weight = null
    try {
      const result = await pool.methods.communityFees(token).call()
      weight = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to get community fees for a token: ${e.message}`)
    }
    return weight
  }

  /**
   * Estimate gas cost for collectOPF
   * @param {String} address
   * @param {String} poolAddress
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estCollectOPF(
    address: string,
    poolAddress: string,
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .collectOPF()
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * collectOPF - collect opf fee - can be called by anyone
   * @param {String} address
   * @param {String} poolAddress
   * @return {TransactionReceipt}
   */
  async collectOPF(address: string, poolAddress: string): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    const estGas = await this.estCollectOPF(address, poolAddress)

    try {
      result = await pool.methods.collectOPF().send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swap exact amount in : ${e.message}`)
    }
    return result
  }

  /**
   * Estimate gas cost for collectMarketFee
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} to address that will receive fees
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estCollectMarketFee(
    address: string,
    poolAddress: string,
    to: string,
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .collectMarketFee(to)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * collectOPF - collect market fees - can be called by the marketFeeCollector
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} to address that will receive fees
   * @return {TransactionReceipt}
   */
  async collectMarketFee(
    address: string,
    poolAddress: string,
    to: string
  ): Promise<TransactionReceipt> {
    if ((await this.getMarketFeeCollector(poolAddress)) !== address) {
      throw new Error(`Caller is not MarketFeeCollector`)
    }
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    const estGas = await this.estCollectMarketFee(address, poolAddress, to)

    try {
      result = await pool.methods.collectMarketFee(to).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swap exact amount in : ${e.message}`)
    }
    return result
  }

  /**
   * Estimate gas cost for collectMarketFee
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} newCollector new market fee collector address
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estUpdateMarketFeeCollector(
    address: string,
    poolAddress: string,
    newCollector: string,
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .updateMarketFeeCollector(newCollector)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * updateMarketFeeCollector - updates marketFeeCollector - can be called only by the marketFeeCollector
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} newCollector new market fee collector address
   * @return {TransactionReceipt}
   */
  async updateMarketFeeCollector(
    address: string,
    poolAddress: string,
    newCollector: string
  ): Promise<TransactionReceipt> {
    if ((await this.getMarketFeeCollector(poolAddress)) !== address) {
      throw new Error(`Caller is not MarketFeeCollector`)
    }
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    const estGas = await this.estUpdateMarketFeeCollector(
      address,
      poolAddress,
      newCollector
    )

    try {
      result = await pool.methods.updateMarketFeeCollector(newCollector).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swap exact amount in : ${e.message}`)
    }
    return result
  }

  /**
   * Estimate gas cost for swapExactAmountIn
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenAmountIn  will be converted to wei
   * @param {String} tokenOut
   * @param {String} minAmountOut will be converted to wei
   * @param {String} maxPrice will be converted to wei
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estSwapExactAmountIn(
    address: string,
    poolAddress: string,
    tokenIn: string,
    tokenAmountIn: string,
    tokenOut: string,
    minAmountOut: string,
    maxPrice: string,
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .swapExactAmountIn(
          tokenIn,
          tokenAmountIn,
          tokenOut,
          minAmountOut,
          maxPrice ? this.web3.utils.toWei(maxPrice) : MaxUint256
        )
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  async amountToUnits(token: string, amount: string): Promise<number> {
    let decimals = 18
    let amountFormatted
    const tokenContract = new this.web3.eth.Contract(
      defaultERC20ABI.abi as AbiItem[],
      token
    )
    try {
      decimals = await tokenContract.methods.decimals().call()
    } catch (e) {
      this.logger.error('ERROR: FAILED TO CALL DECIMALS(), USING 18')
    }

    amountFormatted = new BigNumber(parseInt(amount) * 10 ** decimals)

    return amountFormatted
  }

  async unitsToAmount(token: string, amount: string): Promise<number> {
    let decimals = 18
    let amountFormatted
    const tokenContract = new this.web3.eth.Contract(
      defaultERC20ABI.abi as AbiItem[],
      token
    )
    try {
      decimals = await tokenContract.methods.decimals().call()
    } catch (e) {
      this.logger.error('ERROR: FAILED TO CALL DECIMALS(), USING 18')
    }

    amountFormatted = new BigNumber(parseInt(amount) / 10 ** decimals)

    return amountFormatted
  }

  /**
   * swapExactAmountIn - Trades an exact tokenAmountIn of tokenIn taken from the caller by the pool, in exchange for at least minAmountOut of tokenOut given to the caller from the pool, with a maximum marginal price of maxPrice.         Returns (tokenAmountOut, spotPriceAfter), where tokenAmountOut is the amount of token that came out of the pool, and spotPriceAfter is the new marginal spot price, ie, the result of getSpotPrice after the call. (These values are what are limited by the arguments; you are guaranteed tokenAmountOut >= minAmountOut and spotPriceAfter <= maxPrice).
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenAmountIn  will be converted to wei
   * @param {String} tokenOut
   * @param {String} minAmountOut will be converted to wei
   * @param {String} maxPrice will be converted to wei
   * @return {TransactionReceipt}
   */
  async swapExactAmountIn(
    address: string,
    poolAddress: string,
    tokenIn: string,
    tokenAmountIn: string,
    tokenOut: string,
    minAmountOut: string,
    maxPrice?: string
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const tokenInContract = new this.web3.eth.Contract(
      defaultERC20ABI.abi as AbiItem[],
      tokenIn
    )

    let amountInFormatted
    let minAmountOutFormatted

    amountInFormatted = await this.amountToUnits(tokenIn, tokenAmountIn)

    minAmountOutFormatted = await this.amountToUnits(tokenOut, minAmountOut)

    let result = null

    const estGas = await this.estSwapExactAmountIn(
      address,
      poolAddress,
      tokenIn,
      amountInFormatted,
      tokenOut,
      minAmountOutFormatted,
      maxPrice ? this.web3.utils.toWei(maxPrice) : MaxUint256
    )
    console.log(minAmountOutFormatted, 'minamoutnoutformatted')
    try {
      result = await pool.methods
        .swapExactAmountIn(
          tokenIn,
          amountInFormatted,
          tokenOut,
          minAmountOutFormatted,
          maxPrice ? this.web3.utils.toWei(maxPrice) : MaxUint256
        )
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swap exact amount in : ${e.message}`)
    }

    return result
  }

  /**
   * Estimate gas cost for swapExactAmountOut
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenAmountIn  will be converted to wei
   * @param {String} tokenOut
   * @param {String} minAmountOut will be converted to wei
   * @param {String} maxPrice will be converted to wei
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estSwapExactAmountOut(
    address: string,
    poolAddress: string,
    tokenIn: string,
    maxAmountIn: string,
    tokenOut: string,
    amountOut: string,
    maxPrice?: string,
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .swapExactAmountOut(
          tokenIn,
          this.web3.utils.toWei(maxAmountIn),
          tokenOut,
          this.web3.utils.toWei(amountOut),
          maxPrice ? this.web3.utils.toWei(maxPrice) : MaxUint256
        )
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * swapExactAmountOut
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} maxAmountIn  will be converted to wei
   * @param {String} tokenOut
   * @param {String} amountOut will be converted to wei
   * @param {String} maxPrice will be converted to wei
   * @return {TransactionReceipt}
   */
  async swapExactAmountOut(
    account: string,
    poolAddress: string,
    tokenIn: string,
    maxAmountIn: string,
    tokenOut: string,
    amountOut: string,
    maxPrice?: string
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    let maxAmountInFormatted
    let amountOutFormatted
    maxAmountInFormatted = await this.amountToUnits(tokenIn, maxAmountIn)
    amountOutFormatted = await this.amountToUnits(tokenOut, amountOut)
    const estGas = await this.estSwapExactAmountOut(
      account,
      poolAddress,
      tokenIn,
      maxAmountInFormatted,
      tokenOut,
      amountOutFormatted,
      maxPrice ? this.web3.utils.toWei(maxPrice) : MaxUint256
    )

    try {
      result = await pool.methods
        .swapExactAmountOut(
          tokenIn,
          maxAmountInFormatted,
          tokenOut,
          amountOutFormatted,
          maxPrice ? this.web3.utils.toWei(maxPrice) : MaxUint256
        )
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swap exact amount out: ${e.message}`)
    }
    return result
  }

  /**
   * Estimate gas cost for swapExactAmountOut
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} poolAmountOut will be converted to wei
   * @param {String[]} maxAmountsIn  array holding maxAmount per each token, will be converted to wei
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estJoinPool(
    address: string,
    poolAddress: string,
    poolAmountOut: string,
    maxAmountsIn: string[],
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .joinPool(this.web3.utils.toWei(poolAmountOut), maxAmountsIn)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Join the pool, getting poolAmountOut pool tokens. This will pull some of each of the currently trading tokens in the pool, meaning you must have called approve for each token for this pool. These values are limited by the array of maxAmountsIn in the order of the pool tokens.
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} poolAmountOut will be converted to wei
   * @param {String[]} maxAmountsIn  array holding maxAmount per each token, will be converted to wei
   * @return {TransactionReceipt}
   */
  async joinPool(
    address: string,
    poolAddress: string,
    poolAmountOut: string,
    maxAmountsIn: string[]
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const weiMaxAmountsIn = []
    const tokens = await this.getFinalTokens(poolAddress)

    for (let i = 0; i < 2; i++) {
      const amount = await this.amountToUnits(tokens[i], maxAmountsIn[i])
      weiMaxAmountsIn.push(amount)
    }
    // console.log(weiMaxAmountsIn)

    let result = null

    const estGas = await this.estJoinPool(
      address,
      poolAddress,
      this.web3.utils.toWei(poolAmountOut),
      weiMaxAmountsIn
    )

    try {
      result = await pool.methods
        .joinPool(this.web3.utils.toWei(poolAmountOut), weiMaxAmountsIn)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to join pool: ${e.message}`)
    }
    return result
  }

  /**
   * Estimate gas cost for exitPool
* @param {String} address
   * @param {String} poolAddress
 ``* @param {String} poolAmountIn will be converted to wei
   * @param {String[]} minAmountsOut  array holding minAmount per each token, will be converted to wei
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estExitPool(
    address: string,
    poolAddress: string,
    poolAmountIn: string,
    minAmountsOut: string[],
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .exitPool(this.web3.utils.toWei(poolAmountIn), minAmountsOut)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Exit the pool, paying poolAmountIn pool tokens and getting some of each of the currently trading tokens in return. These values are limited by the array of minAmountsOut in the order of the pool tokens.
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} poolAmountIn will be converted to wei
   * @param {String[]} minAmountsOut  array holding minAmount per each token, will be converted to wei
   * @return {TransactionReceipt}
   */
  async exitPool(
    account: string,
    poolAddress: string,
    poolAmountIn: string,
    minAmountsOut: string[]
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const weiMinAmountsOut = []
    const tokens = await this.getFinalTokens(poolAddress)

    for (let i = 0; i < 2; i++) {
      const amount = await this.amountToUnits(tokens[i], minAmountsOut[i])
      weiMinAmountsOut.push(amount)
    }
    let result = null
    const estGas = await this.estExitPool(
      account,
      poolAddress,
      this.web3.utils.toWei(poolAmountIn),
      weiMinAmountsOut
    )
    try {
      result = await pool.methods
        .exitPool(this.web3.utils.toWei(poolAmountIn), weiMinAmountsOut)
        .send({ from: account, gas: estGas, gasPrice: await getFairGasPrice(this.web3) })
    } catch (e) {
      this.logger.error(`ERROR: Failed to exit pool: ${e.message}`)
    }
    return result
  }

  /**
   * Estimate gas cost for joinswapExternAmountIn
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenAmountIn will be converted to wei
   * @param {String} minPoolAmountOut  will be converted to wei
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estJoinswapExternAmountIn(
    address: string,
    poolAddress: string,
    tokenIn: string,
    tokenAmountIn: string,
    minPoolAmountOut: string,
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .joinswapExternAmountIn(tokenIn, tokenAmountIn, minPoolAmountOut)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Pay tokenAmountIn of token tokenIn to join the pool, getting poolAmountOut of the pool shares.
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenAmountIn will be converted to wei
   * @param {String} minPoolAmountOut  will be converted to wei
   * @return {TransactionReceipt}
   */
  async joinswapExternAmountIn(
    account: string,
    poolAddress: string,
    tokenIn: string,
    tokenAmountIn: string,
    minPoolAmountOut: string
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    let amountInFormatted
    amountInFormatted = await this.amountToUnits(tokenIn, tokenAmountIn)
    const estGas = await this.estJoinswapExternAmountIn(
      account,
      poolAddress,
      tokenIn,
      amountInFormatted,
      this.web3.utils.toWei(minPoolAmountOut)
    )

    try {
      result = await pool.methods
        .joinswapExternAmountIn(
          tokenIn,
          amountInFormatted,
          this.web3.utils.toWei(minPoolAmountOut)
        )
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to pay tokens in order to \
      join the pool: ${e.message}`)
    }
    return result
  }

  /**
   * Estimate gas cost for joinswapPoolAmountOut
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} poolAmountOut will be converted to wei
   * @param {String} maxAmountIn  will be converted to wei
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estJoinswapPoolAmountOut(
    address: string,
    poolAddress: string,
    tokenIn: string,
    poolAmountOut: string,
    maxAmountIn: string,
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .joinswapPoolAmountOut(tokenIn, poolAmountOut, maxAmountIn)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Specify poolAmountOut pool shares that you want to get, and a token tokenIn to pay with. This costs tokenAmountIn tokens (these went into the pool).
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} poolAmountOut will be converted to wei
   * @param {String} maxAmountIn  will be converted to wei
   * @return {TransactionReceipt}
   */
  async joinswapPoolAmountOut(
    account: string,
    poolAddress: string,
    tokenIn: string,
    poolAmountOut: string,
    maxAmountIn: string
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    let maxAmountInFormatted
    maxAmountInFormatted = await this.amountToUnits(tokenIn, maxAmountIn)
    const estGas = await this.estJoinswapPoolAmountOut(
      account,
      poolAddress,
      tokenIn,
      this.web3.utils.toWei(poolAmountOut),
      maxAmountInFormatted
    )
    try {
      result = await pool.methods
        .joinswapPoolAmountOut(
          tokenIn,
          this.web3.utils.toWei(poolAmountOut),
          maxAmountInFormatted
        )
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      this.logger.error('ERROR: Failed to join swap pool amount out')
    }
    return result
  }

  /**
  * Estimate gas cost for joinswapExternAmountIn
  * @param {String} address
     @param {String} poolAddress
   * @param {String} tokenOut
   * @param {String} poolAmountIn will be converted to wei
   * @param {String} minTokenAmountOut  will be converted to wei
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
  public async estExitswapPoolAmountIn(
    address: string,
    poolAddress: string,
    tokenOut: string,
    poolAmountIn: string,
    minTokenAmountOut: string,
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .exitswapPoolAmountIn(tokenOut, poolAmountIn, minTokenAmountOut)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Pay poolAmountIn pool shares into the pool, getting minTokenAmountOut of the given token tokenOut out of the pool.
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} tokenOut
   * @param {String} poolAmountIn will be converted to wei
   * @param {String} minTokenAmountOut  will be converted to wei
   * @return {TransactionReceipt}
   */
  async exitswapPoolAmountIn(
    account: string,
    poolAddress: string,
    tokenOut: string,
    poolAmountIn: string,
    minTokenAmountOut: string
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null
    let minTokenOutFormatted
    minTokenOutFormatted = await this.amountToUnits(tokenOut, minTokenAmountOut)
    const estGas = await this.estExitswapPoolAmountIn(
      account,
      poolAddress,
      tokenOut,
      this.web3.utils.toWei(poolAmountIn),
      minTokenOutFormatted
    )
    try {
      result = await pool.methods
        .exitswapPoolAmountIn(
          tokenOut,
          this.web3.utils.toWei(poolAmountIn),
          minTokenOutFormatted
        )
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to pay pool shares into the pool: ${e.message}`)
    }
    return result
  }

  /**
   * Estimate gas cost for joinswapExternAmountIn
   * @param {String} address
   * @param {String} poolAddress
   * @param {String} tokenOut
   * @param {String} tokenAmountOut will be converted to wei
   * @param {String} maxPoolAmountIn  will be converted to wei
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estExitswapExternAmountOut(
    address: string,
    poolAddress: string,
    tokenOut: string,
    tokenAmountOut: string,
    maxPoolAmountIn: string,
    contractInstance?: Contract
  ): Promise<number> {
    const poolContract =
      contractInstance ||
      new this.web3.eth.Contract(this.poolABI as AbiItem[], poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await poolContract.methods
        .exitswapExternAmountOut(tokenOut, tokenAmountOut, maxPoolAmountIn)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Specify tokenAmountOut of token tokenOut that you want to get out of the pool. This costs poolAmountIn pool shares (these went into the pool).
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} tokenOut
   * @param {String} tokenAmountOut will be converted to wei
   * @param {String} maxPoolAmountIn  will be converted to wei
   * @return {TransactionReceipt}
   */
  async exitswapExternAmountOut(
    account: string,
    poolAddress: string,
    tokenOut: string,
    tokenAmountOut: string,
    maxPoolAmountIn: string
  ): Promise<TransactionReceipt> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let result = null

    const estGas = await this.estExitswapExternAmountOut(
      account,
      poolAddress,
      tokenOut,
      this.web3.utils.toWei(tokenAmountOut),
      this.web3.utils.toWei(maxPoolAmountIn)
    )
    try {
      result = await pool.methods
        .exitswapExternAmountOut(
          tokenOut,
          this.web3.utils.toWei(tokenAmountOut),
          this.web3.utils.toWei(maxPoolAmountIn)
        )
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      this.logger.error('ERROR: Failed to exitswapExternAmountOut')
    }
    return result
  }

  /**
   * Get Spot Price of swaping tokenIn to tokenOut
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenOut
   * @return {String}
   */
  async getSpotPrice(
    poolAddress: string,
    tokenIn: string,
    tokenOut: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let decimalsTokenIn = 18
    let decimalsTokenOut = 18

    const tokenInContract = new this.web3.eth.Contract(
      defaultERC20ABI.abi as AbiItem[],
      tokenIn
    )
    const tokenOutContract = new this.web3.eth.Contract(
      defaultERC20ABI.abi as AbiItem[],
      tokenOut
    )
    try {
      decimalsTokenIn = await tokenInContract.methods.decimals().call()
    } catch (e) {
      this.logger.error('ERROR: FAILED TO CALL DECIMALS(), USING 18')
    }
    try {
      decimalsTokenOut = await tokenOutContract.methods.decimals().call()
    } catch (e) {
      this.logger.error('ERROR: FAILED TO CALL DECIMALS(), USING 18')
    }

    let price = null
    try {
      price = await pool.methods.getSpotPrice(tokenIn, tokenOut).call()
      price = new BigNumber(price.toString())
    } catch (e) {
      this.logger.error('ERROR: Failed to get spot price of swapping tokenIn to tokenOut')
    }

    let decimalsDiff
    if (decimalsTokenIn > decimalsTokenOut) {
      decimalsDiff = decimalsTokenIn - decimalsTokenOut
      price = new BigNumber(price / 10 ** decimalsDiff)
      // console.log(price.toString())
      price = price / 10 ** decimalsTokenOut
      //   console.log('dtIn')
    } else {
      decimalsDiff = decimalsTokenOut - decimalsTokenIn
      price = new BigNumber(price * 10 ** (2 * decimalsDiff))
      price = price / 10 ** decimalsTokenOut
      //   console.log('usdcIn')
    }

    return price.toString()
  }

  public async getAmountInExactOut(
    poolAddress: string,
    tokenIn: string,
    tokenOut: string,
    tokenAmountOut: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let amountOutFormatted
    amountOutFormatted = await this.amountToUnits(tokenOut, tokenAmountOut)

    let amount = null

    try {
      const result = await pool.methods
        .getAmountInExactOut(tokenIn, tokenOut, amountOutFormatted)
        .call()
      amount = await this.unitsToAmount(tokenIn, result)
    } catch (e) {
      this.logger.error('ERROR: Failed to calcInGivenOut')
    }
    return amount
  }

  public async getAmountOutExactIn(
    poolAddress: string,
    tokenIn: string,
    tokenOut: string,
    tokenAmountIn: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)

    let amountInFormatted
    amountInFormatted = await this.amountToUnits(tokenIn, tokenAmountIn)

    let amount = null
    // console.log(amountInFormatted)
    try {
      const result = await pool.methods
        .getAmountOutExactIn(tokenIn, tokenOut, amountInFormatted)
        .call()
      amount = await this.unitsToAmount(tokenOut, result)
    } catch (e) {
      this.logger.error('ERROR: Failed to calcOutGivenIn')
    }
    return amount
  }

  public async calcPoolOutGivenSingleIn(
    poolAddress: string,
    tokenBalanceIn: string,
    tokenWeightIn: string,
    poolSupply: string,
    totalWeight: string,
    tokenAmountIn: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let amount = null
    try {
      const result = await pool.methods
        .calcPoolOutGivenSingleIn(
          this.web3.utils.toWei(tokenBalanceIn),
          this.web3.utils.toWei(tokenWeightIn),
          this.web3.utils.toWei(poolSupply),
          this.web3.utils.toWei(totalWeight),
          this.web3.utils.toWei(tokenAmountIn),
          this.web3.utils.toWei(swapFee)
        )
        .call()
      amount = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to calculate PoolOutGivenSingleIn : ${e.message}`)
    }
    return amount
  }

  public async calcSingleInGivenPoolOut(
    poolAddress: string,
    tokenBalanceIn: string,
    tokenWeightIn: string,
    poolSupply: string,
    totalWeight: string,
    poolAmountOut: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let amount = null
    try {
      const result = await pool.methods
        .calcSingleInGivenPoolOut(
          this.web3.utils.toWei(tokenBalanceIn),
          this.web3.utils.toWei(tokenWeightIn),
          this.web3.utils.toWei(poolSupply),
          this.web3.utils.toWei(totalWeight),
          this.web3.utils.toWei(poolAmountOut),
          this.web3.utils.toWei(swapFee)
        )
        .call()
      amount = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to calculate SingleInGivenPoolOut : ${e.message}`)
    }
    return amount
  }

  public async calcSingleOutGivenPoolIn(
    poolAddress: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    poolSupply: string,
    totalWeight: string,
    poolAmountIn: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let amount = null
    try {
      const result = await pool.methods
        .calcSingleOutGivenPoolIn(
          this.web3.utils.toWei(tokenBalanceOut),
          this.web3.utils.toWei(tokenWeightOut),
          this.web3.utils.toWei(poolSupply),
          this.web3.utils.toWei(totalWeight),
          this.web3.utils.toWei(poolAmountIn),
          this.web3.utils.toWei(swapFee)
        )
        .call()
      amount = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to calculate SingleOutGivenPoolIn : ${e.message}`)
    }
    return amount
  }

  public async calcPoolInGivenSingleOut(
    poolAddress: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    poolSupply: string,
    totalWeight: string,
    tokenAmountOut: string,
    swapFee: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    let amount = null
    try {
      const result = await pool.methods
        .calcPoolInGivenSingleOut(
          this.web3.utils.toWei(tokenBalanceOut),
          this.web3.utils.toWei(tokenWeightOut),
          this.web3.utils.toWei(poolSupply),
          this.web3.utils.toWei(totalWeight),
          this.web3.utils.toWei(tokenAmountOut),
          this.web3.utils.toWei(swapFee)
        )
        .call()
      amount = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to calculate PoolInGivenSingleOut : ${e.message}`)
    }
    return amount
  }

  /**
   * Get LOG_SWAP encoded topic
   * @return {String}
   */
  public getSwapEventSignature(): string {
    const abi = this.poolABI as AbiItem[]
    const eventdata = abi.find(function (o) {
      if (o.name === 'LOG_SWAP' && o.type === 'event') return o
    })
    const topic = this.web3.eth.abi.encodeEventSignature(eventdata as any)
    return topic
  }

  /**
   * Get LOG_JOIN encoded topic
   * @return {String}
   */
  public getJoinEventSignature(): string {
    const abi = this.poolABI as AbiItem[]
    const eventdata = abi.find(function (o) {
      if (o.name === 'LOG_JOIN' && o.type === 'event') return o
    })
    const topic = this.web3.eth.abi.encodeEventSignature(eventdata as any)
    return topic
  }

  /**
   * Get LOG_EXIT encoded topic
   * @return {String}
   */
  public getExitEventSignature(): string {
    const abi = this.poolABI as AbiItem[]
    const eventdata = abi.find(function (o) {
      if (o.name === 'LOG_EXIT' && o.type === 'event') return o
    })
    const topic = this.web3.eth.abi.encodeEventSignature(eventdata as any)
    return topic
  }
}
