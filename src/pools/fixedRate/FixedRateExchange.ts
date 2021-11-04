import defaultFixedRateExchangeABI from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import defaultERC20ABI from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import BigNumber from 'bignumber.js'
import { TransactionReceipt } from 'web3-core'
import { Contract, EventData } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'
import Web3 from 'web3'
import { Logger, getFairGasPrice } from '../../utils'

const MAX_AWAIT_PROMISES = 10

export interface FixedPriceExchange {
  exchangeID?: string
  exchangeOwner: string
  dataToken: string
  baseToken: string
  fixedRate: string
  active: boolean
  supply: string
}

export interface FixedPriceSwap {
  exchangeID: string
  caller: string
  baseTokenAmount: string
  dataTokenAmount: string
}

export enum FixedRateCreateProgressStep {
  CreatingExchange,
  ApprovingDatatoken
}

export class FixedRateExchange {
  public GASLIMIT_DEFAULT = 1000000
  /** Ocean related functions */
  public oceanAddress: string = null
  public fixedRateAddress:string
  public fixedRateExchangeABI: AbiItem | AbiItem[]
  public fixedRateContract:Contract
  public web3: Web3
  public contract: Contract = null
  private logger: Logger
  
  public startBlock: number
  public ssABI: AbiItem | AbiItem[]


 
  /**
   * Instantiate FixedRateExchange
   * @param {any} web3
   * @param {any} fixedRateExchangeABI
   */
  constructor(
    web3: Web3,
    logger: Logger,
    fixedRateAddress: string,
    fixedRateExchangeABI: AbiItem | AbiItem[] = null,
    oceanAddress: string = null,
    startBlock?: number
  ) {
    this.web3 = web3
    
    if (startBlock) this.startBlock = startBlock
    else this.startBlock = 0
    this.fixedRateExchangeABI =
      fixedRateExchangeABI || (defaultFixedRateExchangeABI.abi as AbiItem[])
    this.oceanAddress = oceanAddress
    this.fixedRateAddress = fixedRateAddress
    this.contract = new this.web3.eth.Contract(
      this.fixedRateExchangeABI,
      this.fixedRateAddress
    )
    
    this.logger = logger
  }
  async amountToUnits(token: string, amount: string): Promise<string> {
    let decimals = 18
    const tokenContract = new this.web3.eth.Contract(
      defaultERC20ABI.abi as AbiItem[],
      token
    )
    console.log('1')
    try {
      decimals = await tokenContract.methods.decimals().call()
    } catch (e) {
      this.logger.error('ERROR: FAILED TO CALL DECIMALS(), USING 18')
    }

    const amountFormatted = new BigNumber(parseInt(amount) * 10 ** decimals)

    return amountFormatted.toString()
  }

  async unitsToAmount(token: string, amount: string): Promise<string> {
    let decimals = 18
    const tokenContract = new this.web3.eth.Contract(
      defaultERC20ABI.abi as AbiItem[],
      token
    )
    try {
      decimals = await tokenContract.methods.decimals().call()
    } catch (e) {
      this.logger.error('ERROR: FAILED TO CALL DECIMALS(), USING 18')
    }

    const amountFormatted = new BigNumber(parseInt(amount) / 10 ** decimals)

    return amountFormatted.toString()
  }



