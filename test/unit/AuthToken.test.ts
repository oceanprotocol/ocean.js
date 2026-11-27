import { expect } from 'chai'
import {
  buildCreateAuthTokenSignatureMessage,
  AUTH_TOKEN_VERSION
} from '../../src/utils/SignatureUtils.js'
import { prepareAuthTokenRequest } from '../../src/utils/AuthToken.js'
import { COMMANDS, listScopableCommands } from '../../src/utils/CommandCatalog.js'
import { STATUS_CHALLENGE_DOMAIN } from '../../src/utils/NodeIdentity.js'
import {
  PROTOCOL_COMMANDS,
  TOKEN_SCOPE_DISALLOWED,
  UNRESTRICTED_AUDIENCE
} from '../../src/@types/Provider.js'

// ──────────────────────────────────────────────────────────────────────────────────────────
// GOLDEN VECTORS — byte-identical to the ocean-node test `scopedAuthToken.test.ts`. If one byte
// changes here, change both repos (shared wire contract, plan §3.2 / §5).
// ──────────────────────────────────────────────────────────────────────────────────────────
const V = {
  ADDR: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  NONCE: '42',
  PEER: '16Uiu2HAmTEST',
  EXP: 1893456000000
}
const GOLDEN = {
  expOnly:
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc242createAuthToken16Uiu2HAmTEST|v:2|aud:|cmd:|exp:1893456000000',
  audOnly:
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc242createAuthToken16Uiu2HAmTEST|v:2|aud:16Uiu2HAmAAA,16Uiu2HAmBBB|cmd:|exp:1893456000000',
  scopeOnly:
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc242createAuthToken16Uiu2HAmTEST|v:2|aud:|cmd:download,query|exp:1893456000000',
  bothDedup:
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc242createAuthToken16Uiu2HAmTEST|v:2|aud:16Uiu2HAmAAA,16Uiu2HAmBBB|cmd:download,startCompute|exp:1893456000000',
  single:
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc242createAuthToken16Uiu2HAmTEST|v:2|aud:16Uiu2HAmONLY|cmd:download|exp:1893456000000'
}

describe('scoped auth token — signed message (golden vectors)', () => {
  const base = {
    address: V.ADDR,
    nonce: V.NONCE,
    issuerPeerId: V.PEER,
    validUntil: V.EXP
  }

  it('exp only', () => {
    expect(buildCreateAuthTokenSignatureMessage({ ...base })).to.equal(GOLDEN.expOnly)
  })
  it('audience only — dedup + sort', () => {
    expect(
      buildCreateAuthTokenSignatureMessage({
        ...base,
        audience: ['16Uiu2HAmBBB', '16Uiu2HAmAAA']
      })
    ).to.equal(GOLDEN.audOnly)
  })
  it('scope only — sort order', () => {
    expect(
      buildCreateAuthTokenSignatureMessage({ ...base, scope: ['query', 'download'] })
    ).to.equal(GOLDEN.scopeOnly)
  })
  it('both, with dedup', () => {
    expect(
      buildCreateAuthTokenSignatureMessage({
        ...base,
        audience: ['16Uiu2HAmBBB', '16Uiu2HAmAAA', '16Uiu2HAmBBB'],
        scope: ['startCompute', 'download', 'download']
      })
    ).to.equal(GOLDEN.bothDedup)
  })
  it('single element each', () => {
    expect(
      buildCreateAuthTokenSignatureMessage({
        ...base,
        audience: ['16Uiu2HAmONLY'],
        scope: ['download']
      })
    ).to.equal(GOLDEN.single)
  })
  it('AUTH_TOKEN_VERSION is 2', () => {
    expect(AUTH_TOKEN_VERSION).to.equal(2)
  })
  it('STATUS_CHALLENGE_DOMAIN matches the shared contract', () => {
    expect(STATUS_CHALLENGE_DOMAIN).to.equal('ocean-node-status-challenge-v1:')
  })
})

