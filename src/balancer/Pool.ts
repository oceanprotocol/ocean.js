import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { TransactionReceipt } from 'web3-core'
import { Logger, getFairGasPrice, setContractDefaults } from '../utils'
import BigNumber from 'bignumber.js'
import jsonpoolABI from '@oceanprotocol/contracts/artifacts/BPool.json'
import defaultDatatokensABI from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
import { PoolFactory } from './PoolFactory'
import Decimal from 'decimal.js'
import { ConfigHelperConfig } from '../utils/ConfigHelper'

const MaxUint256 =
  '115792089237316195423570985008687907853269984665640564039457584007913129639934'
/**
 * Provides an interface to Balancer BPool & BFactory
 */
export interface TokensToAdd {
  address: string
  amount: string
  weight: string
}

export class Pool extends PoolFactory {
  public poolABI: AbiItem | AbiItem[]

  constructor(
    web3: Web3,
    logger: Logger,
    factoryABI: AbiItem | AbiItem[] = null,
    poolABI: AbiItem | AbiItem[] = null,
    factoryAddress: string = null,
    config?: ConfigHelperConfig
  ) {
    super(web3, logger, factoryABI, factoryAddress, config)
    if (poolABI) this.poolABI = poolABI
    else this.poolABI = jsonpoolABI.abi as AbiItem[]
  }

  /**
   * Creates a new pool
   */
  async createPool(account: string): Promise<TransactionReceipt> {
    return await super.createPool(account)
  }

