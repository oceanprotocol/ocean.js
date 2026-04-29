import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { Signer } from 'ethers'
import {
  StorageObject,
  FileInfo,
  ComputeJob,
  ComputeOutput,
  ComputeAlgorithm,
  ComputeAsset,
  ComputeEnvironment,
  ComputeResultStream,
  ProviderInitialize,
  ProviderComputeInitializeResults,
  ServiceEndpoint,
  UserCustomParameters,
  ComputeResourceRequest,
  ComputeJobMetadata,
  PolicyServerInitializeCommand,
  PolicyServerPassthroughCommand,
  dockerRegistryAuth,
  DownloadResponse,
  NodeStatus,
  NodeComputeJob,
  NodeLogsParams,
  NodeLogEntry,
  PersistentStorageAccessList,
  PersistentStorageBucket,
  PersistentStorageCreateBucketRequest,
  PersistentStorageDeleteFileResponse,
  PersistentStorageFileEntry,
  PersistentStorageObject,
  OceanNode,
  NodeP2P
} from '../../@types/index.js'
import { type DDO, type ValidateMetadata } from '@oceanprotocol/ddo-js'
import { decodeJwt } from '../../utils/Jwt.js'
import { signRequest } from '../../utils/SignatureUtils.js'
import { HttpProvider } from './HttpProvider.js'
import { P2pProvider, type P2PConfig, type P2PRequestBodyStream } from './P2pProvider.js'

export { OCEAN_P2P_PROTOCOL, type P2PConfig } from './P2pProvider.js'

export async function getConsumerAddress(
  signerOrAuthToken: Signer | string
): Promise<string> {
  return typeof signerOrAuthToken === 'string'
    ? decodeJwt(signerOrAuthToken).address
    : signerOrAuthToken.getAddress()
}

export async function getSignature(
  signerOrAuthToken: Signer | string,
  nonce: string,
  command: string
): Promise<string | null> {
  if (typeof signerOrAuthToken === 'string') {
    // it's either a signature already (0x..) or a jwt token
    if (signerOrAuthToken.startsWith('0x')) {
      return signerOrAuthToken
    } else return null
  }
  const message = String(
    String(await signerOrAuthToken.getAddress()) + String(nonce) + String(command)
  )
  return signRequest(signerOrAuthToken, message)
}

export function getAuthorization(signerOrAuthToken: Signer | string): string | undefined {
  return typeof signerOrAuthToken === 'string' ? signerOrAuthToken : undefined
}

