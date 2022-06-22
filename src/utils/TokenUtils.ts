import Decimal from 'decimal.js'
import { Contract } from 'web3-eth-contract'
import {
  amountToUnits,
  estimateGas,
  getFairGasPrice,
  unitsToAmount
} from './ContractUtils'
import { minAbi } from './minAbi'
import LoggerInstance from './Logger'
import { TransactionReceipt } from 'web3-core'
import Web3 from 'web3'
import BigNumber from 'bignumber.js'

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
  web3: Web3,
  account: string,
  tokenAddress: string,
  spender: string,
  amount: string,
  contractInstance?: Contract
): Promise<number> {
  const tokenContract = contractInstance || new web3.eth.Contract(minAbi, tokenAddress)

  return estimateGas(account, tokenContract.methods.approve, spender, amount)
}

/**
 * Approve spender to spent amount tokens
 * @param {String} account
 * @param {String} tokenAddress
 * @param {String} spender
 * @param {String} amount amount of ERC20 tokens (always expressed as wei)
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
  const estGas = await estimateGas(
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
 * Approve spender to spent amount tokens
 * @param {String} account
 * @param {String} tokenAddress
 * @param {String} spender
 * @param {String} amount amount of ERC20 tokens (always expressed as wei)
 * @param {boolean} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
 */
export async function approveWei(
  web3: Web3,
  account: string,
  tokenAddress: string,
  spender: string,
  amount: string,
  force = false
): Promise<TransactionReceipt | string> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
  if (!force) {
    const currentAllowence = await allowanceWei(web3, tokenAddress, account, spender)
    if (new BigNumber(currentAllowence).gt(new BigNumber(amount))) {
      return currentAllowence
    }
  }
  let result = null
  const estGas = await estimateGas(
    account,
    tokenContract.methods.approve,
    spender,
    amount
  )

  try {
    result = await tokenContract.methods.approve(spender, amount).send({
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
 * Estimate gas cost for transfer function
 * @param {String} account
 * @param {String} tokenAddress
 * @param {String} recipient
 * @param {String} amount
 * @param {String} force
 * @param {Contract} contractInstance optional contract instance
 * @return {Promise<number>}
 */
export async function estTransfer(
  web3: Web3,
  account: string,
  tokenAddress: string,
  recipient: string,
  amount: string,
  contractInstance?: Contract
): Promise<number> {
  const tokenContract = contractInstance || new web3.eth.Contract(minAbi, tokenAddress)

  return estimateGas(account, tokenContract.methods.transfer, recipient, amount)
}

/**
 * Moves amount tokens from the caller’s account to recipient.
 * @param {String} account
 * @param {String} tokenAddress
 * @param {String} recipient
 * @param {String} amount amount of ERC20 tokens (not as wei)
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
  const estGas = await estimateGas(
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
 * Get Allowance for any erc20
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
 * Get Allowance for any erc20
 * @param {Web3} web3
 * @param {String } tokenAdress
 * @param {String} account
 * @param {String} spender
 */
export async function allowanceWei(
  web3: Web3,
  tokenAddress: string,
  account: string,
  spender: string,
  tokenDecimals?: number
): Promise<string> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
  return await tokenContract.methods.allowance(account, spender).call()
}

/**
 * Get balance for any erc20
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
 * Get decimals for any erc20
 * @param {Web3} web3
 * @param {String} tokenAdress
 * @return {Promise<number>} Number of decimals of the token
 */
export async function decimals(web3: Web3, tokenAddress: string): Promise<number> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
  return await tokenContract.methods.decimals().call()
}
