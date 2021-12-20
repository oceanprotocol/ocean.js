import Web3 from 'web3'
import { LoggerInstance, getData } from '../utils'
import {
  Asset,
  FileMetadata,
  ComputeJob,
  ComputeOutput,
  ComputeAlgorithm
} from '../@types/'
import { noZeroX } from '../utils/ConversionTypeHelper'
import { signText, signWithHash } from '../utils/SignatureUtils'

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
  async getEndpoints(providerUri: string): Promise<any> {
    try {
      const endpoints = await getData(providerUri)
      return await endpoints.json()
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
      providerEndpoints = await this.getEndpoints(providerUri)
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

  public async createSignature(
    web3: Web3,
    accountId: string,
    agreementId: string
  ): Promise<string> {
    const signature = await signText(web3, noZeroX(agreementId), accountId)
    return signature
  }

  public async createHashSignature(
    web3: Web3,
    accountId: string,
    message: string
  ): Promise<string> {
    const signature = await signWithHash(web3, message, accountId)
    return signature
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
  ): Promise<any> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )

    const args = {
      documentId: did,
      document: document,
      publisherAddress: accountId
    }
    const path = this.getEndpointURL(serviceEndpoints, 'encrypt')
      ? this.getEndpointURL(serviceEndpoints, 'encrypt').urlPath
      : null

    if (!path) return null
    try {
      const response = await fetchMethod(path, decodeURI(JSON.stringify(args)))
      return response
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('HTTP request failed')
    }
  }

  /** Get URL details (if possible)
   * @param {string | DID} url or did
   * @param {string} providerUri Identifier of the asset to be registered in ocean
   * @param {string} fetchMethod fetch client instance
   * @return {Promise<FileMetadata[]>} urlDetails
   */
  public async fileinfo(
    url: string,
    providerUri: string,
    fetchMethod: any
  ): Promise<FileMetadata[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
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
   * @return {Promise<FileMetadata[]>} urlDetails
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
    const providerEndpoints = await this.getEndpoints(providerUri)
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

  /** Allows download of asset data file.
   * @param {string} did
   * @param {string} destination
   * @param {string} accountId
   * @param {FileMetadata[]} files
   * @param {-1} index
   * @param {string} providerUri
   * @param {Web3} web3
   * @param {any} fetchMethod
   * @param {UserCustomParameters} userCustomParameters
   * @return {Promise<any>}
   */
  public async download(
    did: string,
    destination: string,
    accountId: string,
    files: FileMetadata[],
    index = -1,
    providerUri: string,
    web3: Web3,
    fetchMethod: any,
    userCustomParameters?: UserCustomParameters
  ): Promise<any> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const downloadUrl = this.getEndpointURL(serviceEndpoints, 'download')
      ? this.getEndpointURL(serviceEndpoints, 'download').urlPath
      : null

    const nonce = await this.getNonce(
      providerUri,
      accountId,
      fetchMethod,
      providerEndpoints,
      serviceEndpoints
    )
    const signature = await this.createSignature(web3, accountId, did + nonce)

    if (!downloadUrl) return null
    const filesPromises = files
      .filter((_, i) => index === -1 || i === index)
      .map(async ({ index: i, url: fileUrl }) => {
        let consumeUrl = downloadUrl
        consumeUrl += `?index=${i}`
        consumeUrl += `&documentId=${did}`
        consumeUrl += `&consumerAddress=${accountId}`
        consumeUrl += `&url=${fileUrl}`
        consumeUrl += `&signature=${signature}`
        if (userCustomParameters)
          consumeUrl += '&userdata=' + encodeURI(JSON.stringify(userCustomParameters))
        try {
          !destination
            ? await fetchMethod.downloadFileBrowser(consumeUrl)
            : await fetchMethod.downloadFile(consumeUrl, destination, i)
        } catch (e) {
          LoggerInstance.error('Error consuming assets', e)
          throw e
        }
      })
    await Promise.all(filesPromises)
    return destination
  }

  /** Instruct the provider to start a compute job
   * @param {string} did
   * @param {string} consumerAddress
   * @param {ComputeAlgorithm} algorithm
   * @param {string} providerUri
   * @param {Web3} web3
   * @param {any} fetchMethod
   * @param {ComputeOutput} output
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeStart(
    did: string,
    consumerAddress: string,
    algorithm: ComputeAlgorithm,
    providerUri: string,
    web3: Web3,
    fetchMethod: any,
    output?: ComputeOutput
  ): Promise<ComputeJob | ComputeJob[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeStartUrl = this.getEndpointURL(serviceEndpoints, 'computeStart')
      ? this.getEndpointURL(serviceEndpoints, 'computeStart').urlPath
      : null

    const nonce = await this.getNonce(
      providerUri,
      consumerAddress,
      fetchMethod,
      providerEndpoints,
      serviceEndpoints
    )

    let signatureMessage = consumerAddress
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    signatureMessage += nonce
    const signature = await this.createHashSignature(
      web3,
      consumerAddress,
      signatureMessage
    )

    const payload = Object()
    payload.consumerAddress = consumerAddress
    payload.signature = signature
    payload.algorithmDid = algorithm.did
    payload.algorithmMeta = algorithm.meta
    payload.algorithmServiceId = algorithm.serviceIndex
    if (output) payload.output = output

    if (!computeStartUrl) return null
    try {
      const response = await fetchMethod(computeStartUrl, JSON.stringify(payload))
      if (response?.ok) {
        const params = await response.json()
        return params
      }
      console.error('Compute start failed:', response.status, response.statusText)
      LoggerInstance.error('Payload was:', payload)
      return null
    } catch (e) {
      LoggerInstance.error('Compute start failed:')
      LoggerInstance.error(e)
      LoggerInstance.error('Payload was:', payload)
      return null
    }
  }

  /** Instruct the provider to Stop the execution of a to stop a compute job.
   * @param {string} did
   * @param {string} consumerAddress
   * @param {string} jobId
   * @param {string} providerUri
   * @param {Web3} web3
   * @param {any} fetchMethod
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeStop(
    did: string,
    consumerAddress: string,
    jobId: string,
    providerUri: string,
    web3: Web3,
    fetchMethod: any
  ): Promise<ComputeJob | ComputeJob[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeStopUrl = this.getEndpointURL(serviceEndpoints, 'computeStop')
      ? this.getEndpointURL(serviceEndpoints, 'computeStop').urlPath
      : null

    const nonce = await this.getNonce(
      providerUri,
      consumerAddress,
      fetchMethod,
      providerEndpoints,
      serviceEndpoints
    )

    let signatureMessage = consumerAddress
    signatureMessage += jobId || ''
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    signatureMessage += nonce
    const signature = await this.createHashSignature(
      web3,
      consumerAddress,
      signatureMessage
    )

    const payload = Object()
    payload.signature = signature
    payload.documentId = noZeroX(did)
    payload.consumerAddress = consumerAddress
    if (jobId) payload.jobId = jobId

    if (!computeStopUrl) return null
    try {
      const response = await fetchMethod(computeStopUrl, JSON.stringify(payload))
      if (response?.ok) {
        const params = await response.json()
        return params
      }
      LoggerInstance.error('Compute stop failed:', response.status, response.statusText)
      LoggerInstance.error('Payload was:', payload)
      return null
    } catch (e) {
      LoggerInstance.error('Compute stop failed:')
      LoggerInstance.error(e)
      LoggerInstance.error('Payload was:', payload)
      return null
    }
  }

  /** Get status for a specific jobId/documentId/owner.
   * @param {string} did
   * @param {string} consumerAddress
   * @param {string} providerUri
   * @param {Web3} web3
   * @param {any} fetchMethod
   * @param {string} jobId
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeStatus(
    did: string,
    consumerAddress: string,
    providerUri: string,
    web3: Web3,
    fetchMethod: any,
    jobId?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeStatusUrl = this.getEndpointURL(serviceEndpoints, 'computeStatus')
      ? this.getEndpointURL(serviceEndpoints, 'computeStatus').urlPath
      : null

    const nonce = await this.getNonce(
      providerUri,
      consumerAddress,
      fetchMethod,
      providerEndpoints,
      serviceEndpoints
    )

    let signatureMessage = consumerAddress
    signatureMessage += jobId || ''
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    signatureMessage += nonce
    const signature = await this.createHashSignature(
      web3,
      consumerAddress,
      signatureMessage
    )

    let url = '?documentId=' + noZeroX(did)
    url += `&consumerAddress=${consumerAddress}`
    url += (signature && `&signature=${signature}`) || ''
    url += (jobId && `&jobId=${jobId}`) || ''

    if (!computeStatusUrl) return null
    try {
      const response = await fetchMethod(computeStatusUrl + url)
      if (response?.ok) {
        const params = await response.json()
        return params
      }
      LoggerInstance.error(
        'Get compute status failed:',
        response.status,
        response.statusText
      )
      return null
    } catch (e) {
      LoggerInstance.error('Get compute status failed')
      LoggerInstance.error(e)
      return null
    }
  }

  /** Get status for a specific jobId/documentId/owner.
   * @param {string} jobId
   * @param {number} index
   * @param {string} providerUri
   * @param {string} destination
   * @param {Web3} web3
   * @param {any} fetchMethod
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeResult(
    jobId: string,
    index: number,
    destination: string,
    accountId: string,
    providerUri: string,
    web3: Web3,
    fetchMethod: any
  ): Promise<any> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeResultUrl = this.getEndpointURL(serviceEndpoints, 'computeResult')
      ? this.getEndpointURL(serviceEndpoints, 'computeResult').urlPath
      : null

    const nonce = await this.getNonce(
      providerUri,
      accountId,
      fetchMethod,
      providerEndpoints,
      serviceEndpoints
    )

    let signatureMessage = accountId
    signatureMessage += jobId
    signatureMessage += String(index)
    signatureMessage += nonce
    const signature = await this.createHashSignature(web3, accountId, signatureMessage)

    let consumeUrl = computeResultUrl
    consumeUrl += `?consumerAddress=${accountId}`
    consumeUrl += `&jobId=${jobId}`
    consumeUrl += `&index=${String(index)}`
    consumeUrl += (signature && `&signature=${signature}`) || ''

    if (!computeResultUrl) return null
    try {
      !destination
        ? await fetchMethod.downloadFileBrowser(consumeUrl)
        : await fetchMethod.downloadFile(consumeUrl, destination, index)
    } catch (e) {
      LoggerInstance.error('Error getting job result')
      LoggerInstance.error(e)
      throw e
    }
    return destination
  }

  /** Deletes a compute job.
   * @param {string} did
   * @param {string} consumerAddress
   * @param {string} jobId
   * @param {string} providerUri
   * @param {Web3} web3
   * @param {any} fetchMethod
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeDelete(
    did: string,
    consumerAddress: string,
    jobId: string,
    providerUri: string,
    web3: Web3,
    fetchMethod: any
  ): Promise<ComputeJob | ComputeJob[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeDeleteUrl = this.getEndpointURL(serviceEndpoints, 'computeDelete')
      ? this.getEndpointURL(serviceEndpoints, 'computeDelete').urlPath
      : null

    const nonce = await this.getNonce(
      providerUri,
      consumerAddress,
      fetchMethod,
      providerEndpoints,
      serviceEndpoints
    )

    let signatureMessage = consumerAddress
    signatureMessage += jobId || ''
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    signatureMessage += nonce
    const signature = await this.createHashSignature(
      web3,
      consumerAddress,
      signatureMessage
    )

    const payload = Object()
    payload.documentId = noZeroX(did)
    payload.consumerAddress = consumerAddress
    payload.jobId = jobId
    if (signature) payload.signature = signature

    if (!computeDeleteUrl) return null
    try {
      const response = await fetchMethod(computeDeleteUrl, JSON.stringify(payload))
      if (response?.ok) {
        const params = await response.json()
        return params
      }
      LoggerInstance.error(
        'Delete compute job failed:',
        response.status,
        response.statusText
      )
      LoggerInstance.error('Payload was:', payload)
      return null
    } catch (e) {
      LoggerInstance.error('Delete compute job failed:')
      LoggerInstance.error(e)
      LoggerInstance.error('Payload was:', payload)
      return null
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
