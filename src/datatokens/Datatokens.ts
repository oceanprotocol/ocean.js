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
                if (err) console.log('Datatokens: ' + err)
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
     * @param {Number} amount Number of datatokens, as number. Will be converted to wei
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
        const trxReceipt = await datatoken.methods
            .approve(spender, this.web3.utils.toWei(String(amount)))
            .send()
        return trxReceipt
    }

    /**
     * Mint
     * @param {String} dataTokenAddress
     * @param {Account} account
     * @param {Number} amount Number of datatokens, as number. Will be converted to wei
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
            .mint(address, this.web3.utils.toWei(String(amount)))
            .estimateGas(function (err, estGas) {
                if (err) console.log('Datatokens: ' + err)
                return estGas
            })

        const trxReceipt = await datatoken.methods
            .mint(address, this.web3.utils.toWei(String(amount)))
            .send({
                from: account,
                gas: estGas + 1,
                gasPrice: '3000000000'
            })

        return trxReceipt
    }

    /**
     * Transfer as number from Account to Address
     * @param {String} dataTokenAddress
     * @param {String} toAddress
     * @param {Number} amount Number of datatokens, as number. Will be converted to wei
     * @param {Account} account
     * @return {Promise<string>} transactionId
     */
    public async transfer(
        dataTokenAddress: string,
        toAddress: string,
        amount: number,
        account: Account
    ): Promise<string> {
        return this.transferToken(dataTokenAddress, toAddress, amount, account)
    }

    /**
     * Transfer as number from Account to Address
     * @param {String} dataTokenAddress
     * @param {String} toAddress
     * @param {Number} amount Number of datatokens, as number. Will be converted to wei
     * @param {Account} account
     * @return {Promise<string>} transactionId
     */
    public async transferToken(
        dataTokenAddress: string,
        toAddress: string,
        amount: number,
        account: Account
    ): Promise<string> {
        const weiAmount = this.web3.utils.toWei(String(amount))
        return this.transferWei(dataTokenAddress, toAddress, weiAmount, account)
    }

    /**
     * Transfer in wei from Account to Address
     * @param {String} dataTokenAddress
     * @param {String} toAddress
     * @param {Number} amount Number of datatokens, as number. Expressed as wei
     * @param {Account} account
     * @return {Promise<string>} transactionId
     */
    public async transferWei(
        dataTokenAddress: string,
        toAddress: string,
        amount: string,
        account: Account
    ): Promise<string> {
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account }
        )
        const trxReceipt = await datatoken.methods
            .transfer(toAddress, String(amount))
            .send()
        return trxReceipt
    }

    /**
     * Transfer from Address to Account  (needs an Approve operation before)
     * @param {String} dataTokenAddress
     * @param {String} fromAddress
     * @param {Number} amount Number of datatokens, as number. Will be converted to wei
     * @param {Account} account
     * @return {Promise<string>} transactionId
     */
    public async transferFrom(
        dataTokenAddress: string,
        fromAddress: string,
        amount: number,
        account: string
    ): Promise<string> {
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account }
        )
        const trxReceipt = await datatoken.methods
            .transferFrom(fromAddress, account, this.web3.utils.toWei(String(amount)))
            .send()
        return trxReceipt
    }

    /**
     * Get Account Balance for datatoken
     * @param {String} dataTokenAddress
     * @param {Account} account
     * @return {Promise<number>} balance  Number of datatokens, as number. Will be converted from wei
     */
    public async balance(dataTokenAddress: string, account: Account): Promise<number> {
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: account }
        )
        const balance = await datatoken.methods.balanceOf(account).call()
        return this.web3.utils.fromWei(balance)
    }

    /**
     *
     * @param dataTokenAddress
     * @param account
     */
    public async allowance(
        dataTokenAddress: string,
        owner: string,
        spender: string
    ): Promise<string> {
        const datatoken = new this.web3.eth.Contract(
            this.datatokensABI,
            dataTokenAddress,
            { from: spender }
        )
        const trxReceipt = await datatoken.methods.allowance(owner, spender).call()
        return this.web3.utils.fromWei(trxReceipt)
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
        return this.web3.utils.fromWei(trxReceipt)
    }

    /** Convert from number to wei
     * @param {Number} amount
     * @return {Promise<string>} string
     */
    public toWei(amount) {
        return this.web3.utils.toWei(String(amount))
    }

    /** Convert from wei to number
     * @param {String} amount
     * @return {Promise<string>} string
     */
    public fromWei(amount) {
        return this.web3.utils.fromWei(amount)
    }
}
