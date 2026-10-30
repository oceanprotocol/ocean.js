/**
 * Pure building blocks for matching a service template's `recommendedResources` against a
 * compute environment: a memory-size parser, a GPU-layout planner and best-effort CPU/RAM/disk
 * sizing.
 *
 * Intentionally pure: no network, no React, no node-config. Inputs are the environment's
 * resources as returned by getComputeEnvironments() plus the template requirement; outputs are
 * exact per-ID resource requests. Callers still own the rest of the plan: access/payment/
 * duration gates, cross-resource constraints, refresh-and-revalidate before payment and start,
 * and operational defaults when a target declares no GPU.
 *
 * Rules (shared with the node and every client):
 * - Memory is compared in integer bytes against ceil(GB * 1e9). GB = 1e9, GiB = 2^30,
 *   MiB = 2^20. No admission slack, no GPU marketing names.
 * - Unknown, non-finite or non-positive memory never satisfies a GPU recommendation.
 * - A layout books exactly `gpuCount` whole GPUs of ONE group (same description), on one host.
 *   Cards are never pooled across groups, and a one-GPU layout needs one card that holds the
 *   whole recommendation.
 * - A GPU resource standing for more than one card ((total ?? max) > 1) is a POOL. The node
 *   hands a container ALL DeviceIDs of a resource whatever amount was requested, so a pool is
 *   only ever booked whole (amount === its total), never partially.
 *
 * Also here: the authoring-side sizing rule (GpuSizingProfile -> explicit layouts) and the
 * advisory helpers for custom Hugging Face models (legal tensor-parallel widths, a memory
 * estimate).
 */
import type { ComputeResource, ComputeResourceRequest } from '../@types/Compute.js'
import type {
  GpuLayout,
  GpuSizingProfile,
  TemplateResourceRequirement
} from '../@types/Services.js'

/** The GPU member of the TemplateResourceRequirement union. */
export type GpuResourceRequirement = Extract<TemplateResourceRequirement, { type: 'gpu' }>

/** The CPU / RAM / disk members of the TemplateResourceRequirement union. */
export type SharedResourceRequirement = Exclude<
  TemplateResourceRequirement,
  { type: 'gpu' }
>

/** The shared (non-GPU) resource ids a template can declare. */
export type SharedResourceId = SharedResourceRequirement['id']

/** One feasible way to book a GPU layout on an environment. */
export interface GpuLayoutCandidate {
  /** The declared layout this candidate books, or null when the target declares no GPU. */
  layout: GpuLayout | null
  /** The GPU group (description, or `id:<id>` when a resource has none); null without a layout. */
  groupKey: string | null
  /** Exact whole-unit GPU requests; their amounts sum to layout.gpuCount. */
  gpuRequests: ComputeResourceRequest[]
  /** Sum of fees[id] * amount over gpuRequests: price per minute of the GPUs alone. */
  gpuPrice: number
  /** Bytes per card used for the checks (the group minimum); null without a layout. */
  perCardBytes: number | null
}

/** Inputs of planGpuLayouts(). */
export interface PlanGpuLayoutsParams {
  /**
   * The environment's GPU resources only (the caller picks them, e.g. `type === 'gpu'`).
   * Each may be one card (`max`/`total` 1) or a pool of identical cards; `memoryTotal` always
   * describes ONE card. A pool is only ever booked whole (see isPooledGpuResource).
   */
  gpuResources: ComputeResource[]
  /** The template's GPU requirement; undefined means the target declares no GPU demand. */
  requirement?: GpuResourceRequirement
  /** Per-resource-id fee per unit per minute, for the chosen chain/token. Missing id = 0. */
  fees?: Record<string, number>
  /**
   * Exact width the runtime will use: a package's effective tensor-parallel size, or the
   * user's value for the template's `gpuCountEnv`. Only declared layouts with this gpuCount
   * are considered; none matching means no candidates.
   */
  forcedGpuCount?: number
}

/** Result of sizeSharedResources(). */
export interface SharedResourceSizing {
  /**
   * Amount per shared id, for the ids the template declares. An id left undefined is not
   * declared: the caller keeps its own default (existing slice or the env minimum).
   */
  amounts: Partial<Record<SharedResourceId, number>>
  /** The declared amounts as requests, zero amounts omitted (the node rejects amount 0). */
  requests: ComputeResourceRequest[]
  /** Declared ids that got less than recommended. */
  shortfalls: Array<{ id: SharedResourceId; recommended: number; allocated: number }>
}

const MEMORY_TOTAL_PATTERN = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]{1,3})?$/

const MEMORY_UNIT_FACTORS: Record<string, number> = {
  b: 1,
  kb: 1e3,
  mb: 1e6,
  gb: 1e9,
  tb: 1e12,
  kib: 1024,
  mib: 1024 ** 2,
  gib: 1024 ** 3,
  tib: 1024 ** 4
}

/**
 * Parses a ComputeResource.memoryTotal string ("143771 MiB", "16 GiB", "8GB", "1024") into
 * integer bytes, with the same grammar as ocean-node's parseMemoryTotalToBytes: a number, an
 * optional space and an optional unit (b/kb/mb/gb/tb decimal, kib/mib/gib/tib binary, any
 * case; no unit = bytes).
 * @param {string} memoryTotal the advertised memory of one unit
 * @returns {number | undefined} bytes, or undefined when absent, unparseable or <= 0
 */
