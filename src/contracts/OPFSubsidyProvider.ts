import { Signer } from 'ethers'
import ContractABI from '@oceanprotocol/contracts/artifacts/contracts/subsidy/OPFSubsidyProvider.sol/OPFSubsidyProvider.json'
import { AbiItem, TokenLimits } from '../@types/index.js'
import { Config, ConfigHelper } from '../config/index.js'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'

/**
 * Read-only wrapper for the `OPFSubsidyProvider` contract (Ocean Protocol Foundation
 * job-cost sponsorship). It exposes the contract's view / quote surface — eligibility,
 * per-user rolling budgets (daily / weekly / monthly), token limits and subsidy quotes.
 *
 * Owner/admin operations (`setTokenLimits`, `setAuthorizedEscrow`, `pause`,
 * `withdrawTokens`, ...) and the escrow-only `onSubsidyClaim` callback are intentionally
 * **not** wrapped.
 *
 * The contract address is a constructor parameter and defaults to the configured
 * `OPFSubsidyProvider` address, so the same wrapper can query any contract that shares
 * this read interface simply by passing a different address.
 */
export class OPFSubsidyProvider extends SmartContractWithAddress {
  getDefaultAbi() {
    return ContractABI.abi as AbiItem[]
  }

  /**
   * Instantiate OPFSubsidyProvider class
   * @param {Signer} signer The signer object.
   * @param {string} [address] The contract address. Defaults to the configured
   * `OPFSubsidyProvider` address when omitted, so callers can point the wrapper at any
   * contract exposing the same read interface by passing an address.
   * @param {string | number} [network] Network id or name
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract
   */
  constructor(
    signer: Signer,
    address?: string,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    const resolvedConfig = config || new ConfigHelper().getConfig(network)
    const resolvedAddress = address || resolvedConfig?.OPFSubsidyProvider
    if (!resolvedAddress) {
      throw new Error(
        'OPFSubsidyProvider address is required: pass one explicitly or use a network with a configured OPFSubsidyProvider address'
      )
    }
    super(resolvedAddress, signer, network, resolvedConfig, abi)
    this.abi = abi || this.getDefaultAbi()
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
    const limits = await this.contract.getTokenLimits(token)
    return {
      pctBps: limits.pctBps.toString(),
      daily: await this.unitsToAmount(token, limits.daily.toString(), tokenDecimals),
      weekly: await this.unitsToAmount(token, limits.weekly.toString(), tokenDecimals),
      monthly: await this.unitsToAmount(token, limits.monthly.toString(), tokenDecimals),
      enabled: limits.enabled
    }
  }

  /**
   * Quote the subsidy a job would receive, without changing state.
   * @param {string} node Node address
   * @param {string} payer Payer address
   * @param {number | string} jobType Job type identifier
   * @param {string} token Token address
   * @param {string} amount Job cost, in human-readable token units
   * @param {string} subsidyNeeded Subsidy requested, in human-readable token units
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} the granted subsidy, in human-readable token units
   */
  public async quoteSubsidy(
    node: string,
    payer: string,
    jobType: number | string,
    token: string,
    amount: string,
    subsidyNeeded: string,
    tokenDecimals?: number
  ): Promise<string> {
    const amountUnits = await this.amountToUnits(token, amount, tokenDecimals)
    const subsidyNeededUnits = await this.amountToUnits(
      token,
      subsidyNeeded,
      tokenDecimals
    )
    const quote = await this.contract.quoteSubsidy(
      node,
      payer,
      jobType,
      token,
      amountUnits,
      subsidyNeededUnits
    )
    return this.unitsToAmount(token, quote.toString(), tokenDecimals)
  }

  /**
   * Get the remaining total subsidy budget for a payer/token.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} remaining subsidy, in human-readable token units
   */
  public async remainingSubsidy(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const remaining = await this.contract.remainingSubsidy(payer, token)
    return this.unitsToAmount(token, remaining.toString(), tokenDecimals)
  }

  /**
   * Get the remaining daily subsidy budget for a payer/token.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} remaining daily budget, in human-readable token units
   */
  public async remainingDaily(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const remaining = await this.contract.remainingDaily(payer, token)
    return this.unitsToAmount(token, remaining.toString(), tokenDecimals)
  }

  /**
   * Get the remaining weekly subsidy budget for a payer/token.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} remaining weekly budget, in human-readable token units
   */
  public async remainingWeekly(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const remaining = await this.contract.remainingWeekly(payer, token)
    return this.unitsToAmount(token, remaining.toString(), tokenDecimals)
  }

  /**
   * Get the remaining monthly subsidy budget for a payer/token.
   * @param {string} payer Payer address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} remaining monthly budget, in human-readable token units
   */
  public async remainingMonthly(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const remaining = await this.contract.remainingMonthly(payer, token)
    return this.unitsToAmount(token, remaining.toString(), tokenDecimals)
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
    return this.unitsToAmount(token, used.toString(), tokenDecimals)
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
    return this.unitsToAmount(token, used.toString(), tokenDecimals)
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
    return this.unitsToAmount(token, used.toString(), tokenDecimals)
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
    return this.unitsToAmount(token, used.toString(), tokenDecimals)
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
    return this.unitsToAmount(token, used.toString(), tokenDecimals)
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
    return this.unitsToAmount(token, used.toString(), tokenDecimals)
  }

  /**
   * Get the token balance available for subsidies held by the contract.
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} available balance, in human-readable token units
   */
  public async availableBalance(token: string, tokenDecimals?: number): Promise<string> {
    const balance = await this.contract.availableBalance(token)
    return this.unitsToAmount(token, balance.toString(), tokenDecimals)
  }

  /**
   * Check whether a payer is allowed to receive subsidies.
   * @param {string} payer Payer address
   * @return {Promise<boolean>} true if the payer is allowed
   */
  public async isUserAllowed(payer: string): Promise<boolean> {
    return this.contract.isUserAllowed(payer)
  }

  /**
   * Check whether a node is allowed to receive subsidies.
   * @param {string} node Node address
   * @return {Promise<boolean>} true if the node is allowed
   */
  public async isNodeAllowed(node: string): Promise<boolean> {
    return this.contract.isNodeAllowed(node)
  }

  /**
   * Get the list of allowed job types.
   * @return {Promise<string[]>} allowed job type identifiers
   */
  public async getAllowedJobTypes(): Promise<string[]> {
    const jobTypes = await this.contract.getAllowedJobTypes()
    return jobTypes.map((jobType: bigint) => jobType.toString())
  }

  /**
   * Check whether a job type is subsidised.
   * @param {number | string} jobType Job type identifier
   * @return {Promise<boolean>} true if the job type is subsidised
   */
  public async isJobTypeSubsidized(jobType: number | string): Promise<boolean> {
    return this.contract.isJobTypeSubsidized(jobType)
  }

  /**
   * Get the access list gating payers: a payer must hold a token in this list to be
   * eligible. `ZERO_ADDRESS` means the payer gate is off.
   * @return {Promise<string>} the user access list address
   */
  public async getUserAccessList(): Promise<string> {
    return this.contract.userAccessList()
  }

  /**
   * Get the access list gating nodes: a node must hold a token in this list to be
   * eligible. `ZERO_ADDRESS` means the node gate is off.
   * @return {Promise<string>} the node access list address
   */
  public async getNodeAccessList(): Promise<string> {
    return this.contract.nodeAccessList()
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
}
