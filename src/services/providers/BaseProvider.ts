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
  NodeLogEntry,
  PersistentStorageAccessList,
  PersistentStorageBucket,
  PersistentStorageCreateBucketRequest,
  PersistentStorageDeleteFileResponse,
  PersistentStorageFileEntry,
  PersistentStorageObject,
  OceanNode,
  NodeP2P,
  CompleteSignature,
  SignerOrAuthTokenOrSignature
} from '../../@types/index.js'
import { type DDO, type ValidateMetadata } from '@oceanprotocol/ddo-js'
import { decodeJwt } from '../../utils/Jwt.js'
import { signRequest } from '../../utils/SignatureUtils.js'
import { HttpProvider } from './HttpProvider.js'
import { P2pProvider, type P2PConfig, type P2PRequestBodyStream } from './P2pProvider.js'

export { OCEAN_P2P_PROTOCOL, type P2PConfig } from './P2pProvider.js'

export async function getConsumerAddress(
  signerOrAuthToken: SignerOrAuthTokenOrSignature
): Promise<string> {
  if (typeof signerOrAuthToken === 'string') return decodeJwt(signerOrAuthToken).address
  if (isAgentSignature(signerOrAuthToken)) return signerOrAuthToken.consumerAddress
  return signerOrAuthToken.getAddress()
}

export async function getSignature(
  signerOrAuthToken: SignerOrAuthTokenOrSignature,
  nonce: string,
  command: string
): Promise<string | null> {
  if (typeof signerOrAuthToken === 'string') {
    // it's either a signature already (0x..) or a jwt token
    if (signerOrAuthToken.startsWith('0x')) {
      return signerOrAuthToken
    } else return null
  }
  if (isAgentSignature(signerOrAuthToken)) {
    return signerOrAuthToken.signature
  }
  const message = String(
    String(await signerOrAuthToken.getAddress()) + String(nonce) + String(command)
  )
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

export class BaseProvider {
  private httpProvider = new HttpProvider()
  private p2pProvider = new P2pProvider()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getImpl(node: OceanNode): any {
    return isP2pUri(node) ? this.p2pProvider : this.httpProvider
  }

  public getP2PProvider() {
    return this.p2pProvider
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
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
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

  public async computeStatus(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
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
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
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
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
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
    request: PolicyServerInitializeCommand,
    signal?: AbortSignal
  ): Promise<any> {
    return this.getImpl(nodeUri).initializePSVerification(nodeUri, request, signal)
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

  public async getDiscoveredNodes(): Promise<
    Array<{ peerId: string; multiaddrs: string[] }>
  > {
    return this.p2pProvider.getDiscoveredNodes()
  }

  public async getMultiaddrFromPeerId(peerId: string): Promise<string> {
    return this.p2pProvider.getMultiaddrFromPeerId(peerId)
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
