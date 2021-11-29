import { DDO } from '../ddo/DDO'
import {
  Service,
  ServiceComputePrivacy,
  ServiceCompute,
  publisherTrustedAlgorithm,
  ServiceCustomParametersRequired
} from '../ddo/interfaces/Service'
import Account from './Account'
import { SubscribablePromise, assetResolve, AssetResolved } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import {
  ComputeOutput,
  ComputeJob,
  ComputeInput,
  ComputeAlgorithm
} from './interfaces/Compute'
import { Provider, UserCustomParameters } from '../provider/Provider'
import { SHA256 } from 'crypto-js'

export enum OrderProgressStep {
  TransferDataToken
}

export interface Cluster {
  type: string
  url: string
}

export interface Container {
  image: string
  tag: string
  checksum: string
}

export interface Server {
  serverId: string
  serverType: string
  cost: string
  cpu: string
  gpu: string
  memory: string
  disk: string
  maxExecutionTime: number
}

export const ComputeJobStatus = Object.freeze({
  WarmingUp: 1,
  Started: 10,
  ConfiguringVolumes: 20,
  ProvisioningSuccess: 30,
  DataProvisioningFailed: 31,
  AlgorithmProvisioningFailed: 32,
  RunningAlgorithm: 40,
  FilteringResults: 50,
  PublishingResult: 60,
  Completed: 70,
  Stopped: 80,
  Deleted: 90
})

/**
 * Compute submodule of Ocean Protocol.
 */
export class Compute extends Instantiable {
  /**
   * Returns the instance of Compute.
   * @return {Promise<Assets>}
   */
  public static async getInstance(config: InstantiableConfig): Promise<Compute> {
    const instance = new Compute()
    instance.setInstanceConfig(config)

    return instance
  }

  /**
   * Gets the compute address for ordering compute assets
   * @param  {string} did Decentralized identifer of the primary asset (this will determine where compute happens)
   * @param  {number} serviceIndex If asset has multiple compute services
   * @return {Promise<String>} Returns compute address
   */
  public async getComputeAddress(did: string, serviceIndex = -1): Promise<string> {
    let service: Service
    let serviceType = 'compute'
    if (serviceIndex === -1) {
      service = await this.ocean.assets.getServiceByType(did, serviceType)
      serviceIndex = service.index
    } else {
      service = await this.ocean.assets.getServiceByIndex(did, serviceIndex)
      serviceType = service.type
    }
    const { serviceEndpoint } = service
    const provider = await Provider.getInstance(this.instanceConfig)
    await provider.setBaseUrl(serviceEndpoint)
    return provider.computeAddress
  }

  /**
   * Start the execution of a compute job.
   * @param  {DDO|string} asset DID Descriptor Object containing all the data related to an asset or a Decentralized identifier.
   * @param  {string} txId
   * @param  {string} tokenAddress
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {string} algorithmDid The DID of the algorithm asset (of type `algorithm`) to run on the asset.
   * @param  {MetaData} algorithmMeta Metadata about the algorithm being run if `algorithm` is being used. This is ignored when `algorithmDid` is specified.
   * @param  {Output} output Define algorithm output publishing. Publishing the result of a compute job is turned off by default.
   * @return {Promise<ComputeJob>} Returns compute job ID under status.jobId
   */
  public async start(
    asset: DDO | string,
    txId: string,
    tokenAddress: string,
    consumerAccount: Account,
    algorithm: ComputeAlgorithm,
    output?: ComputeOutput,
    serviceIndex?: string,
    serviceType?: string,
    additionalInputs?: ComputeInput[]
  ): Promise<ComputeJob> {
    output = this.checkOutput(consumerAccount, output)
    const { did, ddo } = await assetResolve(asset, this.ocean)
    const service = ddo.findServiceByType('compute')
    const { serviceEndpoint } = service
    if (algorithm.serviceIndex) {
      const { ddo } = await assetResolve(algorithm.did, this.ocean)
      const algoService: Service = ddo.findServiceById(algorithm.serviceIndex)
      if (
        !(await this.ocean.assets.isUserCustomParametersValid(
          algoService.attributes.algoCustomParameters,
          algorithm.algoCustomParameters
        ))
      ) {
        return null
      }
    }
    if (did && txId) {
      const provider = await Provider.getInstance(this.instanceConfig)
      await provider.setBaseUrl(serviceEndpoint)
      const computeJobsList = await provider.computeStart(
        did,
        consumerAccount,
        algorithm,
        output,
        txId,
        serviceIndex,
        serviceType,
        tokenAddress,
        additionalInputs
      )
      if (computeJobsList) return computeJobsList[0] as ComputeJob
      else return null
    }
    return null
  }

