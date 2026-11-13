import { formatUnits, getAddress, isAddress, parseUnits } from 'ethers'
import type {
  EstimateJobSubsidyParams,
  JobSubsidyEstimate,
  JobSubsidyProviderQuote,
  JobSubsidyScenario,
  SubsidyDropReason
} from '../@types/SubsidyEstimate.js'
import { SubsidyMode, SubsidyQuote } from '../@types/SubsidyView.js'
import { EscrowContract } from '../contracts/Escrow.js'
import { SubsidyView } from '../contracts/SubsidyView.js'
import { ProviderInstance } from '../services/Provider.js'
import { getTokenDecimals, isUnsupportedInterfaceError } from './ContractUtils.js'
import { estimateServiceCost, serviceMinLockSeconds, toRawAmount } from './ServiceCost.js'
import { filterSubsidyByAllowedImages } from './SubsidyImage.js'

/**
 * Absolute ceiling on how many candidate providers are examined (image gate + quoting), no matter
 * how many a node advertises or the caller supplies. It is independent of the node-supplied
 * `maxSponsorsPerLock`: a hostile node could otherwise make the client fire thousands of RPC
 * reads. Only the first N candidates (advertised first, then custom) are considered beyond it.
 */
export const MAX_SUBSIDY_CANDIDATES_QUOTED = 25
/** The escrow contract hard-caps unique sponsors per lock at 10; never select more. */
const ESCROW_SPONSOR_HARD_CAP = 10
/** Providers quoted concurrently (each costs ~6 eth_calls). */
const QUOTE_CONCURRENCY = 5

const ZERO_QUOTE: SubsidyQuote = { subsidy: '0', bonus: '0' }

