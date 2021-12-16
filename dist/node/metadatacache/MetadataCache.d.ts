import { DDO } from '../ddo/DDO';
import DID from '../ocean/DID';
import { Logger } from '../utils';
import { WebServiceConnector } from '../ocean/utils/WebServiceConnector';
import { Metadata, ValidateMetadata } from '../ddo/interfaces';
export interface SearchQuery {
    from?: number;
    size?: number;
    query: {
        match?: {
            [property: string]: string | number | boolean | Record<string, string | number | boolean>;
        };
        query_string?: {
            [property: string]: string | number | string[] | number[] | boolean;
        };
        simple_query_string?: {
            [property: string]: string | number | string[] | number[] | boolean;
        };
    };
    sort?: {
        [jsonPath: string]: string;
    };
}
export declare class MetadataCache {
    fetch: WebServiceConnector;
    private logger;
    private metadataCacheUri;
    private get url();
    constructor(metadataCacheUri: string, logger: Logger, requestTimeout?: number);
    getVersionInfo(): Promise<any>;
    getAccessUrl(accessToken: any, payload: any): Promise<string>;
    queryMetadata(query: SearchQuery): Promise<any>;
    encryptDDO(ddo: any): Promise<any>;
    validateMetadata(metadata: Metadata | DDO): Promise<ValidateMetadata>;
    retrieveDDO(did: DID | string, metadataServiceEndpoint?: string): Promise<DDO>;
    retrieveDDOByUrl(metadataServiceEndpoint?: string): Promise<DDO>;
    getServiceEndpoint(did: DID): string;
    getURI(): string;
    sleep(ms: number): Promise<unknown>;
    waitForAqua(did: string, txid?: string): Promise<void>;
}
