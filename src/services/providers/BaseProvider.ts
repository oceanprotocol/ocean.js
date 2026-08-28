import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { Signer } from 'ethers'
import {
  StorageObject,
  FileInfo,
  ComputeJob,
  ComputeOutput,
  ComputeAlgorithm,
  ComputeAsset,
  ComputeEnvironment,
  ComputeResource,
  ComputeResultStream,
  FindComputeProvidersRequest,
  FindComputeProvidersResult,
  ComputeProviderMatch,
  ComputeSearchDimensionResult,
  ProviderInitialize,
  ProviderComputeInitializeResults,
  UserCustomParameters,
  ComputeResourceRequest,
  ComputeJobMetadata,
  PolicyServerInitializeCommand,
  PolicyServerPassthroughCommand,
  dockerRegistryAuth,
  DownloadResponse,
  NodeStatus,
  NodeComputeJob,
  NodeLogEntry,
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
  ServicePayment,
  OceanNode,
  NodeP2P,
  CompleteSignature,
  SignerOrAuthTokenOrSignature
} from '../../@types/index.js'
import { type DDO, type ValidateMetadata } from '@oceanprotocol/ddo-js'
import fetch from 'cross-fetch'
import { LoggerInstance } from '../../utils/Logger.js'
import { decodeJwt } from '../../utils/Jwt.js'
import { signRequest } from '../../utils/SignatureUtils.js'
import { HttpProvider } from './HttpProvider.js'
import {
  getSharedP2pProvider,
  type P2pProvider,
  type P2PConfig,
  type P2PRequestBodyStream,
  type P2pProviderRecord
} from './P2pProvider.js'
import { c2dBucketFor, c2dCapabilityContent } from '../../utils/C2dCapability.js'

export {
  OCEAN_P2P_PROTOCOL,
  type P2PConfig,
  type P2pProviderRecord,
  type Multiaddr,
  // A P2P failure now carries what kind of failure it is, so a caller can branch on
  // the type instead of matching the message text. Re-exported because the type is
  // only useful to someone who can name it.
  P2pError,
  type P2pErrorType,
  classifyP2pError,
  isRetryableP2pError
} from './P2pProvider.js'

export async function getConsumerAddress(
  signerOrAuthToken: SignerOrAuthTokenOrSignature
): Promise<string> {
  if (isAgentSignature(signerOrAuthToken)) return signerOrAuthToken.consumerAddress
  if (typeof signerOrAuthToken === 'string') return decodeJwt(signerOrAuthToken).address

  return signerOrAuthToken.getAddress()
}

export async function getSignature(
  signerOrAuthToken: SignerOrAuthTokenOrSignature,
  nonce: string,
  command: string,
  issuerPeerId: string = ''
): Promise<string | null> {
  if (typeof signerOrAuthToken === 'string') {
    return null
  }
  if (isAgentSignature(signerOrAuthToken)) {
    return signerOrAuthToken.signature
  }
  const message =
    String(await signerOrAuthToken.getAddress()) +
    String(nonce) +
    String(command) +
    String(issuerPeerId)
  return signRequest(signerOrAuthToken, message)
}

export function getAuthorization(
  signerOrAuthToken: SignerOrAuthTokenOrSignature
): string | undefined {
  return typeof signerOrAuthToken === 'string' ? signerOrAuthToken : undefined
}

export function isAgentSignature(v: unknown): v is CompleteSignature {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as any).consumerAddress === 'string' &&
    typeof (v as any).nonce === 'string' &&
    typeof (v as any).signature === 'string'
  )
}

