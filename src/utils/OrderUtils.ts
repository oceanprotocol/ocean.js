import { Signer } from 'ethers'
import {
  ProviderInstance,
  Datatoken,
  Dispenser,
  Config,
  OrderParams,
  Asset,
  FreOrderParams,
  approve,
  FixedRateExchange,
  ConsumeMarketFee
} from '../index'
import Decimal from 'decimal.js'

export async function orderAsset(
  asset: Asset,
  consumerAccount: Signer,
  config: Config,
  datatoken: Datatoken,
  consumeMarketOrderFee?: ConsumeMarketFee,
  consumeMarketFixedSwapFee: string = '0'
) {
  if (!consumeMarketOrderFee)
    consumeMarketOrderFee = {
      consumeMarketFeeAddress: '0x0000000000000000000000000000000000000000',
      consumeMarketFeeAmount: '0',
      consumeMarketFeeToken:
        asset.stats.price.tokenAddress || '0x0000000000000000000000000000000000000000'
    }
  const templateIndex = await datatoken.getId(asset.datatokens[0].address)
  const fixedRates = await datatoken.getFixedRates(asset.datatokens[0].address)
  const dispensers = await datatoken.getDispensers(asset.datatokens[0].address)
  const publishMarketFees = await datatoken.getPublishingMarketFee(
    asset.datatokens[0].address
  )
  const pricingType =
    fixedRates.length > 0 ? 'fixed' : dispensers.length > 0 ? 'free' : 'NOT_ALLOWED'
  const initializeData = await ProviderInstance.initialize(
    asset.id,
    asset.services[0].id,
    0,
    await consumerAccount.getAddress(),
    config.providerUri
  )

  const orderParams = {
    consumer: await consumerAccount.getAddress(),
    serviceIndex: 0,
    _providerFee: initializeData.providerFee,
    _consumeMarketFee: consumeMarketOrderFee
  } as OrderParams

  switch (pricingType) {
    case 'free': {
      if (templateIndex === 1) {
        const dispenser = new Dispenser(config.dispenserAddress, consumerAccount)
        const dispenserTx = await dispenser.dispense(
          asset.datatokens[0].address,
          '1',
          await consumerAccount.getAddress()
        )
        return await datatoken.startOrder(
          asset.datatokens[0].address,
          orderParams.consumer,
          orderParams.serviceIndex,
          orderParams._providerFee,
          orderParams._consumeMarketFee
        )
      }
      if (templateIndex === 2) {
        return await datatoken.buyFromDispenserAndOrder(
          asset.services[0].datatokenAddress,
          orderParams,
          config.dispenserAddress
        )
      }
      break
    }
    case 'fixed': {
      const fre = new FixedRateExchange(config.fixedRateExchangeAddress, consumerAccount)
      const fees = await fre.getFeesInfo(fixedRates[0].id)
      const exchange = await fre.getExchange(fixedRates[0].id)
      const { baseTokenAmount } = await fre.calcBaseInGivenDatatokensOut(
        fees.exchangeId,
        '1',
        consumeMarketOrderFee.consumeMarketFeeAmount
      )

      const price = new Decimal(+baseTokenAmount || 0)
        .add(new Decimal(consumeMarketOrderFee.consumeMarketFeeAmount || 0))
        .add(new Decimal(+publishMarketFees.publishMarketFeeAmount || 0))
        .toString()

      const freParams = {
        exchangeContract: config.fixedRateExchangeAddress,
        exchangeId: fees.exchangeId,
        maxBaseTokenAmount: price,
        baseTokenAddress: exchange.baseToken,
        baseTokenDecimals: parseInt(exchange.btDecimals) || 18,
        swapMarketFee: consumeMarketFixedSwapFee,
        marketFeeAddress: publishMarketFees.publishMarketFeeAddress
      } as FreOrderParams

      if (templateIndex === 1) {
        const tx: any = await approve(
          consumerAccount,
          config,
          await consumerAccount.getAddress(),
          exchange.baseToken,
          config.fixedRateExchangeAddress,
          price,
          false
        )
        const txApprove = typeof tx !== 'number' ? await tx.wait() : tx
        if (!txApprove) {
          return
        }
        const freTx = await fre.buyDatatokens(
          exchange.exchangeId,
          '1',
          price,
          publishMarketFees.publishMarketFeeAddress,
          consumeMarketFixedSwapFee
        )
        const buyDtTx = await freTx.wait()
        return await datatoken.startOrder(
          asset.datatokens[0].address,
          orderParams.consumer,
          orderParams.serviceIndex,
          orderParams._providerFee,
          orderParams._consumeMarketFee
        )
      }
      if (templateIndex === 2) {
        const tx: any = await approve(
          consumerAccount,
          config,
          await consumerAccount.getAddress(),
          exchange.baseToken,
          asset.datatokens[0].address,
          price,
          false
        )

        const txApprove = typeof tx !== 'number' ? await tx.wait() : tx
        if (!txApprove) {
          return
        }
        return await datatoken.buyFromFreAndOrder(
          asset.datatokens[0].address,
          orderParams,
          freParams
        )
      }
      break
    }
    default:
      throw new Error('Pricing schema not supported !')
  }
}
