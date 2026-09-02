import { type Libp2p, type Libp2pOptions, createLibp2p } from 'libp2p'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import { tcp } from '@libp2p/tcp'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { bootstrap } from '@libp2p/bootstrap'
import { identify, identifyPush } from '@libp2p/identify'
import { kadDHT, passthroughMapper } from '@libp2p/kad-dht'
import { ping } from '@libp2p/ping'
import { peerIdFromString } from '@libp2p/peer-id'
import { isLoopback, isPrivate } from '@libp2p/utils'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { WebSockets, WebSocketsSecure } from '@multiformats/multiaddr-matcher'
import { Signer, isAddress } from 'ethers'
import { sleep } from '../../utils/General.js'
import { LoggerInstance } from '../../utils/Logger.js'
import { concatUint8Arrays } from '../../utils/bytes.js'
import {
  LP_RESUME_BELOW_BYTES,
  LpFrameReader,
  type LpFramedStream,
  lpFramedStream,
  pauseReads,
  resumeReads
} from './lpFraming.js'
import { KEEP_ALIVE } from '@libp2p/interface'
import type { Connection, Stream, PeerId } from '@libp2p/interface'
import {
  StorageObject,
  FileInfo,
  ComputeJob,
  ComputeOutput,
  ComputeAlgorithm,
  ComputeAsset,
  ComputeEnvironment,
  ProviderInitialize,
  ProviderComputeInitializeResults,
  UserCustomParameters,
  ComputeResourceRequest,
  ComputeJobMetadata,
  PolicyServerInitializeCommand,
  PolicyServerPassthroughCommand,
  dockerRegistryAuth,
  DownloadResponse,
  ComputeResultStream,
  NodeStatus,
  NodeComputeJob,
  PersistentStorageAccessList,
  PersistentStorageBucket,
  PersistentStorageCreateBucketRequest,
  PersistentStorageDeleteFileResponse,
  PersistentStorageFileEntry,
  PersistentStorageObject,
  PersistentStorageUpdateBucketResponse,
  ServiceJob,
  ServiceJobListed,
  ServiceListFilters,
  ServiceRestartParams,
  ServiceTemplatePublic,
  ServiceStartParams,
  ServiceUserData,
  ServicePayment,
  OceanNode,
  NodeP2P,
  SignerOrAuthTokenOrSignature,
  CompleteSignature
} from '../../@types/index.js'
import { PROTOCOL_COMMANDS, NodeLogEntry } from '../../@types/Provider.js'
import { type DDO, type ValidateMetadata } from '@oceanprotocol/ddo-js'
import {
  getConsumerAddress,
  getSignature,
  getAuthorization,
  isAgentSignature
} from './BaseProvider.js'
import { eciesencrypt } from '../../utils/eciesencrypt.js'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import * as multiFormatRaw from 'multiformats/codecs/raw'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

export const OCEAN_P2P_PROTOCOL = '/ocean/nodes/1.0.0'
const OCEAN_DHT_PROTOCOL = '/ocean/nodes/1.0.0/kad/1.0.0'
/**
 * Total retries one P2P command may make, across every kind of failure. One budget
 * for the whole command rather than one per failure kind — see `sendP2pCommand`.
 */
const DEFAULT_MAX_RETRY_ATTEMPTS = 5
const DEFAULT_RETRY_DELAY_MS = 1000
/**
 * Ceiling on a single retry delay. The delay doubles per attempt from `retryDelay`, so
 * without a cap the last retry of a default configuration waits sixteen times as long
 * as the first, and a caller that raised `retryDelay` waits far longer than that.
 */
const RETRY_BACKOFF_CAP_MS = 15_000
/**
 * Retries a command may spend on expired deadlines, inside the overall budget.
 *
 * A timeout is the one retryable failure whose own budget is already long: up to the
 * dial timeout for a dial and up to the per-frame idle timeout — a minute by default —
 * for a peer that accepts the stream and then says nothing. Retrying that as freely as
 * a refused dial turns one minute of waiting into six, for a peer that has already
 * shown it is not answering. One retry is enough to clear a slow hop or a node that was
 * busy for a moment, and the overall budget still caps everything else.
 */
const MAX_TIMEOUT_RETRIES = 1
const DEFAULT_DIAL_TIMEOUT_MS = 10_000
/**
 * Per-chunk idle timeout for reading a response body (download, compute result,
 * logs, any multi-frame answer). Deliberately *not* the dial timeout: a node that
 * pauses fifteen seconds between chunks of a large transfer is slow, not dead, and
 * reusing the 10 s dial budget aborted valid transfers. Override with
 * `streamIdleTimeout`.
 */
const STREAM_IDLE_TIMEOUT_MS = 60_000
/**
 * Budget for a DHT `findPeer` walk. Applies to the lookup itself, composed with
 * whatever signal the operation already carries, so the shorter one wins.
 */
const FINDPEER_TIMEOUT_MS = 20_000
/**
 * Default cap on P2P commands in flight at once. A provider fan-out — "ask every
 * provider of this CID for its status" — otherwise bursts as many simultaneous
 * dials as it has providers and starves itself of the connection budget below.
 * Override with `maxConcurrentRequests`.
 */
const DEFAULT_MAX_CONCURRENT_REQUESTS = 8
/**
 * Connection budget for a client. Deliberately small: ocean.js talks to a handful
 * of nodes per operation, it does not index the network, so a large budget only
 * buys idle sockets and dial-queue contention. Override with `maxConnections`.
 *
 * Not *too* small, though: kad-dht keep-alive-tags up to `PEER_SET_SIZE` (20) of
 * its closest peers even in client mode, and the four permanently-tagged bootstrap
 * peers below add to that — 24 connections libp2p intends to keep. The pruner uses
 * tags only for sort order, so a cap under that number prunes tagged connections
 * anyway and the reconnect queue immediately redials them: steady-state churn.
 */
const CLIENT_MAX_CONNECTIONS = 32
/**
 * How long the peer store keeps a peer entry and its addresses, in ms.
 *
 * libp2p's own defaults are a 1 h address lifetime and a 6 h peer lifetime, but a
 * DHT provider record stays valid for 48 h. With the defaults, a provider record
 * found on the DHT routinely names a peer whose addresses the peer store has
 * already discarded, so there is nothing left to dial and the lookup fails even
 * though the record itself is perfectly good.
 *
 * Re-learning the address does not rescue it. When an address that is already
 * stored is stored again, the peer store carries the *previous* `observed`
 * timestamp forward instead of refreshing it, so an unchanged address keeps
 * ageing on its original clock no matter how often identify re-reports it.
 *
 * Matching both values to the 48 h provider-record lifetime keeps an address
 * dialable for exactly as long as the records that point at it. The two are equal
 * on purpose: `maxPeerAge` must be >= `maxAddressAge`, or the peer entry is evicted
 * while its addresses are still inside their own lifetime.
 */
const PEER_STORE_MAX_AGE_MS = 172_800_000
/**
 * Tag applied to the bootstrap peers. The `keep-alive` prefix is load-bearing:
 * libp2p's reconnect queue only redials a peer whose tag name *starts with*
 * `keep-alive`, and `@libp2p/bootstrap`'s own default tag is plain `bootstrap`,
 * which does not qualify. Without this, losing the one-shot bootstrap connection
 * silently strands the client with no DHT entry point.
 */
const BOOTSTRAP_KEEP_ALIVE_TAG = `${KEEP_ALIVE}-ocean-bootstrap`
/**
 * How long `stopP2P()` waits for a node creation it adopted before giving up on it.
 *
 * A stop publishes a barrier that rejects every incoming P2P call until it settles, so
 * an unbounded wait here does not just delay shutdown — it wedges the client for as
 * long as the creation stays stuck, and a creation parked inside `node.start()` behind
 * a hung transport, a slow DNS or bootstrap leg, or a user-supplied service may never
 * settle at all. Giving up is safe: a superseded creation stops the node it built
 * itself, on the generation check at the end of `createLibp2pNode`.
 */
const ADOPTED_CREATION_STOP_TIMEOUT_MS = 5000

/**
 * How long a resolved address set is reused before the tiers are walked again.
 *
 * Chosen against what an address is worth, not against what a lookup costs. A node
 * that moves to a new address is unreachable at the old one for at most this long,
 * which is the only real risk here; against that, one DHT walk per peer per
 * three-quarters of a minute is already far cheaper than the walk itself. Long enough
 * that a burst aimed at one peer — a provider fan-out, a compute lifecycle, a paged
 * download — shares a single lookup; short enough that a fleet redeploy is followed
 * within a minute without anybody restarting anything.
 *
 * This is only worth having now. While the peer store discarded an address after an
 * hour, an app-level cache in front of it was caching something the layer underneath
 * had already thrown away; now that an address lives as long as the provider record
 * that points at it, there is something real to hold on to.
 */
const PEER_RESOLUTION_TTL_MS = 45_000

/**
 * How long a peer that resolved to nothing at all is remembered as unresolvable.
 *
 * Deliberately a fraction of the positive lifetime: this exists to stop a fan-out
 * re-walking the DHT once per call for a peer that is simply absent, and for nothing
 * else. A peer that was briefly down has to become reachable again inside the same
 * session, so the entry expires on its own clock, is never extended by being read,
 * and is dropped outright by an invalidation.
 */
const PEER_RESOLUTION_NEGATIVE_TTL_MS = 5_000

/**
 * Which tier of {@link P2pProvider.resolvePeer} produced an address set.
 *
 * Returned rather than merely logged because it is the only way to see whether the
 * peer store is earning its keep. An address now lives there as long as the DHT
 * provider record that names it, and the whole point of that was to move resolutions
 * out of the `dht` lane and into `peer-store`; without provenance that is an argument
 * rather than a measurement.
 */
export type PeerAddressSource = 'connection' | 'peer-store' | 'dht' | 'none'

/** One answer from {@link P2pProvider.resolvePeer}. */
export interface ResolvedPeer {
  /**
   * Addresses for the peer: deduplicated, and ordered so a direct public address is
   * tried before a private one and both before anything relayed.
   */
  addresses: Multiaddr[]
  /** The tier that produced `addresses`, or `'none'` when nothing did. */
  source: PeerAddressSource
  /** True when this answer came from the resolution cache instead of a fresh lookup. */
  cached: boolean
}

/** Address-resolution outcomes. Exactly one is counted per `resolvePeer` call. */
const RESOLVE_CONNECTION_HIT = 'resolve:connection-hit'
const RESOLVE_CACHE_HIT = 'resolve:cache-hit'
const RESOLVE_PEERSTORE_HIT = 'resolve:peerstore-hit'
const RESOLVE_DHT_HIT = 'resolve:dht-hit'
const RESOLVE_NEGATIVE_CACHE_HIT = 'resolve:negative-cache-hit'
const RESOLVE_MISS = 'resolve:miss'
/** Counted separately: an invalidation is not the outcome of a resolution. */
const RESOLVE_INVALIDATED = 'resolve:invalidated'

/**
 * Resolution counters, so a change to how long the peer store keeps an address can be
 * measured rather than argued about. Seeded at module load, so a lane that has not
 * been used reads `0` — which is information — rather than being absent, which is not.
 *
 * Module scope for the same reason the libp2p node is: one node, one peer store, one
 * set of counters, whichever provider object asked.
 */
const peerResolutionCounters: Record<string, number> = {
  [RESOLVE_CONNECTION_HIT]: 0,
  [RESOLVE_CACHE_HIT]: 0,
  [RESOLVE_PEERSTORE_HIT]: 0,
  [RESOLVE_DHT_HIT]: 0,
  [RESOLVE_NEGATIVE_CACHE_HIT]: 0,
  [RESOLVE_MISS]: 0,
  [RESOLVE_INVALIDATED]: 0
}

function countPeerResolution(key: string): void {
  peerResolutionCounters[key] = (peerResolutionCounters[key] ?? 0) + 1
}

interface CachedPeerResolution {
  addresses: Multiaddr[]
  source: PeerAddressSource
  expiresAt: number
}

/** Peers whose addresses are known, keyed by peer id string. */
const peerResolutionCache = new Map<string, CachedPeerResolution>()
/** Peers that resolved to nothing, keyed by peer id string; value is the expiry. */
const peerResolutionMisses = new Map<string, number>()

/**
 * Drops every cached resolution. Called when the libp2p node goes away: the next node
 * has its own peer store and its own routing table, so an address learned through the
 * old one is a guess with no provenance left behind it.
 */
function clearPeerResolutionCache(): void {
  peerResolutionCache.clear()
  peerResolutionMisses.clear()
}

/**
 * What went wrong with a P2P operation, as a value.
 *
 * Retry decisions used to be made by testing error *messages* for substrings, which
 * is fragile in a way this file has already paid for: an unrelated error had to have
 * its wording chosen so that it would not accidentally look retryable. A closed set
 * of types cannot be tripped that way.
 *
 * - `resolve_failed` — no address for the peer, from any tier. Nothing was dialled.
 * - `dial_failed` — there were addresses and the transport did not deliver: the dial
 *   was refused, or a connection or stream died under the command. Also covers the
 *   peer reporting that *it* could not reach the node the command was addressed to.
 * - `protocol_failed` — the exchange itself failed: the peer answered with an error
 *   envelope, or answered something this protocol cannot use.
 * - `timeout` — a deadline expired: the caller's signal, a dial budget, or the
 *   per-frame idle budget.
 * - `peer_mismatch` — a dial succeeded and the peer on the other end is not the peer
 *   that was asked for.
 */
export type P2pErrorType =
  'resolve_failed' | 'dial_failed' | 'protocol_failed' | 'timeout' | 'peer_mismatch'

/**
 * A P2P failure carrying its {@link P2pErrorType}.
 *
 * Extends `Error` and keeps the message text the untyped code produced, so existing
 * handling — `instanceof Error`, logging, message matching — is unaffected; `type` is
 * additional information, not a replacement for any of it.
 */
export class P2pError extends Error {
  /** What kind of failure this is. */
  readonly type: P2pErrorType
  /** The peer the operation concerned, when one was known. */
  readonly peerId?: string
  /**
   * The reply body, when the failure was reported by the peer inside an otherwise
   * well-formed response. Kept so an exhausted retry budget can hand the caller the
   * same object the untyped code returned, instead of raising where it used to return.
   */
  readonly peerResponse?: { value: unknown }

  constructor(
    type: P2pErrorType,
    message: string,
    options: { cause?: unknown; peerId?: string; peerResponse?: { value: unknown } } = {}
  ) {
    super(message, options.cause == null ? undefined : { cause: options.cause })
    this.name = 'P2pError'
    this.type = type
    this.peerId = options.peerId
    this.peerResponse = options.peerResponse
  }
}

/**
 * libp2p error names that mean the transport did not deliver. Every one of them is
 * answered the same way — throw the connection away and, if the budget allows, start
 * a new one — which is why they share a single type.
 *
 * `UnexpectedEOFError` belongs here: from the reader's side a body that stops early is
 * a transport failure, and a clean end of stream is recognised before this point.
 */
const TRANSPORT_ERROR_NAMES: ReadonlySet<string> = new Set([
  'StreamResetError',
  'StreamAbortedError',
  'StreamStateError',
  'StreamBufferError',
  'MuxerClosedError',
  'ConnectionClosedError',
  'ConnectionClosingError',
  'ConnectionFailedError',
  'LimitedConnectionError',
  'DialError',
  'NoValidAddressesError',
  'TransportUnavailableError',
  'UnexpectedEOFError'
])

/** Names an expired deadline arrives under, depending on who aborted. */
const TIMEOUT_ERROR_NAMES: ReadonlySet<string> = new Set(['AbortError', 'TimeoutError'])

/**
 * Classifies a thrown value.
 *
 * Errors raised inside this file are already typed, so they answer for themselves;
 * everything else is recognised by its constructor name, which libp2p sets on every
 * error it defines and which — unlike a message — is part of its API.
 *
 * The fallback is `protocol_failed`, and that choice is deliberate: it is the type
 * that is *not* retried. An unrecognised failure gets one attempt rather than six, so
 * a new error from a dependency cannot turn into a retry storm on upgrade.
 */
export function classifyP2pError(err: unknown): P2pErrorType {
  if (err instanceof P2pError) return err.type
  const name = (err as { name?: string } | null)?.name
  if (name != null) {
    if (TIMEOUT_ERROR_NAMES.has(name)) return 'timeout'
    if (TRANSPORT_ERROR_NAMES.has(name)) return 'dial_failed'
  }
  return 'protocol_failed'
}

