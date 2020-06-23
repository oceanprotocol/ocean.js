import { Accounts } from './Accounts'

import { Assets } from './Assets'

// import { Compute } from './Compute'

import { Versions } from './Versions'
import { OceanUtils } from './utils/Utils'

import { Aquarius } from '../aquarius/Aquarius'
import { Brizo } from '../brizo/Brizo'
import { DataTokens } from '../datatokens/Datatokens'
import { Network } from '../datatokens/Network'
import { Config } from '../models/Config'

import {
    Instantiable,
    generateIntantiableConfigFromConfig
} from '../Instantiable.abstract'

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

        instance.brizo = new Brizo(instanceConfig)
        instance.aquarius = new Aquarius(
            instanceConfig.config.aquariusUri,
            instanceConfig.logger
        )

        instance.accounts = await Accounts.getInstance(instanceConfig)
        // instance.auth = await Auth.getInstance(instanceConfig)
        instance.assets = await Assets.getInstance(instanceConfig)
        // instance.compute = await Compute.getInstance(instanceConfig)
        instance.datatokens = new DataTokens(
            instanceConfig.config.factoryAddress,
            instanceConfig.config.factoryABI,
            instanceConfig.config.datatokensABI,
            instanceConfig.config.web3Provider
        )
        instance.versions = await Versions.getInstance(instanceConfig)
        instance.network = new Network()
        return instance
    }

    public network: Network
    /**
     * Brizo instance.
     * @type {Brizo}
     */
    public brizo: Brizo

    /**
     * Web3 provider.
     * @type {any}
     */
    public web3Provider: any

    /**
     * Aquarius instance.
     * @type {Aquarius}
     */
    public aquarius: Aquarius

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
     
    public compute: Compute
    */

    /**
     * Ocean secretStore submodule
     * @type {OceanSecretStore}
     */
    public datatokens: DataTokens

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

    private constructor() {
        super()
    }
}
