import { Signer } from 'ethers'
import Decimal from 'decimal.js'
import { Config } from '../config/Config.js'
import { Datatoken } from '../contracts/Datatoken.js'
import { ConsumeMarketFee, OrderParams } from '../@types/Datatoken.js'
import { MaxProviderFee, ProviderFees, ProviderFeePreview } from '../@types/Provider.js'
import { ProviderInstance } from '../services/Provider.js'
import { ZERO_ADDRESS } from './Constants.js'
import { approve, approveWei } from './TokenUtils.js'
import { amountToUnits, unitsToAmount } from './ContractUtils.js'
import { Dispenser } from '../contracts/Dispenser.js'
import { FixedRateExchange } from '../contracts/FixedRateExchange.js'
import { FreOrderParams } from '../@types/FixedPrice.js'
import { DDOManager, type Asset } from '@oceanprotocol/ddo-js'

/**
 * Enforces an optional, caller-supplied ceiling on the provider fee before any approval or
 * transaction is made. The ceiling is OPT-IN:
 *  - when `maxProviderFee` is omitted, or its `providerFeeToken` is the zero address, no ceiling
 *    is applied and the fee is accepted as returned (intentional "not configured" opt-out — this
 *    is insecure against untrusted nodes/DDOs, see `orderAsset`);
 *  - when a non-zero `providerFeeToken` is supplied the caller intends to enforce a bound, so this
 *    FAILS CLOSED: a missing/empty amount, a mismatched fee token, a non-integer fee from the node,
 *    or a fee above the ceiling all throw rather than silently skipping the check.
 * A zero (or absent) node fee is a no-op (nothing is charged), so it never throws on token mismatch.
 * @param {ProviderFees} fees - The resolved provider fee (node-returned or caller-supplied).
 * @param {MaxProviderFee} [maxProviderFee] - The optional ceiling (token + human-readable amount).
 * @param {Signer} signer - Signer used to read the ceiling token's decimals.
 * @throws {Error} When the fee violates a configured ceiling, or the ceiling input is malformed.
 */
