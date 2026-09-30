import { Signer } from 'ethers'
import ContractABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/ISubsidyView.sol/ISubsidyView.json'
import {
  AbiItem,
  SubsidyBucket,
  SubsidyBucketReport,
  SubsidyKind,
  SubsidyPeriod,
  SubsidyQuote,
  ISUBSIDY_PROVIDER_INTERFACE_ID,
  ISUBSIDY_VIEW_INTERFACE_ID
} from '../@types/index.js'
import { Config } from '../config/index.js'
import { getTokenDecimals } from '../utils/ContractUtils.js'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'

/**
 * Read-only wrapper for any contract implementing the `ISubsidyView` interface — the
 * standardized view that every Ocean subsidy provider exposes (OPF rolling-window,
 * one-time onboarding credits, and future providers). It lets a dashboard query subsidy
 * availability uniformly, regardless of the underlying provider, and discover providers
 * through ERC-165 (`supportsInterface`, `subsidyKind`, `version`).
 *
 * The contract address is a **required** constructor parameter: there is no single
 * default because a deployment can host several providers (read them from the
 * `SubsidyProviders` registry and instantiate one `SubsidyView` per address). Provider-
 * specific getters (OPF's daily/weekly/monthly budgets, one-time credit rounds, ...) live
 * on the concrete wrappers such as {@link OPFSubsidyProvider}, which extend this class.
 *
 * Amount fields are returned in human-readable token units (see the per-method notes).
 */
export class SubsidyView extends SmartContractWithAddress {
  getDefaultAbi() {
    return ContractABI.abi as AbiItem[]
  }

  /**
   * Instantiate the SubsidyView wrapper against a specific provider contract.
   * @param {Signer} signer The signer object.
   * @param {string} address The subsidy provider contract address (required).
   * @param {string | number} [network] Network id or name.
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract (defaults to the ISubsidyView ABI).
   */
  constructor(
    signer: Signer,
    address: string,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    if (!address) {
      throw new Error('SubsidyView requires a contract address')
    }
    super(address, signer, network, config, abi)
    this.abi = abi || this.getDefaultAbi()
  }

  /**
   * Get the broad category of this provider, for UI grouping.
   * @return {Promise<SubsidyKind>} the subsidy kind (rolling window, one-time, other)
   */
  public async subsidyKind(): Promise<SubsidyKind> {
    return Number(await this.contract.subsidyKind()) as SubsidyKind
  }

  /**
   * Get the `ISubsidyView` interface revision this provider implements. Newer revisions
   * stay backwards-compatible; use it to gate optional, version-specific reads.
   * @return {Promise<number>} the interface version
   */
  public async version(): Promise<number> {
    return Number(await this.contract.version())
  }

  /**
   * Check whether the provider advertises a given ERC-165 interface id. Use it for
   * feature detection when walking the `SubsidyProviders` registry; treat a revert as
   * `false`.
   * @param {string} interfaceId The 4-byte interface id (e.g. `0xcf08f23a`).
   * @return {Promise<boolean>} true if the interface is supported
   */
  public async supportsInterface(interfaceId: string): Promise<boolean> {
    try {
      return await this.contract.supportsInterface(interfaceId)
    } catch {
      return false
    }
  }

  /**
   * Convenience check that the provider implements `ISubsidyView` (the read surface this
   * wrapper consumes).
   * @return {Promise<boolean>} true if `ISubsidyView` is supported
   */
  public async isSubsidyView(): Promise<boolean> {
    return await this.supportsInterface(ISUBSIDY_VIEW_INTERFACE_ID)
  }

  /**
   * Convenience check that the provider implements `ISubsidyProvider` (the escrow-facing
   * claim surface).
   * @return {Promise<boolean>} true if `ISubsidyProvider` is supported
   */
  public async isSubsidyProvider(): Promise<boolean> {
    return await this.supportsInterface(ISUBSIDY_PROVIDER_INTERFACE_ID)
  }

