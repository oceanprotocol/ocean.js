import { assert, expect } from 'chai'
import { PrivateKey, decrypt } from 'eciesjs'
import { ProviderInstance, PROTOCOL_COMMANDS } from '../../src/index.js'
import { ServiceStatusNumber } from '../../src/@types/index.js'
import { eciesencrypt } from '../../src/utils/eciesencrypt.js'

describe('Service on Demand client wiring', () => {
  it('protocol command strings match the ocean-node values exactly', () => {
    // These strings are the auth-signed `command` and the P2P dispatch key — they MUST
    // match ocean-node's PROTOCOL_COMMANDS verbatim or signatures/dispatch break.
    expect(PROTOCOL_COMMANDS.SERVICE_GET_TEMPLATES).to.equal('serviceGetTemplates')
    expect(PROTOCOL_COMMANDS.SERVICE_START).to.equal('serviceStart')
    expect(PROTOCOL_COMMANDS.SERVICE_STOP).to.equal('serviceStop')
    expect(PROTOCOL_COMMANDS.SERVICE_RESTART).to.equal('serviceRestart')
    expect(PROTOCOL_COMMANDS.SERVICE_GET_STATUS).to.equal('serviceGetStatus')
    expect(PROTOCOL_COMMANDS.SERVICE_LIST).to.equal('serviceList')
    expect(PROTOCOL_COMMANDS.SERVICE_EXTEND).to.equal('serviceExtend')
  })

  it('ServiceStatusNumber enum mirrors the node status codes', () => {
    expect(ServiceStatusNumber.Starting).to.equal(10)
    expect(ServiceStatusNumber.Running).to.equal(40)
    expect(ServiceStatusNumber.Restarting).to.equal(45)
    expect(ServiceStatusNumber.Stopped).to.equal(70)
    expect(ServiceStatusNumber.Expired).to.equal(75)
    expect(ServiceStatusNumber.Error).to.equal(99)
  })

  it('ProviderInstance exposes the service methods', () => {
    for (const m of [
      'getServiceTemplates',
      'serviceStart',
      'serviceStop',
      'serviceExtend',
      'serviceRestart',
      'getServiceStatus',
      'getServices'
    ]) {
      assert(
        typeof (ProviderInstance as any)[m] === 'function',
        `ProviderInstance.${m} should be a function`
      )
    }
  })

  it('eciesencrypt encrypts userData JSON to a node public key (hex)', () => {
    // userData objects are JSON-stringified then ECIES-encrypted to the node key; the
    // node decrypts the hex with its private key. Verify the round-trip the client relies on.
    const nodeKey = new PrivateKey()
    const userData = { MODEL_ID: 'Qwen/Qwen2.5-7B-Instruct' }
    const encryptedHex = eciesencrypt(nodeKey.publicKey.toHex(), JSON.stringify(userData))
    assert(/^[0-9a-fA-F]+$/.test(encryptedHex), 'encrypted userData should be hex')
    // eciesjs >= 0.5 returns a Uint8Array from decrypt(), not a Buffer
    const decrypted = JSON.parse(
      new TextDecoder().decode(decrypt(nodeKey.secret, Buffer.from(encryptedHex, 'hex')))
    )
    expect(decrypted).to.deep.equal(userData)
  })

  describe('ports forwarding (serviceStart / serviceRestart request body)', () => {
    // An "agent signature" token short-circuits getSignedCommandParams with NO network call,
    // and omitting userData skips the node-public-key fetch — so stubbing global.fetch alone
    // captures the exact request body the provider builds, offline.
    const NODE = 'http://localhost:8000'
    const token = {
      consumerAddress: '0x0000000000000000000000000000000000000aBc',
      nonce: '1',
      signature: '0xsig'
    } as any
    let origFetch: typeof globalThis.fetch
    let captured: any

    beforeEach(() => {
      origFetch = globalThis.fetch
      captured = undefined
      globalThis.fetch = (async (_url: string, init: any) => {
        captured = JSON.parse(init.body)
        return {
          ok: true,
          json: async () => [{ serviceId: 'svc-1' }],
          text: async () => ''
        } as any
      }) as any
    })
    afterEach(() => {
      globalThis.fetch = origFetch
    })

    it('serviceStart forwards `ports` (and still forwards legacy `exposedPorts`)', async () => {
      // No `as any`: a well-typed ServiceStartParams, so this also pins that `ports` is a valid
      // field on the public type (tsx does not type-check, but `npm run build` does).
      await ProviderInstance.serviceStart(NODE, token, {
        environment: 'env-1',
        image: 'nginx',
        duration: 3600,
        payment: { chainId: 8996, token: '0xtoken' },
        exposedPorts: [9090],
        ports: [{ containerPort: 8080, hostPort: 30010 }, { containerPort: 8081 }]
      })
      expect(captured.ports).to.deep.equal([
        { containerPort: 8080, hostPort: 30010 },
        { containerPort: 8081 }
      ])
      expect(captured.exposedPorts).to.deep.equal([9090]) // legacy field still passes through
    })

    it('serviceRestart forwards `ports` when supplied (alongside other fields)', async () => {
      await ProviderInstance.serviceRestart(NODE, token, 'svc-1', {
        ports: [{ containerPort: 8080, hostPort: 30011 }],
        metadata: { run: 'v2' },
        dockerCmd: ['nginx', '-g', 'daemon off;']
      })
      expect(captured.ports).to.deep.equal([{ containerPort: 8080, hostPort: 30011 }])
      // the new spread must not disturb its neighbours
      expect(captured.metadata).to.deep.equal({ run: 'v2' })
      expect(captured.dockerCmd).to.deep.equal(['nginx', '-g', 'daemon off;'])
    })

    it('serviceRestart forwards an explicit empty `ports: []` (replace-with-none, not omit)', async () => {
      // Contract: `[] !== undefined`, so it IS sent — the node treats it as "no ports", distinct
      // from omitting `ports` (keep current). Guards against a truthiness-based simplification.
      await ProviderInstance.serviceRestart(NODE, token, 'svc-1', { ports: [] })
      expect(captured.ports).to.deep.equal([])
    })

    it('serviceRestart omits `ports` when not supplied (REUSE keeps current ports)', async () => {
      await ProviderInstance.serviceRestart(NODE, token, 'svc-1', {})
      expect(captured).to.not.have.property('ports')
    })

    it('serviceRestart never forwards the legacy `exposedPorts` (node ignores it on restart)', async () => {
      // `as any`: `exposedPorts` is intentionally OFF-type for ServiceRestartParams — the SDK
      // must drop it even if a caller forces it through.
      await ProviderInstance.serviceRestart(NODE, token, 'svc-1', {
        exposedPorts: [9090]
      } as any)
      expect(captured).to.not.have.property('exposedPorts')
      expect(captured).to.not.have.property('ports')
    })
  })
})
