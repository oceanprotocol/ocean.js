import { MaxUint256, Signer } from 'ethers'
import ContractABI from '@oceanprotocol/contracts/artifacts/contracts/subsidy/OPFSubsidyProvider.sol/OPFSubsidyProvider.json'
import { AbiItem, TokenLimits } from '../@types/index.js'
import { Config } from '../config/index.js'
import { getTokenDecimals } from '../utils/ContractUtils.js'
import { SubsidyView } from './SubsidyView.js'

/**
 * Read-only wrapper for the `OPFSubsidyProvider` contract (Ocean Protocol Foundation
 * job-cost sponsorship). It extends {@link SubsidyView} — inheriting the standardized
 * `ISubsidyView` read surface (`subsidyBuckets`, `remainingSubsidy`, `quoteSubsidy`,
 * eligibility gates, `subsidyKind`/`version`, ERC-165 `supportsInterface`) — and adds the
 * OPF-specific getters: per-user rolling budgets (daily / weekly / monthly), token limits,
 * period indexes and reset timers.
 *
 * Owner/admin operations (`setTokenLimits`, `setAuthorizedEscrow`, `pause`,
 * `withdrawTokens`, ...) and the escrow-only `onSubsidyClaim` callback are intentionally
 * **not** wrapped.
 *
 * There is no single configured default address (a deployment can host several providers):
 * read addresses from `config.SubsidyProviders` and identify the OPF one via
 * `subsidyKind()`, then pass its address here.
 */
export class OPFSubsidyProvider extends SubsidyView {
  getDefaultAbi() {
    return ContractABI.abi as AbiItem[]
  }

  /**
   * Instantiate OPFSubsidyProvider class
   * @param {Signer} signer The signer object.
   * @param {string} address The contract address (required; discover it via
   * `config.SubsidyProviders` + `subsidyKind()`).
   * @param {string | number} [network] Network id or name
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract
   */
  constructor(
    signer: Signer,
    address: string,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    if (!address) {
      throw new Error('OPFSubsidyProvider requires a contract address')
    }
    super(signer, address, network, config, abi)
  }

  /**
   * Get the subsidy configuration for a token.
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<TokenLimits>} the token limits (amounts in human-readable units)
   */
  public async getTokenLimits(
    token: string,
    tokenDecimals?: number
  ): Promise<TokenLimits> {
    // Resolve decimals once to avoid three identical decimals() RPC calls below when
    // tokenDecimals is not supplied.
    const decimals = tokenDecimals ?? Number(await getTokenDecimals(this.signer, token))
    const limits = await this.contract.getTokenLimits(token)
    return {
      pctBps: limits.pctBps.toString(),
      daily: await this.unitsToAmount(token, limits.daily.toString(), decimals),
      weekly: await this.unitsToAmount(token, limits.weekly.toString(), decimals),
      monthly: await this.unitsToAmount(token, limits.monthly.toString(), decimals),
      enabled: limits.enabled
    }
  }

  /**
   * Get the remaining daily subsidy budget for a payer/token.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} remaining daily budget in human-readable token units, or
   * `MaxUint256` (as a string) when the daily cap is disabled (unlimited)
   */
  public async remainingDaily(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const remaining = await this.contract.remainingDaily(payer, token)
    return await this.formatRemaining(remaining, token, tokenDecimals)
  }

  /**
   * Get the remaining weekly subsidy budget for a payer/token.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} remaining weekly budget in human-readable token units, or
   * `MaxUint256` (as a string) when the weekly cap is disabled (unlimited)
   */
  public async remainingWeekly(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const remaining = await this.contract.remainingWeekly(payer, token)
    return await this.formatRemaining(remaining, token, tokenDecimals)
  }

  /**
   * Get the remaining monthly subsidy budget for a payer/token.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} remaining monthly budget in human-readable token units, or
   * `MaxUint256` (as a string) when the monthly cap is disabled (unlimited)
   */
  public async remainingMonthly(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const remaining = await this.contract.remainingMonthly(payer, token)
    return await this.formatRemaining(remaining, token, tokenDecimals)
  }

  /**
   * Get the daily subsidy already used by a payer/token.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} used daily amount, in human-readable token units
   */
  public async dailyUsedBy(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const used = await this.contract.dailyUsedBy(payer, token)
    return await this.unitsToAmount(token, used.toString(), tokenDecimals)
  }

  /**
   * Get the weekly subsidy already used by a payer/token.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} used weekly amount, in human-readable token units
   */
  public async weeklyUsedBy(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const used = await this.contract.weeklyUsedBy(payer, token)
    return await this.unitsToAmount(token, used.toString(), tokenDecimals)
  }

  /**
   * Get the monthly subsidy already used by a payer/token.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} used monthly amount, in human-readable token units
   */
  public async monthlyUsedBy(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const used = await this.contract.monthlyUsedBy(payer, token)
    return await this.unitsToAmount(token, used.toString(), tokenDecimals)
  }

