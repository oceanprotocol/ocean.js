import { getAddress } from 'ethers'

/**
 * Subsidy image gate — ported VERBATIM from ocean-node
 * (`core/utils/subsidyProviders.ts` + `c2d/serviceResourceMatching.ts`). Keep the matching rules
 * identical to the node: this is an exact-string matcher, not an image-reference parser.
 */

/**
 * The subset of a docker container spec the image gate matches against. A dockerfile-built image
 * is user-built (NOT a trusted operator image), so a non-empty `dockerfile` always makes the gate
 * match nothing — even when `image`/`tag` are also supplied.
 */
export interface SubsidyImageContainer {
  image?: string
  tag?: string
  checksum?: string
  dockerfile?: string
}

/**
 * Resolves the final Docker image reference from a service start spec.
 * Priority: dockerfile > checksum > tag > default "latest".
 */
export function resolveServiceImage(
  image: string,
  tag?: string,
  checksum?: string,
  dockerfile?: string,
  serviceId?: string
): string {
  if (dockerfile) return `${serviceId!.toLowerCase()}-svc-image:latest`
  if (checksum) return `${image}@${checksum}`
  return `${image}:${tag ?? 'latest'}`
}

/**
 * A docker entrypoint/cmd override is "custom" when it is non-empty. Handles both the service
 * shape (`string[]`) and the compute container shape (`string`); whitespace-only strings count
 * as empty.
 */
export function isNonEmpty(value: string | string[] | null | undefined): boolean {
  if (value === null || value === undefined) return false
  if (Array.isArray(value)) return value.length > 0
  return value.trim().length > 0
}

/**
 * True when `entry` (an operator allowlist docker reference) matches `container`.
 *
 * Compared against the SINGLE reference the node would resolve `container` to (dockerfile >
 * checksum > tag): a non-empty `dockerfile` matches NOTHING; else a `checksum` gives
 * `image@checksum` (tag ignored); else `image:${tag ?? 'latest'}`.
 *
 * WILDCARD TAG: an entry `name:*` matches ANY tag or digest of the exact image `name` (the name
 * may contain a registry `host:port`; only the trailing `:*` is special). Case-sensitive.
 */
export function imageReferenceMatches(
  container: SubsidyImageContainer | null | undefined,
  entry: string
): boolean {
  if (!container || !container.image) return false
  // Same truthy test as the engine (`if (dockerfile)`), NOT a trimmed isNonEmpty.
  if (container.dockerfile) return false
  const trimmed = (entry ?? '').trim()
  if (trimmed.length === 0) return false
  if (trimmed.endsWith(':*')) {
    const name = trimmed.slice(0, -2)
    return name.length > 0 && container.image === name
  }
  const candidate = resolveServiceImage(
    container.image,
    container.tag,
    container.checksum
  )
  return candidate === trimmed
}

/**
 * Apply the per-address image gate (`subsidyProviderAllowedImages`) to an effective subsidy list.
 *
 *   - `!allowedImages || zero keys` -> gate OFF; every address kept (`{}` means "no restrictions").
 *   - otherwise, per address: NOT a key in the map -> kept; a key -> kept ONLY when the job has
 *     no custom entrypoint/cmd AND its image matches one of that address's allowed refs.
 *
 * Map keys are checksum-normalized (and merged) before lookup. Pure: no network.
 */
export function filterSubsidyByAllowedImages(
  effective: string[],
  container: SubsidyImageContainer | null | undefined,
  hasCustomEntrypoint: boolean,
  allowedImages: Record<string, string[]> | null | undefined
): { kept: string[]; dropped: string[] } {
  if (!allowedImages || Object.keys(allowedImages).length === 0) {
    return { kept: effective, dropped: [] }
  }
  const normalized = new Map<string, string[]>()
  for (const [rawKey, list] of Object.entries(allowedImages)) {
    let key: string
    try {
      key = getAddress(rawKey)
    } catch {
      key = rawKey
    }
    const existing = normalized.get(key)
    normalized.set(key, existing ? [...existing, ...(list ?? [])] : (list ?? []))
  }
  const kept: string[] = []
  const dropped: string[] = []
  for (const addr of effective) {
    const key = getAddress(addr)
    const list = normalized.get(key)
    if (list === undefined) {
      kept.push(addr)
      continue
    }
    const allowed =
      !hasCustomEntrypoint &&
      list.some((entry) => imageReferenceMatches(container, entry))
    if (allowed) kept.push(addr)
    else dropped.push(addr)
  }
  return { kept, dropped }
}
