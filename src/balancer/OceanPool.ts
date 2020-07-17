import { Pool } from './balancerlib'

export class OceanPool extends Pool {
    /** Ocean related functions */
    public oceanAddress: string = null
    public dtAddress: string = null

    constructor(
        web3: any,
        FactoryABI: any = null,
        PoolABI: any = null,
        factoryAddress: string = null,
        oceanAddress: string = null,
        gaslimit?: number
    ) {
        super(web3, FactoryABI, PoolABI, factoryAddress, gaslimit)
        if (oceanAddress) {
            this.oceanAddress = oceanAddress
        }
    }

    /**
     * create DataToken pool
     @param {String} account
     * @param {String} token  Data Token Address
     * @param {String} amount Data Token Amount
     * @param {String} weight Data Token Weight
     * @return {any}
     */
    public async createDTPool(
        account: string,
        token: string,
        amount: string,
        weight: string,
        fee: string,
        finalize: boolean = true
    ): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        if (parseFloat(weight) > 9 || parseFloat(weight) < 1) {
            console.error('Weight out of bounds (min 1, max9)')
            return null
        }
        const address = await super.createPool(account)
        const oceanWeight = 10 - parseFloat(weight)
        const oceanAmount = (parseFloat(amount) * oceanWeight) / parseFloat(weight)
        const tokens = [
            {
                address: token,
                amount: String(amount),
                weight: String(weight)
            },
            {
                address: this.oceanAddress,
                amount: String(oceanAmount),
                weight: String(oceanWeight)
            }
        ]
        this.dtAddress = token
        await super.addToPool(account, address, tokens)
        await super.setSwapFee(account, address, fee)
        if (finalize) await super.finalize(account, address)
        return address
    }

    /* Get DataToken address of token in this pool
     * @param {String} account
     * @param {String} poolAddress
     * @return {string}
     */
    public async getDTAddress(account: string, poolAddress: string): Promise<string> {
        this.dtAddress = null
        const tokens = await this.getCurrentTokens(account, poolAddress)
        let token
        for (token of tokens) {
            if (token !== this.oceanAddress) this.dtAddress = token
        }
        return this.dtAddress
    }

    /**
     * Get Ocean Token balance of a pool
     * @param {String} account
     * @param {String} poolAddress
     * @return {any}
     */
    public async getOceanReserve(account: string, poolAddress: string): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        return super.getReserve(account, poolAddress, this.oceanAddress)
    }

    /**
     * Get Data Token balance of a pool
     * @param {String} account
     * @param {String} poolAddress
     * @return {any}
     */
    public async getDTReserve(account: string, poolAddress: string): Promise<any> {
        await this.getDTAddress(account, poolAddress)
        return super.getReserve(account, poolAddress, this.dtAddress)
    }

    /**
     * Buy Data Token from  a pool
     * @param {String} account
     * @param {String} poolAddress
     * @param {String} amount  Data Token Amount
     * @param {String} oceanAmount  Ocean Token Amount payed
     * @param {String} maxPrice  Maximum Price to pay
     * @return {any}
     */
    public async buyDT(
        account: string,
        poolAddress: string,
        amount: string,
        oceanAmount: string,
        maxPrice: string
    ): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        await this.getDTAddress(account, poolAddress)

        // TODO - check balances first
        await super.approve(
            account,
            this.oceanAddress,
            poolAddress,
            this.web3.utils.toWei(oceanAmount)
        )

        return this.swapExactAmountOut(
            account,
            poolAddress,
            this.oceanAddress,
            oceanAmount,
            this.dtAddress,
            amount,
            maxPrice
        )
    }

    /**
     * Sell Data Token
     * @param {String} account
     * @param {String} poolAddress
     * @param {String} amount  Data Token Amount
     * @param {String} oceanAmount  Ocean Token Amount expected
     * @param {String} maxPrice  Minimum Price to sell
     * @return {any}
     */
    public async sellDT(
        account: string,
        poolAddress: string,
        amount: string,
        oceanAmount: string,
        minPrice: string
    ): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        await this.getDTAddress(account, poolAddress)
        return this.swapExactAmountOut(
            account,
            poolAddress,
            this.dtAddress,
            amount,
            this.oceanAddress,
            oceanAmount,
            minPrice
        )
    }

    /**
     * Add Data Token amount to pool liquidity
     * @param {String} account
     * @param {String} poolAddress
     * @param {String} amount  Data Token Amount
     * @return {any}
     */
    public async addDTLiquidity(
        account: string,
        poolAddress: string,
        amount: string
    ): Promise<any> {
        await this.getDTAddress(account, poolAddress)
        await super.approve(
            account,
            this.dtAddress,
            poolAddress,
            this.web3.utils.toWei(amount)
        )
        const result = await super.joinswapExternAmountIn(
            account,
            poolAddress,
            this.dtAddress,
            amount,
            '0'
        )
        return result
    }

    /**
     * Remove Data Token amount from pool liquidity
     * @param {String} account
     * @param {String} poolAddress
     * @param {String} amount  pool Liquidity Amount
     * @return {any}
     */
    public async removeDTLiquidity(
        account: string,
        poolAddress: string,
        amount: string,
        maximumPoolShares: string
    ): Promise<any> {
        await this.getDTAddress(account, poolAddress)
        // TODO Check balance of PoolShares before doing exit
        return this.exitswapExternAmountOut(
            account,
            poolAddress,
            this.dtAddress,
            amount,
            maximumPoolShares
        )
    }

    /**
     * Add Ocean Token amount to pool liquidity
     * @param {String} account
     * @param {String} poolAddress
     * @param {String} amount  Data Token Amount
     * @return {any}
     */
    public async addOceanLiquidity(
        account: string,
        poolAddress: string,
        amount: string
    ): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        await super.approve(
            account,
            this.oceanAddress,
            poolAddress,
            this.web3.utils.toWei(amount)
        )
        const result = await super.joinswapExternAmountIn(
            account,
            poolAddress,
            this.oceanAddress,
            amount,
            '0'
        )
        return result
    }

    /**
     * Remove Ocean Token amount from pool liquidity
     * @param {String} account
     * @param {String} poolAddress
     * @param {String} amount  pool Liquidity Amount
     * @return {any}
     */
    public removeOceanLiquidity(
        account: string,
        poolAddress: string,
        amount: string,
        maximumPoolShares: string
    ): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        // TODO Check balance of PoolShares before doing exit
        return super.exitswapExternAmountOut(
            account,
            poolAddress,
            this.oceanAddress,
            amount,
            maximumPoolShares
        )
    }

    /**
     * Get Data Token Price from pool
     * @param {String} account
     * @param {String} poolAddress
     * @return {any}
     */
    public async getDTPrice(account: string, poolAddress: string): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        await this.getDTAddress(account, poolAddress)
        return super.getSpotPrice(account, poolAddress, this.dtAddress, this.oceanAddress)
    }

    public async searchPoolforDT(account: string, dtAddress: string): Promise<string[]> {
        const result: string[] = []
        const factory = new this.web3.eth.Contract(this.FactoryABI, this.factoryAddress, {
            from: account
        })
        const events = await factory.getPastEvents('LOG_NEW_POOL', {
            filter: {},
            fromBlock: 0,
            toBlock: 'latest'
        })
        for (let i = 0; i < events.length; i++) {
            const constituents = await super.getCurrentTokens(
                account,
                events[i].returnValues[1]
            )
            if (constituents.includes(dtAddress)) result.push(events[i].returnValues[1])
        }
        return result
    }
}
