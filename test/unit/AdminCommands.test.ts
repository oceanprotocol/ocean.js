import { assert, expect } from 'chai'
import { ethers, Wallet } from 'ethers'
import {
  ProviderInstance,
  PROTOCOL_COMMANDS,
  OceanNodeProviderError
} from '../../src/index.js'
import type {
  CollectFeesParams,
  CollectFeesResult,
  IndexingThreadAction,
  NodeAdminJobStatus
} from '../../src/index.js'
import { peerReportedError } from '../../src/services/providers/P2pProvider.js'

const NODE = 'http://127.0.0.1:8001'
// The node peerId the mock STATUS endpoint returns; every signature binds it (anti-replay).
const NODE_PEER_ID = '16Uiu2HAmFm7aTf5Z1yCAQB4CRdSKVSB7rC5jBwVKkkaS5uRtbyG5'
const PEER = NODE_PEER_ID
const TX = '0x' + 'ab'.repeat(32)
const DEST = '0x' + '11'.repeat(20)

interface Captured {
  url: string
  method?: string
  headers?: any
  body?: any
  signal?: any
}

/**
 * Mocks fetch: nonce lookups answer `nonce`, the STATUS peerId round-trip is answered but NOT
 * recorded, every other call is recorded and answered by `reply`.
 */
