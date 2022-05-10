import Web3 from 'web3'
import { LoggerInstance, getData } from '../utils'
import {
  FileMetadata,
  ComputeJob,
  ComputeOutput,
  ComputeAlgorithm,
  ComputeAsset,
  ComputeEnvironment,
  ProviderInitialize,
  ProviderComputeInitializeResults
} from '../@types/'
import { noZeroX } from '../utils/ConversionTypeHelper'
import fetch from 'cross-fetch'
export interface HttpCallback {
  (httpMethod: string, url: string, body: string, header: any): Promise<any>
}

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

  /** Gets current nonce
   * @param {string} providerUri provider uri address
   * @param {string} consumerAddress Publisher address
   * @param {AbortSignal} signal abort signal
   * @param {string} providerEndpoints Identifier of the asset to be registered in ocean
   * @param {string} serviceEndpoints document description object (DDO)=
   * @return {Promise<string>} urlDetails
   */
  public async getNonce(
    providerUri: string,
    consumerAddress: string,
    signal?: AbortSignal,
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
      const response = await fetch(path + `?userAddress=${consumerAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
      return (await response.json()).nonce.toString()
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('HTTP request failed')
    }
  }

  public async signProviderRequest(
    web3: Web3,
    accountId: string,
    message: string,
    password?: string
  ): Promise<string> {
    const consumerMessage = web3.utils.soliditySha3({
      t: 'bytes',
      v: web3.utils.utf8ToHex(message)
    })
    const isMetaMask =
      web3 && web3.currentProvider && (web3.currentProvider as any).isMetaMask
    if (isMetaMask)
      return await web3.eth.personal.sign(consumerMessage, accountId, password)
    else return await web3.eth.sign(consumerMessage, accountId)
  }

  /** Encrypt data using the Provider's own symmetric key
   * @param {string} data data in json format that needs to be sent , it can either be a DDO or a File array
   * @param {string} providerUri provider uri address
   * @param {AbortSignal} signal abort signal
   * @return {Promise<string>} urlDetails
   */
  public async encrypt(
    data: any,
    providerUri: string,
    signal?: AbortSignal
  ): Promise<string> {
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
      const response = await fetch(path, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        signal: signal
      })
      return await response.text()
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('HTTP request failed')
    }
  }

  /** Get DDO File details (if possible)
   * @param {string} did did
   * @param {number} serviceId the id of the service for which to check the files
   * @param {string} providerUri uri of the provider that will be used to check the file
   * @param {AbortSignal} signal abort signal
   * @return {Promise<FileMetadata[]>} urlDetails
   */
  public async checkDidFiles(
    did: string,
    serviceId: number,
    providerUri: string,
    signal?: AbortSignal
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
      const response = await fetch(path, {
        method: 'POST',
        body: JSON.stringify(args),
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
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
   * @param {AbortSignal} signal abort signal
   * @return {Promise<FileMetadata[]>} urlDetails
   */
  public async checkFileUrl(
    url: string,
    providerUri: string,
    signal?: AbortSignal
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
      const response = await fetch(path, {
        method: 'POST',
        body: JSON.stringify(args),
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
      const results: FileMetadata[] = await response.json()
      for (const result of results) {
        files.push(result)
      }
      return files
    } catch (e) {
      return null
    }
  }

  /** Get Compute Environments
   * @return {Promise<ComputeEnvironment[]>} urlDetails
   */
  public async getComputeEnvironments(
    providerUri: string,
    signal?: AbortSignal
  ): Promise<ComputeEnvironment[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const path = this.getEndpointURL(serviceEndpoints, 'computeEnvironments')?.urlPath
    if (!path) return null
    try {
      const response = await fetch(path, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
      const envs: ComputeEnvironment[] = await response.json()
      return envs
    } catch (e) {
      LoggerInstance.error(e.message)
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
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ProviderInitialize>} ProviderInitialize data
   */
  public async initialize(
    did: string,
    serviceId: string,
    fileIndex: number,
    consumerAddress: string,
    providerUri: string,
    signal?: AbortSignal,
    userCustomParameters?: UserCustomParameters,
    computeEnv?: string,
    validUntil?: number
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
    if (computeEnv) initializeUrl += '&environment=' + encodeURI(computeEnv)
    if (validUntil) initializeUrl += '&validUntil=' + validUntil
    try {
      const response = await fetch(initializeUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
      const results: ProviderInitialize = await response.json()
      return results
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('Asset URL not found or not available.')
    }
  }

  /** Initialize a compute request.
   * @param {ComputeAsset} assets
   * @param {ComputeAlgorithmber} algorithm
   * @param {string} computeEnv
   * @param {number} validUntil
   * @param {string} providerUri Identifier of the asset to be registered in ocean
   * @param {string} accountId
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ProviderComputeInitialize>} ProviderComputeInitialize data
   */
  public async initializeCompute(
    assets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    computeEnv: string,
    validUntil: number,
    providerUri: string,
    accountId: string,
    signal?: AbortSignal
  ): Promise<ProviderComputeInitializeResults> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const providerData = {
      datasets: assets,
      algorithm: algorithm,
      compute: {
        env: computeEnv,
        validUntil: validUntil
      },
      consumerAddress: accountId
    }
    const initializeUrl = this.getEndpointURL(serviceEndpoints, 'initializeCompute')
      ? this.getEndpointURL(serviceEndpoints, 'initializeCompute').urlPath
      : null
    if (!initializeUrl) return null
    try {
      const response = await fetch(initializeUrl, {
        method: 'POST',
        body: JSON.stringify(providerData),
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
      const results = await response.json()
      return results
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('ComputeJob cannot be initialized')
    }
  }

  /** Gets fully signed URL for download
   * @param {string} did
   * @param {string} accountId
   * @param {string} serviceId
   * @param {number} fileIndex
   * @param {string} providerUri
   * @param {Web3} web3
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
    const signature = await this.signProviderRequest(web3, accountId, did + nonce)
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
   * @param {string} computeEnv
   * @param {ComputeAlgorithm} algorithm
   * @param {string} providerUri
   * @param {Web3} web3
   * @param {AbortSignal} signal abort signal
   * @param {ComputeOutput} output
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeStart(
    providerUri: string,
    web3: Web3,
    consumerAddress: string,
    computeEnv: string,
    dataset: ComputeAsset,
    algorithm: ComputeAlgorithm,
    signal?: AbortSignal,
    additionalDatasets?: ComputeAsset[],
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

    const nonce = Date.now()
    let signatureMessage = consumerAddress
    signatureMessage += dataset.documentId
    signatureMessage += nonce
    const signature = await this.signProviderRequest(
      web3,
      consumerAddress,
      signatureMessage
    )
    const payload = Object()
    payload.consumerAddress = consumerAddress
    payload.signature = signature
    payload.nonce = nonce
    payload.environment = computeEnv
    payload.dataset = dataset
    payload.algorithm = algorithm
    if (payload.additionalDatasets) payload.additionalDatasets = additionalDatasets
    if (output) payload.output = output
    if (!computeStartUrl) return null
    try {
      const response = await fetch(computeStartUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })

      if (response?.ok) {
        const params = await response.json()
        return params
      }
      LoggerInstance.error('Compute start failed: ', response.status, response.statusText)
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
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeStop(
    did: string,
    consumerAddress: string,
    jobId: string,
    providerUri: string,
    web3: Web3,
    signal?: AbortSignal
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
      signal,
      providerEndpoints,
      serviceEndpoints
    )

    let signatureMessage = consumerAddress
    signatureMessage += jobId || ''
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    signatureMessage += nonce
    const signature = await this.signProviderRequest(
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
      const response = await fetch(computeStopUrl, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })

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

  /** Get compute status for a specific jobId/documentId/owner.
   * @param {string} providerUri The URI of the provider we want to query
   * @param {string} consumerAddress The consumer ethereum address
   * @param {string} jobId The ID of a compute job.
   * @param {string} did The ID of the asset
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeStatus(
    providerUri: string,
    consumerAddress: string,
    jobId?: string,
    did?: string,
    signal?: AbortSignal
  ): Promise<ComputeJob | ComputeJob[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeStatusUrl = this.getEndpointURL(serviceEndpoints, 'computeStatus')
      ? this.getEndpointURL(serviceEndpoints, 'computeStatus').urlPath
      : null

    let url = `?consumerAddress=${consumerAddress}`
    url += (did && `&documentId=${noZeroX(did)}`) || ''
    url += (jobId && `&jobId=${jobId}`) || ''

    if (!computeStatusUrl) return null
    try {
      const response = await fetch(computeStatusUrl + url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
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

  /** Get compute result url
   * @param {string} providerUri The URI of the provider we want to query
   * @param {Web3} web3 Web3 instance
   * @param {string} consumerAddress The consumer ethereum address
   * @param {string} jobId The ID of a compute job.
   * @param {number} index Result index
   * @return {Promise<string>}
   */
  public async getComputeResultUrl(
    providerUri: string,
    web3: Web3,
    consumerAddress: string,
    jobId: string,
    index: number
  ): Promise<string> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeResultUrl = this.getEndpointURL(serviceEndpoints, 'computeResult')
      ? this.getEndpointURL(serviceEndpoints, 'computeResult').urlPath
      : null

    const nonce = Date.now()
    let signatureMessage = consumerAddress
    signatureMessage += jobId
    signatureMessage += index.toString()
    signatureMessage += nonce
    const signature = await this.signProviderRequest(
      web3,
      consumerAddress,
      signatureMessage
    )
    if (!computeResultUrl) return null
    let resultUrl = computeResultUrl
    resultUrl += `?consumerAddress=${consumerAddress}`
    resultUrl += `&jobId=${jobId}`
    resultUrl += `&index=${index.toString()}`
    resultUrl += `&nonce=${nonce}`
    resultUrl += (signature && `&signature=${signature}`) || ''
    return resultUrl
  }

  /** Deletes a compute job.
   * @param {string} did
   * @param {string} consumerAddress
   * @param {string} jobId
   * @param {string} providerUri
   * @param {Web3} web3
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeDelete(
    did: string,
    consumerAddress: string,
    jobId: string,
    providerUri: string,
    web3: Web3,
    signal?: AbortSignal
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
      signal,
      providerEndpoints,
      serviceEndpoints
    )

    let signatureMessage = consumerAddress
    signatureMessage += jobId || ''
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    signatureMessage += nonce
    const signature = await this.signProviderRequest(
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
      const response = await fetch(computeDeleteUrl, {
        method: 'DELETE',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })

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
   * @param {AbortSignal} signal abort signal
   * @return {Promise<boolean>} string
   */
  public async isValidProvider(url: string, signal?: AbortSignal): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
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
