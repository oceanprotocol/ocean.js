import { Signer } from 'ethers'
import ContractABI from '@oceanprotocol/contracts/artifacts/contracts/subsidy/OneTimeSubsidyProvider.sol/OneTimeSubsidyProvider.json'
import { AbiItem, OneTimeTokenConfig } from '../@types/index.js'
import { Config } from '../config/index.js'
import { SubsidyView } from './SubsidyView.js'

/**
 * Read-only wrapper for the `OneTimeSubsidyProvider` contract — a one-time onboarding-credit
 * program (e.g. "every eligible user gets 10 USDC of free compute"). It extends
 * {@link SubsidyView} — inheriting the standardized `ISubsidyView` read surface
 * (`subsidyBuckets`, `remainingSubsidy`, `quoteSubsidy`, eligibility gates,
 * `subsidyKind`/`version`, ERC-165 `supportsInterface`) — and adds the OneTime-specific
 * getters: the per-user cumulative credit, how much of it has been used, the credit
 * override flag, the per-token config, and the round accounting behind admin resets.
 *
 * Unlike `OPFSubsidyProvider` there are no rolling day/week/month windows: the credit is a
 * single cumulative budget drawn down across jobs until exhausted, and it only refreshes
 * when an admin resets it. Owner/admin operations (`setTokenConfig`, `setUserCredit(s)`,
 * `resetAllUsers`/`resetUser`, `pause`, `withdrawTokens`, ...) and the escrow-only
 * `onSubsidyClaim` callback are intentionally **not** wrapped.
 *
 * There is no single configured default address (a deployment can host several providers):
 * read addresses from `config.SubsidyProviders` and identify the OneTime one via
 * `subsidyKind()`, then pass its address here. Amount fields are returned in human-readable
 * token units.
 */
export class OneTimeSubsidyProvider extends SubsidyView {
  getDefaultAbi() {
    return ContractABI.abi as AbiItem[]
  }

  /**
   * Instantiate the OneTimeSubsidyProvider wrapper against a specific contract.
   * @param {Signer} signer The signer object.
   * @param {string} address The contract address (required; discover it via
   * `config.SubsidyProviders` + `subsidyKind()`).
   * @param {string | number} [network] Network id or name.
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract.
   */
  constructor(
    signer: Signer,
    address: string,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    if (!address) {
      throw new Error('OneTimeSubsidyProvider requires a contract address')
    }
    super(signer, address, network, config, abi)
  }

  /**
   * Get the per-token configuration (per-job ceiling, default credit, enabled flag).
   * @param {string} token Token address.
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<OneTimeTokenConfig>} the token config (amounts in human-readable units)
   */
  public async getTokenConfig(
    token: string,
    tokenDecimals?: number
  ): Promise<OneTimeTokenConfig> {
    const config = await this.contract.getTokenConfig(token)
    return {
      pctBps: config.pctBps.toString(),
      defaultCredit: await this.unitsToAmount(
        token,
        config.defaultCredit.toString(),
        tokenDecimals
      ),
      enabled: config.enabled
    }
  }

  /**
   * Get the one-time credit a payer is granted for a token: their override if set, else the
   * token's default. Independent of how much has already been used.
   * @param {string} payer Payer address.
   * @param {string} token Token address.
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<string>} the effective credit, in human-readable token units
   */
  public async effectiveCredit(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const credit = await this.contract.effectiveCredit(payer, token)
    return await this.unitsToAmount(token, credit.toString(), tokenDecimals)
  }

  /**
   * Get the credit a payer has left in their current round — `effectiveCredit - used`.
   * Unlike the inherited `remainingSubsidy`, this is NOT capped by the contract balance and
   * NOT gated (use `remainingSubsidy` for the "claimable now" figure).
   * @param {string} payer Payer address.
   * @param {string} token Token address.
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<string>} the remaining credit, in human-readable token units
   */
  public async remainingCredit(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const remaining = await this.contract.remainingCredit(payer, token)
    return await this.unitsToAmount(token, remaining.toString(), tokenDecimals)
  }

  /**
   * Get the cumulative subsidy a payer has used in their CURRENT round.
   * @param {string} payer Payer address.
   * @param {string} token Token address.
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<string>} the used amount, in human-readable token units
   */
  public async usedBy(
    payer: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const used = await this.contract.usedBy(payer, token)
    return await this.unitsToAmount(token, used.toString(), tokenDecimals)
  }

  /**
   * Get the subsidy a payer used in a specific round (e.g. a past round's consumption).
   * @param {string} payer Payer address.
   * @param {string} token Token address.
   * @param {number | string} round The round index.
   * @param {number} [tokenDecimals] optional number of decimals of the token.
   * @return {Promise<string>} the used amount, in human-readable token units
   */
  public async usedByAt(
    payer: string,
    token: string,
    round: number | string,
    tokenDecimals?: number
  ): Promise<string> {
    const used = await this.contract.usedByAt(payer, token, round)
    return await this.unitsToAmount(token, used.toString(), tokenDecimals)
  }

  /**
   * Check whether a payer has a per-user credit override set (as opposed to the token default).
   * @param {string} payer Payer address.
   * @param {string} token Token address.
   * @return {Promise<boolean>} true if an override is set for this payer/token
   */
  public async hasUserCredit(payer: string, token: string): Promise<boolean> {
    return await this.contract.hasUserCredit(payer, token)
  }

  /**
   * Get the round whose usage slot a payer currently draws from
   * (`globalRound + userRound[payer]`).
   * @param {string} payer Payer address.
   * @return {Promise<string>} the effective round index
   */
  public async effectiveRound(payer: string): Promise<string> {
    return (await this.contract.effectiveRound(payer)).toString()
  }

  /**
   * Get the global round index (advanced by an admin `resetAllUsers`).
   * @return {Promise<string>} the global round index
   */
  public async globalRound(): Promise<string> {
    return (await this.contract.globalRound()).toString()
  }

  /**
   * Get a payer's per-user reset offset (advanced by an admin `resetUser`).
   * @param {string} payer Payer address.
   * @return {Promise<string>} the per-user round offset
   */
  public async userRound(payer: string): Promise<string> {
    return (await this.contract.userRound(payer)).toString()
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
}