  /**
   * Setup a new pool by setting datatoken, base token, swap fee and
   * finalizing the pool to make it public.
   *
   * @param {String} account ethereum address to use for sending this transaction
   * @param {String} poolAddress address of new Balancer Pool
   * @param {String} dataToken address of datatoken ERC20 contract
   * @param {String} dataTokenAmount in wei
   * @param {String} dataTokenWeight in wei
   * @param {String} baseToken address of base token ERC20 contract
   * @param {String} baseTokenAmount in wei
   * @param {String} baseTokenWeight in wei
   * @param {String} swapFee in wei
   */
  async setup(
    account: string,
    poolAddress: string,
    dataToken: string,
    dataTokenAmount: string,
    dataTokenWeight: string,
    baseToken: string,
    baseTokenAmount: string,
    baseTokenWeight: string,
    swapFee: string
  ): Promise<string> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    let result = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await pool.methods
        .setup(
          dataToken,
          dataTokenAmount,
          dataTokenWeight,
          baseToken,
          baseTokenAmount,
          baseTokenWeight,
          swapFee
        )
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      result = await pool.methods
        .setup(
          dataToken,
          dataTokenAmount,
          dataTokenWeight,
          baseToken,
          baseTokenAmount,
          baseTokenWeight,
          swapFee
        )
        .send({
          from: account,
          gas: estGas,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to setup a pool: ${e.message}`)
    }
    return result
  }

  /**
   * Get Alloance for both DataToken and Ocean
   * @param {String } tokenAdress
   * @param {String} owner
   * @param {String} spender
   */
  public async allowance(
    tokenAdress: string,
    owner: string,
    spender: string
  ): Promise<string> {
    const tokenAbi = defaultDatatokensABI.abi as AbiItem[]
    const datatoken = setContractDefaults(
      new this.web3.eth.Contract(tokenAbi, tokenAdress, {
        from: spender
      }),
      this.config
    )
    const trxReceipt = await datatoken.methods.allowance(owner, spender).call()
    return this.web3.utils.fromWei(trxReceipt)
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
    const token = setContractDefaults(
      new this.web3.eth.Contract(minABI, tokenAddress, {
        from: account
      }),
      this.config
    )
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
        .approve(spender, amount)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    try {
      result = await token.methods.approve(spender, amount).send({
        from: account,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
      const token = setContractDefaults(
        new this.web3.eth.Contract(this.poolABI, poolAddress),
        this.config
      )
      const balance = await token.methods.balanceOf(account).call()
      result = this.web3.utils.fromWei(balance)
    } catch (e) {
      this.logger.error(`ERROR: Failed to get shares of pool : ${e.message}`)
    }
    return result
  }

  /**
   * Adds tokens to pool
   * @param {String} account
   * @param {String} poolAddress
   * @param {Array} tokens Array of token object { address,amount,weight}
   */
  async addToPool(
    account: string,
    poolAddress: string,
    tokens: TokensToAdd[]
  ): Promise<void> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )

    let token
    for (token of tokens) {
      try {
        // approve spending first
        await this.approve(
          account,
          token.address,
          poolAddress,
          this.web3.utils.toWei(`${token.amount}`)
        )
        await pool.methods
          .bind(
            token.address,
            this.web3.utils.toWei(token.amount),
            this.web3.utils.toWei(token.weight)
          )
          .send({
            from: account,
            gas: this.GASLIMIT_DEFAULT,
            gasPrice: await getFairGasPrice(this.web3, this.config)
          })
      } catch (e) {
        this.logger.error(`ERROR: Failed to add tokens to pool: ${e.message}`)
      }
    }
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    let result = null
    try {
      result = await pool.methods.setSwapFee(this.web3.utils.toWei(fee)).send({
        from: account,
        gas: this.GASLIMIT_DEFAULT,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    } catch (e) {
      this.logger.error(`ERROR: Failed to set pool swap fee: ${e.message}`)
    }
    return result
  }

  /**
   * Finalize a pool
   * @param {String} account
   * @param {String} poolAddress
   */
  async finalize(account: string, poolAddress: string): Promise<TransactionReceipt> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    let result = null
    try {
      result = await pool.methods.finalize().send({
        from: account,
        gas: this.GASLIMIT_DEFAULT,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    } catch (e) {
      this.logger.error(`ERROR: Failed to finalize pool: ${e.message}`)
    }
    return result
  }

  /**
   * Get number of tokens composing this pool
   * @param {String} poolAddress
   * @return {String}
   */
  async getNumTokens(poolAddress: string): Promise<string> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
    let result = null
    try {
      result = await pool.methods.getController().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get pool controller address: ${e.message}`)
    }
    return result
  }

  /**
   * Set controller address of this pool
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} controllerAddress
   * @return {String}
   */
  async setController(
    account: string,
    poolAddress: string,
    controllerAddress: string
  ): Promise<string> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    let result = null
    try {
      result = await pool.methods
        .setController(controllerAddress)
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      this.logger.error(`ERROR: Failed to set pool controller: ${e.message}`)
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
      const pool = setContractDefaults(
        new this.web3.eth.Contract(this.poolABI, poolAddress),
        this.config
      )
      const result = await pool.methods.getBalance(token).call()
      amount = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error(`ERROR: Failed to get how many tokens \
      are in the pool: ${e.message}`)
    }
    return amount
  }

  /**
   * Get if a pool is finalized
   * @param {String} poolAddress
   * @return {Boolean}
   */
  async isFinalized(poolAddress: string): Promise<boolean> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
   * swapExactAmountIn - Trades an exact tokenAmountIn of tokenIn taken from the caller by the pool, in exchange for at least minAmountOut of tokenOut given to the caller from the pool, with a maximum marginal price of maxPrice.         Returns (tokenAmountOut, spotPriceAfter), where tokenAmountOut is the amount of token that came out of the pool, and spotPriceAfter is the new marginal spot price, ie, the result of getSpotPrice after the call. (These values are what are limited by the arguments; you are guaranteed tokenAmountOut >= minAmountOut and spotPriceAfter <= maxPrice).
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenAmountIn  will be converted to wei
   * @param {String} tokenOut
   * @param {String} minAmountOut will be converted to wei
   * @param {String} maxPrice will be converted to wei
   * @return {TransactionReceipt}
   */
  async swapExactAmountIn(
    account: string,
    poolAddress: string,
    tokenIn: string,
    tokenAmountIn: string,
    tokenOut: string,
    minAmountOut: string,
    maxPrice?: string
  ): Promise<TransactionReceipt> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    let result = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await pool.methods
        .swapExactAmountIn(
          tokenIn,
          this.web3.utils.toWei(tokenAmountIn),
          tokenOut,
          this.web3.utils.toWei(minAmountOut),
          maxPrice ? this.web3.utils.toWei(maxPrice) : MaxUint256
        )
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas swapExactAmountIn')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      result = await pool.methods
        .swapExactAmountIn(
          tokenIn,
          this.web3.utils.toWei(tokenAmountIn),
          tokenOut,
          this.web3.utils.toWei(minAmountOut),
          maxPrice ? this.web3.utils.toWei(maxPrice) : MaxUint256
        )
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swap exact amount in : ${e.message}`)
    }
    return result
  }

  /**
   * swapExactAmountOut
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} maxAmountIn  will be converted to wei
   * @param {String} tokenOut
   * @param {String} minAmountOut will be converted to wei
   * @param {String} maxPrice will be converted to wei
   * @return {TransactionReceipt}
   */
  async swapExactAmountOut(
    account: string,
    poolAddress: string,
    tokenIn: string,
    maxAmountIn: string,
    tokenOut: string,
    minAmountOut: string,
    maxPrice?: string
  ): Promise<TransactionReceipt> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    let result = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await pool.methods
        .swapExactAmountOut(
          tokenIn,
          this.web3.utils.toWei(maxAmountIn),
          tokenOut,
          this.web3.utils.toWei(minAmountOut),
          maxPrice ? this.web3.utils.toWei(maxPrice) : MaxUint256
        )
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
      this.logger.log('Error estimate gas swapExactAmountIn')
      this.logger.log(e)
    }
    try {
      result = await pool.methods
        .swapExactAmountOut(
          tokenIn,
          this.web3.utils.toWei(maxAmountIn),
          tokenOut,
          this.web3.utils.toWei(minAmountOut),
          maxPrice ? this.web3.utils.toWei(maxPrice) : MaxUint256
        )
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swap exact amount out: ${e.message}`)
    }
    return result
  }

  /**
   * Join the pool, getting poolAmountOut pool tokens. This will pull some of each of the currently trading tokens in the pool, meaning you must have called approve for each token for this pool. These values are limited by the array of maxAmountsIn in the order of the pool tokens.
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} poolAmountOut will be converted to wei
   * @param {String[]} maxAmountsIn  array holding maxAmount per each token, will be converted to wei
   * @return {TransactionReceipt}
   */
  async joinPool(
    account: string,
    poolAddress: string,
    poolAmountOut: string,
    maxAmountsIn: string[]
  ): Promise<TransactionReceipt> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    const weiMaxAmountsIn = []

    let amount: string

    for (amount of maxAmountsIn) {
      weiMaxAmountsIn.push(this.web3.utils.toWei(amount))
    }

    let result = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await pool.methods
        .joinPool(this.web3.utils.toWei(poolAmountOut), weiMaxAmountsIn)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      result = await pool.methods
        .joinPool(this.web3.utils.toWei(poolAmountOut), weiMaxAmountsIn)
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to join pool: ${e.message}`)
    }
    return result
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    const weiMinAmountsOut = []
    let amount: string

    for (amount of minAmountsOut) {
      weiMinAmountsOut.push(this.web3.utils.toWei(amount))
    }
    let result = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await pool.methods
        .exitPool(this.web3.utils.toWei(poolAmountIn), weiMinAmountsOut)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      result = await pool.methods
        .exitPool(this.web3.utils.toWei(poolAmountIn), weiMinAmountsOut)
        .send({
          from: account,
          gas: estGas,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to exit pool: ${e.message}`)
    }
    return result
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    let result = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await pool.methods
        .joinswapExternAmountIn(
          tokenIn,
          this.web3.utils.toWei(tokenAmountIn),
          this.web3.utils.toWei(minPoolAmountOut)
        )
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      result = await pool.methods
        .joinswapExternAmountIn(
          tokenIn,
          this.web3.utils.toWei(tokenAmountIn),
          this.web3.utils.toWei(minPoolAmountOut)
        )
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to pay tokens in order to \
      join the pool: ${e.message}`)
    }
    return result
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    let result = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await pool.methods
        .joinswapPoolAmountOut(
          tokenIn,
          this.web3.utils.toWei(poolAmountOut),
          this.web3.utils.toWei(maxAmountIn)
        )
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      result = await pool.methods
        .joinswapPoolAmountOut(
          tokenIn,
          this.web3.utils.toWei(poolAmountOut),
          this.web3.utils.toWei(maxAmountIn)
        )
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
    } catch (e) {
      this.logger.error('ERROR: Failed to join swap pool amount out')
    }
    return result
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    let result = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await pool.methods
        .exitswapPoolAmountIn(
          tokenOut,
          this.web3.utils.toWei(poolAmountIn),
          this.web3.utils.toWei(minTokenAmountOut)
        )
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      result = await pool.methods
        .exitswapPoolAmountIn(
          tokenOut,
          this.web3.utils.toWei(poolAmountIn),
          this.web3.utils.toWei(minTokenAmountOut)
        )
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to pay pool shares into the pool: ${e.message}`)
    }
    return result
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
    const gasLimitDefault = this.GASLIMIT_DEFAULT

    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress, {
        from: account
      }),
      this.config
    )
    let result = null
    let estGas

    try {
      estGas = await pool.methods
        .exitswapExternAmountOut(
          tokenOut,
          this.web3.utils.toWei(tokenAmountOut),
          this.web3.utils.toWei(maxPoolAmountIn)
        )
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

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
          gasPrice: await getFairGasPrice(this.web3, this.config)
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
    let price = null
    try {
      const result = await pool.methods.getSpotPrice(tokenIn, tokenOut).call()
      price = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error('ERROR: Failed to get spot price of swapping tokenIn to tokenOut')
    }
    return price
  }

  /**
   * Get Spot Price of swaping tokenIn to tokenOut without fees
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenOut
   * @return {String}
   */
  async getSpotPriceSansFee(
    poolAddress: string,
    tokenIn: string,
    tokenOut: string
  ): Promise<string> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
    let price = null
    try {
      const result = await pool.methods.getSpotPriceSansFee(tokenIn, tokenOut).call()
      price = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error('ERROR: Failed to getSpotPriceSansFee')
    }
    return price
  }

  public async calcSpotPrice(
    poolAddress: string,
    tokenBalanceIn: string,
    tokenWeightIn: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    swapFee: string
  ): Promise<string> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
    let amount = '0'
    try {
      const result = await pool.methods
        .calcSpotPrice(
          this.web3.utils.toWei(tokenBalanceIn),
          this.web3.utils.toWei(tokenWeightIn),
          this.web3.utils.toWei(tokenBalanceOut),
          this.web3.utils.toWei(tokenWeightOut),
          this.web3.utils.toWei(swapFee)
        )
        .call()
      amount = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error('ERROR: Failed to call calcSpotPrice')
    }
    return amount
  }

  public async calcInGivenOut(
    poolAddress: string,
    tokenBalanceIn: string,
    tokenWeightIn: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    tokenAmountOut: string,
    swapFee: string
  ): Promise<string> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
    let amount = null
    if (new Decimal(tokenAmountOut).gte(tokenBalanceOut)) return null
    try {
      const result = await pool.methods
        .calcInGivenOut(
          this.web3.utils.toWei(tokenBalanceIn),
          this.web3.utils.toWei(tokenWeightIn),
          this.web3.utils.toWei(tokenBalanceOut),
          this.web3.utils.toWei(tokenWeightOut),
          this.web3.utils.toWei(tokenAmountOut),
          this.web3.utils.toWei(swapFee)
        )
        .call()
      amount = this.web3.utils.fromWei(result)
    } catch (e) {
      this.logger.error('ERROR: Failed to calcInGivenOut')
    }
    return amount
  }

  public async calcOutGivenIn(
    poolAddress: string,
    tokenBalanceIn: string,
    tokenWeightIn: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    tokenAmountIn: string,
    swapFee: string
  ): Promise<string> {
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
    let amount = null
    try {
      const result = await pool.methods
        .calcOutGivenIn(
          this.web3.utils.toWei(tokenBalanceIn),
          this.web3.utils.toWei(tokenWeightIn),
          this.web3.utils.toWei(tokenBalanceOut),
          this.web3.utils.toWei(tokenWeightOut),
          this.web3.utils.toWei(tokenAmountIn),
          this.web3.utils.toWei(swapFee)
        )
        .call()
      amount = this.web3.utils.fromWei(result)
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
    const pool = setContractDefaults(
      new this.web3.eth.Contract(this.poolABI, poolAddress),
      this.config
    )
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
