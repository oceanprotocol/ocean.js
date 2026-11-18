import { AuthTokenOptions, UNRESTRICTED_AUDIENCE } from '../@types/Provider'
import { buildCreateAuthTokenSignatureMessage } from './SignatureUtils'
import { COMMANDS } from './CommandCatalog'
import { PROTOCOL_COMMANDS } from '../@types/Provider'
import { LoggerInstance } from './Logger'

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
    // explicit opt-out → unrestricted (omit the field). Warn: reusable network-wide bearer.
    LoggerInstance.warn(
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
    audience = rawAudience
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
  const isV2 = hasAudience || hasScope || validUntil !== undefined

  // ── validUntil: required for v2, never defaulted by ocean.js (plan §3.3 / §10.1)
  if (isV2 && validUntil === undefined) {
    throw new Error(
      'validUntil is required when minting a scoped (v2) auth token (audience/scope set or node-scoped default)'
    )
  }
  if (validUntil !== undefined) {
    if (!Number.isInteger(validUntil)) {
      throw new Error('validUntil must be an integer epoch-milliseconds timestamp')
    }
    if (validUntil <= Date.now()) {
      throw new Error('validUntil must be in the future')
    }
    // Precise client-side cap check against the node's advertised policy (don't hardcode 24h).
    if (
      maxTokenLifetime &&
      validUntil > Date.now() + maxTokenLifetime * 1000 + 60_000
    ) {
      LoggerInstance.warn(
        `generateAuthToken: validUntil exceeds the node's maxTokenLifetime (${maxTokenLifetime}s); the node will reject it.`
      )
    }
  }

  // ── build the signed message
  const message = isV2
    ? buildCreateAuthTokenSignatureMessage({
        address: consumerAddress,
        nonce,
        issuerPeerId,
        audience: hasAudience ? audience : undefined,
        scope: hasScope ? scope : undefined,
        validUntil: validUntil as number
      })
    : String(consumerAddress) +
      String(nonce) +
      String(PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN) +
      String(issuerPeerId)

  // ── body mirrors EXACTLY what was signed (omit absent aud/scope)
  const body: Record<string, any> = { address: consumerAddress, nonce }
  if (isV2) {
    body.validUntil = validUntil
    if (hasAudience) body.audience = audience
    if (hasScope) body.scope = scope
  }

  return { message, isV2, body }
}
