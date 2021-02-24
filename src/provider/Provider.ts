import Account from '../ocean/Account'
import { noZeroX } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { File } from '../ddo/interfaces/File'
import { ComputeJob } from '../ocean/interfaces/ComputeJob'
import { ComputeInput } from '../ocean/interfaces/ComputeInput'
import { Output } from '../ocean/interfaces/ComputeOutput'
import { MetadataAlgorithm } from '../ddo/interfaces/MetadataAlgorithm'
import { Versions } from '../ocean/Versions'
import { Response } from 'node-fetch'
import { DDO } from '../ddo/DDO'
import DID from '../ocean/DID'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch')

export interface ServiceEndpoint {
  serviceName: string
  method: string
  urlPath: string
}
/**
 * Provides an interface for provider service.
 * Provider service is the technical component executed
 * by the Publishers allowing to them to provide extended
 * data services.
 */
export class Provider extends Instantiable {
  public nonce: string
  private baseUrl: string
  public servicesEndpoints: ServiceEndpoint[]
  public computeAddress: string
  public providerAddress: string
  public providerVersion: string
  /**
   * Returns the instance of Provider.
   * @return {Promise<Assets>}
   */
  public static async getInstance(config: InstantiableConfig): Promise<Provider> {
    const instance = new Provider()
    instance.setInstanceConfig(config)
    instance.nonce = '0'
    await instance.setBaseUrl(config.config.providerUri)
    return instance
  }

  public async setBaseUrl(url: string): Promise<boolean> {
    this.baseUrl = url
    this.servicesEndpoints = await this.getServiceEndpoints()
    return true
  }

  public get url(): string {
    return this.baseUrl
  }

  /**
   * Returns the service endpoints that exist
   * in provider.
   * @return {Promise<ServiceEndpoint[]>}
   */

  public async getServiceEndpoints(): Promise<ServiceEndpoint[]> {
    const serviceEndpoints: ServiceEndpoint[] = []
    try {
      const result = await (await this.ocean.utils.fetch.get(this.url)).json()
      this.providerAddress = result.providerAddress
      if ('computeAddress' in result) this.computeAddress = result.computeAddress
      if ('version' in result) this.providerVersion = result.version
      for (const i in result.serviceEndpoints) {
        const endpoint: ServiceEndpoint = {
          serviceName: i,
          method: result.serviceEndpoints[i][0],
          urlPath: this.url + result.serviceEndpoints[i][1]
        }
        serviceEndpoints.push(endpoint)
      }
      return serviceEndpoints
    } catch (e) {
      this.logger.error('Finding the service endpoints failed:', e)

      return null
    }
  }

  public getEndpointURL(serviceName: string): ServiceEndpoint {
    if (!this.servicesEndpoints) return null
    return this.servicesEndpoints.find(
      (s) => s.serviceName === serviceName
    ) as ServiceEndpoint
  }

  public async createSignature(account: Account, agreementId: string): Promise<string> {
    const signature = await this.ocean.utils.signature.signText(
      noZeroX(agreementId),
      account.getId()
    )

    return signature
  }

  public async createHashSignature(account: Account, message: string): Promise<string> {
    const signature = await this.ocean.utils.signature.signWithHash(
      message,
      account.getId()
    )

    return signature
  }

  public async encrypt(did: string, document: any, account: Account): Promise<string> {
    await this.getNonce(account.getId())
    const args = {
      documentId: did,
      document: JSON.stringify(document),
      publisherAddress: account.getId()
    }
    try {
      const response = await this.ocean.utils.fetch.post(
        this.getEncryptEndpoint().urlPath,
        decodeURI(JSON.stringify(args))
      )
      return (await response.json()).encryptedDocument
    } catch (e) {
      this.logger.error(e)
      throw new Error('HTTP request failed')
    }
  }

  /** Get URL details (if possible)
   * @param {String | DID} url or did
   * @return {Promise<File[]>} urlDetails
   */
  public async fileinfo(url: string | DID): Promise<File[]> {
    let args
    const files: File[] = []
    if (url instanceof DID) {
      args = { did: url.getDid() }
    } else args = { url }
    try {
      const response = await this.ocean.utils.fetch.post(
        this.getFileinfoEndpoint().urlPath,
        JSON.stringify(args)
      )
      const results: File[] = await response.json()
      for (const result of results) {
        files.push(result)
      }
      return files
    } catch (e) {
      return null
    }
  }

  /** Get nonce from provider
   * @param {String} consumerAddress
   * @return {Promise<string>} string
   */
  public async getNonce(consumerAddress: string): Promise<string> {
    let initializeUrl = this.getNonceEndpoint().urlPath
    initializeUrl += `?userAddress=${consumerAddress}`
    try {
      const response = await this.ocean.utils.fetch.get(initializeUrl)
      this.nonce = String((await response.json()).nonce)
      return this.nonce
    } catch (e) {
      this.logger.error(e)
      throw new Error('HTTP request failed')
    }
  }

