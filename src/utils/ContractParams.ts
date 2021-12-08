import { Erc20CreateParams, FreCreationParams, PoolCreationParams } from '../interfaces'
import Web3 from 'web3'
import { generateDtName } from './DatatokenName'

export function getErcCreationParams(ercParams: Erc20CreateParams, web3: Web3): any {
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
    uints: [web3.utils.toWei(ercParams.cap), web3.utils.toWei(ercParams.feeAmount)],
    bytess: []
  }
}

export function getFreCreationParams(freParams: FreCreationParams, web3: Web3): any {
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
      freParams.dataTokenDecimals,
      freParams.fixedRate,
      freParams.marketFee,
      withMint
    ]
  }
}

export function getPoolCreationParams(poolParams: PoolCreationParams, web3: Web3): any {
  return {
    addresses: [
      poolParams.ssContract,
      poolParams.basetokenAddress,
      poolParams.basetokenSender,
      poolParams.publisherAddress,
      poolParams.marketFeeCollector,
      poolParams.poolTemplateAddress
    ],
    ssParams: [
      web3.utils.toWei(poolParams.rate),
      poolParams.basetokenDecimals,
      web3.utils.toWei(poolParams.vestingAmount),
      poolParams.vestedBlocks,
      web3.utils.toWei(poolParams.initialBasetokenLiquidity)
    ],
    swapFees: [poolParams.swapFeeLiquidityProvider, poolParams.swapFeeMarketPlaceRunner]
  }
}