  /**
   * Creates unique exchange identifier.
   * @param {String} dataToken Data Token Contract Address
   * @param {String} owner Owner of the exchange
   * @return {Promise<string>} exchangeId
   */
  public async generateExchangeId(dataToken: string, owner: string): Promise<string> {
    const exchangeId = await this.contract.methods
      .generateExchangeId(this.oceanAddress, dataToken, owner)
      .call()
    return exchangeId
  }
  /**
   * Estimate gas cost for buyDT
   * @param {String} account
   * @param {String} dtAmount datatoken amount we want to buy
   * @param {String} datatokenAddress datatokenAddress
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
   public async estBuyDT(
    account: string,
    datatokenAddress: string,
    dtAmount:string,
    maxBasetokenAmount: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate =
      contractInstance || this.fixedRateContract
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await fixedRate.methods
        .buyDT(datatokenAddress,dtAmount.toString(),maxBasetokenAmount.toString())
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }
  /**
   * Atomic swap
   * @param {String} exchangeId ExchangeId
   * @param {String} datatokenAmount Amount of Data Tokens
   * @param {String} maxBasetokenAmount max amount of basetoken we want to pay for dataTokenAmount
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async buyDT(
    address: string,
    exchangeId: string,
    datatokenAmount: string,
    maxBasetokenAmount:string
  ): Promise<TransactionReceipt> {
    const dtAmountFormatted = await this.amountToUnits(((await this.getExchange(exchangeId)).dataToken),datatokenAmount)
    const maxBtFormatted = await this.amountToUnits(((await this.getExchange(exchangeId)).baseToken),maxBasetokenAmount)
  
    const estGas = await this.estBuyDT(address,exchangeId,dtAmountFormatted,maxBtFormatted)
    try {
      const trxReceipt = await this.contract.methods
        .buyDT(exchangeId, dtAmountFormatted,maxBtFormatted)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } catch (e) {
      this.logger.error(`ERROR: Failed to buy datatokens: ${e.message}`)
      return null
    }
  }

  /**
   * Estimate gas cost for sellDT
   * @param {String} account
   * @param {String} dtAmount datatoken amount we want to sell
   * @param {String} datatokenAddress datatokenAddress
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
   public async estSellDT(
    account: string,
    datatokenAddress: string,
    dtAmount:string,
    maxBasetokenAmount: string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate =
      contractInstance || this.fixedRateContract
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await fixedRate.methods
        .sellDT(datatokenAddress,dtAmount,maxBasetokenAmount)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }
  /**
   * Atomic swap
   * @param {String} exchangeId ExchangeId
   * @param {String} datatokenAmount Amount of Data Tokens
   * @param {String} minBasetokenAmount min amount of basetoken we want to receive back
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async sellDT(
    address: string,
    exchangeId: string,
    datatokenAmount: string,
    minBasetokenAmount:string
  ): Promise<TransactionReceipt> {
    
    const dtAmountFormatted = await this.amountToUnits((await this.getExchange(exchangeId)).dataToken,datatokenAmount)
    const minBtFormatted = await this.amountToUnits((await this.getExchange(exchangeId)).baseToken,minBasetokenAmount)
    const estGas = await this.estBuyDT(address,exchangeId,dtAmountFormatted,minBtFormatted)
    try {
      const trxReceipt = await this.contract.methods
        .sellDT(exchangeId, dtAmountFormatted,minBtFormatted)
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } catch (e) {
      this.logger.error(`ERROR: Failed to sell datatokens: ${e.message}`)
      return null
    }
  }

  /**
   * Gets total number of exchanges
   * @param {String} exchangeId ExchangeId
   * @param {Number} dataTokenAmount Amount of Data Tokens
   * @return {Promise<Number>} no of available exchanges
   */
  public async getNumberOfExchanges(): Promise<number> {
    const numExchanges = await this.contract.methods.getNumberOfExchanges().call()
    return numExchanges
  }

