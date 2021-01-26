import Account from '../ocean/Account'
import { noZeroX } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { File } from '../ddo/interfaces/File'
import { ComputeJob } from '../ocean/interfaces/ComputeJob'
import { EndpointInformation } from '../ocean/interfaces/EndpointInformation'
import { Output } from '../ocean/interfaces/ComputeOutput'
import { MetadataAlgorithm } from '../ddo/interfaces/MetadataAlgorithm'
import { Versions } from '../ocean/Versions'
import { Response } from 'node-fetch'
import { DDO } from '../ddo/DDO'
import DID from '../ocean/DID'

const apiPath = '/api/v1/services'

/**
 * Provides an interface for provider service.
 * Provider service is the technical component executed
 * by the Publishers allowing to them to provide extended
 * data services.
 */
export class Provider extends Instantiable {
  public nonce: string
  private baseUrl: string
  public servicesEndpoints: any

  public get url(): string {
    return this.baseUrl
  }

  constructor(config: InstantiableConfig) {
    super()
    this.setInstanceConfig(config)
    this.baseUrl = this.config.providerUri
    this.nonce = '0'
    this.setServiceEndpoints()
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url
  }

  public async setServiceEndpoints(): Promise<void> {
    this.servicesEndpoints = await this.getServiceEndpoints()
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

  public async getServiceEndpoints() {
    const url = this.getURI()
    const fetch = this.ocean.utils.fetch.get(url)
    if (this.servicesEndpoints == null) {
      this.servicesEndpoints = await fetch
        .then((response: Response) => {
          if (response.ok) {
            return response.json()
          }

          this.logger.error(
            'Finding the service endpoints failed:',
            response.status,
            response.statusText
          )

          return null
        })
        .catch((error: Error) => {
          this.logger.error('Error with service endpoints')
          this.logger.error(error.message)
          throw error
        })
    }
    console.log('JSON format: ' + JSON.stringify(this.servicesEndpoints))
    const myJSON = JSON.parse(
      JSON.stringify(this.servicesEndpoints),
      function (key, value) {
        if (key === 'serviceEndpoints') console.log('eeee: ' + JSON.parse(value))
        return JSON.parse(value)
      }
    )
  }

  public getEndpointURL(serviceName: string): EndpointInformation {
    const methodEndpoint = this.servicesEndpoints.serviceEndpoints[serviceName][0]
    console.log('Method is: ' + methodEndpoint)
    const urlEndpoint = this.servicesEndpoints.serviceEndpoints[serviceName][1]
    const urlEndpointPath = `${this.getURI()}${urlEndpoint}`
    console.log('URL: ' + urlEndpointPath)
    const myVar: EndpointInformation = {
      method: methodEndpoint,
      urlPath: urlEndpointPath
    }
    return myVar
  }

  public async compute(
    method: string,
    did: string,
    consumerAccount: Account,
    algorithmDid?: string,
    algorithmMeta?: MetadataAlgorithm,
    jobId?: string,
    output?: Output,
    txId?: string,
    serviceIndex?: string,
    serviceType?: string,
    tokenAddress?: string,
    algorithmTransferTxId?: string,
    algorithmDataToken?: string,
    sign = true
  ): Promise<ComputeJob | ComputeJob[]> {
    const address = consumerAccount.getId()
    await this.getNonce(consumerAccount.getId())
    let url = this.getComputeEndpoint()
    url += `?documentId=${noZeroX(did)}`
    if (sign) {
      let signatureMessage = address
      signatureMessage += jobId || ''
      signatureMessage += (did && `${noZeroX(did)}`) || ''
      signatureMessage += this.nonce
      const signature = await this.createHashSignature(consumerAccount, signatureMessage)
      url += `&signature=${signature}`
    }
    // continue to construct Provider URL
    url += (output && `&output=${JSON.stringify(output)}`) || ''
    url += (algorithmDid && `&algorithmDid=${algorithmDid}`) || ''
    url +=
      (algorithmMeta &&
        `&algorithmMeta=${encodeURIComponent(JSON.stringify(algorithmMeta))}`) ||
      ''
    url += (jobId && `&jobId=${jobId}`) || ''
    url += `&consumerAddress=${address}`
    url += (txId && `&transferTxId=${txId}`) || ''
    url +=
      (algorithmTransferTxId && `&algorithmTransferTxId=${algorithmTransferTxId}`) || ''
    url += (algorithmDataToken && `&algorithmDataToken=${algorithmDataToken}`) || ''
    url += `&serviceId=${serviceIndex}` || ''
    url += `&serviceType=${serviceType}` || ''
    url += `&dataToken=${tokenAddress}` || ''
    url += `&consumerAddress=${consumerAccount.getId()}` || ''
    // 'signature': signature,
    // 'documentId': did,
    // 'serviceId': sa.index,
    // 'serviceType': sa.type,
    // 'consumerAddress': cons_acc.address,
    // 'transferTxId': Web3.toHex(tx_id),
    // 'dataToken': data_token,
    // 'output': build_stage_output_dict(dict(), dataset_ddo_w_compute_service, cons_acc.address, pub_acc),
    // 'algorithmDid': alg_ddo.did,
    // 'algorithmMeta': {},
    // 'algorithmDataToken': alg_data_token
    // switch fetch method
    let fetch
    switch (method) {
      case 'post':
        fetch = this.ocean.utils.fetch.post(url, '')
        break
      case 'put':
        fetch = this.ocean.utils.fetch.put(url, '')
        break
      case 'delete':
        fetch = this.ocean.utils.fetch.delete(url)
        break
      default:
        fetch = this.ocean.utils.fetch.get(url)
        break
    }

    const result = await fetch
      .then((response: Response) => {
        if (response.ok) {
          return response.json()
        }

        this.logger.error('Compute job failed:', response.status, response.statusText)

        return null
      })
      .catch((error: Error) => {
        this.logger.error('Error with compute job')
        this.logger.error(error.message)
        throw error
      })

    return result
  }

  public async getVersionInfo(): Promise<Versions> {
    return (await this.ocean.utils.fetch.get(this.url)).json()
  }

  public getURI(): string {
    return `${this.url}`
  }

  public getInitializeEndpoint(): EndpointInformation {
    return this.getEndpointURL('initialize')
  }

  public getNonceEndpoint(): EndpointInformation {
    // Output: NONCE: [Object object]
    console.log('NONCE: ' + this.getEndpointURL('nonce'))
    return this.getEndpointURL('nonce')
  }

  public getEncryptEndpoint(): EndpointInformation {
    return this.getEndpointURL('encrypt')
  }

  public getFileinfoEndpoint(): EndpointInformation {
    return this.getEndpointURL('fileinfo')
  }

  public getComputeEndpointPath(): string {
    return `${apiPath}/compute`
  }

  public getComputeEndpoint(): string {
    return `${this.url}` + this.getComputeEndpointPath()
  }

  public getComputeStatusJob(): EndpointInformation {
    return this.getEndpointURL('computeStatus')
  }

  public getStartComputeJob(): EndpointInformation {
    return this.getEndpointURL('computeStart')
  }

  public getStopComputeJob(): EndpointInformation {
    return this.getEndpointURL('computeStop')
  }

  public getDeleteComputeJob(): EndpointInformation {
    return this.getEndpointURL('computeDelete')
  }

  public getDownloadEndpoint(): EndpointInformation {
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
        if (params && params['provider-address']) return true
      }
      return false
    } catch (error) {
      this.logger.error(`Error validating provider: ${error.message}`)
      return false
    }
  }
}