  /**
   * Get the daily subsidy used by a payer/token at a specific timestamp.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number | string} timestamp Unix timestamp (seconds)
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} used daily amount, in human-readable token units
   */
  public async dailyUsedByAt(
    payer: string,
    token: string,
    timestamp: number | string,
    tokenDecimals?: number
  ): Promise<string> {
    const used = await this.contract.dailyUsedByAt(payer, token, timestamp)
    return await this.unitsToAmount(token, used.toString(), tokenDecimals)
  }

  /**
   * Get the weekly subsidy used by a payer/token at a specific timestamp.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number | string} timestamp Unix timestamp (seconds)
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} used weekly amount, in human-readable token units
   */
  public async weeklyUsedByAt(
    payer: string,
    token: string,
    timestamp: number | string,
    tokenDecimals?: number
  ): Promise<string> {
    const used = await this.contract.weeklyUsedByAt(payer, token, timestamp)
    return await this.unitsToAmount(token, used.toString(), tokenDecimals)
  }

  /**
   * Get the monthly subsidy used by a payer/token at a specific timestamp.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number | string} timestamp Unix timestamp (seconds)
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} used monthly amount, in human-readable token units
   */
  public async monthlyUsedByAt(
    payer: string,
    token: string,
    timestamp: number | string,
    tokenDecimals?: number
  ): Promise<string> {
    const used = await this.contract.monthlyUsedByAt(payer, token, timestamp)
    return await this.unitsToAmount(token, used.toString(), tokenDecimals)
  }

  /**
   * Get the access list gating payers: a payer must hold a token in this list to be
   * eligible. `ZERO_ADDRESS` means the payer gate is off.
   * @return {Promise<string>} the user access list address
   */
  public async getUserAccessList(): Promise<string> {
    return await this.contract.userAccessList()
  }

  /**
   * Get the access list gating nodes: a node must hold a token in this list to be
   * eligible. `ZERO_ADDRESS` means the node gate is off.
   * @return {Promise<string>} the node access list address
   */
  public async getNodeAccessList(): Promise<string> {
    return await this.contract.nodeAccessList()
  }

  /**
   * Get the current daily period index.
   * @return {Promise<string>} the current day index
   */
  public async currentDayIndex(): Promise<string> {
    return (await this.contract.currentDayIndex()).toString()
  }

  /**
   * Get the current weekly period index.
   * @return {Promise<string>} the current week index
   */
  public async currentWeekIndex(): Promise<string> {
    return (await this.contract.currentWeekIndex()).toString()
  }

  /**
   * Get the current monthly period index.
   * @return {Promise<string>} the current month index
   */
  public async currentMonthIndex(): Promise<string> {
    return (await this.contract.currentMonthIndex()).toString()
  }

  /**
   * Get the daily period index for a given timestamp.
   * @param {number | string} timestamp Unix timestamp (seconds)
   * @return {Promise<string>} the day index
   */
  public async getDayByTimestamp(timestamp: number | string): Promise<string> {
    return (await this.contract.getDayByTimestamp(timestamp)).toString()
  }

  /**
   * Get the weekly period index for a given timestamp.
   * @param {number | string} timestamp Unix timestamp (seconds)
   * @return {Promise<string>} the week index
   */
  public async getWeekByTimestamp(timestamp: number | string): Promise<string> {
    return (await this.contract.getWeekByTimestamp(timestamp)).toString()
  }

  /**
   * Get the monthly period index for a given timestamp.
   * @param {number | string} timestamp Unix timestamp (seconds)
   * @return {Promise<string>} the month index
   */
  public async getMonthByTimestamp(timestamp: number | string): Promise<string> {
    return (await this.contract.getMonthByTimestamp(timestamp)).toString()
  }

  /**
   * Get the number of seconds until the daily budget resets.
   * @return {Promise<string>} seconds until the daily reset
   */
  public async secondsUntilDayReset(): Promise<string> {
    return (await this.contract.secondsUntilDayReset()).toString()
  }

  /**
   * Get the number of seconds until the weekly budget resets.
   * @return {Promise<string>} seconds until the weekly reset
   */
  public async secondsUntilWeekReset(): Promise<string> {
    return (await this.contract.secondsUntilWeekReset()).toString()
  }

  /**
   * Get the number of seconds until the monthly budget resets.
   * @return {Promise<string>} seconds until the monthly reset
   */
  public async secondsUntilMonthReset(): Promise<string> {
    return (await this.contract.secondsUntilMonthReset()).toString()
  }

  /**
   * Formats a `remaining*` period budget. The contract returns `type(uint256).max` when
   * the period cap is disabled (unlimited); that sentinel is returned as-is (never run
   * through the token-decimals conversion, which would yield a meaningless huge number).
   * Finite values are converted to human-readable token units.
   * @param {bigint} remaining Raw remaining value from the contract
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} `MaxUint256` (as a string) when unlimited, otherwise the
   * remaining budget in human-readable token units
   */
  private async formatRemaining(
    remaining: bigint,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    if (remaining === MaxUint256) return MaxUint256.toString()
    return await this.unitsToAmount(token, remaining.toString(), tokenDecimals)
  }
}