  /**
   * Ends a running compute job.
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {DDO|string} asset DID Descriptor Object containing all the data related to an asset or a Decentralized identifier.
   * @param  {string} jobId The ID of the compute job to be stopped
   * @return {Promise<ComputeJob>} Returns the new status of a job
   */
  public async stop(
    consumerAccount: Account,
    asset: DDO | string,
    jobId: string
  ): Promise<ComputeJob> {
    const { did, ddo } = await assetResolve(asset, this.ocean)
    const service = ddo.findServiceByType('compute')
    const { serviceEndpoint } = service
    const provider = await Provider.getInstance(this.instanceConfig)
    await provider.setBaseUrl(serviceEndpoint)
    const computeJobsList = await provider.computeStop(did, consumerAccount, jobId)
    if (computeJobsList) return computeJobsList[0] as ComputeJob
    return null
  }

  /**
   * Deletes a compute job and all resources associated with the job. If job is running it will be stopped first.
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {DDO|string} asset DID Descriptor Object containing all the data related to an asset or a Decentralized identifier.
   * @param  {string} jobId The ID of the compute job to be stopped
   * @param  {DDO} ddo If undefined then the ddo will be fetched by did
   * @return {Promise<ComputeJob>} Returns the new status of a job
   */
  public async delete(
    consumerAccount: Account,
    asset: DDO | string,
    jobId: string
  ): Promise<ComputeJob> {
    const { did, ddo } = await assetResolve(asset, this.ocean)
    const service = ddo.findServiceByType('compute')
    const { serviceEndpoint } = service
    const provider = await Provider.getInstance(this.instanceConfig)
    await provider.setBaseUrl(serviceEndpoint)
    const computeJobsList = await provider.computeDelete(did, consumerAccount, jobId)
    if (computeJobsList) return computeJobsList[0] as ComputeJob
    return null
  }

  /**
   * Returns information about the status of all compute jobs, or a single compute job.
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {string} did Decentralized identifier.
   * @param  {DDO} ddo If undefined then the ddo will be fetched by did, this is just to optimize network calls
   * @param  {ServiceCompute} service If undefined then we get the service from the ddo
   * @param  {string} jobId The Order transaction id
   * @param  {string} txId The transaction id of ordering the main asset (asset with compute service)
   * @param  {boolean} sign If the provider request is going to be signed(default) (full status) or not (short status)
   * @return {Promise<ComputeJob[]>} Returns the status
   */
  public async status(
    consumerAccount: Account,
    did?: string,
    ddo?: DDO,
    service?: ServiceCompute,
    jobId?: string,
    txId?: string
  ): Promise<ComputeJob[]> {
    let provider: Provider

    if (did || service || ddo) {
      if (!service) {
        if (!ddo) {
          ddo = await this.ocean.assets.resolve(did)
          if (!ddo) throw new Error(`Couldn't resolve the did ${did}`)
        }
        service = ddo.findServiceByType('compute')
        if (!service)
          throw new Error(`Couldn't find a compute service on the asset with did ${did}`)
      }

      const { serviceEndpoint } = service
      provider = await Provider.getInstance(this.instanceConfig)

      await provider.setBaseUrl(serviceEndpoint)
    } else {
      provider = this.ocean.provider
    }

    const computeJobsList = await provider.computeStatus(
      did,
      consumerAccount,
      jobId,
      txId
    )

    return computeJobsList as ComputeJob[]
  }

