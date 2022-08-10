import Web3 from 'web3'
import BigNumber from 'bignumber.js'
import { Contract } from 'web3-eth-contract'
import { Config } from '../config'
import { minAbi, GASLIMIT_DEFAULT } from '.'

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

export async function networkSupportsEip1559(web3: Web3): Promise<boolean> {
  const feeHistory = await web3.eth.getFeeHistory(4, 'pending', [25, 50, 75])
  if (feeHistory && feeHistory.baseFeePerGas) {
    return true
  } else {
    return false
  }
}

export async function getFairGasPrice(web3: Web3, config: Config): Promise<string> {
  const x = new BigNumber(await web3.eth.getGasPrice())
  if (config && config.gasFeeMultiplier)
    return x
      .multipliedBy(config.gasFeeMultiplier)
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

  return amountFormatted.toString()
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
): Promise<any> {
  const estimatedGas = await functionToEstimateGas.apply(null, args).estimateGas(
    {
      from: from
    },
    (err, estGas) => (err ? GASLIMIT_DEFAULT : estGas)
  )
  return estimatedGas
}

/**
 * Send the transation on chain
 * @param {string} from account that calls the function
 * @param {any} estGas estimated gas for the transaction
 * @param {Web3} web3 web3 objcet
 * @param {Function} functionToEstimateGas function that we need to send
 * @param {...any[]} args arguments of the function
 * @return {Promise<any>} transaction receipt
 */
export async function sendTx(
  from: string,
  estGas: any,
  web3: Web3,
  functionToSend: Function,
  ...args: any[]
): Promise<any> {
  const sendTxValue: Record<string, any> = {
    from: from,
    gas: estGas + 1
  }
  const feeHistory = await web3.eth.getFeeHistory(1, 'pending', [75])
  if (feeHistory && feeHistory.baseFeePerGas && feeHistory.reward[0][0]) {
    sendTxValue.maxPriorityFeePerGas = new BigNumber(feeHistory.reward[0][0])
      .integerValue(BigNumber.ROUND_DOWN)
      .toString(10)

    sendTxValue.maxFeePerGas = new BigNumber(feeHistory.reward[0][0])
      .plus(new BigNumber(feeHistory.baseFeePerGas[0]).multipliedBy(2))
      .integerValue(BigNumber.ROUND_DOWN)
      .toString(10)
  } else {
    sendTxValue.gasPrice = await this.getFairGasPrice()
  }

  const trxReceipt = await functionToSend.apply(null, args).send(sendTxValue)
  return trxReceipt
}