export function parseMemoryTotalBytes(memoryTotal?: string): number | undefined {
  if (!memoryTotal) return undefined
  const m = String(memoryTotal).trim().match(MEMORY_TOTAL_PATTERN)
  if (!m) return undefined
  const value = parseFloat(m[1])
  const factor = MEMORY_UNIT_FACTORS[(m[2] || 'b').toLowerCase()]
  if (!Number.isFinite(value) || !factor) return undefined
  const bytes = Math.round(value * factor)
  return Number.isFinite(bytes) && bytes > 0 ? bytes : undefined
}

/**
 * Whole units of a resource a new booking can still get:
 * max(0, min(max, total - inUse)). A missing `total` (legacy node) falls back to `max`;
 * an explicit total of 0 is kept.
 * @param {ComputeResource} resource the environment resource
 * @returns {number} grantable amount
 */
export function grantableAmount(resource: ComputeResource): number {
  const total = resource.total ?? resource.max
  const free = (total ?? 0) - (resource.inUse ?? 0)
  const grantable = Math.min(resource.max ?? 0, free)
  return Number.isFinite(grantable) && grantable > 0 ? grantable : 0
}

const gbToBytes = (gb: number): number => Math.ceil(gb * 1e9)

const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

function gpuGroupKey(resource: ComputeResource): string {
  const description = resource.description?.trim()
  return description || `id:${resource.id}`
}

// Groups GPU resources by gpuGroupKey, keeping input order inside each group.
function groupGpuResources(
  gpuResources: ComputeResource[]
): Map<string, ComputeResource[]> {
  const groups = new Map<string, ComputeResource[]>()
  for (const resource of gpuResources) {
    const key = gpuGroupKey(resource)
    const members = groups.get(key)
    if (members) members.push(resource)
    else groups.set(key, [resource])
  }
  return groups
}

// The group's per-card bytes (its smallest member), or undefined when any member's memory is
// unknown (such a group is ineligible).
function groupPerCardBytes(members: ComputeResource[]): number | undefined {
  const memberBytes = members.map((r) => parseMemoryTotalBytes(r.memoryTotal))
  if (memberBytes.length === 0 || memberBytes.some((b) => b === undefined))
    return undefined
  return Math.min(...(memberBytes as number[]))
}

// Well-formed declared layouts (integer gpuCount >= 1), only gpuCount === forcedGpuCount when set.
function declaredLayouts(
  requirement: GpuResourceRequirement,
  forcedGpuCount?: number
): GpuLayout[] {
  return (requirement.layouts ?? []).filter(
    (l) =>
      Number.isInteger(l.gpuCount) &&
      l.gpuCount >= 1 &&
      (forcedGpuCount === undefined || l.gpuCount === forcedGpuCount)
  )
}

// Decimal GB each card of the layout must have, or undefined when the layout is malformed.
function layoutPerCardGb(layout: GpuLayout, recommended: number): number | undefined {
  const perCardVram = layout.gpuCount === 1 ? recommended : layout.vramPerGpu
  if (perCardVram === undefined || !Number.isFinite(perCardVram) || perCardVram <= 0)
    return undefined
  return perCardVram
}

// Units a resource stands for: `total`, or `max` on a legacy node that sends no total.
const resourceUnits = (resource: ComputeResource): number =>
  resource.total ?? resource.max ?? 0

/**
 * Whether a GPU resource is a pool: it stands for more than one card ((total ?? max) > 1).
 * The node passes ALL DeviceIDs of a resource to the container whatever amount was requested,
 * so a partial booking of a pool would hand out cards that are not paid for. Pools are
 * therefore only ever booked whole: amount === (total ?? max), and only when every unit is
 * free.
 * @param {ComputeResource} resource a GPU resource of the environment
 * @returns {boolean} true when the resource may only be booked whole
 */
export function isPooledGpuResource(resource: ComputeResource): boolean {
  return resourceUnits(resource) > 1
}

/**
 * Enumerates every feasible way to book the template's GPU requirement on one environment.
 *
 * GPUs are grouped by description; a group with any member lacking a parseable memoryTotal is
 * ineligible, and the group's per-card bytes are its smallest member's. For every declared
 * layout (only gpuCount === forcedGpuCount when set) and every group it needs:
 * per-card bytes >= ceil((gpuCount === 1 ? recommended : vramPerGpu) * 1e9), enough free whole
 * units, and per-card bytes * gpuCount >= ceil(recommended * 1e9). Ids are chosen as the
 * cheapest exact combination of whole units (ties: lower per-unit fee, then id). A pooled
 * resource (isPooledGpuResource) is taken whole or not at all. A resource with `min` > 0 that the booking leaves out would be auto-added by the
 * node, so it must be part of the booking (at least its min, a pool whole) or the
 * group/layout is infeasible.
 *
 * Cross-resource constraints, alternate id subsets and payment-time revalidation (see
 * validateGpuPlan) stay with the caller.
 * @param {PlanGpuLayoutsParams} params GPU resources, requirement, fees and optional forced width
 * @returns {GpuLayoutCandidate[]} feasible candidates sorted by gpuPrice, then gpuCount, then
 * group key; an empty array when nothing fits; a single empty-request candidate (layout null)
 * when there is no requirement
 */
