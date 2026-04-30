import { type Libp2p, type Libp2pOptions, createLibp2p } from 'libp2p'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import { tcp } from '@libp2p/tcp'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { bootstrap } from '@libp2p/bootstrap'
import { identify, identifyPush } from '@libp2p/identify'
import { EventTypes, KadDHT, kadDHT, passthroughMapper } from '@libp2p/kad-dht'
import { ping } from '@libp2p/ping'
import { peerIdFromString } from '@libp2p/peer-id'
import { lpStream, UnexpectedEOFError } from '@libp2p/utils'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { Signer } from 'ethers'
import { sleep } from '../../utils/General.js'
import { LoggerInstance } from '../../utils/Logger.js'
import { concatUint8Arrays } from '../../utils/bytes.js'
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
  OceanNode,
  NodeP2P,
  SignerOrAuthTokenOrSignature,
  CompleteSignature
} from '../../@types/index.js'
import { PROTOCOL_COMMANDS, NodeLogEntry } from '../../@types/Provider.js'
import { type DDO, type ValidateMetadata } from '@oceanprotocol/ddo-js'
import { signRequest } from '../../utils/SignatureUtils.js'
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
const DEFAULT_MAX_RETRIES = 5
const DEFAULT_RETRY_DELAY_MS = 1000
const DEFAULT_DIAL_TIMEOUT_MS = 10_000

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
  lp: ReturnType<typeof lpStream>,
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
   * Enable TCP transport in addition to WebSockets. Default: false.
   * Required in Node.js/Electron environments to reach nodes over plain TCP.
   * Do NOT enable in browser builds — TCP is not available in browsers.
   */
  enableTcp?: boolean
  /**
   * Full libp2p node configuration. Fields provided here override ocean.js
   * defaults (transports, encrypters, services, connectionManager, etc.).
   * Unset fields keep ocean.js defaults.
   */

  libp2p?: Partial<Libp2pOptions>

  /** Additional roles to be marked. Will be used in the future */
  /* Examples:  dashboard, cli , market , etc */
  additionalRoles?: string[]
}

