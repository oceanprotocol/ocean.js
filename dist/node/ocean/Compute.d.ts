import { DDO } from '../ddo/DDO';
import { ServiceComputePrivacy, ServiceCompute, publisherTrustedAlgorithm, ServiceCustomParametersRequired } from '../ddo/interfaces/Service';
import Account from './Account';
import { SubscribablePromise } from '../utils';
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract';
import { ComputeOutput, ComputeJob, ComputeInput, ComputeAlgorithm } from './interfaces/Compute';
import { UserCustomParameters } from '../provider/Provider';
export declare enum OrderProgressStep {
    TransferDataToken = 0
}
export interface Cluster {
    type: string;
    url: string;
}
export interface Container {
    image: string;
    tag: string;
    checksum: string;
}
export interface Server {
    serverId: string;
    serverType: string;
    cost: string;
    cpu: string;
    gpu: string;
    memory: string;
    disk: string;
    maxExecutionTime: number;
}
export declare const ComputeJobStatus: Readonly<{
    WarmingUp: number;
    Started: number;
    ConfiguringVolumes: number;
    ProvisioningSuccess: number;
    DataProvisioningFailed: number;
    AlgorithmProvisioningFailed: number;
    RunningAlgorithm: number;
    FilteringResults: number;
    PublishingResult: number;
    Completed: number;
    Stopped: number;
    Deleted: number;
}>;
export declare class Compute extends Instantiable {
    static getInstance(config: InstantiableConfig): Promise<Compute>;
    getComputeAddress(did: string, serviceIndex?: number): Promise<string>;
    start(asset: DDO | string, txId: string, tokenAddress: string, consumerAccount: Account, algorithm: ComputeAlgorithm, output?: ComputeOutput, serviceIndex?: string, serviceType?: string, additionalInputs?: ComputeInput[], userCustomParameters?: UserCustomParameters): Promise<ComputeJob>;
    stop(consumerAccount: Account, asset: DDO | string, jobId: string): Promise<ComputeJob>;
    delete(consumerAccount: Account, asset: DDO | string, jobId: string): Promise<ComputeJob>;
    status(consumerAccount: Account, did?: string, ddo?: DDO, service?: ServiceCompute, jobId?: string, txId?: string): Promise<ComputeJob[]>;
    getResult(consumerAccount: Account, jobId: string, index: number, destination: string, did?: string, ddo?: DDO, service?: ServiceCompute): Promise<any>;
    createServerAttributes(serverId: string, serverType: string, cost: string, cpu: string, gpu: string, memory: string, disk: string, maxExecutionTime: number): Server;
    createContainerAttributes(image: string, tag: string, checksum: string): Container;
    createClusterAttributes(type: string, url: string): Cluster;
    createProviderAttributes(type: string, description: string, cluster: Cluster, containers: Container[], servers: Server[]): {
        type: string;
        description: string;
        environment: {
            cluster: Cluster;
            supportedServers: Server[];
            supportedContainers: Container[];
        };
    };
    createComputeService(consumerAccount: Account, cost: string, datePublished: string, providerAttributes: any, computePrivacy?: ServiceComputePrivacy, timeout?: number, providerUri?: string, requiredCustomParameters?: ServiceCustomParametersRequired): ServiceCompute;
    private checkOutput;
    isOrderable(dataset: DDO | string, serviceIndex: number, algorithm: ComputeAlgorithm, algorithmDDO?: DDO): Promise<boolean>;
    orderAsset(consumerAccount: string, dataset: DDO | string, serviceIndex: number, algorithm: ComputeAlgorithm, mpAddress?: string, computeAddress?: string, userCustomParameters?: UserCustomParameters, authService?: string, searchPreviousOrders?: boolean): SubscribablePromise<OrderProgressStep, string>;
    orderAlgorithm(asset: DDO | string, serviceType: string, payerAddress: string, serviceIndex?: number, mpAddress?: string, consumerAddress?: string, userCustomParameters?: UserCustomParameters, authService?: string, searchPreviousOrders?: boolean): Promise<string>;
    editComputePrivacy(ddo: DDO, serviceIndex: number, computePrivacy: ServiceComputePrivacy): Promise<DDO>;
    toggleAllowAllPublishedAlgorithms(ddo: DDO, serviceIndex: number, newState: boolean): Promise<DDO>;
    createPublisherTrustedAlgorithmfromDID(did: string, ddo?: DDO): Promise<publisherTrustedAlgorithm>;
    addTrustedAlgorithmtoAsset(ddo: DDO, serviceIndex: number, algoDid: string): Promise<DDO>;
    isAlgorithmTrusted(ddo: DDO, serviceIndex: number, algoDid: string): Promise<boolean>;
    removeTrustedAlgorithmFromAsset(ddo: DDO, serviceIndex: number, algoDid: string): Promise<DDO>;
}
