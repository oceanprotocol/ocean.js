import { type Libp2p, type Libp2pOptions, createLibp2p } from 'libp2p'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import { bootstrap } from '@libp2p/bootstrap'
import { tls } from '@libp2p/tls'
import { identify } from '@libp2p/identify'
import { kadDHT } from '@libp2p/kad-dht'
import { ping } from '@libp2p/ping'
import { mdns } from '@libp2p/mdns'
import { peerIdFromString } from '@libp2p/peer-id'
import { lpStream, UnexpectedEOFError } from '@libp2p/utils'
import type { Connection } from '@libp2p/interface'
import { multiaddr } from '@multiformats/multiaddr'
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
import { getConsumerAddress, getSignature, getAuthorization } from './BaseProvider.js'
import { eciesencrypt } from '../../utils/eciesencrypt.js'

export const OCEAN_P2P_PROTOCOL = '/ocean/nodes/1.0.0'
const OCEAN_DHT_PROTOCOL = '/ocean/nodes/1.0.0/kad/1.0.0'
const DEFAULT_MAX_RETRIES = 5
const DEFAULT_RETRY_DELAY_MS = 1000
const DEFAULT_DIAL_TIMEOUT_MS = 10_000

// Ocean Protocol public bootstrap nodes (WebSocket addresses)
const DEFAULT_BOOTSTRAP_PEERS = [
  '/dns4/bootstrap1.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmLhRDqfufZiQnxvQs2XHhd6hwkLSPfjAQg1gH8wgRixiP',
  '/dns4/bootstrap2.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmHwzeVw7RpGopjZe6qNBJbzDDBdqtrSk7Gcx1emYsfgL4',
  '/dns4/bootstrap3.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmBKSeEP3v4tYEPsZsZv9VELinyMCsrVTJW9BvQeFXx28U',
  '/dns4/bootstrap4.oncompute.ai/tcp/9001/ws/p2p/16Uiu2HAmSTVTArioKm2wVcyeASHYEsnx2ZNq467Z4GMDU4ErEPom'
]

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
   * Timeout for DHT peer lookup when dialing a bare peer ID, in ms. Default: 60000.
   * Intentionally separate from dialTimeout — DHT resolution needs more time than
   * a direct dial. Once a peer is found and connected, subsequent calls skip this.
   */
  dhtLookupTimeout?: number
  /**
   * mDNS discovery interval in ms. Set to 0 to disable. Default: 20000
   * Useful for local development — discovers peers on the same LAN without bootstrap nodes.
   */
  mDNSInterval?: number
  /**
   * Full libp2p node configuration. Fields provided here override ocean.js
   * defaults (transports, encrypters, services, connectionManager, etc.).
   * Unset fields keep ocean.js defaults.
   */
  libp2p?: Partial<Libp2pOptions>
}

export class P2pProvider {
  private p2pConfig: P2PConfig = {}
  private libp2pNode: Libp2p | null = null
  private discoveredNodes = new Map<string, string[]>()

  /**
   * Configure the internal libp2p node used for P2P transport.
   * Call this once before making P2P requests, e.g.:
   *   ProviderInstance.setupP2P({ bootstrapPeers: ['/ip4/1.2.3.4/tcp/9000/ws/p2p/16Uiu2...'] })
   *
   * Required when using bare peer IDs as nodeUri — the bootstrap peers
   * provide DHT entry points so the peer can be located.
   */
  public async setupP2P(config: P2PConfig): Promise<void> {
    this.p2pConfig = config
    this.discoveredNodes.clear()
    if (this.libp2pNode) {
      Promise.resolve(this.libp2pNode.stop()).catch(() => {})
      this.libp2pNode = null
    }
    await this.getOrCreateLibp2pNode()
  }