export function planGpuLayouts(params: PlanGpuLayoutsParams): GpuLayoutCandidate[] {
  const { gpuResources, requirement, fees = {}, forcedGpuCount } = params
  if (!requirement) {
    return [
      { layout: null, groupKey: null, gpuRequests: [], gpuPrice: 0, perCardBytes: null }
    ]
  }
  const { recommended } = requirement
  if (!Number.isFinite(recommended) || recommended <= 0) return []
  const totalNeeded = gbToBytes(recommended)
  const feeOf = (id: string): number => {
    const fee = fees[id]
    return Number.isFinite(fee) ? fee : 0
  }

  // Every resource with min > 0, wherever it is: the node fills it in when not requested.
  const mandatory = gpuResources.filter((r) => (r.min ?? 0) > 0)
  const layouts = declaredLayouts(requirement, forcedGpuCount)

  const candidates: GpuLayoutCandidate[] = []
  for (const [groupKey, members] of groupGpuResources(gpuResources)) {
    const perCardBytes = groupPerCardBytes(members)
    if (perCardBytes === undefined) continue
    // Mandatory resources outside this group would join any booking made from it.
    if (mandatory.some((r) => !members.includes(r))) continue

    const ordered = [...members].sort(
      (a, b) => feeOf(a.id) - feeOf(b.id) || compareStrings(a.id, b.id)
    )

    for (const layout of layouts) {
      const perCardVram = layoutPerCardGb(layout, recommended)
      if (perCardVram === undefined) continue
      if (perCardBytes < gbToBytes(perCardVram)) continue
      if (perCardBytes * layout.gpuCount < totalNeeded) continue

      const gpuRequests = selectGpuUnits(ordered, layout.gpuCount, feeOf)
      if (!gpuRequests) continue
      const gpuPrice = gpuRequests.reduce((sum, r) => sum + feeOf(r.id) * r.amount, 0)
      candidates.push({ layout, groupKey, gpuRequests, gpuPrice, perCardBytes })
    }
  }

  return candidates.sort(
    (a, b) =>
      a.gpuPrice - b.gpuPrice ||
      (a.layout?.gpuCount ?? 0) - (b.layout?.gpuCount ?? 0) ||
      compareStrings(a.groupKey ?? '', b.groupKey ?? '')
  )
}

// Whole-pool amount when the pool can be booked whole right now, else undefined.
function wholePoolAmount(resource: ComputeResource): number | undefined {
  const units = resourceUnits(resource)
  return Number.isInteger(units) && grantableAmount(resource) >= units ? units : undefined
}

// The amount a member is booked at when chosen: a pool whole, a single card 1. Undefined when
// the member cannot be booked right now (pool not entirely free, single card not free).
function bookableAmount(resource: ComputeResource): number | undefined {
  if (isPooledGpuResource(resource)) return wholePoolAmount(resource)
  return grantableAmount(resource) >= 1 ? 1 : undefined
}

// Picks exactly `count` whole units from members (already in preference order) at the lowest
// total fee. Every member is either a single card or a pool booked whole, so each is a
// take-it-or-leave-it item of fixed size: an exact-size, minimum-cost 0/1 choice, solved by
// dynamic programming over the width (at most 64). Members with min > 0 are always taken, since
// the node would add them anyway. On equal cost the earlier members in preference order win.
// Returns undefined when the count cannot be met exactly.
function selectGpuUnits(
  ordered: ComputeResource[],
  count: number,
  feeOf: (id: string) => number
): ComputeResourceRequest[] | undefined {
  const chosen = new Map<string, number>()
  let remaining = count
  const optional: Array<{ resource: ComputeResource; amount: number }> = []
  for (const r of ordered) {
    const amount = bookableAmount(r)
    if ((r.min ?? 0) > 0) {
      if (amount === undefined || Math.ceil(r.min ?? 0) > amount || amount > remaining)
        return undefined
      chosen.set(r.id, amount)
      remaining -= amount
    } else if (amount !== undefined && amount <= remaining) {
      optional.push({ resource: r, amount })
    }
  }

  // best[w]: cheapest set of optional members (indices into `optional`) totalling w units.
  const best: Array<{ cost: number; picks: number[] } | undefined> = [
    { cost: 0, picks: [] }
  ]
  optional.forEach(({ resource, amount }, i) => {
    const fee = feeOf(resource.id) * amount
    for (let w = remaining; w >= amount; w--) {
      const from = best[w - amount]
      if (!from) continue
      const current = best[w]
      if (!current || from.cost + fee < current.cost)
        best[w] = { cost: from.cost + fee, picks: [...from.picks, i] }
    }
  })
  const pick = best[remaining]
  if (!pick) return undefined
  for (const i of pick.picks) chosen.set(optional[i].resource.id, optional[i].amount)
  return ordered
    .filter((r) => chosen.has(r.id))
    .map((r) => ({ id: r.id, amount: chosen.get(r.id) ?? 0 }))
}

/** Result of assertSingleGpuGroup(). */
export type GpuGroupCheck =
  | {
      ok: true
      /** The one group every GPU request belongs to; null when no GPU is requested. */
      groupKey: string | null
    }
  | { ok: false; reason: string }

/**
 * Checks the single-group selection invariant: every request with amount > 0 whose id is one
 * of `gpuResources` belongs to the same GPU group (same description, or `id:<id>`). Request
 * ids that are not GPU resources (cpu, ram, disk) are ignored, so the full resource request
 * list may be passed.
 * @param {ComputeResource[]} gpuResources the environment's GPU resources
 * @param {ComputeResourceRequest[]} requests the selection to check
 * @returns {GpuGroupCheck} ok with the group key, or the reason the selection mixes groups
 */
