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

// credentials present on (almost) any payload we send to a node. these must never reach
// the logs, since they are what authorizes the request in the first place
const SENSITIVE_PAYLOAD_FIELDS = [
  'authorization', // auth token (JWT), usually sent on the Authorization header
  'signature', // consumer signature authorizing this command
  'aes_encrypted_key', // download: encrypted key material
  'encryptedDockerRegistryAuth' // compute: encrypted docker registry credentials
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
    if (SENSITIVE_PAYLOAD_FIELDS.includes(key)) {
      copy[key] = isDefined(item) ? REDACTED : item
    } else {
      copy[key] = redactSensitiveFields(item, seen)
    }
  }
  seen.delete(value)
  return copy
}