/**
 * Which failures are worth another attempt, and why the rest are not.
 *
 * - `dial_failed` — yes. A refused dial or a stream lost mid-command is the ordinary
 *   transient: the address is good and the socket was not. This is also what the two
 *   substring-matched paths this replaces were really retrying.
 * - `timeout` — yes. A deadline says how long we waited, not that the peer is gone,
 *   and a slow hop or a busy node commonly clears. (A retry is skipped anyway when it
 *   was the *caller's* signal that fired: their budget is spent, not ours.)
 * - `resolve_failed` — no. Resolution has already walked all three tiers, the DHT leg
 *   under its own budget, so a retry re-runs the same walk against the same routing
 *   table. The negative cache would answer the first retries from memory in any case,
 *   turning them into pure latency. This matches what the untyped code did, which
 *   retried neither of its resolution failures.
 * - `protocol_failed` — no. The peer answered; it will answer the same way again.
 * - `peer_mismatch` — no. Dialling the same address reaches the same wrong peer. The
 *   cached resolution is invalidated instead, so the caller's *next* call resolves
 *   afresh rather than this one spinning against a known-wrong address.
 */
const RETRYABLE_P2P_ERROR_TYPES: ReadonlySet<P2pErrorType> = new Set<P2pErrorType>([
  'dial_failed',
  'timeout'
])

export function isRetryableP2pError(type: P2pErrorType): boolean {
  return RETRYABLE_P2P_ERROR_TYPES.has(type)
}

/**
 * Final error for a failed command. Preserves the `P2P command error: <message>`
 * shaping the untyped code produced — consumers match on it — and adds the type.
 */
function asP2pCommandError(err: unknown, type: P2pErrorType): P2pError {
  const message = (err as { message?: string } | null)?.message ?? ''
  return new P2pError(type, `P2P command error: ${message}`, {
    cause: err,
    peerId: err instanceof P2pError ? err.peerId : undefined
  })
}

/**
 * Ensures a multiaddr string carries the peer id it belongs to, which is what makes it
 * dialable on its own.
 *
 * The helper this replaces took a single parameter named `peerId` and was called with
 * an *address*, so the address shadowed the peer id and it appended the address to
 * itself: `/ip4/…/ws` came back as `/ip4/…/ws/p2p//ip4/…/ws`, which no longer parses
 * as a multiaddr.
 */
function withPeerId(addr: string, peerId: string): string {
  return addr.includes('/p2p/') ? addr : `${addr}/p2p/${peerId}`
}

/**
 * Sort rank for a resolved address; lower is tried first.
 *
 * Relayed addresses come last unconditionally. They work, but they are metered by the
 * relay's data and duration limits and they spend a third party's bandwidth, so they
 * are a fallback and not a peer. Among direct addresses a routable one comes first: a
 * private or loopback address is either the local development case — where it is the
 * only address on offer anyway, so the order between them is moot — or a stale LAN
 * address left in the peer store from a different network, where dialling it first
 * only buys a connection timeout.
 */
function peerAddressRank(ma: Multiaddr): number {
  const relayed = /\/p2p-circuit(\/|$)/.test(ma.toString())
  const local = isLoopback(ma) || isPrivate(ma)
  return (relayed ? 2 : 0) + (local ? 1 : 0)
}

/**
 * Key two spellings of one address agree on.
 *
 * The tiers disagree about the trailing `/p2p/<id>`: a connection's `remoteAddr` and a
 * DHT record usually carry it, peer-store entries usually do not, and the dial path
 * adds it afterwards. Without normalising, one address reached through two tiers
 * counts as two and gets dialled twice.
 */
function peerAddressKey(ma: Multiaddr, peerId: string): string {
  const addr = ma.toString()
  const suffix = `/p2p/${peerId}`
  return addr.endsWith(suffix) ? addr.slice(0, -suffix.length) : addr
}

/**
 * Deduplicates and orders an address set. The sort is stable, so addresses of equal
 * rank keep the order the tier reported them in, and the first spelling of a
 * duplicated address is the one kept.
 */
function orderPeerAddresses(addrs: Multiaddr[], peerId: string): Multiaddr[] {
  const seen = new Set<string>()
  const unique: Multiaddr[] = []
  for (const ma of addrs) {
    const key = peerAddressKey(ma, peerId)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(ma)
  }
  return unique.sort((a, b) => peerAddressRank(a) - peerAddressRank(b))
}

/**
 * True in Node.js / Electron's main process, false in a browser page *and* in a
 * Web or Service Worker.
 *
 * Deliberately a positive check for Node rather than `typeof window === 'undefined'`:
 * `window` is also absent in workers, so that test calls a worker "Node" and we then
 * construct `tcp()` (which reaches for `node:net` and throws), treat every multiaddr
 * as dialable and let the connection gater allow loopback/private targets — none of
 * which a worker can do.
 */
function isNodeRuntime(): boolean {
  return typeof process !== 'undefined' && process.versions?.node != null
}

const IPV4_LITERAL = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

/**
 * Wraps a bare IP literal in a multiaddr so libp2p's own `isPrivate` / `isLoopback`
 * can classify it. Returns null for anything that is not an IP literal (a DNS name,
 * an empty string), which those helpers cannot answer for.
 */
function ipLiteralToMultiaddr(host: string): Multiaddr | null {
  if (host === '') return null
  try {
    return multiaddr(IPV4_LITERAL.test(host) ? `/ip4/${host}` : `/ip6/${host}`)
  } catch {
    return null
  }
}

/**
 * A signal that fires after `ms`, or as soon as `opSignal` does — whichever comes
 * first.
 *
 * Deliberately *not* `AbortSignal.any`. A composite built from a long-lived source
 * is registered in that source's internal dependant-signal set and is never pruned
 * from it, not even once the composite's own timeout has fired, so the composite is
 * retained for as long as the source signal lives and the set grows by one entry per
 * call. Measured on this exact call shape: 402 MB retained over 200k composites and
 * `alive 2000/2000` of a sampled batch, where a bare `AbortSignal.timeout` leaves
 * `0/2000`. `dhtLookupSignal` is fed the *caller's* signal, so a server or MCP that
 * holds one `AbortController` per session leaked one composite per DHT fallback for
 * that controller's whole lifetime.
 *
 * A plain `AbortController` has no such set to grow, so the listeners are registered
 * `{ once: true }` and removed by `cleanup()`. Callers MUST call `cleanup()` in a
 * `finally`.
 */
function timeoutSignal(
  opSignal: AbortSignal | undefined,
  ms: number
): { signal: AbortSignal; cleanup: () => void } {
  const timer = AbortSignal.timeout(ms)
  // Nothing to compose, and nothing to clean up: a bare timeout signal is collected
  // as soon as it fires and the caller drops it.
  if (opSignal == null) return { signal: timer, cleanup: () => {} }

  const controller = new AbortController()
  if (opSignal.aborted) {
    controller.abort(opSignal.reason)
    return { signal: controller.signal, cleanup: () => {} }
  }
  const onOpAbort = () => controller.abort(opSignal.reason)
  const onTimeout = () => controller.abort(timer.reason)
  opSignal.addEventListener('abort', onOpAbort, { once: true })
  timer.addEventListener('abort', onTimeout, { once: true })
  return {
    signal: controller.signal,
    cleanup: () => {
      opSignal.removeEventListener('abort', onOpAbort)
      timer.removeEventListener('abort', onTimeout)
    }
  }
}

/**
 * Ceiling on a response this library buffers whole in memory before returning it.
 *
 * The framing limits above bound one *frame* and the transport's backlog. They say nothing
 * about how many frames a caller accumulates, and two paths accumulate all of them: a command
 * reply and a P2P download, which returns the entire file as one `ArrayBuffer`. Both loops read
 * until end-of-stream, so a peer that keeps sending — whether it is hostile or merely serving
 * something far larger than the caller expected — grows the array until the process runs out of
 * memory. The per-frame idle timeout does not help: a peer sending steadily is never idle.
 *
 * Command replies are status envelopes, DDOs and log dumps. 64 MiB is orders of magnitude above
 * anything this protocol legitimately answers with, and matches the ceiling ocean-node applies
 * to its own accumulating readers, so the two ends of the same exchange agree.
 */
const MAX_BUFFERED_COMMAND_BYTES = 64 * 1024 * 1024

/**
 * The same ceiling for a P2P download, which is the one case where a large body is the point.
 *
 * Separate from the command limit because the sizes are not comparable — a dataset is not a
 * status envelope — and higher because the caller asked for a file. It is still a limit rather
 * than none at all: the whole file is held in memory as an `ArrayBuffer` and handed back that
 * way, so a browser tab is going to fail somewhere regardless, and failing with a clear message
 * at a known threshold beats an out-of-memory kill at an unknown one.
 *
 * A consumer that legitimately needs more should raise `maxBufferedDownloadBytes` deliberately,
 * which is also the moment to notice that this API buffers rather than streams.
 */
const MAX_BUFFERED_DOWNLOAD_BYTES = 512 * 1024 * 1024

/**
 * Adds `chunk`'s length to `total` and fails if the running sum has passed `limit`.
 *
 * Checked *after* appending rather than before, so the limit is a true ceiling on what was
 * accepted rather than on what was accepted plus one more frame.
 */
function accumulated(
  total: number,
  chunk: Uint8Array,
  limit: number,
  what: string
): number {
  const next = total + chunk.byteLength
  if (next > limit) {
    throw new P2pError(
      'protocol_failed',
      `P2P ${what} exceeded the maximum buffered size of ${limit} bytes`
    )
  }
  return next
}

/**
 * Reads one frame under both budgets that apply to a response body: the per-frame idle
 * timeout, and the caller's own signal when it passed one.
 *
 * Frames 2..n used a bare `AbortSignal.timeout(idleTimeout)`, so a caller could cancel
 * a transfer up to its first frame and not afterwards — for a multi-gigabyte download,
 * exactly the wrong way round.
 *
 * The composite comes from `timeoutSignal`, i.e. a local `AbortController` whose
 * listeners are removed in the `finally` below, and never from `AbortSignal.any`: a
 * per-frame composite over a long-lived caller signal adds one uncollectable entry to
 * that signal's dependant set per frame, which on a large transfer is one per chunk.
 */
async function readFrame(
  frames: LpFrameReader,
  opSignal: AbortSignal | undefined,
  idleTimeoutMs: number
): Promise<Uint8Array> {
  const read = timeoutSignal(opSignal, idleTimeoutMs)
  try {
    return await frames.read({ signal: read.signal })
  } finally {
    read.cleanup()
  }
}

/**
 * Tears a response stream down rather than leaving it open with nobody reading it.
 *
 * An abandoned body is not just a local matter: the peer goes on sending into our read
 * buffer, holds its own reader open and keeps the muxer window turning over, so a
 * cancelled download stops nothing at the source. `abort()` is the only lever that
 * closes both directions at once — `close()` leaves the readable end open until the peer
 * closes its own writable end, and `closeRead()` needs a STOP_SENDING that yamux does
 * not implement. It can throw when the stream is already gone, which is exactly the case
 * where there is nothing left to do.
 */
function abortResponseStream(stream: Stream, reason: unknown): void {
  try {
    stream.abort(reason instanceof Error ? reason : new Error(String(reason)))
  } catch {}
}

/**
 * Minimal FIFO concurrency gate. A released slot is handed straight to the next
 * waiter rather than decremented and re-acquired, so the limit cannot be overshot
 * by a caller that arrives between the release and the waiter waking up.
 */
class ConcurrencyGate {
  private inFlight = 0
  private readonly waiting: Array<() => void> = []

  constructor(private readonly limit: () => number) {}

  /** Resolves with an idempotent release function once a slot is free. */
  async acquire(): Promise<() => void> {
    if (this.inFlight < this.limit()) {
      this.inFlight++
    } else {
      // The releaser hands this slot over, so `inFlight` already accounts for it.
      await new Promise<void>((resolve) => this.waiting.push(resolve))
    }
    let released = false
    return () => {
      if (released) return
      released = true
      const next = this.waiting.shift()
      if (next) next()
      else this.inFlight--
    }
  }
}

/**
 * Optional request payload sent as LP frames after the command JSON; ends with an empty LP frame.
 * This mirrors ocean-node's `p2pStreamBody` mechanism introduced for true streaming uploads.
 */
export type P2PRequestBodyStream = AsyncIterable<Uint8Array | ArrayBufferView | string>

function toUint8ArrayChunk(chunk: unknown): Uint8Array {
  if (chunk instanceof Uint8Array) return chunk
  if (typeof chunk === 'string') return new TextEncoder().encode(chunk)
  if (
    chunk &&
    typeof chunk === 'object' &&
    ArrayBuffer.isView(chunk as ArrayBufferView)
  ) {
    const v = chunk as ArrayBufferView
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
  }
  throw new Error('Unsupported chunk type for P2P request body')
}

async function writeP2pRequestBodyLp(
  lp: LpFramedStream,
  body: P2PRequestBodyStream,
  signal: AbortSignal
): Promise<void> {
  for await (const chunk of body as AsyncIterable<unknown>) {
    await lp.write(toUint8ArrayChunk(chunk), { signal })
  }
  await lp.write(new Uint8Array(0), { signal })
}

// Ocean Protocol public bootstrap nodes (WebSocket addresses)
const DEFAULT_BOOTSTRAP_PEERS = [
  '/dns4/bootstrap1.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmLhRDqfufZiQnxvQs2XHhd6hwkLSPfjAQg1gH8wgRixiP',
  '/dns4/bootstrap2.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmHwzeVw7RpGopjZe6qNBJbzDDBdqtrSk7Gcx1emYsfgL4',
  '/dns4/bootstrap3.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmBKSeEP3v4tYEPsZsZv9VELinyMCsrVTJW9BvQeFXx28U',
  '/dns4/bootstrap4.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmSTVTArioKm2wVcyeASHYEsnx2ZNq467Z4GMDU4ErEPom'
]

/**
 * One provider of a CID, as returned by {@link P2pProvider.getProvidersForString}.
 *
 * `partial` is set on every record of a walk that ended before it finished — the
 * results are real but the set is incomplete, and the reason is logged.
 */
// Re-exported so a consumer can name the element type of `P2pProviderRecord.multiaddrs`
// without taking its own direct dependency on `@multiformats/multiaddr`.
export type { Multiaddr } from '@multiformats/multiaddr'

export interface P2pProviderRecord {
  id: string
  multiaddrs: Multiaddr[]
  partial?: true
  error?: string
}

export interface P2PConfig {
  /**
   * Bootstrap peer multiaddrs for DHT peer discovery.
   * Required when dialing bare peer IDs; defaults to Ocean Protocol's
   * public bootstrap nodes. Ignored if `libp2p.peerDiscovery` is set.
   */
  bootstrapPeers?: string[]
  /** Timeout per dial + stream operation in ms. Default: 10000 */
  dialTimeout?: number
  /** Max retry attempts on connection errors. Default: 5 */
  maxRetries?: number
  /** Base delay between retries in ms. Default: 1000 */
  retryDelay?: number
  /**
   * Timeout for DHT peer lookup when dialing a bare peer ID, in ms. Default: 20000.
   * Intentionally separate from dialTimeout — DHT resolution needs more time than
   * a direct dial. Once a peer is found and connected, subsequent calls skip this.
   * Composed with the operation's own signal, so the shorter of the two wins.
   */
  dhtLookupTimeout?: number
  /**
   * Idle timeout between two frames of a response body, in ms. Default: 60000.
   * Separate from dialTimeout on purpose — a large download or a compute result can
   * legitimately pause between chunks for far longer than a dial may take.
   */
  streamIdleTimeout?: number
  /**
   * Maximum P2P commands in flight at once. Default: 8. Fanning out to more peers
   * than this queues the surplus instead of burst-dialling past `maxConnections`.
   */
  maxConcurrentRequests?: number
  /**
   * Ceiling on a buffered command reply, in bytes. Default: 67108864 (64 MiB).
   * A reply past this fails instead of growing until the process runs out of memory.
   */
  maxBufferedCommandBytes?: number
  /**
   * Ceiling on a buffered P2P download, in bytes. Default: 536870912 (512 MiB).
   * `getDownloadUrl` returns the whole file as one `ArrayBuffer`, so this is the size
   * of the largest file this transport can deliver. Raise it deliberately.
   */
  maxBufferedDownloadBytes?: number

  /**
   * Enable TCP transport in addition to WebSockets.
   * Defaults to `true` in Node.js/Electron and `false` in a browser or a Web /
   * Service Worker, where TCP does not exist. Set it explicitly only to override
   * that detection.
   */
  enableTcp?: boolean
  /**
   * Maximum number of simultaneous libp2p connections. Default: 32.
   * A client is not a crawler — raise this only if you fan out to many nodes at once.
   */
  maxConnections?: number
  /**
   * Full libp2p node configuration. Fields provided here override ocean.js
   * defaults (transports, encrypters, services, etc.). Unset fields keep ocean.js
   * defaults.
   *
   * Three option bags are the exception and are merged **field by field** rather than
   * replaced wholesale: `peerStore`, `connectionManager` and `connectionMonitor`. They
   * are bags of independent values, so setting one field and losing the rest to a
   * library default is never what a caller meant — and for `peerStore` it is actively
   * harmful, since overriding `maxAddressAge` alone would drop `maxPeerAge` to a value
   * *shorter* than it and evict peer entries while their addresses are still valid.
   * Everything else is a whole subsystem and is replaced as stated.
   */

