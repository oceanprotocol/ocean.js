import { Asset } from '../../@types'
import { VerifiableCredentialType } from '../../@types/DDO/versions/VerifiableCredential'

export class DDO_V4 {
  /**
   * Get param to order an asset based on the specified pricing schema and configuration.
   * @param {Asset} asset - The asset to be ordered.
   * @param {number} [serviceIndex=0] - Index of the service within the asset.
   */
  getOrderAssetParams(asset: Asset, serviceIndex: number = 0) {
    const did = asset.id
    const serviceId = asset.services[serviceIndex].id
    return { did, serviceId }
  }
}

export class VerifiableCredential {
  /**
   * Get param to order an asset based on the specified pricing schema and configuration.
   * @param {Asset} asset - The asset to be ordered.
   * @param {number} [serviceIndex=0] - Index of the service within the asset.
   */
  getOrderAssetParams(asset: VerifiableCredentialType, serviceIndex: number = 0) {
    const did = asset.credentialSubject.id
    const serviceId = asset.credentialSubject.services[serviceIndex].id
    return { did, serviceId }
  }
}

type AssetType = DDO_V4 | VerifiableCredential

export class DDOFactory {
  static createDDO(data: any): AssetType {
    const { version } = data
    switch (version) {
      case '4.1.0':
      case '4.3.0':
      case '4.5.0':
      case '4.7.0':
        return new DDO_V4()

      case '5.0.0':
        return new VerifiableCredential()

      default:
        throw new Error(`Unsupported DDO version: ${version}`)
    }
  }
}