  public async initialize(
    did: string,
    serviceIndex: number,
    serviceType: string,
    consumerAddress: string
  ): Promise<string> {
    let DDO: DDO

    try {
      DDO = await this.ocean.assets.resolve(did)
    } catch (e) {
      this.logger.error(e)
      throw new Error('Failed to resolve DID')
    }

    let initializeUrl = this.getInitializeEndpoint().urlPath
    initializeUrl += `?documentId=${did}`
    initializeUrl += `&serviceId=${serviceIndex}`
    initializeUrl += `&serviceType=${serviceType}`
    initializeUrl += `&dataToken=${DDO.dataToken}`
    initializeUrl += `&consumerAddress=${consumerAddress}`
    try {
      const response = await this.ocean.utils.fetch.get(initializeUrl)
      return await response.text()
    } catch (e) {
      this.logger.error(e)
      throw new Error('HTTP request failed')
    }
  }

  public async download(
    did: string,
    txId: string,
    tokenAddress: string,
    serviceType: string,
    serviceIndex: string,
    destination: string,
    account: Account,
    files: File[],
    index = -1
  ): Promise<any> {
    await this.getNonce(account.getId())
    const signature = await this.createSignature(account, did + this.nonce)
    const filesPromises = files
      .filter((_, i) => index === -1 || i === index)
      .map(async ({ index: i }) => {
        let consumeUrl = this.getDownloadEndpoint().urlPath
        consumeUrl += `?fileIndex=${i}`
        consumeUrl += `&documentId=${did}`
        consumeUrl += `&serviceId=${serviceIndex}`
        consumeUrl += `&serviceType=${serviceType}`
        consumeUrl += `&dataToken=${tokenAddress}`
        consumeUrl += `&transferTxId=${txId}`
        consumeUrl += `&consumerAddress=${account.getId()}`
        consumeUrl += `&signature=${signature}`

        try {
          !destination
            ? await this.ocean.utils.fetch.downloadFileBrowser(consumeUrl)
            : await this.ocean.utils.fetch.downloadFile(consumeUrl, destination, i)
        } catch (e) {
          this.logger.error('Error consuming assets')
          this.logger.error(e)
          throw e
        }
      })
    await Promise.all(filesPromises)
    return destination
  }

  /** Instruct the provider to start a compute job
   */
  public async computeStart(
    did: string,
    consumerAccount: Account,
    algorithmDid?: string,
    algorithmMeta?: MetadataAlgorithm,
    output?: Output,
    txId?: string,
    serviceIndex?: string,
    serviceType?: string,
    tokenAddress?: string,
    algorithmTransferTxId?: string,
    algorithmDataToken?: string,
    additionalInputs?: ComputeInput[]
  ): Promise<ComputeJob | ComputeJob[]> {
    const address = consumerAccount.getId()
    await this.getNonce(consumerAccount.getId())
    const payload = Object()
    payload.documentId = noZeroX(did)

    let signatureMessage = address
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    signatureMessage += this.nonce
    const signature = await this.createHashSignature(consumerAccount, signatureMessage)
    payload.signature = signature

    // continue to construct Provider URL
    if (output) payload.output = output
    if (algorithmDid) payload.algorithmDid = algorithmDid
    if (algorithmMeta) payload.algorithmMeta = algorithmMeta
    payload.consumerAddress = address
    if (txId) payload.transferTxId = txId
    if (algorithmTransferTxId) payload.algorithmTransferTxId = algorithmTransferTxId
    if (algorithmDataToken) payload.algorithmDataToken = algorithmDataToken

    if (serviceIndex) payload.serviceId = serviceIndex

    if (serviceType) payload.serviceType = serviceType

    if (tokenAddress) payload.dataToken = tokenAddress

    if (additionalInputs) payload.additionalInputs = additionalInputs
    try {
      let path = null
      if (this.getComputeStartEndpoint().urlPath)
        path = this.getComputeStartEndpoint().urlPath
      const response = await this.ocean.utils.fetch.post(path, JSON.stringify(payload))
      if (response?.ok) {
        const params = await response.json()
        return params
      }
      console.error('Compute start failed:', response.status, response.statusText)
      this.logger.error('Payload was:', payload)
      return null
    } catch (e) {
      this.logger.error('Compute start failed:')
      this.logger.error(e)
      this.logger.error('Payload was:', payload)
      return null
    }
  }

