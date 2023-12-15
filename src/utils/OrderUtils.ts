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
  ConsumeMarketFee,
  ProviderFees,
  ZERO_ADDRESS,
  approveWei
} from '../index'
import Decimal from 'decimal.js'

/**
 * Orders an asset based on the specified pricing schema and configuration.
 * @param {Asset} asset - The asset to be ordered.
 * @param {Signer} consumerAccount - The signer account of the consumer.
 * @param {Config} config - The configuration settings.
 * @param {Datatoken} datatoken - The Datatoken instance.
 * @param {string} [providerUrl] - Optional the consumer address
 * @param {string} [consumerAccount] - Optional the consumer address
 * @param {ConsumeMarketFee} [consumeMarketOrderFee] - Optional consume market fee.
 *  @param {ProviderFees} [providerFees] - Optional provider fees
 * @param {string} [consumeMarketFixedSwapFee='0'] - Fixed swap fee for consuming the market.
 * @param {number} [datatokenIndex=0] - Index of the datatoken within the asset.
 * @param {number} [serviceIndex=0] - Index of the service within the asset.
 * @param {number} [fixedRateIndex=0] - Index of the fixed rate within the pricing schema.
 * @returns {Promise<void>} - A promise that resolves when the asset order process is completed.
 * @throws {Error} If the pricing schema is not supported or if required indexes are invalid.
 */
export async function orderAsset(
  asset: Asset,
  consumerAccount: Signer,
  config: Config,
  datatoken: Datatoken,
  providerUrl?: string,
  consumerAddress?: string,
  consumeMarketOrderFee?: ConsumeMarketFee,
  providerFees?: ProviderFees,
  consumeMarketFixedSwapFee: string = '0',
  datatokenIndex: number = 0,
  serviceIndex: number = 0,
  fixedRateIndex: number = 0
) {
  if (!consumeMarketOrderFee)
    consumeMarketOrderFee = {
      consumeMarketFeeAddress: '0x0000000000000000000000000000000000000000',
      consumeMarketFeeAmount: '0',
      consumeMarketFeeToken:
        asset.stats.price.tokenAddress || '0x0000000000000000000000000000000000000000'
    }

  if (!asset.datatokens[datatokenIndex].address)
    throw new Error(
      `The datatoken with index: ${datatokenIndex} does not exist for the asset with did: ${asset.id}`
    )

  if (!asset.services[serviceIndex].id)
    throw new Error(
      `There is no service with index: ${serviceIndex} defined for the asset with did: ${asset.id}`
    )

  const templateIndex = await datatoken.getId(asset.datatokens[datatokenIndex].address)
  const fixedRates = await datatoken.getFixedRates(
    asset.datatokens[datatokenIndex].address
  )
  const dispensers = await datatoken.getDispensers(
    asset.datatokens[datatokenIndex].address
  )
  const publishMarketFees = await datatoken.getPublishingMarketFee(
    asset.datatokens[datatokenIndex].address
  )
  const pricingType =
    fixedRates.length > 0 ? 'fixed' : dispensers.length > 0 ? 'free' : 'NOT_ALLOWED'

  const fees =
    providerFees ||
    (
      await ProviderInstance.initialize(
        asset.id,
        asset.services[serviceIndex].id,
        0,
        await consumerAccount.getAddress(),
        providerUrl || config.providerUri
      )
    ).providerFee

  if (
    fees &&
    fees.providerFeeAddress !== ZERO_ADDRESS &&
    fees.providerFeeAmount &&
    parseInt(fees.providerFeeAmount) > 0
  ) {
    try {
      await approveWei(
        consumerAccount,
        config,
        await consumerAccount.getAddress(),
        fees.providerFeeToken,
        asset.services[0].datatokenAddress,
        fees.providerFeeAmount
      )
    } catch (error) {
      throw new Error(`Failed to approve provider fee token ${fees.providerFeeToken}`)
    }
  }

  const orderParams = {
    consumer: consumerAddress || (await consumerAccount.getAddress()),
    serviceIndex,
    _providerFee: fees,
    _consumeMarketFee: consumeMarketOrderFee
  } as OrderParams
  switch (pricingType) {
    case 'free': {
      if (templateIndex === 1) {
        const dispenser = new Dispenser(config.dispenserAddress, consumerAccount)
        const dispenserTx = await dispenser.dispense(
          asset.datatokens[datatokenIndex].address,
          '1',
          await consumerAccount.getAddress()
        )
        if (!dispenserTx) {
          throw new Error(`Failed to dispense !`)
        }
        await dispenserTx.wait()
        return await datatoken.startOrder(
          asset.datatokens[datatokenIndex].address,
          orderParams.consumer,
          orderParams.serviceIndex,
          orderParams._providerFee,
          orderParams._consumeMarketFee
        )
      }
      if (templateIndex === 2) {
        return await datatoken.buyFromDispenserAndOrder(
          asset.services[serviceIndex].datatokenAddress,
          orderParams,
          config.dispenserAddress
        )
      }
      break
    }
    case 'fixed': {
      const fre = new FixedRateExchange(config.fixedRateExchangeAddress, consumerAccount)

      if (!fixedRates[fixedRateIndex].id)
        throw new Error(
          `There is no fixed rate exchange with index: ${serviceIndex} for the asset with did: ${asset.id}`
        )
      const fees = await fre.getFeesInfo(fixedRates[fixedRateIndex].id)
      const exchange = await fre.getExchange(fixedRates[fixedRateIndex].id)

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
          throw new Error(`Failed to appove ${exchange.baseToken} !`)
        }
        const freTx = await fre.buyDatatokens(
          exchange.exchangeId,
          '1',
          price,
          publishMarketFees.publishMarketFeeAddress,
          consumeMarketFixedSwapFee
        )
        const buyDtTx = await freTx.wait()
        if (!buyDtTx) {
          throw new Error(`Failed to buy datatoken from fixed rate!`)
        }
        return await datatoken.startOrder(
          asset.datatokens[datatokenIndex].address,
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
          asset.datatokens[datatokenIndex].address,
          price,
          false
        )

        const txApprove = typeof tx !== 'number' ? await tx.wait() : tx
        if (!txApprove) {
          return
        }
        const txBuy = await datatoken.buyFromFreAndOrder(
          asset.datatokens[datatokenIndex].address,
          orderParams,
          freParams
        )
        return txBuy
      }
      break
    }
    default:
      throw new Error('Pricing schema not supported !')
  }
}
