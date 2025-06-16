import fetch from 'cross-fetch'
import { ethers, Signer, providers } from 'ethers'
import { LoggerInstance } from '../utils/Logger.js'
import {
  Arweave,
  FileInfo,
  ComputeJob,
  ComputeOutput,
  ComputeAlgorithm,
  ComputeAsset,
  ComputeEnvironment,
  ProviderInitialize,
  ProviderComputeInitializeResults,
  ServiceEndpoint,
  UrlFile,
  UserCustomParameters,
  Ipfs,
  ComputeResourceRequest,
  ComputePayment
} from '../@types'

export class Provider {
  /**
   * Returns the provider endpoints
   * @param {string} providerUri - the provider url
   * @return {Promise<any>}
   */
  async getEndpoints(providerUri: string, authorization?: string): Promise<any> {
    try {
      const endpoints = await this.getData(providerUri, authorization)
      return await endpoints.json()
    } catch (e) {
      LoggerInstance.error('Finding the service endpoints failed:', e)
      throw new Error('HTTP request failed calling Provider')
    }
  }

  /**
   * This function returns the endpoint URL for a given service name.
   * @param {ServiceEndpoint[]} servicesEndpoints - The array of service endpoints
   * @param {string} serviceName - The name of the service
   * @returns {ServiceEndpoint} The endpoint URL for the given service name
   */
  getEndpointURL(
    servicesEndpoints: ServiceEndpoint[],
    serviceName: string
  ): ServiceEndpoint {
    if (!servicesEndpoints) return null
    return servicesEndpoints.find(
      (s) => s.serviceName.toLowerCase() === serviceName.toLowerCase()
    ) as ServiceEndpoint
  }

  /**
   * This function returns an array of service endpoints for a given provider endpoint.
   * @param {string} providerEndpoint - The provider endpoint
   * @param {any} endpoints - The endpoints object
   * @returns {ServiceEndpoint[]} An array of service endpoints
   */
  public async getServiceEndpoints(providerEndpoint: string, endpoints: any) {
    const serviceEndpoints: ServiceEndpoint[] = []
    for (const i in endpoints.serviceEndpoints) {
      const endpoint: ServiceEndpoint = {
        serviceName: i,
        method: endpoints.serviceEndpoints[i][0],
        urlPath:
          providerEndpoint.replace(/\/+$/, '') +
          '/' +
          endpoints.serviceEndpoints[i][1].replace(/^\/+/, '')
      }
      serviceEndpoints.push(endpoint)
    }
    return serviceEndpoints
  }