export class P2pProvider {
  private p2pConfig: P2PConfig = {}
  private libp2pNode: Libp2p | null = null
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
    if (this.libp2pNode) {
      Promise.resolve(this.libp2pNode.stop()).catch(() => {})
      this.libp2pNode = null
    }
    await this.getOrCreateLibp2pNode()
  }

  public async getMultiaddrFromPeerId(peerId: string): Promise<string> {
    const appendedPeerId = (peerId: string) =>
      peerId.includes('/p2p/') ? peerId : `${peerId}/p2p/${peerId}`
    const node = await this.getOrCreateLibp2pNode()

    // Check existing connections — remoteAddr.toString() gives the full multiaddr
    const connection = node
      .getConnections()
      .find((c) => c.remotePeer.toString() === peerId)
    if (connection?.remoteAddr) {
      const addr = connection.remoteAddr.toString()
      return appendedPeerId(addr)
    }

    // Check peerStore (populated by peer:discovery, DHT, and connections)
    try {
      const peerData = await node.peerStore.get(peerIdFromString(peerId))
      if (peerData?.addresses?.length > 0) {
        const addr = peerData.addresses[0].multiaddr.toString()
        return appendedPeerId(addr)
      }
    } catch {}

    // DHT lookup as last resort
    const dht = node.services.dht as KadDHT
    for await (const event of dht.findPeer(peerIdFromString(peerId), {
      signal: AbortSignal.timeout(20000)
    })) {
      if (event.type === EventTypes.FINAL_PEER && event.peer.multiaddrs.length > 0) {
        const addr = event.peer.multiaddrs[0].toString()
        return appendedPeerId(addr)
      }
    }

    throw new Error(`No multiaddrs found for peer id ${peerId}`)
  }

  /** Returns the underlying libp2p node instance, or null if P2P is not initialized. */
  public getLibp2pNode(): Libp2p | null {
    return this.libp2pNode ?? null
  }

  /** Returns all peers known to the peerStore (discovered via bootstrap, DHT, or connections). */
  public async getDiscoveredNodes(): Promise<
    Array<{ peerId: string; multiaddrs: string[] }>
  > {
    if (!this.libp2pNode) return []
    const allPeers = await this.libp2pNode.peerStore.all()
    return allPeers.map((peer) => ({
      peerId: peer.id.toString(),
      multiaddrs: peer.addresses.map((a) => a.multiaddr.toString())
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
      return new TextDecoder().decode(new Uint8Array(val.data))
    }
    if (val instanceof Uint8Array) {
      return new TextDecoder().decode(val)
    }
    return val
  }

  private async handleProtocolCommands(stream: Stream, connection: Connection) {
    // eslint-disable-next-line no-unused-vars
    const { remotePeer, remoteAddr } = connection

    // Reserved for future use: we advertise the protocol but do not handle incoming streams yet.
  }

  private async getOrCreateLibp2pNode(): Promise<Libp2p> {
    if (this.libp2pNode) return this.libp2pNode

    const bootstrapAddrs = (this.p2pConfig.bootstrapPeers ?? DEFAULT_BOOTSTRAP_PEERS).map(
      multiaddr
    )

    const node = await createLibp2p({
      addresses: { listen: [] },
      transports: [
        webSockets(),
        circuitRelayTransport(),
        ...(this.p2pConfig.enableTcp ? [tcp()] : [])
      ],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      peerDiscovery: [
        ...(bootstrapAddrs.length > 0
          ? [bootstrap({ list: bootstrapAddrs.map(String), timeout: 10000 })]
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
          clientMode: true // Servers can better query the network
        })
      },
      // Without this we are blocking connection to plain ws - the bundler thinks we are in a browser.
      // This also applies to local nodes.
      // Browsers will still block connection if transport is not secure.
      connectionGater: { denyDialMultiaddr: () => false },
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
      if (
        node.getConnections().length < 100 &&
        node.getConnections(peerInfo.id).length === 0
      ) {
        node
          .dial(peerInfo.id, { signal: AbortSignal.timeout(10000) })
          .catch((err: Error) => {
            LoggerInstance.debug(
              `Failed to dial discovered peer ${peerId}: ${err.message}`
            )
          })
      }
    })

    this.libp2pNode = node
    // all implementations are clients
    this.libp2pNode.handle('/ocean/client/1.0.0', this.handleProtocolCommands)
    const additionalRoles = this.p2pConfig.additionalRoles ?? []
    for (const role of additionalRoles) {
      this.libp2pNode.handle(`/ocean/client/${role}/1.0.0`, this.handleProtocolCommands)
    }
    return node
  }

  private toUint8Array(chunk: Uint8Array | { subarray(): Uint8Array }): Uint8Array {
    return chunk instanceof Uint8Array ? chunk : chunk.subarray()
  }

  public async cidFromRawString(data: string) {
    const hash = await sha256.digest(uint8ArrayFromString(data))
    const cid = CID.create(1, multiFormatRaw.code, hash)
    return cid
  }

  async getProvidersForString(
    input: string,
    signal?: AbortSignal
  ): Promise<Array<{ id: string; multiaddrs: any[] }>> {
    const node = await this.getOrCreateLibp2pNode()
    const cid = await this.cidFromRawString(input)
    const peersFound = []
    try {
      for await (const result of node.contentRouting.findProviders(cid, {
        useCache: false,
        useNetwork: true,
        signal
      })) {
        peersFound.push(result)
      }
    } catch (err) {}
    return peersFound.map((peer) => ({
      id: peer.id.toString(),
      multiaddrs: peer.multiaddrs
    }))
  }

  private isDialable(ma: Multiaddr): boolean {
    // Node.js can dial any transport (TCP, WS, WSS)
    if (typeof window === 'undefined') return true

    // Browsers on HTTPS pages can only use WSS/TLS
    const str = ma.toString()
    return str.includes('/tls/sni')
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
    // if there are no dialable ma, search peerstore
    if (!hasDialable() && peerId) {
      try {
        const peerData = await node.peerStore.get(peerId)
        if (peerData?.addresses) {
          for (const addr of peerData.addresses) {
            addrs.push(addr.multiaddr)
          }
          LoggerInstance.debug(
            `[P2P] ${peerId.toString()}: ${peerData.addresses.length} peerStore addrs`
          )
        }
      } catch {
        LoggerInstance.debug(`[P2P] ${peerId.toString()}: not in peerStore`)
      }
    }
    // if there are no dialable ma, search dht
    if (!hasDialable() && peerId) {
      try {
        // const dhtSignal = AbortSignal.timeout(this.p2pConfig.dhtLookupTimeout ?? 60_000)
        const peerInfo = await node.peerRouting.findPeer(peerId, { signal })
        for (const ma of peerInfo.multiaddrs) addrs.push(ma)
        LoggerInstance.debug(
          `[P2P] ${peerId.toString()}: DHT returned ${peerInfo.multiaddrs.length} addrs`
        )
      } catch (err: any) {
        LoggerInstance.debug(
          `[P2P] ${peerId.toString()}: DHT findPeer failed: ${err.message}`
        )
      }
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
      throw new Error('No valid multiaddresses, cannot connect')
    }
    // normalize all mas if we have peerId
    if (peerId) {
      dialable = dialable.map((ma) => {
        const str = ma.toString()
        return str.includes('/p2p/') ? ma : multiaddr(`${str}/p2p/${peerId.toString()}`)
      })
    }
    try {
      const conn = await node.dial(dialable, { signal })
      LoggerInstance.debug(
        `[P2P] Dial SUCCESS via ${conn.remoteAddr} (limited=${conn.limits != null})`
      )
      return conn
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
      throw new Error(
        `Cannot dial peer ${peerId?.toString()}. ` +
          (addrs.length > 0
            ? `Found addrs: ${addrs.map(String).join(', ')}. `
            : 'No addresses found. ') +
          `Active connections: ${node.getConnections().length}. ` +
          err.message
      )
    }
  }

  private async getNodePublicKey(nodeUri: OceanNode): Promise<string> {
    const endpoints = await this.getEndpoints(nodeUri)
    return endpoints?.nodePublicKey
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

  private async dialAndStream(
    nodeUri: OceanNode,
    payload: Record<string, any>,
    signal?: AbortSignal,
    requestBody?: P2PRequestBodyStream
  ): Promise<{
    lp: ReturnType<typeof lpStream>
    firstBytes: Uint8Array
    connection: Connection
  }> {
    const opSignal =
      signal ?? AbortSignal.timeout(this.p2pConfig.dialTimeout ?? DEFAULT_DIAL_TIMEOUT_MS)
    const connection = await this.getConnection(nodeUri, opSignal)
    try {
      const stream = await connection.newStream(OCEAN_P2P_PROTOCOL, {
        signal: opSignal,
        runOnLimitedConnection: true
      })
      const lp = lpStream(stream)

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

      const firstChunk = await lp.read({ signal: opSignal })
      const firstBytes = this.toUint8Array(firstChunk)

      return { lp, firstBytes, connection }
    } catch (err: any) {
      // Evict the connection so retries get a fresh on
      try {
        connection.abort(new Error('stream failed'))
      } catch {}
      throw err
    }
  }

  private async sendP2pCommand(
    nodeUri: OceanNode,
    command: string,
    body: Record<string, any>,
    signerOrAuthToken?: SignerOrAuthTokenOrSignature | null,
    signal?: AbortSignal,
    retrialNumber: number = 0,
    requestBody?: P2PRequestBodyStream
  ): Promise<any> {
    try {
      const payload = {
        command,
        authorization: signerOrAuthToken
          ? this.getAuthorization(signerOrAuthToken)
          : undefined,
        ...body
      }

      const { lp, firstBytes } = await this.dialAndStream(
        nodeUri,
        payload,
        signal,
        requestBody
      )

      if (!firstBytes.length) {
        throw new Error('Gateway node error: no response from peer')
      }

      const statusText = new TextDecoder().decode(firstBytes)
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
        const text = new TextDecoder().decode(chunks[i])
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
          retrialNumber + 1,
          requestBody
        )
      }

      return response
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      if (
        (msg.includes('closed') || msg.includes('reset')) &&
        retrialNumber < (this.p2pConfig.maxRetries ?? DEFAULT_MAX_RETRIES)
      ) {
        LoggerInstance.debug(
          `[P2P] Stream reset/closed on attempt ${retrialNumber + 1}, retrying...`
        )

        // Connection already evicted by dialAndStream catch block.
        // Brief delay ensures libp2p fully cleans up before retry.
        await sleep(1000)
        return this.sendP2pCommand(
          nodeUri,
          command,
          body,
          signerOrAuthToken,
          signal,
          retrialNumber + 1,
          requestBody
        )
      }
      throw new Error(`P2P command error: ${msg}`)
    }
  }

  /**
   * Returns node status via P2P STATUS command.
   * @param {string} nodeUri - multiaddr of the node
   */
  async getEndpoints(nodeUri: OceanNode): Promise<any> {
    try {
      return await this.sendP2pCommand(nodeUri, PROTOCOL_COMMANDS.STATUS, {})
    } catch (e) {
      LoggerInstance.error('P2P getEndpoints (STATUS) failed:', e)
      throw e
    }
  }

  public async getNodeStatus(
    nodeUri: OceanNode,
    signal?: AbortSignal
  ): Promise<NodeStatus> {
    return this.getEndpoints(nodeUri)
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
   */
  public async getDownloadUrl(
    did: string,
    serviceId: string,
    fileIndex: number,
    transferTxId: string,
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    policyServer?: any,
    userCustomParameters?: UserCustomParameters
  ): Promise<DownloadResponse> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
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
    try {
      while (true) {
        const chunk = await lp.read({
          signal: AbortSignal.timeout(
            this.p2pConfig.dialTimeout ?? DEFAULT_DIAL_TIMEOUT_MS
          )
        })
        chunks.push(new Uint8Array(this.toUint8Array(chunk)))
      }
    } catch (e) {
      if (!(e instanceof UnexpectedEOFError)) {
        throw e
      }
    }

    const combined = concatUint8Arrays(chunks)
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
    dockerRegistryAuth?: dockerRegistryAuth
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
   */
  public async computeStatus(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId?: string,
    agreementId?: string,
    signal?: AbortSignal
  ): Promise<ComputeJob | ComputeJob[]> {
    const consumerAddress = await getConsumerAddress(signerOrAuthToken)
    const body: Record<string, any> = { consumerAddress }
    if (jobId) body.jobId = jobId
    if (agreementId) body.agreementId = agreementId

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
   */
  public async getComputeResult(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    index: number,
    offset: number = 0
  ): Promise<ComputeResultStream> {
    const { consumerAddress, nonce, signature } = await this.getSignedCommandParams(
      nodeUri,
      signerOrAuthToken,
      PROTOCOL_COMMANDS.COMPUTE_GET_RESULT
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

    const { lp, firstBytes } = await this.dialAndStream(nodeUri, payload)

    // First frame is always a status JSON
    const status = JSON.parse(new TextDecoder().decode(firstBytes))
    if (typeof status?.httpStatus === 'number' && status.httpStatus >= 400) {
      throw new Error(status.error ?? `P2P compute result error: ${status.httpStatus}`)
    }

    const dialTimeout = this.p2pConfig.dialTimeout ?? DEFAULT_DIAL_TIMEOUT_MS
    return (async function* () {
      try {
        while (true) {
          const chunk = await lp.read({ signal: AbortSignal.timeout(dialTimeout) })
          yield chunk instanceof Uint8Array ? chunk : chunk.subarray()
        }
      } catch (e) {
        if (!(e instanceof UnexpectedEOFError)) throw e
      }
    })()
  }

  public async getComputeResultUrl(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    jobId: string,
    index: number
  ): Promise<string> {
    const consumerAddress = await getConsumerAddress(signerOrAuthToken)
    const result = await this.sendP2pCommand(
      nodeUri,
      PROTOCOL_COMMANDS.COMPUTE_GET_RESULT,
      { jobId, index, consumerAddress },
      signerOrAuthToken
    )
    return result
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
    const signature = await getSignature(
      consumer,
      nonce,
      PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN
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
    signal?: AbortSignal
  ): Promise<string> {
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
    nodeUri: OceanNode,
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

  private async getPersistentStorageSignaturePayload(
    nodeUri: OceanNode,
    signerOrAuthToken: SignerOrAuthTokenOrSignature,
    command: string,
    signal?: AbortSignal
  ): Promise<{} | { consumerAddress: string; nonce: string; signature: string }> {
    if (typeof signerOrAuthToken === 'string') {
      return {}
    }
    return this.getSignedCommandParams(nodeUri, signerOrAuthToken, command, signal)
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
        accessLists: payload.accessLists ?? []
      },
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
      0,
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
}
