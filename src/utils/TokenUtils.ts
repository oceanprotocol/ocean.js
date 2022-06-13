import Decimal from 'decimal.js'
import { Contract } from 'web3-eth-contract'
import { TransactionReceipt } from 'web3-core'
import Web3 from 'web3'
import {
  amountToUnits,
  calculateEstimatedGas,
  getFairGasPrice,
  unitsToAmount,
  minAbi,
  LoggerInstance
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
export async function approve(
  web3: Web3,
  account: string,
  tokenAddress: string,
  spender: string,
  amount: string,
  force = false,
  tokenDecimals?: number
): Promise<TransactionReceipt | string> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
  if (!force) {
    const currentAllowence = await allowance(web3, tokenAddress, account, spender)
    if (new Decimal(currentAllowence).greaterThanOrEqualTo(new Decimal(amount))) {
      return currentAllowence
    }
  }
  let result = null
  const amountFormatted = await amountToUnits(web3, tokenAddress, amount, tokenDecimals)
  const estGas = await calculateEstimatedGas(
    account,
    tokenContract.methods.approve,
    spender,
    amountFormatted
  )

  try {
    result = await tokenContract.methods.approve(spender, amountFormatted).send({
      from: account,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(web3, null)
    })
  } catch (e) {
    LoggerInstance.error(
      `ERROR: Failed to approve spender to spend tokens : ${e.message}`
    )
  }
  return result
}

/**
 * Moves amount tokens from the caller’s account to recipient.
 * @param {String} account
 * @param {String} tokenAddress
 * @param {String} recipient
 * @param {String} amount amount of ERC20 Datatokens (not as wei)
 * @param {String} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
 */
export async function transfer(
  web3: Web3,
  account: string,
  tokenAddress: string,
  recipient: string,
  amount: string
): Promise<TransactionReceipt | string> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)

  let result = null
  const amountFormatted = await amountToUnits(web3, tokenAddress, amount)
  const estGas = await calculateEstimatedGas(
    account,
    tokenContract.methods.transfer,
    recipient,
    amountFormatted
  )

  try {
    result = await tokenContract.methods.transfer(recipient, amountFormatted).send({
      from: account,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(web3, null)
    })
  } catch (e) {
    LoggerInstance.error(`ERROR: Failed to transfer tokens : ${e.message}`)
  }
  return result
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