export function assertSingleGpuGroup(
  gpuResources: ComputeResource[],
  requests: ComputeResourceRequest[]
): GpuGroupCheck {
  const byId = new Map(gpuResources.map((r) => [r.id, r]))
  let groupKey: string | null = null
  for (const request of requests) {
    if (!(request.amount > 0)) continue
    const resource = byId.get(request.id)
    if (!resource) continue
    const key = gpuGroupKey(resource)
    if (groupKey === null) groupKey = key
    else if (key !== groupKey) {
      return {
        ok: false,
        reason: `GPU selection mixes groups "${groupKey}" and "${key}"; book one GPU group only`
      }
    }
  }
  return { ok: true, groupKey }
}

/** Inputs of validateGpuPlan(). */
export interface ValidateGpuPlanParams {
  /** A FRESH snapshot of the environment's GPU resources. */
  gpuResources: ComputeResource[]
  /** The template's GPU requirement; undefined means the target declares no GPU demand. */
  requirement?: GpuResourceRequirement
  /**
   * The plan's GPU requests (e.g. a candidate's gpuRequests). Every id with amount > 0 must
   * still be a GPU resource of the snapshot; pass GPU requests only.
   */
  requests: ComputeResourceRequest[]
  /** Exact width the runtime will use (package TP size or the gpuCountEnv value). */
  forcedGpuCount?: number
}

/** Result of validateGpuPlan(). */
export type GpuPlanCheck =
  | {
      ok: true
      /** The declared layout the plan books; null without a requirement. */
      layout: GpuLayout | null
      /** The one group the plan books from; null when it books no GPU. */
      groupKey: string | null
    }
  | { ok: false; reason: string }

/**
 * Re-checks a previously chosen GPU plan against a fresh environment snapshot, with the same
 * rules as planGpuLayouts (call it at payment and again at start). The plan is valid when:
 * request amounts are whole, ids are unique and still GPU resources of the snapshot; all
 * requested ids are in ONE group; each id can still grant its amount (a pool only whole, a
 * resource with min > 0 at least its min). With a requirement additionally: no GPU resource
 * with min > 0 is left out (the node would add it); the booked count equals a declared layout
 * (and forcedGpuCount when set); the group's per-card bytes and the total fit as in
 * planGpuLayouts. Prices are not checked: re-quote from the returned plan.
 * @param {ValidateGpuPlanParams} params fresh GPU resources, requirement, plan requests, forced width
 * @returns {GpuPlanCheck} ok with the matched layout and group, or the first reason it fails
 */
export function validateGpuPlan(params: ValidateGpuPlanParams): GpuPlanCheck {
  const { gpuResources, requirement, requests, forcedGpuCount } = params
  const fail = (reason: string): GpuPlanCheck => ({ ok: false, reason })
  const byId = new Map(gpuResources.map((r) => [r.id, r]))

  const booked: ComputeResourceRequest[] = []
  const seen = new Set<string>()
  for (const request of requests) {
    if (seen.has(request.id)) return fail(`duplicate request for "${request.id}"`)
    seen.add(request.id)
    if (!Number.isInteger(request.amount) || request.amount < 0)
      return fail(`invalid amount ${request.amount} for "${request.id}"`)
    if (request.amount === 0) continue
    if (!byId.has(request.id))
      return fail(`GPU resource "${request.id}" is no longer in the environment`)
    booked.push(request)
  }

  const group = assertSingleGpuGroup(gpuResources, booked)
  if (group.ok === false) return fail(group.reason)

  for (const request of booked) {
    const resource = byId.get(request.id)
    const grantable = grantableAmount(resource)
    if (request.amount > grantable)
      return fail(
        `"${request.id}" can grant ${grantable} unit(s) now, the plan books ${request.amount}`
      )
    if (isPooledGpuResource(resource) && request.amount !== resourceUnits(resource))
      return fail(
        `"${request.id}" is a pool of ${resourceUnits(resource)} and can only be booked whole`
      )
    if (request.amount < Math.ceil(resource.min ?? 0))
      return fail(`"${request.id}" needs at least ${resource.min}`)
  }

  if (!requirement) return { ok: true, layout: null, groupKey: group.groupKey }

  const { recommended } = requirement
  if (!Number.isFinite(recommended) || recommended <= 0)
    return fail(`invalid recommended VRAM ${recommended}`)
  const missingMandatory = gpuResources.find(
    (r) => (r.min ?? 0) > 0 && !booked.some((b) => b.id === r.id)
  )
  if (missingMandatory)
    return fail(
      `"${missingMandatory.id}" has min ${missingMandatory.min} and would be added by the node`
    )
  if (booked.length === 0) return fail('the plan books no GPU')

  const count = booked.reduce((sum, r) => sum + r.amount, 0)
  if (forcedGpuCount !== undefined && count !== forcedGpuCount)
    return fail(`the plan books ${count} GPU(s), the runtime width is ${forcedGpuCount}`)
  const layout = declaredLayouts(requirement).find((l) => l.gpuCount === count)
  if (!layout) return fail(`${count} GPU(s) is not a declared layout`)
  const perCardVram = layoutPerCardGb(layout, recommended)
  if (perCardVram === undefined) return fail(`the ${count}-GPU layout is malformed`)

  const members = gpuResources.filter((r) => gpuGroupKey(r) === group.groupKey)
  const perCardBytes = groupPerCardBytes(members)
  if (perCardBytes === undefined)
    return fail(`group "${group.groupKey}" has a GPU of unknown memory`)
  if (perCardBytes < gbToBytes(perCardVram))
    return fail(
      `group "${group.groupKey}" cards have ${perCardBytes} bytes, the layout needs ${perCardVram} GB each`
    )
  if (perCardBytes * count < gbToBytes(recommended))
    return fail(
      `${count} card(s) of ${perCardBytes} bytes hold less than ${recommended} GB`
    )

  return { ok: true, layout, groupKey: group.groupKey }
}

