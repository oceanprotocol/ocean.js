import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { MetaData, MetaDataAlgorithm } from '../ddo/MetaData'
import Account from './Account'
import { DDO } from '../ddo/DDO'
import { SubscribablePromise } from '../utils'
import { OrderProgressStep } from './utils/ServiceUtils'
import { DID } from '../squid'
import { Service, ServiceCompute, ServiceComputePrivacy } from '../ddo/Service'

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

export interface Output {
    publishAlgorithmLog?: boolean
    publishOutput?: boolean
    brizoAddress?: string
    brizoUri?: string
    metadata?: MetaData
    metadataUri?: string
    nodeUri?: string
    owner?: string
    secretStoreUri?: string
    whitelist?: string[]
}

export interface ComputeJob {
    owner: string
    agreementId: string
    jobId: string
    dateCreated: string
    dateFinished: string
    status: number
    statusText: string
    algorithmLogUrl: string
    resultsUrls: string[]
    resultsDid?: DID
}

/**
 * Compute submodule of Ocean Protocol.
 */
export class OceanCompute extends Instantiable {
    /**
     * Returns the instance of OceanCompute.
     * @return {Promise<OceanCompute>}
     */
    public static async getInstance(config: InstantiableConfig): Promise<OceanCompute> {
        const instance = new OceanCompute()
        instance.setInstanceConfig(config)

        return instance
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
        consumerAccount: Account,
        datasetDid: string,
        algorithmDid?: string,
        algorithmMeta?: MetaDataAlgorithm,
        provider?: string
    ): SubscribablePromise<OrderProgressStep, string> {
        return new SubscribablePromise(async observer => {
            const { assets, keeper, utils } = this.ocean
            const ddo: DDO = await assets.resolve(datasetDid)
            const service: Service = ddo.findServiceByType('compute')
            if (!service) return null
            if (algorithmMeta) {
                // check if raw algo is allowed
                if (service.attributes.main.privacy)
                    if (!service.attributes.main.privacy.allowRawAlgorithm) return null
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
                            )
                                return null
            }
            const condition = keeper.conditions.computeExecutionCondition

            const agreementId = await utils.services.order(
                'compute',
                condition,
                observer,
                consumerAccount,
                ddo,
                provider
            )

            return agreementId
        })
    }

    /**
     * Check the output object and add default properties if needed
     * @param  {Account} consumerAccount The account of the consumer ordering the service.
     * @param  {Output} output Output section used for publishing the result.
     * @return {Promise<Output>} Returns output object
     */
    public checkOutput(consumerAccount: Account, output?: Output): Output {
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
            brizoAddress: output.brizoAddress || this.config.brizoAddress,
            brizoUri: output.brizoUri || this.config.brizoUri,
            metadataUri: output.metadataUri || this.config.aquariusUri,
            nodeUri: output.nodeUri || this.config.nodeUri,
            owner: output.owner || consumerAccount.getId(),
            secretStoreUri: output.secretStoreUri || this.config.secretStoreUri
        }
    }

    /**
     * Start the execution of a compute job.
     * @param  {Account} consumerAccount The account of the consumer ordering the service.
     * @param  {string} agreementId The service agreement ID.
     * @param  {string} algorithmDid The DID of the algorithm asset (of type `algorithm`) to run on the asset.
     * @param  {MetaData} algorithmMeta Metadata about the algorithm being run if `algorithm` is being used. This is ignored when `algorithmDid` is specified.
     * @param  {Output} output Define algorithm output publishing. Publishing the result of a compute job is turned off by default.
     * @return {Promise<ComputeJob>} Returns compute job ID under status.jobId
     */
    public async start(
        consumerAccount: Account,
        agreementId: string,
        algorithmDid?: string,
        algorithmMeta?: MetaDataAlgorithm,
        output?: Output
    ): Promise<ComputeJob> {
        output = this.checkOutput(consumerAccount, output)
        if (agreementId) {
            const computeJobsList = await this.ocean.brizo.compute(
                'post',
                agreementId,
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
     * @param  {string} agreementId The service agreement ID.
     * @param  {string} jobId The ID of the compute job to be stopped
     * @return {Promise<ComputeJob>} Returns the new status of a job
     */
    public async stop(
        consumerAccount: Account,
        agreementId: string,
        jobId: string
    ): Promise<ComputeJob> {
        const computeJobsList = await this.ocean.brizo.compute(
            'put',
            agreementId,
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
     * @param  {string} agreementId The service agreement ID.
     * @param  {string} jobId The ID of the compute job to be stopped
     * @return {Promise<ComputeJob>} Returns the new status of a job
     */
    public async delete(
        consumerAccount: Account,
        agreementId: string,
        jobId: string
    ): Promise<ComputeJob> {
        const computeJobsList = await this.ocean.brizo.compute(
            'delete',
            agreementId,
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
     * @param  {string} agreementId The service agreement ID.
     * @param  {string} jobId The ID of the compute job to be stopped
     * @return {Promise<ComputeJob>} Returns the new status of a job
     */
    public async restart(
        consumerAccount: Account,
        agreementId: string,
        jobId: string
    ): Promise<ComputeJob> {
        await this.stop(consumerAccount, agreementId, jobId)
        const result = await this.start(consumerAccount, agreementId, jobId)
        return result
    }

    /**
     * Returns information about the status of all compute jobs, or a single compute job.
     * @param  {Account} consumerAccount The account of the consumer ordering the service.
     * @param  {string} agreementId The service agreement ID.
     * @param  {string} jobId The ID of the compute job to be stopped
     * @return {Promise<ComputeJob[]>} Returns the status
     */
    public async status(
        consumerAccount: Account,
        agreementId?: string,
        jobId?: string
    ): Promise<ComputeJob[]> {
        const computeJobsList = await this.ocean.brizo.compute(
            'get',
            agreementId,
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
     * @param  {string} agreementId The service agreement ID.
     * @param  {string} jobId The ID of the compute job to be stopped.
     * @return {Promise<ComputeJob>} Returns the DDO of the result asset.
     */
    public async result(
        consumerAccount: Account,
        agreementId: string,
        jobId: string
    ): Promise<ComputeJob> {
        const computeJobsList = await this.ocean.brizo.compute(
            'get',
            agreementId,
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
        const { templates } = this.ocean.keeper
        const serviceAgreementTemplate = await templates.escrowComputeExecutionTemplate.getServiceAgreementTemplate()
        const name = 'dataAssetComputingServiceAgreement'
        if (!timeout) timeout = 3600
        const service = {
            type: 'compute',
            index: 3,
            serviceEndpoint: this.ocean.brizo.getComputeEndpoint(),
            templateId: templates.escrowComputeExecutionTemplate.getId(),
            attributes: {
                main: {
                    creator: consumerAccount.getId(),
                    datePublished,
                    price,
                    privacy: {},
                    timeout: timeout,
                    name
                },
                serviceAgreementTemplate
            }
        }
        if (computePrivacy) service.attributes.main.privacy = computePrivacy
        return service as ServiceCompute
    }
}
