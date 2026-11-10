import { Signer } from 'ethers'
import ContractABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/ISubsidyView.sol/ISubsidyView.json'
import SubsidyViewV2ABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/ISubsidyViewV2.sol/ISubsidyViewV2.json'
import SubsidyModeConfigABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/ISubsidyModeConfig.sol/ISubsidyModeConfig.json'
import {
  AbiItem,
  ModeQuote,
  SubsidyBucket,
  SubsidyBucketReport,
  SubsidyKind,
  SubsidyMode,
  SubsidyModeConfig,
  SubsidyPeriod,
  SubsidyQuote,
  ISUBSIDY_LOCK_PROVIDER_INTERFACE_ID,
  ISUBSIDY_MODE_CONFIG_INTERFACE_ID,
  ISUBSIDY_PROVIDER_INTERFACE_ID,
  ISUBSIDY_VIEW_INTERFACE_ID,
  ISUBSIDY_VIEW_V2_INTERFACE_ID
} from '../@types/index.js'
import { Config } from '../config/index.js'
import { getTokenDecimals, isUnsupportedInterfaceError } from '../utils/ContractUtils.js'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'

/**
 * ERC-165 `supportsInterface(bytes4)` fragment. The compiled `ISubsidyView` artifact does
 * not emit the inherited `IERC165` function, so without this the ethers contract instance
 * has no `supportsInterface` method — `this.contract.supportsInterface(...)` throws a
 * `TypeError` that {@link SubsidyView.supportsInterface} would swallow, turning every
 * feature-detection check into a false negative. Merge it into the ABI so the call reaches
 * the chain and returns the real value.
 */
const SUPPORTS_INTERFACE_ABI: AbiItem = {
  type: 'function',
  name: 'supportsInterface',
  stateMutability: 'view',
  inputs: [{ name: 'interfaceId', type: 'bytes4' }],
  outputs: [{ name: '', type: 'bool' }]
}

/**
 * Append the function fragments of an extension interface to `abi`, skipping any whose name is
 * already present. The base `ISubsidyView` artifact only carries the v1 functions, so the v2
 * quote methods (`quoteSubsidyModes`/`quoteSubsidyByMode`) and the mode switch
 * (`subsidyModeConfig`) must be merged in for a generic `SubsidyView` instance to be able to
 * call them. The concrete provider wrappers override `getDefaultAbi()` with their full contract
 * ABI, so this only matters for the base class. Always feature-detect (`isSubsidyViewV2`,
 * `isSubsidyModeConfig`) before calling: on a provider that does not implement the extension the
 * on-chain call reverts.
 */
