import { SearchQuery } from '../metadatastore/MetadataStore'
import { DDO } from '../ddo/DDO'
import { Metadata } from '../ddo/interfaces/Metadata'
import { MetadataAlgorithm } from '../ddo/interfaces/MetadataAlgorithm'
import { Service, ServiceComputePrivacy, ServiceCompute } from '../ddo/interfaces/Service'
import { EditableMetadata } from '../ddo/interfaces/EditableMetadata'
import Account from './Account'
import DID from './DID'
import { SubscribablePromise } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { Output } from './interfaces/ComputeOutput'
import { ComputeJob } from './interfaces/ComputeJob'
// import { WebServiceConnector } from './utils/WebServiceConnector'
// import { Output } from './interfaces/ComputeOutput'
// import { ComputeJob } from './interfaces/ComputeJob'

export enum OrderProgressStep {
    TransferDataToken
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
        algorithmTokenAddress?: string,
        algorithmMeta?: MetadataAlgorithm,
        output?: Output,
        serviceIndex?: string,
        serviceType?: string
    ): Promise<ComputeJob> {
        output = this.checkOutput(consumerAccount, output)
        if (did) {
            const computeJobsList = await this.ocean.provider.compute(
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
                tokenAddress
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
    ): object {
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
    ): object {
        return { image, tag, checksum }
    }

    public createClusterAttributes(type: string, url: string): object {
        return { type, url }
    }

    public createProviderAttributes(
        type: string,
        description: string,
        cluster: object,
        containers: object[],
        servers: object[]
    ): object {
        return {
            type,
            description,
            environment: {
                cluster: cluster,
                supportedServers: containers,
                supportedContainers: servers
            }
        }
    }

    public createComputeService(
        consumerAccount: Account,
        cost: string,
        datePublished: string,
        providerAttributes: object,
        computePrivacy?: ServiceComputePrivacy,
        timeout?: number
    ): ServiceCompute {
        const name = 'dataAssetComputingService'
        if (!timeout) timeout = 3600

        const service = {
            type: 'compute',
            index: 3,
            serviceEndpoint: this.ocean.provider.getComputeEndpoint(),
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
        const isDefault =
            !output || (!output.publishAlgorithmLog && !output.publishOutput)

        if (isDefault) {
            return {
                publishAlgorithmLog: false,
                publishOutput: false
            }
        }
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
     * @param  {Account} consumerAccount The account of the consumer ordering the service.
     * @param  {string} datasetDid The DID of the dataset asset (of type `dataset`) to run the algorithm on.
     * @param  {string} algorithmDid The DID of the algorithm asset (of type `algorithm`) to run on the asset.
     * @param  {MetaData} algorithmMeta Metadata about the algorithm being run if `algorithm` is being used. This is ignored when `algorithmDid` is specified.
     * @return {Promise<string>} Returns the Service Agreement ID, representation of `bytes32` ID.
     *
     * Note:  algorithmDid and algorithmMeta are optional, but if they are not passed,
     * you can end up in the situation that you are ordering and paying for your agreement,
     * but brizo will not allow the compute, due to privacy settings of the ddo
     */
    public order(
        consumerAccount: string,
        datasetDid: string,
        serviceIndex: number,
        algorithmDid?: string,
        algorithmMeta?: MetadataAlgorithm
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
                                !service.attributes.main.privacy.trustedAlgorithms.includes(
                                    algorithmDid
                                )
                            ) {
                                console.error('This service does not allow this Algo')
                                return null
                            }
            }
            const order = await this.ocean.assets.order(
                datasetDid,
                service.type,
                consumerAccount
            )
            return order
        })
    }
}
// "creator": "0x00Bd138aBD70e2F00903268F3Db08f2D25677C9e",
// "datePublished": "2019-04-09T19:02:11Z",
// "cost": "10",
// "timeout": 86400,
// "provider": {
//   "type": "Azure",
//   "description": "",
//   "environment": {
//     "cluster": {
//       "type": "Kubernetes",
//       "url": "http://10.0.0.17/xxx"
//     },
//     "supportedContainers": [
//       {
//         "image": "tensorflow/tensorflow",
//         "tag": "latest",
//         "checksum": "sha256:cb57ecfa6ebbefd8ffc7f75c0f00e57a7fa739578a429b6f72a0df19315deadc"
//       },
//       {
//         "image": "tensorflow/tensorflow",
//         "tag": "latest",
//         "checksum": "sha256:cb57ecfa6ebbefd8ffc7f75c0f00e57a7fa739578a429b6f72a0df19315deadc"
//       }
//     ],
//     "supportedServers": [
//       {
//         "serverId": "1",
//         "serverType": "xlsize",
//         "cost": "50",
//         "cpu": "16",
//         "gpu": "0",
//         "memory": "128gb",
//         "disk": "160gb",
//         "maxExecutionTime": 86400
//       },
//       {
//         "serverId": "2",
//         "serverType": "medium",
//         "cost": "10",
//         "cpu": "2",
//         "gpu": "0",
//         "memory": "8gb",
//         "disk": "80gb",
//         "maxExecutionTime": 86400
//       }
//     ]
//   }