function isPeerIdOrMultiAddr(param: string) {
  try {
    multiaddr(param)
    return true
  } catch {}
  try {
    peerIdFromString(param)
    return true
  } catch {
    return false
  }
}
export function isP2pUri(node: OceanNode): boolean {
  if (!node) return false
  if (typeof node === 'string') {
    return isPeerIdOrMultiAddr(node)
  }

  // NodeP2P -> p2p
  if (typeof node === 'object' && ('nodeId' in node || 'multiaddress' in node)) {
    const nodeP2p = node as NodeP2P
    if (Array.isArray(nodeP2p.multiaddress) && nodeP2p.multiaddress.length > 0)
      return true
    if (nodeP2p.nodeId) {
      return isPeerIdOrMultiAddr(nodeP2p.nodeId)
    }
  }

  // PeerId (libp2p) -> p2p
  if (typeof node === 'object' && typeof (node as any).toString === 'function') {
    const s = String((node as any).toString())
    try {
      peerIdFromString(s)
      return true
    } catch {
      return false
    }
  }
  return false
}

/**
 * The resource pool relevant to a request against one compute environment: `free.resources`
 * for a free-tier request, the paid `resources` otherwise. The two are never mixed.
 */
function computeResourcePool(env: ComputeEnvironment, free: boolean): ComputeResource[] {
  return (free ? env.free?.resources : env.resources) ?? []
}

/**
 * True when `res` is the resource named by `resource` (case-insensitively). A multi-instance
 * resource such as a GPU or an FPGA is commonly announced per device with an id like `gpu-0`;
 * the part before a trailing `-<index>` is matched too, so a plain `'gpu'` request still finds
 * it without the caller needing to know the environment's own device numbering.
 */
function computeResourceMatchesId(res: ComputeResource, resource: string): boolean {
  const target = resource.toLowerCase()
  const id = res.id?.toLowerCase()
  const type = (res.type as string | undefined)?.toLowerCase()
  if (id === target || type === target) return true
  return id !== undefined && id.replace(/-\d+$/, '') === target
}

/**
 * True when a requested model/qualifier (e.g. a GPU name) matches this resource entry. A
 * qualifier of this kind is never part of the hashed lookup string — it is matched here,
 * against whichever of `description` (the paid path) or `kind` (the free path) a provider
 * populated for the same concept, at verification time only.
 */
function computeResourceMatchesModel(
  res: ComputeResource,
  model: string | undefined
): boolean {
  if (!model) return true
  const haystack = `${res.description ?? ''} ${res.kind ?? ''}`.toLowerCase()
  return haystack.includes(model.toLowerCase())
}

/**
 * True when a single compute environment has `value` or more of `resource` available, and
 * matches `model` when one was requested. This is the verification that a bucket match alone
 * can never substitute for.
 */
function computeEnvironmentSatisfies(
  env: ComputeEnvironment,
  free: boolean,
  resource: string,
  value: number,
  model: string | undefined
): boolean {
  return computeResourcePool(env, free).some(
    (res) =>
      computeResourceMatchesId(res, resource) &&
      res.max >= value &&
      computeResourceMatchesModel(res, model)
  )
}

export class BaseProvider {
  private httpProvider = new HttpProvider()
  // Process-wide: a libp2p node is heavyweight, and every BaseProvider used to
  // build its own. See getSharedP2pProvider().
  private p2pProvider = getSharedP2pProvider()

  protected getImpl(node: OceanNode): any {
    return isP2pUri(node) ? this.p2pProvider : this.httpProvider
  }

  public getP2PProvider() {
    return this.p2pProvider
  }

  public async getNonce(
    nodeUri: OceanNode,
    consumerAddress: string,
    signal?: AbortSignal
  ): Promise<number> {
    return this.getImpl(nodeUri).getNonce(nodeUri, consumerAddress, signal)
  }

  public async encrypt(
    data: any,
    chainId: number,
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    policyServer?: any,
    signal?: AbortSignal
  ): Promise<string> {
    return this.getImpl(nodeUri).encrypt(
      data,
      chainId,
      nodeUri,
      signerOrAuthToken,
      policyServer,
      signal
    )
  }

  public async checkDidFiles(
    did: string,
    serviceId: string,
    nodeUri: OceanNode,
    withChecksum: boolean = false,
    signal?: AbortSignal
  ): Promise<FileInfo[]> {
    return this.getImpl(nodeUri).checkDidFiles(
      did,
      serviceId,
      nodeUri,
      withChecksum,
      signal
    )
  }

