import { expect } from 'chai'
import { ProviderInstance, PROTOCOL_COMMANDS } from '../../src/index.js'
import {
  AGENT_SIGNATURE,
  OK_STATUS,
  createP2pTestPeer,
  drain as drainFrames
} from './p2pStreamPeer.js'

const NODE = 'http://127.0.0.1:8001'
const SERVICE_ID = 'svc-1'
// A precomputed signature: signs nothing and fetches no nonce, so only the result request is made.
const AUTH = {
  consumerAddress: '0x0000000000000000000000000000000000000001',
  nonce: '7',
  signature: '0xsig'
}

async function drain(stream: AsyncIterable<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder()
  let text = ''
  for await (const chunk of stream) text += decoder.decode(chunk, { stream: true })
  return text + decoder.decode()
}

function bodyOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text))
      controller.close()
    }
  })
}

describe('serviceGetResult', () => {
  const originalFetch = globalThis.fetch
  let requested: URL | undefined

  beforeEach(() => {
    requested = undefined
    globalThis.fetch = (async (url: string) => {
      requested = new URL(url)
      return { ok: true, status: 200, body: bodyOf('zip-bytes') } as any
    }) as any
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('uses the serviceGetResult command string ocean-node registers', () => {
    expect(PROTOCOL_COMMANDS.SERVICE_GET_RESULT).to.equal('serviceGetResult')
  })

  it('requests an archive by index over HTTP and streams the body', async () => {
    const stream = await ProviderInstance.serviceGetResult(NODE, AUTH, SERVICE_ID, 0)
    expect(await drain(stream)).to.equal('zip-bytes')
    expect(requested.pathname).to.equal('/api/services/serviceResult')
    expect(requested.searchParams.get('serviceId')).to.equal(SERVICE_ID)
    expect(requested.searchParams.get('index')).to.equal('0')
    expect(requested.searchParams.get('consumerAddress')).to.equal(AUTH.consumerAddress)
    expect(requested.searchParams.get('nonce')).to.equal(AUTH.nonce)
    expect(requested.searchParams.get('signature')).to.equal(AUTH.signature)
    expect(requested.searchParams.has('offset')).to.equal(false)
    expect(requested.searchParams.has('live')).to.equal(false)
  })

  it('sends a resume offset as the offset query parameter', async () => {
    await ProviderInstance.serviceGetResult(NODE, AUTH, SERVICE_ID, 2, 1024)
    expect(requested.searchParams.get('index')).to.equal('2')
    expect(requested.searchParams.get('offset')).to.equal('1024')
  })

  it('requests a live zip with live=true and no index', async () => {
    await ProviderInstance.serviceGetResult(NODE, AUTH, SERVICE_ID, 'live')
    expect(requested.searchParams.get('live')).to.equal('true')
    expect(requested.searchParams.has('index')).to.equal(false)
  })

  it('throws the node error text on a refused request', async () => {
    globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 409,
        text: async () => 'Service svc-1 has no container right now'
      }) as any) as any
    let error: Error | undefined
    try {
      await ProviderInstance.serviceGetResult(NODE, AUTH, SERVICE_ID, 'live')
    } catch (e) {
      error = e
    }
    expect(error?.message).to.equal('Service svc-1 has no container right now')
  })

  for (const [label, index, offset] of [
    ['a negative index', -1, 0],
    ['a fractional index', 1.5, 0],
    ['a negative offset', 0, -1],
    ['an offset with live', 'live', 10]
  ] as const) {
    it(`rejects ${label} before making any request`, async () => {
      let error: Error | undefined
      try {
        await ProviderInstance.serviceGetResult(NODE, AUTH, SERVICE_ID, index, offset)
      } catch (e) {
        error = e
      }
      expect(error).to.be.instanceOf(Error)
      expect(requested).to.equal(undefined)
    })
  }
})

describe('serviceGetResult over P2P', () => {
  const PEER = 'test-peer'
  const text = (frames: Uint8Array[]) =>
    frames.map((f) => new TextDecoder().decode(f)).join('')
  const command = async (received: Promise<Uint8Array>) =>
    JSON.parse(new TextDecoder().decode(await received))

  it('sends the archive index and offset, then streams the zip after the status frame', async () => {
    const peer = await createP2pTestPeer()
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      peer.sendFrame('zip-')
      peer.sendFrame('bytes')
      await peer.close()
    })().catch(() => {})

    const body = await peer.provider.serviceGetResult(
      PEER,
      AGENT_SIGNATURE,
      'svc-1',
      3,
      512
    )
    expect(text(await drainFrames(body))).to.equal('zip-bytes')
    expect(await command(peer.commandReceived)).to.deep.include({
      command: 'serviceGetResult',
      serviceId: 'svc-1',
      index: 3,
      offset: 512,
      consumerAddress: AGENT_SIGNATURE.consumerAddress,
      nonce: AGENT_SIGNATURE.nonce,
      signature: AGENT_SIGNATURE.signature
    })
  })

  it('sends live: true and no index for a live download', async () => {
    const peer = await createP2pTestPeer()
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      await peer.close()
    })().catch(() => {})

    await drainFrames(
      await peer.provider.serviceGetResult(PEER, AGENT_SIGNATURE, 'svc-1', 'live')
    )
    const sent = await command(peer.commandReceived)
    expect(sent.live).to.equal(true)
    expect(sent).to.not.have.property('index')
    expect(sent).to.not.have.property('offset')
  })

  it('throws the node error from the status frame', async () => {
    const peer = await createP2pTestPeer()
    ;(async () => {
      await peer.commandReceived
      peer.sendFrame(
        JSON.stringify({ httpStatus: 404, error: 'Service svc-1 has no output archive' })
      )
      await peer.close()
    })().catch(() => {})

    let error: Error | undefined
    try {
      await peer.provider.serviceGetResult(PEER, AGENT_SIGNATURE, 'svc-1', 0)
    } catch (e) {
      error = e
    }
    expect(error?.message).to.equal('Service svc-1 has no output archive')
  })
})
