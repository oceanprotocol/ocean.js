import Web3 from 'web3'
import BigNumber from 'bignumber.js'
import { Contract } from 'web3-eth-contract'
import { Config } from '../config'
import { minAbi, GASLIMIT_DEFAULT, LoggerInstance, FEE_HISTORY_NOT_SUPPORTED } from '.'
import { TransactionReceipt } from 'web3-core'

const MIN_GAS_FEE_POLYGON = 30000000000 // minimum recommended 30 gwei polygon main and mumbai fees
const POLYGON_NETWORK_ID = 137
const MUMBAI_NETWORK_ID = 80001

export function setContractDefaults(contract: Contract, config: Config): Contract {
  if (config) {
    if (config.transactionBlockTimeout)
      contract.transactionBlockTimeout = config.transactionBlockTimeout
    if (config.transactionConfirmationBlocks)
      contract.transactionConfirmationBlocks = config.transactionConfirmationBlocks
    if (config.transactionPollingTimeout)
      contract.transactionPollingTimeout = config.transactionPollingTimeout
  }
  return contract
}

export async function getFairGasPrice(
  web3: Web3,
  gasFeeMultiplier: number
): Promise<string> {
  const x = new BigNumber(await web3.eth.getGasPrice())
  if (gasFeeMultiplier)
    return x
      .multipliedBy(gasFeeMultiplier)
      .integerValue(BigNumber.ROUND_DOWN)
      .toString(10)
  else return x.toString(10)
}

export async function unitsToAmount(
  web3: Web3,
  token: string,
  amount: string,
  tokenDecimals?: number
): Promise<string> {
  const tokenContract = new web3.eth.Contract(minAbi, token)
  let decimals = tokenDecimals || (await tokenContract.methods.decimals().call())
  if (decimals === '0') {
    decimals = 18
  }

  const amountFormatted = new BigNumber(amount).div(
    new BigNumber(10).exponentiatedBy(decimals)
  )

  BigNumber.config({ EXPONENTIAL_AT: 50 })
  return amountFormatted.toString()
}

export async function amountToUnits(
  web3: Web3,
  token: string,
  amount: string,
  tokenDecimals?: number
): Promise<string> {
  const tokenContract = new web3.eth.Contract(minAbi, token)
  let decimals = tokenDecimals || (await tokenContract.methods.decimals().call())
  if (decimals === '0') {
    decimals = 18
  }
  BigNumber.config({ EXPONENTIAL_AT: 50 })

  const amountFormatted = new BigNumber(amount).times(
    new BigNumber(10).exponentiatedBy(decimals)
  )
  return amountFormatted.toFixed(0)
}

/**
 * Estimates the gas used when a function would be executed on chain
 * @param {string} from account that calls the function
 * @param {Function} functionToEstimateGas function that we need to estimate the gas
 * @param {...any[]} args arguments of the function
 * @return {Promise<number>} gas cost of the function
 */
export async function calculateEstimatedGas(
  from: string,
  functionToEstimateGas: Function,
  ...args: any[]
): Promise<number> {
  const estimatedGas = await functionToEstimateGas
    .apply(null, args)
    .estimateGas({ from }, (err, estGas) => (err ? GASLIMIT_DEFAULT : estGas))
  return estimatedGas
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
  from: string,
  estGas: number,
  web3: Web3,
  gasFeeMultiplier: number,
  functionToSend: Function,
  ...args: any[]
): Promise<TransactionReceipt> {
  const sendTxValue: Record<string, any> = {
    from,
    gas: estGas + 1
  }
  const networkId = await web3.eth.getChainId()
  try {
    const feeHistory = await web3.eth.getFeeHistory(1, 'latest', [75])
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
}
