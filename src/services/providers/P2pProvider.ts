import { type Libp2p, createLibp2p } from 'libp2p'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import { bootstrap } from '@libp2p/bootstrap'
import { lpStream, UnexpectedEOFError } from '@libp2p/utils'
import type { Connection } from '@libp2p/interface'
import { isMultiaddr, multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { Signer } from 'ethers'
import { LoggerInstance } from '../../utils/Logger.js'
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
import { PROTOCOL_COMMANDS } from '../../@types/Provider.js'
import { type DDO, type ValidateMetadata } from '@oceanprotocol/ddo-js'
import { signRequest } from '../../utils/SignatureUtils.js'
import { decodeJwt } from '../../utils/Jwt.js'

export const OCEAN_P2P_PROTOCOL = '/ocean/nodes/1.0.0'
const MAX_RETRIES = 5
const RETRY_DELAY_MS = 1000
const DIAL_TIMEOUT_MS = 10_000

let libp2pNode: Libp2p | null = null
let lastBootstrapKey: string | null = null

function bufToHex(val: any): string {
  // JSON-string form: '{"type":"Buffer","data":[...]}'
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (parsed?.type === 'Buffer' && Array.isArray(parsed.data)) {
        return Buffer.from(parsed.data).toString()
      }
    } catch {}
    return val
  }
  // Object form: {type:"Buffer", data:[...]}
  if (val?.type === 'Buffer' && Array.isArray(val.data)) {
    return Buffer.from(val.data).toString()
  }
  // Indexed-object form (Uint8Array serialized): {"0":48,"1":120,...}
  if (
    val !== null &&
    typeof val === 'object' &&
    '0' in val &&
    typeof val[0] === 'number'
  ) {
    const bytes = Object.keys(val)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => val[k] as number)
    return Buffer.from(bytes).toString()
  }
  return val
}

function bootstrapKey(addrs: Multiaddr[]): string {
  return addrs
    .map((a) => a.toString())
    .sort()
    .join(',')
}