export function isP2pUri(node: OceanNode): boolean {
  if (!node) return false
  if (typeof node === 'string') {
    // Accept either peerId or multiaddr string as P2P
    try {
      multiaddr(node)
      return true
    } catch {}
    try {
      peerIdFromString(node)
      return true
    } catch {
      return false
    }
  }

  // NodeP2P -> p2p
  if (typeof node === 'object' && ('nodeId' in node || `multiaddress` in node)) {
    const nodeP2p = node as NodeP2P
    if (Array.isArray(nodeP2p.multiaddress) && nodeP2p.multiaddress.length > 0)
      return true
    if (nodeP2p.nodeId) {
      try {
        multiaddr(nodeP2p.nodeId)
        return true
      } catch {}
      try {
        peerIdFromString(nodeP2p.nodeId)
        return true
      } catch {}
      return false
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

export class BaseProvider {
  private httpProvider = new HttpProvider()
  private p2pProvider = new P2pProvider()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getImpl(node: OceanNode): any {
    return isP2pUri(node) ? this.p2pProvider : this.httpProvider
  }

  public async getNonce(
    nodeUri: OceanNode,
    consumerAddress: string,
    signal?: AbortSignal,
    providerEndpoints?: any,
    serviceEndpoints?: ServiceEndpoint[]
  ): Promise<number> {
    return this.getImpl(nodeUri).getNonce(
      nodeUri,
      consumerAddress,
      signal,
      providerEndpoints,
      serviceEndpoints
    )
  }

  public async encrypt(
    data: any,
    chainId: number,
    nodeUri: OceanNode,
    signerOrAuthToken: Signer | string,
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

  public async getDownloadUrl(
    did: string,
    serviceId: string,
    fileIndex: number,
    transferTxId: string,
    nodeUri: OceanNode,
    signerOrAuthToken: Signer | string,
    policyServer?: any,
    userCustomParameters?: UserCustomParameters
  ): Promise<string | DownloadResponse> {
    return this.getImpl(nodeUri).getDownloadUrl(
      did,
      serviceId,
      fileIndex,
      transferTxId,
      nodeUri,
      signerOrAuthToken,
      policyServer,
      userCustomParameters
    )
  }

  public async computeStart(
    nodeUri: OceanNode,
    signerOrAuthToken: Signer | string,
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
    dockerRegistryAuth?: dockerRegistryAuth
  ): Promise<ComputeJob | ComputeJob[]> {
    return this.getImpl(nodeUri).computeStart(
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
      dockerRegistryAuth
    )
  }

  public async freeComputeStart(
    nodeUri: OceanNode,
    signerOrAuthToken: Signer | string,
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
    dockerRegistryAuth?: dockerRegistryAuth
  ): Promise<ComputeJob | ComputeJob[]> {
    return this.getImpl(nodeUri).freeComputeStart(
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
      dockerRegistryAuth
    )
  }

  public async computeStreamableLogs(
    nodeUri: OceanNode,
    signerOrAuthToken: Signer | string,
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
    signerOrAuthToken: Signer | string,
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

  public async computeStatus(
    nodeUri: OceanNode,
    signerOrAuthToken: Signer | string,
    jobId?: string,
    agreementId?: string,
    signal?: AbortSignal
  ): Promise<ComputeJob | ComputeJob[]> {
    return this.getImpl(nodeUri).computeStatus(
      nodeUri,
      signerOrAuthToken,
      jobId,
      agreementId,
      signal
    )
  }

  public async getComputeResultUrl(
    nodeUri: OceanNode,
    signerOrAuthToken: Signer | string,
    jobId: string,
    index: number
  ): Promise<string> {
    return this.getImpl(nodeUri).getComputeResultUrl(
      nodeUri,
      signerOrAuthToken,
      jobId,
      index
    )
  }

  public async getComputeResult(
    nodeUri: OceanNode,
    signerOrAuthToken: Signer | string,
    jobId: string,
    index: number,
    offset: number = 0
  ): Promise<ComputeResultStream> {
    return this.getImpl(nodeUri).getComputeResult(
      nodeUri,
      signerOrAuthToken,
      jobId,
      index,
      offset
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
    signal?: AbortSignal
  ): Promise<string> {
    return this.p2pProvider.generateSignedAuthToken(
      address,
      signature,
      nonce,
      nodeUri,
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
    signer: Signer,
    signal?: AbortSignal
  ): Promise<ValidateMetadata> {
    return this.getImpl(nodeUri).validateDdo(nodeUri, ddo, signer, signal)
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
    request: PolicyServerInitializeCommand,
    signal?: AbortSignal
  ): Promise<any> {
    return this.getImpl(nodeUri).initializePSVerification(nodeUri, request, signal)
  }

  public async downloadNodeLogs(
    nodeUri: OceanNode,
    signer: Signer,
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
      signer,
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

  public async getDiscoveredNodes(): Promise<
    Array<{ peerId: string; multiaddrs: string[] }>
  > {
    return this.p2pProvider.getDiscoveredNodes()
  }

  public async getMultiaddrFromPeerId(peerId: string): Promise<string> {
    return this.p2pProvider.getMultiaddrFromPeerId(peerId)
  }

  /**
   * Fetch node logs via P2P with a pre-signed payload.
   * For auto-signed log fetching (HTTP or P2P), use downloadNodeLogs().
   */
  public async fetchNodeLogs(
    nodeUri: OceanNode,
    address: string,
    signature: string,
    nonce: string,
    logParams?: NodeLogsParams
  ): Promise<NodeLogEntry[]> {
    return this.p2pProvider.fetchNodeLogs(nodeUri, address, signature, nonce, logParams)
  }

  public async createPersistentStorageBucket(
    nodeUri: OceanNode,
    signerOrAuthToken: Signer | string,
    payload: PersistentStorageCreateBucketRequest,
    signal?: AbortSignal
  ): Promise<{
    bucketId: string
    owner: string
    accessList: PersistentStorageAccessList[]
  }> {
    return this.getImpl(nodeUri).createPersistentStorageBucket(
      nodeUri,
      signerOrAuthToken,
      payload,
      signal
    )
  }

  public async getPersistentStorageBuckets(
    nodeUri: OceanNode,
    signerOrAuthToken: Signer | string,
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
    signerOrAuthToken: Signer | string,
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
    signerOrAuthToken: Signer | string,
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
    signerOrAuthToken: Signer | string,
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
    signerOrAuthToken: Signer | string,
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