export async function assertProviderFeeWithinCeiling(
  fees: ProviderFees,
  maxProviderFee: MaxProviderFee | undefined,
  signer: Signer
): Promise<void> {
  // Opt-out: no ceiling configured.
  if (!maxProviderFee || maxProviderFee.providerFeeToken === ZERO_ADDRESS) return

  // Determine the amount actually being charged. A zero/absent fee is nothing to bound.
  let feeBaseUnits: bigint
  try {
    feeBaseUnits = fees?.providerFeeAmount ? BigInt(fees.providerFeeAmount) : 0n
  } catch {
    throw new Error(
      `Provider returned a non-integer providerFeeAmount "${fees?.providerFeeAmount}"`
    )
  }
  if (feeBaseUnits === 0n) return

  // A ceiling token was set, so the caller means to enforce a bound: fail closed on partial input.
  if (
    maxProviderFee.providerFeeAmount === undefined ||
    maxProviderFee.providerFeeAmount === null ||
    maxProviderFee.providerFeeAmount === ''
  ) {
    throw new Error(
      'maxProviderFee.providerFeeAmount is required when maxProviderFee.providerFeeToken is set'
    )
  }

  if (
    fees.providerFeeToken?.toLowerCase() !== maxProviderFee.providerFeeToken.toLowerCase()
  ) {
    throw new Error(
      `Provider fee token ${fees.providerFeeToken} does not match the allowed token ${maxProviderFee.providerFeeToken}`
    )
  }

  let maxAllowedBaseUnits: string
  try {
    maxAllowedBaseUnits = await amountToUnits(
      signer,
      maxProviderFee.providerFeeToken,
      maxProviderFee.providerFeeAmount
    )
  } catch (error) {
    throw new Error(
      `Invalid maxProviderFee.providerFeeAmount "${maxProviderFee.providerFeeAmount}": ${
        (error as Error).message
      }`
    )
  }

  if (feeBaseUnits > BigInt(maxAllowedBaseUnits)) {
    throw new Error(
      `Provider fee amount ${fees.providerFeeAmount} (base units) exceeds the allowed maximum of ${maxAllowedBaseUnits} (base units, ${maxProviderFee.providerFeeAmount} tokens)`
    )
  }
}

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
 * @param {MaxProviderFee} [maxProviderFee] - Optional, OPT-IN ceiling for the provider fee
 *  (token + human-readable amount). Applies to both node-returned and caller-supplied provider fees.
 *  When a non-zero `providerFeeToken` is given, the call throws BEFORE any approval or transaction if
 *  the node's fee token differs or its amount exceeds the ceiling (and fails closed on a missing
 *  ceiling amount). Omitting `maxProviderFee`, or passing the zero address as its token, disables the
 *  check and accepts whatever fee the node returns — which is INSECURE against untrusted nodes/DDOs;
 *  always pass a real ceiling unless the node is fully trusted.
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
  fixedRateIndex: number = 0,
  maxProviderFee?: MaxProviderFee
) {
  const ddoInstance = DDOManager.getDDOClass(asset)
  const { datatokens } = ddoInstance.getAssetFields()
  const { chainId: assetChainId, services } = ddoInstance.getDDOFields()
  if (!consumeMarketOrderFee)
    consumeMarketOrderFee = {
      consumeMarketFeeAddress: '0x0000000000000000000000000000000000000000',
      consumeMarketFeeAmount: '0',
      consumeMarketFeeToken: '0x0000000000000000000000000000000000000000'
    }
  const chainID = (await consumerAccount.provider.getNetwork()).chainId
  if (assetChainId !== Number(chainID)) {
    throw new Error('Chain ID from DDO is different than the configured network.')
  }

  if (!datatokens[datatokenIndex].address)
    throw new Error(
      `The datatoken with index: ${datatokenIndex} does not exist for the asset with did: ${asset.id}`
    )

  if (!services[serviceIndex].id)
    throw new Error(
      `There is no service with index: ${serviceIndex} defined for the asset with did: ${asset.id}`
    )

  // The ordered datatoken must be the one that authorizes the requested service, otherwise the
  // order would pay for and unlock a different datatoken. Reject the mismatch before approving
  // fees or sending any transaction.
  if (
    services[serviceIndex].datatokenAddress?.toLowerCase() !==
    datatokens[datatokenIndex].address.toLowerCase()
  )
    throw new Error('Selected datatoken does not match the selected service.')

  const templateIndex = await datatoken.getId(datatokens[datatokenIndex].address)

  const fixedRates = await datatoken.getFixedRates(datatokens[datatokenIndex].address)
  const dispensers = await datatoken.getDispensers(datatokens[datatokenIndex].address)
  const publishMarketFees = await datatoken.getPublishingMarketFee(
    datatokens[datatokenIndex].address
  )
  const pricingType =
    fixedRates.length > 0 ? 'fixed' : dispensers.length > 0 ? 'free' : 'NOT_ALLOWED'

  const fees =
    providerFees ||
    (
      await ProviderInstance.initialize(
        asset.id,
        services[serviceIndex].id,
        0,
        await consumerAccount.getAddress(),
        providerUrl || config.oceanNodeUri
      )
    ).providerFee

  // Enforce the opt-in provider-fee ceiling BEFORE any approval or transaction. This runs
  // independently of the address gate below so a hostile node cannot skip the check by
  // returning a zero recipient alongside a large amount.
  await assertProviderFeeWithinCeiling(fees, maxProviderFee, consumerAccount)

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
        datatokens[datatokenIndex].address,
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
          datatokens[datatokenIndex].address,
          '1',
          await consumerAccount.getAddress()
        )
        if (!dispenserTx) {
          throw new Error(`Failed to dispense !`)
        }
        await dispenserTx.wait()
        return await datatoken.startOrder(
          datatokens[datatokenIndex].address,
          orderParams.consumer,
          orderParams.serviceIndex,
          orderParams._providerFee,
          orderParams._consumeMarketFee
        )
      }
      if (templateIndex === 2 || templateIndex === 4) {
        return await datatoken.buyFromDispenserAndOrder(
          datatokens[datatokenIndex].address,
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
          throw new Error(`Failed to approve ${exchange.baseToken} !`)
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
          datatokens[datatokenIndex].address,
          orderParams.consumer,
          orderParams.serviceIndex,
          orderParams._providerFee,
          orderParams._consumeMarketFee
        )
      }
      if (templateIndex === 2 || templateIndex === 4) {
        const tx: any = await approve(
          consumerAccount,
          config,
          await consumerAccount.getAddress(),
          exchange.baseToken,
          datatokens[datatokenIndex].address,
          price,
          false
        )
        if (!tx) {
          throw new Error(`Failed to approve ${exchange.baseToken} !`)
        }
        const txApprove = typeof tx !== 'number' ? await tx.wait() : tx
        if (!txApprove) {
          throw new Error(`Failed to confirm/mine approval transaction!`)
        }
        const txBuy = await datatoken.buyFromFreAndOrder(
          datatokens[datatokenIndex].address,
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

/**
 * Read-only preview of the provider fee for an asset service. Sends no transaction or approval.
 *
 * ADVISORY ONLY — this preview is NOT a security control and MUST NOT be the basis of a spend
 * decision. The returned token, amount and recipient come from the node's `initialize` response
 * and are attacker-controlled when the node/DDO is untrusted. `providerFeeAmountFormatted` is
 * derived from the (possibly hostile) fee token's `decimals()`, so a malicious token can make a
 * large fee render as small — always cross-check `providerFeeAmount` (base units). The preview
 * also issues its own `initialize` call, so the fee a later `orderAsset` actually pays can differ
 * (TOCTOU). The real protection is `orderAsset`'s `maxProviderFee` ceiling, set from an
 * independent trust anchor — not from this preview.
 * @param {Asset} asset - The asset.
 * @param {Signer} consumerAccount - The consumer signer (used for address and decimals lookup).
 * @param {Config} config - The configuration settings.
 * @param {string} [providerUrl] - Optional node URL, defaults to config.oceanNodeUri.
 * @param {number} [serviceIndex=0] - Index of the service within the asset.
 * @returns {Promise<ProviderFeePreview>} - The provider fee as returned by the node.
 */
export async function getProviderFees(
  asset: Asset,
  consumerAccount: Signer,
  config: Config,
  providerUrl?: string,
  serviceIndex: number = 0
): Promise<ProviderFeePreview> {
  const ddoInstance = DDOManager.getDDOClass(asset)
  const { services } = ddoInstance.getDDOFields()
  if (!services[serviceIndex]?.id)
    throw new Error(
      `There is no service with index: ${serviceIndex} defined for the asset with did: ${asset.id}`
    )
  const { providerFee } = await ProviderInstance.initialize(
    asset.id,
    services[serviceIndex].id,
    0,
    await consumerAccount.getAddress(),
    providerUrl || config.oceanNodeUri
  )
  return buildProviderFeePreview(providerFee, (token, amount) =>
    unitsToAmount(consumerAccount, token, amount)
  )
}

/**
 * Pure assembly of a `ProviderFeePreview` from a node-returned provider fee. Extracted from
 * `getProviderFees` so the defaulting, the "is a fee actually charged?" predicate, and the
 * hostile-token fallback are unit-testable without a live node. `formatAmount` is injected (the
 * production caller passes `unitsToAmount`), which also lets callers substitute a decimals source.
 * Never throws: a malformed amount yields "not charged", and a `formatAmount` that rejects (e.g. a
 * token that reverts on `decimals()`) falls back to the raw base-unit amount.
 * @param {ProviderFees} [providerFee] - The fee as returned by the node (may be undefined/partial).
 * @param {(token: string, amount: string) => Promise<string>} formatAmount - Base-units → human.
 * @returns {Promise<ProviderFeePreview>} - The normalized, defaulted preview.
 */
export async function buildProviderFeePreview(
  providerFee: ProviderFees | undefined,
  formatAmount: (token: string, amount: string) => Promise<string>
): Promise<ProviderFeePreview> {
  const token = providerFee?.providerFeeToken || ZERO_ADDRESS
  const amount = providerFee?.providerFeeAmount || '0'
  const address = providerFee?.providerFeeAddress || ZERO_ADDRESS
  // Ocean Node returns a numeric `validUntil` for a service with a nonzero timeout, so normalize it
  // to keep ProviderFeePreview.validUntil an honest `string`.
  const validUntil = String(providerFee?.validUntil || '0')

  // Mirror orderAsset's "is a fee actually charged?" predicate so the preview never reports a fee
  // that would not be paid: a zero recipient or a zero amount means no charge.
  let isCharged: boolean
  try {
    isCharged = token !== ZERO_ADDRESS && address !== ZERO_ADDRESS && BigInt(amount) > 0n
  } catch {
    isCharged = false
  }

  let formatted = '0'
  if (isCharged) {
    try {
      formatted = await formatAmount(token, amount)
    } catch {
      // A hostile/invalid token can revert on decimals(); fall back to the raw base-unit amount
      // rather than throwing the whole preview or silently showing 0.
      formatted = amount
    }
  }

  return {
    providerFeeToken: token,
    providerFeeAmount: amount,
    providerFeeAmountFormatted: formatted,
    providerFeeAddress: address,
    validUntil
  }
}