/**
 * Best-effort CPU/RAM/disk sizing for the template's declared recommendations. Each declared
 * id gets clamp(recommended, env min, grantable); anything below recommended is reported as a
 * shortfall. Undeclared ids stay undefined in `amounts` (caller default). GPU entries in
 * `requirements` are ignored.
 * @param {ComputeResource[]} resources the environment's resources (cpu/ram/disk looked up by id)
 * @param {TemplateResourceRequirement[]} requirements the template's recommendedResources
 * @returns {SharedResourceSizing | null} null when a declared id with recommended > 0 is absent
 * or exhausted on the environment, or when any declared id's env min exceeds what is grantable
 */
export function sizeSharedResources(
  resources: ComputeResource[],
  requirements?: TemplateResourceRequirement[]
): SharedResourceSizing | null {
  const sizing: SharedResourceSizing = { amounts: {}, requests: [], shortfalls: [] }
  for (const req of requirements ?? []) {
    if (!('id' in req)) continue
    const { id, recommended } = req
    const wanted = Number.isFinite(recommended) && recommended > 0 ? recommended : 0
    const resource = resources.find((r) => r.id === id)
    if (!resource) {
      if (wanted > 0) return null
      sizing.amounts[id] = 0
      continue
    }
    const grantable = grantableAmount(resource)
    const min = resource.min ?? 0
    if (min > grantable || (wanted > 0 && grantable <= 0)) return null
    const allocated = Math.max(min, Math.min(wanted, grantable))
    sizing.amounts[id] = allocated
    if (allocated > 0) sizing.requests.push({ id, amount: allocated })
    if (allocated < wanted) sizing.shortfalls.push({ id, recommended: wanted, allocated })
  }
  return sizing
}

// ── GPU sizing profiles (authoring) ───────────────────────────────────

const GIB_IN_GB = 1.073741824
const MAX_SIZING_WIDTHS = 8
const MAX_GPU_WIDTH = 64
const DEFAULT_DRIVER_RESERVE_GIB = 0.5

const isFiniteNumber = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x)
const isNonNegative = (x: unknown): x is number => isFiniteNumber(x) && x >= 0
const isPositiveInt = (x: unknown): x is number =>
  Number.isInteger(x) && (x as number) > 0
const isUtilFraction = (x: unknown): x is number => isFiniteNumber(x) && x > 0 && x < 1
const isWidth = (x: unknown): x is number =>
  Number.isInteger(x) && (x as number) >= 1 && (x as number) <= MAX_GPU_WIDTH
const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key)

function profileError(message: string): Error {
  return new Error(`Invalid GpuSizingProfile: ${message}`)
}

/**
 * Validates a GpuSizingProfile and throws an Error naming the first problem: version not 1,
 * empty engine, unknown confidence, widths not strictly ascending integers 1..64 (1 to 8 of
 * them), negative or non-finite sizes, no memory at all, memUtil outside (0,1) or a per-width
 * map that does not cover exactly the declared widths, an override for an undeclared width
 * or without a positive vramPerGpu, a known source and a note, or non-string evidence.
 * @param {GpuSizingProfile} profile the profile to check
 */
