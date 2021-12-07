import Account from '../ocean/Account';
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract';
import { File } from '../ddo/interfaces/File';
import { ComputeJob, ComputeInput, ComputeOutput, ComputeAlgorithm } from '../ocean/interfaces/Compute';
import { DDO } from '../ddo/DDO';
import DID from '../ocean/DID';
export interface ServiceEndpoint {
    serviceName: string;
    method: string;
    urlPath: string;
}
export interface ComputeLimits {
    algoTimeLimit?: string;
    storageExpiry?: string;
}
export interface UserCustomParameters {
    [key: string]: any;
}
export declare class Provider extends Instantiable {
    nonce: string;
    private baseUrl;
    servicesEndpoints: ServiceEndpoint[];
    computeAddress: string;
    providerAddress: string;
    providerVersion: string;
    computeLimits: ComputeLimits;
    static getInstance(config: InstantiableConfig): Promise<Provider>;
    setBaseUrl(url: string): Promise<boolean>;
    get url(): string;
    getServiceEndpoints(): Promise<ServiceEndpoint[]>;
    getEndpointURL(serviceName: string): ServiceEndpoint;
    createSignature(account: Account, agreementId: string): Promise<string>;
    createHashSignature(account: Account, message: string): Promise<string>;
    encrypt(did: string, document: any, account: Account): Promise<string>;
    fileinfo(url: string): Promise<File[]>;
    isFileConsumable(did: DID, serviceIndex: number): Promise<boolean>;
    getNonce(consumerAddress: string): Promise<string>;
    initialize(asset: DDO | string, serviceIndex: number, serviceType: string, consumerAddress: string, userCustomParameters?: UserCustomParameters): Promise<string>;
    download(did: string, txId: string, tokenAddress: string, serviceType: string, serviceIndex: string, destination: string, account: Account, files: File[], index?: number, userCustomParameters?: UserCustomParameters): Promise<any>;
    computeStart(did: string, consumerAccount: Account, algorithm: ComputeAlgorithm, output?: ComputeOutput, txId?: string, serviceIndex?: string, serviceType?: string, tokenAddress?: string, additionalInputs?: ComputeInput[], userCustomParameters?: UserCustomParameters): Promise<ComputeJob | ComputeJob[]>;
    computeStop(did: string, consumerAccount: Account, jobId: string): Promise<ComputeJob | ComputeJob[]>;
    computeDelete(did: string, consumerAccount: Account, jobId: string): Promise<ComputeJob | ComputeJob[]>;
    computeStatus(did: string, consumerAccount: Account, jobId?: string, txId?: string): Promise<ComputeJob | ComputeJob[]>;
    computeResult(jobId: string, index: number, destination: string, account: Account): Promise<any>;
    getInitializeEndpoint(): ServiceEndpoint;
    getNonceEndpoint(): ServiceEndpoint;
    getEncryptEndpoint(): ServiceEndpoint;
    getFileinfoEndpoint(): ServiceEndpoint;
    getComputeStartEndpoint(): ServiceEndpoint;
    getComputeStopEndpoint(): ServiceEndpoint;
    getComputeStatusEndpoint(): ServiceEndpoint;
    getComputeDeleteEndpoint(): ServiceEndpoint;
    getComputeResultEndpoint(): ServiceEndpoint;
    getDownloadEndpoint(): ServiceEndpoint;
    isValidProvider(url: string): Promise<boolean>;
}
