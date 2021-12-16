import { DDO } from '../ddo/DDO'
import { Metadata } from '../ddo/interfaces/Metadata'
import {
  Service,
  ServiceAccess,
  ServiceCustomParameter,
  ServiceCustomParametersRequired
} from '../ddo/interfaces/Service'
import { SearchQuery } from '../metadatacache/MetadataCache'
import { EditableMetadata } from '../ddo/interfaces/EditableMetadata'
import Account from './Account'
import DID from './DID'
import { SubscribablePromise, didNoZeroX, didPrefixed, assetResolve } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { WebServiceConnector } from './utils/WebServiceConnector'
import BigNumber from 'bignumber.js'
import { Provider, UserCustomParameters } from '../provider/Provider'
import { isAddress } from 'web3-utils'
import { MetadataMain } from '../ddo/interfaces'
import { TransactionReceipt } from 'web3-core'
import { updateCredentialDetail, removeCredentialDetail } from './AssetsCredential'
import { Consumable } from '../ddo/interfaces/Consumable'
import { EventAccessControl } from './EventAccessControl'

export enum CreateProgressStep {
  CreatingDataToken,
  DataTokenCreated,
  EncryptingFiles,
  FilesEncrypted,
  StoringDdo,
  DdoStored
}

export enum OrderProgressStep {
  TransferDataToken
}

export interface Order {
  dtAddress: string
  amount: string
  timestamp: number
  transactionHash: string
  consumer: string
  payer: string
  did?: string
  serviceId?: number
  serviceType?: string
}

/**
 * Assets submodule of Ocean Protocol.
 */
export class Assets extends Instantiable {
  /**
   * Returns the instance of Assets.
   * @return {Promise<Assets>}
   */
  public static async getInstance(config: InstantiableConfig): Promise<Assets> {
    const instance = new Assets()
    instance.setInstanceConfig(config)

    return instance
  }

  /**
   * Creates a new DDO. After this, Call ocean.onChainMetadata.to publish
   * @param  {Metadata} metadata DDO metadata.
   * @param  {Account}  publisher Publisher account.
   * @param  {list} services list of Service description documents
   * @param {String} dtAddress existing Data Token Address
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {String} providerUri
   * @return {SubscribablePromise<CreateProgressStep, DDO>}
   */
  public create(
    metadata: Metadata,
    publisher: Account,
    services: Service[] = [],
    dtAddress?: string,
    cap?: string,
    name?: string,
    symbol?: string,
    providerUri?: string
  ): SubscribablePromise<CreateProgressStep, DDO> {
    if (dtAddress && !isAddress(dtAddress)) {
      this.logger.error(
        `Passed Data Token address ${dtAddress} is not valid. Aborting publishing.`
      )
      return null
    }
    this.logger.log('Creating asset')
    return new SubscribablePromise(async (observer) => {
      if (services.length === 0) {
        this.logger.log('You have no services. Are you sure about this?')
      }
      const { datatokens } = this.ocean
      if (!dtAddress) {
        this.logger.log('Creating datatoken')
        observer.next(CreateProgressStep.CreatingDataToken)
        // const metadataCacheUri = this.ocean.metadataCache.getURI()
        // const jsonBlob = { t: 1, url: metadataCacheUri }
        dtAddress = await datatokens.create('', publisher.getId(), cap, name, symbol)

        if (!isAddress(dtAddress)) {
          this.logger.error(
            `Created Data Token address ${dtAddress} is not valid. Aborting publishing.`
          )
          return null
        }

        this.logger.log(`DataToken ${dtAddress} created`)
        observer.next(CreateProgressStep.DataTokenCreated)
      }

      const did: DID = DID.generate(dtAddress)

      this.logger.log('Encrypting files')
      observer.next(CreateProgressStep.EncryptingFiles)
      let provider: Provider

      if (providerUri) {
        provider = await Provider.getInstance(this.instanceConfig)
        await provider.setBaseUrl(providerUri)
      } else provider = this.ocean.provider
      const encryptedFiles = await provider.encrypt(
        did.getDid(),
        metadata.main.files,
        publisher
      )
      this.logger.log('Files encrypted')
      observer.next(CreateProgressStep.FilesEncrypted)

      let indexCount = 0
      // create ddo itself
      const ddo: DDO = new DDO({
        id: did.getDid(),
        dataToken: dtAddress,
        authentication: [
          {
            type: 'RsaSignatureAuthentication2018',
            publicKey: did.getDid()
          }
        ],
        publicKey: [
          {
            id: did.getDid(),
            type: 'EthereumECDSAKey',
            owner: publisher.getId()
          }
        ],
        service: [
          {
            type: 'metadata',
            attributes: {
              // Default values
              status: {
                isListed: true,
                isRetired: false,
                isOrderDisabled: false
              },
              // Overwrites defaults
              ...metadata,
              encryptedFiles,
              // Cleaning not needed information
              main: {
                ...metadata.main,
                files: metadata.main.files.map((file, index) => ({
                  ...file,
                  index,
                  url: undefined
                }))
              } as MetadataMain
            }
          },
          ...services
        ]
          // Remove duplications
          .reverse()
          .filter(
            ({ type }, i, list) => list.findIndex(({ type: t }) => t === type) === i
          )
          .reverse()
          // Adding index
          .map((_) => ({
            ..._,
            index: indexCount++
          })) as Service[]
      })
      await ddo.addProof(this.ocean, publisher.getId())
      ddo.dataTokenInfo = {
        name: name,
        symbol: symbol,
        address: dtAddress,
        cap: parseFloat(cap)
      }
      return ddo
      /* Remeber to call ocean.onChainMetadata.publish after creating the DDO.
      
      this.logger.log('Storing DDO')
      observer.next(CreateProgressStep.StoringDdo)
      const storeTx = await this.ocean.onChainMetadata.publish(
        ddo.id,
        ddo,
        publisher.getId()
      )
      this.logger.log('DDO stored ' + ddo.id)
      observer.next(CreateProgressStep.DdoStored)
      if (storeTx) return ddo
      else return null
      */
    })
  }

