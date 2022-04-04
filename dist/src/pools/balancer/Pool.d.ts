import Web3 from 'web3';
import { AbiItem } from 'web3-utils/types';
import { TransactionReceipt } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { CurrentFees, TokenInOutMarket, AmountsInMaxFee, AmountsOutMaxFee, PoolPriceAndFees } from '../../@types';
import { Config } from '../../models';
/**
 * Provides an interface to Ocean friendly fork from Balancer BPool
 */
export declare class Pool {
    poolAbi: AbiItem | AbiItem[];
    web3: Web3;
    GASLIMIT_DEFAULT: number;
    private config;
    constructor(web3: Web3, poolAbi?: AbiItem | AbiItem[], config?: Config);
    /**
     * Get user shares of pool tokens
     * @param {String} account
     * @param {String} poolAddress
     * @return {String}
     */
    sharesBalance(account: string, poolAddress: string): Promise<string>;
    /**
     * Estimate gas cost for setSwapFee
     * @param {String} account
     * @param {String} tokenAddress
     * @param {String} spender
     * @param {String} amount
     * @param {String} force
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estSetSwapFee(account: string, poolAddress: string, fee: string, contractInstance?: Contract): Promise<number>;
    /**
     * Allows controller to change the swapFee
     * @param {String} account
     * @param {String} poolAddress
     * @param {String} fee swap fee (1e17 = 10 % , 1e16 = 1% , 1e15 = 0.1%, 1e14 = 0.01%)
     */
    setSwapFee(account: string, poolAddress: string, fee: string): Promise<TransactionReceipt>;
    /**
     * Returns number of tokens bounded to pool
     * @param {String} poolAddress
     * @return {String}
     */
    getNumTokens(poolAddress: string): Promise<string>;
    /**
     * Get total supply of pool shares
     * @param {String} poolAddress
     * @return {String}
     */
    getPoolSharesTotalSupply(poolAddress: string): Promise<string>;
    /**
     * Get tokens composing this poo
     * Returns tokens bounded to pool, before the pool is finalizedl
     * @param {String} poolAddress
     * @return {String[]}
     */
    getCurrentTokens(poolAddress: string): Promise<string[]>;
    /**
     * Get the final tokens composing this pool
     * Returns tokens bounded to pool, after the pool was finalized
     * @param {String} poolAddress
     * @return {String[]}
     */
    getFinalTokens(poolAddress: string): Promise<string[]>;
    /**
     * Returns the current controller address (ssBot)
     * @param {String} poolAddress
     * @return {String}
     */
    getController(poolAddress: string): Promise<string>;
    /**
     * Returns the current baseToken address of the pool
     * @param {String} poolAddress
     * @return {String}
     */
    getBaseToken(poolAddress: string): Promise<string>;
    /**
     * Returns the current datatoken address
     * @param {String} poolAddress
     * @return {String}
     */
    getDatatoken(poolAddress: string): Promise<string>;
    /**
     * Get getMarketFee
     * @param {String} poolAddress
     * @return {String}
     */
    getMarketFee(poolAddress: string): Promise<string>;
    /**
     * Get marketFeeCollector of this pool
     * @param {String} poolAddress
     * @return {String}
     */
    getMarketFeeCollector(poolAddress: string): Promise<string>;
    /**
     * Get OPC Collector of this pool
     * @param {String} poolAddress
     * @return {String}
     */
    getOPCCollector(poolAddress: string): Promise<string>;
    /**
     * Get if a token is bounded to a pool
     *  Returns true if token is bound
     * @param {String} poolAddress
     * @param {String} token  Address of the token to be checked
     * @return {Boolean}
     */
    isBound(poolAddress: string, token: string): Promise<boolean>;
    /**
     * Returns the current token reserve amount
     * @param {String} poolAddress
     * @param {String} token  Address of the token to be checked
     * @return {String}
     */
    getReserve(poolAddress: string, token: string): Promise<string>;
    /**
     * Get if a pool is finalized
     * Returns true if pool is finalized
     * @param {String} poolAddress
     * @return {Boolean}
     */
    isFinalized(poolAddress: string): Promise<boolean>;
    /**
     *  Returns the current Liquidity Providers swap fee
     * @param {String} poolAddress
     * @return {String} Swap fee. To get the percentage value, substract by 100. E.g. `0.1` represents a 10% swap fee.
     */
    getSwapFee(poolAddress: string): Promise<string>;
    /**
     * Returns normalized weight of a token.
     * The combined normalized weights of all tokens will sum up to 1.
     * (Note: the actual sum may be 1 plus or minus a few wei due to division precision loss)
     * @param {String} poolAddress
     * @param {String} token token to be checked
     * @return {String}
     */
    getNormalizedWeight(poolAddress: string, token: string): Promise<string>;
    /**
     *  Returns denormalized weight of a token
     * @param {String} poolAddress
     * @param {String} token token to be checked
     * @return {String}
     */
    getDenormalizedWeight(poolAddress: string, token: string): Promise<string>;
    /**
     * getTotalDenormalizedWeight
     * Returns total denormalized weught of the pool
     * @param {String} poolAddress
     * @return {String}
     */
    getTotalDenormalizedWeight(poolAddress: string): Promise<string>;
    /**
     * Returns the current fee of publishingMarket
     * Get Market Fees available to be collected for a specific token
     * @param {String} poolAddress
     * @param {String} token token we want to check fees
     * @return {String}
     */
    getMarketFees(poolAddress: string, token: string): Promise<string>;
    /**
     * Get Community  Get the current amount of fees which can be withdrawned by the Market
     * @return {CurrentFees}
     */
    getCurrentMarketFees(poolAddress: string): Promise<CurrentFees>;
    /**
     * Get getCurrentOPFFees  Get the current amount of fees which can be withdrawned by OPF
     * @return {CurrentFees}
     */
    getCurrentOPCFees(poolAddress: string): Promise<CurrentFees>;
    /**
     * Get Community Fees available to be collected for a specific token
     * @param {String} poolAddress
     * @param {String} token token we want to check fees
     * @return {String}
     */
    getCommunityFees(poolAddress: string, token: string): Promise<string>;
    /**
     * Estimate gas cost for collectOPF
     * @param {String} address
     * @param {String} poolAddress
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estCollectOPC(address: string, poolAddress: string, contractInstance?: Contract): Promise<number>;
    /**
     * collectOPF - collect opf fee - can be called by anyone
     * @param {String} address
     * @param {String} poolAddress
     * @return {TransactionReceipt}
     */
    collectOPC(address: string, poolAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for collectMarketFee
     * @param {String} address
     * @param {String} poolAddress
     * @param {String} to address that will receive fees
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estCollectMarketFee(address: string, poolAddress: string, contractInstance?: Contract): Promise<number>;
    /**
     * collectOPF - collect market fees - can be called by the publishMarketCollector
     * @param {String} address
     * @param {String} poolAddress
     * @param {String} to address that will receive fees
     * @return {TransactionReceipt}
     */
    collectMarketFee(address: string, poolAddress: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for updatePublishMarketFee
     * @param {String} address
     * @param {String} poolAddress
     * @param {String} newPublishMarketAddress new market address
     * @param {String} newPublishMarketSwapFee new market swap fee
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estUpdatePublishMarketFee(address: string, poolAddress: string, newPublishMarketAddress: string, newPublishMarketSwapFee: string, contractInstance?: Contract): Promise<number>;
    /**
     * updatePublishMarketFee - sets a new  newPublishMarketAddress and new newPublishMarketSwapFee- can be called only by the marketFeeCollector
     * @param {String} address
     * @param {String} poolAddress
     * @param {String} newPublishMarketAddress new market fee collector address
     * @param {String} newPublishMarketSwapFee fee recieved by the publisher market when a dt is swaped from a pool, percent
     * @return {TransactionReceipt}
     */
    updatePublishMarketFee(address: string, poolAddress: string, newPublishMarketAddress: string, newPublishMarketSwapFee: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for swapExactAmountIn
     * @param {String} address
     * @param {String} poolAddress
     * @param {TokenInOutMarket} tokenInOutMarket object contianing addresses like tokenIn, tokenOut, consumeMarketFeeAddress
     * @param {AmountsInMaxFee} amountsInOutMaxFee object contianing tokenAmountIn, minAmountOut, maxPrice, consumeMarketSwapFee
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estSwapExactAmountIn(address: string, poolAddress: string, tokenInOutMarket: TokenInOutMarket, amountsInOutMaxFee: AmountsInMaxFee, contractInstance?: Contract): Promise<number>;
    /**
     * Swaps an exact amount of tokensIn to get a mimum amount of tokenOut
     * Trades an exact tokenAmountIn of tokenIn taken from the caller by the pool,
     * in exchange for at least minAmountOut of tokenOut given to the caller from the pool, with a maximum marginal price of maxPrice.
     * Returns (tokenAmountOut, spotPriceAfter), where tokenAmountOut is the amount of token that came out of the pool,
     * and spotPriceAfter is the new marginal spot price, ie, the result of getSpotPrice after the call.
     * (These values are what are limited by the arguments; you are guaranteed tokenAmountOut >= minAmountOut and spotPriceAfter <= maxPrice).
     * @param {String} address
     * @param {String} poolAddress
     * @param {TokenInOutMarket} tokenInOutMarket object contianing addresses like tokenIn, tokenOut, consumeMarketFeeAddress
     * @param {AmountsInMaxFee} amountsInOutMaxFee object contianing tokenAmountIn, minAmountOut, maxPrice, consumeMarketSwapFee
     * @return {TransactionReceipt}
     */
    swapExactAmountIn(address: string, poolAddress: string, tokenInOutMarket: TokenInOutMarket, amountsInOutMaxFee: AmountsInMaxFee): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for swapExactAmountOut
     * @param {String} address
     * @param {String} poolAddress
     * @param {TokenInOutMarket} tokenInOutMarket
     * @param {AmountsOutMaxFee} amountsInOutMaxFee
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estSwapExactAmountOut(address: string, poolAddress: string, tokenInOutMarket: TokenInOutMarket, amountsInOutMaxFee: AmountsOutMaxFee, contractInstance?: Contract): Promise<number>;
    /**
     * Swaps a maximum  maxAmountIn of tokensIn to get an exact amount of tokenOut
     * @param {String} account
     * @param {String} poolAddress
     * @param {TokenInOutMarket} tokenInOutMarket Object containing addresses like tokenIn, tokenOut, consumeMarketFeeAddress
     * @param {AmountsOutMaxFee} amountsInOutMaxFee Object containging maxAmountIn,tokenAmountOut,maxPrice, consumeMarketSwapFee]
     * @return {TransactionReceipt}
     */
    swapExactAmountOut(account: string, poolAddress: string, tokenInOutMarket: TokenInOutMarket, amountsInOutMaxFee: AmountsOutMaxFee): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for joinPool method
     * @param {String} address
     * @param {String} poolAddress
     * @param {String} poolAmountOut expected number of pool shares that you will get
     * @param {String[]} maxAmountsIn array with maxium amounts spent
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estJoinPool(address: string, poolAddress: string, poolAmountOut: string, maxAmountsIn: string[], contractInstance?: Contract): Promise<number>;
    /**
     * Adds dual side liquidity to the pool (both datatoken and basetoken)
     * This will pull some of each of the currently trading tokens in the pool,
     * meaning you must have called approve for each token for this pool.
     * These values are limited by the array of maxAmountsIn in the order of the pool tokens.
     * @param {String} address
     * @param {String} poolAddress
     * @param {String} poolAmountOut expected number of pool shares that you will get
     * @param {String[]} maxAmountsIn array with maxium amounts spent
     * @return {TransactionReceipt}
     */
    joinPool(address: string, poolAddress: string, poolAmountOut: string, maxAmountsIn: string[]): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for exitPool
     * @param {String} address
     * @param {String} poolAddress
   ``* @param {String} poolAmountIn amount of pool shares spent
     * @param {String[]} minAmountsOut  aarray with minimum amount of tokens expected
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estExitPool(address: string, poolAddress: string, poolAmountIn: string, minAmountsOut: string[], contractInstance?: Contract): Promise<number>;
    /**
     * Removes dual side liquidity from the pool (both datatoken and basetoken)
     * Exit the pool, paying poolAmountIn pool tokens and getting some of each of the currently trading tokens in return.
     * These values are limited by the array of minAmountsOut in the order of the pool tokens.
     * @param {String} account
     * @param {String} poolAddress
     * @param {String} poolAmountIn amount of pool shares spent
     * @param {String[]} minAmountsOut array with minimum amount of tokens expected
     * @return {TransactionReceipt}
     */
    exitPool(account: string, poolAddress: string, poolAmountIn: string, minAmountsOut: string[]): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for joinswapExternAmountIn
     * @param {String} address
     * @param {String} poolAddress
     * @param {String} tokenIn
     * @param {String} tokenAmountIn exact number of base tokens to spend
     * @param {String} minPoolAmountOut minimum of pool shares expectex
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estJoinswapExternAmountIn(address: string, poolAddress: string, tokenAmountIn: string, minPoolAmountOut: string, contractInstance?: Contract): Promise<number>;
    /**
     * Single side add liquidity to the pool,
     * expecting a minPoolAmountOut of shares for spending tokenAmountIn basetokens.
     * Pay tokenAmountIn of baseToken to join the pool, getting poolAmountOut of the pool shares.
     * @param {String} account
     * @param {String} poolAddress
     * @param {String} tokenAmountIn exact number of base tokens to spend
     * @param {String} minPoolAmountOut minimum of pool shares expectex
     * @return {TransactionReceipt}
     */
    joinswapExternAmountIn(account: string, poolAddress: string, tokenAmountIn: string, minPoolAmountOut: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for exitswapPoolAmountIn
     * @param {String} address
     *  @param {String} poolAddress
     * @param {String} poolAmountIn exact number of pool shares to spend
     * @param {String} minTokenAmountOut minimum amount of basetokens expected
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estExitswapPoolAmountIn(address: string, poolAddress: string, poolAmountIn: string, minTokenAmountOut: string, contractInstance?: Contract): Promise<number>;
    /**
     * Single side remove liquidity from the pool,
     * expecting a minAmountOut of basetokens for spending poolAmountIn pool shares
     * Pay poolAmountIn pool shares into the pool, getting minTokenAmountOut of the baseToken
     * @param {String} account
     * @param {String} poolAddress
     * @param {String} poolAmountIn exact number of pool shares to spend
     * @param {String} minTokenAmountOut minimum amount of basetokens expected
     * @return {TransactionReceipt}
     */
    exitswapPoolAmountIn(account: string, poolAddress: string, poolAmountIn: string, minTokenAmountOut: string): Promise<TransactionReceipt>;
    /**
     * Return the spot price of swapping tokenIn to tokenOut
     * @param {String} poolAddress
     * @param {String} tokenIn in token
     * @param {String} tokenOut out token
     * @param {String} swapMarketFe consume market swap fee
     * @return {String}
     */
    getSpotPrice(poolAddress: string, tokenIn: string, tokenOut: string, swapMarketFee: string): Promise<string>;
    /**
     * How many tokensIn do you need in order to get exact tokenAmountOut.
     * Returns: tokenAmountIn, swapFee, opcFee , consumeMarketSwapFee, publishMarketSwapFee
     * Returns: tokenAmountIn, LPFee, opcFee , publishMarketSwapFee, consumeMarketSwapFee
     * @param tokenIn token to be swaped
     * @param tokenOut token to get
     * @param tokenAmountOut exact amount of tokenOut
     * @param swapMarketFee consume market swap fee
     */
    getAmountInExactOut(poolAddress: string, tokenIn: string, tokenOut: string, tokenAmountOut: string, swapMarketFee: string): Promise<PoolPriceAndFees>;
    /**
     *  How many tokensOut you will get for a exact tokenAmountIn
     *  Returns: tokenAmountOut, LPFee, opcFee ,  publishMarketSwapFee, consumeMarketSwapFee
     * @param tokenIn token to be swaped
     * @param tokenOut token to get
     * @param tokenAmountOut exact amount of tokenOut
     * @param _consumeMarketSwapFee consume market swap fee
     */
    getAmountOutExactIn(poolAddress: string, tokenIn: string, tokenOut: string, tokenAmountIn: string, swapMarketFee: string): Promise<PoolPriceAndFees>;
    /**
     * Returns number of poolshares obtain by staking exact tokenAmountIn tokens
     * @param tokenIn tokenIn
     * @param tokenAmountIn exact number of tokens staked
     */
    calcPoolOutGivenSingleIn(poolAddress: string, tokenIn: string, tokenAmountIn: string): Promise<string>;
    /**
     * Returns number of tokens to be staked to the pool in order to get an exact number of poolshares
     * @param tokenIn tokenIn
     * @param poolAmountOut expected amount of pool shares
     */
    calcSingleInGivenPoolOut(poolAddress: string, tokenIn: string, poolAmountOut: string): Promise<string>;
    /**
     * Returns expected amount of tokenOut for removing exact poolAmountIn pool shares from the pool
     * @param tokenOut tokenOut
     * @param poolAmountIn amount of shares spent
     */
    calcSingleOutGivenPoolIn(poolAddress: string, tokenOut: string, poolAmountIn: string): Promise<string>;
    /**
     * Returns number of poolshares needed to withdraw exact tokenAmountOut tokens
     * @param tokenOut tokenOut
     * @param tokenAmountOut expected amount of tokensOut
     */
    calcPoolInGivenSingleOut(poolAddress: string, tokenOut: string, tokenAmountOut: string): Promise<string>;
    /**
     * Get LOG_SWAP encoded topic
     * @return {String}
     */
    getSwapEventSignature(): string;
    /**
     * Get LOG_JOIN encoded topic
     * @return {String}
     */
    getJoinEventSignature(): string;
    /**
     * Get LOG_EXIT encoded topic
     * @return {String}
     */
    getExitEventSignature(): string;
}
