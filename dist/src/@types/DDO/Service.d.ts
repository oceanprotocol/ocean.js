export interface PublisherTrustedAlgorithm {
    /**
     * The DID of the algorithm which is trusted by the publisher.
     * @type {string}
     */
    did: string;
    /**
     * Hash of algorithm’s files section.
     * @type {string}
     */
    filesChecksum: string;
    /**
     * Hash of algorithm’s metadata.algorithm.container section.
     * @type {string}
     */
    containerSectionChecksum: string;
}
export interface ServiceComputeOptions {
    /**
     * If true, any passed raw text will be allowed to run.
     * Useful for an algorithm drag & drop use case, but increases risk of data escape through malicious user input.
     * Should be false by default in all implementations.
     * @type {boolean}
     */
    allowRawAlgorithm: boolean;
    /**
     * If true, the algorithm job will have network access.
     * @type {boolean}
     */
    allowNetworkAccess: boolean;
    /**
     * If empty, then any published algorithm is allowed.
     * Otherwise, only published algorithms by some publishers are allowed
     * @type {string[]}
     */
    publisherTrustedAlgorithmPublishers: string[];
    /**
     * If empty, then any published algorithm is allowed. (see below)
     * @type {PublisherTrustedAlgorithm[]}
     */
    publisherTrustedAlgorithms: PublisherTrustedAlgorithm[];
}
export interface Service {
    /**
     * Unique ID
     * @type {string}
     */
    id: string;
    /**
     * Type of service (access, compute, wss.
     * @type {string}
     */
    type: 'access' | 'compute' | string;
    /**
     * Encrypted file URLs.
     * @type {string}
     */
    files: string;
    /**
     * Datatoken address
     * @type {string}
     */
    datatokenAddress: string;
    /**
     * Provider URL (schema + host).
     * @type {string}
     */
    serviceEndpoint: string;
    /**
     * Describing how long the service can be used after consumption is initiated.
     * @type {number}
     */
    timeout: number;
    /**
     * Service friendly name
     * @type {string}
     */
    name?: string;
    /**
     * Service description
     * @type {string}
     */
    description?: string;
    /**
     * If service is of type compute, holds information about the compute-related privacy settings & resources.
     * @type {ServiceComputeOptions}
     */
    compute?: ServiceComputeOptions;
    /**
     * Stores service specific additional information, this is customizable by publisher
     * @type {any}
     */
    additionalInformation?: any;
}