  /**
   * Downloads compute job result
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {string} jobId JobId
   * @param  {number} index Compute Result index
   * @param  {string} destination: destination folder
   * @param  {string} did Decentralized identifier.
   * @param  {DDO} ddo If undefined then the ddo will be fetched by did, this is just to optimize network calls
   * @param  {ServiceCompute} service If undefined then we get the service from the ddo
   */
  public async getResult(
    consumerAccount: Account,
    jobId: string,
    index: number,
    destination: string,
    did?: string,
    ddo?: DDO,
    service?: ServiceCompute
  ): Promise<any> {
    let provider: Provider

    if (did || service || ddo) {
      if (!service) {
        if (!ddo) {
          ddo = await this.ocean.assets.resolve(did)
          if (!ddo) throw new Error(`Couldn't resolve the did ${did}`)
        }
        service = ddo.findServiceByType('compute')
        if (!service)
          throw new Error(`Couldn't find a compute service on the asset with did ${did}`)
      }

      const { serviceEndpoint } = service
      provider = await Provider.getInstance(this.instanceConfig)

      await provider.setBaseUrl(serviceEndpoint)
    } else {
      provider = this.ocean.provider
    }

    const result = await provider.computeResult(
      jobId,
      index,
      destination,
      consumerAccount
    )

    return result
  }

  public createServerAttributes(
    serverId: string,
    serverType: string,
    cost: string,
    cpu: string,
    gpu: string,
    memory: string,
    disk: string,
    maxExecutionTime: number
  ): Server {
    return {
      serverId,
      serverType,
      cost,
      cpu,
      gpu,
      memory,
      disk,
      maxExecutionTime
    }
  }

  public createContainerAttributes(
    image: string,
    tag: string,
    checksum: string
  ): Container {
    return { image, tag, checksum }
  }

  public createClusterAttributes(type: string, url: string): Cluster {
    return { type, url }
  }

  public createProviderAttributes(
    type: string,
    description: string,
    cluster: Cluster,
    containers: Container[],
    servers: Server[]
  ): {
    type: string
    description: string
    environment: {
      cluster: Cluster
      supportedServers: Server[]
      supportedContainers: Container[]
    }
  } {
    return {
      type,
      description,
      environment: {
        cluster: cluster,
        supportedServers: servers,
        supportedContainers: containers
      }
    }
  }

  /**
   * Creates a compute service
   * @param {Account} consumerAccount
   * @param {String} cost  number of datatokens needed for this service, expressed in wei
   * @param {String} datePublished
   * @param {Object} providerAttributes
   * @param {Object} computePrivacy
   * @param {Number} timeout
   * @return {Promise<string>} service
   */
  public createComputeService(
    consumerAccount: Account,
    cost: string,
    datePublished: string,
    providerAttributes: any,
    computePrivacy?: ServiceComputePrivacy,
    timeout?: number,
    providerUri?: string,
    requiredCustomParameters?: ServiceCustomParametersRequired
  ): ServiceCompute {
    const name = 'dataAssetComputingService'
    if (!timeout) timeout = 3600
    const service: ServiceCompute = {
      type: 'compute',
      index: 3,
      serviceEndpoint: providerUri || this.ocean.provider.url,
      attributes: {
        main: {
          name,
          creator: consumerAccount.getId(),
          datePublished,
          cost,
          timeout: timeout,
          provider: providerAttributes,
          privacy: {}
        }
      }
    }

    if (computePrivacy) service.attributes.main.privacy = computePrivacy
    if (requiredCustomParameters?.userCustomParameters)
      service.attributes.userCustomParameters =
        requiredCustomParameters.userCustomParameters
    if (requiredCustomParameters?.algoCustomParameters)
      service.attributes.algoCustomParameters =
        requiredCustomParameters.algoCustomParameters
    return service as ServiceCompute
  }

