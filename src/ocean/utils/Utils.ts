import { Instantiable, InstantiableConfig } from '../../Instantiable.abstract'

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

    instance.signature = new SignatureUtils(config.web3, config.logger)
    instance.fetch = new WebServiceConnector(config.logger, config.config?.requestTimeout)

    return instance
  }

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
