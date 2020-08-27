import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import Decimal from 'decimal.js'
import jsonpoolABI from '@oceanprotocol/contracts/artifacts/SPool.json'
import { PoolFactory } from './PoolFactory'

/**
 * Provides an interface to Balancer BPool & BFactory
 */
export interface TokensToAdd {
  address: string
  amount: string
  weight: string
}

export class Pool extends PoolFactory {
  private poolABI: AbiItem | AbiItem[]

  constructor(
    web3: Web3,
    factoryABI: AbiItem | AbiItem[] = null,
    poolABI: AbiItem | AbiItem[] = null,
    factoryAddress: string = null,
    gaslimit?: number
  ) {
    super(web3, factoryABI, factoryAddress, gaslimit)
    if (poolABI) this.poolABI = poolABI
    else this.poolABI = jsonpoolABI.abi as AbiItem[]
  }

  /**
   * Creates a new pool
   */
  async createPool(account: string): Promise<string> {
    return await super.createPool(account)
  }

    /**
     * Setup a new pool by setting datatoken, base token, swap fee and
     * finalizing the pool to make it public.
     *
     * @param account
     * @param poolAddress
     * @param dataToken
     * @param dataTokenAmount
     * @param dataTokenWeight
     * @param baseToken
     * @param baseTokenAmount
     * @param baseTokenWeight
     * @param swapFee
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
    swapFee: string,
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods
        .setup(
          dataToken, dataTokenAmount, dataTokenWeight,
          baseToken, baseTokenAmount, baseTokenWeight,
          swapFee
        ).send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
    }
    return result

  }

  /**
   * Approve spender to spent amount tokens
   * @param {String} account
   * @param {String} tokenAddress
   * @param {String} spender
   * @param {String} amount  (always expressed as wei)
   */
  async approve(
    account: string,
    tokenAddress: string,
    spender: string,
    amount: string
  ): Promise<any> {
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
    let result = null
    try {
      result = await token.methods
        .approve(spender, amount)
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
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
    const minABI = [
      {
        constant: true,
        inputs: [
          {
            name: '_owner',
            type: 'address'
          }
        ],
        name: 'balanceOf',
        outputs: [
          {
            name: 'balance',
            type: 'uint256'
          }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      }
    ] as AbiItem[]

    let result = null

    try {
      const token = new this.web3.eth.Contract(minABI, poolAddress, {
        from: account
      })
      const balance = await token.methods
        .balanceOf(account)
        .call({ from: account, gas: this.GASLIMIT_DEFAULT })
      result = this.web3.utils.fromWei(balance)
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Get total supply of pool tokens
   * @param {String} poolAddress
   * @return {String}
   */
  async totalSupply(poolAddress: string): Promise<string> {
    let result = null

    try {
      const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
      const totalSupply = await pool.methods.totalSupply().call()
      result = this.web3.utils.fromWei(totalSupply)
    } catch (e) {
      console.error(e)
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
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })

    let token
    for (token of tokens) {
      try {
        // approve spending first
        await this.approve(
          account,
          token.address,
          poolAddress,
          this.web3.utils.toWei(token.amount) as any
        )
        await pool.methods
          .bind(
            token.address,
            this.web3.utils.toWei(token.amount),
            this.web3.utils.toWei(token.weight)
          )
          .send({ from: account, gas: this.GASLIMIT_DEFAULT })
      } catch (e) {
        console.error(e)
      }
    }
  }

  /**
   * Set pool fee
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} fee (will be converted to wei)
   */
  async setSwapFee(account: string, poolAddress: string, fee: string): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods
        .setSwapFee(this.web3.utils.toWei(fee))
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Finalize a pool
   * @param {String} account
   * @param {String} poolAddress
   */
  async finalize(account: string, poolAddress: string): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods
        .finalize()
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Get number of tokens composing this pool
   * @param {String} account
   * @param {String} poolAddress
   */
  async getNumTokens(account: string, poolAddress: string): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods.getNumTokens().call()
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Get tokens composing this pool
   * @param {String} account
   * @param {String} poolAddress
   * @return {String[]}
   */
  async getCurrentTokens(account: string, poolAddress: string): Promise<string[]> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods.getCurrentTokens().call()
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Get the final tokens composing this pool
   * @param {String} account
   * @param {String} poolAddress
   * @return {String[]}
   */
  async getFinalTokens(account: string, poolAddress: string): Promise<string[]> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods.getFinalTokens().call()
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Get controller address of this pool
   * @param {String} account
   * @param {String} poolAddress
   * @return {String}
   */
  async getController(account: string, poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods.getController().call()
    } catch (e) {
      console.error(e)
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
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods
        .setController(controllerAddress)
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Get if a token is bounded to a pool
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} token  Address of the token
   * @return {Boolean}
   */
  async isBound(account: string, poolAddress: string, token: string): Promise<boolean> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods.isBound(token).call()
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Get how many tokens are in the pool
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} token  Address of the token
   * @return {String}
   */
  async getReserve(account: string, poolAddress: string, token: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let amount = null
    try {
      const result = await pool.methods.getBalance(token).call()
      amount = this.web3.utils.fromWei(result)
    } catch (e) {
      console.error(e)
    }
    return amount
  }

  /**
   * Get if a pool is finalized
   * @param {String} account
   * @param {String} poolAddress
   * @return {Boolean}
   */
  async isFinalized(account: string, poolAddress: string): Promise<boolean> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods.isFinalized().call()
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Get pool fee
   * @param {String} account
   * @param {String} poolAddress
   * @return {String} Swap fee in wei
   */
  async getSwapFee(account: string, poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let fee = null
    try {
      const result = await pool.methods.getSwapFee().call()
      fee = this.web3.utils.fromWei(result)
    } catch (e) {
      console.error(e)
    }
    return fee
  }

  /**
   * The normalized weight of a token. The combined normalized weights of all tokens will sum up to 1. (Note: the actual sum may be 1 plus or minus a few wei due to division precision loss)
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} token
   * @return {String}
   */
  async getNormalizedWeight(
    account: string,
    poolAddress: string,
    token: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let weight = null
    try {
      const result = await pool.methods.getNormalizedWeight(token).call()
      weight = this.web3.utils.fromWei(result)
    } catch (e) {
      console.error(e)
    }
    return weight
  }

  /**
   * getDenormalizedWeight of a token in pool
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} token
   * @return {String}
   */
  async getDenormalizedWeight(
    account: string,
    poolAddress: string,
    token: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let weight = null
    try {
      const result = await pool.methods.getDenormalizedWeight(token).call()
      weight = this.web3.utils.fromWei(result)
    } catch (e) {
      console.error(e)
    }
    return weight
  }

  /**
   * getTotalDenormalizedWeight in pool
   * @param {String} account
   * @param {String} poolAddress
   * @return {String}
   */
  async getTotalDenormalizedWeight(
    account: string,
    poolAddress: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let weight = null
    try {
      const result = await pool.methods.getTotalDenormalizedWeight().call()
      weight = this.web3.utils.fromWei(result)
    } catch (e) {
      console.error(e)
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
   * @return {any}
   */
  async swapExactAmountIn(
    account: string,
    poolAddress: string,
    tokenIn: string,
    tokenAmountIn: string,
    tokenOut: string,
    minAmountOut: string,
    maxPrice: string
  ): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods
        .swapExactAmountIn(
          tokenIn,
          this.web3.utils.toWei(tokenAmountIn),
          tokenOut,
          this.web3.utils.toWei(minAmountOut),
          this.web3.utils.toWei(maxPrice)
        )
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
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
   * @return {any}
   */
  async swapExactAmountOut(
    account: string,
    poolAddress: string,
    tokenIn: string,
    maxAmountIn: string,
    tokenOut: string,
    minAmountOut: string,
    maxPrice: string
  ): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods
        .swapExactAmountOut(
          tokenIn,
          this.web3.utils.toWei(maxAmountIn),
          tokenOut,
          this.web3.utils.toWei(minAmountOut),
          this.web3.utils.toWei(maxPrice)
        )
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Join the pool, getting poolAmountOut pool tokens. This will pull some of each of the currently trading tokens in the pool, meaning you must have called approve for each token for this pool. These values are limited by the array of maxAmountsIn in the order of the pool tokens.
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} poolAmountOut will be converted to wei
   * @param {String[]} maxAmountsIn  array holding maxAmount per each token, will be converted to wei
   * @return {any}
   */
  async joinPool(
    account: string,
    poolAddress: string,
    poolAmountOut: string,
    maxAmountsIn: string[]
  ): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    const weiMaxAmountsIn = []

    let amount

    for (amount of maxAmountsIn) {
      weiMaxAmountsIn.push(this.web3.utils.toWei(amount))
    }

    let result = null

    try {
      result = await pool.methods
        .joinPool(this.web3.utils.toWei(poolAmountOut), weiMaxAmountsIn)
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Exit the pool, paying poolAmountIn pool tokens and getting some of each of the currently trading tokens in return. These values are limited by the array of minAmountsOut in the order of the pool tokens.
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} poolAmountIn will be converted to wei
   * @param {String[]} minAmountsOut  array holding minAmount per each token, will be converted to wei
   * @return {any}
   */
  async exitPool(
    account: string,
    poolAddress: string,
    poolAmountIn: string,
    minAmountsOut: string
  ): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    const weiMinAmountsOut = []
    let amount
    for (amount of minAmountsOut) {
      weiMinAmountsOut.push(this.web3.utils.toWei(amount))
    }
    let result = null
    try {
      result = await pool.methods
        .exitPool(this.web3.utils.toWei(poolAmountIn), weiMinAmountsOut)
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
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
   * @return {any}
   */
  async joinswapExternAmountIn(
    account: string,
    poolAddress: string,
    tokenIn: string,
    tokenAmountIn: string,
    minPoolAmountOut: string
  ): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods
        .joinswapExternAmountIn(
          tokenIn,
          this.web3.utils.toWei(tokenAmountIn),
          this.web3.utils.toWei(minPoolAmountOut)
        )
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
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
   * @return {any}
   */
  async joinswapPoolAmountOut(
    account: string,
    poolAddress: string,
    tokenIn: string,
    poolAmountOut: string,
    maxAmountIn: string
  ): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods
        .joinswapPoolAmountOut(
          tokenIn,
          this.web3.utils.toWei(poolAmountOut),
          this.web3.utils.toWei(maxAmountIn)
        )
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
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
   * @return {any}
   */
  async exitswapPoolAmountIn(
    account: string,
    poolAddress: string,
    tokenOut: string,
    poolAmountIn: string,
    minTokenAmountOut: string
  ): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods
        .exitswapPoolAmountIn(
          tokenOut,
          this.web3.utils.toWei(poolAmountIn),
          this.web3.utils.toWei(minTokenAmountOut)
        )
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
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
   * @return {any}
   */
  async exitswapExternAmountOut(
    account: string,
    poolAddress: string,
    tokenOut: string,
    tokenAmountOut: string,
    maxPoolAmountIn: string
  ): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let result = null
    try {
      result = await pool.methods
        .exitswapExternAmountOut(
          tokenOut,
          this.web3.utils.toWei(tokenAmountOut),
          this.web3.utils.toWei(maxPoolAmountIn)
        )
        .send({ from: account, gas: this.GASLIMIT_DEFAULT })
    } catch (e) {
      console.error(e)
    }
    return result
  }

  /**
   * Get Spot Price of swaping tokenIn to tokenOut
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenOut
   * @return {any}
   */
  async getSpotPrice(
    account: string,
    poolAddress: string,
    tokenIn: string,
    tokenOut: string
  ): Promise<any> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let price = null
    try {
      const result = await pool.methods.getSpotPrice(tokenIn, tokenOut).call()
      price = this.web3.utils.fromWei(result)
    } catch (e) {
      console.error(e)
    }
    return price
  }

  /**
   * Get Spot Price of swaping tokenIn to tokenOut without fees
   * @param {String} account
   * @param {String} poolAddress
   * @param {String} tokenIn
   * @param {String} tokenOut
   * @return {String}
   */
  async getSpotPriceSansFee(
    account: string,
    poolAddress: string,
    tokenIn: string,
    tokenOut: string
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress, {
      from: account
    })
    let price = null
    try {
      const result = await pool.methods.getSpotPriceSansFee(tokenIn, tokenOut).call()
      price = this.web3.utils.fromWei(result)
    } catch (e) {
      console.error(e)
    }
    return price
  }

  public async calcInGivenOut(
    tokenBalanceIn: string,
    tokenWeightIn: string,
    tokenBalanceOut: string,
    tokenWeightOut: string,
    tokenAmountOut: string,
    swapFee: string
  ): Promise<string> {
    const weightRatio = new Decimal(tokenWeightOut).div(new Decimal(tokenWeightIn))
    const diff = new Decimal(tokenBalanceOut).minus(tokenAmountOut)
    const y = new Decimal(tokenBalanceOut).div(diff)
    const foo = y.pow(weightRatio).minus(new Decimal(1))
    const tokenAmountIn = new Decimal(tokenBalanceIn)
      .times(foo)
      .div(new Decimal(1).minus(new Decimal(swapFee)))

    return tokenAmountIn.toString()
  }
}
