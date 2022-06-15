import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import { Contract } from 'web3-eth-contract'
import Decimal from 'decimal.js'
import defaultDatatokensAbi from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import defaultDatatokensEnterpriseAbi from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20TemplateEnterprise.sol/ERC20TemplateEnterprise.json'
import {
  LoggerInstance,
  getFairGasPrice,
  setContractDefaults,
  getFreOrderParams,
  estimateGas,
  ZERO_ADDRESS,
  ConfigHelper
} from '../utils'
import {
  ConsumeMarketFee,
  FreOrderParams,
  FreCreationParams,
  ProviderFees,
  PublishingMarketFee
} from '../@types'
import { Nft } from './NFT'
import { Config } from '../models/index.js'

/**
 * ERC20 ROLES
 */
interface Roles {
  minter: boolean
  paymentManager: boolean
}

export interface OrderParams {
  consumer: string
  serviceIndex: number
  _providerFee: ProviderFees
  _consumeMarketFee: ConsumeMarketFee
}

export interface DispenserParams {
  maxTokens: string
  maxBalance: string
  withMint?: boolean // true if we want to allow the dispenser to be a minter
  allowedSwapper?: string // only account that can ask tokens. set address(0) if not required
}

export class Datatoken {
  public factoryAddress: string
  public factoryABI: AbiItem | AbiItem[]
  public datatokensAbi: AbiItem | AbiItem[]
  public datatokensEnterpriseAbi: AbiItem | AbiItem[]
  public web3: Web3
  public config: Config
  public nft: Nft

  /**
   * Instantiate ERC20 Datatokens
   * @param {AbiItem | AbiItem[]} datatokensAbi
   * @param {Web3} web3
   */
  constructor(
    web3: Web3,
    network?: string | number,
    datatokensAbi?: AbiItem | AbiItem[],
    datatokensEnterpriseAbi?: AbiItem | AbiItem[],
    config?: Config
  ) {
    this.web3 = web3
    this.datatokensAbi = datatokensAbi || (defaultDatatokensAbi.abi as AbiItem[])
    this.datatokensEnterpriseAbi =
      datatokensEnterpriseAbi || (defaultDatatokensEnterpriseAbi.abi as AbiItem[])
    this.config = config || new ConfigHelper().getConfig(network || 'unknown')
    this.nft = new Nft(this.web3)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(
      address,
      dtContract.methods.approve,
      spender,
      this.web3.utils.toWei(amount)
    )
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
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )

    const estGas = await estimateGas(
      address,
      dtContract.methods.approve,
      spender,
      this.web3.utils.toWei(amount)
    )

