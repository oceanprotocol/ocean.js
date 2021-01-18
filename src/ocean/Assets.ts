import { SearchQuery, QueryResult } from '../metadatacache/MetadataCache'
import { DDO } from '../ddo/DDO'
import { Metadata } from '../ddo/interfaces/Metadata'
import { Service, ServiceAccess } from '../ddo/interfaces/Service'
import { EditableMetadata } from '../ddo/interfaces/EditableMetadata'
import Account from './Account'
import DID from './DID'
import { SubscribablePromise, didNoZeroX, didPrefixed } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { WebServiceConnector } from './utils/WebServiceConnector'
import BigNumber from 'bignumber.js'
import { Provider } from '../provider/Provider'
import { isAddress } from 'web3-utils'
import { MetadataMain } from '../ddo/interfaces'
import { TransactionReceipt } from 'web3-core'

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
   * Creates a new DDO and publishes it
   * @param  {Metadata} metadata DDO metadata.
   * @param  {Account}  publisher Publisher account.
   * @param  {list} services list of Service description documents
   * @param {String} dtAddress existing Data Token Address
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {String} providerUri
   * @return {Promise<DDO>}
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
        provider = new Provider(this.instanceConfig)
        provider.setBaseUrl(providerUri)
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
              curation: {
                rating: 0,
                numVotes: 0
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
        name: await datatokens.getName(dtAddress),
        symbol: await datatokens.getSymbol(dtAddress),
        address: dtAddress,
        cap: parseFloat(await datatokens.getCap(dtAddress))
      }
      this.logger.log('Storing DDO')
      observer.next(CreateProgressStep.StoringDdo)
      // const storedDdo = await this.ocean.metadataCache.storeDDO(ddo)
      const storeTx = await this.ocean.onChainMetadata.publish(
        ddo.id,
        ddo,
        publisher.getId()
      )
      this.logger.log('DDO stored ' + ddo.id)
      observer.next(CreateProgressStep.DdoStored)
      if (storeTx) return ddo
      else return null
    })
  }

  /**
   * Returns the assets of a owner.
   * @param  {string} owner Owner address.
   * @return {Promise<string[]>} List of DIDs.
   */
  public async ownerAssets(owner: string): Promise<QueryResult> {
    return this.ocean.metadataCache.getOwnerAssets(owner)
  }

  /**
   * Returns a DDO by DID.
   * @param  {string} did Decentralized ID.
   * @return {Promise<DDO>}
   */
  public async resolve(did: string): Promise<DDO> {
    return this.ocean.metadataCache.retrieveDDO(did)
  }

  public async resolveByDTAddress(
    dtAddress: string,
    offset?: number,
    page?: number,
    sort?: number
  ): Promise<DDO[]> {
    const searchQuery = {
      offset: offset || 100,
      page: page || 1,
      query: {
        dataToken: [dtAddress]
      },
      sort: {
        value: sort || 1
      },
      text: dtAddress
    } as SearchQuery
    return (await this.ocean.metadataCache.queryMetadata(searchQuery)).results
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
      if (!ddo.service[i].attributes.additionalInformation)
        ddo.service[i].attributes.additionalInformation = Object()
      if (newMetadata.description)
        ddo.service[i].attributes.additionalInformation.description =
          newMetadata.description
      if (newMetadata.links)
        ddo.service[i].attributes.additionalInformation.links = newMetadata.links
    }
    return ddo
  }

  /**
   * Update Metadata on chain.
   * @param  {ddo} DDO
   * @param {String} consumerAccount
   * @return {Promise<TransactionReceipt>} exchangeId
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
   * @param  {string} did Decentralized ID.
   * @return {Promise<string>} Returns eth address
   */
  public async creator(did: string): Promise<string> {
    const ddo = await this.resolve(did)
    const checksum = ddo.getChecksum()
    const { creator, signatureValue } = ddo.proof
    const signer = await this.ocean.utils.signature.verifyText(checksum, signatureValue)

    if (signer.toLowerCase() !== creator.toLowerCase()) {
      this.logger.warn(
        `Owner of ${ddo.id} doesn't match. Expected ${creator} instead of ${signer}.`
      )
    }

    return creator
  }

  /**
   * Search over the assets using a query.
   * @param  {SearchQuery} query Query to filter the assets.
   * @return {Promise<QueryResult>}
   */
  public async query(query: SearchQuery): Promise<QueryResult> {
    return this.ocean.metadataCache.queryMetadata(query)
  }

  /**
   * Search over the assets using a keyword.
   * @param  {SearchQuery} text Text to filter the assets.
   * @return {Promise<QueryResult>}
   */
  public async search(text: string): Promise<QueryResult> {
    return this.ocean.metadataCache.queryMetadata({
      text,
      page: 1,
      offset: 100,
      query: {
        value: 1
      },
      sort: {
        value: 1
      }
    } as SearchQuery)
  }

  public async getServiceByType(did: string, serviceType: string): Promise<Service> {
    let service: Service
    const services: Service[] = (await this.resolve(did)).service

    services.forEach((serv) => {
      if (serv.type.toString() === serviceType) {
        service = serv
      }
    })
    return service
  }

  public async getServiceByIndex(did: string, serviceIndex: number): Promise<Service> {
    let service: Service
    const services: Service[] = (await this.resolve(did)).service

    services.forEach((serv) => {
      if (serv.index === serviceIndex) {
        service = serv
      }
    })
    return service
  }

  /**
   * Creates an access service
   * @param {Account} creator
   * @param {String} cost  number of datatokens needed for this service
   * @param {String} datePublished
   * @param {Number} timeout
   * @return {Promise<string>} service
   */
  public async createAccessServiceAttributes(
    creator: Account,
    cost: string,
    datePublished: string,
    timeout = 0,
    providerUri?: string
  ): Promise<ServiceAccess> {
    return {
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
  }

  /**
   * Initialize a service
   * Can be used to compute totalCost for ordering a service
   * @param {String} did
   * @param {String} serviceType
   * @param {String} consumerAddress
   * @param {Number} serviceIndex
   * @param {String} serviceEndpoint
   * @return {Promise<any>} Order details
   */
  public async initialize(
    did: string,
    serviceType: string,
    consumerAddress: string,
    serviceIndex = -1,
    serviceEndpoint: string
  ): Promise<any> {
    const provider = new Provider(this.instanceConfig)
    provider.setBaseUrl(serviceEndpoint)
    const res = await provider.initialize(did, serviceIndex, serviceType, consumerAddress)
    if (res === null) return null
    const providerData = JSON.parse(res)
    return providerData
  }

  /**
   * Orders & pays for a service
   * @param {String} did
   * @param {String} serviceType
   * @param {String} payerAddress
   * @param {Number} serviceIndex
   * @param {String} mpAddress Marketplace fee collector address
   * @param {String} consumerAddress Optionally, if the consumer is another address than payer
   * @return {Promise<String>} transactionHash of the payment
   */
  public async order(
    did: string,
    serviceType: string,
    payerAddress: string,
    serviceIndex = -1,
    mpAddress?: string,
    consumerAddress?: string
  ): Promise<string> {
    let service: Service

    if (!consumerAddress) consumerAddress = payerAddress
    if (serviceIndex === -1) {
      service = await this.getServiceByType(did, serviceType)
      serviceIndex = service.index
    } else {
      service = await this.getServiceByIndex(did, serviceIndex)
      serviceType = service.type
    }
    const { datatokens } = this.ocean
    try {
      const providerData = await this.initialize(
        did,
        serviceType,
        payerAddress,
        serviceIndex,
        service.serviceEndpoint
      )
      if (!providerData) return null
      service = await this.getServiceByIndex(did, serviceIndex)
      const previousOrder = await datatokens.getPreviousValidOrders(
        providerData.dataToken,
        providerData.numTokens,
        serviceIndex,
        service.attributes.main.timeout,
        consumerAddress
      )
      if (previousOrder) return previousOrder
      const balance = new BigNumber(
        await datatokens.balance(providerData.dataToken, payerAddress)
      )
      const totalCost = new BigNumber(String(providerData.numTokens))
      if (balance.isLessThan(totalCost)) {
        this.logger.error(
          'ERROR: Not enough funds Needed ' +
            totalCost.toString() +
            ' but balance is ' +
            balance.toString()
        )
        return null
      }
      const txid = await datatokens.startOrder(
        providerData.dataToken,
        consumerAddress,
        String(providerData.numTokens),
        serviceIndex,
        mpAddress,
        payerAddress
      )
      if (txid) return txid.transactionHash
    } catch (e) {
      this.logger.error(`ERROR: Failed to order: ${e.message}`)
    }
    return null
  }

  // marketplace flow
  public async download(
    did: string,
    txId: string,
    tokenAddress: string,
    consumerAccount: Account,
    destination: string
  ): Promise<string | true> {
    const ddo = await this.resolve(did)
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
    const provider = new Provider(this.instanceConfig)
    provider.setBaseUrl(serviceEndpoint)
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
    const serviceConnector = new WebServiceConnector(this.logger)
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
}
