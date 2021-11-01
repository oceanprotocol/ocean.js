import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import { Logger, getFairGasPrice } from '../../utils'
import BigNumber from 'bignumber.js'
import SideStakingTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import defaultPool from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import defaultERC20ABI from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Decimal from 'decimal.js'

const MaxUint256 =
  '115792089237316195423570985008687907853269984665640564039457584007913129639934'
/**
 * Provides an interface to Ocean friendly fork from Balancer BPool
 */
// TODO: Add decimals handling
export class SideStaking {
  public ssABI: AbiItem | AbiItem[]
  public web3: Web3
  public GASLIMIT_DEFAULT = 1000000
  private logger: Logger

  constructor(web3: Web3, logger: Logger, ssABI: AbiItem | AbiItem[] = null) {
    if (ssABI) this.ssABI = ssABI
    else this.ssABI = SideStakingTemplate.abi as AbiItem[]
    this.web3 = web3
    this.logger = logger
  }

  async amountToUnits(token: string, amount: string): Promise<string> {
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
   * Estimate gas cost for collectMarketFee
   * @param {String} account
   * @param {String} tokenAddress
   * @param {String} spender
   * @param {String} amount
   * @param {String} force
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estApprove(
    account: string,
    tokenAddress: string,
    spender: string,
    amount: string,
    contractInstance?: Contract
  ): Promise<number> {
    const tokenContract =
      contractInstance ||
      new this.web3.eth.Contract(defaultERC20ABI.abi as AbiItem[], tokenAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await tokenContract.methods
        .approve(spender, amount)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   * Get Alloance for both DataToken and Ocean
   * @param {String } tokenAdress
   * @param {String} owner
   * @param {String} spender
   */
  public async allowance(
    tokenAddress: string,
    owner: string,
    spender: string
  ): Promise<string> {
    const tokenAbi = defaultERC20ABI.abi as AbiItem[]
    const datatoken = new this.web3.eth.Contract(tokenAbi, tokenAddress)
    const trxReceipt = await datatoken.methods.allowance(owner, spender).call()

    return await this.unitsToAmount(tokenAddress, trxReceipt)
  }

  /**
   * Approve spender to spent amount tokens
   * @param {String} account
   * @param {String} tokenAddress
   * @param {String} spender
   * @param {String} amount  (always expressed as wei)
   * @param {String} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
   */
  async approve(
    account: string,
    tokenAddress: string,
    spender: string,
    amount: string,
    force = false
  ): Promise<TransactionReceipt | string> {
    const minABI = [
      {
        constant: false,
        inputs: [
          {
            name: '_spender',
            type: 'address'
          },
          {
            name: '_value',
            type: 'uint256'
          }
        ],
        name: 'approve',
        outputs: [
          {
            name: '',
            type: 'bool'
          }
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ] as AbiItem[]
    const token = new this.web3.eth.Contract(minABI, tokenAddress)
    if (!force) {
      const currentAllowence = await this.allowance(tokenAddress, account, spender)
      if (new Decimal(currentAllowence).greaterThanOrEqualTo(amount)) {
        return currentAllowence
      }
    }
    let result = null
    const amountFormatted = await this.amountToUnits(tokenAddress, amount)
    const estGas = await this.estApprove(account, tokenAddress, spender, amountFormatted)

    try {
      result = await token.methods
        .approve(spender, new BigNumber(await this.amountToUnits(tokenAddress, amount)))
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      this.logger.error(`ERRPR: Failed to approve spender to spend tokens : ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @return {String}
   */
  async getDataTokenCirculatingSupply(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods
        .getDataTokenCirculatingSupply(datatokenAddress)
        .call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @return {String}
   */
  async getPublisherAddress(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getPublisherAddress(datatokenAddress).call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getBasetoken(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getBaseToken(datatokenAddress).call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getPoolAddress(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getPoolAddress(datatokenAddress).call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getBasetokenBalance(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getBasetokenBalance(datatokenAddress).call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getDatatokenBalance(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getDatatokenBalance(datatokenAddress).call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getvestingEndBlock(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getvestingEndBlock(datatokenAddress).call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getvestingAmount(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getvestingAmount(datatokenAddress).call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getvestingLastBlock(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getvestingLastBlock(datatokenAddress).call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getvestingAmountSoFar(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getvestingAmountSoFar(datatokenAddress).call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @param {String} amount amount of DTs we want to Side Staking to stake
   * @return {String}
   */
  async canStake(
    ssAddress: string,
    datatokenAddress: string,
    amount: string
  ): Promise<boolean> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods
        .canStake(
          datatokenAddress,
          await this.getBasetoken(ssAddress, datatokenAddress),
          this.amountToUnits(datatokenAddress, amount)
        )
        .call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get if can stake DT: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @param {String} amount amount of LPT we want to Side Staking to unstake
   * @return {String}
   */
  async canUnStake(
    ssAddress: string,
    datatokenAddress: string,
    amount: string
  ): Promise<boolean> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods
        .canUnStake(
          datatokenAddress,
          await this.getBasetoken(ssAddress, datatokenAddress),
          this.amountToUnits(
            await this.getPoolAddress(ssAddress, datatokenAddress),
            amount
          )
        )
        .call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get if can stake DT: ${e.message}`)
    }
    return result
  }

  /**
   * Estimate gas cost for collectMarketFee
   * @param {String} account
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estGetVesting(
    account: string,
    ssAddress: string,
    datatokenAddress: string,
    contractInstance?: Contract
  ): Promise<number> {
    const sideStaking =
      contractInstance || new this.web3.eth.Contract(this.ssABI as AbiItem[], ssAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await sideStaking.methods
        .getVesting(datatokenAddress)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /**
   *
   * @param {String} account
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {TransactionReceipt}
   */
  async getVesting(
    account: string,
    ssAddress: string,
    datatokenAddress: string
  ): Promise<TransactionReceipt> {
    const sideStaking = new this.web3.eth.Contract(this.ssABI, ssAddress)
    let result = null

    const estGas = await this.estGetVesting(
      account,
      ssAddress,
      datatokenAddress,
      sideStaking
    )

    try {
      result = await sideStaking.methods.getVesting(datatokenAddress).send({
        from: account,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    } catch (e) {
      this.logger.error('ERROR: Failed to join swap pool amount out')
    }
    return result
  }
}
