import { CredentialSubject } from '../../@types/DDO/CredentialSubject'
import { BaseDDOType } from '../../@types/DDO/versions/BaseDDO'
import { VerifiableCredentialType } from '../../@types/DDO/versions/VerifiableCredential'

export class VerifiableCredential implements BaseDDOType {
  '@context': string[]
  id?: string
  version: string
  credentialSubject: CredentialSubject
  issuer: string

  constructor(data: any) {
    this['@context'] = data['@context']
    this.id = data.id
    this.version = data.version
    this.credentialSubject = data.credentialSubject
    this.issuer = data.issuer
  }

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
