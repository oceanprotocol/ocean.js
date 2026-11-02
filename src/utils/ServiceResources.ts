/**
 * Matches a service template's `recommendedResources` against a compute environment (from
 * getComputeEnvironments()): GPU layout planning, plan re-validation and best-effort
 * CPU/RAM/disk sizing. Also the authoring-side sizing rule (GpuSizingProfile -> layouts) and
 * advisory helpers for custom Hugging Face models.
 *
 * Pure: no network, no node config. Callers own access, payment and duration checks, and
 * re-validate a plan (validateGpuPlan) before payment and start.
 *
 * Rules shared with ocean-node and every client:
 * - Memory is compared in integer bytes against ceil(GB * 1e9); unknown memory never fits.
 * - A layout books exactly `gpuCount` whole GPUs of ONE group (same description) on one host.
 * - A GPU resource with (total ?? max) > 1 is a pool. The node hands the container all of its
 *   devices whatever amount was requested, so a pool is booked whole or not at all.
 * - The node adds any GPU resource with min > 0 that a request leaves out, so every booking
 *   must include it.
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
  /** The declared layout booked; null when the target declares no GPU. */
  layout: GpuLayout | null
  /** The GPU group (description, or `id:<id>` without one); null without a layout. */
  groupKey: string | null
  /** Exact whole-unit requests, summing to layout.gpuCount. */
  gpuRequests: ComputeResourceRequest[]
  /** GPU price per minute: sum of fees[id] * amount. */
  gpuPrice: number
  /** Per-card bytes checked (the group's smallest card); null without a layout. */
  perCardBytes: number | null
}

/** Inputs of planGpuLayouts(). */
export interface PlanGpuLayoutsParams {
  /** The environment's GPU resources only; `memoryTotal` is per card, also for a pool. */
  gpuResources: ComputeResource[]
  /** The template's GPU requirement; undefined means no GPU demand. */
  requirement?: GpuResourceRequirement
  /** Fee per unit per minute by resource id, for the chosen chain/token; missing = 0. */
  fees?: Record<string, number>
  /** Exact width the runtime will use (package TP size or `gpuCountEnv` value). */
  forcedGpuCount?: number
}

