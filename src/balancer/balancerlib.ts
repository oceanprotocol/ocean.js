// import * as jsonFactoryABI from './artifacts/SFactory.json'
// import * as jsonPoolABI from './artifacts/SPool.json'

import * as jsonFactoryABI from './artifacts/BFactory.json'
import * as jsonPoolABI from './artifacts/BPool.json'

/**
 * Provides a interface to Balancer BPool & BFactory
 
 */

export interface TokensToAdd {
    address: string
    amount: string
    weight: string
}

export class BalancerFactory {
    public GASLIMIT_DEFAULT: number = 5000000
    public web3: any = null
    public account: string = null
    private FactoryABI: any
    public factoryAddress: any
    constructor(
        web3: any,
        account: string,
        FactoryABI: any = null,
        factoryAddress: string = null
    ) {
        this.web3 = web3
        this.account = account
        if (FactoryABI) this.FactoryABI = FactoryABI
        else this.FactoryABI = jsonFactoryABI.abi
        if (factoryAddress) {
            this.factoryAddress = factoryAddress
        }
    }

    /**
     * Creates a new pool
     */
    async newPool(): Promise<string> {
        if (this.web3 == null) {
            console.error('Web3 object is null')
            return null
        }
        if (this.account == null) {
            console.error('Account is null')
            return null
        }
        if (this.factoryAddress == null) {
            console.error('bfactoryAddress is null')
            return null
        }
        const factory = new this.web3.eth.Contract(this.FactoryABI, this.factoryAddress, {
            from: this.account
        })
        const transactiondata = await factory.methods
            .newBPool()
            .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        let pooladdress = null
        try {
            pooladdress = transactiondata.events.LOG_NEW_POOL.returnValues[1]
        } catch (e) {
            console.error(e)
        }
        return pooladdress
    }
}

export class BalancerPool extends BalancerFactory {
    private PoolABI: any
    private pool: any = null
    public poolAddress: string = null

    constructor(
        web3: any,
        account: string,
        FactoryABI: any = null,
        PoolABI: any = null,
        factoryAddress: string = null
    ) {
        super(web3, account, FactoryABI, factoryAddress)
        if (PoolABI) this.PoolABI = PoolABI
        else this.PoolABI = jsonPoolABI.abi
    }

    /**
     * Creates a new pool
     */
    async newPool(): Promise<string> {
        const pooladdress = await super.newPool()
        this.poolAddress = pooladdress
        this.pool = new this.web3.eth.Contract(this.PoolABI, pooladdress, {
            from: this.account
        })
        return pooladdress
    }

    /**
     * Loads a new pool
     */
    async loadPool(address: string): Promise<any> {
        if (this.web3 == null) {
            console.error('Web3 object is null')
            return null
        }
        if (this.account == null) {
            console.error('Account is null')
            return null
        }
        if (this.factoryAddress == null) {
            console.error('Cannot init. Maybe wrong network?')
            return null
        }
        try {
            this.pool = new this.web3.eth.Contract(this.PoolABI, address, {
                from: this.account
            })
            this.poolAddress = address
            return address
        } catch (e) {
            console.error(e)
            return null
        }
    }

    /**
     * Approve spender to spent amount tokens
     * @param {String} tokenAddress
     * @param {String} spender
     * @param {String} amount  (always expressed as wei)
     */
    async approve(tokenAddress: string, spender: string, amount: string): Promise<any> {
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
        ]
        const token = new this.web3.eth.Contract(minABI, tokenAddress, {
            from: this.account
        })
        let result = null
        try {
            result = await token.methods
                .approve(spender, amount)
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    async sharesBalance(address: string): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        const tokenAddress = this.poolAddress
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
        ]
        const token = new this.web3.eth.Contract(minABI, tokenAddress, {
            from: this.account
        })
        let result = null
        try {
            result = this.web3.utils.fromWei(
                await token.methods
                    .balanceOf(address)
                    .call({ from: this.account, gas: this.GASLIMIT_DEFAULT })
            )
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Adds tokens to pool
     * @param {Array} tokens Array of token object { address,amount,weight}
     */
    async addToPool(tokens: TokensToAdd[]): Promise<void> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let token
        for (token of tokens) {
            try {
                // approve spending first
                await this.approve(
                    token.address,
                    this.poolAddress,
                    this.web3.utils.toWei(token.amount)
                )
                await this.pool.methods
                    .bind(
                        token.address,
                        this.web3.utils.toWei(token.amount),
                        this.web3.utils.toWei(token.weight)
                    )
                    .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
            } catch (e) {
                console.error(e)
            }
        }
    }

