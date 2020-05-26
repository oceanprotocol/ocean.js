import { Instantiable, InstantiableConfig } from '../../Instantiable.abstract'

import { ServiceUtils } from './ServiceUtils'
import { ServiceAgreement } from './ServiceAgreement'
import { SignatureUtils } from './SignatureUtils'
import { WebServiceConnector } from './WebServiceConnector'

/**
 * Utils internal submodule of Ocean Protocol.
 */
export class OceanUtils extends Instantiable {
    /**
     * Returns the instance of OceanUtils.
     * @return {Promise<OceanUtils>}
     */
    public static async getInstance(config: InstantiableConfig): Promise<OceanUtils> {
        const instance = new OceanUtils()
        instance.setInstanceConfig(config)

        instance.agreements = new ServiceAgreement(
            config.ocean,
            config.logger,
            config.web3
        )
        instance.services = new ServiceUtils(config.ocean, config.logger)
        instance.signature = new SignatureUtils(config.web3, config.logger)
        instance.fetch = new WebServiceConnector(config.logger)

        return instance
    }

    /**
     * Agreement utils.
     * @type {ServiceAgreement}
     */
    public agreements: ServiceAgreement

    /**
     * Service utils.
     * @type {ServiceUtils}
     */
    public services: ServiceUtils

    /**
     * Signature utils.
     * @type {SignatureUtils}
     */
    public signature: SignatureUtils

    /**
     * Fetch utils.
     * @type {WebServiceConnector}
     */
    public fetch: WebServiceConnector
}