function mockFetch(
  reply: { ok: boolean; status: number; json?: any; text?: string },
  nonce = 41
): Captured[] {
  const calls: Captured[] = []
  globalThis.fetch = (async (url: string, init?: any) => {
    if (String(url).includes('/api/services/nonce')) {
      return { ok: true, json: async () => ({ nonce }) } as any
    }
    const parsed = init?.body ? JSON.parse(init.body) : undefined
    if (String(url).replace(/\?.*$/, '').replace(/\/+$/, '') === NODE) {
      return { ok: true, status: 200, json: async () => ({ id: NODE_PEER_ID }) } as any
    }
    calls.push({
      url,
      method: init?.method,
      headers: init?.headers,
      body: parsed,
      signal: init?.signal
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

/** Like mockFetch but also records STATUS calls (to prove the token path makes none). */
function mockFetchWithStatusLog(reply: { ok: boolean; status: number; json?: any }): {
  calls: Captured[]
  statusCalls: number
  all: () => number
} {
  const calls: Captured[] = []
  const state = { statusCalls: 0, total: 0 }
  globalThis.fetch = (async (url: string, init?: any) => {
    state.total++
    if (String(url).includes('/api/services/nonce')) {
      return { ok: true, json: async () => ({ nonce: 41 }) } as any
    }
    const parsed = init?.body ? JSON.parse(init.body) : undefined
    if (String(url).replace(/\?.*$/, '').replace(/\/+$/, '') === NODE) {
      state.statusCalls++
      return { ok: true, status: 200, json: async () => ({ id: NODE_PEER_ID }) } as any
    }
    calls.push({ url, method: init?.method, headers: init?.headers, body: parsed })
    return {
      ok: reply.ok,
      status: reply.status,
      json: async () => reply.json,
      text: async () => JSON.stringify(reply.json)
    } as any
  }) as any
  return {
    calls,
    get statusCalls() {
      return state.statusCalls
    },
    all: () => state.total
  }
}

const hashed = (message: string) =>
  ethers.toBeArray(
    ethers.solidityPackedKeccak256(
      ['bytes'],
      [ethers.hexlify(ethers.toUtf8Bytes(message))]
    )
  )

describe('Node admin commands', () => {
  const originalFetch = globalThis.fetch
  const admin = Wallet.createRandom()
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ address: admin.address })).toString(
    'base64url'
  )
  const jwt = `${header}.${payload}.sig`
  const agentSig = { consumerAddress: admin.address, nonce: '7', signature: '0xabc' }

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('constants', () => {
    it('PROTOCOL_COMMANDS carries the literal node command strings', () => {
      expect(PROTOCOL_COMMANDS.STOP_JOB).to.equal('stopJob')
      expect(PROTOCOL_COMMANDS.STOP_NODE).to.equal('stopNode')
      expect(PROTOCOL_COMMANDS.REINDEX_TX).to.equal('reindexTx')
      expect(PROTOCOL_COMMANDS.REINDEX_CHAIN).to.equal('reindexChain')
      expect(PROTOCOL_COMMANDS.HANDLE_INDEXING_THREAD).to.equal('handleIndexingThread')
      expect(PROTOCOL_COMMANDS.COLLECT_FEES).to.equal('collectFees')
      expect(PROTOCOL_COMMANDS.FETCH_CONFIG).to.equal('fetchConfig')
      expect(PROTOCOL_COMMANDS.PUSH_CONFIG).to.equal('pushConfig')
      expect(PROTOCOL_COMMANDS.GET_LOGS).to.equal('getLogs')
      expect(PROTOCOL_COMMANDS.DETAILED_STATUS).to.equal('detailedStatus')
    })

    it('new types are exported from the package root', () => {
      const params: CollectFeesParams = {
        chainId: 8996,
        tokenAddress: ethers.ZeroAddress,
        destinationAddress: DEST
      }
      const res: CollectFeesResult = { tx: TX, message: 'ok' }
      const action: IndexingThreadAction = 'START_THREAD'
      const job: NodeAdminJobStatus = {
        command: 'reindexTx',
        timestamp: '1',
        jobId: '1',
        status: 'ok',
        hash: TX
      }
      expect(params.chainId).to.equal(8996)
      expect(res.tx).to.equal(TX)
      expect(action).to.equal('START_THREAD')
      expect(job.jobId).to.equal('1')
    })
  })

  // name, command, call (given the node + credential), expected params, reply
  interface Row {
    name: string
    command: string
    call: (node: any, cred: any, signal?: AbortSignal) => Promise<any>
    params: Record<string, any>
    reply: { ok: boolean; status: number; json?: any; text?: string }
    expected: any
    mutating: boolean
  }

  const JOB = {
    command: 'reindexTx',
    timestamp: '1',
    jobId: 'j1',
    status: 'PENDING',
    hash: TX
  }
  const rows: Row[] = [
    {
      name: 'stopNode',
      command: 'stopNode',
      call: (n, c, s) => ProviderInstance.stopNode(n, c, s),
      params: {},
      reply: { ok: true, status: 200, text: 'EXIT OK' },
      expected: undefined,
      mutating: true
    },
    {
      name: 'adminStopJob',
      command: 'stopJob',
      call: (n, c, s) => ProviderInstance.adminStopJob(n, c, 'hash-job1', s),
      params: { jobId: 'hash-job1' },
      reply: { ok: true, status: 200, json: { stopped: true } },
      expected: { stopped: true },
      mutating: true
    },
    {
      name: 'reindexTx',
      command: 'reindexTx',
      call: (n, c, s) => ProviderInstance.reindexTx(n, c, 8996, TX, s),
      params: { chainId: 8996, txId: TX },
      reply: { ok: true, status: 200, json: JOB },
      expected: JOB,
      mutating: true
    },
    {
      name: 'reindexChain',
      command: 'reindexChain',
      call: (n, c, s) => ProviderInstance.reindexChain(n, c, 8996, 100, s),
      params: { chainId: 8996, block: 100 },
      reply: { ok: true, status: 200, json: JOB },
      expected: JOB,
      mutating: true
    },
    {
      name: 'handleIndexingThread',
      command: 'handleIndexingThread',
      call: (n, c, s) =>
        ProviderInstance.handleIndexingThread(n, c, 'STOP_THREAD', 8996, s),
      params: { action: 'STOP_THREAD', chainId: 8996 },
      reply: { ok: true, status: 200, text: 'OK' },
      expected: undefined,
      mutating: true
    },
    {
      name: 'collectFees',
      command: 'collectFees',
      call: (n, c, s) =>
        ProviderInstance.collectFees(
          n,
          c,
          {
            chainId: 8996,
            tokenAddress: ethers.ZeroAddress,
            destinationAddress: DEST,
            tokenAmount: '0.5'
          },
          s
        ),
      params: {
        chainId: 8996,
        tokenAddress: ethers.ZeroAddress,
        destinationAddress: DEST,
        tokenAmount: '0.5'
      },
      reply: { ok: true, status: 200, json: { tx: TX, message: 'done' } },
      expected: { tx: TX, message: 'done' },
      mutating: true
    },
    {
      name: 'setNodeConfig',
      command: 'pushConfig',
      call: (n, c, s) => ProviderInstance.setNodeConfig(n, c, { unsafeURLs: [] }, s),
      params: { config: { unsafeURLs: [] } },
      reply: { ok: true, status: 200, json: { unsafeURLs: [] } },
      expected: { unsafeURLs: [] },
      mutating: true
    },
    {
      name: 'getNodeLog',
      command: 'getLogs',
      call: (n, c, s) => ProviderInstance.getNodeLog(n, c, 'log-1', s),
      params: { logId: 'log-1' },
      reply: { ok: true, status: 200, json: { message: 'm' } },
      expected: { message: 'm' },
      mutating: false
    },
    {
      name: 'getNodeConfig',
      command: 'fetchConfig',
      call: (n, c, s) => ProviderInstance.getNodeConfig(n, c, s),
      params: {},
      reply: { ok: true, status: 200, json: { keys: { privateKey: '[hidden]' } } },
      expected: { keys: { privateKey: '[hidden]' } },
      mutating: false
    }
  ]
  const mutatingRows = rows.filter((r) => r.mutating)
  const readOnlyRows = rows.filter((r) => !r.mutating)

  describe('HTTP signed methods', () => {
    for (const row of rows) {
      describe(row.name, () => {
        it('POSTs /directCommand with a peerId-bound signature', async () => {
          const calls = mockFetch(row.reply)
          const res = await row.call(NODE, admin)
          expect(res).to.deep.equal(row.expected)
          expect(calls).to.have.length(1)
          expect(calls[0].method).to.equal('POST')
          expect(calls[0].url).to.equal(NODE + '/directCommand')
          const { body } = calls[0]
          expect(body.command).to.equal(row.command)
          expect(body.address).to.equal(admin.address)
          expect(body.nonce).to.equal('42')
          expect(body.signature).to.be.a('string')
          for (const [k, v] of Object.entries(row.params)) {
            expect(body[k]).to.deep.equal(v)
          }
          expect(Object.keys(body)).to.not.include('node')
          const recovered = ethers.verifyMessage(
            hashed(body.address + body.nonce + row.command + NODE_PEER_ID),
            body.signature
          )
          expect(recovered).to.equal(admin.address)
          // anti-replay: the old unbound message must NOT recover the signer
          const unbound = ethers.verifyMessage(
            hashed(body.address + body.nonce + row.command),
            body.signature
          )
          expect(unbound).to.not.equal(admin.address)
        })

        it('surfaces a node rejection as OceanNodeProviderError', async () => {
          mockFetch({
            ok: false,
            status: 400,
            text: 'Signature check failed: The address which signed the message is not on the allowed admins list'
          })
          try {
            await row.call(NODE, admin)
            assert.fail('should have thrown')
          } catch (e: any) {
            expect(e).to.be.instanceOf(OceanNodeProviderError)
            expect(e.httpStatus).to.equal(400)
            expect(e.message).to.contain('allowed admins list')
          }
        })
      })
    }

    it('wraps a network failure in the generic provider error', async () => {
      globalThis.fetch = (async (url: string) => {
        if (String(url).includes('/api/services/nonce')) {
          return { ok: true, json: async () => ({ nonce: 1 }) } as any
        }
        if (String(url).replace(/\?.*$/, '').replace(/\/+$/, '') === NODE) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: NODE_PEER_ID })
          } as any
        }
        throw new TypeError('fetch failed')
      }) as any
      try {
        await ProviderInstance.getNodeConfig(NODE, admin)
        assert.fail('should have thrown')
      } catch (e: any) {
        expect(e.message).to.equal('HTTP request failed calling Provider')
      }
    })

    it('forwards the abort signal to the POST', async () => {
      const calls = mockFetch({ ok: true, status: 200, json: {} })
      const ac = new AbortController()
      await ProviderInstance.getNodeConfig(NODE, admin, ac.signal)
      expect(calls[0].signal).to.equal(ac.signal)
    })
  })

  describe('HTTP optional parameters', () => {
    const base = {
      chainId: 8996,
      tokenAddress: ethers.ZeroAddress,
      destinationAddress: DEST
    }

    it('collectFees without tokenAmount omits it', async () => {
      const calls = mockFetch({ ok: true, status: 200, json: { tx: TX, message: 'm' } })
      await ProviderInstance.collectFees(NODE, admin, base)
      expect('tokenAmount' in calls[0].body).to.equal(false)
    })

    it('collectFees sends tokenAmount 0 and "0.5" exactly as given', async () => {
      const calls = mockFetch({ ok: true, status: 200, json: { tx: TX, message: 'm' } })
      await ProviderInstance.collectFees(NODE, admin, { ...base, tokenAmount: 0 })
      assert.strictEqual(calls[0].body.tokenAmount, 0)
      await ProviderInstance.collectFees(NODE, admin, { ...base, tokenAmount: '0.5' })
      assert.strictEqual(calls[1].body.tokenAmount, '0.5')
    })

    it('reindexChain omits block when absent and sends block 0', async () => {
      const calls = mockFetch({ ok: true, status: 200, json: JOB })
      await ProviderInstance.reindexChain(NODE, admin, 8996)
      expect('block' in calls[0].body).to.equal(false)
      await ProviderInstance.reindexChain(NODE, admin, 8996, 0)
      assert.strictEqual(calls[1].body.block, 0)
    })

    it('handleIndexingThread omits chainId when absent and sends it when given', async () => {
      const calls = mockFetch({ ok: true, status: 200, text: 'OK' })
      await ProviderInstance.handleIndexingThread(NODE, admin, 'STOP_THREAD')
      expect('chainId' in calls[0].body).to.equal(false)
      await ProviderInstance.handleIndexingThread(NODE, admin, 'STOP_THREAD', 8996)
      assert.strictEqual(calls[1].body.chainId, 8996)
    })
  })

  describe('HTTP auth tokens (read-only vs mutating)', () => {
    for (const row of mutatingRows) {
      it(`${row.name} rejects a string auth token before any fetch`, async () => {
        const m = mockFetchWithStatusLog({ ok: true, status: 200, json: {} })
        try {
          await row.call(NODE, jwt)
          assert.fail('should have thrown')
        } catch (e: any) {
          expect(e.message).to.contain('requires a signer')
        }
        expect(m.calls).to.have.length(0)
        expect(m.statusCalls).to.equal(0)
        expect(m.all()).to.equal(0)
      })
    }

    for (const row of readOnlyRows) {
      it(`${row.name} accepts a scoped auth token via the Authorization header`, async () => {
        const m = mockFetchWithStatusLog(row.reply as any)
        const res = await row.call(NODE, jwt)
        expect(res).to.deep.equal(row.expected)
        expect(m.calls).to.have.length(1)
        expect(m.calls[0].url).to.equal(NODE + '/directCommand')
        expect(m.calls[0].headers.Authorization).to.equal(jwt)
        expect(m.calls[0].body.command).to.equal(row.command)
        expect(m.calls[0].body.signature).to.equal(undefined)
        expect(m.calls[0].body.nonce).to.equal(undefined)
        expect(m.calls[0].body.address).to.equal(admin.address)
        // The `/directCommand` dispatcher authenticates off the body, so the token must ride in
        // the body as `authorization` (not only the header) or the node demands nonce/signature.
        expect(m.calls[0].body.authorization).to.equal(jwt)
        expect(m.statusCalls).to.equal(0)
      })
    }
  })

  describe('P2P', () => {
    async function withStub<T>(
      impl: (...args: any[]) => any,
      fn: (seen: () => any[]) => Promise<T>
    ): Promise<T> {
      const p2p: any = ProviderInstance.getP2PProvider()
      const original = p2p.sendP2pCommand
      let seen: any[] = []
      p2p.sendP2pCommand = async (...args: any[]) => {
        seen = args
        return impl(...args)
      }
      try {
        return await fn(() => seen)
      } finally {
        p2p.sendP2pCommand = original
      }
    }

    for (const row of rows) {
      describe(row.name, () => {
        it('dispatches over sendP2pCommand with the signed payload', async () => {
          await withStub(
            () => ({ ok: 1 }),
            async (seen) => {
              await row.call(PEER, agentSig)
              expect(seen()[0]).to.equal(PEER)
              expect(seen()[1]).to.equal(row.command)
              expect(seen()[2]).to.deep.equal({
                ...row.params,
                address: admin.address,
                nonce: '7',
                signature: '0xabc'
              })
            }
          )
        })

        it('propagates a P2pError from the node', async () => {
          const err = peerReportedError({ httpStatus: 400, error: 'nope' }, 'nope')
          await withStub(
            () => {
              throw err
            },
            async () => {
              try {
                await row.call(PEER, agentSig)
                assert.fail('should have thrown')
              } catch (e: any) {
                expect(e).to.equal(err)
                expect(e.httpStatus).to.equal(400)
              }
            }
          )
        })
      })
    }

    it('decodes raw-bytes replies: handleIndexingThread resolves undefined, helper returns "OK"', async () => {
      await withStub(
        () => new TextEncoder().encode('OK'),
        async () => {
          const res = await ProviderInstance.handleIndexingThread(
            PEER,
            agentSig,
            'START_THREAD'
          )
          expect(res).to.equal(undefined)
          const p2p: any = ProviderInstance.getP2PProvider()
          const raw = await p2p.sendAdminCommand(
            PEER,
            agentSig,
            PROTOCOL_COMMANDS.HANDLE_INDEXING_THREAD,
            { action: 'START_THREAD' }
          )
          expect(raw).to.equal('OK')
        }
      )
    })

    for (const row of mutatingRows) {
      it(`${row.name} rejects a string auth token without calling the transport`, async () => {
        let called = false
        await withStub(
          () => {
            called = true
            return {}
          },
          async () => {
            try {
              await row.call(PEER, jwt)
              assert.fail('should have thrown')
            } catch (e: any) {
              expect(e.message).to.contain('requires a signer')
            }
          }
        )
        expect(called).to.equal(false)
      })
    }

    for (const row of readOnlyRows) {
      it(`${row.name} accepts a string auth token and forwards it`, async () => {
        await withStub(
          () => ({ ok: 1 }),
          async (seen) => {
            await row.call(PEER, jwt)
            expect(seen()[0]).to.equal(PEER)
            expect(seen()[1]).to.equal(row.command)
            expect(seen()[2].signature).to.equal(undefined)
            expect(seen()[2].nonce).to.equal(undefined)
            expect(seen()[2].address).to.equal(admin.address)
            expect(seen()[3]).to.equal(jwt)
          }
        )
      })
    }

    it('collectFees and reindexChain follow the optional-parameter rule', async () => {
      await withStub(
        () => ({}),
        async (seen) => {
          await ProviderInstance.collectFees(PEER, agentSig, {
            chainId: 8996,
            tokenAddress: ethers.ZeroAddress,
            destinationAddress: DEST
          })
          expect('tokenAmount' in seen()[2]).to.equal(false)
          await ProviderInstance.collectFees(PEER, agentSig, {
            chainId: 8996,
            tokenAddress: ethers.ZeroAddress,
            destinationAddress: DEST,
            tokenAmount: 0
          })
          assert.strictEqual(seen()[2].tokenAmount, 0)
          await ProviderInstance.reindexChain(PEER, agentSig, 8996)
          expect('block' in seen()[2]).to.equal(false)
          await ProviderInstance.reindexChain(PEER, agentSig, 8996, 0)
          assert.strictEqual(seen()[2].block, 0)
        }
      )
    })
  })

  describe('getNodeDetailedStatus', () => {
    it('HTTP: one unsigned POST /directCommand and returns the JSON', async () => {
      const detailed = { id: NODE_PEER_ID, maintenance: { enabled: false } }
      const calls = mockFetch({ ok: true, status: 200, json: detailed })
      const res = await ProviderInstance.getNodeDetailedStatus(NODE)
      expect(res).to.deep.equal(detailed)
      expect(calls).to.have.length(1)
      expect(calls[0].method).to.equal('POST')
      expect(calls[0].url).to.equal(NODE + '/directCommand')
      expect(calls[0].body).to.deep.equal({ command: 'detailedStatus' })
    })

    it('HTTP: returns null on a non-ok response', async () => {
      mockFetch({ ok: false, status: 500, json: {} })
      expect(await ProviderInstance.getNodeDetailedStatus(NODE)).to.equal(null)
    })

    it('P2P: sends detailedStatus with a null signer', async () => {
      const p2p: any = ProviderInstance.getP2PProvider()
      const original = p2p.sendP2pCommand
      let seen: any[] = []
      p2p.sendP2pCommand = async (...args: any[]) => {
        seen = args
        return { id: NODE_PEER_ID }
      }
      try {
        const res = await ProviderInstance.getNodeDetailedStatus(PEER)
        expect(res).to.deep.equal({ id: NODE_PEER_ID })
        expect(seen[0]).to.equal(PEER)
        expect(seen[1]).to.equal('detailedStatus')
        expect(seen[3]).to.equal(null)
      } finally {
        p2p.sendP2pCommand = original
      }
    })
  })

  describe('facade dispatch', () => {
    const all: Array<{ name: string; call: (n: any) => Promise<any> }> = [
      ...rows.map((r) => ({ name: r.name, call: (n: any) => r.call(n, agentSig) })),
      {
        name: 'getNodeDetailedStatus',
        call: (n: any) => ProviderInstance.getNodeDetailedStatus(n)
      }
    ]

    it('covers all ten methods', () => {
      expect(all).to.have.length(10)
    })

    for (const m of all) {
      it(`${m.name}: HTTP node never touches the P2P stub`, async () => {
        const p2p: any = ProviderInstance.getP2PProvider()
        const original = p2p.sendP2pCommand
        let p2pCalls = 0
        p2p.sendP2pCommand = async () => {
          p2pCalls++
          return {}
        }
        const calls = mockFetch({ ok: true, status: 200, json: {} })
        try {
          await m.call(NODE)
        } finally {
          p2p.sendP2pCommand = original
        }
        expect(p2pCalls).to.equal(0)
        expect(calls).to.have.length(1)
      })

      it(`${m.name}: P2P peer calls the stub and makes no fetch`, async () => {
        const p2p: any = ProviderInstance.getP2PProvider()
        const original = p2p.sendP2pCommand
        let p2pCalls = 0
        p2p.sendP2pCommand = async () => {
          p2pCalls++
          return {}
        }
        const calls = mockFetch({ ok: true, status: 200, json: {} })
        try {
          await m.call(PEER)
        } finally {
          p2p.sendP2pCommand = original
        }
        expect(p2pCalls).to.equal(1)
        expect(calls).to.have.length(0)
      })
    }
  })

  describe('downloadNodeLogs query encoding', () => {
    it('URL-encodes moduleName', async () => {
      const calls = mockFetch({ ok: true, status: 200, json: [] })
      await ProviderInstance.downloadNodeLogs(NODE, admin, '1', '2', undefined, 'a b&c')
      expect(calls[0].url).to.contain('moduleName=a+b%26c')
      expect(calls[0].url).to.contain('startTime=1&endTime=2')
    })
  })
})
