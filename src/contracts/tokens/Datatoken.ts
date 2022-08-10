import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import Decimal from 'decimal.js'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import ERC20TemplateEnterprise from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20TemplateEnterprise.sol/ERC20TemplateEnterprise.json'
import { calculateEstimatedGas, sendTx, ZERO_ADDRESS } from '../../utils'
import {
  ConsumeMarketFee,
  FreOrderParams,
  FreCreationParams,
  ProviderFees,
  PublishingMarketFee,
  DispenserParams,
  OrderParams,
  DatatokenRoles
} from '../../@types'
import { Nft } from './NFT'
import { Config } from '../../config'
import { SmartContract } from '..'

export class Datatoken extends SmartContract {
  public abiEnterprise: AbiItem | AbiItem[]
  public nft: Nft

  getDefaultAbi(): AbiItem | AbiItem[] {
    return ERC20Template.abi as AbiItem[]
  }

  /**
   * Instantiate ERC20 Datatokens
   * @param {AbiItem | AbiItem[]} datatokensAbi
   * @param {Web3} web3
   */
  constructor(
    web3: Web3,
    network?: string | number,
    config?: Config,
    abi?: AbiItem | AbiItem[],
    abiEnterprise?: AbiItem | AbiItem[]
  ) {
    super(web3, network, config, abi)
    this.abiEnterprise = abiEnterprise || (ERC20TemplateEnterprise.abi as AbiItem[])
    this.nft = new Nft(this.web3)
  }

  /**
   * Approve
   * @param {String} dtAddress Datatoken address
   * @param {String} spender Spender address
   * @param {string} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address User adress
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async approve<G extends boolean = false>(
    dtAddress: string,
    spender: string,
    amount: string,
    address: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.approve,
      spender,
      this.web3.utils.toWei(amount)
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.approve,
      spender,
      this.web3.utils.toWei(amount)
    )
    return trxReceipt
  }

  /**
   * Creates a new FixedRateExchange setup.
   * @param {String} dtAddress Datatoken address
   * @param {String} address Caller address
   * @param {String} fixedPriceAddress
   * @param {FixedRateParams} fixedRateParams
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async createFixedRate<G extends boolean = false>(
    dtAddress: string,
    address: string,
    fixedRateParams: FreCreationParams,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }
    if (!fixedRateParams.allowedConsumer) fixedRateParams.allowedConsumer = ZERO_ADDRESS

    const withMint = fixedRateParams.withMint ? 1 : 0

    // should check DatatokenDeployer role using NFT level ..

    const estGas = await calculateEstimatedGas(
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
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
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
    return trxReceipt
  }

  /**
   * Creates a new Dispenser
   * @param {String} dtAddress Datatoken address
   * @param {String} address Caller address
   * @param {String} dispenserAddress ispenser contract address
   * @param {String} dispenserParams
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async createDispenser<G extends boolean = false>(
    dtAddress: string,
    address: string,
    dispenserAddress: string,
    dispenserParams: DispenserParams,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)

    if (!dispenserParams.allowedSwapper) dispenserParams.allowedSwapper = ZERO_ADDRESS

    if (!dispenserParams.withMint) dispenserParams.withMint = false

    // should check DatatokenDeployer role using NFT level ..

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.createDispenser,
      dispenserAddress,
      dispenserParams.maxTokens,
      dispenserParams.maxBalance,
      dispenserParams.withMint,
      dispenserParams.allowedSwapper
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.createDispenser,
      dispenserAddress,
      dispenserParams.maxTokens,
      dispenserParams.maxBalance,
      dispenserParams.withMint,
      dispenserParams.allowedSwapper
    )
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
  public async mint<G extends boolean = false>(
    dtAddress: string,
    address: string,
    amount: string,
    toAddress?: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)

    if ((await this.getPermissions(dtAddress, address)).minter !== true) {
      throw new Error(`Caller is not Minter`)
    }

    const capAvailble = await this.getCap(dtAddress)
    if (new Decimal(capAvailble).gte(amount)) {
      const estGas = await calculateEstimatedGas(
        address,
        dtContract.methods.mint,
        toAddress || address,
        this.web3.utils.toWei(amount)
      )
      if (estimateGas) return estGas

      const trxReceipt = await sendTx(
        address,
        estGas + 1,
        this.web3,
        dtContract.methods.mint,
        toAddress || address,
        this.web3.utils.toWei(amount)
      )
      return trxReceipt
    } else {
      throw new Error(`Mint amount exceeds cap available`)
    }
  }

  /**
   * Add Minter for an ERC20 Datatoken
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} minter User which is going to be a Minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async addMinter<G extends boolean = false>(
    dtAddress: string,
    address: string,
    minter: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)

    if ((await this.isDatatokenDeployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not DatatokenDeployer`)
    }
    // Estimate gas cost for addMinter method
    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.addMinter,
      minter
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.addMinter,
      minter
    )

    return trxReceipt
  }

  /**
   * Revoke Minter permission for an ERC20 Datatoken
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} minter User which will be removed from Minter permission
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<any>}
   */
  public async removeMinter<G extends boolean = false>(
    dtAddress: string,
    address: string,
    minter: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)

