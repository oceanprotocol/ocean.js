import { AbiItem } from 'web3-utils/types'
import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import SideStakingAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import { LoggerInstance, getFairGasPrice, estimateGas } from '../../utils'
import { SmartContractWithAddress } from '..'

export class SideStaking extends SmartContractWithAddress {
  getDefaultAbi(): AbiItem | AbiItem[] {
    return SideStakingAbi.abi as AbiItem[]
  }

  /**
   * Get (total vesting amount + token released from the contract when adding liquidity)
   * @param {String} datatokenAddress datatoken address
   * @return {String}
   */
  async getDatatokenCirculatingSupply(datatokenAddress: string): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods
        .getDatatokenCirculatingSupply(datatokenAddress)
        .call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result.toString()
  }

  /**
   * Get actual dts in circulation (vested token withdrawn from the contract +
         token released from the contract when adding liquidity)
   * @param {String} datatokenAddress datatoken address
   * @return {String}
   */
  async getDatatokenCurrentCirculatingSupply(datatokenAddress: string): Promise<string> {
    try {
      let result = null
      result = await this.contract.methods
        .getDatatokenCurrentCirculatingSupply(datatokenAddress)
        .call()
      return result.toString()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
  }

  /**
   * Get Publisher address
   * @param {String} datatokenAddress datatoken address
   * @return {String}
   */
  async getPublisherAddress(datatokenAddress: string): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.getPublisherAddress(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getBaseToken(datatokenAddress: string): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.getBaseTokenAddress(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get Pool Address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getPoolAddress(datatokenAddress: string): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.getPoolAddress(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get baseToken balance in the contract
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getBaseTokenBalance(datatokenAddress: string): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.getBaseTokenBalance(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get dt balance in the staking contract available for being added as liquidity
   * @param {String} datatokenAddress datatokenAddress
   * @param {number} tokenDecimals optional number of decimals of the token
   * @return {String}
   */
  async getDatatokenBalance(
    datatokenAddress: string,
    tokenDecimals?: number
  ): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.getDatatokenBalance(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    result = await this.unitsToAmount(datatokenAddress, result, tokenDecimals)
    return result
  }

  /**
   * Get block when vesting ends
   * @param {String} datatokenAddress datatokenAddress
   * @return {String} end block for vesting amount
   */
  async getvestingEndBlock(datatokenAddress: string): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.getvestingEndBlock(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get total amount vesting
   * @param {String} datatokenAddress datatokenAddress
   * @param {number} tokenDecimals optional number of decimals of the token
   * @return {String}
   */
  async getvestingAmount(
    datatokenAddress: string,
    tokenDecimals?: number
  ): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.getvestingAmount(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    result = await this.unitsToAmount(datatokenAddress, result, tokenDecimals)
    return result
  }

  /**
   * Get last block publisher got some vested tokens
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getvestingLastBlock(datatokenAddress: string): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.getvestingLastBlock(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return result
  }

  /**
   * Get how much has been taken from the vesting amount
   * @param {String} datatokenAddress datatokenAddress
   * @param {number} tokenDecimals optional number of decimals of the token
   * @return {String}
   */
  async getvestingAmountSoFar(
    datatokenAddress: string,
    tokenDecimals?: number
  ): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.getvestingAmountSoFar(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    result = await this.unitsToAmount(datatokenAddress, result, tokenDecimals)
    return result
  }

  /**
   * Estimate gas cost for getVesting
   * @param {String} account
   * @param {String} datatokenAddress datatokenAddress
   * @return {Promise<number>}
   */
  public async estGasGetVesting(
    account: string,
    datatokenAddress: string
  ): Promise<number> {
    return estimateGas(account, this.contract.methods.getVesting, datatokenAddress)
  }

  /** Send vested tokens available to the publisher address, can be called by anyone
   *
   * @param {String} account
   * @param {String} datatokenAddress datatokenAddress
   * @return {TransactionReceipt}
   */
  async getVesting(
    account: string,
    datatokenAddress: string
  ): Promise<TransactionReceipt> {
    let result = null

    const estGas = await estimateGas(
      account,
      this.contract.methods.getVesting,
      datatokenAddress
    )

    try {
      result = await this.contract.methods.getVesting(datatokenAddress).send({
        from: account,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })
    } catch (e) {
      LoggerInstance.error('ERROR: Failed to join swap pool amount out')
    }
    return result
  }

  /**
   * Estimate gas cost for getVesting
   * @param {String} account
   * @param {String} datatokenAddress datatokenAddress
   * @return {Promise<number>}
   */
  public async estGasSetPoolSwapFee(
    account: string,
    datatokenAddress: string,
    poolAddress: string,
    swapFee: number
  ): Promise<number> {
    return estimateGas(
      account,
      this.contract.methods.setPoolSwapFee,
      datatokenAddress,
      poolAddress,
      swapFee
    )
  }

  /** Send vested tokens available to the publisher address, can be called by anyone
   *
   * @param {String} account
   * @param {String} datatokenAddress datatokenAddress
   * @return {TransactionReceipt}
   */
  async setPoolSwapFee(
    account: string,
    datatokenAddress: string,
    poolAddress: string,
    swapFee: number
  ): Promise<TransactionReceipt> {
    let result = null

    const estGas = await estimateGas(
      account,
      this.contract.methods.setPoolSwapFee,
      datatokenAddress,
      poolAddress,
      swapFee
    )

    try {
      result = await this.contract.methods
        .setPoolSwapFee(datatokenAddress, poolAddress, swapFee)
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3, this.config)
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
  async getRouter(): Promise<string> {
    let result = null
    try {
      result = await this.contract.methods.router().call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get Router address: ${e.message}`)
    }
    return result
  }
}
