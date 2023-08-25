import Decimal from 'decimal.js'
import { ethers, Signer } from 'ethers'
import { amountToUnits, unitsToAmount, minAbi, sendTx, LoggerInstance } from '.'
import { Config } from '../config'
import { ReceiptOrEstimate, ReceiptOrDecimal } from '../@types'

/**
 * Approve spender to spent amount tokens
 * @param {Signer} signer - The signer object
 * @param {Config} config - The config object
 * @param {string} account - The address of the caller
 * @param {string} tokenAddress - The address of the token
 * @param {string} spender - The address of the spender
 * @param {String} amount amount of ERC20 Datatokens (always expressed as wei)
 * @param {boolean} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
 * @param {number} [tokenDecimals] optional number of decimals of the token
 * @param {boolean} [estimateGas]  if true, returns the estimate gas cost for calling the method
 */
export async function approve<G extends boolean = false>(
  signer: Signer,
  config: Config,
  account: string,
  tokenAddress: string,
  spender: string,
  amount: string,
  force = false,
  tokenDecimals?: number,
  estimateGas?: G
): Promise<ReceiptOrDecimal<G> | number> {
  const tokenContract = new ethers.Contract(tokenAddress, minAbi, signer)
  if (!force) {
    const currentAllowence = await allowance(signer, tokenAddress, account, spender)
    if (new Decimal(currentAllowence).greaterThanOrEqualTo(new Decimal(amount))) {
      return <ReceiptOrDecimal<G>>new Decimal(currentAllowence).toNumber()
    }
  }
  const amountFormatted = await amountToUnits(signer, tokenAddress, amount, tokenDecimals)
  const estGas = await tokenContract.estimateGas.approve(spender, amountFormatted)
  if (estimateGas) return <ReceiptOrDecimal<G>>(<unknown>new Decimal(estGas.toString()))

  const trxReceipt = await sendTx(
    estGas,
    signer,
    config?.gasFeeMultiplier,
    tokenContract.approve,
    spender,
    amountFormatted
  )
  return <ReceiptOrDecimal<G>>trxReceipt
}

/**
 * Approve spender to spent amount tokens
 * @param {Signer} signer - The signer object
 * @param {Config} config - The config object
 * @param {string} account - The address of the caller
 * @param {string} tokenAddress - The address of the token
 * @param {string} spender - The address of the spender
 * @param {string} amount amount of ERC20 tokens (always expressed as wei)
 * @param {boolean} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
 * @param {boolean} [estimateGas]  if true, returns the estimate gas cost for calling the method
 */
export async function approveWei<G extends boolean = false>(
  signer: Signer,
  config: Config,
  account: string,
  tokenAddress: string,
  spender: string,
  amount: string,
  force = false,
  estimateGas?: G
): Promise<ReceiptOrEstimate<G>> {
  const tokenContract = new ethers.Contract(tokenAddress, minAbi, signer)
  if (!force) {
    const currentAllowence = await allowanceWei(signer, tokenAddress, account, spender)
    if (ethers.BigNumber.from(currentAllowence).gt(ethers.BigNumber.from(amount))) {
      return <ReceiptOrEstimate<G>>ethers.BigNumber.from(currentAllowence)
    }
  }
  let result = null

  const estGas = await tokenContract.estimateGas.approve(spender, amount)
  if (estimateGas) return <ReceiptOrEstimate<G>>estGas

  try {
    result = await sendTx(
      estGas,
      signer,
      config?.gasFeeMultiplier,
      tokenContract.approve,
      spender,
      amount
    )
  } catch (e) {
    LoggerInstance.error(
      `ERROR: Failed to approve spender to spend tokens : ${e.message}`
    )
  }
  return result
}

/**
 * Moves amount tokens from the caller’s account to recipient.
 * @param {Signer} signer - The signer object
 * @param {Config} config - The config object
 * @param {string} tokenAddress - The address of the token
 * @param {string} recipient - The address of the tokens receiver
 * @param {String} amount amount of ERC20 Datatokens (not as wei)
 * @param {String} estimateGas  if true returns the gas estimate
 */
export async function transfer<G extends boolean = false>(
  signer: Signer,
  config: Config,
  tokenAddress: string,
  recipient: string,
  amount: string,
  estimateGas?: G
): Promise<ReceiptOrEstimate<G>> {
  const tokenContract = new ethers.Contract(tokenAddress, minAbi, signer)
  const amountFormatted = await amountToUnits(signer, tokenAddress, amount)
  const estGas = await tokenContract.estimateGas.transfer(recipient, amountFormatted)
  if (estimateGas) return <ReceiptOrEstimate<G>>estGas

  const trxReceipt = await sendTx(
    estGas,
    signer,
    config?.gasFeeMultiplier,
    tokenContract.transfer,
    recipient,
    amountFormatted
  )
  return <ReceiptOrEstimate<G>>trxReceipt
}

/**
 * Get Allowance for any Datatoken
 * @param {Signer} signer - The signer object
 * @param {string} tokenAddress - The address of the token
 * @param {string} account - The address of the caller
 * @param {string} spender - The address of the spender
 * @param {number} tokenDecimals optional number of decimals of the token
 */
export async function allowance(
  signer: Signer,
  tokenAddress: string,
  account: string,
  spender: string,
  tokenDecimals?: number
): Promise<string> {
  const tokenContract = new ethers.Contract(tokenAddress, minAbi, signer)
  const trxReceipt = await tokenContract.allowance(account, spender)

  return await unitsToAmount(signer, tokenAddress, trxReceipt, tokenDecimals)
}

/**
 * Get balance for any Datatoken
 * @param {Signer} signer - The signer object
 * @param {string} tokenAddress - The address of the token
 * @param {string} account - The address of the caller
 * @param {number} [tokenDecimals] optional number of decimals of the token
 */
export async function balance(
  signer: Signer,
  tokenAddress: string,
  account: string,
  tokenDecimals?: number
): Promise<string> {
  const tokenContract = new ethers.Contract(tokenAddress, minAbi, signer)
  const trxReceipt = await tokenContract.balanceOf(account)

  return await unitsToAmount(signer, tokenAddress, trxReceipt, tokenDecimals)
}

/**
 * Get Allowance in wei for any erc20
 * @param {Signer} signer - The signer object
 * @param {string} tokenAddress - The address of the token
 * @param {string} account - The address of the caller
 * @param {string} spender - The address of the spneder
 */
export async function allowanceWei(
  signer: Signer,
  tokenAddress: string,
  account: string,
  spender: string
): Promise<string> {
  const tokenContract = new ethers.Contract(tokenAddress, minAbi, signer)
  return await tokenContract.allowance(account, spender)
}

/**
 * Get decimals for any Datatoken
 * @param {Signer} signer - The signer object
 * @param {String} tokenAddress - The address of the token
 * @return {Promise<number>} Number of decimals of the token
 */
export async function decimals(signer: Signer, tokenAddress: string): Promise<number> {
  const tokenContract = new ethers.Contract(tokenAddress, minAbi, signer)
  return await tokenContract.decimals()
}
