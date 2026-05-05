import {
  ethers,
  Signer,
  Contract,
  TransactionResponse,
  TransactionRequest,
  BaseContractMethod,
  formatUnits,
  parseUnits,
  EventLog,
  TransactionReceipt
} from 'ethers'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import ERC20TemplateEnterprise from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20TemplateEnterprise.sol/ERC20TemplateEnterprise.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import FixedRateExchange from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import AccessListFactory from '@oceanprotocol/contracts/artifacts/contracts/accesslists/AccessListFactory.sol/AccessListFactory.json'

import { Config, KNOWN_CONFIDENTIAL_EVMS } from '../config/index.js'
import { LoggerInstance } from './Logger.js'
import { minAbi } from './minAbi.js'
import BigNumber from 'bignumber.js'

const MIN_GAS_FEE_POLYGON = 30000000000 // minimum recommended 30 gwei polygon main and mumbai fees
const MIN_GAS_FEE_SEPOLIA = 4000000000 // minimum 4 gwei for eth sepolia testnet
const MIN_GAS_FEE_SAPPHIRE = 10000000000 // recommended for mainnet and testnet 10 gwei
const POLYGON_NETWORK_ID = 137
const MUMBAI_NETWORK_ID = 80001
const SEPOLIA_NETWORK_ID = 11155111
const EVENT_INTERFACES = [
  new ethers.Interface(ERC20Template.abi),
  new ethers.Interface(ERC20TemplateEnterprise.abi),
  new ethers.Interface(ERC721Template.abi),
  new ethers.Interface(ERC721Factory.abi),
  new ethers.Interface(FixedRateExchange.abi),
  new ethers.Interface(AccessListFactory.abi)
]

export function setContractDefaults(contract: Contract, config: Config): Contract {
  // TO DO - since ethers does not provide this
  /* if (config) {
    if (config.transactionBlockTimeout)
      contract.transactionBlockTimeout = config.transactionBlockTimeout
    if (config.transactionConfirmationBlocks)
      contract.transactionConfirmationBlocks = config.transactionConfirmationBlocks
    if (config.transactionPollingTimeout)
      contract.transactionPollingTimeout = config.transactio nPollingTimeout
  }
  */
  return contract
}

/**
 * Asynchronous function that returns a fair gas price based on the current gas price and a multiplier.
 * @param {Signer} signer - The signer object to use for fetching the current gas price.
 * @param {number} gasFeeMultiplier - The multiplier to apply to the current gas price. If not provided, the current gas price is returned as a string.
 * @returns A Promise that resolves to a string representation of  the fair gas price.
 */
export async function getFairGasPrice(
  signer: Signer,
  gasFeeMultiplier: number
): Promise<string> {
  const price = (await signer.provider.getFeeData()).gasPrice
  const x = BigInt(price.toString())
  if (gasFeeMultiplier) return (x * BigInt(gasFeeMultiplier)).toString(10)
  else return x.toString()
}

/**
 * Asynchronous function that returns the number of decimal places for a given token.
 * @param {Signer} signer - The signer object to use for fetching the token decimals.
 * @param {string} token - The address of the token contract.
 * @returns A Promise that resolves to the number of decimal p laces for the token.
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
 * @returns {Promise<string>} - The conver ted amount in tokens
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

  const amountFormatted = formatUnits(amount, decimals)
  return amountFormatted.toString()
}

/**
 * Converts an amount of tokens to units
 * @param {Signer} signer -  The signer object to use.
 * @param {string} token - The token to convert
 * @param {string} amount - The amount of tokens to convert
 * @param {number} [tokenDecimals] - The number of decimals of the token
 * @returns {Promise<string>} - The conve rted amount in units
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
  const amountFormatted = parseUnits(amount, decimals)
  return amountFormatted.toString()
}

export function getEventFromTx(txReceipt: TransactionReceipt, eventName: string): any {
  if (!txReceipt || !txReceipt.logs) {
    return undefined
  }

  const foundLog = txReceipt.logs.filter((log): log is EventLog => {
    if (!(log instanceof EventLog) || log.eventName !== eventName) return false
    const topic0 = log.topics?.[0]?.toLowerCase()
    // Keep backward compatibility for receipts where ethers doesn't expose eventSignature.
    if (!topic0 || !log.eventSignature) return true
    return topic0 === ethers.id(log.eventSignature).toLowerCase()
  })[0]
  if (foundLog) return foundLog

  // Fallback for receipts created via signer.sendTransaction(txRequest).
  for (const log of txReceipt.logs) {
    for (const eventInterface of EVENT_INTERFACES) {
      try {
        const parsed = eventInterface.parseLog(log)
        if (!parsed || parsed.name !== eventName) continue
        return {
          event: parsed.name,
          eventName: parsed.name,
          args: parsed.args,
          transactionHash: log.transactionHash,
          blockHash: log.blockHash,
          blockNumber: log.blockNumber,
          address: log.address,
          logIndex: log.index,
          topics: log.topics,
          data: log.data
        }
      } catch {
        // ignore non-matching log/interface pairs
      }
    }
  }
  return undefined
}

/**
 * Send the transation on chain
 * @param {BigNumber} estGas estimated gas for the transaction
 * @param {Signer} signer signer object
 * @param {number} gasFeeMultiplier number represinting the multiplier we apply to gas fees
 * @param {Function} functionToSend function that we need to send
 * @param {...any[]} args arguments of the function
 * @return {Promise<any>}  transaction receipt
 */