  /**
   * Get current nonce from the provider.
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
    serviceEndpoints?: ServiceEndpoint[],
    authorization?: string
  ): Promise<number> {
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
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
      const { nonce } = await response.json()
      console.log(`[getNonce] Consumer: ${consumerAddress} nonce: ${nonce}`)
      const sanitizedNonce = !nonce || nonce === null ? 0 : Number(nonce)
      return sanitizedNonce
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error(e.message)
    }
  }

  /**
   * Sign a provider request with a signer.
   * @param {Signer} signer - The signer to use.
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} A promise that resolves with the signature.
   */
  public async signProviderRequest(signer: Signer, message: string): Promise<string> {
    //  const isMetaMask = web3 && web3.currentProvider && (web3.currentProvider as any).isMetaMask
    //  if (isMetaMask) return await web3.eth.personal.sign(consumerMessage, accountId, password)
    //  await web3.eth.sign(consumerMessage, await signer.getAddress())
    const consumerMessage = ethers.utils.solidityKeccak256(
      ['bytes'],
      [ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message))]
    )
    const messageHashBytes = ethers.utils.arrayify(consumerMessage)
    try {
      return await signer.signMessage(messageHashBytes)
    } catch (error) {
      // LoggerInstance.error('Sign provider message error: ', error)
      // Check if the user is using barge chain
      const chainId = await signer.getChainId()
      if (chainId === 8996) {
        return await (signer as providers.JsonRpcSigner)._legacySignMessage(
          messageHashBytes
        )
      }
    }
  }

  /**
   * Encrypt data using the Provider's own symmetric key
   * @param {string} data data in json format that needs to be sent , it can either be a DDO or a File array
   * @param {number} chainId network's id so provider can choose the corresponding Signer object
   * @param {string} providerUri provider uri address
   * @param {AbortSignal} signal abort signal
   * @return {Promise<string>} urlDetails
   */
  public async encrypt(
    data: any,
    chainId: number,
    providerUri: string,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<string> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const path =
      (this.getEndpointURL(serviceEndpoints, 'encrypt')
        ? this.getEndpointURL(serviceEndpoints, 'encrypt').urlPath
        : null) + `?chainId=${chainId}`
    if (!path) return null
    try {
      const response = await fetch(path, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/octet-stream',
          Authorization: authorization
        },
        signal
      })
      return await response.text()
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('HTTP request failed calling Provider')
    }
  }

  /**
   * Get file details for a given DID and service ID.
   * @param {string} did - The DID to check.
   * @param {string} serviceId - The service ID to check.
   * @param {string} providerUri - The URI of the provider.
   * @param {boolean} [withChecksum=false] - Whether or not to include a checksum.
   * @param {AbortSignal} [signal] - An optional abort signal.
   * @returns {Promise<FileInfo[]>} A promise that resolves with an array of file info objects.
   */
  public async checkDidFiles(
    did: string,
    serviceId: string,
    providerUri: string,
    withChecksum: boolean = false,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<FileInfo[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const args = { did, serviceId, checksum: withChecksum }
    const files: FileInfo[] = []
    const path = this.getEndpointURL(serviceEndpoints, 'fileinfo')
      ? this.getEndpointURL(serviceEndpoints, 'fileinfo').urlPath
      : null
    if (!path) return null
    let response
    try {
      response = await fetch(path, {
        method: 'POST',
        body: JSON.stringify(args),
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('File info call failed: ')
      LoggerInstance.error(e)
      throw new Error(e)
    }
    if (response?.ok) {
      const results: FileInfo[] = await response.json()
      for (const result of results) {
        files.push(result)
      }
      return files
    }
    const resolvedResponse = await response.json()
    LoggerInstance.error(
      'File info call failed: ',
      response.status,
      response.statusText,
      resolvedResponse
    )
    throw new Error(JSON.stringify(resolvedResponse))
  }

  /**
   * Get File details (if possible)
   * @param {UrlFile | Arweave | Ipfs | GraphqlQuery | Smartcontract} file one of the supported file structures
   * @param {string} providerUri uri of the provider that will be used to check the file
   * @param {boolean} [withChecksum=false] - Whether or not to include a checksum.
   * @param {AbortSignal} [signal] - An optional abort signal.
   * @returns {Promise<FileInfo[]>} A promise that resolves with an array of file info objects.
   */
  public async getFileInfo(
    file: UrlFile | Arweave | Ipfs,
    providerUri: string,
    withChecksum: boolean = false,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<FileInfo[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const args = { ...file, checksum: withChecksum }
    const files: FileInfo[] = []
    const path = this.getEndpointURL(serviceEndpoints, 'fileinfo')
      ? this.getEndpointURL(serviceEndpoints, 'fileinfo').urlPath
      : null
    if (!path) return null
    let response
    try {
      response = await fetch(path, {
        method: 'POST',
        body: JSON.stringify(args),
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('File info call failed: ')
      LoggerInstance.error(e)
      throw new Error(e)
    }
    if (response?.ok) {
      const results: FileInfo[] = await response.json()
      for (const result of results) {
        files.push(result)
      }
      return files
    }
    const resolvedResponse = await response.json()
    LoggerInstance.error(
      'File info call failed: ',
      response.status,
      response.statusText,
      resolvedResponse
    )
    throw new Error(JSON.stringify(resolvedResponse))
  }

  /**
   * Returns compute environments from a provider.
   * @param {string} providerUri - The URI of the provider.
   * @param {AbortSignal} [signal] - An optional abort signal.
   * @returns {Promise<{[chainId: number]: ComputeEnvironment[]}>} A promise that resolves with an object containing compute environments for each chain ID.
   */
  public async getComputeEnvironments(
    providerUri: string,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<ComputeEnvironment[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const path = this.getEndpointURL(serviceEndpoints, 'computeEnvironments')?.urlPath
    if (!path) return null
    let response
    try {
      response = await fetch(path, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('Fetch compute env failed: ')
      LoggerInstance.error(e)
      throw new Error(e)
    }
    if (response?.ok) {
      const result = response.json()
      // chain is not part of response
      // if (Array.isArray(result)) {
      //   const providerChain: number = providerEndpoints.chainId
      //   return { [providerChain]: result }
      // }
      return result
    }
    const resolvedResponse = await response.json()
    LoggerInstance.error(
      'Fetch compute env failed: ',
      response.status,
      response.statusText,
      resolvedResponse
    )
    throw new Error(JSON.stringify(resolvedResponse))
  }

  /**
   * Initializes the provider for a service request.
   * @param {string} did - The asset DID .
   * @param {string} serviceId - The asset service ID.
   * @param {number} fileIndex - The file index.
   * @param {string} consumerAddress - The consumer address.
   * @param {string} providerUri - The URI of the provider.
   * @param {AbortSignal} [signal] - The abort signal if any.
   * @param {UserCustomParameters} [userCustomParameters] - The custom parameters if any.
   * @param {string} [computeEnv] - The compute environment if any.
   * @param {number} [validUntil] - The validity time if any.
   * @returns {Promise<ProviderInitialize>} A promise that resolves with ProviderInitialize response.
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
    validUntil?: number,
    authorization?: string
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
    let response
    try {
      response = await fetch(initializeUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('Provider initialized failed: ')
      LoggerInstance.error(e)
      throw new Error(`Provider initialize failed url: ${initializeUrl} `)
    }
    if (response?.status === 200) {
      const results: ProviderInitialize = await response.json()
      return results
    }
    const resolvedResponse = await response.json()
    LoggerInstance.error(
      'Provider initialized failed: ',
      response.status,
      response.statusText,
      resolvedResponse
    )
    throw new Error(JSON.stringify(resolvedResponse))
  }

  /** Initializes the provider for a compute request.
   * @param {ComputeAsset[]} assets The datasets array to initialize compute request.
   * @param {ComputeAlgorithmber} algorithm The algorithm to use.
   * @param {string} computeEnv The compute environment.
   * @param {number} validUntil  The job expiration date.
   * @param {string} providerUri The provider URI.
   * @param {string} accountId caller address
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ProviderComputeInitialize>} ProviderComputeInitialize data
   */
  public async initializeComputeV1(
    assets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    computeEnv: string,
    providerUri: string,
    accountId: string,
    chainId: number,
    token: string,
    maxJobDuration: number,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<ProviderComputeInitializeResults> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const payment: ComputePayment = {
      chainId,
      token,
      maxJobDuration
    }
    const payload: Object = {
      datasets: assets,
      algorithm,
      payment,
      consumerAddress: accountId,
      environment: computeEnv
    }
    const initializeUrl = this.getEndpointURL(serviceEndpoints, 'initializeCompute')
      ? this.getEndpointURL(serviceEndpoints, 'initializeCompute').urlPath
      : null
    if (!initializeUrl) return null
    let response
    try {
      response = await fetch(initializeUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('Initialize compute failed: ')
      LoggerInstance.error(e)
      throw new Error('ComputeJob cannot be initialized')
    }
    if (response?.ok) {
      const params = await response.json()
      return params
    }
    const resolvedResponse = await response.json()
    LoggerInstance.error(
      'Initialize compute failed: ',
      response.status,
      response.statusText,
      resolvedResponse
    )
    LoggerInstance.error('Payload was:', JSON.stringify(payload))
    throw new Error(JSON.stringify(resolvedResponse))
  }

  /** Initializes the provider for a compute request.
   * @param {ComputeAsset[]} assets The datasets array to initialize compute request.
   * @param {ComputeAlgorithmber} algorithm The algorithm to use.
   * @param {string} computeEnv The compute environment.
   * @param {string} token The payment token address.
   * @param {number} validUntil  The job expiration date.
   * @param {string} providerUri The provider URI.
   * @param {Signer} signer caller address
   * @param {ComputeResourceRequest[]} resources The resources to start compute job with.
   * @param {number} chainId The chain used to do payments
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ProviderComputeInitialize>} ProviderComputeInitialize data
   */
  public async initializeCompute(
    assets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    computeEnv: string,
    token: string,
    validUntil: number,
    providerUri: string,
    signer: Signer,
    resources: ComputeResourceRequest[],
    chainId?: number,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<ProviderComputeInitializeResults> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )

    // Diff from V1. We might need a signature to get the files object, specially if dealing with confidential evm and template 4
    // otherwise it can be ignored
    const consumerAddress = await signer.getAddress()
    const nonce = (
      (await this.getNonce(
        providerUri,
        consumerAddress,
        signal,
        providerEndpoints,
        serviceEndpoints
      )) + 1
    ).toString()

    // same signed message as for start compute (consumer address + did[0] + nonce)
    let signatureMessage = consumerAddress
    signatureMessage += assets[0]?.documentId
    signatureMessage += nonce
    const signature = await this.signProviderRequest(signer, signatureMessage)

    const providerData: Object = {
      datasets: assets,
      algorithm,
      environment: computeEnv,
      payment: {
        chainId: chainId || (await signer.getChainId()),
        token,
        resources
      },
      maxJobDuration: validUntil,
      consumerAddress,
      signature
    }
    const initializeUrl = this.getEndpointURL(serviceEndpoints, 'initializeCompute')
      ? this.getEndpointURL(serviceEndpoints, 'initializeCompute').urlPath
      : null
    if (!initializeUrl) return null

    let response
    try {
      console.log('Initialize compute url:', initializeUrl)
      response = await fetch(initializeUrl, {
        method: 'POST',
        body: JSON.stringify(providerData),
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
      console.log('Raw response:', response)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`${errorText}`)
      }
    } catch (e) {
      LoggerInstance.error('Initialize compute failed: ')
      LoggerInstance.error(e)
      throw new Error(`ComputeJob cannot be initialized: ${e.message}.`)
    }
    if (response?.ok) {
      const params = await response.json()
      return params
    }
    const resolvedResponse = await response.json()
    LoggerInstance.error(
      'Initialize compute failed: ',
      response.status,
      response.statusText,
      resolvedResponse
    )
    LoggerInstance.error('Payload was:', JSON.stringify(providerData))
    throw new Error(JSON.stringify(resolvedResponse))
  }

  /**
   * Gets the download URL.
   * @param {string} did - The DID.
   * @param {string} serviceId - The service ID.
   * @param {number} fileIndex - The file index.
   * @param {string} transferTxId - The transfer transaction ID.
   * @param {string} providerUri - The provider URI.
   * @param {Signer} signer - The signer.
   * @param {any} policyServer - The policy server (if any is to be used).
   * @param {UserCustomParameters} userCustomParameters - The user custom parameters.
   * @returns {Promise<any>} The download URL.
   */
  public async getDownloadUrl(
    did: string,
    serviceId: string,
    fileIndex: number,
    transferTxId: string,
    providerUri: string,
    signer: Signer,
    policyServer?: any,
    userCustomParameters?: UserCustomParameters,
    authorization?: string
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
    const consumerAddress = await signer.getAddress()
    const nonce = (
      (await this.getNonce(
        providerUri,
        consumerAddress,
        null,
        providerEndpoints,
        serviceEndpoints,
        authorization
      )) + 1
    ).toString()

    const signature = await this.signProviderRequest(signer, did + nonce) // did + nonce
    let consumeUrl = downloadUrl
    consumeUrl += `?fileIndex=${fileIndex}`
    consumeUrl += `&documentId=${did}`
    consumeUrl += `&transferTxId=${transferTxId}`
    consumeUrl += `&serviceId=${serviceId}`
    consumeUrl += `&consumerAddress=${consumerAddress}`
    consumeUrl += `&nonce=${nonce}`
    if (policyServer) {
      consumeUrl += '&policyServer=' + encodeURI(JSON.stringify(policyServer))
    }

    consumeUrl += `&signature=${signature}`
    if (userCustomParameters)
      consumeUrl += '&userdata=' + encodeURI(JSON.stringify(userCustomParameters))
    return consumeUrl
  }

  /** Instruct the provider to start a compute job (Old C2D V1) Kept for now, for backwards compatibility
   * @param {string} providerUri The provider URI.
   * @param {Signer} signer The consumer signer object.
   * @param {string} computeEnv The compute environment.
   * @param {ComputeAsset} dataset The dataset to start compute on
   * @param {ComputeAlgorithm} algorithm The algorithm to start compute with.
   * @param {AbortSignal} signal abort signal
   * @param {ComputeAsset[]} additionalDatasets The additional datasets if that is the case.
   * @param {ComputeOutput} output The compute job output settings.
   * @return {Promise<ComputeJob | ComputeJob[]>} The compute job or jobs.
   * @deprecated Use {@link computeStart} instead.
   */
  public async computeStartV1(
    providerUri: string,
    consumer: Signer,
    computeEnv: string,
    dataset: ComputeAsset,
    algorithm: ComputeAlgorithm,
    signal?: AbortSignal,
    additionalDatasets?: ComputeAsset[],
    output?: ComputeOutput,
    authorization?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeStartUrl = this.getEndpointURL(serviceEndpoints, 'computeStart')
      ? this.getEndpointURL(serviceEndpoints, 'computeStart').urlPath
      : null

    const consumerAddress = await consumer.getAddress()
    const nonce = (
      (await this.getNonce(
        providerUri,
        consumerAddress,
        signal,
        providerEndpoints,
        serviceEndpoints
      )) + 1
    ).toString()

    let signatureMessage = consumerAddress
    signatureMessage += dataset.documentId
    signatureMessage += nonce
    const signature = await this.signProviderRequest(consumer, signatureMessage)
    const payload = Object()
    payload.consumerAddress = consumerAddress
    payload.signature = signature
    payload.nonce = nonce
    payload.environment = computeEnv
    payload.dataset = dataset
    payload.algorithm = algorithm
    if (additionalDatasets) payload.additionalDatasets = additionalDatasets
    if (output) payload.output = output
    if (!computeStartUrl) return null
    let response
    try {
      response = await fetch(computeStartUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('Compute start failed:')
      LoggerInstance.error(e)
      LoggerInstance.error('Payload was:', payload)
      throw new Error('HTTP request failed calling Provider')
    }
    if (response?.ok) {
      const params = await response.json()
      return params
    }
    LoggerInstance.error(
      'Compute start failed: ',
      response.status,
      response.statusText,
      await response.json()
    )
    LoggerInstance.error('Payload was:', payload)
    return null
  }

  /** Instruct the provider to start a PAYED compute job (new C2D V2)
   * @param {string} providerUri The provider URI.
   * @param {Signer} signer The consumer signer object.
   * @param {string} computeEnv The compute environment.
   * @param {ComputeAsset} datasets The dataset to start compute on + additionalDatasets (the additional datasets if that is the case)
   * @param {ComputeAlgorithm} algorithm The algorithm to start compute with.
   * @param {number} maxJobDuration The compute job max execution time.
   * @param {string} token The token address for compute payment.
   * @param {ComputeResourceRequest} resources The resources to start compute job with.
   * @param {chainId} chainId The chain used to do payments
   * @param {ComputeOutput} output The compute job output settings.
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ComputeJob | ComputeJob[]>} The compute job or jobs.
   */
  public async computeStart(
    providerUri: string,
    consumer: Signer,
    computeEnv: string,
    datasets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    maxJobDuration: number,
    token: string,
    resources: ComputeResourceRequest[],
    chainId?: number, // network used by payment (only for payed compute jobs)
    output?: ComputeOutput,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    console.log('called new compute start method...')
    console.log('datasets: ', datasets)
    console.log('algorithm: ', algorithm)
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )

    const computeStartUrl = this.getEndpointURL(serviceEndpoints, 'computeStart')
      ? this.getEndpointURL(serviceEndpoints, 'computeStart').urlPath
      : null

    if (!computeStartUrl) {
      LoggerInstance.error(
        'Compute start failed: Cannot get proper computeStart route (perhaps not implemented on provider?)'
      )
      return null
    }

    const consumerAddress = await consumer.getAddress()
    const nonce = (
      (await this.getNonce(
        providerUri,
        consumerAddress,
        signal,
        providerEndpoints,
        serviceEndpoints,
        authorization
      )) + 1
    ).toString()

    let signatureMessage = consumerAddress
    signatureMessage += datasets[0]?.documentId
    signatureMessage += nonce
    const signature = await this.signProviderRequest(consumer, signatureMessage)
    const payload = Object()
    payload.consumerAddress = consumerAddress
    payload.signature = signature
    payload.nonce = nonce
    payload.environment = computeEnv
    payload.maxJobDuration = maxJobDuration
    payload.resources = resources
    // kept for backwards compatibility (tests running against existing provider)
    payload.dataset = datasets[0]
    // new field for C2D v2
    payload.datasets = datasets
    payload.algorithm = algorithm
    const chainIdCompute = chainId || (await consumer.getChainId())
    payload.chainId = chainIdCompute
    payload.payment = {
      chainId: chainIdCompute,
      token,
      maxJobDuration
    }
    if (resources) payload.payment.resources = resources
    // if (additionalDatasets) payload.additionalDatasets = additionalDatasets
    if (output) payload.output = output
    let response
    try {
      response = await fetch(computeStartUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('Compute start failed:')
      LoggerInstance.error(e)
      LoggerInstance.error('Payload was:', payload)
      throw new Error('HTTP request failed calling Provider')
    }
    if (response?.ok) {
      const params = await response.json()
      return params
    }
    LoggerInstance.error(
      'Compute start failed: ',
      response.status,
      response.statusText,
      await response.json()
    )
    LoggerInstance.error('Payload was:', payload)
    return null
  }

  /** Instruct the provider to start a FREE compute job (new C2D V2)
   * @param {string} providerUri The provider URI.
   * @param {Signer} signer The consumer signer object.
   * @param {string} computeEnv The compute environment.
   * @param {ComputeAsset} datasets The dataset to start compute on + additionalDatasets (the additional datasets if that is the case)
   * @param {ComputeAlgorithm} algorithm The algorithm to start compute with.
   * @param {ComputeResourceRequest} resources The resources to start compute job with.
   * @param {ComputeOutput} output The compute job output settings.
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ComputeJob | ComputeJob[]>} The compute job or jobs.
   */
  public async freeComputeStart(
    providerUri: string,
    consumer: Signer,
    computeEnv: string,
    datasets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    resources?: ComputeResourceRequest[],
    output?: ComputeOutput,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    console.log('called new free compute start method...')
    console.log('datasets: ', datasets)
    console.log('algorithm: ', algorithm)
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )

    const computeStartUrl = this.getEndpointURL(serviceEndpoints, 'freeCompute')
      ? this.getEndpointURL(serviceEndpoints, 'freeCompute').urlPath
      : null

    if (!computeStartUrl) {
      LoggerInstance.error(
        'Compute start failed: Cannot get proper computeStart route (perhaps not implemented on provider?)'
      )
      return null
    }

    const consumerAddress = await consumer.getAddress()
    const nonce = (
      (await this.getNonce(
        providerUri,
        consumerAddress,
        signal,
        providerEndpoints,
        serviceEndpoints,
        authorization
      )) + 1
    ).toString()

    const signatureMessage = nonce // datasets[0].documentId
    console.log('signatureMessage: ', signatureMessage)
    const signature = await this.signProviderRequest(consumer, signatureMessage)
    const payload = Object()
    payload.consumerAddress = consumerAddress
    payload.signature = signature
    payload.nonce = nonce
    payload.environment = computeEnv
    payload.resources = resources
    // kept for backwards compatibility (tests running against existing provider)
    payload.dataset = datasets[0]
    // new field for C2D v2
    payload.datasets = datasets
    payload.algorithm = algorithm
    // if (additionalDatasets) payload.additionalDatasets = additionalDatasets
    payload.output = output
    let response
    try {
      response = await fetch(computeStartUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('Compute start failed:')
      LoggerInstance.error(e)
      LoggerInstance.error('Payload was:', payload)
      throw new Error('HTTP request failed calling Provider')
    }
    if (response?.ok) {
      const params = await response.json()
      return params
    }
    LoggerInstance.error(
      'Compute start failed: ',
      response.status,
      response.statusText,
      await response.json()
    )
    LoggerInstance.error('Payload was:', payload)
    return null
  }

  /**
   *
   * @param providerUri provider URL
   * @param consumer consumer
   * @param jobId jobId
   * @param signal abort signal
   * @returns logs response
   */
  public async computeStreamableLogs(
    providerUri: string,
    signer: Signer,
    jobId: string,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<any> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )

    const computeStreamableLogs = this.getEndpointURL(
      serviceEndpoints,
      'computeStreamableLogs'
    )
      ? this.getEndpointURL(serviceEndpoints, 'computeStreamableLogs').urlPath
      : null

    if (!computeStreamableLogs) {
      LoggerInstance.error(
        'Compute start failed: Cannot get proper computeStreamableLogs route (perhaps not implemented on provider?)'
      )
      return null
    }
    const consumerAddress = await signer.getAddress()
    const nonce = (
      (await this.getNonce(
        providerUri,
        consumerAddress,
        signal,
        providerEndpoints,
        serviceEndpoints
      )) + 1
    ).toString()

    let url = `?consumerAddress=${consumerAddress}`
    url += `&jobId=${jobId}`
    url += `&nonce=${nonce}`

    // consumer + jobId + nonce
    const signatureMessage = `${consumerAddress}${jobId}${nonce}`
    const signature = await this.signProviderRequest(signer, signatureMessage)
    url += `&signature=${signature}`

    let response
    try {
      response = await fetch(computeStreamableLogs + url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
      console.log('Raw response:', response)
    } catch (e) {
      LoggerInstance.error('computeStreamableLogs failed:')
      LoggerInstance.error(e)
      throw new Error('HTTP request failed calling Provider')
    }
    if (response?.ok || response?.status === 200) {
      // do not handle the response here
      console.log('Response body:', response.body)
      return response.body
    }
    LoggerInstance.error(
      'computeStreamableLogs failed: ',
      response.status,
      response.statusText,
      await response.json()
    )
    return null
  }

  public async getComputeStartRoutes(
    providerUri: string,
    isFreeCompute: boolean = false
  ): Promise<string | null> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    let computeStartUrl = null
    if (isFreeCompute) {
      computeStartUrl = this.getEndpointURL(serviceEndpoints, 'freeCompute')
        ? this.getEndpointURL(serviceEndpoints, 'freeCompute').urlPath
        : null
    } else {
      computeStartUrl = this.getEndpointURL(serviceEndpoints, 'computeStart')
        ? this.getEndpointURL(serviceEndpoints, 'computeStart').urlPath
        : null
    }
    return computeStartUrl
  }

  /** Instruct the provider to Stop the execution of a to stop a compute job.
   * @param {string} did the asset did
   * @param {string} consumerAddress The consumer address.
   * @param {string} jobId the compute job id
   * @param {string} providerUri The provider URI.
   * @param {Signer} signer The consumer signer object.
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeStop(
    did: string,
    consumerAddress: string,
    jobId: string,
    providerUri: string,
    signer: Signer,
    agreementId?: string,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeStopUrl = this.getEndpointURL(serviceEndpoints, 'computeStop')
      ? this.getEndpointURL(serviceEndpoints, 'computeStop').urlPath
      : null

    const nonce = (
      (await this.getNonce(
        providerUri,
        consumerAddress,
        signal,
        providerEndpoints,
        serviceEndpoints,
        authorization
      )) + 1
    ).toString()

    let signatureMessage = consumerAddress
    signatureMessage += jobId || ''
    // On current provider impl (and nodes) we DO NOT check this signature
    // On nodes we are signing again just the Nonce to send the request to Operator Service
    // on current provider we sign: {owner}{job_id}{nonce}" OR {owner}{nonce} if no jobId
    // On provider service STOP route, we just check signature owner + jobId OR just owner if no jobId
    // signatureMessage += (agreementId && `${this.noZeroX(agreementId)}`) || ''
    // signatureMessage += nonce
    const signature = await this.signProviderRequest(signer, signatureMessage)
    const payload = Object()
    payload.signature = signature
    payload.agreementId = agreementId // this.noZeroX(agreementId) #https://github.com/oceanprotocol/ocean.js/issues/1892
    payload.consumerAddress = consumerAddress
    payload.nonce = nonce
    if (jobId) payload.jobId = jobId

    if (!computeStopUrl) return null
    let response
    try {
      response = await fetch(computeStopUrl, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('Compute stop failed:')
      LoggerInstance.error(e)
      LoggerInstance.error('Payload was:', payload)
      throw new Error('HTTP request failed calling Provider')
    }

    if (response?.ok) {
      const params = await response.json()
      return params
    }
    const resolvedResponse = await response.json()
    LoggerInstance.error(
      'Compute stop failed: ',
      response.status,
      response.statusText,
      resolvedResponse
    )
    LoggerInstance.error('Payload was:', payload)
    throw new Error(JSON.stringify(resolvedResponse))
  }

  /** Get compute status for a specific jobId/documentId/owner.
   * @param {string} providerUri The URI of the provider we want to query
   * @param {string} consumerAddress The consumer ethereum address
   * @param {string} jobId The ID of a compute job.
   * @param {string} agreementId The ID of the service agreement (tx id)
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeStatus(
    providerUri: string,
    consumerAddress: string,
    jobId?: string,
    agreementId?: string,
    signal?: AbortSignal,
    authorization?: string
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
    url += (agreementId && `&agreementId=${agreementId}`) || '' // ${this.noZeroX(agreementId)} #https://github.com/oceanprotocol/ocean.js/issues/1892
    url += (jobId && `&jobId=${jobId}`) || ''

    if (!computeStatusUrl) return null
    let response
    try {
      console.log('computeStatusUrl: ', computeStatusUrl + url)
      response = await fetch(computeStatusUrl + url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('Get compute status failed')
      LoggerInstance.error(e)
      throw new Error(e)
    }
    if (response?.ok) {
      const params = await response.json()
      return params
    }
    LoggerInstance.error(
      'Get compute status failed:',
      response.status,
      response.statusText
    )
    if (response?.ok) {
      const params = await response.json()
      return params
    }
    const resolvedResponse = await response.json()
    LoggerInstance.error(
      'Get compute status failed:',
      response.status,
      response.statusText,
      resolvedResponse
    )
    throw new Error(JSON.stringify(resolvedResponse))
  }

  /** Get compute result url
   * @param {string} providerUri The URI of the provider we want to query
   * @param {Signer} consumer consumer Signer wallet object
   * @param {string} jobId The ID of a compute job.
   * @param {number} index Result index
   * @return {Promise<string>}
   */
  public async getComputeResultUrl(
    providerUri: string,
    consumer: Signer,
    jobId: string,
    index: number,
    authorization?: string
  ): Promise<string> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeResultUrl = this.getEndpointURL(serviceEndpoints, 'computeResult')
      ? this.getEndpointURL(serviceEndpoints, 'computeResult').urlPath
      : null

    const nonce = (
      (await this.getNonce(
        providerUri,
        await consumer.getAddress(),
        null,
        providerEndpoints,
        serviceEndpoints,
        authorization
      )) + 1
    ).toString()
    let signatureMessage = await consumer.getAddress()
    signatureMessage += jobId
    signatureMessage += index.toString()
    signatureMessage += nonce
    const signature = await this.signProviderRequest(consumer, signatureMessage)
    if (!computeResultUrl) return null
    let resultUrl = computeResultUrl
    resultUrl += `?consumerAddress=${await consumer.getAddress()}`
    resultUrl += `&jobId=${jobId}`
    resultUrl += `&index=${index.toString()}`
    resultUrl += `&nonce=${nonce}`
    resultUrl += (signature && `&signature=${signature}`) || ''
    return resultUrl
  }

  /** Deletes a compute job.
   * @param {string} did asset did
   * @param {Signer} consumer consumer Signer wallet object
   * @param {string} jobId the compute job ID
   * @param {string} providerUri The URI of the provider we want to query
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async computeDelete(
    did: string,
    consumer: Signer,
    jobId: string,
    providerUri: string,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const computeDeleteUrl = this.getEndpointURL(serviceEndpoints, 'computeDelete')
      ? this.getEndpointURL(serviceEndpoints, 'computeDelete').urlPath
      : null

    const nonce = (
      (await this.getNonce(
        providerUri,
        await consumer.getAddress(),
        signal,
        providerEndpoints,
        serviceEndpoints,
        authorization
      )) + 1
    ).toString()

    let signatureMessage = await consumer.getAddress()
    signatureMessage += jobId || ''
    signatureMessage += (did && `${this.noZeroX(did)}`) || ''
    signatureMessage += nonce
    const signature = await this.signProviderRequest(consumer, signatureMessage)
    const payload = Object()
    payload.documentId = did // this.noZeroX(did) #https://github.com/oceanprotocol/ocean.js/issues/1892
    payload.consumerAddress = await consumer.getAddress()
    payload.jobId = jobId
    if (signature) payload.signature = signature

    if (!computeDeleteUrl) return null
    let response
    try {
      response = await fetch(computeDeleteUrl, {
        method: 'DELETE',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
    } catch (e) {
      LoggerInstance.error('Delete compute job failed:')
      LoggerInstance.error(e)
      LoggerInstance.error('Payload was:', payload)
      throw new Error('HTTP request failed calling Provider')
    }
    if (response?.ok) {
      const params = await response.json()
      return params
    }
    const resolvedResponse = await response.json()
    LoggerInstance.error(
      'Delete compute job failed:',
      response.status,
      response.statusText,
      resolvedResponse
    )
    LoggerInstance.error('Payload was:', payload)
    throw new Error(JSON.stringify(resolvedResponse))
  }

  /** Generates an auth token
   * @param {Signer} consumer consumer Signer wallet object
   * @param {string} providerUri The URI of the provider we want to query
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async generateAuthToken(
    consumer: Signer,
    providerUri: string,
    signal?: AbortSignal
  ): Promise<string> {
    const consumerAddress = await consumer.getAddress()
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const url = this.getEndpointURL(serviceEndpoints, 'generateAuthToken').urlPath || null
    const nonce = (
      (await this.getNonce(
        providerUri,
        consumerAddress,
        signal,
        providerEndpoints,
        serviceEndpoints
      )) + 1
    ).toString()

    const signatureMessage = consumerAddress + nonce
    const signature = await this.signProviderRequest(consumer, signatureMessage)

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          address: consumerAddress,
          signature,
          nonce
        }),
        headers: { 'Content-Type': 'application/json' },
        signal
      })

      if (!response?.ok) {
        throw new Error(
          `Failed to generate auth token: ${response.status} ${response.statusText}`
        )
      }
      const params = await response.json()
      return params?.token
    } catch (e) {
      LoggerInstance.error('Generate auth token failed:')
      LoggerInstance.error(e)
      throw new Error('HTTP request failed calling Provider')
    }
  }

  /** Generates an auth token
   * @param {Signer} consumer consumer Signer wallet object
   * @param {string} token The auth token to invalidate
   * @param {string} providerUri The URI of the provider we want to query
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ComputeJob | ComputeJob[]>}
   */
  public async invalidateAuthToken(
    consumer: Signer,
    token: string,
    providerUri: string,
    signal?: AbortSignal
  ): Promise<{ success: boolean }> {
    const consumerAddress = await consumer.getAddress()
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const url =
      this.getEndpointURL(serviceEndpoints, 'invalidateAuthToken').urlPath || null
    const nonce = (
      (await this.getNonce(
        providerUri,
        consumerAddress,
        signal,
        providerEndpoints,
        serviceEndpoints
      )) + 1
    ).toString()

    const signatureMessage = consumerAddress + nonce
    const signature = await this.signProviderRequest(consumer, signatureMessage)

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          address: consumerAddress,
          signature,
          token,
          nonce
        }),
        headers: { 'Content-Type': 'application/json' },
        signal
      })

      if (!response?.ok) {
        throw new Error(
          `Failed to invalidate auth token: ${response.status} ${response.statusText}`
        )
      }
      const params = await response.json()
      return params
    } catch (e) {
      LoggerInstance.error('Generate auth token failed:')
      LoggerInstance.error(e)
      throw new Error('HTTP request failed calling Provider')
    }
  }

  /** Check for a valid provider at URL
   * @param {String} url provider uri address
   * @param {AbortSignal} signal abort signal
   * @return {Promise<boolean>} valid or not
   */
  public async isValidProvider(
    url: string,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        signal
      })
      if (response?.ok) {
        const params = await response.json()
        if (params && (params.providerAddress || params.providerAddresses)) return true
      }
      return false
    } catch (error) {
      LoggerInstance.error(`Error validating provider: ${error.message}`)
      return false
    }
  }

  /**
   * Private method that removes the leading 0x from a string.
   * @param {string} input - The input string.
   * @returns The transformed string.
   */
  private noZeroX(input: string): string {
    return this.zeroXTransformer(input, false)
  }

  /**
   * Private method that removes the leading 0x from a string.
   * @param {string} input - The input string.
   * @param {boolean} zeroOutput - Whether to include 0x in the output if the input is valid and zeroOutput is true.
   * @returns The transformed string.
   */
  private zeroXTransformer(input = '', zeroOutput: boolean): string {
    const { valid, output } = this.inputMatch(
      input,
      /^(?:0x)*([a-f0-9]+)$/i,
      'zeroXTransformer'
    )
    return (zeroOutput && valid ? '0x' : '') + output
  }

  /**
   * Private method that matches an input string against a regular expression and returns the first capture group.
   * @param {string} input - The input string to match.
   * @param {RegExp} regexp - The regular expression to match against.
   * @param {string} conversorName - The name of the method calling this function.
   * @returns An object with two properties: `valid` (a boolean indicating whether the input matched the regular expression) and `output` (the first capture group of the match, or the original input if there was no match).
   */
  private inputMatch(
    input: string,
    regexp: RegExp,
    conversorName: string
  ): { valid: boolean; output: string } {
    if (typeof input !== 'string') {
      LoggerInstance.debug('Not input string:')
      LoggerInstance.debug(input)
      throw new Error(`[${conversorName}] Expected string, input type: ${typeof input}`)
    }
    const match = input.match(regexp)
    if (!match) {
      LoggerInstance.warn(`[${conversorName}] Input transformation failed.`)
      return { valid: false, output: input }
    }
    return { valid: true, output: match[1] }
  }

  /**
   * Private method that fetches data from a URL using the GET method.
   * @param {string} url - The URL to fetch data from.
   * @returns A Promise that resolves to a Response object.
   */
  private async getData(url: string, authorization?: string): Promise<Response> {
    return fetch(url, {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        Authorization: authorization
      }
    })
  }
}

export const ProviderInstance = new Provider()