    // Call mint contract method
    const trxReceipt = await dtContract.methods
      .approve(spender, this.web3.utils.toWei(amount))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(
      address,
      dtContract.methods.mint,
      toAddress || address,
      this.web3.utils.toWei(amount)
    )
  }

  /**
   * Estimate gas cost for createFixedRate method
   * @param {String} dtAddress Datatoken address
   * @param {String} address Caller address
   * @param {String} fixedPriceAddress
   * @param {FixedRateParams} fixedRateParams
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasCreateFixedRate(
    dtAddress: string,
    address: string,
    fixedRateParams: FreCreationParams,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    if (!fixedRateParams.allowedConsumer) fixedRateParams.allowedConsumer = ZERO_ADDRESS
    const withMint = fixedRateParams.withMint ? 1 : 0

    return estimateGas(
      address,
      dtContract.methods.createFixedRate,
      fixedRateParams.fixedRateAddress,
      [
        fixedRateParams.baseTokenAddress,
        address,
        fixedRateParams.marketFeeCollector,
        fixedRateParams.allowedConsumer
      ],
      [
        fixedRateParams.baseTokenDecimals,
        fixedRateParams.datatokenDecimals,
        fixedRateParams.fixedRate,
        fixedRateParams.marketFee,
        withMint
      ]
    )
  }

  /**
   * Creates a new FixedRateExchange setup.
   * @param {String} dtAddress Datatoken address
   * @param {String} address Caller address
   * @param {String} fixedPriceAddress
   * @param {FixedRateParams} fixedRateParams
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async createFixedRate(
    dtAddress: string,
    address: string,
    fixedRateParams: FreCreationParams
  ): Promise<TransactionReceipt> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    if (!(await this.isERC20Deployer(dtAddress, address))) {
      throw new Error(`User is not ERC20 Deployer`)
    }
    if (!fixedRateParams.allowedConsumer) fixedRateParams.allowedConsumer = ZERO_ADDRESS

    const withMint = fixedRateParams.withMint ? 1 : 0

    // should check ERC20Deployer role using erc721 level ..

    const estGas = await estimateGas(
      address,
      dtContract.methods.createFixedRate,
      fixedRateParams.fixedRateAddress,
      [
        fixedRateParams.baseTokenAddress,
        fixedRateParams.owner,
        fixedRateParams.marketFeeCollector,
        fixedRateParams.allowedConsumer
      ],
      [
        fixedRateParams.baseTokenDecimals,
        fixedRateParams.datatokenDecimals,
        fixedRateParams.fixedRate,
        fixedRateParams.marketFee,
        withMint
      ]
    )

    // Call createFixedRate contract method
    const trxReceipt = await dtContract.methods
      .createFixedRate(
        fixedRateParams.fixedRateAddress,
        [
          fixedRateParams.baseTokenAddress,
          fixedRateParams.owner,
          fixedRateParams.marketFeeCollector,
          fixedRateParams.allowedConsumer
        ],
        [
          fixedRateParams.baseTokenDecimals,
          fixedRateParams.datatokenDecimals,
          fixedRateParams.fixedRate,
          fixedRateParams.marketFee,
          withMint
        ]
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    return trxReceipt
  }

  /**
   * Estimate gas cost for createDispenser method
   * @param {String} dtAddress Datatoken address
   * @param {String} address Caller address
   * @param {String} dispenserAddress ispenser contract address
   * @param {String} dispenserParams
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasCreateDispenser(
    dtAddress: string,
    address: string,
    dispenserAddress: string,
    dispenserParams: DispenserParams,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    if (!dispenserParams.allowedSwapper) dispenserParams.allowedSwapper = ZERO_ADDRESS

    if (!dispenserParams.withMint) dispenserParams.withMint = false

    return estimateGas(
      address,
      dtContract.methods.createDispenser,
      dispenserAddress,
      dispenserParams.maxTokens,
      dispenserParams.maxBalance,
      dispenserParams.withMint,
      dispenserParams.allowedSwapper
    )
  }

  /**
   * Creates a new Dispenser
   * @param {String} dtAddress Datatoken address
   * @param {String} address Caller address
   * @param {String} dispenserAddress ispenser contract address
   * @param {String} dispenserParams
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async createDispenser(
    dtAddress: string,
    address: string,
    dispenserAddress: string,
    dispenserParams: DispenserParams
  ): Promise<TransactionReceipt> {
    if (!(await this.isERC20Deployer(dtAddress, address))) {
      throw new Error(`User is not ERC20 Deployer`)
    }

    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )

    if (!dispenserParams.allowedSwapper) dispenserParams.allowedSwapper = ZERO_ADDRESS

    if (!dispenserParams.withMint) dispenserParams.withMint = false

    // should check ERC20Deployer role using erc721 level ..

    const estGas = await estimateGas(
      address,
      dtContract.methods.createDispenser,
      dispenserAddress,
      dispenserParams.maxTokens,
      dispenserParams.maxBalance,
      dispenserParams.withMint,
      dispenserParams.allowedSwapper
    )

    // Call createFixedRate contract method
    const trxReceipt = await dtContract.methods
      .createDispenser(
        dispenserAddress,
        dispenserParams.maxTokens,
        dispenserParams.maxBalance,
        dispenserParams.withMint,
        dispenserParams.allowedSwapper
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )

    if ((await this.getDTPermissions(dtAddress, address)).minter !== true) {
      throw new Error(`Caller is not Minter`)
    }

    const capAvailble = await this.getCap(dtAddress)
    if (new Decimal(capAvailble).gte(amount)) {
      const estGas = await estimateGas(
        address,
        dtContract.methods.mint,
        toAddress || address,
        this.web3.utils.toWei(amount)
      )

      // Call mint contract method
      const trxReceipt = await dtContract.methods
        .mint(toAddress || address, this.web3.utils.toWei(amount))
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(address, dtContract.methods.addMinter, minter)
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
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )

    if ((await this.isERC20Deployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not ERC20Deployer`)
    }
    // Estimate gas cost for addMinter method
    const estGas = await estimateGas(address, dtContract.methods.addMinter, minter)

    // Call addMinter function of the contract
    const trxReceipt = await dtContract.methods.addMinter(minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    // should check ERC20Deployer role using erc721 level ..

    return estimateGas(address, dtContract.methods.removeMinter, minter)
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
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )

    if ((await this.isERC20Deployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not ERC20Deployer`)
    }

    const estGas = await estimateGas(address, dtContract.methods.removeMinter, minter)

    // Call dtContract function of the contract
    const trxReceipt = await dtContract.methods.removeMinter(minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })

    return trxReceipt
  }

  /**
   * Estimate gas for addPaymentManager method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} paymentManager User which is going to be a Minter
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasAddPaymentManager(
    dtAddress: string,
    address: string,
    paymentManager: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(address, dtContract.methods.addPaymentManager, paymentManager)
  }

  /**
   * Add addPaymentManager (can set who's going to collect fee when consuming orders)
   * only ERC20Deployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} paymentManager User which is going to be a Minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async addPaymentManager(
    dtAddress: string,
    address: string,
    paymentManager: string
  ): Promise<TransactionReceipt> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )

    if ((await this.isERC20Deployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not ERC20Deployer`)
    }

    const estGas = await estimateGas(
      address,
      dtContract.methods.addPaymentManager,
      paymentManager
    )

    // Call addPaymentManager function of the contract
    const trxReceipt = await dtContract.methods.addPaymentManager(paymentManager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })

    return trxReceipt
  }

  /**
   * Estimate gas for removePaymentManager method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} paymentManager User which will be removed from paymentManager permission
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasRemovePaymentManager(
    dtAddress: string,
    address: string,
    paymentManager: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(address, dtContract.methods.removePaymentManager, paymentManager)
  }

  /**
   * Revoke paymentManager permission for an ERC20 datatoken
   * only ERC20Deployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} paymentManager User which will be removed from paymentManager permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removePaymentManager(
    dtAddress: string,
    address: string,
    paymentManager: string
  ): Promise<TransactionReceipt> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )

    if ((await this.isERC20Deployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not ERC20Deployer`)
    }

    const estGas = await estimateGas(
      address,
      dtContract.methods.removePaymentManager,
      paymentManager
    )

    // Call removeFeeManager function of the contract
    const trxReceipt = await dtContract.methods
      .removePaymentManager(paymentManager)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /**
   * Estimate gas for setPaymentCollector method
   * @param dtAddress datatoken address
   * @param address Caller address
   * @param paymentCollector User to be set as new payment collector
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasSetPaymentCollector(
    dtAddress: string,
    address: string,
    paymentCollector: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(address, dtContract.methods.setPaymentCollector, paymentCollector)
  }

  /**
   * This function allows to set a new PaymentCollector (receives DT when consuming)
   * If not set the paymentCollector is the NFT Owner
   * only NFT owner can call
   * @param dtAddress datatoken address
   * @param address Caller address
   * @param paymentCollector User to be set as new payment collector
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async setPaymentCollector(
    dtAddress: string,
    address: string,
    paymentCollector: string
  ): Promise<TransactionReceipt> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    const isPaymentManager = (await this.getDTPermissions(dtAddress, address))
      .paymentManager
    const nftAddress = !isPaymentManager && (await this.getNFTAddress(dtAddress))
    const isNftOwner = nftAddress && (await this.nft.getNftOwner(nftAddress)) === address
    const nftPermissions =
      nftAddress && !isNftOwner && (await this.nft.getNftPermissions(nftAddress, address))
    const isErc20Deployer = nftPermissions?.deployERC20
    if (!isPaymentManager && !isNftOwner && !isErc20Deployer) {
      throw new Error(`Caller is not Fee Manager, owner or erc20 Deployer`)
    }

    const estGas = await estimateGas(
      address,
      dtContract.methods.setPaymentCollector,
      paymentCollector
    )

    // Call setFeeCollector method of the contract
    const trxReceipt = await dtContract.methods
      .setPaymentCollector(paymentCollector)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /** getPaymentCollector - It returns the current paymentCollector
   * @param dtAddress datatoken address
   * @return {Promise<string>}
   */
  public async getPaymentCollector(dtAddress: string): Promise<string> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    const paymentCollector = await dtContract.methods.getPaymentCollector().call()
    return paymentCollector
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(address, dtContract.methods.transfer, toAddress, amount)
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
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    try {
      const estGas = await estimateGas(
        address,
        dtContract.methods.transfer,
        toAddress,
        amount
      )
      // Call transfer function of the contract
      const trxReceipt = await dtContract.methods.transfer(toAddress, amount).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
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
   * @param {Number} serviceIndex  Service index in the metadata
   * @param {providerFees} providerFees provider fees
   * @param {consumeMarketFee} ConsumeMarketFee consume market fees
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasStartOrder(
    dtAddress: string,
    address: string,
    consumer: string,
    serviceIndex: number,
    providerFees: ProviderFees,
    consumeMarketFee?: ConsumeMarketFee,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(
      address,
      dtContract.methods.startOrder,
      consumer,
      serviceIndex,
      providerFees,
      consumeMarketFee
    )
  }

  /** Start Order: called by payer or consumer prior ordering a service consume on a marketplace.
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {String} consumer Consumer Address
   * @param {Number} serviceIndex  Service index in the metadata
   * @param {providerFees} providerFees provider fees
   * @param {consumeMarketFee} ConsumeMarketFee consume market fees
   * @return {Promise<TransactionReceipt>} string
   */
  public async startOrder(
    dtAddress: string,
    address: string,
    consumer: string,
    serviceIndex: number,
    providerFees: ProviderFees,
    consumeMarketFee?: ConsumeMarketFee
  ): Promise<TransactionReceipt> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    if (!consumeMarketFee) {
      consumeMarketFee = {
        consumeMarketFeeAddress: ZERO_ADDRESS,
        consumeMarketFeeToken: ZERO_ADDRESS,
        consumeMarketFeeAmount: '0'
      }
    }
    try {
      const estGas = await estimateGas(
        address,
        dtContract.methods.startOrder,
        consumer,
        serviceIndex,
        providerFees,
        consumeMarketFee
      )

      const trxReceipt = await dtContract.methods
        .startOrder(consumer, serviceIndex, providerFees, consumeMarketFee)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to start order : ${e.message}`)
      throw new Error(`Failed to start order: ${e.message}`)
    }
  }

  /** Estimate gas cost for reuseOrder method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {String} orderTxId previous valid order
   * @param {providerFees} providerFees provider fees
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasReuseOrder(
    dtAddress: string,
    address: string,
    orderTxId: string,
    providerFees: ProviderFees,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(address, dtContract.methods.reuseOrder, orderTxId, providerFees)
  }

  /** Reuse Order: called by payer or consumer having a valid order, but with expired provider access.
   * Pays the provider fee again, but it will not require a new datatoken payment
   * Requires previous approval of provider fee.
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {String} orderTxId previous valid order
   * @param {providerFees} providerFees provider fees
   * @return {Promise<TransactionReceipt>} string
   */
  public async reuseOrder(
    dtAddress: string,
    address: string,
    orderTxId: string,
    providerFees: ProviderFees
  ): Promise<TransactionReceipt> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    try {
      const estGas = await estimateGas(
        address,
        dtContract.methods.reuseOrder,
        orderTxId,
        providerFees
      )

      const trxReceipt = await dtContract.methods
        .reuseOrder(orderTxId, providerFees)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to call reuse order order : ${e.message}`)
      throw new Error(`Failed to start order: ${e.message}`)
    }
  }

  /** Estimate gas cost for buyFromFreAndOrder method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {OrderParams} orderParams Consumer Address
   * @param {FreParams} freParams Amount of tokens that is going to be transfered
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasBuyFromFreAndOrder(
    dtAddress: string,
    address: string,
    orderParams: OrderParams,
    freParams: FreOrderParams,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance ||
      new this.web3.eth.Contract(this.datatokensEnterpriseAbi, dtAddress)

    return estimateGas(
      address,
      dtContract.methods.buyFromFreAndOrder,
      orderParams,
      freParams
    )
  }

  /** Buys 1 DT from the FRE and then startsOrder, while burning that DT
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {OrderParams} orderParams Consumer Address
   * @param {FreParams} freParams Amount of tokens that is going to be transfered
   * @return {Promise<TransactionReceipt>}
   */
  public async buyFromFreAndOrder(
    dtAddress: string,
    address: string,
    orderParams: OrderParams,
    freParams: FreOrderParams
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensEnterpriseAbi, dtAddress)
    try {
      const freContractParams = getFreOrderParams(freParams)

      const estGas = await estimateGas(
        address,
        dtContract.methods.buyFromFreAndOrder,
        orderParams,
        freContractParams
      )

      const trxReceipt = await dtContract.methods
        .buyFromFreAndOrder(orderParams, freContractParams)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to buy DT From Fre And Order : ${e.message}`)
      throw new Error(`Failed to buy DT From Fre And Order: ${e.message}`)
    }
  }

  /** Estimate gas cost for buyFromFreAndOrder method
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {OrderParams} orderParams
   * @param {String} dispenserContract
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async estGasBuyFromDispenserAndOrder(
    dtAddress: string,
    address: string,
    orderParams: OrderParams,
    dispenserContract: string,
    contractInstance?: Contract
  ): Promise<any> {
    const dtContract =
      contractInstance ||
      new this.web3.eth.Contract(this.datatokensEnterpriseAbi, dtAddress)

    return estimateGas(
      address,
      dtContract.methods.buyFromDispenserAndOrder,
      orderParams,
      dispenserContract
    )
  }

  /** Gets DT from dispenser and then startsOrder, while burning that DT
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {OrderParams} orderParams
   * @param {String} dispenserContract
   * @return {Promise<TransactionReceipt>}
   */
  public async buyFromDispenserAndOrder(
    dtAddress: string,
    address: string,
    orderParams: OrderParams,
    dispenserContract: string
  ): Promise<TransactionReceipt> {
    const dtContract = new this.web3.eth.Contract(this.datatokensEnterpriseAbi, dtAddress)
    try {
      const estGas = await estimateGas(
        address,
        dtContract.methods.buyFromDispenserAndOrder,
        orderParams,
        dispenserContract
      )

      const trxReceipt = await dtContract.methods
        .buyFromDispenserAndOrder(orderParams, dispenserContract)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
        })
      return trxReceipt
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to buy DT From Fre And Order : ${e.message}`)
      throw new Error(`Failed to buy DT From Fre And Order: ${e.message}`)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(address, dtContract.methods.setData, value)
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
    if (!(await this.isERC20Deployer(dtAddress, address))) {
      throw new Error(`User is not ERC20 Deployer`)
    }

    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )

    const estGas = await estimateGas(address, dtContract.methods.setData, value)

    // Call setData function of the contract
    const trxReceipt = await dtContract.methods.setData(value).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
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
      contractInstance ||
      setContractDefaults(
        new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
        this.config
      )

    return estimateGas(address, dtContract.methods.cleanPermissions)
  }

  /**
   * Clean erc20level Permissions (minters, paymentManager and reset the paymentCollector) for an ERC20 datatoken
   * Only NFT Owner (at 721 level) can call it.
   * @param dtAddress Datatoken address where we want to clean permissions
   * @param address User adress
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async cleanPermissions(
    dtAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    if ((await this.nft.getNftOwner(await this.getNFTAddress(dtAddress))) !== address) {
      throw new Error('Caller is NOT Nft Owner')
    }
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )

    const estGas = await estimateGas(address, dtContract.methods.cleanPermissions)

    // Call cleanPermissions function of the contract
    const trxReceipt = await dtContract.methods.cleanPermissions().send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })

    return trxReceipt
  }

  /** Returns ERC20 user's permissions for a datatoken
   * @param {String} dtAddress Datatoken adress
   * @param {String} address user adress
   * @return {Promise<Roles>}
   */
  public async getDTPermissions(dtAddress: string, address: string): Promise<Roles> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    const roles = await dtContract.methods.permissions(address).call()
    return roles
  }

  /** Returns the Datatoken capital
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<string>}
   */
  public async getCap(dtAddress: string): Promise<string> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    const cap = await dtContract.methods.cap().call()
    return this.web3.utils.fromWei(cap)
  }

  /** It returns the token decimals, how many supported decimal points
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getDecimals(dtAddress: string): Promise<string> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    const decimals = await dtContract.methods.decimals().call()
    return decimals
  }

  /** It returns the token decimals, how many supported decimal points
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getNFTAddress(dtAddress: string): Promise<string> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    const nftAddress = await dtContract.methods.getERC721Address().call()
    return nftAddress
  }

  /**  Returns true if address has deployERC20 role
   * @param {String} dtAddress Datatoken adress
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<boolean>}
   */
  public async isERC20Deployer(dtAddress: string, address: string): Promise<boolean> {
    const dtContract = setContractDefaults(
      new this.web3.eth.Contract(this.datatokensAbi, dtAddress),
      this.config
    )
    const isERC20Deployer = await dtContract.methods.isERC20Deployer(address).call()
    return isERC20Deployer
  }

  /**
   * Get Address Balance for datatoken
   * @param {String} dtAddress Datatoken adress
   * @param {String} address user adress
   * @return {Promise<String>} balance  Number of datatokens. Will be converted from wei
   */
  public async balance(datatokenAddress: string, address: string): Promise<string> {
    const dtContract = new this.web3.eth.Contract(this.datatokensAbi, datatokenAddress, {
      from: address
    })
    const balance = await dtContract.methods.balanceOf(address).call()
    return this.web3.utils.fromWei(balance)
  }

  /**
   * @dev estGasSetPublishingMarketFee
   *      Estimating gas for publishMarketFeeAddress method
   * @param {string} datatokenAddress Datatoken adress
   * @param {string} publishMarketFeeAddress  new publish Market Fee Address
   * @param {string} publishMarketFeeToken new publish Market Fee Token
   * @param {string} publishMarketFeeAmount new fee amount
   * @param {String} address user adress
   */
  public async estGasSetPublishingMarketFee(
    datatokenAddress: string,
    publishMarketFeeAddress: string,
    publishMarketFeeToken: string,
    publishMarketFeeAmount: string,
    address: string
  ): Promise<number> {
    // Estimate gas cost for publishMarketFeeAddress method
    const dtContract = new this.web3.eth.Contract(this.datatokensAbi, datatokenAddress, {
      from: address
    })
    return estimateGas(
      address,
      dtContract.methods.setPublishingMarketFee,
      publishMarketFeeAddress,
      publishMarketFeeToken,
      publishMarketFeeAmount
    )
  }

  /**
   * @dev setPublishingMarketFee
   *      Only publishMarketFeeAddress can call it
   *      This function allows to set the fee required by the publisherMarket
   * @param {string} datatokenAddress Datatoken adress
   * @param {string} publishMarketFeeAddress  new publish Market Fee Address
   * @param {string} publishMarketFeeToken new publish Market Fee Token
   * @param {string} publishMarketFeeAmount new fee amount
   * @param {String} address user adress
   */
  public async setPublishingMarketFee(
    datatokenAddress: string,
    publishMarketFeeAddress: string,
    publishMarketFeeToken: string,
    publishMarketFeeAmount: string,
    address: string
  ) {
    const dtContract = new this.web3.eth.Contract(this.datatokensAbi, datatokenAddress, {
      from: address
    })
    const mktFeeAddress = (await dtContract.methods.getPublishingMarketFee().call())[0]
    if (mktFeeAddress !== address) {
      throw new Error(`Caller is not the Publishing Market Fee Address`)
    }
    const estGas = await this.estGasSetPublishingMarketFee(
      datatokenAddress,
      publishMarketFeeAddress,
      publishMarketFeeToken,
      publishMarketFeeAmount,
      address
    )
    await dtContract.methods
      .setPublishingMarketFee(
        publishMarketFeeAddress,
        publishMarketFeeToken,
        publishMarketFeeAmount
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
  }

  /**
   * @dev getPublishingMarketFee
   *      Get publishingMarket Fee
   *      This function allows to get the current fee set by the publishing market
   * @param {String} datatokenAddress Datatoken adress
   * @param {String} address user adress
   * @return {Promise<PublishingMarketFee>} Current fee set by the publishing market
   */
  public async getPublishingMarketFee(
    datatokenAddress: string,
    address: string
  ): Promise<PublishingMarketFee> {
    const dtContract = new this.web3.eth.Contract(this.datatokensAbi, datatokenAddress, {
      from: address
    })

    const publishingMarketFee = await dtContract.methods.getPublishingMarketFee().call()
    const returnValues = {
      publishMarketFeeAddress: publishingMarketFee[0],
      publishMarketFeeToken: publishingMarketFee[1],
      publishMarketFeeAmount: publishingMarketFee[2]
    }
    return returnValues
  }
}
