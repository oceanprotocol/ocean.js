import { AbiItem } from 'web3-utils/types'
import { TransactionReceipt } from 'web3-core'
import SideStakingAbi from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import { LoggerInstance, calculateEstimatedGas } from '../../utils'
import { SmartContract } from '..'

export class SideStaking extends SmartContract {
  getDefaultAbi(): AbiItem | AbiItem[] {
    return SideStakingAbi.abi as AbiItem[]
  }

  /**
   * Get (total vesting amount + token released from the contract when adding liquidity)
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatoken address
   * @return {String}
   */
  async getDatatokenCirculatingSupply(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = this.getContract(ssAddress)
    let supply = null
    try {
      supply = await sideStaking.methods
        .getDatatokenCirculatingSupply(datatokenAddress)
        .call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return supply.toString()
  }

  /**
   * Get actual dts in circulation (vested token withdrawn from the contract +
         token released from the contract when adding liquidity)
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatoken address
   * @return {String}
   */
  async getDatatokenCurrentCirculatingSupply(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    try {
      const sideStaking = this.getContract(ssAddress)
      let supply = null
      supply = await sideStaking.methods
        .getDatatokenCurrentCirculatingSupply(datatokenAddress)
        .call()
      return supply.toString()
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
    const sideStaking = this.getContract(ssAddress)
    let address = null
    try {
      address = await sideStaking.methods.getPublisherAddress(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return address
  }

  /**
   * Get
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getBasetoken(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = this.getContract(ssAddress)
    let address = null
    try {
      address = await sideStaking.methods.getBaseTokenAddress(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return address
  }

  /**
   * Get Pool Address
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getPoolAddress(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = this.getContract(ssAddress)
    let address = null
    try {
      address = await sideStaking.methods.getPoolAddress(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return address
  }

  /**
   * Get baseToken balance in the contract
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getBasetokenBalance(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = this.getContract(ssAddress)
    let balance = null
    try {
      balance = await sideStaking.methods.getBaseTokenBalance(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return balance
  }

  /**
   * Get dt balance in the staking contract available for being added as liquidity
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @param {number} tokenDecimals optional number of decimals of the token
   * @return {String}
   */
  async getDatatokenBalance(
    ssAddress: string,
    datatokenAddress: string,
    tokenDecimals?: number
  ): Promise<string> {
    const sideStaking = this.getContract(ssAddress)
    let balance = null
    try {
      balance = await sideStaking.methods.getDatatokenBalance(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    balance = await this.unitsToAmount(datatokenAddress, balance, tokenDecimals)
    return balance
  }

  /**
   * Get block when vesting ends
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String} end block for vesting amount
   */
  async getVestingEndBlock(ssAddress: string, datatokenAddress: string): Promise<string> {
    const sideStaking = this.getContract(ssAddress)
    let block = null
    try {
      block = await sideStaking.methods.getvestingEndBlock(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return block
  }

  /**
   * Get total amount vesting
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @param {number} tokenDecimals optional number of decimals of the token
   * @return {String}
   */
  async getVestingAmount(
    ssAddress: string,
    datatokenAddress: string,
    tokenDecimals?: number
  ): Promise<string> {
    const sideStaking = this.getContract(ssAddress)
    let amount = null
    try {
      amount = await sideStaking.methods.getvestingAmount(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    amount = await this.unitsToAmount(datatokenAddress, amount, tokenDecimals)
    return amount
  }

  /**
   * Get last block publisher got some vested tokens
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {String}
   */
  async getVestingLastBlock(
    ssAddress: string,
    datatokenAddress: string
  ): Promise<string> {
    const sideStaking = this.getContract(ssAddress)
    let block = null
    try {
      block = await sideStaking.methods.getvestingLastBlock(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    return block
  }

  /**
   * Get how much has been taken from the vesting amount
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @param {number} tokenDecimals optional number of decimals of the token
   * @return {String}
   */
  async getVestingAmountSoFar(
    ssAddress: string,
    datatokenAddress: string,
    tokenDecimals?: number
  ): Promise<string> {
    const sideStaking = this.getContract(ssAddress)
    let amount = null
    try {
      amount = await sideStaking.methods.getvestingAmountSoFar(datatokenAddress).call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get: ${e.message}`)
    }
    amount = await this.unitsToAmount(datatokenAddress, amount, tokenDecimals)
    return amount
  }

  /** Send vested tokens available to the publisher address, can be called by anyone
   *
   * @param {String} account
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {TransactionReceipt}
   */
  async getVesting<G extends boolean = false>(
    account: string,
    ssAddress: string,
    datatokenAddress: string,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const sideStaking = this.getContract(ssAddress)
    let vesting = null

    const estGas = await calculateEstimatedGas(
      account,
      sideStaking.methods.getVesting,
      datatokenAddress
    )
    if (estimateGas) return estGas

    try {
      vesting = await sideStaking.methods.getVesting(datatokenAddress).send({
        from: account,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })
    } catch (e) {
      LoggerInstance.error('ERROR: Failed to join swap pool amount out')
    }
    return vesting
  }

  /** Send vested tokens available to the publisher address, can be called by anyone
   *
   * @param {String} account
   * @param {String} ssAddress side staking contract address
   * @param {String} datatokenAddress datatokenAddress
   * @return {TransactionReceipt}
   */
  private async setPoolSwapFee<G extends boolean = false>(
    account: string,
    ssAddress: string,
    datatokenAddress: string,
    poolAddress: string,
    swapFee: number,
    estimateGas?: G
  ): Promise<G extends false ? TransactionReceipt : number> {
    const sideStaking = this.getContract(ssAddress)
    let fee = null

    const estGas = await calculateEstimatedGas(
      account,
      sideStaking.methods.setPoolSwapFee,
      datatokenAddress,
      poolAddress,
      swapFee
    )
    if (estimateGas) return estGas

    try {
      fee = await sideStaking.methods
        .setPoolSwapFee(datatokenAddress, poolAddress, swapFee)
        .send({
          from: account,
          gas: estGas + 1,
          gasPrice: await this.getFairGasPrice()
        })
    } catch (e) {
      LoggerInstance.error('ERROR: Failed to join swap pool amount out')
    }
    return fee
  }

  /**
   * Get Router address set in side staking contract
   * @param {String} ssAddress side staking contract address
   * @return {String}
   */
  public async getRouter(ssAddress: string): Promise<string> {
    const sideStaking = this.getContract(ssAddress)
    let router = null
    try {
      router = await sideStaking.methods.router().call()
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to get Router address: ${e.message}`)
    }
    return router
  }
}