  /** Instruct the provider to stop a compute job
   */
  public async computeStop(
    did: string,
    consumerAccount: Account,
    jobId: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const address = consumerAccount.getId()
    await this.getNonce(consumerAccount.getId())
    const payload = Object()
    payload.documentId = noZeroX(did)
    let signatureMessage = address
    signatureMessage += jobId || ''
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    signatureMessage += this.nonce
    const signature = await this.createHashSignature(consumerAccount, signatureMessage)
    payload.signature = signature
    payload.jobId = jobId
    payload.consumerAddress = address
    try {
      let path = null
      if (this.getComputeStopEndpoint().urlPath)
        path = this.getComputeStopEndpoint().urlPath
      const response = await this.ocean.utils.fetch.put(path, JSON.stringify(payload))
      if (response?.ok) {
        const params = await response.json()
        return params
      }
      this.logger.error('Compute stop failed:', response.status, response.statusText)
      this.logger.error('Payload was:', payload)
      return null
    } catch (e) {
      this.logger.error('Compute stop failed:')
      this.logger.error(e)
      this.logger.error('Payload was:', payload)
      return null
    }
  }

  /** Instruct the provider to stop & delete all resources for a  compute job
   */
  public async computeDelete(
    did: string,
    consumerAccount: Account,
    jobId: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const address = consumerAccount.getId()
    await this.getNonce(consumerAccount.getId())
    const payload = Object()
    payload.documentId = noZeroX(did)
    let signatureMessage = address
    signatureMessage += jobId || ''
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    signatureMessage += this.nonce
    const signature = await this.createHashSignature(consumerAccount, signatureMessage)
    payload.signature = signature
    payload.jobId = jobId
    payload.consumerAddress = address
    try {
      let path = null
      if (this.getComputeDeleteEndpoint().urlPath)
        path = this.getComputeDeleteEndpoint().urlPath
      const response = await this.ocean.utils.fetch.delete(path, JSON.stringify(payload))
      if (response?.ok) {
        const params = await response.json()
        return params
      }
      this.logger.error(
        'Delete compute job failed:',
        response.status,
        response.statusText
      )
      this.logger.error('Payload was:', payload)
      return null
    } catch (e) {
      this.logger.error('Delete compute job failed:')
      this.logger.error(e)
      this.logger.error('Payload was:', payload)
      return null
    }
  }

  public async computeStatus(
    did: string,
    consumerAccount: Account,
    jobId?: string,
    txId?: string,
    sign = true
  ): Promise<ComputeJob | ComputeJob[]> {
    const address = consumerAccount.getId()
    await this.getNonce(consumerAccount.getId())
    let url = '?documentId=${noZeroX(did)'
    if (sign) {
      let signatureMessage = address
      signatureMessage += jobId || ''
      signatureMessage += (did && `${noZeroX(did)}`) || ''
      signatureMessage += this.nonce
      const signature = await this.createHashSignature(consumerAccount, signatureMessage)
      url += `&signature=${signature}`
    }

    // continue to construct Provider URL
    url += (jobId && `&jobId=${jobId}`) || ''
    url += `&consumerAddress=${address}`
    url += (txId && `&transferTxId=${txId}`) || ''

    try {
      let path = null
      if (this.getComputeStatusEndpoint().urlPath)
        path = this.getComputeStatusEndpoint().urlPath
      const response = await this.ocean.utils.fetch.get(path + url)
      /* response = await fetch(this.getComputeEndpoint() + url, {
        method: 'GET',
        timeout: 5000
      })
      */
      if (response?.ok) {
        const params = await response.json()
        return params
      }
      this.logger.error(
        'Get compute status failed:',
        response.status,
        response.statusText
      )
      return null
    } catch (e) {
      this.logger.error('Get compute status failed')
      this.logger.error(e)
      return null
    }
  }

  public getInitializeEndpoint(): ServiceEndpoint {
    return this.getEndpointURL('initialize')
  }

  public getNonceEndpoint(): ServiceEndpoint {
    return this.getEndpointURL('nonce')
  }

  public getEncryptEndpoint(): ServiceEndpoint {
    return this.getEndpointURL('encrypt')
  }

  public getFileinfoEndpoint(): ServiceEndpoint {
    return this.getEndpointURL('fileinfo')
  }

  public getComputeStartEndpoint(): ServiceEndpoint {
    return this.getEndpointURL('computeStart')
  }

  public getComputeStopEndpoint(): ServiceEndpoint {
    return this.getEndpointURL('computeStop')
  }

  public getComputeStatusEndpoint(): ServiceEndpoint {
    return this.getEndpointURL('computeStatus')
  }

  public getComputeDeleteEndpoint(): ServiceEndpoint {
    return this.getEndpointURL('computeDelete')
  }

  public getDownloadEndpoint(): ServiceEndpoint {
    return this.getEndpointURL('download')
  }

  /** Check for a valid provider at URL
   * @param {String} url
   * @return {Promise<boolean>} string
   */
  public async isValidProvider(url: string): Promise<boolean> {
    try {
      const response = await this.ocean.utils.fetch.get(url)
      if (response?.ok) {
        const params = await response.json()
        if (params && params.providerAddress) return true
      }
      return false
    } catch (error) {
      this.logger.error(`Error validating provider: ${error.message}`)
      return false
    }
  }
}
