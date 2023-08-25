import { ethers, Signer } from 'ethers'
import Decimal from 'decimal.js'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import ERC20TemplateEnterprise from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20TemplateEnterprise.sol/ERC20TemplateEnterprise.json'
import { amountToUnits, sendTx, ZERO_ADDRESS } from '../utils'
import {
  AbiItem,
  ConsumeMarketFee,
  FreOrderParams,
  FreCreationParams,
  ProviderFees,
  PublishingMarketFee,
  DispenserParams,
  OrderParams,
  DatatokenRoles,
  ReceiptOrEstimate
} from '../@types'
import { Nft } from './NFT'
import { Config } from '../config'
import { SmartContract } from './SmartContract'

export class Datatoken extends SmartContract {
  public abiEnterprise: AbiItem[]
  public nft: Nft

  getDefaultAbi() {
    return ERC20Template.abi as AbiItem[]
  }

  /**
   * Instantiate Datatoken class
   * @param {Signer} signer The signer object.
   * @param {string | number} [network] Network id or name
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract
   * @param {AbiItem[]} abiEnterprise Enterprise ABI array of the smart contract
   */
  constructor(
    signer: Signer,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[],
    abiEnterprise?: AbiItem[]
  ) {
    super(signer, network, config, abi)
    this.abiEnterprise = abiEnterprise || (ERC20TemplateEnterprise.abi as AbiItem[])
    this.nft = new Nft(this.signer)
  }

