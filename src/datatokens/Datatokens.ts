import Account from '../ocean/Account'

const defaultFactoryABI = require('@oceanprotocol/contracts/artifacts/development/Factory.json')
const defaultDatatokensABI = require('@oceanprotocol/contracts/artifacts/development/DataTokenTemplate.json')

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
        this.factoryABI = factoryABI || defaultFactoryABI
        this.datatokensABI = datatokensABI || defaultDatatokensABI
        this.web3 = web3
    }

    /**
     * Create new datatoken
     * @param {String} metaDataStoreURI
     * @param {Account} account
     * @return {Promise<string>} datatoken address
     */
    public async create(metaDataStoreURI: string, account: Account): Promise<string> {
        // Create factory contract object
        const factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress, {
            from: account
        })
        const estGas = await factory.methods
            .createToken(metaDataStoreURI)
            .estimateGas(function (err, estGas) {
                return estGas
            })
        // Invoke createToken function of the contract
        const trxReceipt = await factory.methods.createToken(metaDataStoreURI).send({
            from: account,
            gas: estGas + 1,
            gasPrice: '3000000000'
        })

        let tokenAddress = null
        try {
            tokenAddress = trxReceipt.events.TokenCreated.returnValues[0]
        } catch (e) {
            console.error(e)
        }
        return tokenAddress
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
        spender: string,
        amount: number,
        account: Account
    ): Promise<string> {
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account }
        )
        const trxReceipt = await datatoken.methods.approve(spender, amount).send()
        return trxReceipt
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
        const address = toAddress || account
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account }
        )
        const estGas = await datatoken.methods
            .mint(address, amount)
            .estimateGas(function (err, estGas) {
                return estGas
            })

        const trxReceipt = await datatoken.methods.mint(address, amount).send({
            from: account,
            gas: estGas + 1,
            gasPrice: '3000000000'
        })

        return trxReceipt
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
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account }
        )
        const trxReceipt = await datatoken.methods.transfer(toAddress, amount).send()
        return trxReceipt
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
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account }
        )
        const trxReceipt = await datatoken.methods
            .transferFrom(fromAddress, account, amount)
            .send()
        return trxReceipt
    }

    /**
     * Get Account Balance for datatoken
     * @param {String} dataTokenAddress
     * @param {Account} account
     * @return {Promise<number>} balance
     */
    public async balance(dataTokenAddress: string, account: Account): Promise<number> {
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account }
        )
        const trxReceipt = await datatoken.methods.balanceOf(account).call()
        return trxReceipt
    }

    /** Get Blob
     * @param {String} dataTokenAddress
     * @param {Account} account
     * @return {Promise<string>} string
     */
    public async getBlob(dataTokenAddress: string, account: Account): Promise<string> {
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account.getId() }
        )
        const trxReceipt = await datatoken.methods.blob().call()
        return trxReceipt
    }

    /** Get Name
     * @param {String} dataTokenAddress
     * @param {Account} account
     * @return {Promise<string>} string
     */
    public async getName(dataTokenAddress: string, account: Account): Promise<string> {
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account.getId() }
        )
        const trxReceipt = await datatoken.methods.name().call()
        return trxReceipt
    }

    /** Get Symbol
     * @param {String} dataTokenAddress
     * @param {Account} account
     * @return {Promise<string>} string
     */
    public async getSymbol(dataTokenAddress: string, account: Account): Promise<string> {
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account.getId() }
        )
        const trxReceipt = await datatoken.methods.symbol().call()
        return trxReceipt
    }

    /** Get Cap
     * @param {String} dataTokenAddress
     * @param {Account} account
     * @return {Promise<string>} string
     */
    public async getCap(dataTokenAddress: string, account: Account): Promise<string> {
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account.getId() }
        )
        const trxReceipt = await datatoken.methods.cap().call()
        return trxReceipt
    }
}