  /**
   * Returns a DDO by DID.
   * @param  {string} did Decentralized ID.
   * @return {Promise<DDO>}
   */
  public async resolve(did: string): Promise<DDO> {
    return this.ocean.metadataCache.retrieveDDO(did)
  }

  /**    Metadata updates
   *  Don't forget to call ocean.OnChainmetadataCache.update after using this functions
   * ie:  ocean.OnChainmetadataCache.update(ddo.id,ddo,account.getId())
   */

  /**
   * Edit Metadata for a DID.
   * @param  {ddo} DDO
   * @param  {newMetadata}  EditableMetadata Metadata fields & new values.
   * @return {Promise<DDO>} the new DDO
   */
  public async editMetadata(ddo: DDO, newMetadata: EditableMetadata): Promise<DDO> {
    if (!ddo) return null
    for (let i = 0; i < ddo.service.length; i++) {
      if (ddo.service[i].type !== 'metadata') continue
      if (newMetadata.title) ddo.service[i].attributes.main.name = newMetadata.title
      if (newMetadata.author) ddo.service[i].attributes.main.author = newMetadata.author
      if (!ddo.service[i].attributes.additionalInformation)
        ddo.service[i].attributes.additionalInformation = Object()
      if (newMetadata.description)
        ddo.service[i].attributes.additionalInformation.description =
          newMetadata.description
      if (newMetadata.links) {
        ddo.service[i].attributes.additionalInformation.links = newMetadata.links
      } else {
        ddo.service[i].attributes.additionalInformation.links = []
      }

      if (newMetadata.status?.isOrderDisabled !== undefined) {
        !ddo.service[i].attributes.status
          ? (ddo.service[i].attributes.status = {
              isOrderDisabled: newMetadata.status.isOrderDisabled
            })
          : (ddo.service[i].attributes.status.isOrderDisabled =
              newMetadata.status.isOrderDisabled)
      }
    }
    return ddo
  }

