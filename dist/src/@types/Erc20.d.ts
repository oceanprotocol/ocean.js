export interface Erc20CreateParams {
    templateIndex: number;
    minter: string;
    paymentCollector: string;
    mpFeeAddress: string;
    feeToken: string;
    feeAmount: string;
    cap: string;
    name?: string;
    symbol?: string;
}
export interface ConsumeMarketFee {
    consumeMarketFeeAddress: string;
    consumeMarketFeeToken: string;
    consumeMarketFeeAmount: string;
}
