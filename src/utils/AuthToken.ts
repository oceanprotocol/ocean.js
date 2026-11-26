import { peerIdFromString } from '@libp2p/peer-id'
import { AuthTokenOptions, UNRESTRICTED_AUDIENCE } from '../@types/Provider.js'
import { buildCreateAuthTokenSignatureMessage } from './SignatureUtils.js'
import { COMMANDS } from './CommandCatalog.js'
import { LoggerInstance } from './Logger.js'

// Client-side caps mirror the node's (plan §5.3). The node is authoritative; these just give
// callers fast, precise errors.
const MAX_AUDIENCE_ENTRIES = 16
const MAX_SCOPE_ENTRIES = 32

/**
 * Backward-compat shim: `generateAuthToken(consumer, nodeUri, options?, signal?)` used to be
 * `(consumer, nodeUri, signal?)`. Disambiguate a 3rd arg that is actually an AbortSignal from an
 * options object.
 */
export function normalizeAuthTokenArgs(
  options?: AuthTokenOptions | AbortSignal,
  signal?: AbortSignal
): { opts?: AuthTokenOptions; abortSignal?: AbortSignal } {
  if (
    options &&
    (typeof (options as AbortSignal).aborted === 'boolean' ||
      typeof (options as AbortSignal).addEventListener === 'function')
  ) {
    return { opts: undefined, abortSignal: options as AbortSignal }
  }
  return { opts: options as AuthTokenOptions | undefined, abortSignal: signal }
}

export interface PreparedAuthTokenRequest {
  /** the exact message to sign (v2 scoped message, or the legacy concat). */
  message: string
  /** whether this is a v2 (scoped) token. */
  isV2: boolean
  /** the POST/P2P body WITHOUT the signature — the caller adds `signature` after signing. */
  body: Record<string, any>
}

/**
 * Resolve audience / scope / validUntil into the exact signed message + request body for a
 * create-auth-token request (plan §3 / §4.3 / §10.1). Mirrors the node's validation so callers get
 * precise errors; the node remains authoritative.
 *
 * Defaults (lever A, plan §10.1): when `audience` is omitted it defaults to `[issuerPeerId]`
 * (node-scoped, secure by default). Pass `UNRESTRICTED_AUDIENCE` to opt out. Whenever the token is
 * v2 (essentially always, given the node-scoped default), `validUntil` is REQUIRED and is NOT
 * defaulted by ocean.js — the caller must pass it (approved breaking change).
 *
 * @param issuerPeerId the VERIFIED issuer peerId (from the OJ-03 challenge, not the raw status id)
 */
export function prepareAuthTokenRequest(args: {
  consumerAddress: string
  nonce: string
  issuerPeerId: string
  options?: AuthTokenOptions
  maxTokenLifetime?: number
}): PreparedAuthTokenRequest {
  const { consumerAddress, nonce, issuerPeerId, options, maxTokenLifetime } = args
  const rawAudience = options?.audience
  const scope = options?.scope
  const validUntil = options?.validUntil

  // ── audience resolution
  let audience: string[] | undefined
  if (rawAudience === UNRESTRICTED_AUDIENCE) {
    // explicit opt-out → unrestricted (omit the field). Minting a reusable network-wide bearer is
    // security-relevant, so surface it at the DEFAULT log level: LoggerInstance defaults to
    // LogLevel.Error, at which `.warn` is swallowed — use `.error` so the notice is actually seen.
    LoggerInstance.error(
      'generateAuthToken: minting an UNRESTRICTED auth token (usable at any node). Prefer a node-scoped or multi-node audience.'
    )
    audience = undefined
  } else if (Array.isArray(rawAudience)) {
    if (rawAudience.length === 0) {
      throw new Error(
        'empty audience is not allowed; omit the field (node-scoped) or pass the unrestricted sentinel'
      )
    }
    if (rawAudience.length > MAX_AUDIENCE_ENTRIES) {
      throw new Error(`audience exceeds the maximum of ${MAX_AUDIENCE_ENTRIES} entries`)
    }
    // Canonicalize each audience entry to its base58 peerId string. The node validates the entry at
    // mint time but compares the STORED string against its own base58 peerId at USE time — so an
    // entry supplied in another valid encoding (e.g. a base32 CIDv1) mints a token that the intended
    // node then rejects. Normalizing here (in both the signed message and the body, which both derive
    // from this array) keeps the audience in the exact form the node matches against. Entries that
    // don't parse as a peerId are passed through unchanged: the node rejects a genuinely malformed
    // peerId at mint just as it does today, and this keeps the shared golden-vector contract intact.
    audience = rawAudience.map((entry) => {
      try {
        return peerIdFromString(entry).toString()
      } catch {
        return entry
      }
    })
  } else {
    // default: node-scoped to the verified issuer (secure by default)
    audience = [issuerPeerId]
  }

  // ── scope validation
  if (scope !== undefined) {
    if (!Array.isArray(scope) || scope.length === 0) {
      throw new Error('empty scope is not allowed; omit the field for unrestricted')
    }
    if (scope.length > MAX_SCOPE_ENTRIES) {
      throw new Error(`scope exceeds the maximum of ${MAX_SCOPE_ENTRIES} entries`)
    }
    for (const cmd of scope) {
      const info = COMMANDS[cmd]
      if (!info) {
        throw new Error(`unknown command in scope: ${cmd}`)
      }
      if (!info.scopable) {
        throw new Error(`command ${cmd} is not allowed in an auth-token scope`)
      }
    }
  }

  const hasAudience = Array.isArray(audience) && audience.length > 0
  const hasScope = Array.isArray(scope) && scope.length > 0

  // ── validUntil: REQUIRED, never defaulted by ocean.js (plan §3.3 / §10.1). Every token ocean.js
  // mints is v2 (even the unrestricted `audience: 'any'` case, which is v2 with no audience claim),
  // so a missing validUntil is always an error — checked BEFORE signing, regardless of audience.
  if (validUntil === undefined) {
    throw new Error(
      'validUntil is required to mint an auth token (epoch ms, within the node maxTokenLifetime)'
    )
  }
  if (!Number.isInteger(validUntil)) {
    throw new Error('validUntil must be an integer epoch-milliseconds timestamp')
  }
  if (validUntil <= Date.now()) {
    throw new Error('validUntil must be in the future')
  }
  // Reject (don't just warn) an over-cap validUntil before signing when the node's advertised cap
  // is known — mirrors the node's reject-don't-clamp rule, incl. its +60s skew (don't hardcode 24h).
  if (maxTokenLifetime && validUntil > Date.now() + maxTokenLifetime * 1000 + 60_000) {
    throw new Error(
      `validUntil exceeds the node's maxTokenLifetime (${maxTokenLifetime}s); choose an earlier expiry.`
    )
  }

  // ── Snapshot the validated audience/scope ONCE, so a caller mutating their array during the
  // async signing step cannot change what gets submitted after the signature is computed.
  const audienceOut = hasAudience ? [...audience] : undefined
  const scopeOut = hasScope ? [...scope] : undefined

  // ── build the signed message (always v2)
  const message = buildCreateAuthTokenSignatureMessage({
    address: consumerAddress,
    nonce,
    issuerPeerId,
    audience: audienceOut,
    scope: scopeOut,
    validUntil
  })

  // ── body mirrors EXACTLY what was signed (omit absent aud/scope)
  const body: Record<string, any> = { address: consumerAddress, nonce, validUntil }
  if (audienceOut) body.audience = audienceOut
  if (scopeOut) body.scope = scopeOut

  return { message, isV2: true, body }
}
