import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import { LoggerInstance, getFairGasPrice } from '../../utils'
import BigNumber from 'bignumber.js'
import SideStakingTemplate from '../../artifacts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import defaultErc20Abi from '../../artifacts/templates/ERC20Template.sol/ERC20Template.json'

export class SideStaking {
  public ssAbi: AbiItem | AbiItem[]
  public web3: Web3
  public GASLIMIT_DEFAULT = 1000000

  constructor(web3: Web3, ssAbi: AbiItem | AbiItem[] = null) {
    if (ssAbi) this.ssAbi = ssAbi
    else this.ssAbi = SideStakingTemplate.abi as AbiItem[]
    this.web3 = web3
  }

  async amountToUnits(token: string, amount: string): Promise<string> {
    let decimals = 18
    const tokenContract = new this.web3.eth.Contract(
      defaultErc20Abi.abi as AbiItem[],
      token
    )
    try {
      decimals = await tokenContract.methods.decimals().call()
    } catch (e) {
      LoggerInstance.error('ERROR: FAILED TO CALL DECIMALS(), USING 18')
    }

    const amountFormatted = new BigNumber(parseInt(amount) * 10 ** decimals)

    return amountFormatted.toString()
  }

  async unitsToAmount(token: string, amount: string): Promise<string> {
    let decimals = 18
    const tokenContract = new this.web3.eth.Contract(
      defaultErc20Abi.abi as AbiItem[],
      token
    )
    try {
      decimals = await tokenContract.methods.decimals().call()
    } catch (e) {
      LoggerInstance.error('ERROR: FAILED TO CALL DECIMALS(), USING 18')
    }

    const amountFormatted = new BigNumber(parseInt(amount) / 10 ** decimals)

    return amountFormatted.toString()
  }

  /**
   * Get (total vesting amount + token released from the contract when adding liquidity)
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatoken address
   * @return {String}
   */
  async getDataTokenCirculatingSupply(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods
        .getDataTokenCirculatingSupply(datatokenAddress)
        .call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result.toString()
  }

  /**
   * Get actual dts in circulation (vested token withdrawn from the contract +
         token released from the contract when adding liquidity)
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatoken address
   * @return {String}
   */
  async getDataTokenCurrentCirculatingSupply(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    try {
      const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
      let result = null
      result = await sideStaking.methods
        .getDataTokenCurrentCirculatingSupply(datatokenAddress)
        .call()
      return result.toString()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
  }

  /**
   * Get Publisher address
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatoken address
   * @return {String}
   */
  async getPublisherAddress(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getPublisherAddress(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getBaseToken(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getBaseTokenAddress(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get Pool Address
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getPoolAddress(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getPoolAddress(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get baseToken balance in the contract
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getBaseTokenBalance(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getBaseTokenBalance(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get dt balance in the staking contract available for being added as liquidity
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getDatatokenBalance(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getDataTokenBalance(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    result = await this.unitsToAmount(datatokenAddress, result)
    return result
  }

  /**
   * Get block when vesting ends
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String} end block for vesting amount
   */
  async getvestingEndBlock(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getvestingEndBlock(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get total amount vesting
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getvestingAmount(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getvestingAmount(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    result = await this.unitsToAmount(datatokenAddress, result)
    return result
  }

  /**
   * Get last block publisher got some vested tokens
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getvestingLastBlock(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getvestingLastBlock(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get how much has been taken from the vesting amount
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getvestingAmountSoFar(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.getvestingAmountSoFar(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    result = await this.unitsToAmount(datatokenAddress, result)
    return result
  }

  /**
   * Estimate gas cost for getVesting
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
      contractInstance || new this.web3.eth.Contract(this.ssAbi as AbiItem[], ssAddress)

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

  /** Send vested tokens available to the publisher address, can be called by anyone
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
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
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
      LoggerInstance.error('ERROR: Failed to join swap pool amount out')
    }
    return result
  }

  /**
   * Estimate gas cost for getVesting
   * @param {String} account
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @param {Contract} contractInstance optional contract instance
   * @return {Promise<number>}
   */
  public async estSetPoolSwapFee(
    account: string,
    ssAddress: string,
    datatokenAddress: string,
    poolAddress: string,
    swapFee: number,
    contractInstance?: Contract
  ): Promise<number> {
    const sideStaking =
      contractInstance || new this.web3.eth.Contract(this.ssAbi as AbiItem[], ssAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await sideStaking.methods
        .setPoolSwapFee(datatokenAddress, poolAddress, swapFee)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    return estGas
  }

  /** Send vested tokens available to the publisher address, can be called by anyone
   *
   * @param {String} account
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {TransactionReceipt}
   */
  async setPoolSwapFee(
    account: string,
    ssAddress: string,
    datatokenAddress: string,
    poolAddress: string,
    swapFee: number
  ): Promise<TransactionReceipt> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null

    const estGas = await this.estSetPoolSwapFee(
      account,
      ssAddress,
      datatokenAddress,
      poolAddress,
      swapFee,
      sideStaking
    )
    try {
      result = await sideStaking.methods
        .setPoolSwapFee(datatokenAddress, poolAddress, swapFee)
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      LoggerInstance.error('ERROR: Failed to join swap pool amount out')
    }
    return result
  }

  /**
   * Get Router address set in side staking contract
   * @param {String} ssAddress side staking contract address
   * @return {String}
   */
  async getRouter(ssAddress: string): Promise<string> {
    const sideStaking = new this.web3.eth.Contract(this.ssAbi, ssAddress)
    let result = null
    try {
      result = await sideStaking.methods.router().call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get Router address: ${e.message}`)
    }
    return result
  }
}