export function validateGpuSizingProfile(profile: GpuSizingProfile): void {
  if (!profile || typeof profile !== 'object') throw profileError('not an object')
  if (profile.version !== 1) throw profileError(`unsupported version ${profile.version}`)
  if (typeof profile.engine !== 'string' || !profile.engine.trim())
    throw profileError('engine must be a non-empty string')
  if (profile.confidence !== 'measured' && profile.confidence !== 'estimated')
    throw profileError(`confidence must be 'measured' or 'estimated'`)

  const { widths } = profile
  if (!Array.isArray(widths) || widths.length === 0)
    throw profileError('widths must be a non-empty array')
  if (widths.length > MAX_SIZING_WIDTHS)
    throw profileError(`at most ${MAX_SIZING_WIDTHS} widths, got ${widths.length}`)
  widths.forEach((n, i) => {
    if (!isWidth(n))
      throw profileError(`width ${n} is not an integer in 1..${MAX_GPU_WIDTH}`)
    if (i > 0 && n <= widths[i - 1])
      throw profileError('widths must be strictly ascending (sorted, no duplicates)')
  })

  for (const key of ['shardableGiB', 'replicatedGiB'] as const) {
    if (!isNonNegative(profile[key]))
      throw profileError(`${key} must be a finite number >= 0`)
  }
  for (const key of ['outsideGiB', 'driverReserveGiB'] as const) {
    if (profile[key] !== undefined && !isNonNegative(profile[key]))
      throw profileError(`${key} must be a finite number >= 0 when set`)
  }
  if (profile.shardableGiB + profile.replicatedGiB + (profile.outsideGiB ?? 0) <= 0)
    throw profileError('declares no memory (shardable + replicated + outside is 0)')

  const { memUtil } = profile
  if (typeof memUtil === 'number') {
    if (!isUtilFraction(memUtil)) throw profileError(`memUtil ${memUtil} is not in (0,1)`)
  } else if (memUtil && typeof memUtil === 'object' && !Array.isArray(memUtil)) {
    const declared = new Set(widths.map(String))
    for (const key of Object.keys(memUtil)) {
      if (!declared.has(key)) throw profileError(`memUtil for undeclared width "${key}"`)
      if (!isUtilFraction(memUtil[key]))
        throw profileError(`memUtil["${key}"] ${memUtil[key]} is not in (0,1)`)
    }
    for (const n of widths) {
      if (!hasOwn(memUtil, String(n))) throw profileError(`memUtil missing width ${n}`)
    }
  } else {
    throw profileError('memUtil must be a number or a per-width map')
  }

  if (profile.overrides !== undefined) {
    const { overrides } = profile
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
      throw profileError('overrides must be an object keyed by width')
    const declared = new Set(widths.map(String))
    for (const key of Object.keys(overrides)) {
      if (!declared.has(key)) throw profileError(`override for undeclared width "${key}"`)
      const o = overrides[key]
      if (!o || !isFiniteNumber(o.vramPerGpu) || o.vramPerGpu <= 0)
        throw profileError(`override "${key}" needs a positive vramPerGpu`)
      if (o.source !== 'measured' && o.source !== 'policy' && o.source !== 'estimate')
        throw profileError(
          `override "${key}" source must be measured, policy or estimate`
        )
      if (typeof o.note !== 'string' || !o.note.trim())
        throw profileError(`override "${key}" needs a note`)
    }
  }

  if (
    profile.evidence !== undefined &&
    (!Array.isArray(profile.evidence) ||
      profile.evidence.some((e) => typeof e !== 'string'))
  )
    throw profileError('evidence must be an array of strings')
}

// floorGb(n) of an already validated profile, n a declared width.
function profileFloorGb(profile: GpuSizingProfile, n: number): number {
  const key = String(n)
  if (profile.overrides && hasOwn(profile.overrides, key))
    return profile.overrides[key].vramPerGpu
  const u = typeof profile.memUtil === 'number' ? profile.memUtil : profile.memUtil[key]
  const needGiB = profile.shardableGiB / n + profile.replicatedGiB
  const outsideGiB = profile.outsideGiB ?? 0
  const cardGiB =
    Math.max(needGiB / u, outsideGiB > 0 ? outsideGiB / (1 - u) : 0) +
    (profile.driverReserveGiB ?? DEFAULT_DRIVER_RESERVE_GIB)
  return Math.ceil(cardGiB * GIB_IN_GB)
}

/**
 * The per-card floor of one declared width: the smallest advertised card memoryTotal, in
 * whole decimal GB, on which the profile's default configuration fits at that width.
 *
 * With u = util(n): needGiB = shardableGiB / n + replicatedGiB;
 * cardGiB = max(needGiB / u, outsideGiB > 0 ? outsideGiB / (1 - u) : 0) + driverReserveGiB;
 * floorGb(n) = overrides[n].vramPerGpu when set, else ceil(cardGiB * 1.073741824).
 * @param {GpuSizingProfile} profile the sizing profile (validated; throws when invalid)
 * @param {number} n a width declared in profile.widths (throws otherwise)
 * @returns {number} decimal GB per card
 */
export function gpuFloorGb(profile: GpuSizingProfile, n: number): number {
  validateGpuSizingProfile(profile)
  if (!profile.widths.includes(n))
    throw profileError(
      `width ${n} is not declared in widths [${profile.widths.join(', ')}]`
    )
  return profileFloorGb(profile, n)
}

/**
 * Turns a GpuSizingProfile into the explicit GPU requirement a template carries.
 *
 * Layouts: width 1 -> { gpuCount: 1 }; width n > 1 -> { gpuCount: n, vramPerGpu: floorGb(n) }
 * (see gpuFloorGb). recommended: floorGb(1) when width 1 is declared, and then every n > 1
 * must satisfy n * floorGb(n) >= floorGb(1) (throws otherwise: the node rejects layouts whose
 * total is below the headline); without width 1, the minimum of n * floorGb(n).
 * The result has no gpuCountEnv or description: the caller adds them.
 * @param {GpuSizingProfile} profile the sizing profile (validated; throws when invalid)
 * @returns {GpuResourceRequirement} { kind: 'discrete', type: 'gpu', unit: 'GB', recommended, layouts }
 */
export function deriveGpuLayouts(profile: GpuSizingProfile): GpuResourceRequirement {
  validateGpuSizingProfile(profile)
  const floors = profile.widths.map((n) => ({ n, floor: profileFloorGb(profile, n) }))
  const layouts: GpuLayout[] = floors.map(({ n, floor }) =>
    n === 1 ? { gpuCount: 1 } : { gpuCount: n, vramPerGpu: floor }
  )
  let recommended: number
  const single = floors.find(({ n }) => n === 1)
  if (single) {
    recommended = single.floor
    for (const { n, floor } of floors) {
      if (n > 1 && n * floor < recommended)
        throw profileError(
          `width ${n} totals ${n * floor} GB, below the 1-GPU floor ${recommended} GB`
        )
    }
  } else {
    recommended = Math.min(...floors.map(({ n, floor }) => n * floor))
  }
  return { kind: 'discrete', type: 'gpu', unit: 'GB', recommended, layouts }
}

