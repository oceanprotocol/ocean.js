import { ethers, Signer, providers, Contract, ContractFunction, BigNumber } from 'ethers'

import { Config } from '../config'
import { minAbi } from '.'

const MIN_GAS_FEE_POLYGON = 30000000000 // minimum recommended 30 gwei polygon main and mumbai fees
const POLYGON_NETWORK_ID = 137
const MUMBAI_NETWORK_ID = 80001

export function setContractDefaults(contract: Contract, config: Config): Contract {
  // TO DO - since ethers does not provide this
  /* if (config) {
    if (config.transactionBlockTimeout)
      contract.transactionBlockTimeout = config.transactionBlockTimeout
    if (config.transactionConfirmationBlocks)
      contract.transactionConfirmationBlocks = config.transactionConfirmationBlocks
    if (config.transactionPollingTimeout)
      contract.transactionPollingTimeout = config.transactionPollingTimeout
  }
  */
  return contract
}

/**
 * Asynchronous function that returns a fair gas price based on the current gas price and a multiplier.
 * @param {Signer} signer - The signer object to use for fetching the current gas price.
 * @param {number} gasFeeMultiplier - The multiplier to apply to the current gas price. If not provided, the current gas price is returned as a string.
 * @returns A Promise that resolves to a string representation of the fair gas price.
 */
export async function getFairGasPrice(
  signer: Signer,
  gasFeeMultiplier: number
): Promise<string> {
  const price = await (await signer.provider.getFeeData()).gasPrice
  const x = ethers.BigNumber.from(price.toString())
  if (gasFeeMultiplier) return x.mul(gasFeeMultiplier).toBigInt().toString(10)
  else return x.toString()
}

/**
 * Asynchronous function that returns the number of decimal places for a given token.
 * @param {Signer} signer - The signer object to use for fetching the token decimals.
 * @param {string} token - The address of the token contract.
 * @returns A Promise that resolves to the number of decimal places for the token.
 */
export async function getTokenDecimals(signer: Signer, token: string) {
  const tokenContract = new ethers.Contract(token, minAbi, signer)
  return tokenContract.decimals()
}

/**
 * Converts an amount of units to tokens
 * @param {Signer} signer -  The signer object to use.
 * @param {string} token - The token to convert
 * @param {string} amount - The amount of units to convert
 * @param {number} [tokenDecimals] - The number of decimals in the token
 * @returns {Promise<string>} - The converted amount in tokens
 */
export async function unitsToAmount(
  signer: Signer,
  token: string,
  amount: string,
  tokenDecimals?: number
): Promise<string> {
  let decimals = tokenDecimals || (await getTokenDecimals(signer, token))
  if (decimals === '0') {
    decimals = 18
  }

  const amountFormatted = ethers.utils.formatUnits(amount, decimals)
  return amountFormatted.toString()
}

/**
 * Converts an amount of tokens to units
 * @param {Signer} signer -  The signer object to use.
 * @param {string} token - The token to convert
 * @param {string} amount - The amount of tokens to convert
 * @param {number} [tokenDecimals] - The number of decimals of the token
 * @returns {Promise<string>} - The converted amount in units
 */
export async function amountToUnits(
  signer: Signer,
  token: string,
  amount: string,
  tokenDecimals?: number
): Promise<string> {
  let decimals = tokenDecimals || (await getTokenDecimals(signer, token))
  if (decimals === '0') {
    decimals = 18
  }
  const amountFormatted = ethers.utils.parseUnits(amount, decimals)
  return amountFormatted.toString()
}

export function getEventFromTx(txReceipt, eventName) {
  return txReceipt?.events?.filter((log) => {
    return log.event === eventName
  })[0]
}

/**
 * Send the transation on chain
 * @param {BigNumber} estGas estimated gas for the transaction
 * @param {Signer} signer signer object
 * @param {number} gasFeeMultiplier number represinting the multiplier we apply to gas fees
 * @param {Function} functionToSend function that we need to send
 * @param {...any[]} args arguments of the function
 * @return {Promise<any>} transaction receipt
 */
export async function sendTx(
  estGas: BigNumber,
  signer: Signer,
  gasFeeMultiplier: number,
  functionToSend: ContractFunction,
  ...args: any[]
): Promise<providers.TransactionResponse> {
  const { chainId } = await signer.provider.getNetwork()
  const feeHistory = await signer.provider.getFeeData()
  let overrides
  if (feeHistory.maxPriorityFeePerGas) {
    let aggressiveFeePriorityFeePerGas = feeHistory.maxPriorityFeePerGas.toString()
    let aggressiveFeePerGas = feeHistory.maxFeePerGas.toString()
    if (gasFeeMultiplier > 1) {
      aggressiveFeePriorityFeePerGas = Math.round(
        feeHistory.maxPriorityFeePerGas.toNumber() * gasFeeMultiplier
      ).toString()
      aggressiveFeePerGas = Math.round(
        feeHistory.maxFeePerGas.toNumber() * gasFeeMultiplier
      ).toString()
    }
    overrides = {
      maxPriorityFeePerGas:
        (chainId === MUMBAI_NETWORK_ID || chainId === POLYGON_NETWORK_ID) &&
        Number(aggressiveFeePriorityFeePerGas) < MIN_GAS_FEE_POLYGON
          ? MIN_GAS_FEE_POLYGON
          : Number(aggressiveFeePriorityFeePerGas),
      maxFeePerGas:
        (chainId === MUMBAI_NETWORK_ID || chainId === POLYGON_NETWORK_ID) &&
        Number(aggressiveFeePerGas) < MIN_GAS_FEE_POLYGON
          ? MIN_GAS_FEE_POLYGON
          : Number(aggressiveFeePerGas)
    }
  } else {
    overrides = {
      gasPrice: feeHistory.gasPrice
    }
  }
  overrides.gasLimit = estGas.add(20000)
  try {
    const trxReceipt = await functionToSend(...args, overrides)
    return trxReceipt
  } catch (e) {
    return null
  }
}
