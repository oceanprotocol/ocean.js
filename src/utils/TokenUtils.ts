import Decimal from 'decimal.js'
import { Contract } from 'web3-eth-contract'
import {
  amountToUnits,
  getFairGasPrice,
  setContractDefaults,
  unitsToAmount
} from './ContractUtils'
import { minAbi } from './minAbi'
import LoggerInstance from './Logger'
import { TransactionReceipt } from 'web3-core'
import Web3 from 'web3'
import { GASLIMIT_DEFAULT } from '.'
import { Config, ContractConfig } from '../models'

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

  const gasLimitDefault = GASLIMIT_DEFAULT
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
 * @param {Config} config  configuration that provide values for web3 transaction gasFeeMultiplier, transactionBlockTimeout, transactionConfirmationBlocks, transactionPollingTimeout
 */
export async function approve(
  web3: Web3,
  account: string,
  tokenAddress: string,
  spender: string,
  amount: string,
  force = false,
  config?: ContractConfig
): Promise<TransactionReceipt | string> {
  const tokenContract = setContractDefaults(
    new web3.eth.Contract(minAbi, tokenAddress),
    config
  )
  if (!force) {
    const currentAllowance = await allowance(web3, tokenAddress, account, spender, config)
    if (new Decimal(currentAllowance).greaterThanOrEqualTo(new Decimal(amount))) {
      return currentAllowance
    }
  }
  let result = null
  const amountFormatted = await amountToUnits(web3, tokenAddress, amount)
  const estGas = await estApprove(
    web3,
    account,
    tokenAddress,
    spender,
    amountFormatted,
    tokenContract
  )

  try {
    result = await tokenContract.methods.approve(spender, amountFormatted).send({
      from: account,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(web3, config)
    })
  } catch (e) {
    LoggerInstance.error(
      `ERRPR: Failed to approve spender to spend tokens : ${e.message}`
    )
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
  spender: string,
  config?: ContractConfig
): Promise<string> {
  const tokenContract = setContractDefaults(
    new web3.eth.Contract(minAbi, tokenAddress),
    config
  )
  const trxReceipt = await tokenContract.methods.allowance(account, spender).call()

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
  account: string,
  config?: Config
): Promise<string> {
  const tokenContract = setContractDefaults(
    new web3.eth.Contract(minAbi, tokenAddress),
    config
  )
  const trxReceipt = await tokenContract.methods.balanceOf(account).call()

  return await unitsToAmount(web3, tokenAddress, trxReceipt)
}