// ── Custom Hugging Face models (advisory) ─────────────────────────────

/** The attention fields of a Hugging Face config.json that decide tensor-parallel widths. */
export interface HfAttentionConfig {
  num_attention_heads?: number
  num_key_value_heads?: number
}

/** A minimal Hugging Face config.json; multimodal models nest the LLM under text_config. */
export interface HfTpConfig extends HfAttentionConfig {
  text_config?: HfAttentionConfig
}

/** Options of legalTpWidths(). */
export interface LegalTpWidthsOptions {
  /** Widths to test, integers 1..64; default [1, 2, 4, 8]. */
  candidates?: number[]
}

/**
 * Tensor-parallel widths the model's attention heads allow: n is kept when
 * num_attention_heads % n === 0 and (kv % n === 0 or n % kv === 0), kv being
 * num_key_value_heads (default: num_attention_heads). Reads text_config when it has
 * num_attention_heads (its own num_key_value_heads then applies), else the top level.
 *
 * Necessary, not sufficient: quantization block sizes, MLA, MoE expert sharding and the
 * engine's own checks can rule out more widths. Use the result as a hard filter only.
 * @param {HfTpConfig} cfg the model's config.json (or the subset above)
 * @param {LegalTpWidthsOptions} opts optional candidate widths (throws when not integers 1..64)
 * @returns {number[] | null} legal widths ascending; null when the head count is unknown
 * (unknown, not "all legal")
 */
export function legalTpWidths(
  cfg: HfTpConfig | null | undefined,
  opts: LegalTpWidthsOptions = {}
): number[] | null {
  const candidates = opts.candidates ?? [1, 2, 4, 8]
  if (!Array.isArray(candidates) || candidates.some((n) => !isWidth(n)))
    throw new Error(`legalTpWidths: candidates must be integers in 1..${MAX_GPU_WIDTH}`)
  const source = isPositiveInt(cfg?.text_config?.num_attention_heads)
    ? cfg.text_config
    : cfg
  const heads = source?.num_attention_heads
  if (!isPositiveInt(heads)) return null
  const kv = isPositiveInt(source.num_key_value_heads)
    ? source.num_key_value_heads
    : heads
  return [...new Set(candidates)]
    .sort((a, b) => a - b)
    .filter((n) => heads % n === 0 && (kv % n === 0 || n % kv === 0))
}

/** Inputs of estimateHfSizingProfile(); model-shape fields come from config.json / safetensors. */
export interface HfSizingInput {
  /** Safetensors parameter (element) counts per dtype, e.g. { BF16: 7.2e9, F32: 1e6 }. */
  paramsByDtype?: Record<string, number>
  /** Total parameter count, used when paramsByDtype is absent. */
  totalParams?: number
  /** Bytes per parameter with totalParams (default 2), or for a dtype not in the table. */
  bytesPerParam?: number
  numLayers?: number
  numKvHeads?: number
  headDim?: number
  /** MLA latent rank (DeepSeek kv_lora_rank); its presence means MLA. */
  kvLoraRank?: number
  /** MLA decoupled RoPE dims cached next to the latent (DeepSeek qk_rope_head_dim). */
  qkRopeHeadDim?: number
  /** Bytes per cached KV element; default 2. */
  kvBytes?: number
  /** Context the default configuration must hold, in tokens. */
  contextTokens: number
  /** Sequences of contextTokens held at once; default 1. */
  concurrentSeqs?: number
  /** Replicated per-GPU runtime (CUDA context, activations, graphs); default 5.5. */
  runtimeGiB?: number
  /** Engine memory budget fraction in (0,1); default 0.9. */
  memUtil?: number
  /** Widths to size, normally legalTpWidths() of the model. */
  widths: number[]
  /** Profile engine label; default 'vllm'. */
  engine?: string
}

/** Result of estimateHfSizingProfile(). */
export interface HfSizingEstimate {
  profile: GpuSizingProfile
  confidence: 'estimated'
  /** Inputs that were missing and are counted as 0 or defaulted (see the function doc). */
  unknown: string[]
}

// Bytes per element of the safetensors dtypes.
const SAFETENSORS_DTYPE_BYTES: Record<string, number> = {
  BOOL: 1,
  U8: 1,
  I8: 1,
  F8_E5M2: 1,
  F8_E4M3: 1,
  F8_E8M0: 1,
  I16: 2,
  U16: 2,
  F16: 2,
  BF16: 2,
  I32: 4,
  U32: 4,
  F32: 4,
  I64: 8,
  U64: 8,
  F64: 8
}

const GIB = 1024 ** 3

