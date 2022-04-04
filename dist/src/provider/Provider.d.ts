import Web3 from 'web3';
import { FileMetadata, ComputeJob, ComputeOutput, ComputeAlgorithm, ComputeAsset, ComputeEnvironment, ProviderInitialize } from '../@types/';
export interface HttpCallback {
    (httpMethod: string, url: string, body: string, header: any): Promise<any>;
}
export interface ServiceEndpoint {
    serviceName: string;
    method: string;
    urlPath: string;
}
export interface UserCustomParameters {
    [key: string]: any;
}
export declare class Provider {
    /**
     * Returns the provider endpoints
     * @return {Promise<ServiceEndpoint[]>}
     */
    getEndpoints(providerUri: string): Promise<any>;
    getEndpointURL(servicesEndpoints: ServiceEndpoint[], serviceName: string): ServiceEndpoint;
    /**
     * Returns the service endpoints that exist in provider.
     * @param {any} endpoints
     * @return {Promise<ServiceEndpoint[]>}
     */
    getServiceEndpoints(providerEndpoint: string, endpoints: any): Promise<ServiceEndpoint[]>;
    /** Gets current nonce
     * @param {string} providerUri provider uri address
     * @param {string} consumerAddress Publisher address
     * @param {AbortSignal} signal abort signal
     * @param {string} providerEndpoints Identifier of the asset to be registered in ocean
     * @param {string} serviceEndpoints document description object (DDO)=
     * @return {Promise<string>} urlDetails
     */
    getNonce(providerUri: string, consumerAddress: string, signal?: AbortSignal, providerEndpoints?: any, serviceEndpoints?: ServiceEndpoint[]): Promise<string>;
    createSignature(web3: Web3, accountId: string, agreementId: string): Promise<string>;
    createHashSignature(web3: Web3, accountId: string, message: string): Promise<string>;
    /** Encrypt data using the Provider's own symmetric key
     * @param {string} data data in json format that needs to be sent , it can either be a DDO or a File array
     * @param {string} providerUri provider uri address
     * @param {AbortSignal} signal abort signal
     * @return {Promise<string>} urlDetails
     */
    encrypt(data: any, providerUri: string, signal?: AbortSignal): Promise<string>;
    /** Get DDO File details (if possible)
     * @param {string} did did
     * @param {number} serviceId the id of the service for which to check the files
     * @param {string} providerUri uri of the provider that will be used to check the file
     * @param {AbortSignal} signal abort signal
     * @return {Promise<FileMetadata[]>} urlDetails
     */
    checkDidFiles(did: string, serviceId: number, providerUri: string, signal?: AbortSignal): Promise<FileMetadata[]>;
    /** Get URL details (if possible)
     * @param {string} url or did
     * @param {string} providerUri uri of the provider that will be used to check the file
     * @param {AbortSignal} signal abort signal
     * @return {Promise<FileMetadata[]>} urlDetails
     */
    checkFileUrl(url: string, providerUri: string, signal?: AbortSignal): Promise<FileMetadata[]>;
    /** Get Compute Environments
     * @return {Promise<ComputeEnvironment[]>} urlDetails
     */
    getComputeEnvironments(providerUri: string, signal?: AbortSignal): Promise<ComputeEnvironment[]>;
    /** Initialize a service request.
     * @param {DDO | string} asset
     * @param {number} serviceIndex
     * @param {string} serviceType
     * @param {string} consumerAddress
     * @param {UserCustomParameters} userCustomParameters
     * @param {string} providerUri Identifier of the asset to be registered in ocean
     * @param {AbortSignal} signal abort signal
     * @return {Promise<ProviderInitialize>} ProviderInitialize data
     */
    initialize(did: string, serviceId: string, fileIndex: number, consumerAddress: string, providerUri: string, signal?: AbortSignal, userCustomParameters?: UserCustomParameters, computeEnv?: string, validUntil?: number): Promise<ProviderInitialize>;
    /** Gets fully signed URL for download
     * @param {string} did
     * @param {string} accountId
     * @param {string} serviceId
     * @param {number} fileIndex
     * @param {string} providerUri
     * @param {Web3} web3
     * @param {UserCustomParameters} userCustomParameters
     * @return {Promise<string>}
     */
    getDownloadUrl(did: string, accountId: string, serviceId: string, fileIndex: number, transferTxId: string, providerUri: string, web3: Web3, userCustomParameters?: UserCustomParameters): Promise<any>;
    /** Instruct the provider to start a compute job
     * @param {string} did
     * @param {string} consumerAddress
     * @param {string} computeEnv
     * @param {ComputeAlgorithm} algorithm
     * @param {string} providerUri
     * @param {Web3} web3
     * @param {AbortSignal} signal abort signal
     * @param {ComputeOutput} output
     * @return {Promise<ComputeJob | ComputeJob[]>}
     */
    computeStart(providerUri: string, web3: Web3, consumerAddress: string, computeEnv: string, dataset: ComputeAsset, algorithm: ComputeAlgorithm, signal?: AbortSignal, additionalDatasets?: ComputeAsset[], output?: ComputeOutput): Promise<ComputeJob | ComputeJob[]>;
    /** Instruct the provider to Stop the execution of a to stop a compute job.
     * @param {string} did
     * @param {string} consumerAddress
     * @param {string} jobId
     * @param {string} providerUri
     * @param {Web3} web3
     * @param {AbortSignal} signal abort signal
     * @return {Promise<ComputeJob | ComputeJob[]>}
     */
    computeStop(did: string, consumerAddress: string, jobId: string, providerUri: string, web3: Web3, signal?: AbortSignal): Promise<ComputeJob | ComputeJob[]>;
    /** Get compute status for a specific jobId/documentId/owner.
     * @param {string} providerUri The URI of the provider we want to query
     * @param {string} consumerAddress The consumer ethereum address
     * @param {string} jobId The ID of a compute job.
     * @param {string} did The ID of the asset
     * @param {AbortSignal} signal abort signal
     * @return {Promise<ComputeJob | ComputeJob[]>}
     */
    computeStatus(providerUri: string, consumerAddress: string, jobId?: string, did?: string, signal?: AbortSignal): Promise<ComputeJob | ComputeJob[]>;
    /** Get compute result url
     * @param {string} providerUri The URI of the provider we want to query
     * @param {Web3} web3 Web3 instance
     * @param {string} consumerAddress The consumer ethereum address
     * @param {string} jobId The ID of a compute job.
     * @param {number} index Result index
     * @param {AbortSignal} signal Abort signal
     * @return {Promise<ComputeJob | ComputeJob[]>}
     */
    getComputeResultUrl(providerUri: string, web3: Web3, consumerAddress: string, jobId: string, index: number): Promise<string>;
    /** Deletes a compute job.
     * @param {string} did
     * @param {string} consumerAddress
     * @param {string} jobId
     * @param {string} providerUri
     * @param {Web3} web3
     * @param {AbortSignal} signal abort signal
     * @return {Promise<ComputeJob | ComputeJob[]>}
     */
    computeDelete(did: string, consumerAddress: string, jobId: string, providerUri: string, web3: Web3, signal?: AbortSignal): Promise<ComputeJob | ComputeJob[]>;
    /** Check for a valid provider at URL
     * @param {String} url provider uri address
     * @param {AbortSignal} signal abort signal
     * @return {Promise<boolean>} string
     */
    isValidProvider(url: string, signal?: AbortSignal): Promise<boolean>;
}
export declare const ProviderInstance: Provider;
export default ProviderInstance;