  /**
   * Update Credentials attribute in DDO
   * @param  {ddo} DDO
   * @param {credentialType} string e.g. address / credentail3Box
   * @param {allowList} string[] List of allow credential
   * @param {denyList} string[] List of deny credential
   * @return {Promise<DDO>} Updated DDO
   */
  public async updateCredentials(
    ddo: DDO,
    credentialType: string,
    allowList: string[],
    denyList: string[]
  ): Promise<DDO> {
    let newDDo
    if (allowList && allowList.length > 0) {
      newDDo = updateCredentialDetail(ddo, credentialType, allowList, 'allow')
    } else {
      newDDo = removeCredentialDetail(ddo, credentialType, 'allow')
    }
    if (denyList && denyList.length > 0) {
      newDDo = updateCredentialDetail(ddo, credentialType, denyList, 'deny')
    } else {
      newDDo = removeCredentialDetail(ddo, credentialType, 'deny')
    }
    return newDDo
  }

  /**
   * check if a credential can consume a dataset
   * @param  {ddo} DDO
   * @param {credentialType} string e.g. address / credentail3Box
   * @param {value} string credential
   * @return {Consumable} allowed  0 = OK , 2 - Credential not in allow list, 3 - Credential in deny list
   */
  public checkCredential(ddo: DDO, credentialType: string, value: string): Consumable {
    let status = 0
    let message = 'All good'
    let result = true
    if (ddo.credentials) {
      if (ddo.credentials.allow && ddo.credentials.allow.length > 0) {
        const allowList = ddo.credentials.allow.find(
          (credentail) => credentail.type === credentialType
        )
        if (allowList && !allowList.values.includes(value)) {
          status = 2
          message = 'Access is denied, your wallet address is not found on allow list'
          result = false
        }
      }
      if (ddo.credentials.deny && ddo.credentials.deny.length > 0) {
        const denyList = ddo.credentials.deny.find(
          (credentail) => credentail.type === credentialType
        )
        if (denyList && denyList.values.includes(value)) {
          status = 3
          message = 'Access is denied, your wallet address is found on deny list'
          result = false
        }
      }
    }
    return { status, message, result }
  }

  /**
   * Publish DDO on chain.
   * @param  {ddo} DDO
   * @param {String} consumerAccount
   * @param {boolean} encrypt
   * @return {Promise<TransactionReceipt>} transaction
   */
  public async publishDdo(
    ddo: DDO,
    consumerAccount: string,
    encrypt: boolean = false
  ): Promise<TransactionReceipt> {
    return await this.ocean.onChainMetadata.publish(ddo.id, ddo, consumerAccount, encrypt)
  }

  /**
   * Update Metadata on chain.
   * @param  {ddo} DDO
   * @param {String} consumerAccount
   * @return {Promise<TransactionReceipt>} transaction
   */
  public async updateMetadata(
    ddo: DDO,
    consumerAccount: string
  ): Promise<TransactionReceipt> {
    return await this.ocean.onChainMetadata.update(ddo.id, ddo, consumerAccount)
  }

  /**
   * Edit Service Timeouts
   * @param  {ddo} DDO if empty, will trigger a retrieve
   * @param  {number} serviceIndex Index of the compute service in the DDO.
   * @param  {number} timeout New timeout setting
   * @return {Promise<DDO>}
   */
  public async editServiceTimeout(
    ddo: DDO,
    serviceIndex: number,
    timeout: number
  ): Promise<DDO> {
    if (!ddo) return null
    if (typeof ddo.service[serviceIndex] === 'undefined') return null
    if (timeout < 0) return null
    ddo.service[serviceIndex].attributes.main.timeout = parseInt(timeout.toFixed())
    return ddo
  }
  /**    End metadata updates   */

  /**
   * Returns the creator of a asset.
   * @param  {DDO|string} asset DID Descriptor Object containing all the data related to an asset or a Decentralized identifier.
   * @return {Promise<string>} Returns eth address
   */
  public async creator(asset: DDO | string): Promise<string> {
    const { did, ddo } = await assetResolve(asset, this.ocean)
    const checksum = ddo.getChecksum()
    const { creator, signatureValue } = ddo.proof
    const signer = await this.ocean.utils.signature.verifyText(checksum, signatureValue)

    if (signer.toLowerCase() !== creator.toLowerCase()) {
      this.logger.warn(
        `Owner of ${did} doesn't match. Expected ${creator} instead of ${signer}.`
      )
    }

    return creator
  }