  /**
   * Check the output object and add default properties if needed
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {Output} output Output section used for publishing the result.
   * @return {Promise<Output>} Returns output object
   */
  private checkOutput(consumerAccount: Account, output?: ComputeOutput): ComputeOutput {
    const isDefault = !output || (!output.publishAlgorithmLog && !output.publishOutput)

    if (isDefault) {
      return {
        publishAlgorithmLog: false,
        publishOutput: false
      }
    }

    return {
      publishAlgorithmLog: output.publishAlgorithmLog,
      publishOutput: output.publishOutput,
      providerAddress: output.providerAddress || this.config.providerAddress,
      providerUri: output.providerUri || this.config.providerUri,
      metadataUri: output.metadataUri || this.config.metadataCacheUri,
      nodeUri: output.nodeUri || this.config.nodeUri,
      owner: output.owner || consumerAccount.getId()
    }
  }

  /**
   * Checks if an asset is orderable with a specific algorithm
   * @param  {DDO|string} dataset DID Descriptor Object containing all the data related to an asset or a Decentralized identifier of the asset (of type `dataset`) to run the algorithm on.
   * @param  {string} serviceIndex The Service index
   * @param  {ComputeAlgorithm} algorithm
   * @param  {DDO} algorithmDDO Algorithm DDO object. If undefined then the ddo will be fetched by did
   * @return {Promise<boolean>} True is you can order this
   *
   * Note:  algorithmDid and algorithmMeta are optional, but if they are not passed,
   * you can end up in the situation that you are ordering and paying for your compute job,
   * but provider will not allow the compute, due to privacy settings of the ddo
   */
  public async isOrderable(
    dataset: DDO | string,
    serviceIndex: number,
    algorithm: ComputeAlgorithm,
    algorithmDDO?: DDO
  ): Promise<boolean> {
    const datasetResolved: AssetResolved = await assetResolve(dataset, this.ocean)
    const service: Service = datasetResolved.ddo.findServiceById(serviceIndex)
    if (!service) return false
    if (service.type === 'compute') {
      if (algorithm.meta) {
        // check if raw algo is allowed
        if (service.attributes.main.privacy)
          if (service.attributes.main.privacy.allowRawAlgorithm) return true
        this.logger.error('ERROR: This service does not allow raw algorithm')
        return false
      }
      if (algorithm.did) {
        // check if both have compute services and then if they are served by the same provider
        if (algorithm.serviceIndex) {
          if (!algorithmDDO) {
            algorithmDDO = await this.ocean.assets.resolve(algorithm.did)
            if (!algorithmDDO)
              throw new Error(`Couldn't resolve the did ${algorithm.did}`)
          }
          const algoService: Service = algorithmDDO.findServiceById(
            algorithm.serviceIndex
          )
          if (algoService && algoService.type === 'compute') {
            // since both dataset & algo services are compute, we need to check if they are served by the same provider
            const algoProvider = await Provider.getInstance(this.instanceConfig)
            await algoProvider.setBaseUrl(algoService.serviceEndpoint)
            const datasetProvider = await Provider.getInstance(this.instanceConfig)
            await datasetProvider.setBaseUrl(service.serviceEndpoint)
            if (algoProvider.providerAddress !== datasetProvider.providerAddress) {
              this.logger.error(
                'ERROR: Both assets with compute service are not served by the same provider'
              )
              return false
            }
          }
        }
        // check if did is in trusted list
        if (service.attributes.main.privacy) {
          if (service.attributes.main.privacy.allowAllPublishedAlgorithms) return true
          if (!service.attributes.main.privacy.publisherTrustedAlgorithms) return false
          let algo: publisherTrustedAlgorithm
          for (algo of service.attributes.main.privacy.publisherTrustedAlgorithms) {
            if (algo.did === algorithm.did) {
              // compute checkusms and compare them
              const trustedAlgorithm = await this.createPublisherTrustedAlgorithmfromDID(
                algorithm.did
              )
              if (
                algo.containerSectionChecksum &&
                algo.containerSectionChecksum !==
                  trustedAlgorithm.containerSectionChecksum
              ) {
                this.logger.error(
                  'ERROR: Algorithm container section was altered since it was added as trusted by ' +
                    datasetResolved.did
                )
                return false
              }
              if (
                algo.filesChecksum &&
                algo.filesChecksum !== trustedAlgorithm.filesChecksum
              ) {
                this.logger.error(
                  'ERROR: Algorithm files section was altered since it was added as trusted by ' +
                    datasetResolved.ddo
                )
                return false
              }
              // all conditions are meet
              return true
            }
          }
          // algorithmDid was not found
          this.logger.error(
            'ERROR: Algorithm ' +
              algorithm.did +
              ' is not allowed by ' +
              datasetResolved.did
          )
          return false
        }
        console.error('Algo Index:' + algorithm.serviceIndex)
      }
    }
    return true // not a compute asset
  }

