import { LogLevel } from '../utils/Logger'
export { LogLevel } from '../utils/Logger'

export class Config {
    /**
     * Ethereum node URL.
     * @type {string}
     */
    public nodeUri?: string

    /**
     * Address of Provider.
     * @type {string}
     */
    public providerAddress?: string

    /**
     * Metadata Store URL.
     * @type {string}
     */
    public metadataStoreUri?: string

    /**
     * Provider URL.
     * @type {string}
     */
    public providerUri?: string

    /**
     * Web3 Provider.
     * @type {any}
     */
    public web3Provider?: any

    /**
     * Ocean Token address
     * @type {string}
     */
    public oceanTokenAddress?: string

    /**
     * Factory address
     * @type {string}
     */
    public factoryAddress?: string

    /**
     * Factory ABI
     * @type {string}
     */
    public factoryABI?: object

    /**
     * datatokens ABI
     * @type {string}
     */
    public datatokensABI?: object

    /**
     * Pool Factory address
     * @type {string}
     */
    public poolFactoryAddress?: string

    /**
     * Pool Factory ABI
     * @type {string}
     */
    public poolFactoryABI?: object

    /**
     * Pool ABI
     * @type {string}
     */
    public poolABI?: object

    /**
     * Log level.
     * @type {boolean | LogLevel}
     */
    public verbose?: boolean | LogLevel

    /**
     * Message shown when the user creates its own token.
     * @type {string}
     */
    public authMessage?: string

    /**
     * Token expiration time in ms.
     * @type {number}
     */
    public authTokenExpiration?: number

    // Parity config
    public parityUri?: string

    public threshold?: number
}

export default Config