  public async getServiceByType(
    asset: DDO | string,
    serviceType: string
  ): Promise<Service> {
    const { ddo } = await assetResolve(asset, this.ocean)
    let service: Service
    const services: Service[] = ddo.service

    services.forEach((serv) => {
      if (serv.type.toString() === serviceType) {
        service = serv
      }
    })
    return service
  }

  public async getServiceByIndex(
    asset: DDO | string,
    serviceIndex: number
  ): Promise<Service> {
    const { ddo } = await assetResolve(asset, this.ocean)
    let service: Service
    const services: Service[] = ddo.service

    services.forEach((serv) => {
      if (serv.index === serviceIndex) {
        service = serv
      }
    })
    return service
  }

  /**
   * Search over the assets using a query.
   * @param  {SearchQuery} query Query to filter the assets.
   * @return {Promise<QueryResult>}
   */
  public async query(query: SearchQuery): Promise<any> {
    return this.ocean.metadataCache.queryMetadata(query)
  }
  /**
   * Creates an access service
   * @param {Account} creator
   * @param {String} cost  number of datatokens needed for this service
   * @param {String} datePublished
   * @param {Number} timeout
   * @param {String} providerUri
   * @param {ServiceCustomParametersRequired} requiredParameters
   * @return {Promise<ServiceAccess>} service
   */

  public async createAccessServiceAttributes(
    creator: Account,
    cost: string,
    datePublished: string,
    timeout: number = 0,
    providerUri?: string,
    requiredParameters?: ServiceCustomParametersRequired
  ): Promise<ServiceAccess> {
    const service: ServiceAccess = {
      type: 'access',
      index: 2,
      serviceEndpoint: providerUri || this.ocean.provider.url,
      attributes: {
        main: {
          creator: creator.getId(),
          datePublished,
          cost,
          timeout: timeout,
          name: 'dataAssetAccess'
        }
      }
    }
    if (requiredParameters?.userCustomParameters)
      service.attributes.userCustomParameters = requiredParameters.userCustomParameters
    if (requiredParameters?.algoCustomParameters)
      service.attributes.algoCustomParameters = requiredParameters.algoCustomParameters
    return service
  }

  /**
   * Initialize a service
   * Can be used to compute totalCost for ordering a service
   * @param {DDO|string} asset DID Descriptor Object containing all the data related to an asset or a Decentralized identifier.
   * @param {String} serviceType
   * @param {String} consumerAddress
   * @param {Number} serviceIndex
   * @param {String} serviceEndpoint
   * @param {UserCustomParameters} userCustomParameters
   * @return {Promise<any>} Order details
   */
  public async initialize(
    asset: DDO | string,
    serviceType: string,
    consumerAddress: string,
    serviceIndex: number = -1,
    serviceEndpoint: string,
    userCustomParameters?: UserCustomParameters
  ): Promise<any> {
    const provider = await Provider.getInstance(this.instanceConfig)
    await provider.setBaseUrl(serviceEndpoint)
    const res = await provider.initialize(
      asset,
      serviceIndex,
      serviceType,
      consumerAddress,
      userCustomParameters
    )
    if (res === null) return null
    const providerData = JSON.parse(res)
    return providerData
  }

