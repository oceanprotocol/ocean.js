export interface FreCreationParams {
    fixedRateAddress: string;
    baseTokenAddress: string;
    owner: string;
    marketFeeCollector: string;
    baseTokenDecimals: number;
    datatokenDecimals: number;
    fixedRate: string;
    marketFee: string;
    withMint?: boolean;
    allowedConsumer?: string;
}
export interface FreOrderParams {
    exchangeContract: string;
    exchangeId: string;
    maxBaseTokenAmount: string;
    swapMarketFee: string;
    marketFeeAddress: string;
}
export interface PriceAndFees {
    baseTokenAmount: string;
    oceanFeeAmount: string;
    marketFeeAmount: string;
    consumeMarketFeeAmount: string;
}