  libp2p?: Partial<Libp2pOptions>

  /** Additional roles to be marked. Will be used in the future */
  /* Examples:  dashboard, cli , market , etc */
  additionalRoles?: string[]
}

/*
 * Process-wide libp2p singleton.
 *
 * A libp2p node is heavyweight and long-lived — sockets, a DHT routing table, a
 * peerStore, keep-alive timers — so one per process is the right number. This
 * state deliberately lives at module scope rather than on the instance: every
 * `new BaseProvider()` used to build its own `P2pProvider` and therefore its own
 * node, which matters now that libp2p is a runtime dependency every consumer
 * installs whether or not they use P2P.
 */
let sharedP2pConfig: P2PConfig = {}
/**
 * The last configuration that actually produced a live node, and what a failed
 * `setupP2P` restores.
 *
 * A rejected `setupP2P` cannot simply put back whatever it found, because two callers
 * racing each other see each other's half-applied values: the second reads the first's
 * config as "previous", and whichever catch block runs last wins, so both can reject and
 * still leave one of their own values installed. Restoring to the last *applied* config
 * is order-independent — every loser lands on the same value — and it also means a
 * caller that failed alongside one that succeeded restores the winner's config rather
 * than clobbering it. `{}` until the first successful setup, i.e. the defaults.
 */
let sharedAppliedP2pConfig: P2PConfig = {}
let sharedLibp2pNode: Libp2p | null = null
/** In-flight creation, so concurrent callers cannot race two nodes into existence. */
let sharedLibp2pNodePromise: Promise<Libp2p> | null = null
/**
 * Bumped by every `stopP2P()`. A creation that started under an older generation has
 * been superseded and must not publish the node it built — see `createLibp2pNode`.
 */
let sharedLibp2pGeneration = 0
/**
 * The teardown currently running, or null. `getOrCreateLibp2pNode` awaits this
 * before it decides anything, and that is what turns the generation counter into an
 * actual barrier.
 *
 * On its own the counter only guards creations that began *before* the bump. It does
 * nothing about a creation that begins *during* a stop: `stopP2P()` nulls both
 * globals and then awaits, and a caller arriving in that window sees no node, no
 * creation in flight, and a generation its own snapshot will *match* — so it happily
 * publishes a fresh node into a layer that is being torn down.
 */
let sharedStopInFlight: Promise<void> | null = null

let sharedP2pProvider: P2pProvider | null = null

/** Process-wide command budget, shared because the libp2p node is shared. */
const p2pCommandGate = new ConcurrencyGate(() => {
  // Clamped, and deliberately so. `inFlight < 0` is never true and nothing ever
  // releases a slot that was never taken, so a consumer reading
  // `maxConcurrentRequests: 0` as "no limit" — a plausible reading — used to wedge
  // the client permanently on its very first P2P call. A value that is not a usable
  // finite number falls back to the default rather than to a deadlocked gate.
  const configured = sharedP2pConfig.maxConcurrentRequests
  if (typeof configured !== 'number' || !Number.isFinite(configured)) {
    return DEFAULT_MAX_CONCURRENT_REQUESTS
  }
  return Math.max(1, Math.floor(configured))
})

/**
 * The process-wide `P2pProvider`. Every `BaseProvider` uses this one instance, so
 * `setupP2P()` / `stopP2P()` mean the same thing no matter which provider object
 * they were called on.
 */
export function getSharedP2pProvider(): P2pProvider {
  sharedP2pProvider ??= new P2pProvider()
  return sharedP2pProvider
}

/**
 * Transport a connection is running over, named by the protocols its address carries.
 *
 * The circuit-relay check comes first and must: every relayed address also carries the
 * relay's own `/tcp` or `/wss`, so testing for those first would file every relayed
 * connection under a direct transport and hide exactly the connections worth noticing.
 */
function connectionTransport(addr: string): string {
  if (addr.includes('/p2p-circuit')) return 'circuit-relay'
  if (addr.includes('/wss') || addr.includes('/tls/ws')) return 'wss'
  if (addr.includes('/ws')) return 'ws'
  if (addr.includes('/tcp')) return 'tcp'
  if (addr.includes('/udp')) return 'udp'
  return 'other'
}

export class P2pProvider {
  private get p2pConfig(): P2PConfig {
    return sharedP2pConfig
  }

  private set p2pConfig(config: P2PConfig) {
    sharedP2pConfig = config
  }

  private get appliedP2pConfig(): P2PConfig {
    return sharedAppliedP2pConfig
  }

  private set appliedP2pConfig(config: P2PConfig) {
    sharedAppliedP2pConfig = config
  }

  private get libp2pNode(): Libp2p | null {
    return sharedLibp2pNode
  }

  private set libp2pNode(node: Libp2p | null) {
    sharedLibp2pNode = node
  }

  /**
   * Configure the internal libp2p node used for P2P transport.
   * Call this once before making P2P requests, e.g.:
   *   ProviderInstance.setupP2P({ bootstrapPeers: ['/ip4/1.2.3.4/tcp/9000/ws/p2p/16Uiu2...'] })
   *
   * Required when using bare peer IDs as nodeUri — the bootstrap peers
   * provide DHT entry points so the peer can be located.
   */
  public async setupP2P(config: P2PConfig): Promise<void> {
    // Reconfiguring replaces the node, so shut the old one down properly instead
    // of dropping the reference and leaking its sockets and relay reservations.
    await this.stopP2P()
    // A rejected `setupP2P` must not leave its configuration installed. The config is
    // process-wide and `createLibp2pNode` reads it synchronously while building the node,
    // so it has to be assigned before that call — which means a failure has to undo the
    // assignment. Otherwise a `setupP2P` that *rejects* still installs the failed
    // caller's `bootstrapPeers`, its `libp2p` overrides (`privateKey`, a
    // `denyDialMultiaddr` gater) and its timeouts, and the next lazy call builds a node
    // from them.
    //
    // What it rolls back to is the last *applied* config, not whatever was there on
    // entry — see `sharedAppliedP2pConfig`.
    this.p2pConfig = config
    try {
      await this.getOrCreateLibp2pNode()
    } catch (err) {
      this.p2pConfig = this.appliedP2pConfig
      throw err
    }
    this.appliedP2pConfig = config
  }

  /**
   * The one place a peer's addresses come from: active connection, then peer store,
   * then a DHT `findPeer` walk.
   *
   * There used to be two of these. `getConnection` resolved inline under one timeout
   * policy, and the public `getMultiaddrFromPeerId` ran its own walk under another,
   * returning whichever address happened to sit at index 0 of whichever tier answered
   * — peer-store order is insertion order, so two callers asking about the same peer
   * could get different addresses and a relayed one could beat a direct one. Both now
   * come through here and share the dedup, the ordering and the cache.
   *
   * The tiers are ordered by cost and by confidence, and both agree: an open
   * connection is free and proven, the peer store is a local read, and only the DHT
   * costs a network walk. A tier only hands over to the next when it produced no
   * address this runtime could actually dial — a browser handed nothing but TCP
   * addresses has to keep looking, which is what `isDialable` decides — and what the
   * earlier tier found is carried forward rather than discarded, so the answer is
   * always a superset of what any one tier knew.
   *
   * Never throws for a peer it cannot find: an empty `addresses` with `source: 'none'`
   * is the answer, and each caller decides what that means for it.
   */
  private async resolvePeer(peerId: PeerId, signal?: AbortSignal): Promise<ResolvedPeer> {
    const node = await this.getOrCreateLibp2pNode()
    const key = peerId.toString()

    // An open connection is the one address we know works, because we are using it.
    const live = node
      .getConnections(peerId)
      .filter((c) => c.status === 'open' && c.remoteAddr != null)
      .map((c) => c.remoteAddr)
    if (live.length > 0) {
      countPeerResolution(RESOLVE_CONNECTION_HIT)
      return {
        addresses: orderPeerAddresses(live, key),
        source: 'connection',
        cached: false
      }
    }

    const cached = peerResolutionCache.get(key)
    if (cached != null) {
      if (cached.expiresAt > Date.now()) {
        countPeerResolution(RESOLVE_CACHE_HIT)
        return { addresses: cached.addresses, source: cached.source, cached: true }
      }
      peerResolutionCache.delete(key)
    }

    const missUntil = peerResolutionMisses.get(key)
    if (missUntil != null) {
      if (missUntil > Date.now()) {
        countPeerResolution(RESOLVE_NEGATIVE_CACHE_HIT)
        return { addresses: [], source: 'none', cached: true }
      }
      // Expired entries are dropped when read and never renewed by a read, so a peer
      // that was briefly down is looked up again on the first call after the lifetime
      // rather than staying suppressed for as long as somebody keeps asking for it.
      peerResolutionMisses.delete(key)
    }

    const found: Multiaddr[] = []
    let source: PeerAddressSource = 'none'

    try {
      const peerData = await node.peerStore.get(peerId)
      for (const addr of peerData?.addresses ?? []) found.push(addr.multiaddr)
      if (found.length > 0) source = 'peer-store'
    } catch {
      LoggerInstance.debug(`[P2P] ${key}: not in peerStore`)
    }

    if (!found.some((ma) => this.isDialable(ma))) {
      const lookup = this.dhtLookupSignal(signal)
      try {
        // `useCache` lets the walk be answered from what libp2p already knows about
        // this peer instead of going to the network — see the note on the resolution
        // lifetime above for why that is worth having now and was not before.
        const peerInfo = await node.peerRouting.findPeer(peerId, {
          signal: lookup.signal,
          useCache: true
        })
        if (peerInfo?.multiaddrs?.length > 0) {
          for (const ma of peerInfo.multiaddrs) found.push(ma)
          source = 'dht'
        }
      } catch (err: any) {
        LoggerInstance.debug(`[P2P] ${key}: DHT findPeer failed: ${err?.message}`)
      } finally {
        // Drops this composite's listeners on the caller's signal. Without it a
        // caller that holds one AbortController for a whole session accumulates one
        // uncollectable composite per DHT fallback.
        lookup.cleanup()
      }
    }

    if (found.length === 0) {
      countPeerResolution(RESOLVE_MISS)
      peerResolutionMisses.set(key, Date.now() + PEER_RESOLUTION_NEGATIVE_TTL_MS)
      return { addresses: [], source: 'none', cached: false }
    }

    const addresses = orderPeerAddresses(found, key)
    countPeerResolution(source === 'dht' ? RESOLVE_DHT_HIT : RESOLVE_PEERSTORE_HIT)
    peerResolutionCache.set(key, {
      addresses,
      source,
      expiresAt: Date.now() + PEER_RESOLUTION_TTL_MS
    })
    return { addresses, source, cached: false }
  }

  /**
   * Forgets what we know about how to reach `peerId`, so the next call resolves from
   * the tiers again.
   *
   * This is the part of the cache that carries its weight. Serving an address that no
   * longer reaches the peer is worse than not caching at all if there is no way to
   * correct it, so every failure that proves an address wrong — a dial that did not
   * connect, a connection that turned out to be a different peer — calls this. The
   * negative entry goes too: an invalidation is a reason to look again, never a reason
   * to stop looking.
   */
  public invalidatePeerResolution(peerId: string): void {
    const had = peerResolutionCache.delete(peerId)
    const hadMiss = peerResolutionMisses.delete(peerId)
    if (had || hadMiss) countPeerResolution(RESOLVE_INVALIDATED)
  }

  /**
   * Resolution counters: one lane per tier, plus cache hits, misses and
   * invalidations. A copy, so a reader cannot mutate them.
   *
   * These are what makes the peer store's longer address lifetime observable. Its
   * purpose was to move resolutions out of the `dht` lane and into `peer-store`, and
   * to leave `miss` where a DHT provider record names a peer whose addresses have not
   * been thrown away yet; a peer store holding addresses for too long would instead
   * show up as peer-store hits followed by invalidations.
   */
  public getPeerResolutionStats(): Record<string, number> {
    return { ...peerResolutionCounters }
  }

  /** Resets the resolution counters. A test seam; a running client never calls it. */
  public resetPeerResolutionStats(): void {
    for (const lane of Object.keys(peerResolutionCounters)) {
      peerResolutionCounters[lane] = 0
    }
  }

  /**
   * The address at which `peerId` is best reached, as a string with the peer id
   * appended.
   *
   * Resolution is the shared one, so the list this picks from is deduplicated and
   * ordered — a direct public address before a private one, and both before anything
   * relayed — where it used to be whatever sat first in whichever tier answered.
   */
  public async getMultiaddrFromPeerId(peerId: string): Promise<string> {
    // One message for every way this can fail to produce an address, including an
    // unparseable peer id: the previous implementation reached the same wording by
    // falling through its tiers, and a caller matching on it should not have to learn
    // a second one.
    const unresolved = () =>
      new P2pError('resolve_failed', `No multiaddrs found for peer id ${peerId}`, {
        peerId
      })
    let parsed: PeerId
    try {
      parsed = peerIdFromString(peerId)
    } catch {
      throw unresolved()
    }
    const resolved = await this.resolvePeer(parsed)
    const best = resolved.addresses[0]
    if (best == null) throw unresolved()
    LoggerInstance.debug(
      `[P2P] ${peerId}: resolved via ${resolved.source}` +
        `${resolved.cached ? ' (cached)' : ''}, ${resolved.addresses.length} addr(s)`
    )
    return withPeerId(best.toString(), peerId)
  }

  /** Returns the underlying libp2p node instance, or null if P2P is not initialized. */
  public getLibp2pNode(): Libp2p | null {
    return this.libp2pNode ?? null
  }

  /**
   * Tear the P2P layer down: close open connections, stop the libp2p node and clear
   * it so nothing keeps the process alive.
   *
   * Long-lived Node.js consumers should call this on shutdown — an unstopped node
   * holds sockets, timers and DHT state open indefinitely. (It holds no circuit-relay
   * reservation to drop: ocean.js listens on nothing — `addresses: { listen: [] }` —
   * so it never listens on `/p2p-circuit` and only ever *dials* through a relay.)
   *
   * Safe to call when P2P was never started, and safe to call more than once. A
   * later P2P call lazily creates a fresh node from the same configuration.
   */
  public async stopP2P(): Promise<void> {
    // Publish this teardown as a barrier that `getOrCreateLibp2pNode` awaits, and
    // chain it behind any stop already running — otherwise a second concurrent stop
    // would overwrite the barrier and a caller released by the first one could still
    // publish a node into a teardown that has not finished.
    //
    // `tearDownLibp2p` bumps the generation and nulls both globals before its first
    // `await`, and the assignment below runs in that same synchronous block, so
    // nothing can observe the globals in between.
    const previous = sharedStopInFlight
    const teardown = this.tearDownLibp2p(previous)
    sharedStopInFlight = teardown
    try {
      await teardown
    } finally {
      if (sharedStopInFlight === teardown) sharedStopInFlight = null
    }
  }

  private async tearDownLibp2p(previous: Promise<void> | null): Promise<void> {
    // Invalidate any creation already in flight before adopting it. `sharedLibp2pNode`
    // is assigned only *after* `await node.start()`, so mid-creation there is nothing
    // here to stop yet: without adopting the promise we would stop nothing, the
    // creation would then publish its node into the module global — resurrecting it
    // after shutdown — and the process would never exit.
    sharedLibp2pGeneration++
    const pending = sharedLibp2pNodePromise
    sharedLibp2pNodePromise = null
    const node = this.libp2pNode
    this.libp2pNode = null

    // Everything above is synchronous. From here on we may await, and the barrier is
    // already visible to `getOrCreateLibp2pNode`.
    if (previous != null) await previous.catch(() => {})

    // A creation that sees the bumped generation stops its own node and rejects, so a
    // rejection here means there is nothing left of it to stop.
    //
    // Bounded, for the reason given on `ADOPTED_CREATION_STOP_TIMEOUT_MS`: waiting
    // without a deadline while the stop barrier is up turns one stuck creation into a
    // permanently unusable client. The timer is unref'd so it cannot itself keep a
    // Node.js process alive after a shutdown that is otherwise complete — which is the
    // very thing `stopP2P` exists to allow.
    const pendingNode =
      pending == null
        ? null
        : await Promise.race([
            pending.catch(() => null),
            new Promise<null>((resolve) => {
              const timer: any = setTimeout(
                () => resolve(null),
                ADOPTED_CREATION_STOP_TIMEOUT_MS
              )
              timer?.unref?.()
            })
          ])

    const nodes = new Set<Libp2p>()
    if (node) nodes.add(node)
    if (pendingNode) nodes.add(pendingNode)

    // The addresses were learned through the peer store and routing table of a node
    // that is going away, so nothing is left to vouch for them.
    clearPeerResolutionCache()

    for (const target of nodes) {
      try {
        // No hand-rolled connection-close loop here. libp2p's own
        // `ConnectionManager.stop()` already closes every tracked connection with
        // `AbortSignal.timeout(500)` and aborts whatever misses that deadline,
        // whereas a loop of `conn.close()` passes no AbortOptions and waits on
        // 'idle'/'drain' unbounded — one peer that stops reading would hang shutdown
        // before `node.stop()` ever ran.
        await target.stop()
      } catch (err: any) {
        LoggerInstance.debug(`[P2P] error while stopping libp2p node: ${err?.message}`)
      }
    }
  }