  /**
   * Orders & pays for a service
   * @param {DDO|string} asset DID Descriptor Object containing all the data related to an asset or a Decentralized identifier.
   * @param {String} serviceType
   * @param {String} payerAddress
   * @param {Number} serviceIndex
   * @param {String} mpAddress Marketplace fee collector address
   * @param {String} consumerAddress Optionally, if the consumer is another address than payer
   * @param {UserCustomParameters} userCustomParameters
   * @return {Promise<String>} transactionHash of the payment
   */
  public async order(
    asset: DDO | string,
    serviceType: string,
    payerAddress: string,
    serviceIndex: number = -1,
    mpAddress?: string,
    consumerAddress?: string,
    userCustomParameters?: UserCustomParameters,
    authService = 'json',
    searchPreviousOrders = true
  ): Promise<string> {
    let service: Service
    const { ddo } = await assetResolve(asset, this.ocean)
    const consumable = await this.isConsumable(ddo, payerAddress, 'address', authService)
    if (!consumable.result) {
      throw new Error(`Order asset failed, ` + consumable.message)
    }

    if (!consumerAddress) consumerAddress = payerAddress
    if (serviceIndex === -1) {
      service = await this.getServiceByType(ddo, serviceType)
      serviceIndex = service.index
    } else {
      service = await this.getServiceByIndex(ddo, serviceIndex)
      serviceType = service.type
    }
    // TODO validate userCustomParameters
    if (
      !(await this.isUserCustomParametersValid(
        service.attributes.userCustomParameters,
        userCustomParameters
      ))
    ) {
      throw new Error(
        `Order asset failed, Missing required fiels in userCustomParameters`
      )
    }
    try {
      const providerData = await this.initialize(
        ddo,
        serviceType,
        payerAddress,
        serviceIndex,
        service.serviceEndpoint,
        userCustomParameters
      )
      if (!providerData)
        throw new Error(
          `Order asset failed, Failed to initialize service to compute totalCost for ordering`
        )
      if (searchPreviousOrders) {
        const previousOrder = await this.ocean.datatokens.getPreviousValidOrders(
          providerData.dataToken,
          providerData.numTokens,
          serviceIndex,
          service.attributes.main.timeout,
          consumerAddress
        )
        if (previousOrder) return previousOrder
      }
      const balance = new BigNumber(
        await this.ocean.datatokens.balance(providerData.dataToken, payerAddress)
      )
      const totalCost = new BigNumber(String(providerData.numTokens))
      if (balance.isLessThan(totalCost)) {
        this.logger.error(
          'ERROR: Not enough funds Needed ' +
            totalCost.toString() +
            ' but balance is ' +
            balance.toString()
        )
        throw new Error(
          'ERROR: Not enough funds Needed ' +
            totalCost.toString() +
            ' but balance is ' +
            balance.toString()
        )
      }
      const txid = await this.ocean.datatokens.startOrder(
        providerData.dataToken,
        consumerAddress,
        String(providerData.numTokens),
        serviceIndex,
        mpAddress,
        payerAddress
      )
      if (txid) return txid.transactionHash
    } catch (e) {
      this.logger.error(`ERROR: Failed to order a service : ${e.message}`)
      throw new Error(`${e.message}`)
    }
  }

  // marketplace flow
  public async download(
    asset: DDO | string,
    txId: string,
    tokenAddress: string,
    consumerAccount: Account,
    destination: string
  ): Promise<string | true> {
    const { did, ddo } = await assetResolve(asset, this.ocean)
    const { attributes } = ddo.findServiceByType('metadata')
    const service = ddo.findServiceByType('access')
    const { files } = attributes.main
    const { serviceEndpoint } = service

    if (!serviceEndpoint) {
      throw new Error(
        'Consume asset failed, service definition is missing the `serviceEndpoint`.'
      )
    }

    this.logger.log('Consuming files')

    destination = destination
      ? `${destination}/datafile.${ddo.shortId()}.${service.index}/`
      : undefined
    const provider = await Provider.getInstance(this.instanceConfig)
    await provider.setBaseUrl(serviceEndpoint)
    await provider.download(
      did,
      txId,
      tokenAddress,
      service.type,
      service.index.toString(),
      destination,
      consumerAccount,
      files
    )
    return true
  }

