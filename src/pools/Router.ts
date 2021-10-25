import { Contract } from 'web3-eth-contract'
import Web3 from 'web3'
import { TransactionReceipt } from 'web3-core'
import { AbiItem } from 'web3-utils'
import defaultRouter from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import { Logger, getFairGasPrice, generateDtName } from '../utils'

interface Operations {
  exchangeIds: string
  source: string
  operation: number
  tokenIn: string
  amountsIn: string | number
  tokenOut: string
  amountsOut: string | number
  maxPrice: string | number
}

/**
 * Provides an interface for FactoryRouter contract
 */
export class Router {
  public GASLIMIT_DEFAULT = 1000000
  public routerAddress: string
  public RouterABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number
  public router: Contract

  /**
   * Instantiate Router.
   * @param {String} routerAddress
   * @param {AbiItem | AbiItem[]} Router
   * @param {Web3} web3
   */
  constructor(
    routerAddress: string,
    web3: Web3,
    logger: Logger,
    RouterABI?: AbiItem | AbiItem[],
    startBlock?: number
  ) {
    this.routerAddress = routerAddress
    this.RouterABI = RouterABI || (defaultRouter.abi as AbiItem[])
    this.web3 = web3
    this.logger = logger
    this.startBlock = startBlock || 0
    this.router = new this.web3.eth.Contract(this.RouterABI, this.routerAddress)
  }

  /**
   * BuyDTBatch
   * @param {String} address
   * @param {Operations} operations Operations objects array
   * @return {Promise<TransactionReceipt>} Transaction receipt
   */
  public async buyDTBatch(
    address: string,
    operations: Operations[]
  ): Promise<TransactionReceipt> {
    // Get estimated gas value
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .buyDTBatch(operations)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.buyDTBatch(operations).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /** Check if a token is on ocean tokens list, if true opfFee is ZERO in pools with that token/DT
   * @return {Promise<boolean>} true if is on the list.
   */
  public async isOceanTokens(address: string): Promise<boolean> {
    return await this.router.methods.oceanTokens(address).call()
  }

  /** Check if an address is a side staking contract.
   * @return {Promise<boolean>} true if is a SS contract
   */
  public async isSideStaking(address: string): Promise<boolean> {
    return await this.router.methods.ssContracts(address).call()
  }

  /** Check if an address is a Fixed Rate contract.
   * @return {Promise<boolean>} true if is a Fixed Rate contract
   */
  public async isFixedPrice(address: string): Promise<boolean> {
    return await this.router.methods.fixedPrice(address).call()
  }

  /** Get Router Owner
   * @return {Promise<string>} Router Owner address
   */
  public async getOwner(): Promise<string> {
    return await this.router.methods.routerOwner().call()
  }

  /** Get NFT Factory address
   * @return {Promise<string>} NFT Factory address
   */
  public async getNFTFactory(): Promise<string> {
    return await this.router.methods.factory().call()
  }

  /** Check if an address is a pool template contract.
   * @return {Promise<boolean>} true if is a Template
   */
  public async isPoolTemplate(address: string): Promise<boolean> {
    return await this.router.methods.isPoolTemplate(address).call()
  }

  /**
   * Add a new token to oceanTokens list, pools with basetoken in this list have NO opf Fee
   * @param {String} address
   * @param {String} tokenAddress template address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addOceanToken(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .addOceanToken(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.addOceanToken(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Remove a token from oceanTokens list, pools without basetoken in this list have a opf Fee
   * @param {String} address
   * @param {String} tokenAddress address to remove
   * @return {Promise<TransactionReceipt>}
   */
  public async removeOceanToken(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .removeOceanToken(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.removeOceanToken(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Add a new contract to ssContract list, after is added, can be used when deploying a new pool
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addSSContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .addSSContract(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.addSSContract(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Add a new contract to fixedRate list, after is added, can be used when deploying a new pool
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addFixedRateContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .addFixedRateContract(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.addFixedRateContract(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /** Get OPF Fee per token
   * @return {Promise<number>} OPF fee for a specific baseToken
   */
  public async getOPFFee(baseToken: string): Promise<number> {
    return await this.router.methods.getOPFFee(baseToken).call()
  }

  /** Get Current OPF Fee
   * @return {Promise<number>} OPF fee
   */
  public async getCurrentOPFFee(): Promise<number> {
    return await this.router.methods.swapOceanFee().call()
  }

  /**
   * Add a new contract to fixedRate list, after is added, can be used when deploying a new pool
   * @param {String} address
   * @param {String} newFee new OPF Fee
   * @return {Promise<TransactionReceipt>}
   */
  public async updateOPFFee(
    address: string,
    newFee: number
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .updateOPFFee(newFee)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.updateOPFFee(newFee).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Add a new template to poolTemplates mapping, after template is added,it can be used
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addPoolTemplate(
    address: string,
    templateAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .addPoolTemplate(templateAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.addPoolTemplate(templateAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Remove template from poolTemplates mapping, after template is removed,it can be used anymore
   * @param {String} address
   * @param {String} templateAddress template address to remove
   * @return {Promise<TransactionReceipt>}
   */
  public async removePoolTemplate(
    address: string,
    templateAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .removePoolTemplate(templateAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods
      .removePoolTemplate(templateAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }
}
