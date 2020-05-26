import { OceanAccounts } from './OceanAccounts'

import { Assets } from './Assets'
import { OceanAuth } from './OceanAuth'
import { Compute } from './Compute'

import { OceanTokens } from './OceanTokens'
import { OceanVersions } from './OceanVersions'
import { OceanUtils } from './utils/OceanUtils'

import { Aquarius } from '../aquarius/Aquarius'
import { Brizo } from '../brizo/Brizo'
import { DataTokens } from '../datatokens/Datatokens'
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

        instance.accounts = await OceanAccounts.getInstance(instanceConfig)
        instance.auth = await OceanAuth.getInstance(instanceConfig)
        instance.assets = await Assets.getInstance(instanceConfig)
        instance.compute = await Compute.getInstance(instanceConfig)
        instance.datatokens = new DataTokens(
            instanceConfig.config.factoryAddress,
            instanceConfig.config.factoryABI,
            instanceConfig.config.datatokensABI,
            instanceConfig.config.web3Provider
        )
        instance.tokens = await OceanTokens.getInstance(instanceConfig)
        instance.versions = await OceanVersions.getInstance(instanceConfig)

        return instance
    }

    /**
     * Brizo instance.
     * @type {Brizo}
     */
    public brizo: Brizo

    /**
     * Aquarius instance.
     * @type {Aquarius}
     */
    public aquarius: Aquarius

    /**
     * Ocean account submodule
     * @type {OceanAccounts}
     */
    public accounts: OceanAccounts

    /**
     * Ocean auth submodule
     * @type {OceanAuth}
     */
    public auth: OceanAuth

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
     * Ocean secretStore submodule
     * @type {OceanSecretStore}
     */
    public datatokens: DataTokens

    /**
     * Ocean tokens submodule
     * @type {OceanTokens}
     */
    public tokens: OceanTokens

    /**
     * Ocean versions submodule
     * @type {OceanVersions}
     */
    public versions: OceanVersions

    /**
     * Ocean utils submodule
     * @type {OceanUtils}
     */
    public utils: OceanUtils

    private constructor() {
        super()
    }
}
