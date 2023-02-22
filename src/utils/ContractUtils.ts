import { ethers, Signer, providers, Contract, ContractFunction, BigNumber } from 'ethers'

import { Config } from '../config'
import { minAbi, GASLIMIT_DEFAULT, LoggerInstance, FEE_HISTORY_NOT_SUPPORTED } from '.'

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

export async function getFairGasPrice(
  signer: Signer,
  gasFeeMultiplier: number
): Promise<string> {
  const price = await (await signer.provider.getFeeData()).gasPrice
  const x = ethers.BigNumber.from(price.toString())
  if (gasFeeMultiplier) return x.mul(gasFeeMultiplier).toBigInt().toString(10)
  else return x.toString()
}

export async function getTokenDecimals(signer: Signer, token: string) {
  const tokenContract = new ethers.Contract(token, minAbi, signer)
  return tokenContract.decimals()
}
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
  return txReceipt.events.filter((log) => {
    return log.event === eventName
  })[0]
}

/**
 * Send the transation on chain
 * @param {string} from account that calls the function
 * @param {any} estGas estimated gas for the transaction
 * @param {Web3} web3 web3 objcet
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
    overrides = {
      maxPriorityFeePerGas: feeHistory.maxPriorityFeePerGas,
      maxFeePerGas: feeHistory.maxFeePerGas
    }
  } else {
    overrides = {
      gasPrice: feeHistory.gasPrice
    }
  }
  overrides.gasLimit = estGas
  try {
    const trxReceipt = await functionToSend(...args, overrides)
    return trxReceipt
  } catch (e) {
    return null
  }
  /* try {
    const feeHistory = await signer.provider,web3.eth.getFeeHistory(1, 'latest', [75])
    if (feeHistory && feeHistory?.baseFeePerGas?.[0] && feeHistory?.reward?.[0]?.[0]) {
      let aggressiveFee = new BigNumber(feeHistory?.reward?.[0]?.[0])
      if (gasFeeMultiplier > 1) {
        aggressiveFee = aggressiveFee.multipliedBy(gasFeeMultiplier)
      }

      sendTxValue.maxPriorityFeePerGas = aggressiveFee
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(10)

      sendTxValue.maxFeePerGas = aggressiveFee
        .plus(new BigNumber(feeHistory?.baseFeePerGas?.[0]).multipliedBy(2))
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(10)

      // if network is polygon and mumbai and fees is lower than the 30 gwei trashold, sets MIN_GAS_FEE_POLYGON
      sendTxValue.maxPriorityFeePerGas =
        (networkId === MUMBAI_NETWORK_ID || networkId === POLYGON_NETWORK_ID) &&
        new BigNumber(sendTxValue.maxPriorityFeePerGas).lte(
          new BigNumber(MIN_GAS_FEE_POLYGON)
        )
          ? new BigNumber(MIN_GAS_FEE_POLYGON)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(10)
          : sendTxValue.maxPriorityFeePerGas

      sendTxValue.maxFeePerGas =
        (networkId === MUMBAI_NETWORK_ID || networkId === POLYGON_NETWORK_ID) &&
        new BigNumber(sendTxValue.maxFeePerGas).lte(new BigNumber(MIN_GAS_FEE_POLYGON))
          ? new BigNumber(MIN_GAS_FEE_POLYGON)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(10)
          : sendTxValue.maxFeePerGas
    } else {
      sendTxValue.gasPrice = await getFairGasPrice(web3, gasFeeMultiplier)
    }
  } catch (err) {
    err?.message === FEE_HISTORY_NOT_SUPPORTED &&
      LoggerInstance.log(
        'Not able to use EIP 1559, getFeeHistory method not suported by network.'
      )
    sendTxValue.gasPrice = await getFairGasPrice(web3, gasFeeMultiplier)
  }

  const trxReceipt = await functionToSend.apply(null, args).send(sendTxValue)
  return trxReceipt
  */
}
