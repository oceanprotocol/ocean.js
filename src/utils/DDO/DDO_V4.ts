import { Asset, Metadata, Service } from '../../@types'
import { BaseDDOType } from '../../@types/DDO/versions/BaseDDO'

export class DDO_V4 implements BaseDDOType {
  '@context': string[]
  id: string
  version: string
  nftAddress: string
  chainId: number
  metadata: Metadata
  services: Service[]

  constructor(data: any) {
    this['@context'] = data['@context']
    this.id = data.id
    this.version = data.version
    this.nftAddress = data.nftAddress
    this.chainId = data.chainId
    this.metadata = data.metadata
    this.services = data.services
  }

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