  public async getFileInfo(
    file: StorageObject,
    nodeUri: OceanNode,
    withChecksum: boolean = false,
    signal?: AbortSignal
  ): Promise<FileInfo[]> {
    return this.getImpl(nodeUri).getFileInfo(file, nodeUri, withChecksum, signal)
  }

  public async getComputeEnvironments(
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<ComputeEnvironment[]> {
    return this.getImpl(nodeUri).getComputeEnvironments(nodeUri, signal)
  }

  /**
   * Searches for compute providers that can satisfy a typed resource request — a caller never
   * builds a lookup string, computes a bucket, or sees a content id; it passes ordinary typed
   * values in and gets typed providers back.
   *
   * `node` selects the transport the same way every other method on this class does. Provider
   * discovery here is a DHT lookup, so it must identify the P2P network — a peer id, a
   * multiaddr, or a {@link NodeP2P} — rather than a plain HTTP provider URL; there is no HTTP
   * equivalent for it (yet).
   *
   * A multi-dimension request (e.g. `cpu` *and* `ram`) is handled as an intersection of one
   * lookup per dimension, never as a single wider lookup string. Because bucketing rounds down
   * on both the announcing and the querying side, a bucket match is a prefilter, not proof of
   * anything: a request for `cpu: 9` buckets to `8` and matches a provider whose real maximum
   * is exactly `8`. Every candidate surviving the intersection is therefore verified here
   * against its real compute environments before it is returned; `models` — a per-resource
   * qualifier such as a GPU name — is applied only at that step, never as part of a lookup
   * string, because nothing that discriminates within a resource is ever hashed.
   *
   * Never throws for "nothing found". A fleet that has not heard of a requested resource (or,
   * dimension by dimension, any resource) simply yields no providers for it, and `dimensions`
   * says exactly which requested resource that was — a caller is never left staring at a
   * silently empty result with no way to tell which part of the request came up short.
   */
  public async findComputeProviders(
    node: OceanNode,
    request: FindComputeProvidersRequest
  ): Promise<FindComputeProvidersResult> {
    if (!isP2pUri(node)) {
      throw new Error(
        'findComputeProviders: "node" must identify the P2P network (a peer id, a ' +
          'multiaddr, or a NodeP2P) — compute-provider discovery is a DHT lookup with no ' +
          'HTTP equivalent.'
      )
    }
    if (!Array.isArray(request.resources) || request.resources.length === 0) {
      throw new Error(
        'findComputeProviders: "request.resources" must have at least one entry'
      )
    }

    const { free, resources, models, signal } = request
    const dimensions: ComputeSearchDimensionResult[] = []
    // Last-seen multiaddrs per provider id, so verification below can dial a candidate
    // without a second DHT walk just to re-discover how to reach it.
    const recordsById = new Map<string, P2pProviderRecord>()
    let intersection: Set<string> | null = null

    // Every dimension is looked up in full even once the running intersection is already
    // empty. Stopping early would silence the one thing this breakdown exists to show: which
    // dimension(s), specifically, had nothing.
    for (const { resource, value } of resources) {
      const bucket = c2dBucketFor(resource, value)
      const content = c2dCapabilityContent({ free, resource, value: bucket })
      const records = await this.p2pProvider.getProvidersForString(content, signal)
      for (const record of records) recordsById.set(record.id, record)

      const partialRecord = records.find((record) => record.partial)
      dimensions.push({
        resource,
        value,
        bucket,
        providerIds: records.map((record) => record.id),
        ...(partialRecord ? { partial: true as const, error: partialRecord.error } : {})
      })

      const ids = new Set(records.map((record) => record.id))
      intersection =
        intersection === null
          ? ids
          : new Set([...intersection].filter((id) => ids.has(id)))
    }

    const providers: ComputeProviderMatch[] = []
    for (const id of intersection ?? []) {
      if (signal?.aborted) break
      const record = recordsById.get(id)
      if (!record) continue
      const candidateNode: NodeP2P = {
        nodeId: record.id,
        multiaddress: record.multiaddrs
      }

      let environments: ComputeEnvironment[]
      try {
        environments = await this.getComputeEnvironments(candidateNode, signal)
      } catch (err: any) {
        // A bucket match that cannot be verified is not a match. It is dropped rather than
        // reported, and the reason is logged rather than swallowed.
        LoggerInstance.debug(
          `[findComputeProviders] could not verify candidate ${id}: ${err?.message ?? err}`
        )
        continue
      }

      // A candidate matches only when a *single* environment satisfies every requested
      // resource dimension — not when the dimensions are spread across several
      // environments. So each environment is checked against the whole request, and the
      // candidate is pushed as soon as one environment clears all of them.
      const satisfiesAll = environments.some((env) =>
        resources.every(({ resource, value }) =>
          computeEnvironmentSatisfies(env, free, resource, value, models?.[resource])
        )
      )
      if (satisfiesAll) providers.push({ node: candidateNode, environments })
    }

    return { providers, dimensions }
  }

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
    return this.getImpl(nodeUri).initialize(
      did,
      serviceId,
      fileIndex,
      consumerAddress,
      nodeUri,
      signal,
      userCustomParameters,
      computeEnv,
      validUntil
    )
  }

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
    return this.getImpl(nodeUri).initializeCompute(
      assets,
      algorithm,
      computeEnv,
      token,
      validUntil,
      nodeUri,
      consumerAddress,
      resources,
      chainId,
      policyServer,
      signal,
      queueMaxWaitTime,
      dockerRegistryAuthData,
      output
    )
  }

  /**
   * @param signal Cancels the operation. On the P2P transport it covers the whole
   *   transfer — the nonce round-trip, the dial and every frame of the body — so a
   *   download already running stops when it fires. The HTTP transport returns a URL for
   *   the caller to fetch and so performs no transfer here, but building that URL from a
   *   `Signer` does fetch a nonce from the node, and the signal covers that request.
   *   Optional; omitting it keeps the previous behaviour.
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
  ): Promise<string | DownloadResponse> {
    return this.getImpl(nodeUri).getDownloadUrl(
      did,
      serviceId,
      fileIndex,
      transferTxId,
      nodeUri,
      signerOrAuthToken,
      policyServer,
      userCustomParameters,
      signal
    )
  }

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
    const jobs = await this.getImpl(nodeUri).computeStart(
      nodeUri,
      signerOrAuthToken,
      computeEnv,
      datasets,
      algorithm,
      maxJobDuration,
      token,
      resources,
      chainId,
      metadata,
      additionalViewers,
      output,
      policyServer,
      signal,
      queueMaxWaitTime,
      dockerRegistryAuth,
      outputBucketId
    )
    const job = Array.isArray(jobs) ? jobs[0] : jobs
    this.notifyIncentiveBackendJobStarted(nodeUri, computeEnv, job).catch(() => {})
    return jobs
  }

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
    const jobs = await this.getImpl(nodeUri).freeComputeStart(
      nodeUri,
      signerOrAuthToken,
      computeEnv,
      datasets,
      algorithm,
      resources,
      metadata,
      additionalViewers,
      output,
      policyServer,
      signal,
      queueMaxWaitTime,
      dockerRegistryAuth,
      outputBucketId
    )
    const job = Array.isArray(jobs) ? jobs[0] : jobs
    this.notifyIncentiveBackendJobStarted(nodeUri, computeEnv, job).catch(() => {})
    return jobs
  }

  /**
   * Resolves the node's peerId for the given nodeUri via the node STATUS command,
   * whose `id` field is the peerId.
   * @param {OceanNode} nodeUri The provider URI.
   * @return {Promise<string | undefined>} The peerId, or undefined if unresolved.
   */
  private async resolveNodePeerId(nodeUri: OceanNode): Promise<string | undefined> {
    try {
      const status = await this.getNodeStatus(nodeUri)
      return status?.id
    } catch {
      return undefined
    }
  }

  /**
   * @param {OceanNode} nodeUri The provider URI the job runs on.
   * @param {string} environment The compute environment the job runs in.
   * @param {ComputeJob} job The compute job just started.
   */
  private async notifyIncentiveBackendJobStarted(
    nodeUri: OceanNode,
    environment: string,
    job: ComputeJob
  ): Promise<void> {
    try {
      const incentiveBackendUrl = process.env.INCENTIVE_BACKEND_URL
      if (!incentiveBackendUrl || !job?.jobId) return

      const baseUrl = incentiveBackendUrl.replace(/\/+$/, '')
      const peerId = await this.resolveNodePeerId(nodeUri)

      const dashIndex = job.jobId.indexOf('-')
      const bareJobId = dashIndex > 0 ? job.jobId.slice(dashIndex + 1) : job.jobId

      await fetch(`${baseUrl}/jobs/${encodeURIComponent(bareJobId)}/started`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId,
          owner: job.owner,
          status: job.status,
          statusText: job.statusText,
          dateCreated: job.dateCreated,
          environment,
          maxJobDuration: (job as NodeComputeJob).maxJobDuration,
          jobName: job.metadata?.name
        })
      })
    } catch (e) {
      LoggerInstance.error('Failed to notify incentive backend about started job:')
      LoggerInstance.error(e)
    }
  }

  /**
   * @param {OceanNode} nodeUri The provider URI the service runs on.
   * @param {ServiceJob} service The service job just started.
   */
  private async notifyIncentiveBackendServiceStarted(
    nodeUri: OceanNode,
    service: ServiceJob
  ): Promise<void> {
    try {
      const incentiveBackendUrl = process.env.INCENTIVE_BACKEND_URL
      if (!incentiveBackendUrl || !service?.serviceId) return

      const baseUrl = incentiveBackendUrl.replace(/\/+$/, '')
      const peerId = await this.resolveNodePeerId(nodeUri)

      await fetch(
        `${baseUrl}/services/${encodeURIComponent(service.serviceId)}/started`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            peerId,
            clusterHash: service.clusterHash,
            owner: service.owner,
            status: service.status,
            statusText: service.statusText,
            environment: service.environment,
            image: service.image,
            tag: service.tag,
            dockerCmd: service.dockerCmd,
            exposedPorts: service.exposedPorts,
            endpoints: service.endpoints,
            resources: service.resources,
            duration: service.duration,
            expiresAt: service.expiresAt,
            payment: service.payment,
            dateCreated: service.dateCreated
          })
        }
      )
    } catch (e) {
      LoggerInstance.error('Failed to notify incentive backend about started service:')
      LoggerInstance.error(e)
    }
  }

  // Patches the incentive backend's record with the restarted service's new launch command
  // (the backend derives the model from it), so a model edit isn't stuck on the first-start model.
  private async notifyIncentiveBackendServiceRestarted(
    serviceId: string,
    params: ServiceRestartParams
  ): Promise<void> {
    try {
      const incentiveBackendUrl = process.env.INCENTIVE_BACKEND_URL
      if (!incentiveBackendUrl || !serviceId) return

      const baseUrl = incentiveBackendUrl.replace(/\/+$/, '')

      const response = await fetch(
        `${baseUrl}/services/${encodeURIComponent(serviceId)}/restarted`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: params.image,
            tag: params.tag,
            dockerCmd: params.dockerCmd
          })
        }
      )
      if (!response.ok) throw new Error(`incentive backend responded ${response.status}`)
    } catch (e) {
      LoggerInstance.error('Failed to notify incentive backend about restarted service:')
      LoggerInstance.error(e)
    }
  }

  public async computeStreamableLogs(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    signal?: AbortSignal
  ): Promise<any> {
    return this.getImpl(nodeUri).computeStreamableLogs(
      nodeUri,
      signerOrAuthToken,
      jobId,
      signal
    )
  }

  public async computeStop(
    jobId: string,
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    agreementId?: string,
    signal?: AbortSignal
  ): Promise<ComputeJob | ComputeJob[]> {
    return this.getImpl(nodeUri).computeStop(
      jobId,
      nodeUri,
      signerOrAuthToken,
      agreementId,
      signal
    )
  }

  /**
   * Get compute status for a specific jobId/documentId/owner.
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
    return this.getImpl(nodeUri).computeStatus(
      nodeUri,
      signerOrAuthToken,
      jobId,
      agreementId,
      signal,
      includeMetrics
    )
  }

  /**
   * A fetchable URL for a compute result.
   *
   * HTTP-transport only. A P2P peer answers with the result bytes themselves and the
   * protocol carries no location for them, so this rejects for a P2P target — use
   * {@link getComputeResult} there, which returns the bytes as an async iterable.
   *
   * @param signal Cancels the nonce round-trip the URL is built from. Only reaches the
   *   network when `signerOrAuthToken` is a `Signer`; a token or a pre-made signature
   *   needs no nonce and this becomes pure string assembly. Optional; omitting it keeps
   *   the previous behaviour.
   */
  public async getComputeResultUrl(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    index: number,
    signal?: AbortSignal
  ): Promise<string> {
    return this.getImpl(nodeUri).getComputeResultUrl(
      nodeUri,
      signerOrAuthToken,
      jobId,
      index,
      signal
    )
  }

  /**
   * @param signal Cancels the operation. On the P2P transport it covers the whole
   *   transfer — the nonce round-trip, the dial and every frame the returned generator
   *   reads — so a result already being transferred stops when it fires. The HTTP
   *   transport covers the same ground: the nonce round-trip, the request and the
   *   response body. On both, aborting mid-transfer makes the iterable throw rather than
   *   end quietly. Optional; omitting it keeps the previous behaviour.
   */
  public async getComputeResult(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    index: number,
    offset: number = 0,
    signal?: AbortSignal
  ): Promise<ComputeResultStream> {
    return this.getImpl(nodeUri).getComputeResult(
      nodeUri,
      signerOrAuthToken,
      jobId,
      index,
      offset,
      signal
    )
  }

  public async generateAuthToken(
    consumer: Signer,
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<string> {
    return this.getImpl(nodeUri).generateAuthToken(consumer, nodeUri, signal)
  }

  public async generateSignedAuthToken(
    address: string,
    signature: string,
    nonce: string,
    nodeUri: OceanNode,
    validUntil?: number,
    signal?: AbortSignal
  ): Promise<string> {
    return this.p2pProvider.generateSignedAuthToken(
      address,
      signature,
      nonce,
      nodeUri,
      validUntil,
      signal
    )
  }

  public async invalidateAuthToken(
    consumer: Signer,
    token: string,
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<{ success: boolean }> {
    return this.getImpl(nodeUri).invalidateAuthToken(consumer, token, nodeUri, signal)
  }

  public async resolveDdo(
    nodeUri: OceanNode,
    did: string,
    signal?: AbortSignal
  ): Promise<any> {
    return this.getImpl(nodeUri).resolveDdo(nodeUri, did, signal)
  }

  public async validateDdo(
    nodeUri: OceanNode,
    ddo: DDO,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    signal?: AbortSignal
  ): Promise<ValidateMetadata> {
    return this.getImpl(nodeUri).validateDdo(nodeUri, ddo, signerOrAuthToken, signal)
  }

  public async isValidProvider(url: OceanNode, signal?: AbortSignal): Promise<boolean> {
    return this.getImpl(url).isValidProvider(url, signal)
  }

  public async PolicyServerPassthrough(
    nodeUri: OceanNode,
    request: PolicyServerPassthroughCommand,
    signal?: AbortSignal
  ): Promise<any> {
    return this.getImpl(nodeUri).PolicyServerPassthrough(nodeUri, request, signal)
  }

  public async initializePSVerification(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    request: PolicyServerInitializeCommand,
    signal?: AbortSignal
  ): Promise<any> {
    return this.getImpl(nodeUri).initializePSVerification(
      nodeUri,
      signerOrAuthToken,
      request,
      signal
    )
  }

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
    return this.getImpl(nodeUri).downloadNodeLogs(
      nodeUri,
      signerOrAuthToken,
      startTime,
      endTime,
      maxLogs,
      moduleName,
      level,
      page,
      signal
    )
  }

  public async getNodeStatus(
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<NodeStatus> {
    return this.getImpl(nodeUri).getNodeStatus(nodeUri, signal)
  }

  public async getNodeJobs(
    nodeUri: OceanNode,
    fromTimestamp?: number,
    signal?: AbortSignal
  ): Promise<NodeComputeJob[]> {
    return this.getImpl(nodeUri).getNodeJobs(nodeUri, fromTimestamp, signal)
  }

  public async setupP2P(config: P2PConfig): Promise<void> {
    return this.p2pProvider.setupP2P(config)
  }

  public getLibp2pNode() {
    return this.p2pProvider.getLibp2pNode()
  }

  /**
   * Stop the shared libp2p node: close connections and release the node, so nothing
   * keeps the process alive. Long-lived Node.js processes should call this on
   * shutdown. There is no relay reservation to release — ocean.js listens on nothing
   * and only ever *dials* through a relay. Safe to call when P2P was never started,
   * and safe to call twice.
   */
  public async stopP2P(): Promise<void> {
    return this.p2pProvider.stopP2P()
  }

  /** Alias for {@link stopP2P}. */
  public async dispose(): Promise<void> {
    return this.p2pProvider.dispose()
  }

  /**
   * Every peer this client knows about, with the state of the connection to it.
   *
   * `peerId` and `multiaddrs` are unchanged; the connection fields are added. They are
   * what tells a known peer apart from a reachable one — a peer can sit in the peer store
   * with three addresses and be unreachable, or be connected only over a circuit relay
   * that will cut the connection off after a byte budget.
   */
  public async getDiscoveredNodes(): Promise<
    Awaited<ReturnType<P2pProvider['getDiscoveredNodes']>>
  > {
    return this.p2pProvider.getDiscoveredNodes()
  }

  /**
   * Whether P2P can do anything, as opposed to whether it is switched on: routing-table
   * size, DHT mode, the peer store lifetimes the running node applies, and the resolution
   * lanes.
   *
   * The routing table is the one to read first. A DHT lookup against an empty table finds
   * nothing however many connections are open, because a connection to a peer that does
   * not speak the DHT protocol is not a place a walk can start.
   */
  public getP2pDiagnostics(): ReturnType<P2pProvider['getP2pDiagnostics']> {
    return this.p2pProvider.getP2pDiagnostics()
  }

  public async getMultiaddrFromPeerId(peerId: string): Promise<string> {
    return this.p2pProvider.getMultiaddrFromPeerId(peerId)
  }

  /**
   * Which tier answered each peer-address resolution — an open connection, the peer
   * store, or a DHT walk — plus cache hits, misses and invalidations.
   *
   * Read this to see whether the peer store is doing its job: an address now lives
   * there as long as the DHT provider record that names it, and the visible effect of
   * that should be resolutions moving out of the `dht` lane and into `peer-store`.
   */
  public getPeerResolutionStats(): Record<string, number> {
    return this.p2pProvider.getPeerResolutionStats()
  }

  /**
   * Forgets the cached addresses for a peer, so the next call to it resolves afresh.
   * Failed dials already do this; call it directly when something outside the library
   * knows a node has moved.
   */
  public invalidatePeerResolution(peerId: string): void {
    this.p2pProvider.invalidatePeerResolution(peerId)
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
    return this.getImpl(nodeUri).createPersistentStorageBucket(
      nodeUri,
      signerOrAuthToken,
      payload,
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
    return this.getImpl(nodeUri).updatePersistentStorageBucket(
      nodeUri,
      signerOrAuthToken,
      bucketId,
      label,
      signal
    )
  }

  public async getPersistentStorageBuckets(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    owner: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageBucket[]> {
    return this.getImpl(nodeUri).getPersistentStorageBuckets(
      nodeUri,
      signerOrAuthToken,
      owner,
      signal
    )
  }

  public async listPersistentStorageFiles(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageFileEntry[]> {
    return this.getImpl(nodeUri).listPersistentStorageFiles(
      nodeUri,
      signerOrAuthToken,
      bucketId,
      signal
    )
  }

  public async getPersistentStorageFileObject(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    fileName: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageObject> {
    return this.getImpl(nodeUri).getPersistentStorageFileObject(
      nodeUri,
      signerOrAuthToken,
      bucketId,
      fileName,
      signal
    )
  }

  public async uploadPersistentStorageFile(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    fileName: string,
    content: P2PRequestBodyStream,
    signal?: AbortSignal
  ): Promise<PersistentStorageFileEntry> {
    return this.getImpl(nodeUri).uploadPersistentStorageFile(
      nodeUri,
      signerOrAuthToken,
      bucketId,
      fileName,
      content,
      signal
    )
  }

  public async deletePersistentStorageFile(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    bucketId: string,
    fileName: string,
    signal?: AbortSignal
  ): Promise<PersistentStorageDeleteFileResponse> {
    return this.getImpl(nodeUri).deletePersistentStorageFile(
      nodeUri,
      signerOrAuthToken,
      bucketId,
      fileName,
      signal
    )
  }

  // ── Service on Demand ────────────────────────────────────────────────

  public async getServiceTemplates(
    nodeUri: OceanNode,
    chainId?: number,
    signal?: AbortSignal
  ): Promise<ServiceTemplatePublic[]> {
    return this.getImpl(nodeUri).getServiceTemplates(nodeUri, chainId, signal)
  }

  public async serviceStart(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    params: ServiceStartParams,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    const services = await this.getImpl(nodeUri).serviceStart(
      nodeUri,
      signerOrAuthToken,
      params,
      signal
    )
    const startedServices = Array.isArray(services) ? services : [services]
    startedServices.forEach((service) => {
      this.notifyIncentiveBackendServiceStarted(nodeUri, service).catch(() => {})
    })
    return services
  }

  public async serviceStop(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    return this.getImpl(nodeUri).serviceStop(
      nodeUri,
      signerOrAuthToken,
      serviceId,
      signal
    )
  }

  public async serviceExtend(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    additionalDuration: number,
    payment: ServicePayment,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    return this.getImpl(nodeUri).serviceExtend(
      nodeUri,
      signerOrAuthToken,
      serviceId,
      additionalDuration,
      payment,
      signal
    )
  }

  public async serviceRestart(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    params?: ServiceRestartParams,
    signal?: AbortSignal
  ): Promise<ServiceJob[]> {
    const services = await this.getImpl(nodeUri).serviceRestart(
      nodeUri,
      signerOrAuthToken,
      serviceId,
      params,
      signal
    )
    // A restart can swap the model (dockerCmd) or the image/tag; patch the record when it does.
    if (
      params?.image !== undefined ||
      params?.tag !== undefined ||
      params?.dockerCmd !== undefined
    ) {
      this.notifyIncentiveBackendServiceRestarted(serviceId, params).catch(() => {})
    }
    return services
  }

  /**
   * Returns the caller's service jobs (userData stripped). Filter by `serviceId`,
   * or omit it to list all of the caller's services. Requires a signature.
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
    return this.getImpl(nodeUri).getServiceStatus(
      nodeUri,
      signerOrAuthToken,
      serviceId,
      signal,
      includeMetrics
    )
  }

  public async getServices(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    filters?: ServiceListFilters,
    signal?: AbortSignal
  ): Promise<ServiceJobListed[]> {
    return this.getImpl(nodeUri).getServices(nodeUri, signerOrAuthToken, filters, signal)
  }

  public async serviceGetStreamableLogs(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    serviceId: string,
    since?: string,
    signal?: AbortSignal
  ): Promise<any> {
    return this.getImpl(nodeUri).serviceGetStreamableLogs(
      nodeUri,
      signerOrAuthToken,
      serviceId,
      since,
      signal
    )
  }

  public async fetchConfig(
    nodeUri: OceanNode,
    payload: Record<string, any>
  ): Promise<any> {
    return this.p2pProvider.fetchConfig(nodeUri, payload)
  }

  public async pushConfig(
    nodeUri: OceanNode,
    payload: Record<string, any>
  ): Promise<any> {
    return this.p2pProvider.pushConfig(nodeUri, payload)
  }
}