  /**
   * Starts an order of a compute or access service for a compute job
   * @param  {String} consumerAccount The account of the consumer ordering the service.
   * @param  {DDO|string} dataset DID Descriptor Object containing all the data related to an asset or a Decentralized identifier of the asset (of type `dataset`) to run the algorithm on.
   * @param  {string} serviceIndex The Service index
   * @param  {string} algorithmDid The DID of the algorithm asset (of type `algorithm`) to run on the asset.
   * @param  {string} algorithmServiceIndex The index of the service in the algorithm
   * @param  {MetaData} algorithmMeta Metadata about the algorithm being run if `algorithm` is being used. This is ignored when `algorithmDid` is specified.
   * @return {SubscribablePromise<OrderProgressStep, string>} Returns the transaction details
   *
   * Note:  algorithmDid and algorithmMeta are optional, but if they are not passed,
   * you can end up in the situation that you are ordering and paying for your compute job,
   * but provider will not allow the compute, due to privacy settings of the ddo
   */
  public orderAsset(
    consumerAccount: string,
    dataset: DDO | string,
    serviceIndex: number,
    algorithm: ComputeAlgorithm,
    mpAddress?: string,
    computeAddress?: string,
    userCustomParameters?: UserCustomParameters,
    authService = 'json',
    searchPreviousOrders = true
  ): SubscribablePromise<OrderProgressStep, string> {
    return new SubscribablePromise(async (observer) => {
      const { ddo } = await assetResolve(dataset, this.ocean)
      // first check if we can order this
      const allowed = await this.isOrderable(ddo, serviceIndex, algorithm)
      if (!allowed)
        throw new Error(
          `Dataset order failed, dataset is not orderable with the specified algorithm`
        )
      // const service: Service = ddo.findServiceByType('compute')
      const service: Service = ddo.findServiceById(serviceIndex)
      if (!service)
        throw new Error(`Dataset order failed, Could not find service for the DDO`)
      try {
        const order = await this.ocean.assets.order(
          ddo,
          service.type,
          consumerAccount,
          -1,
          mpAddress,
          computeAddress,
          userCustomParameters,
          authService,
          searchPreviousOrders
        )
        return order
      } catch (error) {
        this.logger.error(`ERROR: Failed to order: ${error.message}`)
        throw new Error(`Failed to order dataset: ${error.message}`)
      }
    })
  }