  /**
   * Get the full per-window budget report for a payer/token — the data behind a
   * per-provider breakdown card. Amount fields are converted to human-readable token
   * units; `unlimited` buckets carry `limit = remaining = '0'` (check the flag, never the
   * value). Within a single provider, take the MIN of the buckets' `remaining` — never
   * the sum, since windows can nest (OPF's day ⊂ week ⊂ month).
   * @param {string} payer Payer address.
   * @param {string} token Token address.
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<SubsidyBucketReport>} the eligibility flags and per-window budgets
   */
  public async subsidyBuckets(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<SubsidyBucketReport> {
    // Resolve decimals once so the per-bucket amount conversions below don't each fire a
    // decimals() RPC call.
    const decimals = tokenDecimals ?? Number(await getTokenDecimals(this.signer, token))
    const report = await this.contract.subsidyBuckets(payer, token)
    const buckets: SubsidyBucket[] = await Promise.all(
      report.buckets.map(async (bucket: any) => ({
        period: Number(bucket.period) as SubsidyPeriod,
        periodSeconds: bucket.periodSeconds.toString(),
        unlimited: bucket.unlimited,
        limit: await this.unitsToAmount(token, bucket.limit.toString(), decimals),
        used: await this.unitsToAmount(token, bucket.used.toString(), decimals),
        remaining: await this.unitsToAmount(token, bucket.remaining.toString(), decimals),
        resetsAt: bucket.resetsAt.toString()
      }))
    )
    return {
      paused: report.paused,
      userAllowed: report.userAllowed,
      tokenEnabled: report.tokenEnabled,
      buckets
    }
  }

  /**
   * Get the single "claimable now" figure for a payer/token: the min across the
   * provider's windows, capped by the contract's balance and gated by eligibility. This
   * is the figure that is safe to sum across providers for a portfolio total.
   * @param {string} payer Payer address.
   * @param {string} token Token address.
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<string>} remaining subsidy, in human-readable token units
   */
  public async remainingSubsidy(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const remaining = await this.contract.remainingSubsidy(payer, token)
    return await this.unitsToAmount(token, remaining.toString(), tokenDecimals)
  }

  /**
   * Quote the subsidy a specific job would receive, without changing state — the
   * authoritative per-job figure once node and job type are known (it applies the
   * percentage cap, all window caps, the balance and every gate).
   * @param {string} node Node address.
   * @param {string} payer Payer address.
   * @param {number | string} jobType Job type identifier.
   * @param {string} token Token address.
   * @param {string} amount Job cost, in human-readable token units.
   * @param {string} subsidyNeeded Subsidy requested, in human-readable token units.
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<SubsidyQuote>} the granted `subsidy` (to payer) and `bonus` (to node),
   * in human-readable token units
   */
  public async quoteSubsidy(
    node: string,
    payer: string,
    jobType: number | string,
    token: string,
    amount: string,
    subsidyNeeded: string,
    tokenDecimals?: number
  ): Promise<SubsidyQuote> {
    // Resolve decimals once to avoid repeated decimals() RPC calls across the conversions.
    const decimals = tokenDecimals ?? Number(await getTokenDecimals(this.signer, token))
    const amountUnits = await this.amountToUnits(token, amount, decimals)
    const subsidyNeededUnits = await this.amountToUnits(token, subsidyNeeded, decimals)
    const quote = await this.contract.quoteSubsidy(
      node,
      payer,
      jobType,
      token,
      amountUnits,
      subsidyNeededUnits
    )
    return {
      subsidy: await this.unitsToAmount(token, quote.subsidy.toString(), decimals),
      bonus: await this.unitsToAmount(token, quote.bonus.toString(), decimals)
    }
  }

  /**
   * Check whether a payer passes the user AccessList gate.
   * @param {string} payer Payer address.
   * @return {Promise<boolean>} true if the payer is allowed
   */
  public async isUserAllowed(payer: string): Promise<boolean> {
    return await this.contract.isUserAllowed(payer)
  }

  /**
   * Check whether a node passes the node AccessList gate.
   * @param {string} node Node address.
   * @return {Promise<boolean>} true if the node is allowed
   */
  public async isNodeAllowed(node: string): Promise<boolean> {
    return await this.contract.isNodeAllowed(node)
  }

  /**
   * Check whether a job type is subsidised.
   * @param {number | string} jobType Job type identifier.
   * @return {Promise<boolean>} true if the job type is subsidised
   */
  public async isJobTypeSubsidized(jobType: number | string): Promise<boolean> {
    return await this.contract.isJobTypeSubsidized(jobType)
  }

  /**
   * Get the list of subsidised job types.
   * @return {Promise<string[]>} allowed job type identifiers
   */
  public async getAllowedJobTypes(): Promise<string[]> {
    const jobTypes = await this.contract.getAllowedJobTypes()
    return jobTypes.map((jobType: bigint) => jobType.toString())
  }

  /**
   * Get the token balance the provider holds and can draw subsidies from.
   * @param {string} token Token address.
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<string>} available balance, in human-readable token units
   */
  public async availableBalance(token: string, tokenDecimals?: number): Promise<string> {
    const balance = await this.contract.availableBalance(token)
    return await this.unitsToAmount(token, balance.toString(), tokenDecimals)
  }
}
