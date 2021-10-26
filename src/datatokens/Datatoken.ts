import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import defaultDatatokensABI from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Decimal from 'decimal.js'
import { LoggerInstance, getFairGasPrice } from '../utils'
import { Contract } from 'web3-eth-contract'

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
  public startBlock: number

  /**
   * Instantiate ERC20 DataTokens (independently of Ocean).
   * @param {AbiItem | AbiItem[]} datatokensABI
   * @param {Web3} web3
   */
  constructor(web3: Web3, datatokensABI?: AbiItem | AbiItem[], startBlock?: number) {
    this.web3 = web3
    this.datatokensABI = datatokensABI || (defaultDatatokensABI.abi as AbiItem[])
    this.startBlock = startBlock || 0
  }

  /**
   * Estimate gas cost for mint method
   * @param {String} dtAddress Datatoken address
   * @param {String} spender Spender address
   * @param {string} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address User adress
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasApprove(
    dtAddress: string,
    spender: string,
    amount: string,
    address: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

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
    return estGas
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

    const estGas = await this.estGasApprove(
      dtAddress,
      spender,
      amount,
      address,
      dtContract
    )

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
   * Estimate gas cost for mint method
   * @param {String} dtAddress Datatoken address
   * @param {String} address Minter address
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} toAddress only if toAddress is different from the minter
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasMint(
    dtAddress: string,
    address: string,
    amount: string,
    toAddress?: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .mint(toAddress || address, this.web3.utils.toWei(amount))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
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

    if ((await this.getDTPermissions(dtAddress, address)).minter !== true) {
      throw new Error(`Caller is not Minter`)
    }

    const capAvailble = await this.getCap(dtAddress)
    if (new Decimal(capAvailble).gte(amount)) {
      const estGas = await this.estGasMint(
        dtAddress,
        address,
        amount,
        toAddress,
        dtContract
      )

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
   * Estimate gas cost for addMinter method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} minter User which is going to be a Minter
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasAddMinter(
    dtAddress: string,
    address: string,
    minter: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

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
    return estGas
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
    const estGas = await this.estGasAddMinter(dtAddress, address, minter, dtContract)

    // Call addMinter function of the contract
    const trxReceipt = await dtContract.methods.addMinter(minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas for removeMinter method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} minter User which will be removed from Minter permission
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasRemoveMinter(
    dtAddress: string,
    address: string,
    minter: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

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

    return estGas
  }

  /**
   * Revoke Minter permission for an ERC20 datatoken
   * only ERC20Deployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} minter User which will be removed from Minter permission
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async removeMinter(
    dtAddress: string,
    address: string,
    minter: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    // should check ERC20Deployer role using erc721 level ..

    const estGas = await this.estGasRemoveMinter(dtAddress, address, minter, dtContract)

    // Call dtContract function of the contract
    const trxReceipt = await dtContract.methods.removeMinter(minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas for addFeeManager method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} feeManager User which is going to be a Minter
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasAddFeeManager(
    dtAddress: string,
    address: string,
    feeManager: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

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

    return estGas
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

    const estGas = await this.estGasAddFeeManager(
      dtAddress,
      address,
      feeManager,
      dtContract
    )

    // Call addFeeManager function of the contract
    const trxReceipt = await dtContract.methods.addFeeManager(feeManager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas for removeFeeManager method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} feeManager User which will be removed from FeeManager permission
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasRemoveFeeManager(
    dtAddress: string,
    address: string,
    feeManager: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .removeFeeManager(feeManager)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
    const estGas = await this.estGasRemoveFeeManager(
      dtAddress,
      address,
      feeManager,
      dtContract
    )

    // Call removeFeeManager function of the contract
    const trxReceipt = await dtContract.methods.removeFeeManager(feeManager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Estimate gas for setFeeCollector method
   * @param dtAddress datatoken address where we want to clean permissions address
   * @param address Caller address
   * @param feeCollector User to be set as new fee collector
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasSetFeeCollector(
    dtAddress: string,
    address: string,
    feeCollector: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .setFeeCollector(feeCollector)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Set a new fee Collector, if feeCollector is address(0), feeCollector is NFT Owner
   * only NFT owner can call
   * @param dtAddress datatoken address where we want to clean permissions address
   * @param address Caller address
   * @param feeCollector User to be set as new fee collector
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async setFeeCollector(
    dtAddress: string,
    address: string,
    feeCollector: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)
    if ((await this.getDTPermissions(dtAddress, address)).feeManager !== true) {
      throw new Error(`Caller is not Fee Manager`)
    }

    const estGas = await this.estGasSetFeeCollector(
      dtAddress,
      address,
      feeCollector,
      dtContract
    )

    // Call setFeeCollector method of the contract
    const trxReceipt = await dtContract.methods.setFeeCollector(feeCollector).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /** Get Fee Collector
   * @param dtAddress datatoken address
   * @return {Promise<string>}
   */
  public async getFeeCollector(dtAddress: string): Promise<string> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)
    const feeCollector = await dtContract.methods.getFeeCollector().call()
    return feeCollector
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
   * Estimate gas for transfer method
   * @param {String} dtAddress Datatoken address
   * @param {String} toAddress Receiver address
   * @param {String} amount Number of datatokens, as number. Expressed as wei
   * @param {String} address User adress
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasTransfer(
    dtAddress: string,
    toAddress: string,
    amount: string,
    address: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .transfer(toAddress, amount)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
      const estGas = await this.estGasTransfer(
        dtAddress,
        toAddress,
        amount,
        address,
        dtContract
      )
      // Call transfer function of the contract
      const trxReceipt = await dtContract.methods.transfer(toAddress, amount).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to transfer tokens: ${e.message}`)
      throw new Error(`Failed Failed to transfer tokens: ${e.message}`)
    }
  }

  /** Estimate gas cost for startOrder method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {String} consumer Consumer Address
   * @param {String} amount Amount of tokens that is going to be transfered
   * @param {Number} serviceId  Service index in the metadata
   * @param {String} mpFeeAddress Consume marketplace fee address
   * @param {String} feeToken address of the token marketplace wants to add fee on top
   * @param {String} feeAmount amount of feeToken to be transferred to mpFeeAddress on top, will be converted to WEI
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasStartOrder(
    dtAddress: string,
    address: string,
    consumer: string,
    amount: string,
    serviceId: number,
    mpFeeAddress: string,
    feeToken: string,
    feeAmount: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

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
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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
      const estGas = await this.estGasStartOrder(
        dtAddress,
        address,
        consumer,
        amount,
        serviceId,
        mpFeeAddress,
        feeToken,
        feeAmount,
        dtContract
      )

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
      LoggerInstance.error(`ERROR: Failed to start order : ${e.message}`)
      throw new Error(`Failed to start order: ${e.message}`)
    }
  }

  /** Estimate gas for setData method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} value Data to be stored into 725Y standard
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasSetData(
    dtAddress: string,
    address: string,
    value: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .setData(value)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
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

    const estGas = await this.estGasSetData(dtAddress, address, value, dtContract)

    // Call setData function of the contract
    const trxReceipt = await dtContract.methods.setData(value).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /** Estimate gas for cleanPermissions method
   * @param dtAddress Datatoken address where we want to clean permissions
   * @param address User adress
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasCleanPermissions(
    dtAddress: string,
    address: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance || new this.web3.eth.Contract(this.datatokensABI, dtAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await dtContract.methods
        .cleanPermissions()
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    return estGas
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

    const estGas = await this.estGasCleanPermissions(dtAddress, address, dtContract)

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
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dtAddress)
    const cap = await dtContract.methods.cap().call()
    return this.web3.utils.fromWei(cap)
  }

  /**
   * Get Address Balance for datatoken
   * @param {String} dtAddress Datatoken adress
   * @param {String} address user adress
   * @return {Promise<String>} balance  Number of datatokens. Will be converted from wei
   */
  public async balance(dataTokenAddress: string, address: string): Promise<string> {
    const dtContract = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const balance = await dtContract.methods.balanceOf(address).call()
    return this.web3.utils.fromWei(balance)
  }
}
