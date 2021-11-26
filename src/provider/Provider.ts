import { Config } from '../models'
import { LoggerInstance } from '../utils'
import { Asset } from '../ddo/Asset'
import { FileMetadata } from '../interfaces/FileMetadata'

export interface ServiceEndpoint {
  serviceName: string
  method: string
  urlPath: string
}
export interface UserCustomParameters {
  [key: string]: any
}

export class Provider {
  /**
   * Returns the provider endpoints
   * @param {any} fetchMethod
   * @return {Promise<ServiceEndpoint[]>}
   */
  async getEndpoints(providerUri: string, fetchMethod: any): Promise<any> {
    try {
      const endpoints = await await fetchMethod(providerUri).json()
      return endpoints
    } catch (e) {
      LoggerInstance.error('Finding the service endpoints failed:', e)
      return null
    }
  }

  getEndpointURL(
    servicesEndpoints: ServiceEndpoint[],
    serviceName: string
  ): ServiceEndpoint {
    if (!servicesEndpoints) return null
    return servicesEndpoints.find((s) => s.serviceName === serviceName) as ServiceEndpoint
  }

  /**
   * Returns the service endpoints that exist in provider.
   * @param {any} endpoints
   * @return {Promise<ServiceEndpoint[]>}
   */
  public async getServiceEndpoints(providerEndpoint: string, endpoints: any) {
    const serviceEndpoints: ServiceEndpoint[] = []
    for (const i in endpoints.serviceEndpoints) {
      const endpoint: ServiceEndpoint = {
        serviceName: i,
        method: endpoints.serviceEndpoints[i][0],
        urlPath: providerEndpoint + endpoints.serviceEndpoints[i][1]
      }
      serviceEndpoints.push(endpoint)
    }
    return serviceEndpoints
  }

  /** Encrypt DDO using the Provider's own symmetric key
   * @param {string} providerUri provider uri address
   * @param {string} consumerAddress Publisher address
   * @param {string} fetchMethod fetch client instance
   * @param {string} providerEndpoints Identifier of the asset to be registered in ocean
   * @param {string} serviceEndpoints document description object (DDO)=
   * @return {Promise<string>} urlDetails
   */
  public async getNonce(
    providerUri: string,
    consumerAddress: string,
    fetchMethod: any,
    providerEndpoints?: any,
    serviceEndpoints?: ServiceEndpoint[]
  ): Promise<string> {
    if (!providerEndpoints) {
      providerEndpoints = await this.getEndpoints(providerUri, fetchMethod)
    }
    if (!serviceEndpoints) {
      serviceEndpoints = await this.getServiceEndpoints(providerUri, providerEndpoints)
    }
    const path = this.getEndpointURL(serviceEndpoints, 'nonce')
      ? this.getEndpointURL(serviceEndpoints, 'nonce').urlPath
      : null
    if (!path) return null
    try {
      const response = await fetchMethod(path + `?userAddress=${consumerAddress}`)
      return String((await response.json()).nonce)
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('HTTP request failed')
    }
  }

  /** Encrypt DDO using the Provider's own symmetric key
   * @param {string} did Identifier of the asset to be registered in ocean
   * @param {string} accountId Publisher address
   * @param {string} document document description object (DDO)
   * @param {string} providerUri provider uri address
   * @param {string} fetchMethod fetch client instance
   * @return {Promise<string>} urlDetails
   */
  public async encrypt(
    did: string,
    accountId: string,
    document: any,
    providerUri: string,
    fetchMethod: any
  ): Promise<string> {
    const providerEndpoints = await this.getEndpoints(providerUri, fetchMethod)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const args = {
      documentId: did,
      document: JSON.stringify(document),
      publisherAddress: accountId
    }
    const path = this.getEndpointURL(serviceEndpoints, 'encrypt')
      ? this.getEndpointURL(serviceEndpoints, 'encrypt').urlPath
      : null
    if (!path) return null
    try {
      const response = await fetchMethod(path, decodeURI(JSON.stringify(args)))
      return (await response.json()).encryptedDocument
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('HTTP request failed')
    }
  }

  /** Get URL details (if possible)
   * @param {string | DID} url or did
   * @param {string} providerUri Identifier of the asset to be registered in ocean
   * @param {string} fetchMethod fetch client instance
   * @return {Promise<File[]>} urlDetails
   */
  public async fileinfo(
    url: string,
    providerUri: string,
    fetchMethod: any
  ): Promise<FileMetadata[]> {
    const providerEndpoints = await this.getEndpoints(providerUri, fetchMethod)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const args = { url }
    const files: FileMetadata[] = []
    const path = this.getEndpointURL(serviceEndpoints, 'fileinfo')
      ? this.getEndpointURL(serviceEndpoints, 'fileinfo').urlPath
      : null
    if (!path) return null
    try {
      const response = await fetchMethod(path, JSON.stringify(args))
      const results: FileMetadata[] = await response.json()
      for (const result of results) {
        files.push(result)
      }
      return files
    } catch (e) {
      return null
    }
  }

  /** Initialize a service request.
   * @param {DDO | string} asset
   * @param {number} serviceIndex
   * @param {string} serviceType
   * @param {string} consumerAddress
   * @param {UserCustomParameters} userCustomParameters
   * @param {string} providerUri Identifier of the asset to be registered in ocean
   * @param {string} fetchMethod fetch client instance
   * @return {Promise<File[]>} urlDetails
   */
  public async initialize(
    asset: Asset,
    serviceIndex: number,
    serviceType: string,
    consumerAddress: string,
    providerUri: string,
    fetchMethod: any,
    userCustomParameters?: UserCustomParameters
  ): Promise<string> {
    const providerEndpoints = await this.getEndpoints(providerUri, fetchMethod)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    let initializeUrl = this.getEndpointURL(serviceEndpoints, 'initialize')
      ? this.getEndpointURL(serviceEndpoints, 'initialize').urlPath
      : null

    if (!initializeUrl) return null
    initializeUrl += `?documentId=${asset.id}`
    initializeUrl += `&serviceId=${serviceIndex}`
    initializeUrl += `&serviceType=${serviceType}`
    initializeUrl += `&dataToken=${asset.datatokens[0]}` // to check later
    initializeUrl += `&consumerAddress=${consumerAddress}`
    if (userCustomParameters)
      initializeUrl += '&userdata=' + encodeURI(JSON.stringify(userCustomParameters))
    try {
      const response = await fetchMethod(initializeUrl)
      return await response.text()
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('Asset URL not found or not available.')
    }
  }

  /** Check for a valid provider at URL
   * @param {String} url provider uri address
   * @param {String} fetchMethod fetch client instance
   * @return {Promise<boolean>} string
   */
  public async isValidProvider(url: string, fetchMethod: any): Promise<boolean> {
    try {
      const response = await fetchMethod(url)
      if (response?.ok) {
        const params = await response.json()
        if (params && params.providerAddress) return true
      }
      return false
    } catch (error) {
      LoggerInstance.error(`Error validating provider: ${error.message}`)
      return false
    }
  }
}

export const ProviderInstance = new Provider()
export default ProviderInstance