  /**
   * Approves a spender to spend a certain amount of datatokens.
   * @param {String} dtAddress Datatoken address
   * @param {String} spender Spender address
   * @param {string} amount Number of datatokens, as number. Will be converted to wei
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async approve<G extends boolean = false>(
    dtAddress: string,
    spender: string,
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)

    const estGas = await dtContract.estimateGas.approve(
      spender,
      amountToUnits(null, null, amount, 18)
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.approve,
      spender,
      amountToUnits(null, null, amount, 18)
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Creates a new FixedRateExchange setup.
   * @param {String} dtAddress Datatoken address
   * @param {String} address Caller address
   * @param {FixedRateParams} fixedRateParams The parameters required to create a fixed-rate exchange contract.
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async createFixedRate<G extends boolean = false>(
    dtAddress: string,
    address: string,
    fixedRateParams: FreCreationParams,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }
    if (!fixedRateParams.allowedConsumer) fixedRateParams.allowedConsumer = ZERO_ADDRESS

    const withMint = fixedRateParams.withMint === false ? 0 : 1

    // should check DatatokenDeployer role using NFT level ..

    const estGas = await dtContract.estimateGas.createFixedRate(
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
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.createFixedRate,
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
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Creates a new Dispenser
   * @param {String} dtAddress Datatoken address
   * @param {String} address Caller address
   * @param {String} dispenserAddress Dispenser contract address
   * @param {DispenserParams} dispenserParams The parameters required to create a dispenser contract.
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async createDispenser<G extends boolean = false>(
    dtAddress: string,
    address: string,
    dispenserAddress: string,
    dispenserParams: DispenserParams,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)

    if (!dispenserParams.allowedSwapper) dispenserParams.allowedSwapper = ZERO_ADDRESS

    dispenserParams.withMint = dispenserParams.withMint !== false

    // should check DatatokenDeployer role using NFT level ..

    const estGas = await dtContract.estimateGas.createDispenser(
      dispenserAddress,
      dispenserParams.maxTokens,
      dispenserParams.maxBalance,
      dispenserParams.withMint,
      dispenserParams.allowedSwapper
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.createDispenser,
      dispenserAddress,
      dispenserParams.maxTokens,
      dispenserParams.maxBalance,
      dispenserParams.withMint,
      dispenserParams.allowedSwapper
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Mints datatokens
   * @param {String} dtAddress Datatoken address
   * @param {String} address Minter address
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} toAddress only if toAddress is different from the minter
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async mint<G extends boolean = false>(
    dtAddress: string,
    address: string,
    amount: string,
    toAddress?: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)

    if ((await this.getPermissions(dtAddress, address)).minter !== true) {
      throw new Error(`Caller is not Minter`)
    }

    const capAvailble = await this.getCap(dtAddress)
    if (new Decimal(capAvailble).gte(amount)) {
      const estGas = await dtContract.estimateGas.mint(
        toAddress || address,
        amountToUnits(null, null, amount, 18)
      )
      if (estimateGas) return <ReceiptOrEstimate<G>>estGas

      const trxReceipt = await sendTx(
        estGas,
        this.signer,
        this.config?.gasFeeMultiplier,
        dtContract.mint,
        toAddress || address,
        amountToUnits(null, null, amount, 18)
      )
      return <ReceiptOrEstimate<G>>trxReceipt
    } else {
      throw new Error(`Mint amount exceeds cap available`)
    }
  }

  /**
   * Add Minter for an ERC20 Datatoken
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address caller address
   * @param {String} minter address which is going to be a Minter
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async addMinter<G extends boolean = false>(
    dtAddress: string,
    address: string,
    minter: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)

    if ((await this.isDatatokenDeployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not DatatokenDeployer`)
    }
    // Estimate gas cost for addMinter method
    const estGas = await dtContract.estimateGas.addMinter(minter)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.addMinter,
      minter
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Revoke Minter permission for an ERC20 Datatoken
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address caller address
   * @param {String} minter address which will have removed the Minter permission
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async removeMinter<G extends boolean = false>(
    dtAddress: string,
    address: string,
    minter: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)

    if ((await this.isDatatokenDeployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not DatatokenDeployer`)
    }

    const estGas = await dtContract.estimateGas.removeMinter(minter)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.removeMinter,
      minter
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   *  Adds a payment manager on a datatoken to a desired address.(can set who's going to collect fee when consuming orders)
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address Caller address
   * @param {String} paymentManager  The address of the payment manager
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async addPaymentManager<G extends boolean = false>(
    dtAddress: string,
    address: string,
    paymentManager: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)

    if ((await this.isDatatokenDeployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not DatatokenDeployer`)
    }

    const estGas = await dtContract.estimateGas.addPaymentManager(paymentManager)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.addPaymentManager,
      paymentManager
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Revoke paymentManager permission for an ERC20 Datatoken
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} paymentManager User which will be removed from paymentManager permission
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async removePaymentManager<G extends boolean = false>(
    dtAddress: string,
    address: string,
    paymentManager: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)

    if ((await this.isDatatokenDeployer(dtAddress, address)) !== true) {
      throw new Error(`Caller is not DatatokenDeployer`)
    }

    const estGas = await dtContract.estimateGas.removePaymentManager(paymentManager)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.removePaymentManager,
      paymentManager
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * This function allows to set a new PaymentCollector (receives DT when consuming)
   * If not set the paymentCollector is the NFT Owner
   * only NFT owner can call
   * @param dtAddress Datatoken address
   * @param address Caller address
   * @param paymentCollector User to be set as new payment collector
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} trxReceipt
   */
  public async setPaymentCollector<G extends boolean = false>(
    dtAddress: string,
    address: string,
    paymentCollector: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
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

    const estGas = await dtContract.estimateGas.setPaymentCollector(paymentCollector)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.setPaymentCollector,
      paymentCollector
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * getPaymentCollector - It returns the current paymentCollector
   * @param dtAddress datatoken address
   * @return {Promise<string>}
   */
  public async getPaymentCollector(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
    const paymentCollector = await dtContract.getPaymentCollector()
    return paymentCollector
  }

  /**
   * Transfer tokens(as number) from address to toAddress
   * @param {String} dtAddress Datatoken address
   * @param {String} toAddress Receiver address
   * @param {String} amount Number of datatokens, as number. Will be converted to wei.
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async transfer<G extends boolean = false>(
    dtAddress: string,
    toAddress: string,
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    return this.transferWei(
      dtAddress,
      toAddress,
      await amountToUnits(null, null, amount, 18),
      estimateGas
    )
  }

  /**
   * Transfer in wei from address to toAddress
   * @param {String} dtAddress Datatoken address
   * @param {String} toAddress Receiver address
   * @param {String} amount Number of datatokens (number) expressed as wei
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async transferWei<G extends boolean = false>(
    dtAddress: string,
    toAddress: string,
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)

    const estGas = await dtContract.estimateGas.transfer(toAddress, amount)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.transfer,
      toAddress,
      amount
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Start Order: called by payer or consumer prior ordering a service consume on a marketplace.
   * @param {String} dtAddress Datatoken address
   * @param {String} consumer Consumer Address
   * @param {Number} serviceIndex  Service index in the metadata
   * @param {providerFees} providerFees provider fees
   * @param {consumeMarketFee} ConsumeMarketFee consume market fees
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} string
   */
  public async startOrder<G extends boolean = false>(
    dtAddress: string,
    consumer: string,
    serviceIndex: number,
    providerFees: ProviderFees,
    consumeMarketFee?: ConsumeMarketFee,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)
    if (!consumeMarketFee) {
      consumeMarketFee = {
        consumeMarketFeeAddress: ZERO_ADDRESS,
        consumeMarketFeeToken: ZERO_ADDRESS,
        consumeMarketFeeAmount: '0'
      }
    }

    const estGas = await dtContract.estimateGas.startOrder(
      consumer,
      serviceIndex,
      providerFees,
      consumeMarketFee
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.startOrder,
      consumer,
      serviceIndex,
      providerFees,
      consumeMarketFee
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Reuse Order: called by payer or consumer having a valid order, but with expired provider access.
   * Pays the provider fee again, but it will not require a new datatoken payment
   * Requires previous approval of provider fee.
   * @param {String} dtAddress Datatoken address
   * @param {String} orderTxId previous valid order
   * @param {providerFees} providerFees provider fees
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} string
   */
  public async reuseOrder<G extends boolean = false>(
    dtAddress: string,
    orderTxId: string,
    providerFees: ProviderFees,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress)

    const estGas = await dtContract.estimateGas.reuseOrder(orderTxId, providerFees)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.reuseOrder,
      orderTxId,
      providerFees
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Buys 1 DT from the FRE and then startsOrder, while burning that DT
   * @param {String} dtAddress Datatoken address
   * @param {OrderParams} orderParams  The parameters required to place an order.
   * @param {FreParams} freParams The parameters required to buy from a fixed-rate exchange.
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async buyFromFreAndOrder<G extends boolean = false>(
    dtAddress: string,
    orderParams: OrderParams,
    freParams: FreOrderParams,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress, this.abiEnterprise)

    const freContractParams = await this.getFreOrderParams(freParams)

    const estGas = await dtContract.estimateGas.buyFromFreAndOrder(
      orderParams,
      freContractParams
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.buyFromFreAndOrder,
      orderParams,
      freContractParams
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Gets 1 DT from dispenser and then startsOrder, while burning that DT
   * @param {String} dtAddress Datatoken address
   * @param {OrderParams} orderParams - The parameters required to place an order.
   * @param {String} dispenserContract  dispenser address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>}
   */
  public async buyFromDispenserAndOrder<G extends boolean = false>(
    dtAddress: string,
    orderParams: OrderParams,
    dispenserContract: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(dtAddress, this.abiEnterprise)

    const estGas = await dtContract.estimateGas.buyFromDispenserAndOrder(
      orderParams,
      dispenserContract
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.buyFromDispenserAndOrder,
      orderParams,
      dispenserContract
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /** setData
   * This function allows to store data with a preset key (keccak256(dtAddress)) into NFT 725 Store
   * only DatatokenDeployer can succeed
   * @param {String} dtAddress Datatoken address
   * @param {String} address User address
   * @param {String} value Data to be stored into 725Y standard
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async setData<G extends boolean = false>(
    dtAddress: string,
    address: string,
    value: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if (!(await this.isDatatokenDeployer(dtAddress, address))) {
      throw new Error(`User is not Datatoken Deployer`)
    }

    const dtContract = this.getContract(dtAddress)

    const valueHex = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(value))

    const estGas = await dtContract.estimateGas.setData(valueHex)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.setData,
      valueHex
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Clean Datatoken level Permissions (minters, paymentManager and reset the paymentCollector) for an ERC20 Datatoken
   * Only NFT Owner (at 721 level) can call it.
   * @param {string} dtAddress Datatoken address where we want to clean permissions
   * @param {string} address User adress
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} transactionId
   */
  public async cleanPermissions<G extends boolean = false>(
    dtAddress: string,
    address: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    if ((await this.nft.getNftOwner(await this.getNFTAddress(dtAddress))) !== address) {
      throw new Error('Caller is NOT Nft Owner')
    }
    const dtContract = this.getContract(dtAddress)

    const estGas = await dtContract.estimateGas.cleanPermissions()
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.cleanPermissions
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Returns ERC20 Datatoken user's permissions for a datatoken
   * @param {String} dtAddress Datatoken adress
   * @param {String} address user adress
   * @return {Promise<DatatokenRoles>}
   */
  public async getPermissions(
    dtAddress: string,
    address: string
  ): Promise<DatatokenRoles> {
    const dtContract = this.getContract(dtAddress)
    const roles = await dtContract.permissions(address)
    return roles
  }

  /**
   * Returns the Datatoken cap
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<string>}
   */
  public async getCap(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
    const cap = await dtContract.cap()
    return await this.unitsToAmount(null, cap, 18)
  }

  /**
   * It returns the token decimals, how many supported decimal points
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getDecimals(dtAddress: string): Promise<number> {
    const dtContract = this.getContract(dtAddress)
    const decimals = await dtContract.decimals()
    return decimals
  }

  /**
   * It returns the token template index.
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getId(dtAddress: string): Promise<number> {
    const dtContract = this.getContract(dtAddress)
    const id = await dtContract.getId()
    return id
  }

  /**
   * It returns the token symbol
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getSymbol(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
    const symbol = await dtContract.symbol()
    return symbol
  }

  /**
   *  It returns the name of the token
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getName(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
    const name = await dtContract.name()
    return name
  }

  /**
   * It returns the token decimals, how many supported decimal points
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getNFTAddress(dtAddress: string): Promise<string> {
    const dtContract = this.getContract(dtAddress)
    const nftAddress = await dtContract.getERC721Address()
    return nftAddress
  }

  /**
   * It returns the list of fixedRateExchanges created for this datatoken.
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getFixedRates(dtAddress: string): Promise<any[]> {
    const dtContract = this.getContract(dtAddress)
    const fixedRates = await dtContract.getFixedRates()
    return fixedRates
  }

  /**
   * It returns the list of dispensers created for this datatoken.
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<number>}
   */
  public async getDispensers(dtAddress: string): Promise<any[]> {
    const dtContract = this.getContract(dtAddress)
    const dispensers = await dtContract.getDispensers()
    return dispensers
  }

  /**
   *  Returns true if address has deployERC20 role
   * @param {String} dtAddress Datatoken adress
   * @param {String} dtAddress Datatoken adress
   * @return {Promise<boolean>}
   */
  public async isDatatokenDeployer(dtAddress: string, address: string): Promise<boolean> {
    const dtContract = this.getContract(dtAddress)
    const isDatatokenDeployer = await dtContract.isERC20Deployer(address)
    return isDatatokenDeployer
  }

  /**
   * Get Address Balance for datatoken
   * @param {String} dtAddress Datatoken adress
   * @param {String} address user adress
   * @return {Promise<String>} balance  Number of datatokens. Will be converted from wei
   */
  public async balance(datatokenAddress: string, address: string): Promise<string> {
    const dtContract = this.getContract(datatokenAddress)
    const balance = await dtContract.balanceOf(address)
    return await this.unitsToAmount(null, balance, 18)
  }

  /**
   * Allows to set the fee required by the publisherMarket
   * only publishMarketFeeAddress can call it
   * @param {string} datatokenAddress Datatoken adress
   * @param {string} publishMarketFeeAddress  new publish Market Fee Address
   * @param {string} publishMarketFeeToken new publish Market Fee Token
   * @param {string} publishMarketFeeAmount new fee amount
   * @param {String} address user adress
   * @param {Boolean} estimateGas if True, return gas estimate
   */
  public async setPublishingMarketFee<G extends boolean = false>(
    datatokenAddress: string,
    publishMarketFeeAddress: string,
    publishMarketFeeToken: string,
    publishMarketFeeAmount: string,
    address: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const dtContract = this.getContract(datatokenAddress)
    const mktFeeAddress = (await dtContract.getPublishingMarketFee())[0]
    if (mktFeeAddress !== address) {
      throw new Error(`Caller is not the Publishing Market Fee Address`)
    }
    const estGas = await dtContract.estimateGas.setPublishingMarketFee(
      publishMarketFeeAddress,
      publishMarketFeeToken,
      publishMarketFeeAmount
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.signer,
      this.config?.gasFeeMultiplier,
      dtContract.setPublishingMarketFee,
      publishMarketFeeAddress,
      publishMarketFeeToken,
      publishMarketFeeAmount
    )

    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Returns the current fee set by the publishing market
   * @param {String} datatokenAddress Datatoken adress
   * @return {Promise<PublishingMarketFee>} Current fee set by the publishing market
   */
  public async getPublishingMarketFee(
    datatokenAddress: string
  ): Promise<PublishingMarketFee> {
    const dtContract = this.getContract(datatokenAddress)

    const publishingMarketFee = await dtContract.getPublishingMarketFee()
    const returnValues = {
      publishMarketFeeAddress: publishingMarketFee[0],
      publishMarketFeeToken: publishingMarketFee[1],
      publishMarketFeeAmount: publishingMarketFee[2].toString()
    }
    return returnValues
  }

  private async getFreOrderParams(freParams: FreOrderParams): Promise<any> {
    return {
      exchangeContract: freParams.exchangeContract,
      exchangeId: freParams.exchangeId,
      maxBaseTokenAmount: await amountToUnits(
        this.signer,
        freParams.baseTokenAddress,
        freParams.maxBaseTokenAmount,
        freParams.baseTokenDecimals
      ),
      swapMarketFee: await amountToUnits(
        this.signer,
        freParams.baseTokenAddress,
        freParams.swapMarketFee,
        freParams.baseTokenDecimals
      ),

      marketFeeAddress: freParams.marketFeeAddress
    }
  }
}
