import { assert, expect } from 'chai'
import { ethers, Wallet } from 'ethers'
import {
  ProviderInstance,
  PROTOCOL_COMMANDS,
  OceanNodeProviderError,
  MAINTENANCE_MODE_CODE,
  isMaintenanceError,
  P2pError
} from '../../src/index.js'
import type { NodeStatus } from '../../src/index.js'
// Internal P2P error-construction helpers (module-exported, not part of the package barrel):
// these are the real path a peer-reported 503 frame travels before reaching a caller.
import {
  peerReportedError,
  asP2pCommandError,
  classifyP2pError
} from '../../src/services/providers/P2pProvider.js'

const NODE = 'http://127.0.0.1:8001'
const MAINTENANCE_BODY = {
  error: 'Node is in maintenance mode; not accepting new compute or service requests',
  code: 'MAINTENANCE_MODE'
}

interface Captured {
  url: string
  method?: string
  headers?: any
  body?: any
}

/** Mocks fetch: nonce lookups answer `nonce`, every other call is recorded and answered by `reply`. */
function mockFetch(
  reply: { ok: boolean; status: number; json?: any; text?: string },
  nonce = 41
): Captured[] {
  const calls: Captured[] = []
  globalThis.fetch = (async (url: string, init?: any) => {
    if (String(url).includes('/api/services/nonce')) {
      return { ok: true, json: async () => ({ nonce }) } as any
    }
    calls.push({
      url,
      method: init?.method,
      headers: init?.headers,
      body: init?.body ? JSON.parse(init.body) : undefined
    })
    return {
      ok: reply.ok,
      status: reply.status,
      statusText: String(reply.status),
      json: async () => reply.json,
      text: async () => reply.text ?? JSON.stringify(reply.json)
    } as any
  }) as any
  return calls
}

