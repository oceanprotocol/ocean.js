import { Contract } from 'web3-eth-contract'
import Web3 from 'web3'
import { TransactionReceipt } from 'web3-core'
import { AbiItem } from 'web3-utils'
import defaultRouter from '../artifacts/pools/FactoryRouter.sol/FactoryRouter.json'
import { getFairGasPrice } from '../utils'
import { Operation } from '../interfaces/RouterInterface'

/**
 * Provides an interface for FactoryRouter contract
 */
export class Router {
  public GASLIMIT_DEFAULT = 1000000
  public routerAddress: string
  public RouterAbi: AbiItem | AbiItem[]
  public web3: Web3
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
    RouterAbi?: AbiItem | AbiItem[],
    startBlock?: number
  ) {
    this.routerAddress = routerAddress
    this.RouterAbi = RouterAbi || (defaultRouter.abi as AbiItem[])
    this.web3 = web3
    this.startBlock = startBlock || 0
    this.router = new this.web3.eth.Contract(this.RouterAbi, this.routerAddress)
  }

  /**
   * Estimate gas cost for buyDTBatch method
   * @param {String} address
   * @param {Operation} operations Operations objects array
   * @return {Promise<TransactionReceipt>} Transaction receipt
   */
  public async estGasBuyDTBatch(address: string, operations: Operation[]): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .buyDTBatch(operations)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * BuyDTBatch
   * @param {String} address
   * @param {Operation} operations Operations objects array
   * @return {Promise<TransactionReceipt>} Transaction receipt
   */
  public async buyDTBatch(
    address: string,
    operations: Operation[]
  ): Promise<TransactionReceipt> {
    const estGas = await this.estGasBuyDTBatch(address, operations)

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
   * Estimate gas cost for addOceanToken
   * @param {String} address
   * @param {String} tokenAddress token address we want to add
   * @param {Contract} routerContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasAddOceanToken(
    address: string,
    tokenAddress: string,
    contractInstance?: Contract
  ) {
    const routerContract = contractInstance || this.router

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await routerContract.methods
        .addOceanToken(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Add a new token to oceanTokens list, pools with baseToken in this list have NO opf Fee
   * @param {String} address caller address
   * @param {String} tokenAddress token address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addOceanToken(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.estGasAddOceanToken(address, tokenAddress)

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.addOceanToken(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removeOceanToken
   * @param {String} address caller address
   * @param {String} tokenAddress token address we want to add
   * @param {Contract} routerContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasRemoveOceanToken(
    address: string,
    tokenAddress: string,
    contractInstance?: Contract
  ) {
    const routerContract = contractInstance || this.router

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await routerContract.methods
        .removeOceanToken(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Remove a token from oceanTokens list, pools without baseToken in this list have a opf Fee
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

    const estGas = await this.estGasRemoveOceanToken(address, tokenAddress)

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.removeOceanToken(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addSSContract method
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasAddSSContract(address: string, tokenAddress: string): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .addSSContract(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
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

    const estGas = await this.estGasAddSSContract(address, tokenAddress)
    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.addSSContract(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removeSSContract method
   * @param {String} address caller address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasRemoveSSContract(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .removeSSContract(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
  }

  /**
   * Removes a new contract from ssContract list
   * @param {String} address caller address
   * @param {String} tokenAddress contract address to removed
   * @return {Promise<TransactionReceipt>}
   */
  public async removeSSContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.estGasRemoveSSContract(address, tokenAddress)
    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.removeSSContract(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addFixedRateContract method
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasAddFixedRateContract(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .addFixedRateContract(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
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

    const estGas = await this.estGasAddFixedRateContract(address, tokenAddress)

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.addFixedRateContract(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addFixedRateContract method
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasRemoveFixedRateContract(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .removeFixedRateContract(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
  }

  /**
   * Removes a contract from fixedRate list
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async removeFixedRateContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.estGasRemoveFixedRateContract(address, tokenAddress)

    // Invoke removeFixedRateContract function of the contract
    const trxReceipt = await this.router.methods
      .removeFixedRateContract(tokenAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addDispenserContract method
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasAddDispenserContract(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .addDispenserContract(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
  }

  /**
   * Add a new contract to dispenser list, after is added, can be used when deploying a new pool
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addDispenserContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.estGasAddDispenserContract(address, tokenAddress)

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.addDispenserContract(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addDispenserContract method
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasRemoveDispenserContract(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .removeDispenserContract(tokenAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
  }

  /**
   * Add a new contract to dispenser list, after is added, can be used when deploying a new pool
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async removeDispenserContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await this.estGasRemoveDispenserContract(address, tokenAddress)

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods
      .removeDispenserContract(tokenAddress)
      .send({
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
   * Estimate gas cost for updateOPFFee method
   * @param {String} address
   * @param {String} newFee new OPF Fee
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasUpdateOPFFee(address: string, newFee: number): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .updateOPFFee(newFee)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
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
    const estGas = await this.estGasUpdateOPFFee(address, newFee)

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.updateOPFFee(newFee).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addPoolTemplate method
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasAddPoolTemplate(
    address: string,
    templateAddress: string
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .addPoolTemplate(templateAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
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

    const estGas = await this.estGasAddPoolTemplate(address, templateAddress)

    // Invoke createToken function of the contract
    const trxReceipt = await this.router.methods.addPoolTemplate(templateAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removePoolTemplate method
   * @param {String} address
   * @param {String} templateAddress template address to remove
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasRemovePoolTemplate(
    address: string,
    templateAddress: string
  ): Promise<any> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .removePoolTemplate(templateAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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

    const estGas = await this.estGasRemovePoolTemplate(address, templateAddress)

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
