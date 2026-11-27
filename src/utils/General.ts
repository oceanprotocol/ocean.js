/**
 * Simple blocking sleep function
 * @param {number} ms - Number of milliseconds to wait
 */
export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function isDefined(something: any): boolean {
  return something !== undefined && something !== null
}

/**
 * Builds the wire params for the admin `collectFees` command. Shared by the HTTP and P2P
 * transports so both validate an explicit amount identically before signing or sending.
 *
 * `tokenAmount` is optional: omitting it (undefined/null) is an intentional full-balance
 * sweep, so the key is left off the payload entirely. When present it must be finite — a
 * non-finite number (NaN/Infinity) serializes to JSON `null`, which the node would read as a
 * sweep, so it is rejected up front rather than silently sweeping. Zero is a valid explicit
 * amount and is preserved. The original value is sent unchanged (a string keeps its exact
 * precision); the numeric coercion is only for the finiteness check.
 *
 * @param {CollectFeesParams} p - the collectFees parameters.
 * @return {Record<string, any>} the validated params to send to the node.
 */
export function buildCollectFeesParams(p: {
  chainId: number
  tokenAddress: string
  destinationAddress: string
  tokenAmount?: string | number
}): Record<string, any> {
  const params: Record<string, any> = {
    chainId: p.chainId,
    tokenAddress: p.tokenAddress,
    destinationAddress: p.destinationAddress
  }
  if (isDefined(p.tokenAmount)) {
    const numeric =
      typeof p.tokenAmount === 'string'
        ? Number(p.tokenAmount)
        : (p.tokenAmount as number)
    if (!Number.isFinite(numeric)) {
      throw new Error(
        `collectFees: tokenAmount must be a finite value (omit it to sweep the balance), got ${String(
          p.tokenAmount
        )}`
      )
    }
    params.tokenAmount = p.tokenAmount
  }
  return params
}

// credentials present on (almost) any payload we send to a node. these must never reach
// the logs, since they are what authorizes the request in the first place.
// lowercase: keys are matched case-insensitively, since a header-cased "Authorization" or a
// caller's own casing inside the free-form policy server blobs leaks just as badly
const SENSITIVE_PAYLOAD_FIELDS = [
  'authorization', // auth token (JWT), usually sent on the Authorization header
  'signature', // consumer signature authorizing this command
  'aes_encrypted_key', // download: encrypted key material
  'encrypteddockerregistryauth' // compute: encrypted docker registry credentials
]

const REDACTED = '[REDACTED]'

/**
 * Returns a copy of the payload with every credential field redacted, at any depth.
 *
 * This must not mutate its input: the caller still needs the real credentials to send the
 * request, and credentials also show up nested (the free-form `policyServer` /
 * `policyServerPassthrough` blobs), so we rebuild containers instead of writing into them.
 *
 * Only plain objects and arrays are walked - Buffers, typed arrays, Dates, streams and the
 * like are passed through untouched.
 *
 * @param {any} value - the payload to redact
 * @param {WeakSet<object>} seen - internal cycle guard
 * @return {any} a redacted copy, safe to log
 */
export function redactSensitiveFields(
  value: any,
  seen: WeakSet<object> = new WeakSet()
): any {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (seen.has(value)) {
    return '[CIRCULAR]'
  }
  if (Array.isArray(value)) {
    seen.add(value)
    const copy = value.map((item) => redactSensitiveFields(item, seen))
    seen.delete(value)
    return copy
  }
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) {
    return value
  }
  seen.add(value)
  const copy: any = {}
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_PAYLOAD_FIELDS.includes(key.toLowerCase())) {
      copy[key] = isDefined(item) ? REDACTED : item
    } else {
      copy[key] = redactSensitiveFields(item, seen)
    }
  }
  seen.delete(value)
  return copy
}
