import { BalancerPool } from './balancerlib'

export class OceanPool extends BalancerPool {
    /** Ocean related functions */
    public oceanAddress: string = null
    public dtAddress: string = null

    constructor(
        web3: any,
        account: string,
        FactoryABI: any = null,
        PoolABI: any = null,
        factoryAddress: string = null,
        oceanAddress: string = null
    ) {
        super(web3, account, FactoryABI, PoolABI, factoryAddress)
        if (oceanAddress) {
            this.oceanAddress = oceanAddress
        }
    }

    /*  async getNetworkAddresses(): Promise<void> {
        if (this.factoryAddress && this.oceanAddress) {
            return
        }
        const netId = await this.web3.eth.net.getId()
        switch (netId) {
            case 1:
                if (!this.factoryAddress)
                    this.factoryAddress = '0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd'
                if (!this.oceanAddress)
                    this.oceanAddress = '0x985dd3D42De1e256d09e1c10F112bCCB8015AD41'
                break
            case 42:
                if (!this.factoryAddress)
                    this.factoryAddress = '0x8f7F78080219d4066A8036ccD30D588B416a40DB'
                if (!this.oceanAddress) this.oceanAddress = null
                break
            default:
                this.factoryAddress = null
                this.oceanAddress = null
        }
    } */

    /**
     * create DataToken pool
     * @param {String} token  Data Token Address
     * @param {String} amount Data Token Amount
     * @param {String} weight Data Token Weight
     * @return {any}
     */
    public async createDTPool(
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
        const address = await super.newPool()
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
        await super.addToPool(tokens)
        await super.setSwapFee(fee)
        if (finalize) await super.finalize()
        return address
    }

    /**
     * Load a previous created DataToken pool
     * @param {String} address  Data Token Address
     * @return {any}
     */
    public async loadDTPool(address: string): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        await super.loadPool(address)
        const tokens = await this.getCurrentTokens()
        let token
        for (token of tokens) {
            if (token !== this.oceanAddress) this.dtAddress = token
        }
        return this
    }

    /**
     * Get Ocean Token balance of a pool
     * @return {any}
     */
    public async getOceanBalance(): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        return super.getBalance(this.oceanAddress)
    }

    /**
     * Get Data Token balance of a pool
     * @return {any}
     */
    public async getDTBalance(): Promise<any> {
        if (this.dtAddress == null) {
            console.error(
                'dtAddress is not defined. Did you do loadDTPool or createDTPool ?'
            )
            return null
        }
        return super.getBalance(this.dtAddress)
    }

    /**
     * Buy Data Token from  a pool
     * @param {String} amount  Data Token Amount
     * @param {String} oceanAmount  Ocean Token Amount payed
     * @param {String} maxPrice  Maximum Price to pay
     * @return {any}
     */
    public async buyDT(
        amount: string,
        oceanAmount: string,
        maxPrice: string
    ): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        if (this.dtAddress == null) {
            console.error(
                'dtAddress is not defined. Did you do loadDTPool or createDTPool ?'
            )
            return null
        }

        // TODO - check balances first
        await super.approve(
            this.oceanAddress,
            this.poolAddress,
            this.web3.utils.toWei(oceanAmount)
        )

        return this.swapExactAmountOut(
            this.oceanAddress,
            oceanAmount,
            this.dtAddress,
            amount,
            maxPrice
        )
    }

    /**
     * Sell Data Token
     * @param {String} amount  Data Token Amount
     * @param {String} oceanAmount  Ocean Token Amount expected
     * @param {String} maxPrice  Minimum Price to sell
     * @return {any}
     */
    public async sellDT(
        amount: string,
        oceanAmount: string,
        minPrice: string
    ): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        if (this.dtAddress == null) {
            console.error(
                'dtAddress is not defined. Did you do loadDTPool or createDTPool ?'
            )
            return null
        }
        return this.swapExactAmountOut(
            this.dtAddress,
            amount,
            this.oceanAddress,
            oceanAmount,
            minPrice
        )
    }

    /**
     * Add Data Token amount to pool liquidity
     * @param {String} amount  Data Token Amount
     * @return {any}
     */
    public async addDTLiquidity(amount: string): Promise<any> {
        if (this.dtAddress == null) {
            console.error(
                'dtAddress is not defined. Did you do loadDTPool or createDTPool ?'
            )
            return null
        }
        await this.approve(
            this.dtAddress,
            this.poolAddress,
            this.web3.utils.toWei(amount)
        )
        const result = await this.joinswapExternAmountIn(this.dtAddress, amount, '0')
        return result
    }

    /**
     * Remove Data Token amount from pool liquidity
     * @param {String} amount  pool Liquidity Amount
     * @return {any}
     */
    public removeDTLiquidity(amount: string, maximumPoolShares: string): Promise<any> {
        if (this.dtAddress == null) {
            console.error(
                'dtAddress is not defined. Did you do loadDTPool or createDTPool ?'
            )
            return null
        }
        // TODO Check balance of PoolShares before doing exit
        return this.exitswapExternAmountOut(this.dtAddress, amount, maximumPoolShares)
    }

    /**
     * Add Ocean Token amount to pool liquidity
     * @param {String} amount  Data Token Amount
     * @return {any}
     */
    public async addOceanLiquidity(amount: string): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        await this.approve(
            this.oceanAddress,
            this.poolAddress,
            this.web3.utils.toWei(amount)
        )
        const result = await this.joinswapExternAmountIn(this.oceanAddress, amount, '0')
        return result
    }

    /**
     * Remove Ocean Token amount from pool liquidity
     * @param {String} amount  pool Liquidity Amount
     * @return {any}
     */
    public removeOceanLiquidity(amount: string, maximumPoolShares: string): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        // TODO Check balance of PoolShares before doing exit
        return this.exitswapExternAmountOut(this.oceanAddress, amount, maximumPoolShares)
    }

    /**
     * Get Data Token Price from pool
     * @return {any}
     */
    public async getDTPrice(): Promise<any> {
        if (this.oceanAddress == null) {
            console.error('oceanAddress is not defined')
            return null
        }
        if (this.dtAddress == null) {
            console.error(
                'dtAddress is not defined. Did you do loadDTPool or createDTPool ?'
            )
            return null
        }
        return this.getSpotPrice(this.dtAddress, this.oceanAddress)
    }
}