  /** Returns all peers discovered via mDNS or DHT bootstrap. */
  public getDiscoveredNodes(): Array<{ peerId: string; multiaddrs: string[] }> {
    return Array.from(this.discoveredNodes.entries()).map(([peerId, multiaddrs]) => ({
      peerId,
      multiaddrs
    }))
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
      return Buffer.from(val.data).toString('hex')
    }
    if (val instanceof Uint8Array || Buffer.isBuffer(val)) {
      return Buffer.from(val).toString('hex')
    }
    return val
  }

  private async getOrCreateLibp2pNode(): Promise<Libp2p> {
    if (this.libp2pNode) return this.libp2pNode

    const bootstrapAddrs = (this.p2pConfig.bootstrapPeers ?? DEFAULT_BOOTSTRAP_PEERS).map(
      multiaddr
    )

    const node = await createLibp2p({
      addresses: { listen: [] },
      transports: [webSockets()],
      connectionEncrypters: [noise(), tls()],
      streamMuxers: [yamux()],
      peerDiscovery: [
        ...(bootstrapAddrs.length > 0
          ? [bootstrap({ list: bootstrapAddrs.map(String), timeout: 10000 })]
          : []),
        ...((this.p2pConfig.mDNSInterval ?? 20000) > 0
          ? [mdns({ interval: this.p2pConfig.mDNSInterval ?? 20000 })]
          : [])
      ],
      services: {
        identify: identify(),
        ping: ping(),
        dht: kadDHT({ protocol: OCEAN_DHT_PROTOCOL, clientMode: true })
      },
      connectionManager: { maxConnections: 100 },
      connectionMonitor: { abortConnectionOnPingFailure: false },
      // User-supplied config overrides all defaults above.
      // Cast needed: services generics can't be inferred through a Partial<Libp2pOptions> spread.
      ...(this.p2pConfig.libp2p as any)
    })

    await node.start()
    node.addEventListener('peer:discovery', (evt: any) => {
      const peerInfo = evt.detail
      if (!peerInfo?.id) return
      const peerId = peerInfo.id.toString()
      this.discoveredNodes.set(
        peerId,
        (peerInfo.multiaddrs ?? []).map((m: any) => m.toString())
      )
      if (
        node.getConnections().length < 100 &&
        node.getConnections(peerInfo.id).length === 0
      ) {
        node.dial(peerInfo.id, { signal: AbortSignal.timeout(10000) }).catch((err: Error) => {
          LoggerInstance.debug(`Failed to dial discovered peer ${peerId}: ${err.message}`)
        })
      }
    })

    this.libp2pNode = node
    return node
  }

  private toUint8Array(chunk: Uint8Array | { subarray(): Uint8Array }): Uint8Array {
    return chunk instanceof Uint8Array ? chunk : chunk.subarray()
  }

  private async getConnection(nodeUri: string, signal: AbortSignal): Promise<Connection> {
    if (nodeUri.startsWith('/')) {
      const ma = multiaddr(nodeUri)
      const node = await this.getOrCreateLibp2pNode()
      return node.dial(ma, { signal })
    }
    const peerId = peerIdFromString(nodeUri)
    const node = await this.getOrCreateLibp2pNode()
    // Return existing connection immediately — no DHT needed
    const existing = node.getConnections(peerId)
    if (existing.length > 0) return existing[0]

    // Resolve peer ID → multiaddrs via DHT before dialing.
    // Uses a separate signal so a short dial signal doesn't abort the DHT
    // lookup before it completes. Once findPeer resolves, dial() is instant
    // (addresses are in peerStore).
    const dhtSignal = AbortSignal.timeout(this.p2pConfig.dhtLookupTimeout ?? 60_000)
    await node.peerRouting.findPeer(peerId, { signal: dhtSignal }).catch(() => {})
    return node.dial(peerId, { signal })
  }

  protected getConsumerAddress(s: Signer | string) {
    return getConsumerAddress(s)
  }

  protected getSignature(s: Signer | string, nonce: string, command: string) {
    return getSignature(s, nonce, command)
  }

  private async getNodePublicKey(nodeUri: string): Promise<string> {
    const endpoints = await this.getEndpoints(nodeUri)
    return endpoints?.nodePublicKey
  }

  protected getAuthorization(s: Signer | string) {
    return getAuthorization(s)
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
    const opSignal =
      signal ?? AbortSignal.timeout(this.p2pConfig.dialTimeout ?? DEFAULT_DIAL_TIMEOUT_MS)
    const connection = await this.getConnection(nodeUri, opSignal)
    const stream = await connection.newStream(OCEAN_P2P_PROTOCOL, { signal: opSignal })
    const lp = lpStream(stream)

    await lp.write(uint8ArrayFromString(JSON.stringify(payload)), { signal: opSignal })
    await stream.close()

    const firstChunk = await lp.read({ signal: opSignal })
    const firstBytes = this.toUint8Array(firstChunk)

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
                signal: AbortSignal.timeout(DEFAULT_DIAL_TIMEOUT_MS)
              })
              yield chunk instanceof Uint8Array ? chunk : chunk.subarray()
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
          const chunk = await lp.read({
            signal: AbortSignal.timeout(
              this.p2pConfig.dialTimeout ?? DEFAULT_DIAL_TIMEOUT_MS
            )
          })
          chunks.push(this.toUint8Array(chunk))
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
      if (
        errText.includes('Cannot connect to peer') &&
        retrialNumber < (this.p2pConfig.maxRetries ?? DEFAULT_MAX_RETRIES)
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.p2pConfig.retryDelay ?? DEFAULT_RETRY_DELAY_MS)
        )
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
        retrialNumber < (this.p2pConfig.maxRetries ?? DEFAULT_MAX_RETRIES)
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
    return this.bufToHex(result)
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
    output?: ComputeOutput,
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
    if (output) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) body.output = eciesencrypt(nodeKey, JSON.stringify(output))
    }

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

    // First lp frame is the status JSON (if present). Some nodes send binary data
    // directly without a status prefix — in that case JSON.parse throws SyntaxError
    // and we treat the frame as the start of file data.
    const statusText = uint8ArrayToString(firstBytes)
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
    const chunks: Buffer[] = status === null ? [Buffer.from(firstBytes)] : []
    try {
      while (true) {
        const chunk = await lp.read({
          signal: AbortSignal.timeout(
            this.p2pConfig.dialTimeout ?? DEFAULT_DIAL_TIMEOUT_MS
          )
        })
        chunks.push(Buffer.from(this.toUint8Array(chunk)))
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
    if (policyServer) body.policyServer = policyServer
    if (queueMaxWaitTime) body.queueMaxWaitTime = queueMaxWaitTime
    if (dockerRegistryAuth) body.dockerRegistryAuth = dockerRegistryAuth
    if (output) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) body.output = eciesencrypt(nodeKey, JSON.stringify(output))
    }

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
    if (policyServer) body.policyServer = policyServer
    if (queueMaxWaitTime) body.queueMaxWaitTime = queueMaxWaitTime
    if (dockerRegistryAuth) body.dockerRegistryAuth = dockerRegistryAuth
    if (output) {
      const nodeKey = await this.getNodePublicKey(nodeUri)
      if (nodeKey) body.output = eciesencrypt(nodeKey, JSON.stringify(output))
    }

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

    const signature = await this.getSignature(
      signerOrAuthToken,
      nonce,
      PROTOCOL_COMMANDS.COMPUTE_STOP
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