    /**
     * Set pool fee
     * @param {String} fee (will be converted to wei)
     */
    async setSwapFee(fee: string): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods
                .setSwapFee(this.web3.utils.toWei(fee))
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Finalize a pool
     */
    async finalize(): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods
                .finalize()
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Get number of tokens composing this pool
     */
    async getNumTokens(): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods.getNumTokens().call()
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Get tokens composing this pool
     * @return {Array}
     */
    async getCurrentTokens(): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods.getCurrentTokens().call()
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Get the final tokens composing this pool
     * @return {Array}
     */
    async getFinalTokens(): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods.getFinalTokens().call()
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Get controller address of this pool
     * @return {String}
     */
    async getController(): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods.getController().call()
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Set controller address of this pool
     * @param {String} address
     * @return {String}
     */
    async setController(address: string): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods
                .setController(address)
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Get if a token is bounded to a pool
     * @param {String} token  Address of the token
     * @return {Boolean}
     */
    async isBound(token: string): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods.isBound(token).call()
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Get how many tokens are in the pool
     * @param {String} token  Address of the token
     * @return {Boolean}
     */
    async getBalance(token: string): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let amount = null
        try {
            const result = await this.pool.methods.getBalance(token).call()
            amount = this.web3.utils.fromWei(result)
        } catch (e) {
            console.error(e)
        }
        return amount
    }

    /**
     * Get if a pool is finalized
     * @return {Boolean}
     */
    async isFinalized(): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods.isFinalized().call()
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Get pool fee
     * @return {String}
     */
    async getSwapFee(): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let fee = null
        try {
            const result = await this.pool.methods.getSwapFee().call()
            fee = this.web3.utils.fromWei(result)
        } catch (e) {
            console.error(e)
        }
        return fee
    }

    /**
     * The normalized weight of a token. The combined normalized weights of all tokens will sum up to 1. (Note: the actual sum may be 1 plus or minus a few wei due to division precision loss)
     * @param {String} token
     * @return {Number}
     */
    async getNormalizedWeight(token: string): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let weight = null
        try {
            const result = await this.pool.methods.getNormalizedWeight(token).call()
            weight = this.web3.utils.fromWei(result)
        } catch (e) {
            console.error(e)
        }
        return weight
    }

    /**
     * getDenormalizedWeight of a token in pool
     * @param {String} token
     * @return {Number}
     */
    async getDenormalizedWeight(token: string): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let weight = null
        try {
            const result = await this.pool.methods.getDenormalizedWeight(token).call()
            weight = this.web3.utils.fromWei(result)
        } catch (e) {
            console.error(e)
        }
        return weight
    }

    /**
     * getTotalDenormalizedWeight in pool
     * @return {Number}
     */
    async getTotalDenormalizedWeight(): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let weight = null
        try {
            const result = await this.pool.methods.getTotalDenormalizedWeight().call()
            weight = this.web3.utils.fromWei(result)
        } catch (e) {
            console.error(e)
        }
        return weight
    }

    /**
     * swapExactAmountIn - Trades an exact tokenAmountIn of tokenIn taken from the caller by the pool, in exchange for at least minAmountOut of tokenOut given to the caller from the pool, with a maximum marginal price of maxPrice.         Returns (tokenAmountOut, spotPriceAfter), where tokenAmountOut is the amount of token that came out of the pool, and spotPriceAfter is the new marginal spot price, ie, the result of getSpotPrice after the call. (These values are what are limited by the arguments; you are guaranteed tokenAmountOut >= minAmountOut and spotPriceAfter <= maxPrice).
     * @param {String} tokenIn
     * @param {String} tokenAmountIn  will be converted to wei
     * @param {String} tokenOut
     * @param {String} minAmountOut will be converted to wei
     * @param {String} maxPrice will be converted to wei
     * @return {any}
     */
    async swapExactAmountIn(
        tokenIn: string,
        tokenAmountIn: string,
        tokenOut: string,
        minAmountOut: string,
        maxPrice: string
    ): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods
                .swapExactAmountIn(
                    tokenIn,
                    this.web3.utils.toWei(tokenAmountIn),
                    tokenOut,
                    this.web3.utils.toWei(minAmountOut),
                    this.web3.utils.toWei(maxPrice)
                )
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * swapExactAmountOut
     * @param {String} tokenIn
     * @param {String} maxAmountIn  will be converted to wei
     * @param {String} tokenOut
     * @param {String} minAmountOut will be converted to wei
     * @param {String} maxPrice will be converted to wei
     * @return {any}
     */
    async swapExactAmountOut(
        tokenIn: string,
        maxAmountIn: string,
        tokenOut: string,
        minAmountOut: string,
        maxPrice: string
    ): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods
                .swapExactAmountOut(
                    tokenIn,
                    this.web3.utils.toWei(maxAmountIn),
                    tokenOut,
                    this.web3.utils.toWei(minAmountOut),
                    this.web3.utils.toWei(maxPrice)
                )
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Join the pool, getting poolAmountOut pool tokens. This will pull some of each of the currently trading tokens in the pool, meaning you must have called approve for each token for this pool. These values are limited by the array of maxAmountsIn in the order of the pool tokens.
     * @param {String} poolAmountOut will be converted to wei
     * @param {String} maxAmountsIn  array holding maxAmount per each token, will be converted to wei
     * @return {any}
     */
    async joinPool(poolAmountOut: string, maxAmountsIn: any): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        const weiMaxAmountsIn = []
        let amount
        for (amount of maxAmountsIn) {
            weiMaxAmountsIn.push(this.web3.utils.toWei(amount))
        }
        let result = null
        try {
            result = await this.pool.methods
                .joinPool(this.web3.utils.toWei(poolAmountOut), weiMaxAmountsIn)
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Exit the pool, paying poolAmountIn pool tokens and getting some of each of the currently trading tokens in return. These values are limited by the array of minAmountsOut in the order of the pool tokens.
     * @param {String} poolAmountIn will be converted to wei
     * @param {String} maxAmountsIn  array holding maxAmount per each token, will be converted to wei
     * @return {any}
     */
    async exitPool(poolAmountIn: string, minAmountsOut: string): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        const weiMinAmountsOut = []
        let amount
        for (amount of minAmountsOut) {
            weiMinAmountsOut.push(this.web3.utils.toWei(amount))
        }
        let result = null
        try {
            result = await this.pool.methods
                .exitPool(this.web3.utils.toWei(poolAmountIn), weiMinAmountsOut)
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Pay tokenAmountIn of token tokenIn to join the pool, getting poolAmountOut of the pool shares.
     * @param {String} tokenIn
     * @param {String} tokenAmountIn will be converted to wei
     * @param {String} minPoolAmountOut  will be converted to wei
     * @return {any}
     */
    async joinswapExternAmountIn(
        tokenIn: string,
        tokenAmountIn: string,
        minPoolAmountOut: string
    ): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods
                .joinswapExternAmountIn(
                    tokenIn,
                    this.web3.utils.toWei(tokenAmountIn),
                    this.web3.utils.toWei(minPoolAmountOut)
                )
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Specify poolAmountOut pool shares that you want to get, and a token tokenIn to pay with. This costs tokenAmountIn tokens (these went into the pool).
     * @param {String} tokenIn
     * @param {String} poolAmountOut will be converted to wei
     * @param {String} maxAmountIn  will be converted to wei
     * @return {any}
     */
    async joinswapPoolAmountOut(
        tokenIn: string,
        poolAmountOut: string,
        maxAmountIn: string
    ): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods
                .joinswapPoolAmountOut(
                    tokenIn,
                    this.web3.utils.toWei(poolAmountOut),
                    this.web3.utils.toWei(maxAmountIn)
                )
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Pay poolAmountIn pool shares into the pool, getting minTokenAmountOut of the given token tokenOut out of the pool.
     * @param {String} tokenOut
     * @param {String} poolAmountIn will be converted to wei
     * @param {String} minTokenAmountOut  will be converted to wei
     * @return {any}
     */
    async exitswapPoolAmountIn(
        tokenOut: string,
        poolAmountIn: string,
        minTokenAmountOut: string
    ): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods
                .exitswapPoolAmountIn(
                    tokenOut,
                    this.web3.utils.toWei(poolAmountIn),
                    this.web3.utils.toWei(minTokenAmountOut)
                )
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Specify tokenAmountOut of token tokenOut that you want to get out of the pool. This costs poolAmountIn pool shares (these went into the pool).
     * @param {String} tokenOut
     * @param {String} tokenAmountOut will be converted to wei
     * @param {String} maxPoolAmountIn  will be converted to wei
     * @return {any}
     */
    async exitswapExternAmountOut(
        tokenOut: string,
        tokenAmountOut: string,
        maxPoolAmountIn: string
    ): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let result = null
        try {
            result = await this.pool.methods
                .exitswapExternAmountOut(
                    tokenOut,
                    this.web3.utils.toWei(tokenAmountOut),
                    this.web3.utils.toWei(maxPoolAmountIn)
                )
                .send({ from: this.account, gas: this.GASLIMIT_DEFAULT })
        } catch (e) {
            console.error(e)
        }
        return result
    }

    /**
     * Get Spot Price of swaping tokenIn to tokenOut
     * @param {String} tokenIn
     * @param {String} tokenOut
     * @return {any}
     */
    async getSpotPrice(tokenIn: string, tokenOut: string): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let price = null
        try {
            const result = await this.pool.methods.getSpotPrice(tokenIn, tokenOut).call()
            price = this.web3.utils.fromWei(result)
        } catch (e) {
            console.error(e)
        }
        return price
    }

    /**
     * Get Spot Price of swaping tokenIn to tokenOut without fees
     * @param {String} tokenIn
     * @param {String} tokenOut
     * @return {any}
     */
    async getSpotPriceSansFee(tokenIn: string, tokenOut: string): Promise<any> {
        if (this.pool == null) {
            console.error('BPool not initialiez. Maybe you missed newPool or loadPool ?')
            return null
        }
        let price = null
        try {
            const result = await this.pool.methods
                .getSpotPriceSansFee(tokenIn, tokenOut)
                .call()
            price = this.web3.utils.fromWei(result)
        } catch (e) {
            console.error(e)
        }
        return price
    }
}