    if ((await this.isDatatokenDeployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not DatatokenDeployer`)
    }

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.removeMinter,
      minter
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.removeMinter,
      minter
    )

    return trxReceipt
  }

  /**
   * Add addPaymentManager (can set who's going to collect fee when consuming orders)
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} paymentManager User which is going to be a Minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async addPaymentManager<G extends boolean = false>(
    dtAddress: string,
    address: string,
    paymentManager: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)

    if ((await this.isDatatokenDeployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not DatatokenDeployer`)
    }

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.addPaymentManager,
      paymentManager
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.addPaymentManager,
      paymentManager
    )

    return trxReceipt
  }

  /**
   * Revoke paymentManager permission for an ERC20 Datatoken
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} paymentManager User which will be removed from paymentManager permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removePaymentManager<G extends boolean = false>(
    dtAddress: string,
    address: string,
    paymentManager: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)

    if ((await this.isDatatokenDeployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not DatatokenDeployer`)
    }

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.removePaymentManager,
      paymentManager
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.removePaymentManager,
      paymentManager
    )

    return trxReceipt
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
  public async setPaymentCollector<G extends boolean = false>(
    dtAddress: string,
    address: string,
    paymentCollector: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)
    const isPaymentManager = (await this.getPermissions(dtAddress, address))
      .paymentManager
    const nftAddress = !isPaymentManager && (await this.getNFTAddress(dtAddress))
    const isNftOwner = nftAddress && (await this.nft.getNftOwner(nftAddress)) === address
    const nftPermissions =
      nftAddress && !isNftOwner && (await this.nft.getNftPermissions(nftAddress, address))
    const isDatatokenDeployer = nftPermissions?.deployERC20
    if (!isPaymentManager && !isNftOwner && !isDatatokenDeployer) {
      throw new Error(`Caller is not Fee Manager, owner or Datatoken Deployer`)
    }

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.setPaymentCollector,
      paymentCollector
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.setPaymentCollector,
      paymentCollector
    )
    return trxReceipt
  }

  /** getPaymentCollector - It returns the current paymentCollector
   * @param dtAddress datatoken address
   * @return {Promise<string>}
   */
  public async getPaymentCollector(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
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
   * Transfer in wei from address to toAddress
   * @param {String} dtAddress Datatoken address
   * @param {String} toAddress Receiver address
   * @param {String} amount Number of datatokens, as number. Expressed as wei
   * @param {String} address User adress
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async transferWei<G extends boolean = false>(
    dtAddress: string,
    toAddress: string,
    amount: string,
    address: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.transfer,
      toAddress,
      amount
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.transfer,
      toAddress,
      amount
    )
    return trxReceipt
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
  public async startOrder<G extends boolean = false>(
    dtAddress: string,
    address: string,
    consumer: string,
    serviceIndex: number,
    providerFees: ProviderFees,
    consumeMarketFee?: ConsumeMarketFee,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)
    if (!consumeMarketFee) {
      consumeMarketFee = {
        consumeMarketFeeAddress: ZERO_ADDRESS,
        consumeMarketFeeToken: ZERO_ADDRESS,
        consumeMarketFeeAmount: '0'
      }
    }

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.startOrder,
      consumer,
      serviceIndex,
      providerFees,
      consumeMarketFee
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.startOrder,
      consumer,
      serviceIndex,
      providerFees,
      consumeMarketFee
    )
    return trxReceipt
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
  public async reuseOrder<G extends boolean = false>(
    dtAddress: string,
    address: string,
    orderTxId: string,
    providerFees: ProviderFees,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress)

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.reuseOrder,
      orderTxId,
      providerFees
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.reuseOrder,
      orderTxId,
      providerFees
    )
    return trxReceipt
  }

  /** Buys 1 DT from the FRE and then startsOrder, while burning that DT
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {OrderParams} orderParams Consumer Address
   * @param {FreParams} freParams Amount of tokens that is going to be transfered
   * @return {Promise<TransactionReceipt>}
   */
  public async buyFromFreAndOrder<G extends boolean = false>(
    dtAddress: string,
    address: string,
    orderParams: OrderParams,
    freParams: FreOrderParams,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress, null, this.abiEnterprise)

    const freContractParams = this.getFreOrderParams(freParams)

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.buyFromFreAndOrder,
      orderParams,
      freContractParams
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.buyFromFreAndOrder,
      orderParams,
      freContractParams
    )
    return trxReceipt
  }

  /** Gets DT from dispenser and then startsOrder, while burning that DT
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address which calls
   * @param {OrderParams} orderParams
   * @param {String} dispenserContract
   * @return {Promise<TransactionReceipt>}
   */
  public async buyFromDispenserAndOrder<G extends boolean = false>(
    dtAddress: string,
    address: string,
    orderParams: OrderParams,
    dispenserContract: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(dtAddress, null, this.abiEnterprise)

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.buyFromDispenserAndOrder,
      orderParams,
      dispenserContract
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.buyFromDispenserAndOrder,
      orderParams,
      dispenserContract
    )
    return trxReceipt
  }

  /** setData
   * This function allows to store data with a preset key (keccak256(dtAddress)) into NFT 725 Store
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} value Data to be stored into 725Y standard
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async setData<G extends boolean = false>(
    dtAddress: string,
    address: string,
    value: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)

    const estGas = await calculateEstimatedGas(address, dtContract.methods.setData, value)
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.setData,
      value
    )

    return trxReceipt
  }

  /**
   * Clean Datatoken level Permissions (minters, paymentManager and reset the paymentCollector) for an ERC20 Datatoken
   * Only NFT Owner (at 721 level) can call it.
   * @param dtAddress Datatoken address where we want to clean permissions
   * @param address User adress
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async cleanPermissions<G extends boolean = false>(
    dtAddress: string,
    address: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    if ((await this.nft.getNftOwner(await this.getNFTAddress(dtAddress))) !== address) {
      throw new Error('Caller is NOT Nft Owner')
    }
    const dtContract = this.getContract(dtAddress)

    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.cleanPermissions
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.cleanPermissions
    )

    return trxReceipt
  }

  /** Returns ERC20 Datatoken user's permissions for a datatoken
   * @param {String} dtAddress Datatoken adress
   * @param {String} address user adress
   * @return {Promise<DatatokenRoles>}
   */
  public async getPermissions(
    dtAddress: string,
    address: string
  ): Promise<DatatokenRoles> {
    const dtContract = this.getContract(dtAddress)
    const roles = await dtContract.methods.permissions(address).call()
    return roles
  }

  /** Returns the Datatoken capital
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<string>}
   */
  public async getCap(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
    const cap = await dtContract.methods.cap().call()
    return this.web3.utils.fromWei(cap)
  }

  /** It returns the token decimals, how many supported decimal points
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getDecimals(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
    const decimals = await dtContract.methods.decimals().call()
    return decimals
  }

  /** It returns the token decimals, how many supported decimal points
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getNFTAddress(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
    const nftAddress = await dtContract.methods.getERC721Address().call()
    return nftAddress
  }

  /**  Returns true if address has deployERC20 role
   * @param {String} dtAddress Datatoken adress
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<boolean>}
   */
  public async isDatatokenDeployer(dtAddress: string, address: string): Promise<boolean> {
    const dtContract = this.getContract(dtAddress)
    const isDatatokenDeployer = await dtContract.methods.isERC20Deployer(address).call()
    return isDatatokenDeployer
  }

  /**
   * Get Address Balance for datatoken
   * @param {String} dtAddress Datatoken adress
   * @param {String} address user adress
   * @return {Promise<String>} balance  Number of datatokens. Will be converted from wei
   */
  public async balance(datatokenAddress: string, address: string): Promise<string> {
    const dtContract = this.getContract(datatokenAddress, address)
    const balance = await dtContract.methods.balanceOf(address).call()
    return this.web3.utils.fromWei(balance)
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
  public async setPublishingMarketFee<G extends boolean = false>(
    datatokenAddress: string,
    publishMarketFeeAddress: string,
    publishMarketFeeToken: string,
    publishMarketFeeAmount: string,
    address: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const dtContract = this.getContract(datatokenAddress, address)
    const mktFeeAddress = (await dtContract.methods.getPublishingMarketFee().call())[0]
    if (mktFeeAddress !== address) {
      throw new Error(`Caller is not the Publishing Market Fee Address`)
    }
    const estGas = await calculateEstimatedGas(
      address,
      dtContract.methods.setPublishingMarketFee,
      publishMarketFeeAddress,
      publishMarketFeeToken,
      publishMarketFeeAmount
    )
    if (estimateGas) return estGas

    const trxReceipt = await sendTx(
      address,
      estGas + 1,
      this.web3,
      dtContract.methods.setPublishingMarketFee,
      publishMarketFeeAddress,
      publishMarketFeeToken,
      publishMarketFeeAmount
    )

    return trxReceipt
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
    const dtContract = this.getContract(datatokenAddress, address)

    const publishingMarketFee = await dtContract.methods.getPublishingMarketFee().call()
    const returnValues = {
      publishMarketFeeAddress: publishingMarketFee[0],
      publishMarketFeeToken: publishingMarketFee[1],
      publishMarketFeeAmount: publishingMarketFee[2]
    }
    return returnValues
  }

  private getFreOrderParams(freParams: FreOrderParams): any {
    return {
      exchangeContract: freParams.exchangeContract,
      exchangeId: freParams.exchangeId,
      maxBaseTokenAmount: Web3.utils.toWei(freParams.maxBaseTokenAmount),
      swapMarketFee: Web3.utils.toWei(freParams.swapMarketFee),
      marketFeeAddress: freParams.marketFeeAddress
    }
  }
}
