import { parseUnits } from 'ethers'
import type {
  ComputeEnvironment,
  ComputeResourceRequest,
  ServiceCostEstimate
} from '../@types/Compute.js'

/** Assumed `claimDurationTimeout` (seconds) — per-node config that no protocol command exposes. */
export const DEFAULT_CLAIM_DURATION_TIMEOUT_SECONDS = 3600

/** ocean-node job types: COMPUTE=1 (floors on `minJobDuration`), SERVICE=2 (`minServiceDuration`). */
function isComputeJobType(jobType: number | string | undefined): boolean {
  if (jobType === undefined) return false
  return String(jobType).toLowerCase() === 'compute' || Number(jobType) === 1
}

/**
 * Reimplementation of ocean-node's `C2DEngine.calculateResourcesCost` — there is no server-side
 * quote command, so the cost has to be derived client-side:
 * `cost = sum(price(id) * amount * ceil(effectiveDuration / 60))`, with
 * `effectiveDuration = max(duration, floor)` where floor is `env.minJobDuration` for COMPUTE
 * (`jobType` 1) and `env.minServiceDuration` otherwise (SERVICE, the default).
 *
 * `feeToken` is matched case-insensitively but the env's OWN spelling is returned (the node
 * compares with `===`). An unknown resource id is priced 0 (as the node does) and reported in
 * `unpricedResourceIds`. Returns `null` when the env advertises no fee schedule for
 * `(chainId, token)`.
 *
 * Advisory: the node recomputes cost at start and is authoritative.
 */
export function estimateServiceCost(
  env: ComputeEnvironment,
  chainId: number,
  token: string,
  resources: ComputeResourceRequest[],
  durationSeconds: number,
  jobType?: number | string
): ServiceCostEstimate | null {
  const schedules = env.fees?.[String(chainId)]
  const schedule = schedules?.find(
    (f) => f.feeToken?.toLowerCase() === token.toLowerCase()
  )
  if (!schedule) return null

  const floor = isComputeJobType(jobType)
    ? (env.minJobDuration ?? 0)
    : (env.minServiceDuration ?? 0)
  const effectiveDurationSeconds = Math.max(durationSeconds, floor)
  const minutesBilled = Math.ceil(effectiveDurationSeconds / 60)

  const unpricedResourceIds: string[] = []
  let costHuman = 0
  for (const request of resources) {
    const entry = schedule.prices?.find((p) => p.id === request.id)
    const price = Number(entry?.price ?? 0)
    // A missing, non-finite or negative price is treated as 0 and flagged (never thrown on).
    const priced = entry !== undefined && Number.isFinite(price) && price >= 0
    if (!priced) unpricedResourceIds.push(request.id)
    costHuman += (priced ? price : 0) * request.amount * minutesBilled
  }

  return {
    costHuman,
    feeToken: schedule.feeToken,
    effectiveDurationSeconds,
    minutesBilled,
    resources,
    unpricedResourceIds
  }
}

/**
 * Float64 -> plain decimal string with the binary-representation noise stripped
 * (`toPrecision(15)`), expanding exponent notation by hand (which `parseUnits` rejects).
 */
function toPlainDecimalString(value: number, significantDigits = 15): string {
  const s = value.toPrecision(significantDigits)
  if (!/e/i.test(s)) return s

  const [mantissa, expPart] = s.split(/e/i)
  const exponent = Number(expPart)
  const negative = mantissa.startsWith('-')
  const [intPart, fracPart = ''] = mantissa.replace('-', '').split('.')
  const digits = intPart + fracPart
  const pointPosition = intPart.length + exponent

  let plain: string
  if (pointPosition <= 0) {
    plain = `0.${'0'.repeat(-pointPosition)}${digits}`
  } else if (pointPosition >= digits.length) {
    plain = digits + '0'.repeat(pointPosition - digits.length)
  } else {
    plain = `${digits.slice(0, pointPosition)}.${digits.slice(pointPosition)}`
  }
  return negative ? `-${plain}` : plain
}

/**
 * Human token amount -> raw base units as a decimal STRING (never a JS number). When the value
 * has more fraction digits than the token has decimals, the remainder is rounded UP by one base
 * unit — an estimate that rounds down would under-authorize.
 */
export function toRawAmount(costHuman: number, decimals: number): string {
  if (!Number.isFinite(costHuman) || costHuman < 0) {
    throw new Error(`Cannot convert cost ${costHuman} to raw token units`)
  }
  const plain = toPlainDecimalString(costHuman)
  const [intPart, fracPart = ''] = plain.split('.')
  const kept = fracPart.slice(0, decimals)
  const dropped = fracPart.slice(decimals)

  let raw = parseUnits(kept ? `${intPart}.${kept}` : intPart, decimals)
  if (/[1-9]/.test(dropped)) raw += 1n
  return raw.toString()
}

/**
 * `minLockSeconds` for a service of `durationSeconds`. ocean-node's rule is
 * `d + claimDurationTimeout` with a per-node, unexposed timeout (default 3600), so this is a
 * padded lower bound: `d + max(3600, ceil(0.25 * d))`.
 */
export function serviceMinLockSeconds(durationSeconds: number): number {
  return (
    durationSeconds +
    Math.max(DEFAULT_CLAIM_DURATION_TIMEOUT_SECONDS, Math.ceil(0.25 * durationSeconds))
  )
}
