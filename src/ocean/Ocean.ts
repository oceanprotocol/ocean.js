import { Accounts } from './Accounts'
import { Assets } from './Assets'
import { Versions } from './Versions'
import { OceanUtils } from './utils/Utils'
import { MetadataCache } from '../metadatacache/MetadataCache'
import { OnChainMetadata } from '../metadatacache/OnChainMetaData'
import { Provider } from '../provider/Provider'
import { DataTokens } from '../datatokens/Datatokens'
import { Network } from '../datatokens/Network'
import { Config } from '../models/Config'
import {
  Instantiable,
  generateIntantiableConfigFromConfig
} from '../Instantiable.abstract'
import { Compute } from './Compute'
import { OceanPool } from '../balancer/OceanPool'
import { OceanFixedRateExchange } from '../exchange/FixedRateExchange'
import { OceanDispenser } from '../dispenser/Dispenser'
import { ConfigHelperConfig } from '..'
import { EventAccessControl } from './EventAccessControl'

/**
 * Main interface for Ocean Protocol.
 */
export class Ocean extends Instantiable {
  /**
   * Returns the instance of Ocean.
   * @param  {Config} config Ocean instance configuration.
   * @return {Promise<Ocean>}
   */
  public static async getInstance(config: Config): Promise<Ocean> {
    const instance = new Ocean()

    const instanceConfig = {
      ...generateIntantiableConfigFromConfig(config),
      ocean: instance
    }
    instance.setInstanceConfig(instanceConfig)

    instance.utils = await OceanUtils.getInstance(instanceConfig)

    instance.provider = await Provider.getInstance(instanceConfig)

    instance.eventAccessControl = await EventAccessControl.getInstance(instanceConfig)

    instance.metadataCache = new MetadataCache(
      instanceConfig.config.metadataCacheUri,
      instanceConfig.logger,
      instanceConfig.config?.requestTimeout
    )

    instance.accounts = await Accounts.getInstance(instanceConfig)
    // instance.auth = await Auth.getInstance(instanceConfig)
    instance.assets = await Assets.getInstance(instanceConfig)
    instance.compute = await Compute.getInstance(instanceConfig)
    instance.datatokens = new DataTokens(
      instanceConfig.config.factoryAddress,
      instanceConfig.config.factoryABI,
      instanceConfig.config.datatokensABI,
      instanceConfig.config.web3Provider,
      instanceConfig.logger,
      instanceConfig.config as ConfigHelperConfig
    )
    instance.pool = new OceanPool(
      instanceConfig.config.web3Provider,
      instanceConfig.logger,
      instanceConfig.config.poolFactoryABI,
      instanceConfig.config.poolABI,
      instanceConfig.config.poolFactoryAddress,
      instanceConfig.config.oceanTokenAddress,
      instanceConfig.config as ConfigHelperConfig
    )
    instance.fixedRateExchange = new OceanFixedRateExchange(
      instanceConfig.config.web3Provider,
      instanceConfig.logger,
      instanceConfig.config.fixedRateExchangeAddress,
      instanceConfig.config.fixedRateExchangeAddressABI,
      instanceConfig.config.oceanTokenAddress,
      instance.datatokens,
      instanceConfig.config as ConfigHelperConfig
    )
    instance.OceanDispenser = new OceanDispenser(
      instanceConfig.config.web3Provider,
      instanceConfig.logger,
      instanceConfig.config.dispenserAddress,
      instanceConfig.config.dispenserABI,
      instance.datatokens,
      instanceConfig.config as ConfigHelperConfig
    )

    instance.onChainMetadata = new OnChainMetadata(
      instanceConfig.config.web3Provider,
      instanceConfig.logger,
      instanceConfig.config.metadataContractAddress,
      instanceConfig.config.metadataContractABI,
      instance.metadataCache,
      instanceConfig.config as ConfigHelperConfig
    )
    instance.versions = await Versions.getInstance(instanceConfig)
    instance.network = new Network()
    return instance
  }

  /**
   * Network instance
   * @type {Network}
   */
  public network: Network

  /**
   * Provider instance.
   * @type {Provider}
   */
  public provider: Provider

  /**
   * RBAC instance.
   * @type {EventAccessControl}
   */
  public eventAccessControl: EventAccessControl

  /**
   * Web3 provider.
   * @type {any}
   */
  public web3Provider: any

  /**
   * MetadataCache instance.
   * @type {MetadataCache}
   */
  public metadataCache: MetadataCache
  /**
   * OnChainMetadataCache instance.
   * @type {OnChainMetadataCache}
   */
  public onChainMetadata: OnChainMetadata
  /**
   * Ocean account submodule
   * @type {Accounts}
   */
  public accounts: Accounts

  /**
     * Ocean auth submodule
     * @type {OceanAuth}
     
    public auth: OceanAuth
    */

  /**
   * Ocean assets submodule
   * @type {Assets}
   */
  public assets: Assets

  /**
   * Ocean compute submodule
   * @type {Compute}
   */
  public compute: Compute

  /**
   * Ocean DataTokens submodule
   * @type {DataTokens}
   */
  public datatokens: DataTokens

  /**
   * Ocean Pools submodule
   * @type {OceanPool}
   */
  public pool: OceanPool

  /**
   * Ocean FixedRateExchange submodule
   * @type {OceanFixedRateExchange}
   */
  public fixedRateExchange: OceanFixedRateExchange

  /**
   * Ocean Dispenser submodule
   * @type {OceanDispenser}
   */
  public OceanDispenser: OceanDispenser

  /**
     * Ocean tokens submodule
     * @type {OceanTokens}
     
    public tokens: OceanTokens
    */

  /**
   * Ocean versions submodule
   * @type {Versions}
   */
  public versions: Versions

  /**
   * Ocean utils submodule
   * @type {OceanUtils}
   */
  public utils: OceanUtils
}