  /**
   * Orders & pays for a algorithm
   * @param  {DDO|string} asset DID Descriptor Object containing all the data related to an asset or a Decentralized identifier.
   * @param {String} serviceType
   * @param {String} payerAddress
   * @param {Number} serviceIndex
   * @param {String} mpAddress Marketplace fee collector address
   * @param {String} consumerAddress Optionally, if the consumer is another address than payer
   * @return {Promise<String>} transactionHash of the payment
   */
  public async orderAlgorithm(
    asset: DDO | string,
    serviceType: string,
    payerAddress: string,
    serviceIndex = -1,
    mpAddress?: string,
    consumerAddress?: string,
    userCustomParameters?: UserCustomParameters,
    authService = 'json',
    searchPreviousOrders = true
  ): Promise<string> {
    // this is only a convienince function, which calls ocean.assets.order
    try {
      return await this.ocean.assets.order(
        asset,
        serviceType,
        payerAddress,
        serviceIndex,
        mpAddress,
        consumerAddress,
        userCustomParameters,
        authService,
        searchPreviousOrders
      )
    } catch (error) {
      this.logger.error(`ERROR: Failed to orderAlgorithm: ${error.message}`)
      throw new Error(`Failed to order algorithm: ${error.message}`)
    }
  }

  /**
   * Edit Compute Privacy
   * @param  {ddo} DDO
   * @param  {number} serviceIndex Index of the compute service in the DDO. If -1, will try to find it
   * @param  {ServiceComputePrivacy} computePrivacy ComputePrivacy fields & new values.
   * @param  {Account} account Ethereum account of owner to sign and prove the ownership.
   * @return {Promise<DDO>}
   */
  public async editComputePrivacy(
    ddo: DDO,
    serviceIndex: number,
    computePrivacy: ServiceComputePrivacy
  ): Promise<DDO> {
    if (!ddo) return null
    if (serviceIndex === -1) {
      const service = ddo.findServiceByType('compute')
      if (!service) return null
      serviceIndex = service.index
    }
    if (typeof ddo.service[serviceIndex] === 'undefined') return null
    if (ddo.service[serviceIndex].type !== 'compute') return null
    ddo.service[serviceIndex].attributes.main.privacy.allowRawAlgorithm =
      computePrivacy.allowRawAlgorithm
    ddo.service[serviceIndex].attributes.main.privacy.allowAllPublishedAlgorithms =
      computePrivacy.allowAllPublishedAlgorithms
    ddo.service[serviceIndex].attributes.main.privacy.allowNetworkAccess =
      computePrivacy.allowNetworkAccess
    ddo.service[serviceIndex].attributes.main.privacy.publisherTrustedAlgorithms =
      computePrivacy.publisherTrustedAlgorithms
    return ddo
  }

  /**
   * Toogle allowAllPublishedAlgorithms
   * @param  {ddo} DDO
   * @param  {number} serviceIndex Index of the compute service in the DDO. If -1, will try to find it
   * @param  {boolean} newState
   * @return {Promise<DDDO>} Returns the new DDO
   */
  public async toggleAllowAllPublishedAlgorithms(
    ddo: DDO,
    serviceIndex: number,
    newState: boolean
  ): Promise<DDO> {
    if (!ddo) return null
    if (serviceIndex === -1) {
      const service = ddo.findServiceByType('compute')
      if (!service) return null
      serviceIndex = service.index
    }
    if (typeof ddo.service[serviceIndex] === 'undefined') return null
    if (ddo.service[serviceIndex].type !== 'compute') return null
    ddo.service[serviceIndex].attributes.main.privacy.allowAllPublishedAlgorithms =
      newState
    return ddo
  }

  /**
   * Generates a publisherTrustedAlgorithm object from a algorithm did
   * @param  {did} string DID. You can leave this empty if you already have the DDO
   * @param  {ddo} DDO if empty, will trigger a retrieve
   * @return {Promise<publisherTrustedAlgorithm>}
   */
  public async createPublisherTrustedAlgorithmfromDID(
    did: string,
    ddo?: DDO
  ): Promise<publisherTrustedAlgorithm> {
    if (!ddo) {
      ddo = await this.ocean.assets.resolve(did)
      if (!ddo) return null
    }
    const service = ddo.findServiceByType('metadata')
    if (!service) return null
    if (!service.attributes.main.algorithm) return null
    if (!service.attributes.encryptedFiles) return null
    if (!service.attributes.main.files) return null
    return {
      did,
      containerSectionChecksum: SHA256(
        JSON.stringify(service.attributes.main.algorithm.container)
      ).toString(),
      filesChecksum: SHA256(
        service.attributes.encryptedFiles + JSON.stringify(service.attributes.main.files)
      ).toString()
    }
  }

