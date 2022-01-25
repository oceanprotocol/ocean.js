import Decimal from 'decimal.js'
import { Contract } from 'web3-eth-contract'
import { getFairGasPrice, setContractDefaults, unitsToAmount } from './ContractUtils'
import { minAbi } from './minAbi'
import { AbiItem } from 'web3-utils/types'
import LoggerInstance from './Logger'
import { TransactionReceipt } from 'web3-core'
import Web3 from 'web3'

/**
 * Estimate gas cost for approval function
 * @param {String} account
 * @param {String} tokenAddress
 * @param {String} spender
 * @param {String} amount
 * @param {String} force
 * @param {Contract} contractInstance optional contract instance
 * @return {Promise<number>}
 */
export async function estApprove(
  account: string,
  tokenAddress: string,
  spender: string,
  amount: string,
  contractInstance?: Contract
): Promise<number> {
  const tokenContract =
    contractInstance ||
    setContractDefaults(new this.web3.eth.Contract(minAbi, tokenAddress), this.config)

  const gasLimitDefault = this.GASLIMIT_DEFAULT
  let estGas
  try {
    estGas = await tokenContract.methods
      .approve(spender, amount)
      .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
  } catch (e) {
    estGas = gasLimitDefault
    LoggerInstance.error('estimate gas failed for approve!', e)
  }
  return estGas
}

/**
 * Approve spender to spent amount tokens
 * @param {String} account
 * @param {String} tokenAddress
 * @param {String} spender
 * @param {String} amount  (always expressed as wei)
 * @param {String} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
 */
export async function approve(
  account: string,
  tokenAddress: string,
  spender: string,
  amount: string,
  force = false
): Promise<TransactionReceipt | string> {
  const token = setContractDefaults(
    new this.web3.eth.Contract(minAbi, tokenAddress),
    this.config
  )
  if (!force) {
    const currentAllowence = await this.allowance(tokenAddress, account, spender)
    if (new Decimal(currentAllowence).greaterThanOrEqualTo(new Decimal(amount))) {
      return currentAllowence
    }
  }
  let result = null
  const amountFormatted = await this.amountToUnits(tokenAddress, amount)
  const estGas = await this.estApprove(account, tokenAddress, spender, amountFormatted)

  try {
    result = await token.methods.approve(spender, amountFormatted).send({
      from: account,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })
  } catch (e) {
    this.logger.error(`ERRPR: Failed to approve spender to spend tokens : ${e.message}`)
  }
  return result
}

/**
 * Get Allowance for any erc20
 * @param {Web3} web3
 * @param {String } tokenAdress
 * @param {String} account
 * @param {String} spender
 */
export async function allowance(
  web3: Web3,
  tokenAddress: string,
  account: string,
  spender: string
): Promise<string> {
  const tokenAbi = minAbi as AbiItem[]
  const datatoken = new web3.eth.Contract(tokenAbi, tokenAddress)
  const trxReceipt = await datatoken.methods.allowance(account, spender).call()

  return await unitsToAmount(web3, tokenAddress, trxReceipt)
}

/**
 * Get balance for any erc20
 * @param {Web3} web3
 * @param {String} tokenAdress
 * @param {String} owner
 * @param {String} spender
 */
export async function balance(
  web3: Web3,
  tokenAddress: string,
  account: string
): Promise<string> {
  const tokenAbi = minAbi as AbiItem[]
  const datatoken = new web3.eth.Contract(tokenAbi, tokenAddress)
  const trxReceipt = await datatoken.methods.balanceOf(account).call()

  return await unitsToAmount(web3, tokenAddress, trxReceipt)
}