  /** Alias for {@link stopP2P}, for callers that expect a `dispose()` convention. */
  public async dispose(): Promise<void> {
    return this.stopP2P()
  }

  /** Returns all peers known to the peerStore (discovered via bootstrap, DHT, or connections). */
  /**
   * Every peer this client knows about, with what is currently true of the connection to
   * it.
   *
   * The peer store answers the first half — who is known and at what addresses — and says
   * nothing about the second, which is the half that decides whether a call to that peer
   * will work. A peer can be in the store with three addresses and be unreachable; it can
   * be connected over a circuit relay that will drop the connection after a byte budget;
   * it can be connected only because *it* dialled *us*. None of that is visible from an
   * address list.
   *
   * The connection fields are added to each entry, never replacing anything: `peerId` and
   * `multiaddrs` are unchanged for every existing consumer.
   */
  public async getDiscoveredNodes(): Promise<
    Array<{
      peerId: string
      multiaddrs: string[]
      /** Open connections to this peer right now. `0` means known but not connected. */
      connections: number
      /** `inbound` when every connection was dialled by the peer, `outbound` when by us. */
      direction?: 'inbound' | 'outbound' | 'mixed'
      /** Transports in use, derived from the connected addresses. */
      transports: string[]
      /**
       * True when *every* open connection is under a circuit-relay budget. Such a peer
       * looks connected and can carry very little before the relay cuts it off.
       */
      limited: boolean
    }>
  > {
    if (!this.libp2pNode) return []
    const allPeers = await this.libp2pNode.peerStore.all()
    return allPeers.map((peer) => {
      const connections = this.libp2pNode?.getConnections(peer.id) ?? []
      const directions = new Set(connections.map((connection) => connection.direction))
      return {
        peerId: peer.id.toString(),
        multiaddrs: peer.addresses.map((a) => a.multiaddr.toString()),
        connections: connections.length,
        direction:
          directions.size === 0
            ? undefined
            : directions.size > 1
              ? 'mixed'
              : (directions.values().next().value as 'inbound' | 'outbound'),
        transports: Array.from(
          new Set(
            connections.map((connection) =>
              connectionTransport(connection.remoteAddr.toString())
            )
          )
        ),
        limited:
          connections.length > 0 &&
          connections.every((connection) => connection.limits != null)
      }
    })
  }

  /**
   * Node-wide facts that decide whether P2P can do anything at all, as opposed to whether
   * it is switched on.
   *
   * Separate from {@link getDiscoveredNodes} rather than folded into it because it answers
   * a different question and returns one object rather than a list — and because widening
   * that method's return type would be a breaking change for consumers that destructure
   * its array elements.
   *
   * Every field is optional and absent rather than guessed when libp2p does not expose it:
   * the routing table and the peer store lifetimes have no public accessor, so they are
   * read defensively and simply not reported if the shape moves.
   */
  public getP2pDiagnostics(): {
    running: boolean
    peerId?: string
    connections: number
    /**
     * Peers in the DHT routing table. This is the number that decides whether a lookup can
     * start: a query against an empty table finds nothing regardless of how many
     * connections are open, because a connection to a peer that does not speak the DHT
     * protocol is not somewhere a walk can begin.
     */
    routingTablePeers?: number
    /** `client` or `server`. A library consumer is pinned to `client`. */
    dhtMode?: string
    /**
     * Peer store lifetimes **as the running node applies them**. Read off the node rather
     * than from configuration, because they are fixed when the node is built: changing the
     * configuration afterwards does nothing until the node is rebuilt, and nothing else
     * would reveal that.
     */
    peerStore?: { maxAddressAge?: number; maxPeerAge?: number }
    /** The resolution lanes, the same object {@link getPeerResolutionStats} returns. */
    resolution: Record<string, number>
  } {
    const node = this.libp2pNode
    if (node == null) {
      return { running: false, connections: 0, resolution: this.getPeerResolutionStats() }
    }

    let routingTablePeers: number | undefined
    let dhtMode: string | undefined
    try {
      const dht = (node.services as Record<string, any> | undefined)?.dht as
        { routingTable?: { size?: number }; getMode?: () => string } | undefined
      const size = dht?.routingTable?.size
      routingTablePeers = typeof size === 'number' ? size : undefined
      dhtMode = typeof dht?.getMode === 'function' ? dht.getMode() : undefined
    } catch {
      // an unreachable DHT service is reported as "not known", not as zero
    }

    let peerStore: { maxAddressAge?: number; maxPeerAge?: number } | undefined
    try {
      const { store } = node.peerStore as unknown as {
        store?: { maxAddressAge?: number; maxPeerAge?: number }
      }
      if (store != null) {
        peerStore = {}
        if (typeof store.maxAddressAge === 'number')
          peerStore.maxAddressAge = store.maxAddressAge
        if (typeof store.maxPeerAge === 'number') peerStore.maxPeerAge = store.maxPeerAge
      }
    } catch {
      // leave it unreported
    }

    return {
      running: true,
      peerId: node.peerId.toString(),
      connections: node.getConnections().length,
      routingTablePeers,
      dhtMode,
      peerStore,
      resolution: this.getPeerResolutionStats()
    }
  }