  // simple flow
  public async simpleDownload(
    dtAddress: string,
    serviceEndpoint: string,
    txId: string,
    account: string
  ): Promise<string> {
    let consumeUrl = serviceEndpoint
    consumeUrl += `?consumerAddress=${account}`
    consumeUrl += `&tokenAddress=${dtAddress}`
    consumeUrl += `&transferTxId=${txId}`
    const serviceConnector = new WebServiceConnector(
      this.logger,
      this.instanceConfig?.config?.requestTimeout
    )
    try {
      await serviceConnector.downloadFile(consumeUrl)
    } catch (e) {
      this.logger.error('Error consuming assets')
      this.logger.error(e)
      throw e
    }
    return serviceEndpoint
  }

  /**
   * get Order History
   * @param {Account} account
   * @param {string} serviceType Optional, filter by
   * @param {number} fromBlock Optional, start at block
   * @return {Promise<OrderHistory[]>} transactionHash of the payment
   */
  public async getOrderHistory(
    account: Account,
    serviceType?: string,
    fromBlock?: number
  ): Promise<Order[]> {
    const results: Order[] = []
    const address = account.getId().toLowerCase()
    const { datatokens } = this.ocean
    const topic1 = '0x000000000000000000000000' + address.substring(2)
    const topic0 = datatokens.getStartOrderEventSignature()
    const events = await this.web3.eth.getPastLogs({
      topics: [topic0, null, topic1],
      fromBlock: fromBlock || 0,
      toBlock: 'latest'
    })

    for (let i = 0; i < events.length; i++) {
      const order: Order = {
        dtAddress: events[i].address,
        timestamp: 0,
        transactionHash: events[i].transactionHash,
        amount: null,
        consumer: '0x' + events[i].topics[1].substring(events[i].topics[1].length - 40),
        payer: '0x' + events[i].topics[2].substring(events[i].topics[2].length - 40)
      }
      try {
        const params = this.web3.eth.abi.decodeParameters(
          ['uint256', 'uint256', 'uint256', 'uint256'],
          events[i].data
        )
        order.serviceId = parseInt(params[1])
        order.timestamp = parseInt(params[2])
        order.amount = this.web3.utils.fromWei(params[0])
        order.did = didPrefixed(didNoZeroX(order.dtAddress))
        const service = await this.getServiceByIndex(order.did, order.serviceId)
        order.serviceType = service.type
        if (!serviceType || (serviceType && serviceType === service.type))
          results.push(order)
      } catch (e) {}
    }
    return results
  }

  /**
   *
   * @param {DDO} ddo
   * @param {consumer} string
   * @return {Promise<Consumable>}
   */
  public async isConsumable(
    ddo: DDO,
    consumer?: string,
    credentialsType?: string,
    authService?: string
  ): Promise<Consumable> {
    if (!ddo) throw new Error('ERROR: DDO does not exist')
    const allowedConsume = { status: 0, message: 'All good', result: true }
    const orderDisabled = {
      status: 1,
      message: 'Ordering this asset has been temporarily disabled by the publisher.',
      result: false
    }
    const denyConsume = {
      status: 2,
      message: 'Consume access is denied.',
      result: false
    }

    const metadata = ddo.findServiceByType('metadata')
    if (metadata.attributes.status?.isOrderDisabled) return orderDisabled

    const config = this.instanceConfig
    if (consumer && config?.config?.rbacUri) {
      const eventAccessControl = await EventAccessControl.getInstance(this.instanceConfig)
      const isPermit = await eventAccessControl.isPermit(
        'market',
        'consume',
        authService,
        consumer,
        credentialsType,
        ddo.id
      )
      if (!isPermit) return denyConsume
    }
    return allowedConsume
  }

  /**
   * Validate custom user parameters (user & algorithms)
   * @param {ServiceCustomParameter[]} serviceCustomParameters
   * @param {UserCustomParameters} userCustomParameters
   * @return {Promise<Boolean>}
   */
  public async isUserCustomParametersValid(
    serviceCustomParameters: ServiceCustomParameter[],
    userCustomParameters?: UserCustomParameters
  ): Promise<boolean> {
    if (serviceCustomParameters)
      for (const data of serviceCustomParameters) {
        const keyname = data.name
        if (data.required && (!userCustomParameters || !userCustomParameters[keyname])) {
          this.logger.error('Missing key: ' + keyname + ' from customData')
          return false
        }
      }
    return true
  }
}