export async function sendTx(
  estGas: bigint,
  signer: Signer,
  gasFeeMultiplier: number,
  functionToSend: BaseContractMethod,
  ...args: any[]
): Promise<TransactionResponse> {
  const overrides = await buildTxOverrides(estGas, signer, gasFeeMultiplier)
  return sendPreparedTx(signer, functionToSend, args, overrides)
}

export async function buildTxOverrides(
  estGas: bigint,
  signer: Signer,
  gasFeeMultiplier: number
): Promise<Record<string, any>> {
  const { chainId } = await signer.provider.getNetwork()
  const feeHistory = await signer.provider.getFeeData()
  let overrides: Record<string, any> = {}
  if (feeHistory.maxPriorityFeePerGas) {
    let aggressiveFeePriorityFeePerGas = feeHistory.maxPriorityFeePerGas.toString()
    let aggressiveFeePerGas = feeHistory.maxFeePerGas.toString()
    if (gasFeeMultiplier > 1) {
      aggressiveFeePriorityFeePerGas = Math.round(
        Number(feeHistory.maxPriorityFeePerGas) * gasFeeMultiplier
      ).toString()
      aggressiveFeePerGas = Math.round(
        Number(feeHistory.maxFeePerGas) * gasFeeMultiplier
      ).toString()
    }
    overrides = {
      maxPriorityFeePerGas:
        (Number(chainId) === MUMBAI_NETWORK_ID ||
          Number(chainId) === POLYGON_NETWORK_ID) &&
        Number(aggressiveFeePriorityFeePerGas) < MIN_GAS_FEE_POLYGON
          ? MIN_GAS_FEE_POLYGON
          : Number(chainId) === SEPOLIA_NETWORK_ID &&
            Number(aggressiveFeePriorityFeePerGas) < MIN_GAS_FEE_SEPOLIA
          ? MIN_GAS_FEE_SEPOLIA
          : KNOWN_CONFIDENTIAL_EVMS.includes(Number(chainId)) &&
            Number(aggressiveFeePriorityFeePerGas) < MIN_GAS_FEE_SAPPHIRE
          ? MIN_GAS_FEE_SAPPHIRE
          : Number(aggressiveFeePriorityFeePerGas),

      maxFeePerGas:
        (Number(chainId) === MUMBAI_NETWORK_ID ||
          Number(chainId) === POLYGON_NETWORK_ID) &&
        Number(aggressiveFeePerGas) < MIN_GAS_FEE_POLYGON
          ? MIN_GAS_FEE_POLYGON
          : Number(chainId) === SEPOLIA_NETWORK_ID &&
            Number(aggressiveFeePerGas) < MIN_GAS_FEE_SEPOLIA
          ? MIN_GAS_FEE_SEPOLIA
          : KNOWN_CONFIDENTIAL_EVMS.includes(Number(chainId)) &&
            Number(aggressiveFeePerGas) < MIN_GAS_FEE_SAPPHIRE
          ? MIN_GAS_FEE_SAPPHIRE
          : Number(aggressiveFeePerGas)
    }
  } else {
    overrides = {
      gasPrice: feeHistory.gasPrice
    }
  }
  overrides.gasLimit = BigInt(new BigNumber(estGas).plus(20000n).toString())
  return overrides
}

export async function buildUnsignedTx(
  functionToSend: BaseContractMethod,
  args: any[],
  overrides: Record<string, any>
): Promise<TransactionRequest> {
  const tx = await functionToSend.populateTransaction(...args, overrides)
  return tx
}

export async function sendPreparedTx(
  signer: Signer,
  functionToSend: BaseContractMethod,
  args: any[],
  overrides: Record<string, any>
): Promise<TransactionResponse> {
  try {
    const trxReceipt = await functionToSend(...args, overrides)
    await trxReceipt.wait()
    return trxReceipt
  } catch (e) {
    LoggerInstance.error('Send tx error: ', e)
    return null
  }
}

export async function sendPreparedTransaction(
  signer: Signer,
  tx: TransactionRequest
): Promise<TransactionResponse> {
  try {
    const trxReceipt = await signer.sendTransaction(tx)
    await trxReceipt.wait()
    return trxReceipt
  } catch (e) {
    LoggerInstance.error('Send prepared tx error: ', e)
    return null
  }
}
