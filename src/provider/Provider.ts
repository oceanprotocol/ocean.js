import Account from '../ocean/Account'
import { noZeroX } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { File } from '../ddo/interfaces/File'
import { ComputeJob } from '../ocean/interfaces/ComputeJob'
import { Output } from '../ocean/interfaces/ComputeOutput'
import { MetadataAlgorithm } from '../ddo/interfaces/MetadataAlgorithm'
import { Versions } from '../ocean/Versions'
import { Response } from 'node-fetch'

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
  public get url() {
    return this.baseUrl
  }

  constructor(config: InstantiableConfig) {
    super()
    this.setInstanceConfig(config)
    this.baseUrl = this.config.providerUri
    this.nonce = '0'
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url
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
    const signature = await this.ocean.utils.signature.signWithHash(
      did + this.nonce,
      account.getId(),
      account.getPassword()
    )

    const args = {
      documentId: did,
      signature: signature,
      document: JSON.stringify(document),
      publisherAddress: account.getId()
    }
    try {
      const response = await this.ocean.utils.fetch.post(
        this.getEncryptEndpoint(),
        decodeURI(JSON.stringify(args))
      )
      return (await response.json()).encryptedDocument
    } catch (e) {
      this.logger.error(e)
      throw new Error('HTTP request failed')
    }
  }

  /** Get nonce from provider
   * @param {String} consumerAddress
   * @return {Promise<string>} string
   */
  public async getNonce(consumerAddress: string): Promise<string> {
    let initializeUrl = this.getNonceEndpoint()
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
    let DDO
    try {
      DDO = await this.ocean.assets.resolve(did)
    } catch (e) {
      this.logger.error(e)
      throw new Error('Failed to resolve DID')
    }

    let initializeUrl = this.getInitializeEndpoint()
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
        let consumeUrl = this.getDownloadEndpoint()
        consumeUrl += `?fileIndex=${i}`
        consumeUrl += `&documentId=${did}`
        consumeUrl += `&serviceId=${serviceIndex}`
        consumeUrl += `&serviceType=${serviceType}`
        consumeUrl += `&dataToken=${tokenAddress}`
        consumeUrl += `&transferTxId=${txId}`
        consumeUrl += `&consumerAddress=${account.getId()}`
        consumeUrl += `&signature=${signature}`

        try {
          await this.ocean.utils.fetch.downloadFile(consumeUrl, destination, i)
        } catch (e) {
          this.logger.error('Error consuming assets')
          this.logger.error(e)
          throw e
        }
      })
    await Promise.all(filesPromises)
    return destination
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
    algorithmDataToken?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const address = consumerAccount.getId()
    await this.getNonce(consumerAccount.getId())
    let signatureMessage = address
    signatureMessage += jobId || ''
    signatureMessage += (did && `${noZeroX(did)}`) || ''
    signatureMessage += this.nonce
    const signature = await this.createHashSignature(consumerAccount, signatureMessage)

    // construct Brizo URL
    let url = this.getComputeEndpoint()
    url += `?signature=${signature}`
    url += `&documentId=${noZeroX(did)}`
    url += (output && `&output=${JSON.stringify(output)}`) || ''
    url += (algorithmDid && `&algorithmDid=${algorithmDid}`) || ''
    url +=
      (algorithmMeta &&
        `&algorithmMeta=${encodeURIComponent(JSON.stringify(algorithmMeta))}`) ||
      ''
    url += (jobId && `&jobId=${jobId}`) || ''
    url += `&consumerAddress=${address}`
    url += `&transferTxId=${txId}` || ''
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

  public getInitializeEndpoint(): string {
    return `${this.url}${apiPath}/initialize`
  }

  public getNonceEndpoint(): string {
    return `${this.url}${apiPath}/nonce`
  }

  public getConsumeEndpointShort(): string {
    return `${apiPath}/consume`
  }

  public getConsumeEndpoint(): string {
    return `${this.url}` + this.getConsumeEndpointShort()
  }

  public getEncryptEndpoint(): string {
    return `${this.url}${apiPath}/encrypt`
  }

  public getPublishEndpoint(): string {
    return `${this.url}${apiPath}/publish`
  }

  public getComputeEndpointShort(): string {
    return `${apiPath}/compute`
  }

  public getComputeEndpoint(): string {
    return `${this.url}` + this.getComputeEndpointShort()
  }

  public getDownloadEndpoint(): string {
    return `${this.url}${apiPath}/download`
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 48cb847... extra check
  /** Check for a valid provider at URL
   * @param {String} url
   * @return {Promise<boolean>} string
   */
<<<<<<< HEAD
=======
>>>>>>> 17e61d0... allow customProvider on publish
=======
>>>>>>> 48cb847... extra check
  public async isValidProvider(url: string): Promise<boolean> {
    const fetch = this.ocean.utils.fetch.get(url)
    await fetch
      .then((response: Response) => {
        if (response.ok) {
          const params = response.json()
<<<<<<< HEAD
<<<<<<< HEAD
          if (params['provider-address']) return true
=======
          if (params) return true
>>>>>>> 17e61d0... allow customProvider on publish
=======
          if (params['provider-address']) return true
>>>>>>> 48cb847... extra check
        }
        return false
      })
      .catch((error: Error) => {
        this.logger.error('Error validating provider')
        this.logger.error(error.message)
        return false
      })
    return false
  }
}
