import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { MetadataAlgorithm } from '../ddo/interfaces/MetadataAlgorithm'
import Account from './Account'
import { ServiceComputePrivacy, ServiceCompute } from '../ddo/interfaces/Service'
import { Output } from './interfaces/ComputeOutput'
import { ComputeJob } from './interfaces/ComputeJob'

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
     * Returns the instance of OceanCompute.
     * @return {Promise<OceanCompute>}
     */
    public static async getInstance(config: InstantiableConfig): Promise<Compute> {
        const instance = new Compute()
        instance.setInstanceConfig(config)

        return instance
    }

    /**
     * Starts an order of a compute service that is defined in an asset's services.
     * @param  {Account} consumerAccount The account of the consumer ordering the service.
     * @param  {string} datasetDid The DID of the dataset asset (of type `dataset`) to run the algorithm on.
     * @param  {string} algorithmDid The DID of the algorithm asset (of type `algorithm`) to run on the asset.
     * @param  {MetaData} algorithmMeta Metadata about the algorithm being run if `algorithm` is being used. This is ignored when `algorithmDid` is specified.
     * @return {Promise<string>} Returns a compute job ID.
     *
     * Note:  algorithmDid and algorithmMeta are optional, but if they are not passed,
     * you can end up in the situation that you are ordering and paying for your agreement,
     * but brizo will not allow the compute, due to privacy settings of the ddo
     */
    public order(
        consumerAccount: Account,
        datasetDid: string,
        algorithmDid?: string,
        algorithmMeta?: MetadataAlgorithm,
        provider?: string
    ): Promise<any> {
        return Promise.resolve('')
    }

    /**
     * Start the execution of a compute job.
     * @param  {Account} consumerAccount The account of the consumer ordering the service.
     * @param  {string} did Decentralized identifer for the asset
     * @param  {string} algorithmDid The DID of the algorithm asset (of type `algorithm`) to run on the asset.
     * @param  {MetaData} algorithmMeta Metadata about the algorithm being run if `algorithm` is being used. This is ignored when `algorithmDid` is specified.
     * @param  {Output} output Define algorithm output publishing. Publishing the result of a compute job is turned off by default.
     * @return {Promise<ComputeJob>} Returns compute job ID under status.jobId
     */
    public async start(
        consumerAccount: Account,
        did: string,
        algorithmDid?: string,
        algorithmMeta?: MetadataAlgorithm,
        output?: Output
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
                output
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
     * Ends a running compute job and starts it again.
     * @param  {Account} consumerAccount The account of the consumer ordering the service.
     * @param  {string} did Decentralized identifier.
     * @param  {string} jobId The ID of the compute job to be stopped
     * @return {Promise<ComputeJob>} Returns the new status of a job
     */
    public async restart(
        consumerAccount: Account,
        did: string,
        jobId: string
    ): Promise<ComputeJob> {
        await this.stop(consumerAccount, did, jobId)
        const result = await this.start(consumerAccount, did, jobId)
        return result
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

    public async createComputeServiceAttributes(
        consumerAccount: Account,
        price: string,
        datePublished: string,
        computePrivacy?: ServiceComputePrivacy,
        timeout?: number
    ): Promise<ServiceCompute> {
        const name = 'dataAssetComputingService'
        if (!timeout) timeout = 3600
        // TODO
        const service = {
            type: 'compute',
            index: 3,
            serviceEndpoint: this.ocean.provider.getComputeEndpoint(),
            attributes: {
                main: {
                    creator: consumerAccount.getId(),
                    datePublished,
                    price,
                    privacy: {},
                    timeout: timeout,
                    name
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
}
