import Decimal from 'decimal.js'
import { amountToUnits, getFairGasPrice, unitsToAmount } from './ContractUtils'
import { minAbi } from './minAbi'
import LoggerInstance from './Logger'
import { TransactionReceipt } from 'web3-core'
import Web3 from 'web3'
import { GASLIMIT_DEFAULT } from './Constants'

/**
 * Estimates the gas used when a function would be executed on chain
 * @param {string} from account that calls the function
 * @param {Function} functionToEstimateGas function that we need to estimate the gas
 * @param {...any[]} args arguments of the function
 * @return {Promise<number>} gas cost of the function
 */
export async function estimateGas(
  from: string,
  functionToEstimateGas: Function,
  ...args: any[]
): Promise<number> {
  let estimatedGas = GASLIMIT_DEFAULT
  try {
    estimatedGas = await functionToEstimateGas.apply(null, args).estimateGas(
      {
        from: from
      },
      (err, estGas) => (err ? GASLIMIT_DEFAULT : estGas)
    )
  } catch (e) {
    LoggerInstance.error(`ERROR: Estimate gas failed!`, e)
  }
  return estimatedGas
}

/**
 * Approve spender to spent amount tokens
 * @param {String} account
 * @param {String} tokenAddress
 * @param {String} spender
 * @param {String} amount amount of ERC20 tokens (not as wei)
 * @param {String} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
 */
export async function approve(
  web3: Web3,
  account: string,
  tokenAddress: string,
  spender: string,
  amount: string,
  force = false
): Promise<TransactionReceipt | string> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
  if (!force) {
    const currentAllowence = await allowance(web3, tokenAddress, account, spender)
    if (new Decimal(currentAllowence).greaterThanOrEqualTo(new Decimal(amount))) {
      return currentAllowence
    }
  }
  let result = null
  const amountFormatted = await amountToUnits(web3, tokenAddress, amount)
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
 */
export async function allowance(
  web3: Web3,
  tokenAddress: string,
  account: string,
  spender: string
): Promise<string> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
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
  account: string
): Promise<string> {
  const tokenContract = new web3.eth.Contract(minAbi, tokenAddress)
  const trxReceipt = await tokenContract.methods.balanceOf(account).call()

  return await unitsToAmount(web3, tokenAddress, trxReceipt)
}
