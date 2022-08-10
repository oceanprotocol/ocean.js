import Decimal from 'decimal.js'
import { TransactionReceipt } from 'web3-core'
import Web3 from 'web3'
import {
  amountToUnits,
  calculateEstimatedGas,
  getFairGasPrice,
  unitsToAmount,
  minAbi,
  sendTx
} from '.'

/**
 * Approve spender to spent amount tokens
 * @param {String} account
 * @param {String} tokenAddress
 * @param {String} spender
 * @param {String} amount amount of ERC20 Datatokens (always expressed as wei)
 * @param {boolean} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
 * @param {number} tokenDecimals optional number of decimals of the token
 */
export async function approve<G extends boolean = false>(
  web3: Web3,
  account: string,
  tokenAddress: string,
  spender: string,
  amount: string,
  force = false,
  tokenDecimals?: number,
  estimateGas?: G
): Promise<G extends false ? TransactionReceipt : number> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
  if (!force) {
    const currentAllowence = await allowance(web3, tokenAddress, account, spender)
    if (new Decimal(currentAllowence).greaterThanOrEqualTo(new Decimal(amount))) {
      return null
    }
  }
  const amountFormatted = await amountToUnits(web3, tokenAddress, amount, tokenDecimals)
  const estGas = await calculateEstimatedGas(
    account,
    tokenContract.methods.approve,
    spender,
    amountFormatted
  )
  if (estimateGas) return estGas

  const trxReceipt = await sendTx(
    account,
    estGas + 1,
    this.web3,
    tokenContract.methods.approve,
    spender,
    amountFormatted
  )
  return trxReceipt
}

/**
 * Moves amount tokens from the caller’s account to recipient.
 * @param {String} account
 * @param {String} tokenAddress
 * @param {String} recipient
 * @param {String} amount amount of ERC20 Datatokens (not as wei)
 * @param {String} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
 */
export async function transfer<G extends boolean = false>(
  web3: Web3,
  account: string,
  tokenAddress: string,
  recipient: string,
  amount: string,
  estimateGas?: G
): Promise<G extends false ? TransactionReceipt : number> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)

  const amountFormatted = await amountToUnits(web3, tokenAddress, amount)
  const estGas = await calculateEstimatedGas(
    account,
    tokenContract.methods.transfer,
    recipient,
    amountFormatted
  )
  if (estimateGas) return estGas

  const trxReceipt = await sendTx(
    account,
    estGas + 1,
    this.web3,
    tokenContract.methods.transfer,
    recipient,
    amountFormatted
  )
  return trxReceipt
}

/**
 * Get Allowance for any Datatoken
 * @param {Web3} web3
 * @param {String } tokenAdress
 * @param {String} account
 * @param {String} spender
 * @param {number} tokenDecimals optional number of decimals of the token
 */
export async function allowance(
  web3: Web3,
  tokenAddress: string,
  account: string,
  spender: string,
  tokenDecimals?: number
): Promise<string> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
  const trxReceipt = await tokenContract.methods.allowance(account, spender).call()

  return await unitsToAmount(web3, tokenAddress, trxReceipt, tokenDecimals)
}

/**
 * Get balance for any Datatoken
 * @param {Web3} web3
 * @param {String} tokenAdress
 * @param {String} owner
 * @param {String} spender
 * @param {number} tokenDecimals optional number of decimals of the token
 */
export async function balance(
  web3: Web3,
  tokenAddress: string,
  account: string,
  tokenDecimals?: number
): Promise<string> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
  const trxReceipt = await tokenContract.methods.balanceOf(account).call()

  return await unitsToAmount(web3, tokenAddress, trxReceipt, tokenDecimals)
}

/**
 * Get decimals for any Datatoken
 * @param {Web3} web3
 * @param {String} tokenAdress
 * @return {Promise<number>} Number of decimals of the token
 */
export async function decimals(web3: Web3, tokenAddress: string): Promise<number> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
  return await tokenContract.methods.decimals().call()
}
