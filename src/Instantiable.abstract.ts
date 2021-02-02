import Web3 from 'web3'
import Config from './models/Config'
import { Logger, LoggerInstance } from './utils'
import { Ocean } from './ocean/Ocean'

export interface InstantiableConfig {
  ocean: Ocean
  config?: Config
  web3?: Web3
  logger?: Logger
}

export function generateIntantiableConfigFromConfig(
  config: Config
): Partial<InstantiableConfig> {
  return {
    config,
    web3: config.web3Provider,
    logger: LoggerInstance
  }
}

export abstract class Instantiable {
  protected get ocean(): Ocean {
    if (!this._ocean) {
      LoggerInstance.error('Ocean instance is not defined.')
    }
    return this._ocean
  }

  protected get web3(): Web3 {
    if (!this._web3) {
      LoggerInstance.error('Web3 instance is not defined.')
    }
    return this._web3
  }

  protected get config(): Config {
    if (!this._config) {
      LoggerInstance.error('Config instance is not defined.')
    }
    return this._config
  }

  protected get logger(): Logger {
    return LoggerInstance
  }

  protected get instanceConfig(): InstantiableConfig {
    const { ocean, web3, config, logger } = this
    return { ocean, web3, config, logger }
  }

  public static async getInstance(...args: any[]): Promise<any>

  public static async getInstance(config: InstantiableConfig): Promise<any> {
    LoggerInstance.warn('getInstance() methods has needs to be added to child class.')
  }

  protected static setInstanceConfig<T extends Instantiable>(
    instance: T,
    { ocean, config, web3, logger }: InstantiableConfig
  ) {
    instance._ocean = ocean
    instance._config = config
    instance._web3 = web3
    instance._logger = logger
  }

  private _ocean: Ocean

  private _web3: Web3

  private _config: Config

  private _logger: Logger

  protected setInstanceConfig(config: InstantiableConfig) {
    Instantiable.setInstanceConfig(this, config)
  }
}