/**
 * Advisory GpuSizingProfile for a custom Hugging Face model. Pure and deliberately simple: use
 * it as a soft filter, never as a guarantee.
 *
 * - Weights (shardableGiB): sum of paramsByDtype counts times the dtype size (a dtype not in
 *   the safetensors table uses bytesPerParam and is listed as `dtype:<name>`), else
 *   totalParams * bytesPerParam (default 2, listed as `bytesPerParam`). Unknown weights
 *   (nothing usable) -> null.
 * - KV cache for contextTokens * concurrentSeqs: MLA (kvLoraRank set) caches
 *   (kvLoraRank + qkRopeHeadDim) * kvBytes per token and layer and is fully REPLICATED on every
 *   rank -> replicatedGiB. Otherwise 2 * numKvHeads * headDim * kvBytes per token and layer,
 *   sharded only while numKvHeads >= every width (-> shardableGiB), else counted whole on
 *   every rank (-> replicatedGiB, conservative). Missing shape fields count the KV (or the
 *   RoPE part) as 0 and are listed in `unknown`.
 * - runtimeGiB is replicated; memUtil is a single number; driver reserve keeps the default.
 * @param {HfSizingInput} input model shape, context and knobs
 * @returns {HfSizingEstimate | null} the estimated profile with the list of missing inputs, or
 * null when the weights are unknown; throws on invalid knobs or widths
 */
export function estimateHfSizingProfile(input: HfSizingInput): HfSizingEstimate | null {
  const fail = (message: string): Error =>
    new Error(`estimateHfSizingProfile: ${message}`)
  const {
    paramsByDtype,
    totalParams,
    bytesPerParam,
    contextTokens,
    concurrentSeqs = 1,
    runtimeGiB = 5.5,
    memUtil = 0.9,
    kvBytes = 2,
    widths
  } = input
  if (!isFiniteNumber(contextTokens) || contextTokens <= 0)
    throw fail('contextTokens must be a positive number')
  if (!isFiniteNumber(concurrentSeqs) || concurrentSeqs < 1)
    throw fail('concurrentSeqs must be >= 1')
  if (!isNonNegative(runtimeGiB)) throw fail('runtimeGiB must be >= 0')
  if (!isUtilFraction(memUtil)) throw fail('memUtil must be in (0,1)')
  if (!isFiniteNumber(kvBytes) || kvBytes <= 0) throw fail('kvBytes must be > 0')
  if (
    bytesPerParam !== undefined &&
    (!isFiniteNumber(bytesPerParam) || bytesPerParam <= 0)
  )
    throw fail('bytesPerParam must be > 0 when set')

  const unknown: string[] = []
  let weightBytes = 0
  const dtypes = paramsByDtype ? Object.entries(paramsByDtype) : []
  if (dtypes.length > 0) {
    for (const [dtype, count] of dtypes) {
      if (!isNonNegative(count)) throw fail(`paramsByDtype.${dtype} must be >= 0`)
      let size = SAFETENSORS_DTYPE_BYTES[dtype.toUpperCase()]
      if (size === undefined) {
        if (bytesPerParam === undefined) return null
        size = bytesPerParam
        unknown.push(`dtype:${dtype}`)
      }
      weightBytes += count * size
    }
  } else if (isFiniteNumber(totalParams) && totalParams > 0) {
    if (bytesPerParam === undefined) unknown.push('bytesPerParam')
    weightBytes = totalParams * (bytesPerParam ?? 2)
  } else {
    return null
  }
  if (weightBytes <= 0) return null

  const shape = (key: 'numLayers' | 'numKvHeads' | 'headDim' | 'qkRopeHeadDim') => {
    const v = input[key]
    if (isPositiveInt(v)) return v
    unknown.push(key)
    return undefined
  }
  const isMla = isPositiveInt(input.kvLoraRank)
  const numLayers = shape('numLayers')
  let perTokenLayerBytes: number | undefined
  if (isMla) {
    perTokenLayerBytes = (input.kvLoraRank + (shape('qkRopeHeadDim') ?? 0)) * kvBytes
  } else {
    const kvHeads = shape('numKvHeads')
    const headDim = shape('headDim')
    if (kvHeads !== undefined && headDim !== undefined)
      perTokenLayerBytes = 2 * kvHeads * headDim * kvBytes
  }
  const kvGiB =
    numLayers !== undefined && perTokenLayerBytes !== undefined
      ? (perTokenLayerBytes * numLayers * contextTokens * concurrentSeqs) / GIB
      : 0
  const maxWidth = Array.isArray(widths) && widths.length ? Math.max(...widths) : 1
  const kvShardable =
    !isMla && isPositiveInt(input.numKvHeads) && input.numKvHeads >= maxWidth
  const weightsGiB = weightBytes / GIB

  const profile: GpuSizingProfile = {
    version: 1,
    engine: input.engine ?? 'vllm',
    confidence: 'estimated',
    widths: Array.isArray(widths) ? [...widths] : widths,
    shardableGiB: weightsGiB + (kvShardable ? kvGiB : 0),
    replicatedGiB: runtimeGiB + (kvShardable ? 0 : kvGiB),
    memUtil,
    evidence: [
      `estimateHfSizingProfile: weights ${weightsGiB.toFixed(2)} GiB sharded; ` +
        `KV ${kvGiB.toFixed(2)} GiB ${isMla ? 'MLA ' : ''}` +
        `${kvShardable ? 'sharded' : 'replicated'} ` +
        `(${contextTokens} tokens x ${concurrentSeqs} seqs); ` +
        `runtime ${runtimeGiB} GiB replicated`
    ]
  }
  validateGpuSizingProfile(profile)
  return { profile, confidence: 'estimated', unknown }
}
