import { DDO } from '../ddo/DDO';
import { Metadata } from '../ddo/interfaces/Metadata';
import { Service, ServiceAccess, ServiceCustomParameter, ServiceCustomParametersRequired } from '../ddo/interfaces/Service';
import { SearchQuery } from '../metadatacache/MetadataCache';
import { EditableMetadata } from '../ddo/interfaces/EditableMetadata';
import Account from './Account';
import { SubscribablePromise } from '../utils';
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract';
import { UserCustomParameters } from '../provider/Provider';
import { TransactionReceipt } from 'web3-core';
import { Consumable } from '../ddo/interfaces/Consumable';
export declare enum CreateProgressStep {
    CreatingDataToken = 0,
    DataTokenCreated = 1,
    EncryptingFiles = 2,
    FilesEncrypted = 3,
    StoringDdo = 4,
    DdoStored = 5
}
export declare enum OrderProgressStep {
    TransferDataToken = 0
}
export interface Order {
    dtAddress: string;
    amount: string;
    timestamp: number;
    transactionHash: string;
    consumer: string;
    payer: string;
    did?: string;
    serviceId?: number;
    serviceType?: string;
}
export declare class Assets extends Instantiable {
    static getInstance(config: InstantiableConfig): Promise<Assets>;
    create(metadata: Metadata, publisher: Account, services?: Service[], dtAddress?: string, cap?: string, name?: string, symbol?: string, providerUri?: string): SubscribablePromise<CreateProgressStep, DDO>;
    resolve(did: string): Promise<DDO>;
    editMetadata(ddo: DDO, newMetadata: EditableMetadata): Promise<DDO>;
    updateCredentials(ddo: DDO, credentialType: string, allowList: string[], denyList: string[]): Promise<DDO>;
    checkCredential(ddo: DDO, credentialType: string, value: string): Consumable;
    publishDdo(ddo: DDO, consumerAccount: string, encrypt?: boolean): Promise<TransactionReceipt>;
    updateMetadata(ddo: DDO, consumerAccount: string): Promise<TransactionReceipt>;
    editServiceTimeout(ddo: DDO, serviceIndex: number, timeout: number): Promise<DDO>;
    creator(asset: DDO | string): Promise<string>;
    getServiceByType(asset: DDO | string, serviceType: string): Promise<Service>;
    getServiceByIndex(asset: DDO | string, serviceIndex: number): Promise<Service>;
    query(query: SearchQuery): Promise<any>;
    createAccessServiceAttributes(creator: Account, cost: string, datePublished: string, timeout?: number, providerUri?: string, requiredParameters?: ServiceCustomParametersRequired): Promise<ServiceAccess>;
    initialize(asset: DDO | string, serviceType: string, consumerAddress: string, serviceIndex: number, serviceEndpoint: string, userCustomParameters?: UserCustomParameters): Promise<any>;
    order(asset: DDO | string, serviceType: string, payerAddress: string, serviceIndex?: number, mpAddress?: string, consumerAddress?: string, userCustomParameters?: UserCustomParameters, authService?: string, searchPreviousOrders?: boolean): Promise<string>;
    download(asset: DDO | string, txId: string, tokenAddress: string, consumerAccount: Account, destination: string): Promise<string | true>;
    simpleDownload(dtAddress: string, serviceEndpoint: string, txId: string, account: string): Promise<string>;
    getOrderHistory(account: Account, serviceType?: string, fromBlock?: number): Promise<Order[]>;
    isConsumable(ddo: DDO, consumer?: string, credentialsType?: string, authService?: string): Promise<Consumable>;
    isUserCustomParametersValid(serviceCustomParameters: ServiceCustomParameter[], userCustomParameters?: UserCustomParameters): Promise<boolean>;
}
