import Web3 from 'web3'
import { LoggerInstance, getData } from '../utils'
import {
  Asset,
  FileMetadata,
  ComputeJob,
  ComputeOutput,
  ComputeAlgorithm,
  ProviderInitialize
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

  /** Encrypt data using the Provider's own symmetric key
   * @param {string} data data in json format that needs to be sent , it can either be a DDO or a File array
   * @param {string} providerUri provider uri address
   * @param {string} postMethod http post method
   * @return {Promise<string>} urlDetails
   */
  public async encrypt(data: any, providerUri: string, postMethod: any): Promise<any> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const path = this.getEndpointURL(serviceEndpoints, 'encrypt')
      ? this.getEndpointURL(serviceEndpoints, 'encrypt').urlPath
      : null

    if (!path) return null
    try {
      const response = await postMethod('POST', path, decodeURI(JSON.stringify(data)), {
        'Content-Type': 'application/octet-stream'
      })
      return response
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('HTTP request failed')
    }
  }

  /** Get DDO File details (if possible)
   * @param {string} did did
   * @param {number} serviceId the id of the service for which to check the files
   * @param {string} providerUri uri of the provider that will be used to check the file
   * @param {any} fetchMethod fetch client instance
   * @return {Promise<FileMetadata[]>} urlDetails
   */
  public async checkDidFiles(
    did: string,
    serviceId: number,
    providerUri: string,
    fetchMethod: any
  ): Promise<FileMetadata[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const args = { did: did, serviceId: serviceId }
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

  /** Get URL details (if possible)
   * @param {string} url or did
   * @param {string} providerUri uri of the provider that will be used to check the file
   * @param {any} fetchMethod fetch client instance
   * @return {Promise<FileMetadata[]>} urlDetails
   */
  public async checkFileUrl(
    url: string,
    providerUri: string,
    fetchMethod: any
  ): Promise<FileMetadata[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const args = { url: url, type: 'url' }
    const files: FileMetadata[] = []
    const path = this.getEndpointURL(serviceEndpoints, 'fileinfo')
      ? this.getEndpointURL(serviceEndpoints, 'fileinfo').urlPath
      : null
    if (!path) return null
    try {
      const response = await fetchMethod('POST', path, JSON.stringify(args))
      const results: FileMetadata[] = await response.json()
      for (const result of results) {
        files.push(result)
      }
      return files
    } catch (e) {
      return null
    }
  }

  /** Lists files from an asset
   * @param {String} documentId The ID of the asset/document (the DID)
   * @param {string} serviceId ServiceId for the asset access service.
   * @param {String} publisherAddress The publisher address
   * @param {Web3} web3 web3 instance
   * @param {String} providerUri uri of the provider that will be used
   * @param {any} getMethod get method client wants to use instance
   * @return {Promise<FileMetadata[]>} returns the list of files for a documentId
   */
  public async getAssetUrls(
    documentId: string,
    serviceId: string,
    publisherAddress: string,
    web3: Web3,
    providerUri: string,
    getMethod: any
  ): Promise<FileMetadata[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const files: FileMetadata[] = []
    const path = this.getEndpointURL(serviceEndpoints, 'asset_urls')
      ? this.getEndpointURL(serviceEndpoints, 'asset_urls').urlPath
      : null
    const nonce = Date.now()
    const signature = await this.createSignature(
      web3,
      publisherAddress,
      documentId + nonce
    )

    let paramsPath = path
    paramsPath += `?documentId=${documentId}`
    paramsPath += `&signature=${signature}`
    paramsPath += `&serviceId=${serviceId}`
    paramsPath += `&nonce=${nonce}`
    paramsPath += `&publisherAddress=${publisherAddress}`
    if (!paramsPath) return null
    try {
      const response = await getMethod('GET', paramsPath)
      const results: FileMetadata[] = await response.json()
      for (const result of results) {
        files.push(result)
      }
      return files
    } catch (e) {
      LoggerInstance.error('getAssetUrls failed ', e)
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
   * @return {Promise<ProviderInitialize>} ProviderInitialize data
   */
  public async initialize(
    did: string,
    serviceId: string,
    fileIndex: number,
    consumerAddress: string,
    providerUri: string,
    getMethod: any,
    userCustomParameters?: UserCustomParameters
  ): Promise<ProviderInitialize> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    let initializeUrl = this.getEndpointURL(serviceEndpoints, 'initialize')
      ? this.getEndpointURL(serviceEndpoints, 'initialize').urlPath
      : null

    if (!initializeUrl) return null
    initializeUrl += `?documentId=${did}`
    initializeUrl += `&serviceId=${serviceId}`
    initializeUrl += `&fileIndex=${fileIndex}`
    initializeUrl += `&consumerAddress=${consumerAddress}`
    if (userCustomParameters)
      initializeUrl += '&userdata=' + encodeURI(JSON.stringify(userCustomParameters))
    try {
      const response = await getMethod('GET', initializeUrl)
      const results: ProviderInitialize = await response.json()
      return results
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('Asset URL not found or not available.')
    }
  }

  /** Gets fully signed URL for download
   * @param {string} did
   * @param {string} accountId
   * @param {string} serviceId
   * @param {number} fileIndex
   * @param {string} providerUri
   * @param {Web3} web3
   * @param {any} fetchMethod
   * @param {UserCustomParameters} userCustomParameters
   * @return {Promise<string>}
   */
  public async getDownloadUrl(
    did: string,
    accountId: string,
    serviceId: string,
    fileIndex: number,
    transferTxId: string,
    providerUri: string,
    web3: Web3,
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
    if (!downloadUrl) return null
    const nonce = Date.now()
    const signature = await this.createSignature(web3, accountId, did + nonce)

    let consumeUrl = downloadUrl
    consumeUrl += `?fileIndex=${fileIndex}`
    consumeUrl += `&documentId=${did}`
    consumeUrl += `&transferTxId=${transferTxId}`
    consumeUrl += `&serviceId=${serviceId}`
    consumeUrl += `&consumerAddress=${accountId}`
    consumeUrl += `&nonce=${nonce}`
    consumeUrl += `&signature=${signature}`
    if (userCustomParameters)
      consumeUrl += '&userdata=' + encodeURI(JSON.stringify(userCustomParameters))
    return consumeUrl
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
