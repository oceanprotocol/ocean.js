import Web3 from 'web3';
export interface Addresses {
    opfCommunityFeeCollectorAddress: string;
    poolTemplateAddress: string;
    erc20TemplateAddress: string;
    erc721TemplateAddress: string;
    oceanAddress: string;
    routerAddress: string;
    sideStakingAddress: string;
    fixedRateAddress: string;
    dispenserAddress: string;
    erc721FactoryAddress: string;
    daiAddress: string;
    usdcAddress: string;
}
export declare const deployContracts: (web3: Web3, owner: string) => Promise<Addresses>;
