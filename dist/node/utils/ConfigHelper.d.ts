import Config from '../models/Config';
export interface ConfigHelperConfig extends Config {
    networkId: number;
    network: string;
    subgraphUri: string;
    explorerUri: string;
    oceanTokenSymbol: string;
    transactionBlockTimeout: number;
    transactionConfirmationBlocks: number;
    transactionPollingTimeout: number;
    gasFeeMultiplier: number;
}
export declare const configHelperNetworks: ConfigHelperConfig[];
export declare class ConfigHelper {
    getAddressesFromEnv(network: string): Partial<ConfigHelperConfig>;
    getConfig(network: string | number, infuraProjectId?: string): Config;
}
