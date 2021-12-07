import Web3 from 'web3';
import Config from './models/Config';
import { Logger } from './utils';
import { Ocean } from './ocean/Ocean';
export interface InstantiableConfig {
    ocean: Ocean;
    config?: Config;
    web3?: Web3;
    logger?: Logger;
}
export declare function generateIntantiableConfigFromConfig(config: Config): Partial<InstantiableConfig>;
export declare abstract class Instantiable {
    protected get ocean(): Ocean;
    protected get web3(): Web3;
    protected get config(): Config;
    protected get logger(): Logger;
    protected get instanceConfig(): InstantiableConfig;
    static getInstance(...args: any[]): Promise<any>;
    protected static setInstanceConfig<T extends Instantiable>(instance: T, { ocean, config, web3, logger }: InstantiableConfig): void;
    private _ocean;
    private _web3;
    private _config;
    private _logger;
    protected setInstanceConfig(config: InstantiableConfig): void;
}