  /**
   * Adds a trusted algorithm to an asset
   * @param  {ddo} DDO
   * @param  {number} serviceIndex Index of the compute service in the DDO. If -1, will try to find it
   * @param  {algoDid} string Algorithm DID to be added
   * @return {Promise<DDDO>} Returns the new DDO
   */
  public async addTrustedAlgorithmtoAsset(
    ddo: DDO,
    serviceIndex: number,
    algoDid: string
  ): Promise<DDO> {
    if (!ddo) return null
    if (serviceIndex === -1) {
      const service = ddo.findServiceByType('compute')
      if (!service) return null
      serviceIndex = service.index
    }
    if (typeof ddo.service[serviceIndex] === 'undefined') return null
    if (ddo.service[serviceIndex].type !== 'compute') return null
    if (!ddo.service[serviceIndex].attributes.main.privacy.publisherTrustedAlgorithms)
      ddo.service[serviceIndex].attributes.main.privacy.publisherTrustedAlgorithms = []
    const trustedAlgorithm = await this.createPublisherTrustedAlgorithmfromDID(algoDid)
    if (trustedAlgorithm)
      ddo.service[serviceIndex].attributes.main.privacy.publisherTrustedAlgorithms.push(
        trustedAlgorithm
      )
    return ddo
  }

  /**
   * Check is an algo is trusted
   * @param  {ddo} DDO
   * @param  {number} serviceIndex Index of the compute service in the DDO. If -1, will try to find it
   * @param  {algoDid} string Algorithm DID to be added
   * @return {Promise<DDDO>} Returns the new DDO
   */
  public async isAlgorithmTrusted(
    ddo: DDO,
    serviceIndex: number,
    algoDid: string
  ): Promise<boolean> {
    if (!ddo) return false
    if (serviceIndex === -1) {
      const service = ddo.findServiceByType('compute')
      if (!service) return false
      serviceIndex = service.index
    }
    if (typeof ddo.service[serviceIndex] === 'undefined') return false
    if (ddo.service[serviceIndex].type !== 'compute') return false
    if (ddo.service[serviceIndex].attributes.main.privacy.allowAllPublishedAlgorithms)
      return true
    let algo: publisherTrustedAlgorithm
    for (algo of ddo.service[serviceIndex].attributes.main.privacy
      .publisherTrustedAlgorithms)
      if (algo.did === algoDid) return true
    return false
  }

  /**
   * Removes a trusted algorithm from an asset
   * @param  {ddo} DDO
   * @param  {number} serviceIndex Index of the compute service in the DDO. If -1, will try to find it
   * @param  {algoDid} string Algorithm DID to be removed
   * @return {Promise<DDDO>} Returns the new DDO
   */
  public async removeTrustedAlgorithmFromAsset(
    ddo: DDO,
    serviceIndex: number,
    algoDid: string
  ): Promise<DDO> {
    if (!ddo) return null
    if (serviceIndex === -1) {
      const service = ddo.findServiceByType('compute')
      if (!service) return ddo
      serviceIndex = service.index
    }
    if (typeof ddo.service[serviceIndex] === 'undefined') return ddo
    if (ddo.service[serviceIndex].type !== 'compute') return ddo
    if (!ddo.service[serviceIndex].attributes.main.privacy.publisherTrustedAlgorithms)
      return ddo
    ddo.service[serviceIndex].attributes.main.privacy.publisherTrustedAlgorithms =
      ddo.service[serviceIndex].attributes.main.privacy.publisherTrustedAlgorithms.filter(
        function (el) {
          return el.did !== algoDid
        }
      )
    return ddo
  }
}
