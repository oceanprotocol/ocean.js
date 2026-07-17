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
    const decrypted = JSON.parse(
      decrypt(nodeKey.secret, Buffer.from(encryptedHex, 'hex')).toString()
    )
    expect(decrypted).to.deep.equal(userData)
  })
})