describe('Maintenance mode client support', () => {
  const originalFetch = globalThis.fetch
  const admin = Wallet.createRandom()

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('PROTOCOL_COMMANDS.SET_MAINTENANCE is the literal node command string', () => {
    // GOTCHA B: this string is part of the signed message; a typo is an auth failure.
    expect(PROTOCOL_COMMANDS.SET_MAINTENANCE).to.equal('setMaintenance')
    expect(MAINTENANCE_MODE_CODE).to.equal('MAINTENANCE_MODE')
  })

  describe('setMaintenance (HTTP)', () => {
    it('POSTs /api/admin/maintenance with { enabled, signature, nonce, address }', async () => {
      const calls = mockFetch({ ok: true, status: 200, json: { maintenance: true } })
      const res = await ProviderInstance.setMaintenance(NODE, admin, true)
      expect(res).to.deep.equal({ maintenance: true })
      expect(calls).to.have.length(1)
      expect(calls[0].method).to.equal('POST')
      expect(calls[0].url).to.equal(NODE + '/api/admin/maintenance')
      expect(Object.keys(calls[0].body).sort()).to.deep.equal([
        'address',
        'enabled',
        'nonce',
        'signature'
      ])
      expect(calls[0].body.address).to.equal(admin.address)
      expect(calls[0].body.nonce).to.equal('42')
    })

    it('sends enabled as a JSON boolean, never a string (GOTCHA A)', async () => {
      const calls = mockFetch({ ok: true, status: 200, json: { maintenance: false } })
      await ProviderInstance.setMaintenance(NODE, admin, false)
      assert.strictEqual(typeof calls[0].body.enabled, 'boolean')
      assert.strictEqual(calls[0].body.enabled, false)
      await ProviderInstance.setMaintenance(NODE, admin, true)
      assert.strictEqual(calls[1].body.enabled, true)
    })

    it('signs exactly address + nonce + "setMaintenance" (GOTCHA B)', async () => {
      const calls = mockFetch({ ok: true, status: 200, json: { maintenance: true } })
      await ProviderInstance.setMaintenance(NODE, admin, true)
      const { address, nonce, signature } = calls[0].body
      const hashed = (message: string) =>
        ethers.toBeArray(
          ethers.solidityPackedKeccak256(
            ['bytes'],
            [ethers.hexlify(ethers.toUtf8Bytes(message))]
          )
        )
      const recovered = ethers.verifyMessage(
        hashed(address + nonce + 'setMaintenance'),
        signature
      )
      expect(recovered).to.equal(admin.address)
      // and it is NOT valid for a different command string
      const wrong = ethers.verifyMessage(hashed(address + nonce + 'stopNode'), signature)
      expect(wrong).to.not.equal(admin.address)
    })

    it('uses the Authorization header and sends no signature for a JWT', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
      const payload = Buffer.from(JSON.stringify({ address: admin.address })).toString(
        'base64url'
      )
      const jwt = `${header}.${payload}.sig`
      const calls = mockFetch({ ok: true, status: 200, json: { maintenance: true } })
      await ProviderInstance.setMaintenance(NODE, jwt, true)
      expect(calls[0].headers.Authorization).to.equal(jwt)
      // token path: no nonce lookup, no signature/nonce in the body, address from the JWT
      expect(calls[0].body.signature).to.equal(undefined)
      expect(calls[0].body.nonce).to.equal(undefined)
      expect(calls[0].body.address).to.equal(admin.address)
      assert.strictEqual(calls[0].body.enabled, true)
    })

    it('disable round-trip returns { maintenance: false }', async () => {
      const calls = mockFetch({ ok: true, status: 200, json: { maintenance: false } })
      const res = await ProviderInstance.setMaintenance(NODE, admin, false)
      expect(res).to.deep.equal({ maintenance: false })
      assert.strictEqual(calls[0].body.enabled, false)
    })

    it('surfaces a 500 persist failure as a typed error without a code', async () => {
      mockFetch({
        ok: false,
        status: 500,
        json: { error: 'Failed to set maintenance mode', code: null }
      })
      try {
        await ProviderInstance.setMaintenance(NODE, admin, true)
        assert.fail('should have thrown')
      } catch (e: any) {
        expect(e).to.be.instanceOf(OceanNodeProviderError)
        expect(e.httpStatus).to.equal(500)
        expect(e.message).to.contain('Failed to set maintenance mode')
        expect(isMaintenanceError(e)).to.equal(false)
      }
    })

    it('wraps a network failure in the generic provider error', async () => {
      globalThis.fetch = (async (url: string) => {
        if (String(url).includes('/api/services/nonce')) {
          return { ok: true, json: async () => ({ nonce: 1 }) } as any
        }
        throw new TypeError('fetch failed')
      }) as any
      try {
        await ProviderInstance.setMaintenance(NODE, admin, true)
        assert.fail('should have thrown')
      } catch (e: any) {
        expect(e.message).to.equal('HTTP request failed calling Provider')
        expect(isMaintenanceError(e)).to.equal(false)
      }
    })

    it('forwards the abort signal to the POST', async () => {
      let seen: any
      globalThis.fetch = (async (url: string, init?: any) => {
        if (String(url).includes('/api/services/nonce')) {
          return { ok: true, json: async () => ({ nonce: 1 }) } as any
        }
        seen = init?.signal
        return { ok: true, status: 200, json: async () => ({ maintenance: true }) } as any
      }) as any
      const ac = new AbortController()
      await ProviderInstance.setMaintenance(NODE, admin, true, ac.signal)
      expect(seen).to.equal(ac.signal)
    })

    it('surfaces the node message when enabled is rejected (non-boolean)', async () => {
      const body = { error: 'Parameter "enabled" must be a boolean', code: null }
      mockFetch({ ok: false, status: 400, json: body })
      try {
        await ProviderInstance.setMaintenance(NODE, admin, 'true' as any)
        assert.fail('should have thrown')
      } catch (e: any) {
        expect(e).to.be.instanceOf(OceanNodeProviderError)
        expect(e.httpStatus).to.equal(400)
        expect(e.message).to.contain('must be a boolean')
        expect(isMaintenanceError(e)).to.equal(false)
      }
    })

    it('throws OceanNodeProviderError on admin auth failure', async () => {
      mockFetch({ ok: false, status: 401, json: { error: 'Unauthorized', code: null } })
      try {
        await ProviderInstance.setMaintenance(NODE, admin, true)
        assert.fail('should have thrown')
      } catch (e: any) {
        expect(e).to.be.instanceOf(OceanNodeProviderError)
        expect(e.httpStatus).to.equal(401)
      }
    })
  })

  describe('setMaintenance (P2P)', () => {
    it('dispatches SET_MAINTENANCE with a boolean body over sendP2pCommand', async () => {
      const p2p: any = ProviderInstance.getP2PProvider()
      const original = p2p.sendP2pCommand
      let seen: any
      p2p.sendP2pCommand = async (...args: any[]) => {
        seen = args
        return { maintenance: true }
      }
      try {
        const agentSig = {
          consumerAddress: admin.address,
          nonce: '7',
          signature: '0xabc'
        }
        const peer = '16Uiu2HAmFm7aTf5Z1yCAQB4CRdSKVSB7rC5jBwVKkkaS5uRtbyG5'
        const res = await ProviderInstance.setMaintenance(peer, agentSig, true)
        expect(res).to.deep.equal({ maintenance: true })
        expect(seen[0]).to.equal(peer)
        expect(seen[1]).to.equal('setMaintenance')
        expect(seen[2]).to.deep.equal({
          enabled: true,
          signature: '0xabc',
          nonce: '7',
          address: admin.address
        })
        assert.strictEqual(typeof seen[2].enabled, 'boolean')
      } finally {
        p2p.sendP2pCommand = original
      }
    })
  })

  describe('NodeStatus.maintenance typing', () => {
    it('accepts the basic and detailed shapes and is optional', () => {
      const basic: Pick<NodeStatus, 'maintenance'> = { maintenance: { enabled: true } }
      const detailed: Pick<NodeStatus, 'maintenance'> = {
        maintenance: {
          enabled: true,
          runningComputeJobs: 2,
          runningServices: 1,
          latestExpectedEndTime: 1700000000
        }
      }
      const legacy: Pick<NodeStatus, 'maintenance'> = {}
      expect(basic.maintenance?.enabled).to.equal(true)
      expect(detailed.maintenance?.runningComputeJobs).to.equal(2)
      expect(legacy.maintenance).to.equal(undefined)
    })
  })

  describe('maintenance rejection discrimination', () => {
    const agentSig = { consumerAddress: admin.address, nonce: '1', signature: '0xabc' }

    async function expectMaintenance(fn: () => Promise<any>) {
      try {
        await fn()
        assert.fail('should have thrown')
      } catch (e: any) {
        expect(e).to.be.instanceOf(Error)
        expect(e).to.be.instanceOf(OceanNodeProviderError)
        expect(e.code).to.equal('MAINTENANCE_MODE')
        expect(e.httpStatus).to.equal(503)
        expect(e.body).to.deep.equal(MAINTENANCE_BODY)
        expect(isMaintenanceError(e)).to.equal(true)
        // backwards compatibility: message is still the JSON body
        expect(JSON.parse(e.message)).to.deep.equal(MAINTENANCE_BODY)
      }
    }

    const computeArgs = [
      'env',
      [{ documentId: 'did:op:1', serviceId: 's' }],
      { meta: { container: {} } },
      60,
      '0x0000000000000000000000000000000000000000',
      [],
      8996
    ] as any[]

    it('computeStart', async () => {
      mockFetch({ ok: false, status: 503, json: MAINTENANCE_BODY })
      await expectMaintenance(() =>
        (ProviderInstance.computeStart as any)(NODE, agentSig, ...computeArgs)
      )
    })

    it('freeComputeStart', async () => {
      mockFetch({ ok: false, status: 503, json: MAINTENANCE_BODY })
      await expectMaintenance(() =>
        ProviderInstance.freeComputeStart(
          NODE,
          agentSig,
          'env',
          computeArgs[1],
          computeArgs[2]
        )
      )
    })

    it('initializeCompute', async () => {
      mockFetch({ ok: false, status: 503, json: MAINTENANCE_BODY })
      await expectMaintenance(() =>
        ProviderInstance.initializeCompute(
          computeArgs[1],
          computeArgs[2],
          'env',
          computeArgs[4],
          60,
          NODE,
          admin.address,
          [],
          8996
        )
      )
    })

    it('serviceStart (message stays the raw response text)', async () => {
      const raw = JSON.stringify(MAINTENANCE_BODY)
      mockFetch({ ok: false, status: 503, json: MAINTENANCE_BODY, text: raw })
      try {
        await ProviderInstance.serviceStart(NODE, agentSig, {} as any)
        assert.fail('should have thrown')
      } catch (e: any) {
        expect(isMaintenanceError(e)).to.equal(true)
        expect(e.httpStatus).to.equal(503)
        expect(e.message).to.equal(raw)
      }
    })

    it('serviceExtend (message stays the raw response text)', async () => {
      const raw = JSON.stringify(MAINTENANCE_BODY)
      mockFetch({ ok: false, status: 503, json: MAINTENANCE_BODY, text: raw })
      try {
        await ProviderInstance.serviceExtend(NODE, agentSig, 'svc', 60, {} as any)
        assert.fail('should have thrown')
      } catch (e: any) {
        expect(isMaintenanceError(e)).to.equal(true)
        expect(e.httpStatus).to.equal(503)
        expect(e.message).to.equal(raw)
      }
    })

    it('a 503 without a code (engines not configured) is not a maintenance error', async () => {
      const body = { error: 'Compute engines not configured' }
      mockFetch({ ok: false, status: 503, json: body })
      try {
        await (ProviderInstance.computeStart as any)(NODE, agentSig, ...computeArgs)
        assert.fail('should have thrown')
      } catch (e: any) {
        expect(e).to.be.instanceOf(OceanNodeProviderError)
        expect(e.httpStatus).to.equal(503)
        expect(e.code).to.equal(undefined)
        expect(isMaintenanceError(e)).to.equal(false)
        expect(JSON.parse(e.message)).to.deep.equal(body)
      }
    })

    it('a non-JSON serviceStart error keeps its raw text and has no code', async () => {
      mockFetch({ ok: false, status: 502, text: 'Bad Gateway' })
      try {
        await ProviderInstance.serviceStart(NODE, agentSig, {} as any)
        assert.fail('should have thrown')
      } catch (e: any) {
        expect(e.message).to.equal('Bad Gateway')
        expect(e.httpStatus).to.equal(502)
        expect(isMaintenanceError(e)).to.equal(false)
      }
    })

    it('isMaintenanceError recognises P2P errors carrying the code, rejects others', () => {
      const p2pErr = new P2pError('protocol_failed', 'P2P command error: x', {
        httpStatus: 503,
        code: MAINTENANCE_MODE_CODE
      })
      expect(isMaintenanceError(p2pErr)).to.equal(true)
      expect(isMaintenanceError(new P2pError('timeout', 'x'))).to.equal(false)
      expect(isMaintenanceError(new Error('x'))).to.equal(false)
      expect(isMaintenanceError({ code: MAINTENANCE_MODE_CODE })).to.equal(false)
      expect(isMaintenanceError(undefined)).to.equal(false)
    })
  })

  // Drives the ACTUAL P2P error path a peer-reported 503 travels: a status frame is wrapped by
  // `peerReportedError` at the throw sites in attemptP2pCommand, then the sendP2pCommand catch
  // runs it through `asP2pCommandError`. This is the deviation most likely to silently regress,
  // so it is pinned directly rather than only through the synthetic `new P2pError(...)` above.
  describe('P2P maintenance 503 frame propagation', () => {
    const FRAME = {
      httpStatus: 503,
      error: MAINTENANCE_BODY.error,
      code: MAINTENANCE_MODE_CODE
    }

    it('carries code/httpStatus/body from the status frame through to the final command error', () => {
      const reported = peerReportedError(FRAME, FRAME.error)
      // Message before wrapping is the raw peer text, with no prefix yet.
      expect(reported.message).to.equal(FRAME.error)
      expect(reported.type).to.equal('protocol_failed')

      const final = asP2pCommandError(reported, classifyP2pError(reported))
      expect(final).to.be.instanceOf(P2pError)
      // The `P2P command error:` prefix consumers match on is preserved and added once.
      expect(final.message).to.equal(`P2P command error: ${FRAME.error}`)
      expect(final.type).to.equal('protocol_failed')
      expect(final.httpStatus).to.equal(503)
      expect(final.code).to.equal(MAINTENANCE_MODE_CODE)
      expect(final.body).to.deep.equal(FRAME)
      expect(isMaintenanceError(final)).to.equal(true)
    })

    it('a 503 frame WITHOUT a code yields no code and is not a maintenance error', () => {
      const frame = { httpStatus: 503, error: 'Compute engines not configured' }
      const final = asP2pCommandError(
        peerReportedError(frame, frame.error),
        classifyP2pError(peerReportedError(frame, frame.error))
      )
      expect(final.httpStatus).to.equal(503)
      expect(final.code).to.equal(undefined)
      expect(isMaintenanceError(final)).to.equal(false)
    })

    it('ignores a non-string code on the frame', () => {
      const frame = { httpStatus: 503, error: 'x', code: 123 as any }
      const reported = peerReportedError(frame, frame.error)
      expect(reported.code).to.equal(undefined)
      expect(isMaintenanceError(asP2pCommandError(reported, 'protocol_failed'))).to.equal(
        false
      )
    })
  })
})
