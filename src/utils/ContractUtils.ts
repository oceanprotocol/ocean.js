import Web3 from 'web3'
import BigNumber from 'bignumber.js'
import { Contract } from 'web3-eth-contract'
import { generateDtName } from './DatatokenName'
import { Erc20CreateParams, FreCreationParams, PoolCreationParams } from '../interfaces'
import { Config } from '../models'
import { AbiItem } from 'web3-utils/types'
import { minAbi } from './minAbi'

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
      ercParams.feeManager,
      ercParams.mpFeeAddress,
      ercParams.feeToken
    ],
    uints: [Web3.utils.toWei(ercParams.cap), Web3.utils.toWei(ercParams.feeAmount)],
    bytess: []
  }
}

export function getFreCreationParams(freParams: FreCreationParams): any {
  if (!freParams.allowedConsumer)
    freParams.allowedConsumer = '0x0000000000000000000000000000000000000000'
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
      freParams.fixedRate,
      freParams.marketFee,
      withMint
    ]
  }
}

export function getPoolCreationParams(poolParams: PoolCreationParams): any {
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
      Web3.utils.toWei(poolParams.initialBaseTokenLiquidity)
    ],
    swapFees: [poolParams.swapFeeLiquidityProvider, poolParams.swapFeeMarketRunner]
  }
}
export async function unitsToAmount(
  web3: Web3,
  token: string,
  amount: string
): Promise<string> {
  try {
    const tokenContract = new web3.eth.Contract(minAbi, token)
    let decimals = await tokenContract.methods.decimals().call()
    if (decimals === '0') {
      decimals = 18
    }
    const amountFormatted = new BigNumber(parseInt(amount) / 10 ** decimals)

    return amountFormatted.toString()
  } catch (e) {
    this.logger.error('ERROR: FAILED TO CALL DECIMALS(), USING 18')
  }
}

export async function amountToUnits(
  web3: Web3,
  token: string,
  amount: string
): Promise<string> {
  try {
    const tokenContract = new web3.eth.Contract(minAbi, token)
    let decimals = await tokenContract.methods.decimals().call()
    if (decimals === '0') {
      decimals = 18
    }
    const amountFormatted = new BigNumber(parseInt(amount) * 10 ** decimals)
    BigNumber.config({ EXPONENTIAL_AT: 50 })
    return amountFormatted.toString()
  } catch (e) {
    this.logger.error('ERROR: FAILED TO CALL DECIMALS(), USING 18')
  }
}
