import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import defaultDatatokensABI from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Decimal from 'decimal.js'
import { Logger, getFairGasPrice } from '../utils'

/**
 * ERC20 ROLES
 */
interface Roles {
  minter: boolean
  feeManager: boolean
}

export class Datatoken {
  public GASLIMIT_DEFAULT = 1000000
  public factoryAddress: string
  public factoryABI: AbiItem | AbiItem[]
  public datatokensABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number

  /**
   * Instantiate ERC20 DataTokens (independently of Ocean).
   * @param {AbiItem | AbiItem[]} datatokensABI
   * @param {Web3} web3
   */
  constructor(
    web3: Web3,
    logger: Logger,
    datatokensABI?: AbiItem | AbiItem[],
    startBlock?: number
  ) {
    this.web3 = web3
    this.logger = logger
    this.datatokensABI = datatokensABI || (defaultDatatokensABI.abi as AbiItem[])
    this.startBlock = startBlock || 0
  }

  /**
   * Approve
   * @param {String} dtAddress Datatoken address
   * @param {String} spender Spender address
   * @param {string} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address User adress
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async approve(
    dtAddress: string,
    spender: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    // Estimate gas cost for mint method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .approve(spender, this.web3.utils.toWei(amount))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call mint contract method
    const trxReceipt = await dtContract.methods
      .approve(spender, this.web3.utils.toWei(amount))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    return trxReceipt
  }

  /**
   * Mint
   * @param {String} dtAddress Datatoken address
   * @param {String} address Minter address
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} toAddress only if toAddress is different from the minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async mint(
    dtAddress: string,
    address: string,
    amount: string,
    toAddress?: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    if ((await this.getDTPermissions(dtAddress, address)).minter != true) {
      throw new Error(`Caller is not Minter`)
    }

    const capAvailble = await this.getCap(dtAddress)
    if (new Decimal(capAvailble).gte(amount)) {
      // Estimate gas cost for mint method
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      let estGas
      try {
        estGas = await dtContract.methods
          .mint(toAddress || address, this.web3.utils.toWei(amount))
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }

      // Call mint contract method
      const trxReceipt = await dtContract.methods
        .mint(toAddress || address, this.web3.utils.toWei(amount))
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } else {
      throw new Error(`Mint amount exceeds cap available`)
    }
  }

  /**
   * Add Minter for an ERC20 datatoken
   * only ERC20Deployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} minter User which is going to be a Minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async addMinter(
    dtAddress: string,
    address: string,
    minter: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    // should check ERC20Deployer role using erc721 level ..

    // Estimate gas cost for addMinter method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .addMinter(minter)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call addMinter function of the contract
    const trxReceipt = await dtContract.methods.addMinter(minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Revoke Minter permission for an ERC20 datatoken
   * only ERC20Deployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} minter User which will be removed from Minter permission
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async removeMinter(
    dtAddress: string,
    address: string,
    minter: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    // should check ERC20Deployer role using erc721 level ..

    // Estimate gas for removeMinter method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .removeMinter(minter)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call dtContract function of the contract
    const trxReceipt = await dtContract.methods.removeMinter(minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Add FeeManager for an ERC20 datatoken
   * only ERC20Deployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} feeManager User which is going to be a Minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async addFeeManager(
    dtAddress: string,
    address: string,
    feeManager: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    // should check ERC20Deployer role using erc721 level ..

    // Estimate gas for addFeeManager method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .addFeeManager(feeManager)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call addFeeManager function of the contract
    const trxReceipt = await dtContract.methods.addFeeManager(feeManager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Revoke FeeManager permission for an ERC20 datatoken
   * only ERC20Deployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} feeManager User which will be removed from FeeManager permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeFeeManager(
    dtAddress: string,
    address: string,
    feeManager: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    // should check ERC20Deployer role using erc721 level ..

    // Estimate gas for removeFeeManager method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .removeFeeManager(feeManager)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call removeFeeManager function of the contract
    const trxReceipt = await dtContract.methods.removeFeeManager(feeManager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Transfer as number from address to toAddress
   * @param {String} dtAddress Datatoken address
   * @param {String} toAddress Receiver address
   * @param {String} amount Number of datatokens, as number. To be converted to wei.
   * @param {String} address User adress
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async transfer(
    dtAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    const weiAmount = this.web3.utils.toWei(amount)
    return this.transferWei(dtAddress, toAddress, weiAmount, address)
  }

  /**
   * Transfer in wei from address to toAddress
   * @param {String} dtAddress Datatoken address
   * @param {String} toAddress Receiver address
   * @param {String} amount Number of datatokens, as number. Expressed as wei
   * @param {String} address User adress
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async transferWei(
    dtAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)
    try {
      // Estimate gas for transfer method
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      let estGas
      try {
        estGas = await dtContract.methods
          .transfer(toAddress, amount)
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }

      // Call transfer function of the contract
      const trxReceipt = await dtContract.methods.transfer(toAddress, amount).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
      return trxReceipt
    } catch (e) {
      this.logger.error(`ERROR: Failed to transfer tokens: ${e.message}`)
      throw new Error(`Failed Failed to transfer tokens: ${e.message}`)
    }
  }

  /** Start Order: called by payer or consumer prior ordering a service consume on a marketplace.
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {String} consumer Consumer Address
   * @param {String} amount Amount of tokens that is going to be transfered
   * @param {Number} serviceId  Service index in the metadata
   * @param {String} mpFeeAddress Consume marketplace fee address
   * @param {String} feeToken address of the token marketplace wants to add fee on top
   * @param {String} feeAmount amount of feeToken to be transferred to mpFeeAddress on top, will be converted to WEI
   * @return {Promise<TransactionReceipt>} string
   */
  public async startOrder(
    dtAddress: string,
    address: string,
    consumer: string,
    amount: string,
    serviceId: number,
    mpFeeAddress: string,
    feeToken: string,
    feeAmount: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)
    if (!mpFeeAddress) mpFeeAddress = '0x0000000000000000000000000000000000000000'
    try {
      // Estimate gas for startOrder method
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      let estGas
      try {
        estGas = await dtContract.methods
          .startOrder(
            consumer,
            this.web3.utils.toWei(amount),
            serviceId,
            mpFeeAddress,
            feeToken,
            this.web3.utils.toWei(feeAmount)
          )
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }

      const trxReceipt = await dtContract.methods
        .startOrder(
          consumer,
          this.web3.utils.toWei(amount),
          serviceId,
          mpFeeAddress,
          feeToken,
          this.web3.utils.toWei(feeAmount)
        )
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } catch (e) {
      this.logger.error(`ERROR: Failed to start order : ${e.message}`)
      throw new Error(`Failed to start order: ${e.message}`)
    }
  }

  /** setData
   * This function allows to store data with a preset key (keccak256(ERC20Address)) into NFT 725 Store
   * only ERC20Deployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} value Data to be stored into 725Y standard
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async setData(
    dtAddress: string,
    address: string,
    value: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    // Estimate gas for setData method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .setData(value)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call setData function of the contract
    const trxReceipt = await dtContract.methods.setData(value).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Clean erc20level Permissions (minters, feeManagers and reset the feeCollector) for an ERC20 datatoken
   * Only NFT Owner (at 721 level) can call it.
   * @param dtAddress Datatoken address where we want to clean permissions
   * @param address User adress
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async cleanPermissions(
    dtAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    // Estimate gas for cleanPermissions method
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .cleanPermissions()
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Call cleanPermissions function of the contract
    const trxReceipt = await dtContract.methods.cleanPermissions().send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }
  /** Returns ERC20 user's permissions for a datatoken
   * @param {String} dtAddress Datatoken adress
   * @param {String} address user adress
   * @return {Promise<Roles>}
   */
  public async getDTPermissions(dtAddress: string, address: string): Promise<Roles> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)
    const roles = await dtContract.methods.permissions(address).call()
    return roles
  }

  /** Returns the DataToken capital
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<string>}
   */
  public async getCap(dtAddress: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dtAddress)
    const cap = await datatoken.methods.cap().call()
    return this.web3.utils.fromWei(cap)
  }
}