/** Result of sizeSharedResources(). */
export interface SharedResourceSizing {
  /** Allocated amount per declared id, in grant units (cores, GiB). */
  amounts: Partial<Record<SharedResourceId, number>>
  /** The amounts as requests; zero amounts omitted (the node rejects them). */
  requests: ComputeResourceRequest[]
  /** Declared ids allocated less than recommended, in the recommendation's units. */
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
 * Parses a `memoryTotal` string ("143771 MiB", "16 GiB", "8GB", "1024") into bytes, with
 * ocean-node's grammar: b/kb/mb/gb/tb decimal, kib/mib/gib/tib binary, any case, no unit =
 * bytes.
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
 * Whole units a new booking can still get: max(0, min(max, total - inUse)), with `max`
 * standing in for a missing `total` (legacy node).
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

const GIB_BYTES = 1024 ** 3

// ram and disk are granted in whole GiB; a GB recommendation rounds up to cover it.
const isMemoryShared = (id: string): boolean => id === 'ram' || id === 'disk'
const gbToGrantUnits = (gb: number): number => Math.ceil(gbToBytes(gb) / GIB_BYTES)
const grantUnitsToGb = (units: number): number => (units * GIB_BYTES) / 1e9

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
 * Whether a GPU resource is a pool ((total ?? max) > 1), bookable only whole and only when
 * every unit is free.
 * @param {ComputeResource} resource a GPU resource of the environment
 * @returns {boolean} true when the resource may only be booked whole
 */
export function isPooledGpuResource(resource: ComputeResource): boolean {
  return resourceUnits(resource) > 1
}

/**
 * Every feasible way to book the GPU requirement on one environment, cheapest first.
 *
 * A group qualifies for a declared layout (only `forcedGpuCount` when set) when all its cards
 * report memory, its smallest card holds the per-card VRAM (`recommended` for one GPU,
 * `vramPerGpu` otherwise), `gpuCount` cards hold `recommended`, and enough whole units are
 * free. Ids are the cheapest exact combination (ties: lower fee, then id).
 * @param {PlanGpuLayoutsParams} params GPU resources, requirement, fees and optional forced width
 * @returns {GpuLayoutCandidate[]} sorted by gpuPrice, gpuCount, group key; empty when nothing
 * fits; one empty candidate (layout null) when there is no requirement
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

// Picks exactly `count` units from `ordered` at the lowest total fee, earlier members winning
// ties. Each member is a fixed-size item (one card, or a whole pool), so this is an exact-size
// 0/1 knapsack over the width. Members with min > 0 are always taken. Undefined when `count`
// cannot be met exactly.
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
 * Checks that every requested GPU (amount > 0) is in one group. Non-GPU ids (cpu, ram, disk)
 * are ignored, so the full request list may be passed.
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
  /** The template's GPU requirement; undefined means no GPU demand. */
  requirement?: GpuResourceRequirement
  /** The plan's GPU requests only (e.g. a candidate's gpuRequests). */
  requests: ComputeResourceRequest[]
  /** Exact width the runtime will use (package TP size or `gpuCountEnv` value). */
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
 * Re-checks a chosen plan against a fresh environment snapshot with planGpuLayouts' rules; call
 * it at payment and again at start. Checks whole unique amounts, ids still GPUs of the
 * snapshot, one group, and each amount still grantable (pools whole, mins met). With a
 * requirement also: no min > 0 GPU left out, the count is a declared layout (and
 * forcedGpuCount), and the cards still hold it. Prices are not checked: re-quote from the plan.
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
 * Best-effort CPU/RAM/disk sizing for the template's declared recommendations
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
    const mem = isMemoryShared(id)
    // `wanted` is in grant units (GiB for ram/disk, cores for cpu), like the env amounts.
    const wantedGb = Number.isFinite(recommended) && recommended > 0 ? recommended : 0
    const wanted = mem ? gbToGrantUnits(wantedGb) : wantedGb
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
    // Shortfall in the recommendation's units: 64 GB met by 60 GiB (64.4 GB) is none.
    const allocatedRec = mem ? grantUnitsToGb(allocated) : allocated
    if (allocatedRec < wantedGb)
      sizing.shortfalls.push({ id, recommended: wantedGb, allocated: allocatedRec })
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
 * Validates a GpuSizingProfile against the constraints on its fields; throws an Error naming
 * the first violation.
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
 * Per-card floor of a declared width: the smallest card memoryTotal (whole decimal GB) the
 * profile fits on at that width. With u = memUtil at width n:
 *   needGiB    = shardableGiB / n + replicatedGiB
 *   cardGiB    = max(needGiB / u, outsideGiB > 0 ? outsideGiB / (1 - u) : 0) + driverReserveGiB
 *   floorGb(n) = overrides[n]?.vramPerGpu ?? ceil(cardGiB * 1.073741824)
 * @param {GpuSizingProfile} profile the sizing profile (throws when invalid)
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
 * Turns a profile into the GPU requirement a template carries: width 1 -> { gpuCount: 1 },
 * width n -> { gpuCount: n, vramPerGpu: floorGb(n) } (see gpuFloorGb). `recommended` is
 * floorGb(1) when width 1 is declared (throws when some n * floorGb(n) is below it: the node
 * rejects such layouts), else the smallest n * floorGb(n).
 * @param {GpuSizingProfile} profile the sizing profile (throws when invalid)
 * @returns {GpuResourceRequirement} the requirement; the caller adds gpuCountEnv and description
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
 * Tensor-parallel widths the attention heads allow: n is kept when heads % n === 0 and
 * (kv % n === 0 || n % kv === 0), kv = num_key_value_heads (default: heads). Reads text_config
 * when it has num_attention_heads, else the top level.
 *
 * Necessary, not sufficient (quantization blocks, MLA, MoE sharding can rule out more widths).
 * @param {HfTpConfig} cfg the model's config.json
 * @param {LegalTpWidthsOptions} opts candidate widths (throws when not integers 1..64)
 * @returns {number[] | null} legal widths ascending; null when the head count is unknown
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
  /** Inputs missing and counted as 0 or defaulted. */
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
 * Advisory GpuSizingProfile for a custom Hugging Face model: a soft filter, never a guarantee.
 *
 * - Weights (sharded): paramsByDtype × dtype size (unknown dtype: bytesPerParam), else
 *   totalParams × bytesPerParam (default 2).
 * - KV cache for contextTokens × concurrentSeqs, per token and layer: MLA caches
 *   (kvLoraRank + qkRopeHeadDim) × kvBytes, replicated on every rank; otherwise
 *   2 × numKvHeads × headDim × kvBytes, sharded while numKvHeads >= the widest width, else
 *   replicated. Missing shape fields count as 0.
 * - runtimeGiB is replicated.
 * Missing or defaulted inputs are listed in `unknown`.
 * @param {HfSizingInput} input model shape, context and knobs
 * @returns {HfSizingEstimate | null} null when the weights are unknown; throws on invalid knobs
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
