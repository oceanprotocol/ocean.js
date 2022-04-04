import { TransactionReceipt } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils/types';
import Web3 from 'web3';
import { Config } from '../../models/index.js';
import { PriceAndFees } from '../..';
export interface FixedPriceExchange {
    active: boolean;
    exchangeOwner: string;
    datatoken: string;
    baseToken: string;
    fixedRate: string;
    dtDecimals: string;
    btDecimals: string;
    dtBalance: string;
    btBalance: string;
    dtSupply: string;
    btSupply: string;
    withMint: boolean;
    allowedSwapper: string;
    exchangeId?: string;
}
export interface FeesInfo {
    opcFee: string;
    marketFee: string;
    marketFeeCollector: string;
    marketFeeAvailable: string;
    oceanFeeAvailable: string;
    exchangeId: string;
}
export interface FixedPriceSwap {
    exchangeId: string;
    caller: string;
    baseTokenAmount: string;
    datatokenAmount: string;
}
export declare enum FixedRateCreateProgressStep {
    CreatingExchange = 0,
    ApprovingDatatoken = 1
}
export declare class FixedRateExchange {
    GASLIMIT_DEFAULT: number;
    /** Ocean related functions */
    oceanAddress: string;
    fixedRateAddress: string;
    fixedRateExchangeAbi: AbiItem | AbiItem[];
    fixedRateContract: Contract;
    web3: Web3;
    contract: Contract;
    config: Config;
    ssAbi: AbiItem | AbiItem[];
    /**
     * Instantiate FixedRateExchange
     * @param {any} web3
     * @param {any} fixedRateExchangeAbi
     */
    constructor(web3: Web3, fixedRateAddress: string, fixedRateExchangeAbi?: AbiItem | AbiItem[], oceanAddress?: string, config?: Config);
    amountToUnits(token: string, amount: string): Promise<string>;
    unitsToAmount(token: string, amount: string): Promise<string>;
    /**
     * Creates unique exchange identifier.
     * @param {String} baseToken baseToken contract address
     * @param {String} datatoken Datatoken contract address
     * @return {Promise<string>} exchangeId
     */
    generateExchangeId(baseToken: string, datatoken: string): Promise<string>;
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
    estBuyDT(account: string, datatokenAddress: string, dtAmount: string, maxBaseTokenAmount: string, consumeMarketAddress: string, consumeMarketFee: string, contractInstance?: Contract): Promise<number>;
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
    buyDT(address: string, exchangeId: string, datatokenAmount: string, maxBaseTokenAmount: string, consumeMarketAddress?: string, consumeMarketFee?: string): Promise<TransactionReceipt>;
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
    estSellDT(account: string, datatokenAddress: string, dtAmount: string, maxBaseTokenAmount: string, consumeMarketAddress: string, consumeMarketFee: string, contractInstance?: Contract): Promise<number>;
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
    sellDT(address: string, exchangeId: string, datatokenAmount: string, minBaseTokenAmount: string, consumeMarketAddress?: string, consumeMarketFee?: string): Promise<TransactionReceipt>;
    /**
     * Gets total number of exchanges
     * @param {String} exchangeId ExchangeId
     * @param {Number} datatokenAmount Amount of datatokens
     * @return {Promise<Number>} no of available exchanges
     */
    getNumberOfExchanges(): Promise<number>;
    /**
     * Estimate gas cost for setRate
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {String} newRate New rate
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estSetRate(account: string, exchangeId: string, newRate: string, contractInstance?: Contract): Promise<number>;
    /**
     * Set new rate
     * @param {String} exchangeId ExchangeId
     * @param {String} newRate New rate
     * @param {String} address User account
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    setRate(address: string, exchangeId: string, newRate: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for setRate
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {String} newAllowedSwapper new allowed swapper address
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estSetAllowedSwapper(account: string, exchangeId: string, newAllowedSwapper: string, contractInstance?: Contract): Promise<number>;
    /**
     * Set new rate
     * @param {String} exchangeId ExchangeId
     * @param {String} newAllowedSwapper newAllowedSwapper (set address zero if we want to remove allowed swapper)
     * @param {String} address User account
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    setAllowedSwapper(address: string, exchangeId: string, newAllowedSwapper: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for activate
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estActivate(account: string, exchangeId: string, contractInstance?: Contract): Promise<number>;
    /**
     * Activate an exchange
     * @param {String} exchangeId ExchangeId
     * @param {String} address User address
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    activate(address: string, exchangeId: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for deactivate
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estDeactivate(account: string, exchangeId: string, contractInstance?: Contract): Promise<number>;
    /**
     * Deactivate an exchange
     * @param {String} exchangeId ExchangeId
     * @param {String} address User address
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    deactivate(address: string, exchangeId: string): Promise<TransactionReceipt>;
    /**
     * Get Rate
     * @param {String} exchangeId ExchangeId
     * @return {Promise<string>} Rate (converted from wei)
     */
    getRate(exchangeId: string): Promise<string>;
    /**
     * Get Datatoken Supply in the exchange
     * @param {String} exchangeId ExchangeId
     * @return {Promise<string>}  dt supply formatted
     */
    getDTSupply(exchangeId: string): Promise<string>;
    /**
     * Get BaseToken Supply in the exchange
     * @param {String} exchangeId ExchangeId
     * @return {Promise<string>} dt supply formatted
     */
    getBTSupply(exchangeId: string): Promise<string>;
    /**
     * Get Allower Swapper (if set this is the only account which can use this exchange, else is set at address(0))
     * @param {String} exchangeId ExchangeId
     * @return {Promise<string>} address of allowedSwapper
     */
    getAllowedSwapper(exchangeId: string): Promise<string>;
    /**
     * calcBaseInGivenOutDT - Calculates how many base tokens are needed to get specified amount of datatokens
     * @param {String} exchangeId ExchangeId
     * @param {string} datatokenAmount Amount of datatokens user wants to buy
     * @param {String} consumeMarketFee consumeMarketFee in fraction
     * @return {Promise<PriceAndFees>} how many base tokens are needed and fees
     */
    calcBaseInGivenOutDT(exchangeId: string, datatokenAmount: string, consumeMarketFee?: string): Promise<PriceAndFees>;
    /**
     * getBTOut - returns amount in baseToken that user will receive for datatokenAmount sold
     * @param {String} exchangeId ExchangeId
     * @param {Number} datatokenAmount Amount of datatokens
     * @param {String} consumeMarketFee consumeMarketFee in fraction
     * @return {Promise<string>} Amount of baseTokens user will receive
     */
    getAmountBTOut(exchangeId: string, datatokenAmount: string, consumeMarketFee?: string): Promise<string>;
    /**
     * Get exchange details
     * @param {String} exchangeId ExchangeId
     * @return {Promise<FixedPricedExchange>} Exchange details
     */
    getExchange(exchangeId: string): Promise<FixedPriceExchange>;
    /**
     * Get fee details for an exchange
     * @param {String} exchangeId ExchangeId
     * @return {Promise<FixedPricedExchange>} Exchange details
     */
    getFeesInfo(exchangeId: string): Promise<FeesInfo>;
    /**
     * Get all exchanges
     * @param {String} exchangeId ExchangeId
     * @return {Promise<String[]>} Exchanges list
     */
    getExchanges(): Promise<string[]>;
    /**
     * Check if an exchange is active
     * @param {String} exchangeId ExchangeId
     * @return {Promise<Boolean>} Result
     */
    isActive(exchangeId: string): Promise<boolean>;
    /**
     * Estimate gas cost for activate
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estActivateMint(account: string, exchangeId: string, contractInstance?: Contract): Promise<number>;
    /**
     * Activate minting option for fixed rate contract
     * @param {String} exchangeId ExchangeId
     * @param {String} address User address
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    activateMint(address: string, exchangeId: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for deactivate
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estDeactivateMint(account: string, exchangeId: string, contractInstance?: Contract): Promise<number>;
    /**
     * Deactivate minting for fixed rate
     * @param {String} exchangeId ExchangeId
     * @param {String} address User address
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    deactivateMint(address: string, exchangeId: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for collectBT
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {String} amount amount to be collected
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estCollectBT(account: string, exchangeId: string, amount: string, contractInstance?: Contract): Promise<number>;
    /**
     * Collect BaseTokens in the contract (anyone can call this, funds are sent to erc20.paymentCollector)
     * @param {String} address User address
     * @param {String} exchangeId ExchangeId
     * @param {String} amount amount to be collected
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    collectBT(address: string, exchangeId: string, amount: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for collecDT
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {String} amount amount to be collected
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estCollectDT(account: string, exchangeId: string, amount: string, contractInstance?: Contract): Promise<number>;
    /**
     * Collect datatokens in the contract (anyone can call this, funds are sent to erc20.paymentCollector)
     * @param {String} address User address
     * @param {String} exchangeId ExchangeId
     * @param {String} amount amount to be collected
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    collectDT(address: string, exchangeId: string, amount: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for collecMarketFee
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estCollectMarketFee(account: string, exchangeId: string, contractInstance?: Contract): Promise<number>;
    /**
     * Collect market fee and send it to marketFeeCollector (anyone can call it)
     * @param {String} exchangeId ExchangeId
     * @param {String} address User address
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    collectMarketFee(address: string, exchangeId: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for collectOceanFee
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estCollectOceanFee(account: string, exchangeId: string, contractInstance?: Contract): Promise<number>;
    /**
     * Collect ocean fee and send it to OPF collector (anyone can call it)
     * @param {String} exchangeId ExchangeId
     * @param {String} address User address
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    collectOceanFee(address: string, exchangeId: string): Promise<TransactionReceipt>;
    /**
     * Get OPF Collector of fixed rate contract
     * @return {String}
     */
    getOPCCollector(): Promise<string>;
    /**
     * Get Router address set in fixed rate contract
     * @return {String}
     */
    getRouter(): Promise<string>;
    /**
     * Get Exchange Owner given an exchangeId
     * @param {String} exchangeId ExchangeId
     * @return {String} return exchange owner
     */
    getExchangeOwner(exchangeId: string): Promise<string>;
    /**
     * Estimate gas cost for updateMarketFee
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {String} newMarketFee New market fee
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estUpdateMarketFee(account: string, exchangeId: string, newMarketFee: string, contractInstance?: Contract): Promise<number>;
    /**
     * Set new market fee, only market fee collector can update it
     * @param {String} address user address
     * @param {String} exchangeId ExchangeId
     * @param {String} newMarketFee New market fee
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    updateMarketFee(address: string, exchangeId: string, newMarketFee: string): Promise<TransactionReceipt>;
    /**
     * Estimate gas cost for updateMarketFeeCollector
     * @param {String} account
     * @param {String} exchangeId ExchangeId
     * @param {String} newMarketFee New market fee collector
     * @param {Contract} contractInstance optional contract instance
     * @return {Promise<number>}
     */
    estUpdateMarketFeeCollector(account: string, exchangeId: string, newMarketFeeCollector: string, contractInstance?: Contract): Promise<number>;
    /**
     * Set new market fee collector, only market fee collector can update it
     * @param {String} address user address
     * @param {String} exchangeId ExchangeId
     * @param {String} newMarketFeeCollector New market fee collector
     * @return {Promise<TransactionReceipt>} transaction receipt
     */
    updateMarketFeeCollector(address: string, exchangeId: string, newMarketFeeCollector: string): Promise<TransactionReceipt>;
}
