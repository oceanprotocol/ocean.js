import Account from '../ocean/Account'

/**
 * Provides a interface to DataTokens
 
 */
export class DataTokens {
    public factoryAddress: string
    public factoryABI: object
    public datatokensABI: object
    public web3: any

    /**
     * Instantiate DataTokens (independently of Ocean).
     * @param {String} factoryAddress
     * @param {Object} factoryABI
     * @param {Object} datatokensABI
     * @param {Object} web3 
     
     */
    constructor(
        factoryAddress: string,
        factoryABI: object,
        datatokensABI: object,
        web3: any
    ) {
        this.factoryAddress = factoryAddress
        this.factoryABI = factoryABI
        this.datatokensABI = datatokensABI
        this.web3 = web3
    }

    /**
     * Create new datatoken
     * @param {String} metaDataStoreURI
     * @param {Account} account
     * @return {Promise<string>} datatoken address
     */
    public async create(metaDataStoreURI: string, account: Account): Promise<string> {
        // TO DO
    }

    /**
     * Approve
     * @param {String} dataTokenAddress
     * @param {String} toAddress
     * @param {Number} amount
     * @param {Account} account
     * @return {Promise<string>} transactionId
     */
    public async approve(
        dataTokenAddress: string,
        toAddress: string,
        amount: number,
        account: Account
    ): Promise<string> {
        // TO DO
    }

    /**
     * Mint
     * @param {String} dataTokenAddress
     * @param {Account} account
     * @param {Number} amount
     * @param {String} toAddress   - only if toAddress is different from the minter
     * @return {Promise<string>} transactionId
     */
    public async mint(
        dataTokenAddress: string,
        account: Account,
        amount: number,
        toAddress?: string
    ): Promise<string> {
        // TO DO
    }

    /**
     * Transfer from Account to Address
     * @param {String} dataTokenAddress
     * @param {String} toAddress
     * @param {Number} amount
     * @param {Account} account
     * @return {Promise<string>} transactionId
     */
    public async transfer(
        dataTokenAddress: string,
        toAddress: string,
        amount: number,
        account: Account
    ): Promise<string> {
        // TO DO
    }

    /**
     * Transfer from Address to Account  (needs an Approve operation before)
     * @param {String} dataTokenAddress
     * @param {String} fromAddress
     * @param {Number} amount
     * @param {Account} account
     * @return {Promise<string>} transactionId
     */
    public async transferFrom(
        dataTokenAddress: string,
        fromAddress: string,
        amount: number,
        account: Account
    ): Promise<string> {
        // TO DO
    }

    /**
     * Get Account Balance for datatoken
     * @param {String} dataTokenAddress
     * @param {Account} account
     * @return {Promise<string>} transactionId
     */
    public async balance(dataTokenAddress: string, account: Account): Promise<number> {
        // TO DO
    }
}
