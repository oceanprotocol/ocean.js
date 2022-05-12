import Web3 from 'web3'
import BigNumber from 'bignumber.js'
import { Contract } from 'web3-eth-contract'
import { generateDtName } from './DatatokenName'
import {
  Erc20CreateParams,
  FreCreationParams,
  FreOrderParams,
  PoolCreationParams
} from '../@types'
import { Config } from '../models'
import { minAbi } from './minAbi'
import LoggerInstance from './Logger'
import { GASLIMIT_DEFAULT, ZERO_ADDRESS } from './Constants'

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

export async function getFairGasPrice(web3: Web3, config: Config): Promise<string> {
  const x = new BigNumber(await web3.eth.getGasPrice())
  if (config && config.gasFeeMultiplier)
    return x
      .multipliedBy(config.gasFeeMultiplier)
      .integerValue(BigNumber.ROUND_DOWN)
      .toString(10)
  else return x.toString(10)
}

export function getErcCreationParams(ercParams: Erc20CreateParams): any {
  let name: string, symbol: string
  // Generate name & symbol if not present
  if (!ercParams.name || !ercParams.symbol) {
    ;({ name, symbol } = generateDtName())
  }
  return {
    templateIndex: ercParams.templateIndex,
    strings: [ercParams.name || name, ercParams.symbol || symbol],
    addresses: [
      ercParams.minter,
      ercParams.paymentCollector,
      ercParams.mpFeeAddress,
      ercParams.feeToken
    ],
    uints: [Web3.utils.toWei(ercParams.cap), Web3.utils.toWei(ercParams.feeAmount)],
    bytess: []
  }
}

export function getFreOrderParams(freParams: FreOrderParams): any {
  return {
    exchangeContract: freParams.exchangeContract,
    exchangeId: freParams.exchangeId,
    maxBaseTokenAmount: Web3.utils.toWei(freParams.maxBaseTokenAmount),
    swapMarketFee: Web3.utils.toWei(freParams.swapMarketFee),
    marketFeeAddress: freParams.marketFeeAddress
  }
}

export function getFreCreationParams(freParams: FreCreationParams): any {
  if (!freParams.allowedConsumer) freParams.allowedConsumer = ZERO_ADDRESS
  const withMint = freParams.withMint ? 1 : 0

  return {
    fixedPriceAddress: freParams.fixedRateAddress,
    addresses: [
      freParams.baseTokenAddress,
      freParams.owner,
      freParams.marketFeeCollector,
      freParams.allowedConsumer
    ],
    uints: [
      freParams.baseTokenDecimals,
      freParams.datatokenDecimals,
      Web3.utils.toWei(freParams.fixedRate),
      Web3.utils.toWei(freParams.marketFee),
      withMint
    ]
  }
}

export async function getPoolCreationParams(
  web3: Web3,
  poolParams: PoolCreationParams
): Promise<any> {
  return {
    addresses: [
      poolParams.ssContract,
      poolParams.baseTokenAddress,
      poolParams.baseTokenSender,
      poolParams.publisherAddress,
      poolParams.marketFeeCollector,
      poolParams.poolTemplateAddress
    ],
    ssParams: [
      Web3.utils.toWei(poolParams.rate),
      poolParams.baseTokenDecimals,
      Web3.utils.toWei(poolParams.vestingAmount),
      poolParams.vestedBlocks,
      await amountToUnits(
        web3,
        poolParams.baseTokenAddress,
        poolParams.initialBaseTokenLiquidity
      )
    ],
    swapFees: [
      Web3.utils.toWei(poolParams.swapFeeLiquidityProvider),
      Web3.utils.toWei(poolParams.swapFeeMarketRunner)
    ]
  }
}
export async function unitsToAmount(
  web3: Web3,
  token: string,
  amount: string,
  tokenDecimals?: number
): Promise<string> {
  try {
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
  } catch (e) {
    LoggerInstance.error(`ERROR: FAILED TO CALL DECIMALS(), USING 18' : ${e.message}`)
  }
}

export async function amountToUnits(
  web3: Web3,
  token: string,
  amount: string,
  tokenDecimals?: number
): Promise<string> {
  try {
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
  } catch (e) {
    LoggerInstance.error(`ERROR: FAILED TO CALL DECIMALS(), USING 18', ${e.message}`)
  }
}

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
): Promise<any> {
  let estimatedGas = GASLIMIT_DEFAULT
  try {
    estimatedGas = await functionToEstimateGas.apply(null, args).estimateGas(
      {
        from: from
      },
      (err, estGas) => {
        if (err) {
          console.log('ERROR ESTIMATING GAS: ' + err)
          return GASLIMIT_DEFAULT
        } else {
          console.log('OK ESTIMATING GAS: ' + estGas)
          return estGas
        }
      }
    )
  } catch (e) {
    LoggerInstance.error(`ERROR: Estimate gas failed!`, e)
  }
  return estimatedGas
}
