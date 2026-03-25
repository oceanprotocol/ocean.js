import { Signer } from 'ethers'
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
  ServiceEndpoint,
  UserCustomParameters,
  ComputeResourceRequest,
  ComputeJobMetadata,
  PolicyServerInitializeCommand,
  PolicyServerPassthroughCommand,
  dockerRegistryAuth,
  DownloadResponse
} from '../../@types/index.js'
import { type DDO, type ValidateMetadata } from '@oceanprotocol/ddo-js'
import { decodeJwt } from '../../utils/Jwt.js'
import { signRequest } from '../../utils/SignatureUtils.js'
import { HttpProvider } from './HttpProvider.js'
import { P2pProvider, type P2PConfig } from './P2pProvider.js'

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
  if (typeof signerOrAuthToken === 'string') return null
  const message = String(
    String(await signerOrAuthToken.getAddress()) + String(nonce) + String(command)
  )
  return signRequest(signerOrAuthToken, message)
}

export function getAuthorization(signerOrAuthToken: Signer | string): string | undefined {
  return typeof signerOrAuthToken === 'string' ? signerOrAuthToken : undefined
}

export function isP2pUri(nodeUri: string): boolean {
  if (!nodeUri) return false
  if (nodeUri.startsWith('/')) return true
  return (
    nodeUri.startsWith('12D3') || nodeUri.startsWith('16Uiu') || nodeUri.startsWith('Qm')
  )
}

export class BaseProvider {
  private httpProvider = new HttpProvider()
  private p2pProvider = new P2pProvider()

  protected getImpl(nodeUri: string): HttpProvider | P2pProvider {
    return isP2pUri(nodeUri) ? this.p2pProvider : this.httpProvider
  }

  async getEndpoints(nodeUri: string, authorization?: string): Promise<any> {
    return this.getImpl(nodeUri).getEndpoints(nodeUri, authorization)
  }

  public async getComputeStartRoutes(
    nodeUri: string,
    isFreeCompute: boolean = false
  ): Promise<string | null> {
    return this.getImpl(nodeUri).getComputeStartRoutes(nodeUri, isFreeCompute)
  }

  // --- Routed public methods ---

  public async getNonce(
    nodeUri: string,
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
    nodeUri: string,
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
    nodeUri: string,
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
    nodeUri: string,
    withChecksum: boolean = false,
    signal?: AbortSignal
  ): Promise<FileInfo[]> {
    return this.getImpl(nodeUri).getFileInfo(file, nodeUri, withChecksum, signal)
  }

  public async getComputeEnvironments(
    nodeUri: string,
    signal?: AbortSignal
  ): Promise<ComputeEnvironment[]> {
    return this.getImpl(nodeUri).getComputeEnvironments(nodeUri, signal)
  }

  public async initialize(
    did: string,
    serviceId: string,
    fileIndex: number,
    consumerAddress: string,
    nodeUri: string,
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
    nodeUri: string,
    signerOrAuthToken: Signer | string,
    resources: ComputeResourceRequest[],
    chainId: number,
    policyServer?: any,
    signal?: AbortSignal,
    output?: ComputeOutput,
    dockerRegistryAuth?: dockerRegistryAuth
  ): Promise<ProviderComputeInitializeResults> {
    return this.getImpl(nodeUri).initializeCompute(
      assets,
      algorithm,
      computeEnv,
      token,
      validUntil,
      nodeUri,
      signerOrAuthToken,
      resources,
      chainId,
      policyServer,
      signal,
      output,
      dockerRegistryAuth
    )
  }

  public async getDownloadUrl(
    did: string,
    serviceId: string,
    fileIndex: number,
    transferTxId: string,
    nodeUri: string,
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
    nodeUri: string,
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
    nodeUri: string,
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
    nodeUri: string,
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
    nodeUri: string,
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
    nodeUri: string,
    consumerAddress: string,
    jobId?: string,
    agreementId?: string,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    return this.getImpl(nodeUri).computeStatus(
      nodeUri,
      consumerAddress,
      jobId,
      agreementId,
      signal,
      authorization
    )
  }

  public async getComputeResultUrl(
    nodeUri: string,
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

  public async generateAuthToken(
    consumer: Signer,
    nodeUri: string,
    signal?: AbortSignal
  ): Promise<string> {
    return this.getImpl(nodeUri).generateAuthToken(consumer, nodeUri, signal)
  }

  public async invalidateAuthToken(
    consumer: Signer,
    token: string,
    nodeUri: string,
    signal?: AbortSignal
  ): Promise<{ success: boolean }> {
    return this.getImpl(nodeUri).invalidateAuthToken(consumer, token, nodeUri, signal)
  }

  public async resolveDdo(
    nodeUri: string,
    did: string,
    signal?: AbortSignal
  ): Promise<any> {
    return this.getImpl(nodeUri).resolveDdo(nodeUri, did, signal)
  }

  public async validateDdo(
    nodeUri: string,
    ddo: DDO,
    signer: Signer,
    signal?: AbortSignal
  ): Promise<ValidateMetadata> {
    return this.getImpl(nodeUri).validateDdo(nodeUri, ddo, signer, signal)
  }

  public async isValidProvider(url: string, signal?: AbortSignal): Promise<boolean> {
    return this.getImpl(url).isValidProvider(url, signal)
  }

  public async PolicyServerPassthrough(
    nodeUri: string,
    request: PolicyServerPassthroughCommand,
    signal?: AbortSignal
  ): Promise<any> {
    return this.getImpl(nodeUri).PolicyServerPassthrough(nodeUri, request, signal)
  }

  public async initializePSVerification(
    nodeUri: string,
    request: PolicyServerInitializeCommand,
    signal?: AbortSignal
  ): Promise<any> {
    return this.getImpl(nodeUri).initializePSVerification(nodeUri, request, signal)
  }

  public async downloadNodeLogs(
    nodeUri: string,
    signer: Signer,
    startTime: string,
    endTime: string,
    maxLogs?: number,
    moduleName?: string,
    level?: string,
    page?: number,
    signal?: AbortSignal
  ): Promise<any> {
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

  public async setupP2P(config: P2PConfig): Promise<void> {
    return this.p2pProvider.setupP2P(config)
  }

  public getDiscoveredNodes(): Array<{ peerId: string; multiaddrs: string[] }> {
    return this.p2pProvider.getDiscoveredNodes()
  }

  public async connectP2P(nodeUri: string, timeout?: number): Promise<void> {
    return this.p2pProvider.connectP2P(nodeUri, timeout)
  }
}