/** Run a read; `null` when the contract does not implement it. Genuine RPC errors re-throw. */
async function safe<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read()
  } catch (error) {
    if (isUnsupportedInterfaceError(error)) return null
    throw error
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Normalize a job type to the uint the contracts take: 'compute'->1, 'service'->2, '2'->2. */
function normalizeJobType(jobType: number | string): number {
  if (typeof jobType === 'number') {
    if (Number.isInteger(jobType) && jobType >= 0) return jobType
  } else {
    const t = String(jobType).trim().toLowerCase()
    if (t === 'compute') return 1
    if (t === 'service') return 2
    if (/^\d+$/.test(t)) return Number(t)
  }
  throw new Error(
    `Invalid jobType "${jobType}": expected a non-negative integer, 'compute' (1) or 'service' (2).`
  )
}

function checksum(value: string, what: string): string {
  if (typeof value !== 'string' || !isAddress(value)) {
    throw new Error(`${what} "${String(value)}" is not a valid address.`)
  }
  return getAddress(value)
}

function toUnits(human: string, decimals: number): bigint {
  return parseUnits(human, decimals)
}

function dropped(
  address: string,
  reason: SubsidyDropReason,
  message: string,
  imageAllowed = true
): JobSubsidyProviderQuote {
  return {
    address,
    subsidyKind: null,
    version: null,
    isV2: false,
    gates: {
      imageAllowed,
      isNodeAllowed: null,
      isUserAllowed: null,
      isJobTypeSubsidized: null
    },
    eligible: false,
    dropped: reason,
    reason: message,
    quotes: { reimbursement: { ...ZERO_QUOTE }, prefunded: { ...ZERO_QUOTE } }
  }
}

/**
 * Greedy selection for one delivery mode: rank providers by that mode's subsidy (desc), add until
 * `needed` is covered, never exceeding `cap` providers.
 */
function buildScenario(
  mode: SubsidyMode,
  providers: JobSubsidyProviderQuote[],
  decimals: number,
  cost: bigint,
  needed: bigint,
  cap: number,
  available: bigint,
  lockSubsidySupported: boolean
): JobSubsidyScenario {
  // PREFUNDED (lock-time sponsorship) only works when the escrow implements IEscrowLockSubsidy.
  // Without it the lock cannot be pre-funded, so prefunded quotes must NOT reduce escrowNeeded —
  // report the full cost, or the payer under-funds the lock.
  if (mode === SubsidyMode.PREFUNDED && !lockSubsidySupported) {
    const fullShortfall = cost > available ? cost - available : 0n
    return {
      mode,
      selected: [],
      projectedTotalSubsidy: formatUnits(0n, decimals),
      meetsSubsidyNeeded: needed <= 0n,
      escrowNeeded: formatUnits(cost, decimals),
      escrowAvailable: formatUnits(available, decimals),
      escrowShortfall: formatUnits(fullShortfall, decimals)
    }
  }
  const leg = (p: JobSubsidyProviderQuote) =>
    toUnits(
      mode === SubsidyMode.PREFUNDED
        ? p.quotes.prefunded.subsidy
        : p.quotes.reimbursement.subsidy,
      decimals
    )
  const ranked = providers
    .filter((p) => p.eligible && !p.dropped)
    .map((p) => ({ address: p.address, subsidy: leg(p) }))
    .filter((p) => p.subsidy > 0n)
    .sort((a, b) => (a.subsidy < b.subsidy ? 1 : a.subsidy > b.subsidy ? -1 : 0))

  const selected: string[] = []
  let total = 0n
  for (const candidate of ranked) {
    if (selected.length >= cap) break
    selected.push(candidate.address)
    total += candidate.subsidy
    if (total >= needed) break
  }
  const projected = total > cost ? cost : total
  const escrowNeeded =
    mode === SubsidyMode.PREFUNDED ? (cost > projected ? cost - projected : 0n) : cost
  const shortfall = escrowNeeded > available ? escrowNeeded - available : 0n

  return {
    mode,
    selected,
    projectedTotalSubsidy: formatUnits(projected, decimals),
    meetsSubsidyNeeded: projected >= needed,
    escrowNeeded: formatUnits(escrowNeeded, decimals),
    escrowAvailable: formatUnits(available, decimals),
    escrowShortfall: formatUnits(shortfall, decimals)
  }
}

/**
 * Read-only pre-flight: how much subsidy would this job get, per subsidy-provider contract and
 * delivery mode, and how much must the payer hold in escrow?
 *
 * Reads the node's status and compute environments (HTTP or P2P), derives the job cost with
 * `estimateServiceCost`, resolves the candidate subsidy providers, applies the node's image
 * gate, then quotes each provider through `SubsidyView` (v2 `quoteSubsidyModes`, else the v1
 * `quoteSubsidy` as REIMBURSEMENT only). It builds one scenario per delivery mode.
 *
 * Candidate set (additive): `advertised ∪ customSubsidyProviders`, where advertised is
 * `status.subsidyProviders[chainId]`. When the node's `subsidyProviderFilter` is on, a custom
 * address outside the advertised set is dropped as `outside_node_set` (the node would reject the
 * whole request). Pass a scenario's `selected` list as `subsidyProviders` at start: the node
 * treats a non-empty list as a REPLACEMENT of its own set, so it then applies exactly that list.
 * An empty `selected` means no subsidy — pass it verbatim as `subsidyProviders: []` (an explicit
 * opt-out); OMITTING the argument instead makes the node fall back to its own configured providers.
 *
 * A gate that returns `null` (provider does not expose it) is unknown, NOT disqualifying; only
 * an explicit `false` drops a provider. At most `min(escrow maxSponsorsPerLock, 10)` providers
 * are selected per scenario.
 *
 * Untrusted node data: the node status is attacker-controlled when the caller points at an
 * arbitrary node. Only the first {@link MAX_SUBSIDY_CANDIDATES_QUOTED} candidates (advertised
 * first, then custom) are examined, with a warning when more exist. The returned `escrowAddress`
 * is whatever the node advertised: it is verified only when `params.config.escrow` is set (a
 * mismatch throws, fail-closed); otherwise a warning says it is unverified. RE-VERIFY it against
 * your configured escrow before any deposit or authorization. Genuine RPC failures propagate;
 * only "contract does not implement this" is degraded to a per-provider `error` drop.
 *
 * All amounts are human-readable token units. Advisory only: the node recomputes cost and the
 * escrow/subsidy contracts settle subsidy at start. Never signs or sends a transaction.
 */
export async function estimateJobSubsidy(
  params: EstimateJobSubsidyParams
): Promise<JobSubsidyEstimate> {
  const {
    signer,
    chainId,
    node,
    environmentId,
    resources,
    durationSeconds,
    container,
    signal
  } = params
  const provider = params.provider ?? ProviderInstance
  const hasCustomEntrypoint = params.hasCustomEntrypoint ?? false
  const warnings: string[] = []

  // Synchronous input validation, before any network access.
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(
      `durationSeconds must be a finite number > 0 (got ${durationSeconds}).`
    )
  }
  for (const r of resources ?? []) {
    if (!Number.isFinite(r?.amount) || r.amount < 0) {
      throw new Error(
        `Resource "${r?.id}" amount must be a finite number >= 0 (got ${r?.amount}).`
      )
    }
  }
  const queueMaxWaitTime = params.queueMaxWaitTime ?? 0
  if (!Number.isFinite(queueMaxWaitTime) || queueMaxWaitTime < 0) {
    throw new Error(
      `queueMaxWaitTime must be a finite number >= 0 (got ${params.queueMaxWaitTime}).`
    )
  }
  const jobTypeId = normalizeJobType(params.jobType)
  const payer = checksum(params.payer, 'payer')
  const token = checksum(params.token, 'token')

  const [status, envs] = await Promise.all([
    provider.getNodeStatus(node, signal),
    provider.getComputeEnvironments(node, signal)
  ])
  if (!status?.address) {
    throw new Error('Node status did not include an `address`; cannot quote subsidies.')
  }
  const payee = checksum(status.address, 'Node status address')
  const rawEscrow = status.escrowAddress?.[String(chainId)]
  if (!rawEscrow) {
    throw new Error(
      `Node status advertises no escrow address for chainId=${chainId}. ` +
        `Available: ${Object.keys(status.escrowAddress ?? {}).join(', ') || '(none)'}.`
    )
  }
  const escrowAddress = checksum(rawEscrow, 'Node-advertised escrow address')
  if (params.config?.escrow) {
    if (escrowAddress !== getAddress(params.config.escrow)) {
      throw new Error(
        'Node-advertised escrow address does not match the configured escrow ' +
          '(config.escrow). Refusing to continue.'
      )
    }
  } else {
    warnings.push(
      'UNVERIFIED ESCROW ADDRESS: it was asserted by the node and no config.escrow was ' +
        'provided to check it against. Verify it before depositing or authorizing anything.'
    )
  }

  const env = envs?.find((e) => e.id === environmentId)
  if (!env) {
    throw new Error(
      `Compute environment "${environmentId}" not found on the node. ` +
        `Available: ${(envs ?? []).map((e) => e.id).join(', ') || '(none)'}.`
    )
  }
  const costEstimate = estimateServiceCost(
    env,
    chainId,
    token,
    resources,
    durationSeconds,
    // Normalized job type, so the cost floor (minJobDuration vs minServiceDuration) agrees with the
    // provider gates even for whitespace-padded / mixed-case 'compute' inputs.
    jobTypeId
  )
  if (!costEstimate) {
    throw new Error(
      `Environment "${environmentId}" advertises no fee schedule for chainId=${chainId}, ` +
        `token=${token}.`
    )
  }
  if (costEstimate.unpricedResourceIds.length) {
    warnings.push(
      `Resource id(s) not priced (or priced invalidly) by the env; treated as 0: ` +
        `${costEstimate.unpricedResourceIds.join(', ')}.`
    )
  }

  const decimals = params.tokenDecimals ?? Number(await getTokenDecimals(signer, token))
  const costBaseUnits = toRawAmount(costEstimate.costHuman, decimals)
  const cost = BigInt(costBaseUnits)
  const costHuman = formatUnits(cost, decimals)
  let needed = cost
  if (params.subsidyNeeded !== undefined) {
    const m = /^(\d+)(?:\.(\d+))?$/.exec(String(params.subsidyNeeded).trim())
    if (!m) {
      throw new Error(
        `subsidyNeeded must be a non-negative decimal string (got "${params.subsidyNeeded}").`
      )
    }
    if ((m[2] ?? '').length > decimals) {
      throw new Error(
        `subsidyNeeded "${params.subsidyNeeded}" has more fraction digits than the token's ` +
          `${decimals} decimals.`
      )
    }
    needed = toUnits(String(params.subsidyNeeded).trim(), decimals)
  }
  const subsidyNeededHuman = formatUnits(needed, decimals)

  // Escrow: per-lock sponsor cap and the payer's withdrawable balance.
  const escrow = new EscrowContract(escrowAddress, signer, chainId, params.config)
  const [onChainCap, funds, lockSubsidy] = await Promise.all([
    safe(() => escrow.maxSponsorsPerLock()),
    escrow.getUserFunds(payer, token),
    safe(() => escrow.isEscrowLockSubsidy())
  ])
  let cap = ESCROW_SPONSOR_HARD_CAP
  if (typeof onChainCap === 'number' && onChainCap > 0) {
    cap = Math.min(onChainCap, ESCROW_SPONSOR_HARD_CAP)
  }
  const available = BigInt(funds[0].toString())
  // PREFUNDED sponsorship needs the lock-subsidy escrow extension; a null/absent flag (older or
  // non-lock escrow) is treated as unsupported so the prefunded scenario never under-states escrow.
  const lockSubsidySupported = lockSubsidy === true

  // Candidate set: advertised ∪ custom, deduped + checksummed.
  const subsidyProviderFilter = status.subsidyProviderFilter ?? false
  const providers: JobSubsidyProviderQuote[] = []
  const advertised: string[] = []
  const invalid: string[] = []
  const advertisedRaw = status.subsidyProviders?.[String(chainId)]
  for (const addr of Array.isArray(advertisedRaw) ? advertisedRaw : []) {
    if (isAddress(addr)) advertised.push(getAddress(addr))
    else invalid.push(addr)
  }
  const advertisedSet = new Set(advertised)
  const pool = new Set<string>(advertisedSet)
  for (const addr of params.customSubsidyProviders ?? []) {
    if (!isAddress(addr)) {
      invalid.push(addr)
      continue
    }
    const checksummed = getAddress(addr)
    if (pool.has(checksummed)) continue
    if (subsidyProviderFilter) {
      providers.push(
        dropped(
          checksummed,
          'outside_node_set',
          'The node has subsidyProviderFilter on and this provider is not in its advertised set; ' +
            'the node would reject the whole request.'
        )
      )
      continue
    }
    pool.add(checksummed)
  }
  for (const addr of invalid.slice(0, MAX_SUBSIDY_CANDIDATES_QUOTED)) {
    providers.push(dropped(String(addr), 'error', `Not a valid address: ${addr}`))
  }
  let candidates = [...pool]
  if (candidates.length > MAX_SUBSIDY_CANDIDATES_QUOTED) {
    warnings.push(
      `${candidates.length} candidate providers exceed the examination ceiling ` +
        `(${MAX_SUBSIDY_CANDIDATES_QUOTED}); only the first ${MAX_SUBSIDY_CANDIDATES_QUOTED} ` +
        `were quoted.`
    )
    candidates = candidates.slice(0, MAX_SUBSIDY_CANDIDATES_QUOTED)
  }

  if (candidates.length > cap) {
    warnings.push(
      `${candidates.length} candidate providers exceed the escrow's maxSponsorsPerLock (${cap}); ` +
        `each scenario selects at most ${cap}.`
    )
  }

  // Image gate over the (bounded) candidate set.
  const { dropped: imageDropped } = filterSubsidyByAllowedImages(
    candidates,
    container,
    hasCustomEntrypoint,
    status.subsidyProviderAllowedImages
  )
  const imageDroppedSet = new Set(imageDropped)
  for (const addr of imageDroppedSet) {
    providers.push(
      dropped(
        addr,
        'image_not_allowed',
        hasCustomEntrypoint
          ? 'Custom entrypoint/cmd disqualifies this provider (image gate).'
          : "The requested image is not in this provider's allowed images.",
        false
      )
    )
  }

  const quoteProvider = async (address: string): Promise<JobSubsidyProviderQuote> => {
    try {
      const view = new SubsidyView(signer, address, chainId, params.config)
      const [isNodeAllowed, isUserAllowed, isJobTypeSubsidized, kind, version] =
        await Promise.all([
          safe(() => view.isNodeAllowed(payee)),
          safe(() => view.isUserAllowed(payer)),
          safe(() => view.isJobTypeSubsidized(jobTypeId)),
          safe(() => view.subsidyKind()),
          safe(() => view.version())
        ])
      const result: JobSubsidyProviderQuote = {
        address,
        subsidyKind: kind,
        version,
        isV2: false,
        gates: { imageAllowed: true, isNodeAllowed, isUserAllowed, isJobTypeSubsidized },
        eligible:
          isNodeAllowed !== false &&
          isUserAllowed !== false &&
          isJobTypeSubsidized !== false,
        quotes: { reimbursement: { ...ZERO_QUOTE }, prefunded: { ...ZERO_QUOTE } }
      }
      if (!result.eligible) {
        if (isNodeAllowed === false) {
          result.dropped = 'node_not_allowed'
          result.reason = 'The provider does not allow this node.'
        } else if (isUserAllowed === false) {
          result.dropped = 'user_not_allowed'
          result.reason = 'The provider does not allow this payer.'
        } else {
          result.dropped = 'job_type_not_subsidized'
          result.reason = 'The provider does not subsidize this job type.'
        }
        return result
      }

      result.isV2 = Boolean(await safe(() => view.isSubsidyViewV2()))
      if (result.isV2) {
        const modes = await safe(() =>
          view.quoteSubsidyModes(
            payee,
            payer,
            jobTypeId,
            token,
            costHuman,
            subsidyNeededHuman,
            decimals
          )
        )
        const reimb = modes?.find((m) => m.mode === SubsidyMode.REIMBURSEMENT)
        const pre = modes?.find((m) => m.mode === SubsidyMode.PREFUNDED)
        if (reimb)
          result.quotes.reimbursement = { subsidy: reimb.subsidy, bonus: reimb.bonus }
        if (pre) result.quotes.prefunded = { subsidy: pre.subsidy, bonus: pre.bonus }
      } else {
        // v1: claim-time REIMBURSEMENT is the only quote available.
        const quote = await safe(() =>
          view.quoteSubsidy(
            payee,
            payer,
            jobTypeId,
            token,
            costHuman,
            subsidyNeededHuman,
            decimals
          )
        )
        if (quote) result.quotes.reimbursement = quote
      }
      if (
        toUnits(result.quotes.reimbursement.subsidy, decimals) === 0n &&
        toUnits(result.quotes.prefunded.subsidy, decimals) === 0n
      ) {
        result.dropped = 'zero_quote'
        result.reason = 'The provider quotes 0 subsidy for this job.'
      }
      return result
    } catch (error) {
      // Only "this contract cannot answer" degrades to a drop; real infra failures must surface
      // (otherwise an RPC outage silently reads as "no subsidy").
      if (isUnsupportedInterfaceError(error)) {
        return dropped(address, 'error', errorMessage(error))
      }
      throw error
    }
  }

  // Quote the remaining candidates in small concurrent batches (bounded RPC fan-out).
  const toQuote = candidates.filter((addr) => !imageDroppedSet.has(addr))
  for (let i = 0; i < toQuote.length; i += QUOTE_CONCURRENCY) {
    providers.push(
      ...(await Promise.all(toQuote.slice(i, i + QUOTE_CONCURRENCY).map(quoteProvider)))
    )
  }

  const reimbursement = buildScenario(
    SubsidyMode.REIMBURSEMENT,
    providers,
    decimals,
    cost,
    needed,
    cap,
    available,
    lockSubsidySupported
  )
  const prefunded = buildScenario(
    SubsidyMode.PREFUNDED,
    providers,
    decimals,
    cost,
    needed,
    cap,
    available,
    lockSubsidySupported
  )

  if (
    !lockSubsidySupported &&
    providers.some((p) => toUnits(p.quotes.prefunded.subsidy, decimals) > 0n)
  ) {
    warnings.push(
      'The escrow does not support lock subsidies (IEscrowLockSubsidy); PREFUNDED sponsorship is ' +
        'unavailable, so the prefunded scenario assumes the full cost.'
    )
  }

  warnings.push(
    'Advisory estimate: the node recomputes cost and the escrow/subsidy contracts settle ' +
      'subsidy at start.'
  )

  return {
    chainId,
    node: payee,
    // The env's own spelling (the node compares with ===); checksummed only for contract reads.
    token: costEstimate.feeToken,
    cost: costHuman,
    costBaseUnits,
    minutesBilled: costEstimate.minutesBilled,
    // The node locks for job duration + queue wait (compute); queue wait never affects billed cost.
    minLockSeconds: serviceMinLockSeconds(
      costEstimate.effectiveDurationSeconds + queueMaxWaitTime
    ),
    escrowAddress,
    maxSponsorsPerLock: cap,
    subsidyProviderFilter,
    subsidyNeeded: subsidyNeededHuman,
    unpricedResourceIds: costEstimate.unpricedResourceIds,
    providers,
    scenarios: { reimbursement, prefunded },
    warnings
  }
}