async function getOrCreateLibp2pNode(multiaddresses: Multiaddr[]): Promise<Libp2p> {
  const key = bootstrapKey(multiaddresses)
  if (libp2pNode && lastBootstrapKey === key) {
    return libp2pNode
  }

  if (libp2pNode) {
    await libp2pNode.stop()
  }

  libp2pNode = await createLibp2p({
    addresses: { listen: [] },
    transports: [webSockets()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    peerDiscovery: [
      bootstrap({
        list: multiaddresses.map((addr) => addr.toString()),
        timeout: 10000
      })
    ],
    connectionManager: {
      maxConnections: 100
    },
    connectionMonitor: {
      abortConnectionOnPingFailure: false
    }
  })
  lastBootstrapKey = key
  await libp2pNode.start()
  return libp2pNode
}

function toUint8Array(chunk: Uint8Array | { subarray(): Uint8Array }): Uint8Array {
  return chunk instanceof Uint8Array ? chunk : chunk.subarray()
}

export class P2pProvider {
  protected async getConsumerAddress(
    signerOrAuthToken: Signer | string
  ): Promise<string> {
    const isAuthToken = typeof signerOrAuthToken === 'string'
    return isAuthToken
      ? decodeJwt(signerOrAuthToken).address
      : await signerOrAuthToken.getAddress()
  }

  protected async getSignature(
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

  protected getAuthorization(signerOrAuthToken: Signer | string): string | undefined {
    return typeof signerOrAuthToken === 'string' ? signerOrAuthToken : undefined
  }

  private async dialAndStream(
    nodeUri: string,
    payload: Record<string, any>,
    signal?: AbortSignal
  ): Promise<{
    lp: ReturnType<typeof lpStream>
    firstBytes: Uint8Array
    connection: Connection
  }> {
    const multiaddressesToDial = [nodeUri]
      .filter((address) => isMultiaddr(multiaddr(address)))
      .map((address) => multiaddr(address))

    if (multiaddressesToDial.length === 0) {
      throw new Error(`Invalid P2P multiaddr: ${nodeUri}`)
    }

    const opSignal = signal ?? AbortSignal.timeout(DIAL_TIMEOUT_MS)
    const node = await getOrCreateLibp2pNode(multiaddressesToDial)
    const connection = await node.dial(multiaddressesToDial, { signal: opSignal })
    const stream = await connection.newStream(OCEAN_P2P_PROTOCOL, { signal: opSignal })
    const lp = lpStream(stream)

    await lp.write(uint8ArrayFromString(JSON.stringify(payload)), { signal: opSignal })
    await stream.close()

    const firstChunk = await lp.read({ signal: opSignal })
    const firstBytes = toUint8Array(firstChunk)

    return { lp, firstBytes, connection }
  }

  private async sendP2pCommand(
    nodeUri: string,
    command: string,
    body: Record<string, any>,
    signerOrAuthToken?: Signer | string | null,
    signal?: AbortSignal,
    retrialNumber: number = 0
  ): Promise<any> {
    let connection: Connection | undefined
    try {
      const payload = {
        command,
        authorization: signerOrAuthToken
          ? this.getAuthorization(signerOrAuthToken)
          : undefined,
        ...body
      }

      const {
        lp,
        firstBytes,
        connection: conn
      } = await this.dialAndStream(nodeUri, payload, signal)
      connection = conn

      if (!firstBytes.length) {
        throw new Error('Gateway node error: no response from peer')
      }

      const statusText = uint8ArrayToString(firstBytes)
      try {
        const status = JSON.parse(statusText)
        if (typeof status?.httpStatus === 'number' && status.httpStatus >= 400) {
          throw new Error(status.error ?? `Gateway node error: ${status.httpStatus}`)
        }
      } catch {}

      if (
        command === PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS ||
        command === PROTOCOL_COMMANDS.COMPUTE_GET_RESULT
      ) {
        const streamableChunks = (async function* () {
          try {
            while (true) {
              const chunk = await lp.read({
                signal: AbortSignal.timeout(DIAL_TIMEOUT_MS)
              })
              yield toUint8Array(chunk)
            }
          } catch (e) {
            if (!(e instanceof UnexpectedEOFError)) {
              throw e
            }
          }
        })()
        return streamableChunks
      }

      const chunks: Uint8Array[] = [firstBytes]
      try {
        while (true) {
          const chunk = await lp.read({ signal: AbortSignal.timeout(DIAL_TIMEOUT_MS) })
          chunks.push(toUint8Array(chunk))
        }
      } catch (e) {
        if (!(e instanceof UnexpectedEOFError)) {
          throw e
        }
      }

      let response: unknown
      for (let i = 0; i < chunks.length; i++) {
        const text = uint8ArrayToString(chunks[i])
        try {
          response = JSON.parse(text)
        } catch {
          response = chunks[i]
        }
      }

      const res = response as Record<string, any> | null
      if (typeof res?.httpStatus === 'number' && res.httpStatus >= 400) {
        throw new Error(
          typeof res.error === 'string' ? res.error : JSON.stringify(res.error)
        )
      }

      const errText = (typeof response === 'string' ? response : res?.error) ?? ''
      if (errText.includes('Cannot connect to peer') && retrialNumber < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        return this.sendP2pCommand(
          nodeUri,
          command,
          body,
          signerOrAuthToken,
          signal,
          retrialNumber + 1
        )
      }

      return response
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      if (
        (msg.includes('closed') || msg.includes('reset')) &&
        retrialNumber < MAX_RETRIES
      ) {
        try {
          await connection?.close()
        } catch {}
        return this.sendP2pCommand(
          nodeUri,
          command,
          body,
          signerOrAuthToken,
          signal,
          retrialNumber + 1
        )
      }
      throw new Error(`P2P command error: ${msg}`)
    }
  }

  /**
   * Returns node status via P2P STATUS command.
   * @param {string} nodeUri - multiaddr of the node
   */
  async getEndpoints(nodeUri: string): Promise<any> {
    try {
      return await this.sendP2pCommand(nodeUri, PROTOCOL_COMMANDS.STATUS, {})
    } catch (e) {
      LoggerInstance.error('P2P getEndpoints (STATUS) failed:', e)
      throw e
    }
  }

  /**
   * Not applicable for P2P — returns an empty array.
   */
  public async getServiceEndpoints(
    _providerEndpoint: string,
    _endpoints: any
  ): Promise<ServiceEndpoint[]> {
    return []
  }

  /**
   * Not applicable for P2P — returns null.
   */
  getEndpointURL(
    _servicesEndpoints: ServiceEndpoint[],
    _serviceName: string
  ): ServiceEndpoint {
    return null
  }

  /**
   * Get current nonce from the node via P2P.
   */
  public async getNonce(
    nodeUri: string,
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
        typeof result === 'number' ? result : result?.nonce ?? result ?? 0
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
    nodeUri: string,
    signerOrAuthToken: Signer | string,
    _policyServer?: any,
    signal?: AbortSignal
  ): Promise<string> {
    const consumerAddress = await this.getConsumerAddress(signerOrAuthToken)
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()
    const signature = await this.getSignature(
      signerOrAuthToken,
      nonce,
      PROTOCOL_COMMANDS.ENCRYPT
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
    return bufToHex(result)
  }

  /**
   * Get file details for a given DID and service ID via P2P.
   */
  public async checkDidFiles(
    did: string,
    serviceId: string,
    nodeUri: string,
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
    nodeUri: string,
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
    nodeUri: string,
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
    nodeUri: string,
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
   * Initializes compute request (V1) via P2P.
   */
  public async initializeComputeV1(
    assets: ComputeAsset[],
    algorithm: ComputeAlgorithm,
    computeEnv: string,
    nodeUri: string,
    accountId: string,
    chainId: number,
    token: string,
    maxJobDuration: number,
    signal?: AbortSignal
  ): Promise<ProviderComputeInitializeResults> {
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_INITIALIZE,
      {
        datasets: assets,
        algorithm,
        environment: computeEnv,
        payment: { chainId, token, maxJobDuration },
        consumerAddress: accountId
      },
      null,
      signal
    )
  }

  /**
   * Initializes compute request via P2P.
   */
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
    dockerRegistryAuth?: dockerRegistryAuth
  ): Promise<ProviderComputeInitializeResults> {
    const consumerAddress = await this.getConsumerAddress(signerOrAuthToken)
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()

    let signature: string | undefined
    const isAuthToken = typeof signerOrAuthToken === 'string'
    if (!isAuthToken) {
      let signatureMessage = consumerAddress
      signatureMessage += assets[0]?.documentId
      signatureMessage += nonce
      signature = await signRequest(signerOrAuthToken as Signer, signatureMessage)
    }

    const body: Record<string, any> = {
      datasets: assets,
      algorithm,
      environment: computeEnv,
      payment: { chainId, token, resources },
      maxJobDuration: validUntil,
      consumerAddress,
      nonce,
      signature
    }
    if (dockerRegistryAuth) body.dockerRegistryAuth = dockerRegistryAuth
    if (policyServer) body.policyServer = policyServer

    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_INITIALIZE,
      body,
      signerOrAuthToken,
      signal
    )
  }

  /**
   * Sends a DOWNLOAD command to the peer via P2P, reads the binary stream
   * directly from the lpStream, and returns a DownloadResponse.
   * The node decrypts the service file and streams raw file data back.
   */
  public async getDownloadUrl(
    did: string,
    serviceId: string,
    fileIndex: number,
    transferTxId: string,
    nodeUri: string,
    signerOrAuthToken: Signer | string,
    policyServer?: any,
    userCustomParameters?: UserCustomParameters
  ): Promise<DownloadResponse> {
    const consumerAddress = await this.getConsumerAddress(signerOrAuthToken)
    const nonce = ((await this.getNonce(nodeUri, consumerAddress)) + 1).toString()
    const signature = await this.getSignature(
      signerOrAuthToken,
      nonce,
      PROTOCOL_COMMANDS.DOWNLOAD
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

    const { lp, firstBytes } = await this.dialAndStream(nodeUri, payload)

    // First lp frame is the status JSON
    const statusText = uint8ArrayToString(firstBytes)
    try {
      const status = JSON.parse(statusText)
      if (typeof status?.httpStatus === 'number' && status.httpStatus >= 400) {
        throw new Error(status.error ?? `P2P download error: ${status.httpStatus}`)
      }
    } catch (e) {
      if (e.message?.startsWith('P2P download error')) throw e
    }

    // Remaining lp frames are raw binary file data
    const chunks: Buffer[] = []
    try {
      while (true) {
        const chunk = await lp.read({ signal: AbortSignal.timeout(DIAL_TIMEOUT_MS) })
        chunks.push(Buffer.from(toUint8Array(chunk)))
      }
    } catch (e) {
      if (!(e instanceof UnexpectedEOFError)) {
        throw e
      }
    }

    const combined = Buffer.concat(chunks)
    return {
      data: combined.buffer.slice(
        combined.byteOffset,
        combined.byteOffset + combined.byteLength
      ) as ArrayBuffer,
      filename: `file${fileIndex}`
    }
  }

  /**
   * Start a paid compute job via P2P.
   */
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
    const consumerAddress = await this.getConsumerAddress(signerOrAuthToken)
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()

    const signature = await this.getSignature(
      signerOrAuthToken,
      nonce,
      PROTOCOL_COMMANDS.COMPUTE_START
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
      payment: { chainId, token, maxJobDuration },
      consumerAddress,
      nonce,
      signature
    }
    if (metadata) body.metadata = metadata
    if (additionalViewers) body.additionalViewers = additionalViewers
    if (output) body.output = output
    if (policyServer) body.policyServer = policyServer
    if (queueMaxWaitTime) body.queueMaxWaitTime = queueMaxWaitTime
    if (dockerRegistryAuth) body.dockerRegistryAuth = dockerRegistryAuth

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
    const consumerAddress = await this.getConsumerAddress(signerOrAuthToken)
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()

    const signature = await this.getSignature(
      signerOrAuthToken,
      nonce,
      PROTOCOL_COMMANDS.FREE_COMPUTE_START
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
    if (output) body.output = output
    if (policyServer) body.policyServer = policyServer
    if (queueMaxWaitTime) body.queueMaxWaitTime = queueMaxWaitTime
    if (dockerRegistryAuth) body.dockerRegistryAuth = dockerRegistryAuth

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
    nodeUri: string,
    signerOrAuthToken: Signer | string,
    jobId: string,
    signal?: AbortSignal
  ): Promise<any> {
    const consumerAddress = await this.getConsumerAddress(signerOrAuthToken)
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()
    const isAuthToken = typeof signerOrAuthToken === 'string'
    const signature = isAuthToken
      ? null
      : await this.getSignature(
          signerOrAuthToken,
          nonce,
          PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS
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
   * P2P compute doesn't use HTTP routes. Returns the nodeUri itself
   * so callers that use this as a feature gate see compute as supported.
   */
  public async getComputeStartRoutes(
    nodeUri: string,
    _isFreeCompute: boolean = false
  ): Promise<string | null> {
    return nodeUri
  }

  /**
   * Stop a compute job via P2P.
   */
  public async computeStop(
    jobId: string,
    nodeUri: string,
    signerOrAuthToken: Signer | string,
    agreementId?: string,
    signal?: AbortSignal
  ): Promise<ComputeJob | ComputeJob[]> {
    const consumerAddress = await this.getConsumerAddress(signerOrAuthToken)
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()

    const signatureMessage = consumerAddress + nonce + PROTOCOL_COMMANDS.COMPUTE_STOP
    const isAuthToken = typeof signerOrAuthToken === 'string'
    const signature = isAuthToken
      ? null
      : await signRequest(signerOrAuthToken as Signer, signatureMessage)

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
   */
  public async computeStatus(
    nodeUri: string,
    consumerAddress: string,
    jobId?: string,
    agreementId?: string,
    signal?: AbortSignal,
    authorization?: string
  ): Promise<ComputeJob | ComputeJob[]> {
    const body: Record<string, any> = { consumerAddress }
    if (jobId) body.jobId = jobId
    if (agreementId) body.agreementId = agreementId

    const signerOrAuthToken = authorization ?? null
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
   */
  public async getComputeResultUrl(
    nodeUri: string,
    signerOrAuthToken: Signer | string,
    jobId: string,
    index: number
  ): Promise<string> {
    const consumerAddress = await this.getConsumerAddress(signerOrAuthToken)
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_GET_RESULT,
      { jobId, index, consumerAddress },
      signerOrAuthToken
    )
    // P2P returns an async generator for streaming results.
    // Return as-is (callers need to handle the AsyncGenerator type).
    return result
  }

  /**
   * Generate an auth token via P2P.
   */
  public async generateAuthToken(
    consumer: Signer,
    nodeUri: string,
    signal?: AbortSignal
  ): Promise<string> {
    const consumerAddress = await consumer.getAddress()
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()
    const signature = await this.getSignature(
      consumer,
      nonce,
      PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN
    )
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN,
      { address: consumerAddress, signature, nonce },
      null,
      signal
    )
    return result?.token ?? result
  }

  /**
   * Resolve a DDO by DID via P2P GET_DDO command.
   */
  public async resolveDdo(
    nodeUri: string,
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
    nodeUri: string,
    ddo: DDO,
    signer: Signer,
    signal?: AbortSignal
  ): Promise<ValidateMetadata> {
    const publisherAddress = await signer.getAddress()
    const nonce = (
      (await this.getNonce(nodeUri, publisherAddress, signal)) + 1
    ).toString()
    const message = publisherAddress + nonce + PROTOCOL_COMMANDS.VALIDATE_DDO
    const sig = await signRequest(signer, message)
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.VALIDATE_DDO,
      { ddo, publisherAddress, nonce, signature: sig },
      null,
      signal
    )
    if (!result || result.error) return null
    return {
      valid: true,
      hash: bufToHex(result.hash),
      proof: {
        validatorAddress: bufToHex(result.publicKey),
        r: bufToHex(result.r?.[0] ?? result.r),
        s: bufToHex(result.s?.[0] ?? result.s),
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
    nodeUri: string,
    signal?: AbortSignal
  ): Promise<{ success: boolean }> {
    const consumerAddress = await consumer.getAddress()
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()
    const signatureMessage = consumerAddress + nonce
    const signature = await signRequest(consumer, signatureMessage)
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
  public async isValidProvider(nodeUri: string, signal?: AbortSignal): Promise<boolean> {
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
    nodeUri: string,
    request: PolicyServerPassthroughCommand,
    signal?: AbortSignal
  ): Promise<any> {
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
   */
  public async initializePSVerification(
    nodeUri: string,
    request: PolicyServerInitializeCommand,
    signal?: AbortSignal
  ): Promise<any> {
    return this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.POLICY_SERVER_PASSTHROUGH,
      { ...request },
      null,
      signal
    )
  }

  /**
   * Download node logs via P2P.
   */
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
    const consumerAddress = await signer.getAddress()
    const nonce = ((await this.getNonce(nodeUri, consumerAddress, signal)) + 1).toString()
    const signature = await this.getSignature(signer, nonce, PROTOCOL_COMMANDS.GET_LOGS)

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

    return this.sendP2pCommand(nodeUri, PROTOCOL_COMMANDS.GET_LOGS, body, signer, signal)
  }
}