function mergeAbi(abi: AbiItem[], extension: AbiItem[]): AbiItem[] {
  // Key the "already present" set on FUNCTION names only — an event/error sharing a name with an
  // extension function must not cause that function fragment to be dropped.
  const present = new Set(
    abi.filter((item) => item.type === 'function').map((item) => item.name)
  )
  const extra = extension.filter(
    (item) => item.type === 'function' && !present.has(item.name)
  )
  return extra.length ? [...abi, ...extra] : abi
}

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
    let abi = ContractABI.abi as AbiItem[]
    // The ISubsidyView artifact omits the inherited ERC-165 supportsInterface fragment;
    // add it so the contract instance can actually make the call (feature detection).
    if (!abi.some((item) => item.name === 'supportsInterface')) {
      abi = [...abi, SUPPORTS_INTERFACE_ABI]
    }
    // Merge the v2 (dual-mode quoting) and mode-config fragments so a generic SubsidyView can
    // reach them when the underlying provider supports them (feature-detect first).
    abi = mergeAbi(abi, SubsidyViewV2ABI.abi as AbiItem[])
    abi = mergeAbi(abi, SubsidyModeConfigABI.abi as AbiItem[])
    return abi
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
    } catch (error) {
      // A revert / empty data / missing method => the provider doesn't support it. Re-throw genuine
      // network/RPC errors so a transient failure isn't misreported as a false negative.
      if (isUnsupportedInterfaceError(error)) return false
      throw error
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
   * Convenience check that the provider implements `ISubsidyViewV2` (dual-mode quoting). Gate
   * `quoteSubsidyModes` / `quoteSubsidyByMode` behind this.
   * @return {Promise<boolean>} true if `ISubsidyViewV2` is supported
   */
  public async isSubsidyViewV2(): Promise<boolean> {
    return await this.supportsInterface(ISUBSIDY_VIEW_V2_INTERFACE_ID)
  }

  /**
   * Convenience check that the provider implements `ISubsidyModeConfig` (the owner-settable
   * mode switch). Gate `subsidyModeConfig` behind this.
   * @return {Promise<boolean>} true if `ISubsidyModeConfig` is supported
   */
  public async isSubsidyModeConfig(): Promise<boolean> {
    return await this.supportsInterface(ISUBSIDY_MODE_CONFIG_INTERFACE_ID)
  }

  /**
   * Convenience check that the provider implements `ISubsidyLockProvider` (the lock-time /
   * prefunded sponsorship callbacks). A provider advertising this can be passed as a
   * `subsidyProvider` to the escrow's `createLock`/`reLock`.
   * @return {Promise<boolean>} true if `ISubsidyLockProvider` is supported
   */
  public async isSubsidyLockProvider(): Promise<boolean> {
    return await this.supportsInterface(ISUBSIDY_LOCK_PROVIDER_INTERFACE_ID)
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
   * Quote the subsidy a specific job would receive under **both** delivery modes in one call
   * (`ISubsidyViewV2`) — the data behind a "refund vs prepaid" choice in the UI. Returns a
   * two-element array `[{mode: REIMBURSEMENT, ...}, {mode: PREFUNDED, ...}]`. Both legs draw from
   * the same per-provider budget (they are alternatives, not additive); a leg disabled via
   * `subsidyModeConfig` reports `'0'`. Feature-detect with {@link isSubsidyViewV2} first — on a
   * provider that does not implement v2 this reverts.
   * @param {string} node Node address.
   * @param {string} payer Payer address.
   * @param {number | string} jobType Job type identifier.
   * @param {string} token Token address.
   * @param {string} amount Job cost, in human-readable token units.
   * @param {string} subsidyNeeded Subsidy requested, in human-readable token units.
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<ModeQuote[]>} one quote per mode, amounts in human-readable token units
   */
  public async quoteSubsidyModes(
    node: string,
    payer: string,
    jobType: number | string,
    token: string,
    amount: string,
    subsidyNeeded: string,
    tokenDecimals?: number
  ): Promise<ModeQuote[]> {
    const decimals = tokenDecimals ?? Number(await getTokenDecimals(this.signer, token))
    const amountUnits = await this.amountToUnits(token, amount, decimals)
    const subsidyNeededUnits = await this.amountToUnits(token, subsidyNeeded, decimals)
    const quotes = await this.contract.quoteSubsidyModes(
      node,
      payer,
      jobType,
      token,
      amountUnits,
      subsidyNeededUnits
    )
    return Promise.all(
      quotes.map(async (quote: any) => ({
        mode: Number(quote.mode) as SubsidyMode,
        subsidy: await this.unitsToAmount(token, quote.subsidy.toString(), decimals),
        bonus: await this.unitsToAmount(token, quote.bonus.toString(), decimals)
      }))
    )
  }

  /**
   * Quote the subsidy a specific job would receive under a **single** delivery mode
   * (`ISubsidyViewV2`). Feature-detect with {@link isSubsidyViewV2} first.
   * @param {string} node Node address.
   * @param {string} payer Payer address.
   * @param {number | string} jobType Job type identifier.
   * @param {string} token Token address.
   * @param {string} amount Job cost, in human-readable token units.
   * @param {string} subsidyNeeded Subsidy requested, in human-readable token units.
   * @param {SubsidyMode} mode The delivery mode to quote (REIMBURSEMENT or PREFUNDED).
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<SubsidyQuote>} the granted `subsidy` and `bonus`, in human-readable token units
   */
  public async quoteSubsidyByMode(
    node: string,
    payer: string,
    jobType: number | string,
    token: string,
    amount: string,
    subsidyNeeded: string,
    mode: SubsidyMode,
    tokenDecimals?: number
  ): Promise<SubsidyQuote> {
    const decimals = tokenDecimals ?? Number(await getTokenDecimals(this.signer, token))
    const amountUnits = await this.amountToUnits(token, amount, decimals)
    const subsidyNeededUnits = await this.amountToUnits(token, subsidyNeeded, decimals)
    const quote = await this.contract.quoteSubsidyByMode(
      node,
      payer,
      jobType,
      token,
      amountUnits,
      subsidyNeededUnits,
      mode
    )
    return {
      subsidy: await this.unitsToAmount(token, quote.subsidy.toString(), decimals),
      bonus: await this.unitsToAmount(token, quote.bonus.toString(), decimals)
    }
  }

  /**
   * Get which subsidy mode(s) the provider currently honours (`ISubsidyModeConfig`): `BOTH`,
   * `REFUND_ONLY` or `PREPAID_ONLY`. Read it to decide whether to offer a prepaid vs refund flow.
   * Feature-detect with {@link isSubsidyModeConfig} first.
   * @return {Promise<SubsidyModeConfig>} the configured mode
   */
  public async subsidyModeConfig(): Promise<SubsidyModeConfig> {
    const mode = Number(await this.contract.subsidyModeConfig())
    if (!(mode in SubsidyModeConfig)) {
      throw new Error(`Unknown subsidyModeConfig value from contract: ${mode}`)
    }
    return mode as SubsidyModeConfig
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