  private bufToHex(val: any): string {
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val)
      } catch {
        return val
      }
    }
    if (val?.type === 'Buffer' && Array.isArray(val.data)) {
      return new TextDecoder().decode(new Uint8Array(val.data))
    }
    if (val instanceof Uint8Array) {
      return new TextDecoder().decode(val)
    }
    return val
  }

  /**
   * Handler for the `/ocean/client/*` protocols. We advertise them over identify so
   * peers can tell what we are, but we do not serve inbound commands yet — so tear
   * the inbound stream down in *both* directions immediately.
   *
   * `close()` is not enough: it closes only the writable end, and the readable end
   * stays open until the remote closes its own writable end. That half-open stream
   * keeps buffering whatever the peer sends until `maxReadBufferLength` forces a
   * reset, and holds one of the `maxInboundStreams` slots for this protocol until
   * then. `closeRead()` cannot fix it either — it needs muxer support for
   * STOP_SENDING, and yamux's `sendCloseRead` is a no-op. So reset the stream: it is
   * immediate, needs no timeout signal (nothing to flush, nothing to await), frees
   * the slot on both sides and tells the peer accurately that we serve nothing here.
   */
  private async handleProtocolCommands(stream: Stream) {
    try {
      stream.abort(new Error('ocean.js client does not accept inbound streams'))
    } catch {}
  }

  private async getOrCreateLibp2pNode(): Promise<Libp2p> {
    // Read both before anything is awaited, so this snapshot is taken in the same
    // synchronous block as the call itself.
    const entryGeneration = sharedLibp2pGeneration
    let stopping = sharedStopInFlight
    let waitedForStop = false

    // Wait out any teardown already running. Each distinct barrier is awaited at most
    // once, so this terminates even if further stops arrive while we wait.
    while (stopping != null) {
      waitedForStop = true
      await stopping.catch(() => {})
      const next = sharedStopInFlight
      stopping = next === stopping ? null : next
    }

    // Having had to wait means this call was issued *before* the teardown finished,
    // so it belongs to the epoch being torn down and must not build a node. Creating
    // one here is what kept the two reproduced defects alive: it resurrects the
    // module global after `dispose()`, and the process then never exits; and when the
    // stop came from `setupP2P` it publishes a node built from the config being
    // replaced, which `setupP2P` then adopts through its own fast path and reports as
    // success — silently dropping the caller's `bootstrapPeers` and gater overrides.
    //
    // A call issued after a stop has fully settled sees no barrier here and lazily
    // creates a fresh node, exactly as `stopP2P` documents.
    if (waitedForStop || entryGeneration !== sharedLibp2pGeneration) {
      // Wording is load-bearing: `sendP2pCommand` retries on messages containing
      // 'closed' or 'reset', and this must not look like either.
      throw new Error('P2P was stopped while this operation was waiting for the node')
    }

    if (sharedLibp2pNode) return sharedLibp2pNode
    if (sharedLibp2pNodePromise == null) {
      const creation = this.createLibp2pNode()
      sharedLibp2pNodePromise = creation
      // A failed start must not poison every later call — but only clear the pointer
      // if it still refers to *this* creation, or we would drop a newer one.
      creation.catch(() => {
        if (sharedLibp2pNodePromise === creation) sharedLibp2pNodePromise = null
      })
    }
    return sharedLibp2pNodePromise
  }

  private async createLibp2pNode(): Promise<Libp2p> {
    const generation = sharedLibp2pGeneration
    const bootstrapAddrs = (this.p2pConfig.bootstrapPeers ?? DEFAULT_BOOTSTRAP_PEERS).map(
      multiaddr
    )

    // Three of the option bags below are **merged** with a user override rather than
    // replaced by it, and the rest of the spread keeps replacing as documented.
    //
    // The reason is that these three are plain bags of independent values, so overriding
    // one field and losing the others is never what a caller meant — and for `peerStore`
    // it is actively harmful. Passing `libp2p: { peerStore: { maxAddressAge: … } }` alone
    // used to drop `maxPeerAge` back to the library's 6 h, which is *shorter* than the
    // address lifetime being set, so the peer entry is evicted while its own addresses
    // are still inside their lifetime — precisely the inversion the constant above warns
    // against, produced by trying to configure it.
    //
    // Everything else in the spread — `transports`, `services`, `addresses`,
    // `connectionGater` — is a whole subsystem the caller is replacing on purpose, so
    // merging those would be wrong.
    const userLibp2p = (this.p2pConfig.libp2p ?? {}) as Record<string, any>
    const merge = (defaults: Record<string, any>, key: string): Record<string, any> => {
      const override = userLibp2p[key]
      const mergeable =
        override != null && typeof override === 'object' && !Array.isArray(override)
      return mergeable ? { ...defaults, ...override } : (override ?? defaults)
    }

    const peerStoreOptions = merge(
      { maxAddressAge: PEER_STORE_MAX_AGE_MS, maxPeerAge: PEER_STORE_MAX_AGE_MS },
      'peerStore'
    )
    // The one invariant worth saying out loud rather than silently correcting: a peer
    // entry that expires before its addresses do takes them with it. The caller's values
    // are used as given — this is their node — but they are told.
    if (
      typeof peerStoreOptions.maxPeerAge === 'number' &&
      typeof peerStoreOptions.maxAddressAge === 'number' &&
      peerStoreOptions.maxPeerAge < peerStoreOptions.maxAddressAge
    ) {
      LoggerInstance.warn(
        `[P2P] peerStore.maxPeerAge (${peerStoreOptions.maxPeerAge}ms) is shorter than ` +
          `peerStore.maxAddressAge (${peerStoreOptions.maxAddressAge}ms): peer entries ` +
          `will be evicted while their addresses are still within their own lifetime.`
      )
    }

    const connectionManagerOptions = merge(
      { maxConnections: this.p2pConfig.maxConnections ?? CLIENT_MAX_CONNECTIONS },
      'connectionManager'
    )
    const connectionMonitorOptions = merge(
      { abortConnectionOnPingFailure: false },
      'connectionMonitor'
    )

    const node = await createLibp2p({
      addresses: { listen: [] },
      transports: [
        webSockets(),
        circuitRelayTransport(),
        // TCP is on by default outside a browser, off inside one (it does not
        // exist there). Node then reaches nodes over plain TCP and a browser
        // uses secure WebSockets, without the caller configuring anything.
        ...((this.p2pConfig.enableTcp ?? isNodeRuntime()) ? [tcp()] : [])
      ],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      peerDiscovery: [
        ...(bootstrapAddrs.length > 0
          ? [
              bootstrap({
                list: bootstrapAddrs.map(String),
                timeout: 10000,
                tagName: BOOTSTRAP_KEEP_ALIVE_TAG
              })
            ]
          : [])
      ],
      services: {
        identify: identify(),
        identifyPush: identifyPush(),
        ping: ping(),
        dht: kadDHT({
          peerInfoMapper: passthroughMapper,
          allowQueryWithZeroPeers: false,
          kBucketSize: 20,
          protocol: OCEAN_DHT_PROTOCOL,
          // Client mode is the correct setting for a library consumer: we query
          // the DHT but never serve records for other peers. It is also *pinned*:
          // libp2p only installs its automatic client/server switch when this
          // option is omitted, so passing it explicitly means an app embedding
          // ocean.js can never be promoted to a DHT server behind its back.
          clientMode: true
        })
      },
      connectionGater: { denyDialMultiaddr: (ma) => this.denyDialMultiaddr(ma) },
      // User-supplied config overrides all defaults above.
      // Cast needed: services generics can't be inferred through a Partial<Libp2pOptions> spread.
      ...(userLibp2p as any),
      // After the spread on purpose: each of these already has the caller's own fields
      // merged into it, so placing them last is what makes the merge stick rather than
      // being overwritten by the whole-object override the spread would otherwise apply.
      peerStore: peerStoreOptions,
      connectionManager: connectionManagerOptions,
      connectionMonitor: connectionMonitorOptions
    })

    await node.start()

    // A `stopP2P()` that landed while we were starting bumped the generation, so this
    // node has already been superseded. Publishing it now would leave two live nodes
    // — one of them unreachable and never stopped — and resurrect the module global
    // after shutdown, which is what keeps the process alive forever. Stop what we
    // built instead and reject; `stopP2P()` adopts this promise and treats the
    // rejection as "nothing left to stop".
    if (generation !== sharedLibp2pGeneration) {
      try {
        await node.stop()
      } catch (err: any) {
        LoggerInstance.debug(
          `[P2P] error while stopping a superseded libp2p node: ${err?.message}`
        )
      }
      throw new Error('P2P was stopped while the libp2p node was starting')
    }

    // No `peer:discovery` auto-dial: a client must not crawl the network. Peers
    // are dialled lazily from `getConnection()`, for the specific target of the
    // request that needs them.

    this.libp2pNode = node
    // all implementations are clients
    this.libp2pNode.handle('/ocean/client/1.0.0', this.handleProtocolCommands)
    const additionalRoles = this.p2pConfig.additionalRoles ?? []
    for (const role of additionalRoles) {
      this.libp2pNode.handle(`/ocean/client/${role}/1.0.0`, this.handleProtocolCommands)
    }
    return node
  }

  public async cidFromRawString(data: string) {
    const hash = await sha256.digest(uint8ArrayFromString(data))
    const cid = CID.create(1, multiFormatRaw.code, hash)
    return cid
  }

  /**
   * Providers of a CID derived from `input`, as found on the DHT.
   *
   * A walk that ends early — the signal fired, the deadline passed, routing failed —
   * still yields whatever it found before that, and those results are usable, so they
   * are returned rather than discarded. The failure is logged and every record from a
   * cut-short walk is flagged `partial`, so an empty array with nothing logged means
   * "no providers" while an empty array with a logged error means "the lookup broke".
   */
  async getProvidersForString(
    input: string,
    signal?: AbortSignal
  ): Promise<P2pProviderRecord[]> {
    const node = await this.getOrCreateLibp2pNode()
    const cid = await this.cidFromRawString(input)
    const peersFound: Array<{ id: PeerId; multiaddrs: Multiaddr[] }> = []
    let failure: string | null = null
    try {
      for await (const result of node.contentRouting.findProviders(cid, {
        // Let the lookup be answered from what libp2p already holds rather than
        // insisting on a network walk every time. Worth having only now that a
        // provider record's addresses outlive the record's own hourly re-publication
        // in the peer store. Note what it does not do with the current router stack:
        // kad-dht consults its local provider store either way and does not read this
        // option, so the saving here is the app-level resolution cache the addresses
        // then flow into, not this flag.
        useCache: true,
        useNetwork: true,
        signal
      })) {
        peersFound.push(result)
      }
    } catch (err: any) {
      failure = err?.message ?? String(err)
      LoggerInstance.error(
        `[P2P] findProviders for "${input}" (${cid.toString()}) ended early after ` +
          `${peersFound.length} provider(s): ${failure}`
      )
    }
    return peersFound.map((peer) => ({
      id: peer.id.toString(),
      multiaddrs: peer.multiaddrs,
      ...(failure == null ? {} : { partial: true as const, error: failure })
    }))
  }

  /**
   * True when the page we are running in is itself served from a local origin,
   * i.e. the barge / `http://localhost` development case, where dialing a
   * loopback or LAN node is legitimate.
   */
  private isLocalPageOrigin(): boolean {
    if (typeof location === 'undefined') return false
    if (location.protocol === 'file:') return true
    const host = (location.hostname ?? '').replace(/^\[|\]$/g, '')
    // Fail *closed* on a host-less origin. `file:` is the only origin that is
    // genuinely local without a host, and it already returned true above. Every other
    // host-less origin is opaque — `data:`, `blob:`, `about:srcdoc` — and since
    // `isDialable` only asks this question together with `protocol !== 'https:'`,
    // answering "local" for them permitted plain-`ws` dials to loopback and RFC1918
    // from a document whose provenance we know nothing about.
    if (host === '') return false
    if (host === 'localhost' || host.endsWith('.localhost')) return true
    // mDNS name — a barge box on the same LAN
    if (host === 'local' || host.endsWith('.local')) return true
    // A page served from a private LAN address is every bit as local as one served
    // from loopback, and treating it as a remote browser breaks the ordinary
    // development case: `vite --host`, open http://192.168.1.20:5173 on a phone, and
    // the node at /ip4/192.168.1.20/tcp/9001/ws must still be dialable.
    const ip = ipLiteralToMultiaddr(host)
    return ip != null && (isLoopback(ip) || isPrivate(ip))
  }

  /**
   * Replaces libp2p's default dial gater, which refuses private and loopback
   * addresses whenever the *browser* build is loaded. That build is also what a
   * bundler picks for Node/Electron targets, so the default silently blocks
   * plain-`ws` and local-node dials in environments that can perfectly well make
   * them — which is why this override exists at all.
   *
   * So: allow everything outside a browser, allow local targets when the page
   * itself is local, and only in a genuine remote browser page refuse loopback /
   * private addresses, which are unreachable from there anyway.
   */
  private denyDialMultiaddr(ma: Multiaddr): boolean {
    if (isNodeRuntime()) return false
    if (this.isLocalPageOrigin()) return false
    return isLoopback(ma) || isPrivate(ma)
  }

  private isDialable(ma: Multiaddr): boolean {
    // Node.js can dial any transport (TCP, WS, WSS)
    if (isNodeRuntime()) return true

    // A browser — or a worker — can only use TLS-secured WebSockets. ocean-node
    // advertises all three spellings depending on how the listener was configured:
    // `/wss`, the expanded `/tls/ws`, and autoTLS's `/tls/sni/<host>/ws`. `/wss` is
    // *not* normalised to `/tls/ws` (`multiaddr('/ip4/1.2.3.4/tcp/9005/wss')` keeps
    // `wss` in `toString()`), so all three have to be recognised.
    //
    // The matcher does that, and unlike the substring test it replaces it does not
    // mistake `/dnsaddr/wss.example.com/tcp/9001/ws` — plain, insecure ws whose *host*
    // merely starts with "wss" — for a secure address. `matches` rather than
    // `exactMatch` so a relayed `…/wss/p2p/<relay>/p2p-circuit/p2p/<peer>` address
    // still qualifies; circuit addresses are filtered separately.
    if (WebSocketsSecure.matches(ma)) return true

    // Plain `ws` is still reachable from a page that is itself local and not served
    // over https — the barge / `vite --host` development case. This is the other half
    // of the gater's decision: letting the dial past the gater achieves nothing if the
    // address is filtered out here first. Anything else is mixed content, which the
    // browser blocks regardless of what we decide.
    return (
      this.isLocalPageOrigin() && location.protocol !== 'https:' && WebSockets.matches(ma)
    )
  }

  /**
   * True when the multiaddr does not include the relay `p2p-circuit` protocol segment.
   * (Direct / transport paths omit it; relay paths contain `/p2p-circuit/...`.)
   */
  private isNotP2PCircuit(ma: Multiaddr): boolean {
    return !/\/p2p-circuit(\/|$)/.test(ma.toString())
  }

  private peerIdFromMultiaddr(ma: Multiaddr): string | null {
    const parts = ma.toString().split('/p2p/')
    if (parts.length <= 1) return null
    // Strip trailing protocol components like /p2p-circuit
    const raw = parts[parts.length - 1]
    return raw.split('/')[0] || null
  }

  /**
   * Budget for a DHT walk. `dhtLookupTimeout` was documented and defaulted here from
   * the start, but the line applying it was commented out — so a lookup silently ran
   * on whatever signal the operation carried: the dial timeout, far too short for a
   * multi-hop walk, or no signal at all, in which case kad-dht's own 180 s default
   * applied. Composed with the operation signal when there is one, so whichever
   * expires first wins.
   */
  private dhtLookupSignal(opSignal?: AbortSignal): {
    signal: AbortSignal
    cleanup: () => void
  } {
    return timeoutSignal(opSignal, this.p2pConfig.dhtLookupTimeout ?? FINDPEER_TIMEOUT_MS)
  }

  /** Idle timeout between two frames of a response body. */
  private streamIdleTimeoutMs(): number {
    return this.p2pConfig.streamIdleTimeout ?? STREAM_IDLE_TIMEOUT_MS
  }

  private maxBufferedCommandBytes(): number {
    return this.p2pConfig.maxBufferedCommandBytes ?? MAX_BUFFERED_COMMAND_BYTES
  }

  private maxBufferedDownloadBytes(): number {
    return this.p2pConfig.maxBufferedDownloadBytes ?? MAX_BUFFERED_DOWNLOAD_BYTES
  }

  /**
   * Retries one command may make in total, across every kind of failure.
   *
   * A single budget, and that is the point. There used to be two retry paths that each
   * counted up to this number independently, and because one of them recursed from
   * inside the other's `try`, a failing command could branch on both at every depth:
   * with the default of five the worst case was 63 attempts, each preceded by a
   * one-second sleep, rather than the six the value plainly reads as.
   *
   * Clamped like the concurrency limit, and for the same reason: a value that is not a
   * usable finite number falls back to the default rather than producing a loop bound
   * nobody intended.
   */
  private maxRetryAttempts(): number {
    const configured = this.p2pConfig.maxRetries
    if (typeof configured !== 'number' || !Number.isFinite(configured)) {
      return DEFAULT_MAX_RETRY_ATTEMPTS
    }
    return Math.max(0, Math.floor(configured))
  }

  /**
   * How long to wait before retry `attempt` (1 for the first retry): the base delay
   * doubled per attempt and capped, then jittered into the upper half of that window.
   *
   * Jitter is the load-bearing half. Every client that saw the same event — a node
   * restarting, a relay dropping, a network blip across a fleet — otherwise computes
   * the same delay from the same constant and comes back in lockstep, which is how a
   * recovering node gets knocked over again by the retries of the clients that noticed
   * it go down. Spreading the return turns one synchronised wave into a ramp.
   *
   * Only the upper half of the window is randomised, rather than all of it, because a
   * retry also needs libp2p to finish tearing down the connection that just failed —
   * the reason the untyped path slept a flat second before retrying. A draw near zero
   * would put the next dial back inside that window.
   */
  private retryBackoffMs(attempt: number): number {
    const configured = this.p2pConfig.retryDelay
    const base =
      typeof configured === 'number' && Number.isFinite(configured) && configured >= 0
        ? configured
        : DEFAULT_RETRY_DELAY_MS
    const window = Math.min(base * 2 ** (attempt - 1), RETRY_BACKOFF_CAP_MS)
    return Math.round(window / 2 + Math.random() * (window / 2))
  }

  /* Dials a new connection */
  private async getConnection(
    nodeUri: OceanNode,
    signal: AbortSignal,
    includeP2PCircuit: boolean = false
  ): Promise<Connection> {
    const node = await this.getOrCreateLibp2pNode()
    const hasDialable = () => addrs.some((ma) => this.isDialable(ma))
    let peerId: PeerId | null = null
    const addrs: Multiaddr[] = []
    if (nodeUri && typeof nodeUri === 'string') {
      try {
        const addr = multiaddr(nodeUri)
        addrs.push(addr)
        if (!peerId) {
          const pidStr = this.peerIdFromMultiaddr(addr)
          if (pidStr) peerId = peerIdFromString(pidStr)
        }
      } catch {}
      try {
        if (!peerId) peerId = peerIdFromString(nodeUri)
      } catch {}
    }
    if (typeof nodeUri === 'object' && nodeUri !== null && !Array.isArray(nodeUri)) {
      if ('nodeId' in nodeUri || 'multiaddress' in nodeUri) {
        const nodeP2p = nodeUri as NodeP2P
        if (Array.isArray(nodeP2p.multiaddress) && nodeP2p.multiaddress.length > 0) {
          for (const addr of nodeP2p.multiaddress) addrs.push(addr)
        }
        if (nodeP2p.nodeId) {
          try {
            peerId = peerIdFromString(nodeP2p.nodeId)
          } catch {}
        }
      } else {
        peerId = nodeUri as PeerId
      }
    }

    // check if we already have a connection
    if (peerId) {
      const existing = node.getConnections(peerId).filter((c) => c.status === 'open')
      if (existing.length > 0) {
        LoggerInstance.debug(
          `[P2P] ${peerId.toString()}: reusing existing connection via ${
            existing[0].remoteAddr
          }`
        )
        return existing[0]
      }
    }
    // Nothing dialable was supplied, so go and find some. The peer store and the DHT
    // walk that used to be written out here inline live in `resolvePeer` now, together
    // with the ordering, the dedup and the cache; the connection tier it starts with
    // is a no-op by this point, because the check above already returned on a hit.
    if (!hasDialable() && peerId) {
      const resolved = await this.resolvePeer(peerId, signal)
      for (const ma of resolved.addresses) addrs.push(ma)
      LoggerInstance.debug(
        `[P2P] ${peerId.toString()}: ${resolved.addresses.length} addr(s) via ` +
          `${resolved.source}${resolved.cached ? ' (cached)' : ''}`
      )
    }
    let dialable = addrs.filter((ma) => this.isDialable(ma))
    const beforePFilter = dialable.length
    if (!includeP2PCircuit) dialable = dialable.filter((ma) => this.isNotP2PCircuit(ma))

    const afterPFilter = dialable.length

    if (dialable.length < 1) {
      // try with p2p-circuits if available
      if (!includeP2PCircuit && afterPFilter < beforePFilter) {
        // we have some p2p-circuit addrs, let's try them
        return this.getConnection(
          { nodeId: peerId ? peerId.toString() : '', multiaddress: addrs } as NodeP2P,
          signal,
          true
        )
      }
      // Distinguish "the peer advertised nothing" from "the peer advertised only
      // addresses a browser is not allowed to dial" — the second is by far the
      // more common and the generic message sends people looking in the wrong place.
      if (!isNodeRuntime() && addrs.length > 0) {
        throw new P2pError(
          'resolve_failed',
          `No TLS/WSS address advertised for this peer${
            peerId ? ` (${peerId.toString()})` : ''
          } — browsers require WSS. Advertised: ${addrs.map(String).join(', ')}`,
          { peerId: peerId?.toString() }
        )
      }
      throw new P2pError('resolve_failed', 'No valid multiaddresses, cannot connect', {
        peerId: peerId?.toString()
      })
    }
    // normalize all mas if we have peerId
    if (peerId) {
      dialable = dialable.map((ma) => {
        const str = ma.toString()
        return str.includes('/p2p/') ? ma : multiaddr(`${str}/p2p/${peerId.toString()}`)
      })
    }
    let conn: Connection
    try {
      conn = await node.dial(dialable, { signal })
    } catch (err: any) {
      if (!includeP2PCircuit && afterPFilter < beforePFilter) {
        LoggerInstance.debug(
          `[P2P] Direct dial failed, falling back to relayed addresses...`
        )
        return this.getConnection(
          { nodeId: peerId ? peerId.toString() : '', multiaddress: addrs } as NodeP2P,
          signal,
          true
        )
      }
      // A dial that had addresses and still did not connect is the one thing that
      // proves a cached address set wrong, so it is also the thing that has to be
      // able to correct it. Without this the cache could serve the same dead address
      // for its whole lifetime and every attempt would fail the same way.
      if (peerId) this.invalidatePeerResolution(peerId.toString())
      throw new P2pError(
        'dial_failed',
        `Cannot dial peer ${peerId?.toString()}. ` +
          (addrs.length > 0
            ? `Found addrs: ${addrs.map(String).join(', ')}. `
            : 'No addresses found. ') +
          `Active connections: ${node.getConnections().length}. ` +
          err.message,
        { cause: err, peerId: peerId?.toString() }
      )
    }
    LoggerInstance.debug(
      `[P2P] Dial SUCCESS via ${conn.remoteAddr} (limited=${conn.limits != null})`
    )
    // Checked outside the dial's own `catch`, which would otherwise turn a mismatch
    // into a relay fallback and then into a dial failure.
    //
    // Reachable whenever an address already carried a `/p2p/` component, because those
    // are left as they are: a caller passing `{ nodeId, multiaddress }` whose addresses
    // name a different peer used to be connected to that peer without a word, and the
    // command went to the wrong node. It is also the failure a stale cached address
    // produces once something else has taken over the address.
    if (peerId && !conn.remotePeer.equals(peerId)) {
      this.invalidatePeerResolution(peerId.toString())
      throw new P2pError(
        'peer_mismatch',
        `Dialled peer ${peerId.toString()} but the connection at ${conn.remoteAddr} ` +
          `identified as ${conn.remotePeer.toString()}`,
        { peerId: peerId.toString() }
      )
    }
    return conn
  }

  private async getNodePublicKey(nodeUri: OceanNode): Promise<string> {
    const status = await this.getNodeStatus(nodeUri)
    return status?.publicKey
  }

  protected getAuthorization(s: SignerOrAuthTokenOrSignature) {
    return getAuthorization(s)
  }

  private async getSignedCommandParams(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    command: string,
    signal?: AbortSignal
  ): Promise<CompleteSignature> {
    if (isAgentSignature(signerOrAuthToken)) {
      return {
        consumerAddress: signerOrAuthToken.consumerAddress,
        nonce: signerOrAuthToken.nonce,
        signature: signerOrAuthToken.signature
      }
    }
    if (typeof signerOrAuthToken === 'string') {
      return {
        consumerAddress: await getConsumerAddress(signerOrAuthToken),
        nonce: undefined,
        signature: undefined
      }
    }
    const consumerAddress = await getConsumerAddress(signerOrAuthToken)
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()
    const signature = await getSignature(signerOrAuthToken, nonce, command)
    return { consumerAddress, nonce, signature }
  }

  /**
   * Dial the peer, send the command, and read the first response frame.
   *
   * The process-wide concurrency gate is taken **here**, not in `sendP2pCommand`.
   * `getDownloadUrl` and `getComputeResult` dial through this method directly and
   * used to take no slot at all — precisely the long-lived bulk transfers that hold a
   * connection for minutes, so a fan-out of 20 downloads still burst 20 simultaneous
   * dials against a 32-connection budget of which ~24 are keep-alives.
   *
   * The slot is handed back to the caller as `release` rather than freed when this
   * function returns. Callers MUST call `release()` once they are done with the response
   * — from a generator's `finally` for a streaming reply, from a `finally` around the
   * read loop for a buffered one. It is idempotent, so releasing twice is harmless.
   *
   * A listener on the stream's 'close' event releases it as well, and that is a
   * leak-guard, not a hand-off. 'close' fires once the stream is finished in both
   * directions, which for any reply small enough to fit in the read buffer — the common
   * case — happens *before* the consumer has read a single frame, so it is usually the
   * 'close' listener that frees the slot and not the consumer. What this gate therefore
   * bounds is dials, streams and in-flight first frames, which is what protects the
   * connection budget: measured peak inbound streams is exactly the limit at 1, 2 and 8
   * across every heavy operation. It does not bound how many finished-but-undrained
   * response bodies a caller may be holding — at a limit of 8, up to 11 consumers were
   * observed iterating a body at once.
   *
   * Deliberately not the other way round. Releasing only from the consumer's `finally`
   * would make the slot travel with the body, at the cost of two worse failures: a
   * caller that holds a body while issuing another P2P call deadlocks against itself at
   * low limits, and a response that is never iterated at all strands its slot for good.
   */
  private async dialAndStream(
    nodeUri: OceanNode,
    payload: Record<string, any>,
    signal?: AbortSignal,
    requestBody?: P2PRequestBodyStream
  ): Promise<{
    lp: LpFramedStream
    firstBytes: Uint8Array
    frames: LpFrameReader
    connection: Connection
    // Returned so every read loop can apply backpressure around its own consumer — see
    // `pauseReads`. Reads are already paused when this resolves.
    stream: Stream
    release: () => void
  }> {
    const release = await p2pCommandGate.acquire()
    let connection: Connection | undefined
    try {
      const dialTimeoutMs = this.p2pConfig.dialTimeout ?? DEFAULT_DIAL_TIMEOUT_MS
      const opSignal = signal ?? AbortSignal.timeout(dialTimeoutMs)
      // The dial budget is *composed* with the caller's signal, not replaced by it.
      // `signal ?? timeout(dialTimeout)` gave a caller who supplied a signal no dial
      // bound at all, so a peer that accepts a TCP connection and then never completes
      // the upgrade held the call — and its concurrency slot — for as long as that
      // signal lived, which for a session-scoped controller is effectively forever.
      // The bound belongs on the dial and the stream open only: the writes below can
      // legitimately carry a large request body and must keep running on the caller's
      // own budget once the connection is up.
      //
      // With no caller signal this *is* `opSignal`, the same single timer as before, so
      // the dial and the writes still share one budget and nothing changes for the
      // callers that never passed one.
      const dial = signal
        ? timeoutSignal(signal, dialTimeoutMs)
        : { signal: opSignal, cleanup: () => {} }
      let stream: Stream
      try {
        connection = await this.getConnection(nodeUri, dial.signal)
        stream = await connection.newStream(OCEAN_P2P_PROTOCOL, {
          signal: dial.signal,
          runOnLimitedConnection: true
        })
      } finally {
        dial.cleanup()
      }
      // Leak-guard for the slot — see the note above on what this gate bounds. 'close'
      // fires once the underlying stream is done in both directions, so an abandoned
      // response cannot hold a slot forever.
      stream.addEventListener('close', () => release(), { once: true })
      const lp = lpFramedStream(stream)
      // Same tick as `lpStream`, so the reader's byte accounting cannot miss a
      // message: nothing can be dispatched between the two listeners attaching.
      const frames = new LpFrameReader(lp, stream)

      let outboundPayload = payload
      if (requestBody) {
        outboundPayload = { ...payload, p2pStreamBody: true }
      }

      await lp.write(new TextEncoder().encode(JSON.stringify(outboundPayload)), {
        signal: opSignal
      })
      if (requestBody) {
        await writeP2pRequestBodyLp(lp, requestBody, opSignal)
      }
      await stream.close()

      // Time-to-first-frame belongs on the idle budget, not the dial budget. On
      // `opSignal` the peer had to produce its status frame within 10 s of the dial —
      // and for a download or a compute result that frame is exactly what a node
      // doing an object-store lookup is slowest to produce, so frames 2..n got the
      // generous timeout while frame 1 kept the tight one. The caller's own signal is
      // still honoured, whichever expires first.
      const firstRead = timeoutSignal(signal, this.streamIdleTimeoutMs())
      let firstBytes: Uint8Array
      try {
        firstBytes = await frames.read({ signal: firstRead.signal })
      } finally {
        firstRead.cleanup()
      }
      // The caller gets the status frame back before anything iterates the body, and it may
      // not start iterating in this tick, so hold the transport until a read loop asks for the
      // next frame — otherwise the peer fills the read buffer in the gap and the overflow
      // drops it. Every loop below calls `resumeReads` before each read.
      pauseReads(stream)

      return { lp, firstBytes, frames, connection, stream, release }
    } catch (err: any) {
      release()
      // Evict the connection so retries get a fresh on
      try {
        connection?.abort(new Error('stream failed'))
      } catch {}
      throw err
    }
  }

  /**
   * Sends one command, retrying under a single policy keyed on the *type* of failure.
   *
   * What this replaces was two policies that did not know about each other: one tested
   * the reply body for `Cannot connect to peer`, the other tested a caught error's
   * message for `closed` or `reset`, and each recursed with its own delay. Because the
   * first recursed from inside the `try` the second guards, a command could take both
   * branches at every depth, so the attempt count compounded instead of adding up.
   * Here there is one loop, one counter and one decision, taken on
   * {@link classifyP2pError} rather than on the wording of a message.
   *
   * Each attempt goes through `dialAndStream` afresh, which is what gives it its own
   * dial deadline — a retry must not inherit the expired budget of the attempt that
   * just failed. The caller's own signal is the exception, deliberately: it is their
   * deadline for the whole operation, so once it has fired there is nothing left to
   * retry inside and the loop stops.
   */
  private async sendP2pCommand(
    nodeUri: OceanNode,
    command: string,
    body: Record<string, any>,
    signerOrAuthToken?: SignerOrAuthTokenOrSignature | null,
    signal?: AbortSignal,
    requestBody?: P2PRequestBodyStream
  ): Promise<any> {
    const maxRetries = this.maxRetryAttempts()
    let timeoutRetries = 0
    for (let attempt = 0; ; attempt++) {
      // A request body is an async iterable the caller hands over once. Nothing can
      // rewind it, so a second attempt would send an empty or half-consumed body and
      // report whatever the peer made of that. One attempt only.
      const lastAttempt = attempt >= maxRetries || requestBody != null
      try {
        return await this.attemptP2pCommand(
          nodeUri,
          command,
          body,
          signerOrAuthToken,
          signal,
          requestBody,
          lastAttempt
        )
      } catch (err: any) {
        const type = classifyP2pError(err)
        const spent =
          lastAttempt ||
          signal?.aborted === true ||
          (type === 'timeout' && timeoutRetries >= MAX_TIMEOUT_RETRIES)
        if (!isRetryableP2pError(type) || spent) {
          // The peer reported the failure inside a well-formed reply, and with the
          // budget gone the untyped code returned that reply to the caller rather than
          // raising. Kept, so a consumer reading `.error` off the result still can.
          if (err instanceof P2pError && err.peerResponse != null) {
            return err.peerResponse.value
          }
          throw asP2pCommandError(err, type)
        }
        if (type === 'timeout') timeoutRetries++
        LoggerInstance.debug(
          `[P2P] ${command}: ${type} on attempt ${attempt + 1} of ` +
            `${maxRetries + 1}, retrying...`
        )
        await sleep(this.retryBackoffMs(attempt + 1))
      }
    }
  }

  /** One attempt at a command. Retries are decided by `sendP2pCommand`. */
  private async attemptP2pCommand(
    nodeUri: OceanNode,
    command: string,
    body: Record<string, any>,
    signerOrAuthToken?: SignerOrAuthTokenOrSignature | null,
    signal?: AbortSignal,
    requestBody?: P2PRequestBodyStream,
    lastAttempt: boolean = true
  ): Promise<any> {
    // The concurrency slot is owned by `dialAndStream` now — see the comment there.
    // This method only decides *when* to hand it back: at the end of the buffered read
    // loop, or when a streaming generator finishes. It must not acquire a slot of its
    // own, or a recursive retry would hold two and the gate would deadlock against
    // itself at low limits. The slot is still released before each retry so a
    // recursive attempt queues behind other callers rather than jumping the line.
    let releaseSlot: (() => void) | null = null
    let slotOwnedByStream = false
    // Set once the buffered read has run to a clean end (or handed the stream to a
    // generator). Any earlier exit — an error status envelope, a truncated or over-limit
    // body — must reset the stream so the peer stops producing, exactly as getDownloadUrl
    // and the streaming generator's finally do.
    let completed = false
    let streamToAbort: Stream | null = null
    try {
      const payload = {
        command,
        authorization: signerOrAuthToken
          ? this.getAuthorization(signerOrAuthToken)
          : undefined,
        ...body
      }

      const dialed = await this.dialAndStream(nodeUri, payload, signal, requestBody)
      releaseSlot = dialed.release
      const { firstBytes, frames, stream } = dialed
      streamToAbort = stream
      const idleTimeout = this.streamIdleTimeoutMs()

      if (!firstBytes.length) {
        throw new Error('Gateway node error: no response from peer')
      }

      // parse inside the `try`, decide outside it. The `throw` used to sit
      // *inside* a `try` whose `catch {}` was empty, so it was dead code: a status
      // frame of `{"httpStatus":500}` was swallowed. Buffered replies were rescued by
      // the identical check further down, but the three streaming commands were not —
      // they handed the error envelope to the consumer as the first data chunk.
      let status: Record<string, any> | null = null
      try {
        status = JSON.parse(new TextDecoder().decode(firstBytes))
      } catch {
        // Not JSON: the first frame is data, not a status envelope.
      }
      if (typeof status?.httpStatus === 'number' && status.httpStatus >= 400) {
        // Same message shaping as the buffered check below, so error text does not
        // change for the paths that were already covered.
        throw new Error(
          typeof status.error === 'string'
            ? status.error
            : status.error != null
              ? JSON.stringify(status.error)
              : `Gateway node error: ${status.httpStatus}`
        )
      }

      if (
        command === PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS ||
        command === PROTOCOL_COMMANDS.SERVICE_GET_STREAMABLE_LOGS ||
        command === PROTOCOL_COMMANDS.COMPUTE_GET_RESULT
      ) {
        // The slot is released from the generator's `finally`, which also runs when the
        // consumer `break`s out of a `for await`. The 'close' leak-guard in
        // `dialAndStream` often gets there first for a short reply — see the note there
        // on what the gate actually bounds.
        slotOwnedByStream = true
        const slot = dialed.release
        const streamableChunks = (async function* () {
          let completed = false
          try {
            while (true) {
              // Flow control. Reads are held while the consumer works on a frame, and are
              // only let go again once the backlog we are already holding has drained below
              // the mark — see `LP_RESUME_BELOW_BYTES`. Without this the peer fills the read
              // buffer at its own pace and `byteStream` silently drops the entire backlog past
              // `maxBufferSize`, which desynchronises the frame parser: the consumer is handed
              // corrupt, out-of-sequence frames for a while before the end-of-stream
              // accounting throws.
              if (frames.pendingBytes <= LP_RESUME_BELOW_BYTES) {
                resumeReads(stream)
              }
              // The caller's signal is composed into every frame read, not just the
              // first, so a transfer can be cancelled while it is running.
              const chunk = await readFrame(frames, signal, idleTimeout)
              pauseReads(stream)
              yield chunk
            }
          } catch (e) {
            // Only a clean end-of-stream ends the generator. A truncated frame throws
            // the same error type, and swallowing it would hand the caller a short
            // payload as if the transfer had completed.
            if (!frames.isCleanEnd(e)) throw e
            completed = true
          } finally {
            // Never leave the read side paused once nobody is reading any more.
            resumeReads(stream)
            // Anything but a clean end means nobody is going to read this body: the
            // caller cancelled, the transfer broke, or the consumer left its `for await`
            // early. Reset the stream so the peer stops producing instead of filling our
            // read buffer until the idle timeout expires.
            if (!completed) {
              abortResponseStream(
                stream,
                new Error('P2P response is no longer being read')
              )
            }
            slot()
          }
        })()
        return streamableChunks
      }

      // Frames of the reply *body*. When the peer opened with a status envelope that
      // envelope is `firstBytes`, it was parsed into `status` above, and it is not part
      // of the body — a node that sends data with no envelope leaves `status` null, and
      // then the first frame is body after all. Copied out of the frame reader for the
      // same reason the download path copies: these are held across many subsequent
      // reads, and a view over a buffer the reader owns is not ours to keep.
      const chunks: Uint8Array[] = status === null ? [new Uint8Array(firstBytes)] : []
      const commandLimit = this.maxBufferedCommandBytes()
      let buffered = 0
      try {
        buffered = accumulated(buffered, firstBytes, commandLimit, 'command reply')
        while (true) {
          // Reads are held when this loop starts (`dialAndStream` pauses them), so each pass
          // has to let the next frame through. This loop never suspends between reads, so it
          // needs no pause of its own.
          if (frames.pendingBytes <= LP_RESUME_BELOW_BYTES) {
            resumeReads(stream)
          }
          const chunk = new Uint8Array(await readFrame(frames, signal, idleTimeout))
          buffered = accumulated(buffered, chunk, commandLimit, 'command reply')
          chunks.push(chunk)
        }
      } catch (e) {
        // A truncated response body — `GET_LOGS` is the big one — must not be parsed
        // and returned as though the peer had finished sending it. An over-limit body is
        // in the same position: it is not a complete reply, so it must not be parsed as
        // one, and the peer is told to stop rather than being left to keep sending.
        if (!frames.isCleanEnd(e)) {
          abortResponseStream(stream, e)
          throw e
        }
      }

      // A reply body arrives in as many frames as the peer's response stream had chunks:
      // ocean-node writes one frame per chunk, so anything past a stream chunk (16—64 KiB)
      // is split — a large DDO, a `GET_LOGS` dump, a busy `computeStatus`. The frames have
      // to be **joined** before parsing. The previous loop parsed each frame in turn and
      // kept the last result, so a split reply came back as the raw bytes of its final
      // fragment: measured against a two-frame `{"nonce":42,…}`, `getNonce` returned
      // `null`. Every reply small enough to fit one frame — which is most of them — was
      // unaffected, which is why this survived.
      let response: unknown
      if (chunks.length === 0) {
        // Nothing but the status envelope: it is the whole reply, exactly as before.
        response = status
      } else {
        const bodyBytes = concatUint8Arrays(chunks)
        try {
          response = JSON.parse(new TextDecoder().decode(bodyBytes))
        } catch {
          // Not JSON — hand back the bytes, now the whole body rather than its last frame.
          response = bodyBytes
        }
      }

      const res = response as Record<string, any> | null
      if (typeof res?.httpStatus === 'number' && res.httpStatus >= 400) {
        throw new Error(
          typeof res.error === 'string' ? res.error : JSON.stringify(res.error)
        )
      }

      const errText = (typeof response === 'string' ? response : res?.error) ?? ''
      if (errText.includes('Cannot connect to peer') && !lastAttempt) {
        // The peer answered, and what it says is that *it* could not reach the node
        // this command was addressed to: a dial failure one hop further out, and the
        // one thing another attempt can plausibly fix.
        //
        // This is the only place left where a remote failure is recognised from text,
        // and it is unavoidable: the reply is a string on the wire, so there is no type
        // to read. What matters is that the match happens once, here, and produces a
        // type — nothing downstream re-reads the wording to decide anything.
        //
        // The slot goes back before the error leaves, so the next attempt queues behind
        // other callers instead of holding two.
        releaseSlot?.()
        releaseSlot = null
        throw new P2pError('dial_failed', errText, {
          peerResponse: { value: response }
        })
      }

      completed = true
      return response
    } finally {
      // A streaming reply owns the slot from here on; everything else is done with it.
      if (!slotOwnedByStream) {
        // Any non-clean exit of the buffered path (error status envelope, truncated or
        // over-limit body, a dial-failed retry) must reset the stream before the slot
        // goes back, so the peer stops streaming into a read buffer nobody will drain.
        if (!completed && streamToAbort) {
          abortResponseStream(
            streamToAbort,
            new Error('P2P command response is no longer being read')
          )
        }
        releaseSlot?.()
      }
    }
  }

  /**
   * Returns node status via P2P STATUS command.
   * @param {OceanNode} nodeUri - multiaddr of the node
   */
  public async getNodeStatus(
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<NodeStatus> {
    try {
      return await this.sendP2pCommand(
        nodeUri,
        PROTOCOL_COMMANDS.STATUS,
        {},
        null,
        signal
      )
    } catch (e) {
      LoggerInstance.error('P2P getNodeStatus (STATUS) failed:', e)
      throw e
    }
  }

  public async getNodeJobs(
    nodeUri: OceanNode,
    fromTimestamp?: number,
    signal?: AbortSignal
  ): Promise<NodeComputeJob[]> {
    try {
      const body: Record<string, any> = {}
      if (fromTimestamp) body.fromTimestamp = fromTimestamp.toString()
      const result = await this.sendP2pCommand(
        nodeUri,
        PROTOCOL_COMMANDS.JOBS,
        body,
        null,
        signal
      )
      return Array.isArray(result) ? result : []
    } catch (e) {
      LoggerInstance.error('P2P getNodeJobs failed:', e)
      return []
    }
  }

  /**
   * Get current nonce from the node via P2P.
   */
  public async getNonce(
    nodeUri: OceanNode,
    consumerAddress: string,
    signal?: AbortSignal
  ): Promise<number> {
    try {
      const result = await this.sendP2pCommand(
        nodeUri,
        PROTOCOL_COMMANDS.NONCE,
        { address: consumerAddress },
        null,
        signal
      )
      // ocean-node may return a plain number or { nonce: number }
      const nonceValue =
        typeof result === 'number' ? result : (result?.nonce ?? result ?? 0)
      return !nonceValue || nonceValue === null ? 0 : Number(nonceValue)
    } catch (e) {
      LoggerInstance.error('P2P getNonce failed:', e)
      throw e
    }
  }

  /**
   * Encrypt data via P2P ENCRYPT command.
   */
  public async encrypt(
    data: any,
    chainId: number,
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    _policyServer?: any,
    signal?: AbortSignal
  ): Promise<string> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.ENCRYPT,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.ENCRYPT,
      {
        chainId,
        nonce,
        consumerAddress,
        signature,
        blob: typeof data === 'string' ? data : JSON.stringify(data)
      },
      signerOrAuthToken,
      signal
    )
    return this.bufToHex(result)
  }

  /**
   * Get file details for a given DID and service ID via P2P.
   */
  public async checkDidFiles(
    did: string,
    serviceId: string,
    nodeUri: OceanNode,
    withChecksum: boolean = false,
    signal?: AbortSignal
  ): Promise<FileInfo[]> {
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.FILE_INFO,
      { did, serviceId, checksum: withChecksum },
      null,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  /**
   * Get File details via P2P.
   */
  public async getFileInfo(
    file: StorageObject,
    nodeUri: OceanNode,
    withChecksum: boolean = false,
    signal?: AbortSignal
  ): Promise<FileInfo[]> {
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.FILE_INFO,
      { file, type: (file as any).type, checksum: withChecksum },
      null,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  /**
   * Returns compute environments via P2P.
   */
  public async getComputeEnvironments(
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<ComputeEnvironment[]> {
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_GET_ENVIRONMENTS,
      {},
      null,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  /**
   * Initializes the provider for a service (download) request via P2P.
   */
  public async initialize(
    did: string,
    serviceId: string,
    fileIndex: number,
    consumerAddress: string,
    nodeUri: OceanNode,
    signal?: AbortSignal,
    userCustomParameters?: UserCustomParameters,
    computeEnv?: string,
    validUntil?: number
  ): Promise<ProviderInitialize> {
    const body: Record<string, any> = {
      ddoId: did,
      serviceId,
      consumerAddress
    }
    if (userCustomParameters) body.userdata = userCustomParameters
    if (computeEnv) body.environment = computeEnv
    if (validUntil) body.validUntil = validUntil
    return this.sendP2pCommand(nodeUri, PROTOCOL_COMMANDS.GET_FEES, body, null, signal)
  }

  /**
   * Initializes compute request via P2P. No auth required -- the node only
   * validates parameters and applies rate limits.
   */
  public async initializeCompute(
    assets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    computeEnv: string,
    token: string,
    validUntil: number,
    nodeUri: OceanNode,
    consumerAddress: string,
    resources: ComputeResourceRequest[],
    chainId: number,
    policyServer?: any,
    signal?: AbortSignal,
    queueMaxWaitTime?: number,
    dockerRegistryAuthData?: dockerRegistryAuth,
    output?: ComputeOutput
  ): Promise<ProviderComputeInitializeResults> {
    const body: Record<string, any> = {
      datasets: assets,
      algorithm,
      environment: computeEnv,
      payment: { chainId, token, resources },
      maxJobDuration: validUntil,
      consumerAddress
    }
    if (policyServer) body.policyServer = policyServer
    if (queueMaxWaitTime) body.queueMaxWaitTime = queueMaxWaitTime
    if (dockerRegistryAuthData) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) {
        body.encryptedDockerRegistryAuth = eciesencrypt(
          nodeKey,
          JSON.stringify(dockerRegistryAuthData)
        )
      }
    }
    if (output) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) body.output = eciesencrypt(nodeKey, JSON.stringify(output))
    }

    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_INITIALIZE,
      body,
      null,
      signal
    )
  }

  /**
   * Sends a DOWNLOAD command to the peer via P2P, reads the binary stream
   * directly from the lpStream, and returns a DownloadResponse.
   * The node decrypts the service file and streams raw file data back.
   *
   * @param signal Cancels the whole operation, not just its start: it is honoured by the
   *   nonce round-trip, the dial, the first frame *and* every subsequent frame, so a
   *   transfer already in progress stops when it fires and the stream is reset so the
   *   peer stops sending. Optional — omitting it keeps the previous behaviour exactly,
   *   including the dial timeout that applies when no signal is supplied.
   */
  public async getDownloadUrl(
    did: string,
    serviceId: string,
    fileIndex: number,
    transferTxId: string,
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    policyServer?: any,
    userCustomParameters?: UserCustomParameters,
    signal?: AbortSignal
  ): Promise<DownloadResponse> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.DOWNLOAD,
      signal
    )

    const payload: Record<string, any> = {
      command: PROTOCOL_COMMANDS.DOWNLOAD,
      authorization: this.getAuthorization(signerOrAuthToken),
      fileIndex,
      documentId: did,
      transferTxId,
      serviceId,
      consumerAddress,
      nonce,
      signature
    }
    if (policyServer) payload.policyServer = policyServer
    if (userCustomParameters) payload.userData = userCustomParameters

    // `dialAndStream` now takes a concurrency slot on our behalf. A download is the
    // longest-lived operation this client performs, so the slot is held for the whole
    // transfer and released only once the body is fully collected or has failed.
    const { firstBytes, frames, stream, release } = await this.dialAndStream(
      nodeUri,
      payload,
      signal
    )
    let completed = false
    try {
      // First lp frame is the status JSON (if present). Some nodes send binary data
      // directly without a status prefix — in that case JSON.parse throws SyntaxError
      // and we treat the frame as the start of file data.
      const statusText = new TextDecoder().decode(firstBytes)
      let status: { httpStatus?: number; error?: string } | null = null
      try {
        status = JSON.parse(statusText)
      } catch {
        // Not JSON — first frame is file data, fall through to chunk collection
      }
      if (status && typeof status.httpStatus === 'number' && status.httpStatus >= 400) {
        throw new Error(status.error ?? `P2P download error: ${status.httpStatus}`)
      }

      // Collect binary file data. If the first frame wasn't a status JSON, it's data.
      const chunks: Uint8Array[] = status === null ? [new Uint8Array(firstBytes)] : []
      const idleTimeout = this.streamIdleTimeoutMs()
      const downloadLimit = this.maxBufferedDownloadBytes()
      let buffered = 0
      try {
        for (const chunk of chunks) {
          buffered = accumulated(buffered, chunk, downloadLimit, 'download')
        }
        while (true) {
          // Reads are held when this loop starts (`dialAndStream` pauses them), so each pass
          // has to let the next frame through. This loop never suspends between reads, so it
          // needs no pause of its own.
          if (frames.pendingBytes <= LP_RESUME_BELOW_BYTES) {
            resumeReads(stream)
          }
          // Every frame is read under the caller's signal as well as the idle timeout,
          // so a download in progress can be cancelled mid-transfer.
          const chunk = new Uint8Array(await readFrame(frames, signal, idleTimeout))
          buffered = accumulated(buffered, chunk, downloadLimit, 'download')
          chunks.push(chunk)
        }
      } catch (e) {
        // A download that was cut short must fail, not return the bytes that did
        // arrive as a complete file. A download past the ceiling fails for the same
        // reason: what is in hand is not the file that was asked for. The `finally`
        // below resets the stream, so the peer stops sending the rest of it.
        if (!frames.isCleanEnd(e)) throw e
      }
      completed = true

      const combined = concatUint8Arrays(chunks)
      return {
        data: combined.buffer.slice(
          combined.byteOffset,
          combined.byteOffset + combined.byteLength
        ) as ArrayBuffer,
        filename: `file${fileIndex}`
      }
    } finally {
      // A cancelled or failed download must not leave the peer streaming a file into a
      // read buffer nobody will drain.
      if (!completed) {
        abortResponseStream(stream, new Error('P2P download was cancelled or failed'))
      }
      release()
    }
  }

  /**
   * Start a paid compute job via P2P.
   */
  public async computeStart(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    computeEnv: string,
    datasets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    maxJobDuration: number,
    token: string,
    resources: ComputeResourceRequest[],
    chainId: number,
    metadata?: ComputeJobMetadata,
    additionalViewers?: string[],
    output?: ComputeOutput,
    policyServer?: any,
    signal?: AbortSignal,
    queueMaxWaitTime?: number,
    dockerRegistryAuth?: dockerRegistryAuth,
    outputBucketId?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.COMPUTE_START,
      signal
    )

    const body: Record<string, any> = {
      environment: computeEnv,
      dataset: datasets[0],
      datasets,
      algorithm,
      maxJobDuration,
      feeToken: token,
      resources,
      chainId,
      payment: { chainId, token, maxJobDuration, resources },
      consumerAddress,
      nonce,
      signature
    }
    if (metadata) body.metadata = metadata
    if (additionalViewers) body.additionalViewers = additionalViewers
    if (policyServer) body.policyServer = policyServer
    if (queueMaxWaitTime) body.queueMaxWaitTime = queueMaxWaitTime
    if (dockerRegistryAuth) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey)
        body.encryptedDockerRegistryAuth = eciesencrypt(
          nodeKey,
          JSON.stringify(dockerRegistryAuth)
        )
    }
    if (output) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) body.output = eciesencrypt(nodeKey, JSON.stringify(output))
    }
    if (outputBucketId) body.outputBucketId = outputBucketId

    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_START,
      body,
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : result
  }

  /**
   * Start a free compute job via P2P.
   */
  public async freeComputeStart(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    computeEnv: string,
    datasets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    resources?: ComputeResourceRequest[],
    metadata?: ComputeJobMetadata,
    additionalViewers?: string[],
    output?: ComputeOutput,
    policyServer?: any,
    signal?: AbortSignal,
    queueMaxWaitTime?: number,
    dockerRegistryAuth?: dockerRegistryAuth,
    outputBucketId?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.FREE_COMPUTE_START,
      signal
    )

    const body: Record<string, any> = {
      environment: computeEnv,
      dataset: datasets[0],
      datasets,
      algorithm,
      resources,
      consumerAddress,
      nonce,
      signature
    }
    if (metadata) body.metadata = metadata
    if (additionalViewers) body.additionalViewers = additionalViewers
    if (policyServer) body.policyServer = policyServer
    if (queueMaxWaitTime) body.queueMaxWaitTime = queueMaxWaitTime
    if (dockerRegistryAuth) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey)
        body.encryptedDockerRegistryAuth = eciesencrypt(
          nodeKey,
          JSON.stringify(dockerRegistryAuth)
        )
    }
    if (output) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) body.output = eciesencrypt(nodeKey, JSON.stringify(output))
    }
    if (outputBucketId) body.outputBucketId = outputBucketId

    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.FREE_COMPUTE_START,
      body,
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : result
  }

  /**
   * Get streamable compute logs via P2P. Returns an async generator of Uint8Array chunks.
   */
  public async computeStreamableLogs(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    signal?: AbortSignal
  ): Promise<any> {
    const isAuthToken = typeof signerOrAuthToken === 'string'
    if (isAuthToken) {
      return this.sendP2pCommand(
        nodeUri,
        PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS,
        { jobId },
        signerOrAuthToken,
        signal
      )
    }

    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS,
      { jobId, consumerAddress, nonce, signature },
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Stop a compute job via P2P.
   */
  public async computeStop(
    jobId: string,
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    agreementId?: string,
    signal?: AbortSignal
  ): Promise<ComputeJob | ComputeJob[]> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.COMPUTE_STOP,
      signal
    )

    const body: Record<string, any> = { jobId, consumerAddress, nonce, signature }
    if (agreementId) body.agreementId = agreementId

    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_STOP,
      body,
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Get compute status via P2P.
   * @param {boolean} includeMetrics Owner-only runtime metrics (`runtimeMetrics`) on the
   *   returned job(s). To receive them, the node needs owner credentials: an auth token
   *   (`signerOrAuthToken` as a string) is ALWAYS sent, regardless of this flag; a `Signer`'s
   *   nonce+signature is only computed and sent when this flag is `true` (skipped otherwise
   *   to avoid an extra nonce round-trip on every plain status poll). Omitted (default): the
   *   node attaches metrics silently if valid owner credentials made it into the request
   *   (true automatically for token callers, false for `Signer` callers unless this flag is
   *   set), and returns exactly today's response otherwise. `true`: metrics are required —
   *   this method also computes the `Signer`'s signature, and the node answers 400/401 if
   *   credentials don't verify. `false`: metrics are never attached.
   */
  public async computeStatus(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId?: string,
    agreementId?: string,
    signal?: AbortSignal,
    includeMetrics?: boolean
  ): Promise<NodeComputeJob | NodeComputeJob[]> {
    let consumerAddress: string
    let nonce: string
    let signature: string
    if (includeMetrics === true) {
      ;({ consumerAddress, nonce, signature } = await this.getSignedCommandParams(
        nodeUri,
        signerOrAuthToken,
        PROTOCOL_COMMANDS.COMPUTE_GET_STATUS,
        signal
      ))
    } else {
      consumerAddress = await getConsumerAddress(signerOrAuthToken)
    }
    const body: Record<string, any> = { consumerAddress }
    if (jobId) body.jobId = jobId
    if (agreementId) body.agreementId = agreementId
    if (includeMetrics !== undefined) body.includeMetrics = includeMetrics
    if (nonce) body.nonce = nonce
    if (signature) body.signature = signature

    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_GET_STATUS,
      body,
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Get compute result as an async generator of Uint8Array chunks via P2P.
   * Supports resumable downloads via `offset` (byte position to resume from).
   *
   * @param signal Cancels the whole operation, not just its start: it is honoured by the
   *   nonce round-trip, the dial, the first frame *and* every frame the returned
   *   generator reads, so a result already being transferred stops when it fires and the
   *   stream is reset so the peer stops sending. Optional — omitting it keeps the
   *   previous behaviour exactly.
   */
  public async getComputeResult(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    index: number,
    offset: number = 0,
    signal?: AbortSignal
  ): Promise<ComputeResultStream> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.COMPUTE_GET_RESULT,
      signal
    )
    const payload: Record<string, any> = {
      command: PROTOCOL_COMMANDS.COMPUTE_GET_RESULT,
      jobId,
      index,
      offset,
      consumerAddress
    }

    if (typeof signerOrAuthToken === 'string') {
      payload.authorization = signerOrAuthToken
    } else {
      payload.nonce = nonce
      payload.signature = signature
    }

    // `dialAndStream` took a concurrency slot for us; the generator below releases it
    // from its `finally` rather than this method releasing it on return — a compute
    // result is a bulk transfer that can hold its connection for minutes. (The 'close'
    // leak-guard in `dialAndStream` can get there first when the whole result fitted in
    // the read buffer; see the note there on what the gate bounds.)
    const { firstBytes, frames, stream, release } = await this.dialAndStream(
      nodeUri,
      payload,
      signal
    )

    let status: Record<string, any>
    try {
      // First frame is always a status JSON
      status = JSON.parse(new TextDecoder().decode(firstBytes))
      if (typeof status?.httpStatus === 'number' && status.httpStatus >= 400) {
        throw new Error(status.error ?? `P2P compute result error: ${status.httpStatus}`)
      }
    } catch (e) {
      // Nothing is going to consume the generator, so hand the slot back here.
      release()
      throw e
    }

    const idleTimeout = this.streamIdleTimeoutMs()
    return (async function* () {
      let completed = false
      try {
        while (true) {
          // Flow control — see `LP_RESUME_BELOW_BYTES`. A compute result is exactly the
          // transfer where a consumer writing to disk falls behind the sender, and an unread
          // backlog past `maxBufferSize` is silently dropped by `byteStream`, desynchronising
          // the frame parser and handing out corrupt, out-of-sequence frames.
          if (frames.pendingBytes <= LP_RESUME_BELOW_BYTES) {
            resumeReads(stream)
          }
          // Every frame is read under the caller's signal as well as the idle timeout,
          // so a result transfer in progress can be cancelled mid-flight.
          const chunk = await readFrame(frames, signal, idleTimeout)
          pauseReads(stream)
          yield chunk
        }
      } catch (e) {
        // Truncation and a clean end throw the same error type; only the clean end
        // may finish the stream, or the consumer writes a short result file.
        if (!frames.isCleanEnd(e)) throw e
        completed = true
      } finally {
        // Never leave the read side paused once nobody is reading any more.
        resumeReads(stream)
        // Cancelled, broken, or left early by the consumer: reset the stream so the peer
        // stops producing a result body nobody will read.
        if (!completed) {
          abortResponseStream(
            stream,
            new Error('P2P compute result is no longer being read')
          )
        }
        release()
      }
    })()
  }

  /**
   * Not available over P2P, and now says so instead of pretending otherwise.
   *
   * There is no URL to return. A peer answers `COMPUTE_GET_RESULT` with the result bytes
   * themselves — the protocol carries no addressable location for them, so nothing this
   * method could hand back would be fetchable. Use {@link getComputeResult}, which gives
   * the same bytes as an async iterable of chunks, and takes an `offset` to resume with.
   *
   * What it did before: `COMPUTE_GET_RESULT` is one of the streaming commands, so
   * `sendP2pCommand` returned an async generator, which the declared `Promise<string>`
   * silently cast to a string. A caller got `typeof 'object'` with `Symbol.asyncIterator`
   * on it, `fetch()` received the literal text `[object AsyncGenerator]`, and
   * `url.startsWith(...)` threw a `TypeError`. It also dialled the peer and had it stream
   * an entire result body that nothing would ever read.
   *
   * The declared type is unchanged: the HTTP transport does return a real URL here, and
   * widening this to a union would force every consumer of the dispatching façade to
   * narrow a type that is a plain string on the transport they actually use.
   */
  public async getComputeResultUrl(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    index: number
  ): Promise<string> {
    throw new Error(
      `getComputeResultUrl is not supported over P2P (job ${jobId}, result index ` +
        `${index}): a peer returns the compute result as a stream, not a URL. Use ` +
        `getComputeResult(nodeUri, signerOrAuthToken, jobId, index) instead.`
    )
  }

  /**
   * Generate an auth token via P2P (auto-signs with Signer).
   */
  public async generateAuthToken(
    consumer: Signer,
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<string> {
    const address = await consumer.getAddress()
    const nonce = ((await this.getNonce(nodeUri, address, signal)) + 1).toString()
    const issuerPeerId = (await this.getNodeStatus(nodeUri, signal))?.id
    if (!issuerPeerId) throw new Error('Could not resolve node peerId for signature.')
    const signature = await getSignature(
      consumer,
      nonce,
      PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN,
      issuerPeerId
    )

    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN,
      { address, signature, nonce },
      null,
      signal
    )
    return result?.token ?? result
  }

  /**
   * Generate an auth token from a pre-signed request (no Signer needed).
   */
  public async generateSignedAuthToken(
    address: string,
    signature: string,
    nonce: string,
    nodeUri: OceanNode,
    validUntil?: number,
    signal?: AbortSignal
  ): Promise<string> {
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN,
      { address, signature, nonce, validUntil },
      null,
      signal
    )
    return result?.token ?? result
  }

  /**
   * Resolve a DDO by DID via P2P GET_DDO command.
   */
  public async resolveDdo(
    nodeUri: OceanNode,
    did: string,
    signal?: AbortSignal
  ): Promise<any> {
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.GET_DDO,
      { id: did },
      null,
      signal
    )
  }

  /**
   * Validate a DDO via P2P VALIDATE_DDO command.
   */
  public async validateDdo(
    nodeUri: OceanNode,
    ddo: DDO,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    signal?: AbortSignal
  ): Promise<ValidateMetadata> {
    const {
      consumerAddress: publisherAddress,
      nonce,
      signature
    } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.VALIDATE_DDO,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.VALIDATE_DDO,
      { ddo, publisherAddress, nonce, signature },
      signerOrAuthToken,
      signal
    )
    if (!result || result.error) return null
    return {
      valid: true,
      hash: this.bufToHex(result.hash),
      proof: {
        validatorAddress: this.bufToHex(result.publicKey),
        r: this.bufToHex(result.r?.[0] ?? result.r),
        s: this.bufToHex(result.s?.[0] ?? result.s),
        v: result.v
      }
    } as ValidateMetadata
  }

  /**
   * Invalidate an auth token via P2P.
   */
  public async invalidateAuthToken(
    consumer: Signer,
    token: string,
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<{ success: boolean }> {
    const consumerAddress = await consumer.getAddress()
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()
    const signature = await getSignature(
      consumer,
      nonce,
      PROTOCOL_COMMANDS.INVALIDATE_AUTH_TOKEN
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.INVALIDATE_AUTH_TOKEN,
      { address: consumerAddress, signature, token, nonce },
      null,
      signal
    )
  }

  /**
   * Check if a P2P node is reachable by calling STATUS.
   */
  public async isValidProvider(
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<boolean> {
    try {
      const result = await this.sendP2pCommand(
        nodeUri,
        PROTOCOL_COMMANDS.STATUS,
        {},
        null,
        signal
      )
      // STATUS response uses 'address' (ETH addr) while HTTP root uses 'providerAddress'
      return !!(
        result &&
        (result.address || result.providerAddress || result.providerAddresses)
      )
    } catch {
      return false
    }
  }

  /**
   * PolicyServer passthrough via P2P.
   */
  public async PolicyServerPassthrough(
    nodeUri: OceanNode,
    request: PolicyServerPassthroughCommand,
    signal?: AbortSignal
  ): Promise<any> {
    // the node injects fields into this object, so it has to be a keyed object. arrays are
    // objects too, and would be forwarded as {"0":..,"1":..} with no action
    if (
      !request?.policyServerPassthrough ||
      typeof request.policyServerPassthrough !== 'object' ||
      Array.isArray(request.policyServerPassthrough)
    )
      throw new Error(
        'PolicyServerPassthrough failed: "policyServerPassthrough" must be an object.'
      )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.POLICY_SERVER_PASSTHROUGH,
      { ...request },
      null,
      signal
    )
  }

  /**
   * Initialize Policy Server verification via P2P.
   *
   * A distinct command from the passthrough, so the signed message uses its own command
   * string: `consumerAddress + nonce + "PolicyServerInitialize"`.
   */
  public async initializePSVerification(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    request: PolicyServerInitializeCommand,
    signal?: AbortSignal
  ): Promise<any> {
    if (!signerOrAuthToken)
      throw new Error(
        'initializePSVerification failed: a signer, auth token or signature is required.'
      )
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.POLICY_SERVER_INITIALIZE,
      signal
    )
    if (!isAddress(consumerAddress))
      throw new Error(
        `initializePSVerification failed: could not resolve a valid web3 "consumerAddress" (got "${consumerAddress}") from the supplied credential.`
      )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.POLICY_SERVER_INITIALIZE,
      { ...request, consumerAddress, nonce, signature },
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Download node logs via P2P.
   */
  public async downloadNodeLogs(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    startTime: string,
    endTime: string,
    maxLogs?: number,
    moduleName?: string,
    level?: string,
    page?: number,
    signal?: AbortSignal
  ): Promise<NodeLogEntry[]> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.GET_LOGS,
      signal
    )

    const body: Record<string, any> = {
      startTime,
      endTime,
      signature,
      nonce,
      address: consumerAddress
    }
    if (maxLogs) body.maxLogs = maxLogs
    if (moduleName) body.moduleName = moduleName
    if (level) body.level = level
    if (page) body.page = page

    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.GET_LOGS,
      body,
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Fetch node configuration via P2P. Accepts a pre-signed payload —
   * the caller is responsible for nonce retrieval and signing.
   */
  public async fetchConfig(
    nodeUri: OceanNode,
    payload: Record<string, any>
  ): Promise<any> {
    return this.sendP2pCommand(nodeUri, PROTOCOL_COMMANDS.FETCH_CONFIG, payload)
  }

  /**
   * Push node configuration via P2P. Accepts a pre-signed payload —
   * the caller is responsible for nonce retrieval and signing.
   */
  public async pushConfig(
    nodeUri: OceanNode,
    payload: Record<string, any>
  ): Promise<any> {
    return this.sendP2pCommand(nodeUri, PROTOCOL_COMMANDS.PUSH_CONFIG, payload)
  }

  public async createPersistentStorageBucket(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    payload: PersistentStorageCreateBucketRequest,
    signal?: AbortSignal
  ): Promise<{
    bucketId: string
    owner: string
    accessList: PersistentStorageAccessList[]
    label?: string | null
  }> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_CREATE_BUCKET,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_CREATE_BUCKET,
      {
        ...authPayload,
        accessLists: payload.accessLists ?? [],
        label: payload.label
      },
      signerOrAuthToken,
      signal
    )
  }

  public async updatePersistentStorageBucket(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    label: string | null,
    signal?: AbortSignal
  ): Promise<PersistentStorageUpdateBucketResponse> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_UPDATE_BUCKET,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_UPDATE_BUCKET,
      { ...authPayload, bucketId, label },
      signerOrAuthToken,
      signal
    )
  }

  public async getPersistentStorageBuckets(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    owner: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageBucket[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_GET_BUCKETS,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_GET_BUCKETS,
      { ...authPayload, owner },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : []
  }

  public async listPersistentStorageFiles(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageFileEntry[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_LIST_FILES,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_LIST_FILES,
      { ...authPayload, bucketId },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : []
  }

  public async getPersistentStorageFileObject(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    fileName: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageObject> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_GET_FILE_OBJECT,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_GET_FILE_OBJECT,
      { ...authPayload, bucketId, fileName },
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Downloads a file stored in a persistent-storage bucket over libp2p.
   *
   * The transfer mirrors `getComputeResult`: `dialAndStream` takes a concurrency
   * slot up front, the first frame is a status JSON (an `httpStatus >= 400` throws
   * and releases the slot immediately), and the returned generator streams the file
   * body, applying flow control so a slow consumer does not overrun the buffer. If
   * the caller stops reading early, or `signal` aborts, or the idle timeout fires,
   * the stream is reset so the peer stops sending, and the concurrency slot is
   * released from the generator's `finally`.
   * @param {OceanNode} nodeUri The provider node (peerId / multiaddr).
   * @param {SignerOrAuthTokenOrSignature} signerOrAuthToken Signer, JWT auth token, or precomputed signature used to authenticate the request.
   * @param {string} bucketId The bucket holding the file.
   * @param {string} fileName The name of the file to download.
   * @param {number} [offset=0] Byte offset to resume the download from, sent to the node in the request payload. Must be a non-negative safe integer.
   * @param {AbortSignal} [signal] Abort signal that cancels the download mid-flight and tears down the stream.
   * @return {Promise<ComputeResultStream>} An async-iterable stream of the file body starting at `offset`.
   */
  public async downloadPersistentStorageFile(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    fileName: string,
    offset: number = 0,
    signal?: AbortSignal
  ): Promise<ComputeResultStream> {
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new Error(`Invalid offset: ${offset}. Must be a non-negative safe integer.`)
    }
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_DOWNLOAD_FILE,
      signal
    )
    const payload: Record<string, any> = {
      command: PROTOCOL_COMMANDS.PERSISTENT_STORAGE_DOWNLOAD_FILE,
      bucketId,
      fileName,
      offset,
      consumerAddress
    }

    if (typeof signerOrAuthToken === 'string') {
      payload.authorization = signerOrAuthToken
    } else {
      payload.nonce = nonce
      payload.signature = signature
    }

    // A stored file is a bulk transfer like a compute result, so this mirrors
    // `getComputeResult`: `dialAndStream` takes a concurrency slot and the generator
    // below releases it from its `finally` rather than this method releasing on return.
    const { firstBytes, frames, stream, release } = await this.dialAndStream(
      nodeUri,
      payload,
      signal
    )

    let status: Record<string, any>
    try {
      // First frame is always a status JSON
      status = JSON.parse(new TextDecoder().decode(firstBytes))
      if (typeof status?.httpStatus === 'number' && status.httpStatus >= 400) {
        throw new Error(
          status.error ?? `P2P persistent storage download error: ${status.httpStatus}`
        )
      }
    } catch (e) {
      // Nothing is going to consume the generator, so hand the slot back here.
      release()
      throw e
    }

    const idleTimeout = this.streamIdleTimeoutMs()
    return (async function* () {
      let completed = false
      try {
        while (true) {
          // Flow control — see `LP_RESUME_BELOW_BYTES`. A file download is exactly the
          // transfer where a consumer writing to disk falls behind the sender, and an unread
          // backlog past `maxBufferSize` is silently dropped by `byteStream`, desynchronising
          // the frame parser and handing out corrupt, out-of-sequence frames.
          if (frames.pendingBytes <= LP_RESUME_BELOW_BYTES) {
            resumeReads(stream)
          }
          // Every frame is read under the caller's signal as well as the idle timeout,
          // so a download in progress can be cancelled mid-flight.
          const chunk = await readFrame(frames, signal, idleTimeout)
          pauseReads(stream)
          yield chunk
        }
      } catch (e) {
        // Truncation and a clean end throw the same error type; only the clean end
        // may finish the stream, or the consumer writes a short file.
        if (!frames.isCleanEnd(e)) throw e
        completed = true
      } finally {
        // Never leave the read side paused once nobody is reading any more.
        resumeReads(stream)
        // Cancelled, broken, or left early by the consumer: reset the stream so the peer
        // stops producing a file body nobody will read.
        if (!completed) {
          abortResponseStream(
            stream,
            new Error('P2P persistent storage download is no longer being read')
          )
        }
        release()
      }
    })()
  }

  public async uploadPersistentStorageFile(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    fileName: string,
    content: P2PRequestBodyStream,
    signal?: AbortSignal
  ): Promise<PersistentStorageFileEntry> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_UPLOAD_FILE,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_UPLOAD_FILE,
      { ...authPayload, bucketId, fileName },
      signerOrAuthToken,
      signal,
      content
    )
  }

  public async deletePersistentStorageFile(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    fileName: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageDeleteFileResponse> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_DELETE_FILE,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.PERSISTENT_STORAGE_DELETE_FILE,
      { ...authPayload, bucketId, fileName },
      signerOrAuthToken,
      signal
    )
  }

  // ── Service on Demand ────────────────────────────────────────────────

  // Encrypts userData to the node's public key (ECIES): JSON-encode then encrypt.
  private async encryptServiceUserData(
    nodeUri: OceanNode,
    userData?: ServiceUserData
  ): Promise<string | undefined> {
    if (userData === undefined || userData === null) return undefined
    const nodeKey = await this.getNodePublicKey(nodeUri)
    if (!nodeKey) throw new Error('Cannot resolve node public key to encrypt userData')
    return eciesencrypt(nodeKey, JSON.stringify(userData))
  }

  public async getServiceTemplates(
    nodeUri: OceanNode,
    chainId?: number,
    signal?: AbortSignal
  ): Promise<ServiceTemplatePublic[]> {
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_GET_TEMPLATES,
      { ...(chainId !== undefined ? { chainId } : {}) },
      null,
      signal
    )
    return Array.isArray(result) ? result : []
  }

  public async serviceStart(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    params: ServiceStartParams,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_START,
      signal
    )
    const { userData, ...rest } = params
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_START,
      {
        ...authPayload,
        ...rest,
        userData: await this.encryptServiceUserData(nodeUri, userData)
      },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  public async serviceStop(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_STOP,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_STOP,
      { ...authPayload, serviceId },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  public async serviceExtend(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    additionalDuration: number,
    payment: ServicePayment,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_EXTEND,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_EXTEND,
      { ...authPayload, serviceId, additionalDuration, payment },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  public async serviceRestart(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    params?: ServiceRestartParams,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    const {
      image,
      tag,
      checksum,
      dockerfile,
      additionalDockerFiles,
      userData,
      dockerCmd,
      dockerEntrypoint
    } = params ?? {}
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_RESTART,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_RESTART,
      {
        ...authPayload,
        serviceId,
        userData: await this.encryptServiceUserData(nodeUri, userData),
        // Only send when supplied — an omitted field reuses the node's stored value, whereas an
        // explicit value REPLACES it (matches ocean-node's restartService REUSE/RESPEC semantics).
        ...(image !== undefined ? { image } : {}),
        ...(tag !== undefined ? { tag } : {}),
        ...(checksum !== undefined ? { checksum } : {}),
        ...(dockerfile !== undefined ? { dockerfile } : {}),
        ...(additionalDockerFiles !== undefined ? { additionalDockerFiles } : {}),
        ...(dockerCmd !== undefined ? { dockerCmd } : {}),
        ...(dockerEntrypoint !== undefined ? { dockerEntrypoint } : {})
      },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : [result]
  }

  /**
   * @param {boolean} includeMetrics Owner-only runtime metrics (`runtimeMetrics`) on the
   *   returned service(s). This command is already authenticated, so metrics are included
   *   BY DEFAULT (omitted / `undefined`); pass `false` to opt out.
   */
  public async getServiceStatus(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId?: string,
    signal?: AbortSignal,
    includeMetrics?: boolean
  ): Promise<ServiceJob[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_GET_STATUS,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_GET_STATUS,
      {
        ...authPayload,
        ...(serviceId ? { serviceId } : {}),
        ...(includeMetrics !== undefined ? { includeMetrics } : {})
      },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : []
  }

  /**
   * Node-wide service listing (SERVICE_LIST) via P2P. Authenticated but NOT owner-scoped:
   * any consumer identity sees every owner's services, listing-sanitized (no userData, no
   * dockerCmd/dockerEntrypoint, no Dockerfile). Default (no filters) returns only the
   * services currently holding a resource reservation; see ServiceListFilters.
   */
  public async getServices(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    filters?: ServiceListFilters,
    signal?: AbortSignal
  ): Promise<ServiceJobListed[]> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_LIST,
      signal
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_LIST,
      {
        ...authPayload,
        ...(filters?.status !== undefined ? { status: filters.status } : {}),
        ...(filters?.includeAllStatuses ? { includeAllStatuses: true } : {}),
        ...(filters?.fromTimestamp ? { fromTimestamp: filters.fromTimestamp } : {}),
        ...(filters?.updatedSince ? { updatedSince: filters.updatedSince } : {})
      },
      signerOrAuthToken,
      signal
    )
    return Array.isArray(result) ? result : []
  }

  /**
   * Stream a running service's container logs via P2P. `since` optionally bounds the lower time
   * (Unix seconds, or a relative duration like '30s'/'2h'); omit for the full history then live.
   */
  public async serviceGetStreamableLogs(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    since?: string,
    signal?: AbortSignal
  ): Promise<any> {
    const authPayload = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.SERVICE_GET_STREAMABLE_LOGS,
      signal
    )
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.SERVICE_GET_STREAMABLE_LOGS,
      { ...authPayload, serviceId, ...(since ? { since } : {}) },
      signerOrAuthToken,
      signal
    )
  }
}