  /**
   * Estimate gas cost for setRate
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {Number} newRate New rate
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
   public async estSetRate(
    account: string,
    exchangeId: string,
    newRate:string,
    contractInstance?: Contract
  ): Promise<number> {
    const fixedRate =
      contractInstance || this.fixedRateContract
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await fixedRate.methods
        .setRate(exchangeId,newRate)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Set new rate
   * @param {String} exchangeId ExchangeId
   * @param {Number} newRate New rate
   * @param {String} address User account
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async setRate(
    address: string,
    exchangeId: string,
    newRate: number,
    
  ): Promise<TransactionReceipt> {
 
    const estGas = await this.estSetRate(address,exchangeId,this.web3.utils.toWei(String(newRate)))
    const trxReceipt = await this.contract.methods
      .setRate(exchangeId, this.web3.utils.toWei(String(newRate)))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    return trxReceipt
  }

    /**
   * Estimate gas cost for activate
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
     public async estActivate(
      account: string,
      exchangeId: string,
      contractInstance?: Contract
    ): Promise<number> {
      const fixedRate =
        contractInstance || this.fixedRateContract
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      let estGas
      try {
        estGas = await fixedRate.methods
        .toggleExchangeState(exchangeId)
          .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
      } catch (e) {
        estGas = gasLimitDefault
      }
      return estGas
    }

  /**
   * Activate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async activate(
    address: string,
    exchangeId: string
  ): Promise<TransactionReceipt> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === true) return null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    
    const estGas = await this.estActivate(address,exchangeId)
    const trxReceipt = await this.contract.methods.toggleExchangeState(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })
    return trxReceipt
  }

      /**
   * Estimate gas cost for deactivate
   * @param {String} account
   * @param {String} exchangeId ExchangeId
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
       public async estDeactivate(
        account: string,
        exchangeId: string,
        contractInstance?: Contract
      ): Promise<number> {
        const fixedRate =
          contractInstance || this.fixedRateContract
        const gasLimitDefault = this.GASLIMIT_DEFAULT
        let estGas
        try {
          estGas = await fixedRate.methods
          .toggleExchangeState(exchangeId)
            .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
        } catch (e) {
          estGas = gasLimitDefault
        }
        return estGas
      }

      

  /**
   * Deactivate an exchange
   * @param {String} exchangeId ExchangeId
   * @param {String} address User address
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async deactivate(
    address: string,
    exchangeId: string
    
  ): Promise<TransactionReceipt> {
    const exchange = await this.getExchange(exchangeId)
    if (!exchange) return null
    if (exchange.active === false) return null
   
    const estGas = await this.estDeactivate(address,exchangeId)
    const trxReceipt = await this.contract.methods.toggleExchangeState(exchangeId).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })
    return trxReceipt
  }

  /**
   * Get Rate
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>} Rate (converted from wei)
   */
  public async getRate(exchangeId: string): Promise<string> {
    const weiRate = await this.contract.methods.getRate(exchangeId).call()
    return this.web3.utils.fromWei(weiRate)
  }

  /**
   * Get Supply
   * @param {String} exchangeId ExchangeId
   * @return {Promise<string>} Rate (converted from wei)
   */
  public async getSupply(exchangeId: string): Promise<string> {
    const weiRate = await this.contract.methods.getSupply(exchangeId).call()
    return this.web3.utils.fromWei(weiRate)
  }

  /**
   * getOceanNeeded
   * @param {String} exchangeId ExchangeId
   * @param {Number} dataTokenAmount Amount of Data Tokens
   * @return {Promise<string>} Ocean amount needed
   */
  public async getOceanNeeded(
    exchangeId: string,
    dataTokenAmount: string
  ): Promise<string> {
    const weiRate = await this.contract.methods
      .calcBaseInGivenOutDT(exchangeId, this.web3.utils.toWei(dataTokenAmount))
      .call()
    return this.web3.utils.fromWei(weiRate)
  }

  /**
   * Get exchange details
   * @param {String} exchangeId ExchangeId
   * @return {Promise<FixedPricedExchange>} Exchange details
   */
  public async getExchange(exchangeId: string): Promise<FixedPriceExchange> {
    const result: FixedPriceExchange = await this.contract.methods
      .getExchange(exchangeId)
      .call()
  //  result.fixedRate = this.web3.utils.fromWei(result.fixedRate)
  //  result.supply = this.web3.utils.fromWei(result.supply)
   // result.exchangeID = exchangeId
    return result
  }

  /**
   * Get all exchanges
   * @param {String} exchangeId ExchangeId
   * @return {Promise<String[]>} Exchanges list
   */
  public async getExchanges(): Promise<string[]> {
    return await this.contract.methods.getExchanges().call()
  }

  /**
   * Check if an exchange is active
   * @param {String} exchangeId ExchangeId
   * @return {Promise<Boolean>} Result
   */
  public async isActive(exchangeId: string): Promise<boolean> {
    const result = await this.contract.methods.isActive(exchangeId).call()
    return result
  }

  

 
}