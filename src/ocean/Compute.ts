import { DDO } from '../ddo/DDO'
import { MetadataAlgorithm } from '../ddo/interfaces/MetadataAlgorithm'
import { Service, ServiceComputePrivacy, ServiceCompute } from '../ddo/interfaces/Service'
import Account from './Account'
import { SubscribablePromise } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { Output } from './interfaces/ComputeOutput'
import { ComputeJob } from './interfaces/ComputeJob'
import { Provider } from '../provider/Provider'

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
   * Start the execution of a compute job.
   * @param  {string} did Decentralized identifer for the asset
   * @param  {string} txId
   * @param  {string} tokenAddress
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {string} algorithmDid The DID of the algorithm asset (of type `algorithm`) to run on the asset.
   * @param  {MetaData} algorithmMeta Metadata about the algorithm being run if `algorithm` is being used. This is ignored when `algorithmDid` is specified.
   * @param  {Output} output Define algorithm output publishing. Publishing the result of a compute job is turned off by default.
   * @return {Promise<ComputeJob>} Returns compute job ID under status.jobId
   */
  public async start(
    did: string,
    txId: string,
    tokenAddress: string,
    consumerAccount: Account,
    algorithmDid?: string,
    algorithmMeta?: MetadataAlgorithm,
    output?: Output,
    serviceIndex?: string,
    serviceType?: string,
    algorithmTransferTxId?: string,
    algorithmDataToken?: string
  ): Promise<ComputeJob> {
    output = this.checkOutput(consumerAccount, output)
    const ddo = await this.ocean.assets.resolve(did)
    const service = ddo.findServiceByType('access')
    const { serviceEndpoint } = service
    if (did && txId) {
      const provider = new Provider(this.instanceConfig)
      provider.setBaseUrl(serviceEndpoint)
<<<<<<< HEAD
<<<<<<< HEAD
      const computeJobsList = await provider.compute(
=======
=======
>>>>>>> ae4011914b2749d3fa467d513c49ef97a8d22ed6
      const computeJobsList = await this.ocean.provider.compute(
>>>>>>> 11b58cb... more customProvider code
        'post',
        did,
        consumerAccount,
        algorithmDid,
        algorithmMeta,
        undefined,
        output,
        txId,
        serviceIndex,
        serviceType,
        tokenAddress,
        algorithmTransferTxId,
        algorithmDataToken
      )
      return computeJobsList[0] as ComputeJob
    } else return null
  }

  /**
   * Ends a running compute job.
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {string} did Decentralized identifier.
   * @param  {string} jobId The ID of the compute job to be stopped
   * @return {Promise<ComputeJob>} Returns the new status of a job
   */
  public async stop(
    consumerAccount: Account,
    did: string,
    jobId: string
  ): Promise<ComputeJob> {
    const computeJobsList = await this.ocean.provider.compute(
      'put',
      did,
      consumerAccount,
      undefined,
      undefined,
      jobId
    )

    return computeJobsList[0] as ComputeJob
  }

  /**
   * Deletes a compute job and all resources associated with the job. If job is running it will be stopped first.
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {string} did Decentralized identifier.
   * @param  {string} jobId The ID of the compute job to be stopped
   * @return {Promise<ComputeJob>} Returns the new status of a job
   */
  public async delete(
    consumerAccount: Account,
    did: string,
    jobId: string
  ): Promise<ComputeJob> {
    const computeJobsList = await this.ocean.provider.compute(
      'delete',
      did,
      consumerAccount,
      undefined,
      undefined,
      jobId
    )

    return computeJobsList[0] as ComputeJob
  }

  /**
   * Returns information about the status of all compute jobs, or a single compute job.
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {string} did Decentralized identifier.
   * @param  {string} jobId The ID of the compute job to be stopped
   * @return {Promise<ComputeJob[]>} Returns the status
   */
  public async status(
    consumerAccount: Account,
    did?: string,
    jobId?: string
  ): Promise<ComputeJob[]> {
    const computeJobsList = await this.ocean.provider.compute(
      'get',
      did,
      consumerAccount,
      undefined,
      undefined,
      jobId
    )

    return computeJobsList as ComputeJob[]
  }

  /**
   * Returns the final result of a specific compute job published as an asset.
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {string} did Decentralized identifier.
   * @param  {string} jobId The ID of the compute job to be stopped.
   * @return {Promise<ComputeJob>} Returns the DDO of the result asset.
   */
  public async result(
    consumerAccount: Account,
    did: string,
    jobId: string
  ): Promise<ComputeJob> {
    const computeJobsList = await this.ocean.provider.compute(
      'get',
      did,
      consumerAccount,
      undefined,
      undefined,
      jobId
    )

    return computeJobsList[0] as ComputeJob
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
    customProvider?: string
  ): ServiceCompute {
    const name = 'dataAssetComputingService'
    if (!timeout) timeout = 3600
    const service = {
      type: 'compute',
      index: 3,
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      serviceEndpoint: customProvider
        ? customProvider + this.ocean.provider.getComputeEndpointShort()
        : this.ocean.provider.getComputeEndpoint(),
=======
      serviceEndpoint: customProvider || this.ocean.provider.getComputeEndpoint(),
>>>>>>> 17e61d0... allow customProvider on publish
=======
      serviceEndpoint: customProvider
        ? customProvider + this.ocean.provider.getComputeEndpointShort()
        : this.ocean.provider.getComputeEndpoint(),
>>>>>>> 960e90f... extra checks
=======
      serviceEndpoint: customProvider
        ? customProvider + this.ocean.provider.getComputeEndpointShort()
        : this.ocean.provider.getComputeEndpoint(),
>>>>>>> ae4011914b2749d3fa467d513c49ef97a8d22ed6
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
    return service as ServiceCompute
  }

  /**
   * Check the output object and add default properties if needed
   * @param  {Account} consumerAccount The account of the consumer ordering the service.
   * @param  {Output} output Output section used for publishing the result.
   * @return {Promise<Output>} Returns output object
   */
  private checkOutput(consumerAccount: Account, output?: Output): Output {
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
      metadataUri: output.metadataUri || this.config.metadataStoreUri,
      nodeUri: output.nodeUri || this.config.nodeUri,
      owner: output.owner || consumerAccount.getId()
    }
  }

  /**
   * Starts an order of a compute service that is defined in an asset's services.
   * @param  {String} consumerAccount The account of the consumer ordering the service.
   * @param  {string} datasetDid The DID of the dataset asset (of type `dataset`) to run the algorithm on.
   * @param  {string} serviceIndex The Service index
   * @param  {string} algorithmDid The DID of the algorithm asset (of type `algorithm`) to run on the asset.
   * @param  {MetaData} algorithmMeta Metadata about the algorithm being run if `algorithm` is being used. This is ignored when `algorithmDid` is specified.
   * @return {Promise<string>} Returns the transaction details
   *
   * Note:  algorithmDid and algorithmMeta are optional, but if they are not passed,
   * you can end up in the situation that you are ordering and paying for your compute job,
   * but provider will not allow the compute, due to privacy settings of the ddo
   */
  public order(
    consumerAccount: string,
    datasetDid: string,
    serviceIndex: number,
    algorithmDid?: string,
    algorithmMeta?: MetadataAlgorithm,
    mpAddress?: string
  ): SubscribablePromise<OrderProgressStep, string> {
    return new SubscribablePromise(async (observer) => {
      const ddo: DDO = await this.ocean.assets.resolve(datasetDid)
      // const service: Service = ddo.findServiceByType('compute')
      const service: Service = ddo.findServiceById(serviceIndex)
      if (!service) return null
      if (service.type !== 'compute') return null
      if (algorithmMeta) {
        // check if raw algo is allowed
        if (service.attributes.main.privacy)
          if (!service.attributes.main.privacy.allowRawAlgorithm) {
            console.error('This service does not allow Raw Algo')
            return null
          }
      }
      if (algorithmDid) {
        // check if did is in trusted list
        if (service.attributes.main.privacy)
          if (service.attributes.main.privacy.trustedAlgorithms)
            if (service.attributes.main.privacy.trustedAlgorithms.length > 0)
              if (
                !service.attributes.main.privacy.trustedAlgorithms.includes(algorithmDid)
              ) {
                console.error('This service does not allow this Algo')
                return null
              }
      }
      const order = await this.ocean.assets.order(
        datasetDid,
        service.type,
        consumerAccount,
        -1,
        mpAddress
      )
      return order
    })
  }
}