describe('prepareAuthTokenRequest', () => {
  const issuerPeerId = '16Uiu2HAmISSUER'
  const base = { consumerAddress: V.ADDR, nonce: '7', issuerPeerId }

  it('defaults audience to [issuer] (node-scoped) and requires validUntil', () => {
    expect(() => prepareAuthTokenRequest({ ...base })).to.throw(/validUntil is required/)
  })

  it('node-scoped happy path signs a v2 message with the issuer audience', () => {
    const vu = Date.now() + 60_000
    const prepared = prepareAuthTokenRequest({
      ...base,
      options: { validUntil: vu }
    })
    expect(prepared.isV2).to.equal(true)
    expect(prepared.body.audience).to.deep.equal([issuerPeerId])
    expect(prepared.body.validUntil).to.equal(vu)
    expect(prepared.message).to.contain('|aud:' + issuerPeerId + '|')
  })

  it('unrestricted sentinel omits audience from message and body', () => {
    const vu = Date.now() + 60_000
    const prepared = prepareAuthTokenRequest({
      ...base,
      options: { audience: UNRESTRICTED_AUDIENCE, validUntil: vu }
    })
    expect(prepared.body.audience).to.equal(undefined)
    expect(prepared.message).to.contain('|aud:|')
  })

  it('requires validUntil even for the unrestricted case (always v2)', () => {
    expect(() =>
      prepareAuthTokenRequest({
        ...base,
        options: { audience: UNRESTRICTED_AUDIENCE }
      })
    ).to.throw(/validUntil is required/)
  })

  it('rejects a validUntil beyond the node maxTokenLifetime (reject, not warn)', () => {
    expect(() =>
      prepareAuthTokenRequest({
        ...base,
        maxTokenLifetime: 3600, // 1h
        options: { validUntil: Date.now() + 100 * 24 * 60 * 60_000 } // 100 days
      })
    ).to.throw(/maxTokenLifetime/)
  })

  it('snapshots audience/scope so later caller mutation cannot change the body', () => {
    const vu = Date.now() + 60_000
    const audience = ['16Uiu2HAmA', '16Uiu2HAmB']
    const scope = ['download']
    const prepared = prepareAuthTokenRequest({
      ...base,
      options: { audience, scope, validUntil: vu }
    })
    audience.push('16Uiu2HAmEVIL')
    scope.push('startCompute')
    expect(prepared.body.audience).to.deep.equal(['16Uiu2HAmA', '16Uiu2HAmB'])
    expect(prepared.body.scope).to.deep.equal(['download'])
  })

  it('rejects an explicit empty audience / scope', () => {
    const vu = Date.now() + 60_000
    expect(() =>
      prepareAuthTokenRequest({ ...base, options: { audience: [], validUntil: vu } })
    ).to.throw(/empty audience/)
    expect(() =>
      prepareAuthTokenRequest({ ...base, options: { scope: [], validUntil: vu } })
    ).to.throw(/empty scope/)
  })

  it('rejects a disallowed scope command', () => {
    const vu = Date.now() + 60_000
    expect(() =>
      prepareAuthTokenRequest({
        ...base,
        options: { scope: [PROTOCOL_COMMANDS.DECRYPT_DDO], validUntil: vu }
      })
    ).to.throw(/not allowed in an auth-token scope/)
    expect(() =>
      prepareAuthTokenRequest({
        ...base,
        options: { scope: [PROTOCOL_COMMANDS.STOP_NODE], validUntil: vu }
      })
    ).to.throw(/not allowed/)
  })

  it('accepts read-only admin commands in scope', () => {
    const vu = Date.now() + 60_000
    const prepared = prepareAuthTokenRequest({
      ...base,
      options: {
        scope: [PROTOCOL_COMMANDS.GET_LOGS, PROTOCOL_COMMANDS.FETCH_CONFIG],
        validUntil: vu
      }
    })
    expect(prepared.body.scope).to.have.members([
      PROTOCOL_COMMANDS.GET_LOGS,
      PROTOCOL_COMMANDS.FETCH_CONFIG
    ])
  })

  it('rejects a past validUntil', () => {
    expect(() =>
      prepareAuthTokenRequest({ ...base, options: { validUntil: Date.now() - 1000 } })
    ).to.throw(/future/)
  })
})

describe('command catalog', () => {
  it('marks decryptDDO + mutating admin as not scopable, read-only admin as scopable', () => {
    expect(COMMANDS[PROTOCOL_COMMANDS.DECRYPT_DDO].scopable).to.equal(false)
    expect(COMMANDS[PROTOCOL_COMMANDS.STOP_NODE].scopable).to.equal(false)
    expect(COMMANDS[PROTOCOL_COMMANDS.GET_LOGS].scopable).to.equal(true)
    expect(COMMANDS[PROTOCOL_COMMANDS.GET_LOGS].adminReadonly).to.equal(true)
    expect(COMMANDS[PROTOCOL_COMMANDS.FETCH_CONFIG].scopable).to.equal(true)
    expect(COMMANDS[PROTOCOL_COMMANDS.DOWNLOAD].scopable).to.equal(true)
  })
  it('marks decryptDDO + mutating admin + auth-mgmt as tokenAuth:false', () => {
    expect(COMMANDS[PROTOCOL_COMMANDS.DECRYPT_DDO].tokenAuth).to.equal(false)
    expect(COMMANDS[PROTOCOL_COMMANDS.STOP_NODE].tokenAuth).to.equal(false)
    expect(COMMANDS[PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN].tokenAuth).to.equal(false)
    expect(COMMANDS[PROTOCOL_COMMANDS.INVALIDATE_AUTH_TOKEN].tokenAuth).to.equal(false)
    expect(COMMANDS[PROTOCOL_COMMANDS.VALIDATE_AUTH_TOKEN].tokenAuth).to.equal(false)
    expect(COMMANDS[PROTOCOL_COMMANDS.DOWNLOAD].tokenAuth).to.equal(true)
  })
  it('TOKEN_SCOPE_DISALLOWED and listScopableCommands are consistent', () => {
    const scopable = listScopableCommands().map((c) => c.command)
    for (const d of TOKEN_SCOPE_DISALLOWED) {
      expect(scopable).to.not.include(d)
    }
    expect(scopable).to.include(PROTOCOL_COMMANDS.DOWNLOAD)
  })
})
