import { LogLevel } from '../utils/Logger'
export { LogLevel } from '../utils/Logger'

export class Config {
    /**
     * Aquarius URL.
     * @type {string}
     */
    public aquariusUri?: string

    /**
     * Brizo URL.
     * @type {string}
     */
    public brizoUri?: string

    /**
     * Web3 Provider.
     * @type {any}
     */
    public web3Provider: any

    /**
     * Factory address
     * @type {string}
     */
    public factoryAddress: string

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
