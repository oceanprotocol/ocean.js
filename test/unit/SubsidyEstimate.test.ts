import { assert } from 'chai'
import { getAddress, parseUnits, Result } from 'ethers'
import type { Signer } from 'ethers'
import {
  estimateJobSubsidy,
  MAX_SUBSIDY_CANDIDATES_QUOTED
} from '../../src/utils/SubsidyEstimate.js'
import { SubsidyView } from '../../src/contracts/SubsidyView.js'
import { EscrowContract } from '../../src/contracts/Escrow.js'
import { SubsidyKind } from '../../src/@types/SubsidyView.js'
import type {
  EstimateJobSubsidyParams,
  JobSubsidyProviderQuote
} from '../../src/@types/SubsidyEstimate.js'

// Hermetic: no chain, no node. The node status / envs come from a fake provider and the
// SubsidyView / EscrowContract reads are stubbed on their prototypes (restored after each test).

const CHAIN = 8996
const DECIMALS = 18
const TOKEN = getAddress('0x00000000000000000000000000000000000000aa')
const PAYEE = getAddress('0x00000000000000000000000000000000000000b1')
const PAYER = getAddress('0x00000000000000000000000000000000000000c1')
const ESCROW = getAddress('0x00000000000000000000000000000000000000e5')
const P1 = getAddress('0x1111111111111111111111111111111111111111')
const P2 = getAddress('0x2222222222222222222222222222222222222222')
const P3 = getAddress('0x3333333333333333333333333333333333333333')
const P4 = getAddress('0x4444444444444444444444444444444444444444')
const IMAGE = 'oceanprotocol/algo'

const eth = (n: number | string) => parseUnits(String(n), DECIMALS)
const num = (s: string) => Number(s)

interface FakeProvider {
  gates?: { node?: boolean | null; user?: boolean | null; job?: boolean | null }
  v2?: boolean
  modes?: { re: number; pre: number }
  v1?: number
  fail?: string
  kind?: SubsidyKind
}

const env = {
  id: 'env-1',
  consumerAddress: PAYEE,
  runningJobs: 0,
  minServiceDuration: 0,
  fees: { [String(CHAIN)]: [{ feeToken: TOKEN, prices: [{ id: 'cpu', price: 1 }] }] }
}

describe('estimateJobSubsidy', () => {
  let behaviours: Record<string, FakeProvider>
  let status: any
  let maxSponsors: number
  let escrowAvailable: bigint
  let lockSubsidyOn: boolean
  let gateCalls: string[]
  let quoteCalls: string[]
  const saved: Array<[any, string, any]> = []

  const stub = (proto: any, name: string, fn: any) => {
    saved.push([proto, name, proto[name]])
    proto[name] = fn
  }
  // the gate reads revert on a provider that does not implement them
  const unsupported = () => Object.assign(new Error('revert'), { code: 'CALL_EXCEPTION' })
  const gate = (key: 'node' | 'user' | 'job') =>
    async function (this: any) {
      gateCalls.push(this.address)
      const b = behaviours[this.address]
      if (b.fail) throw new Error(b.fail)
      const v = b.gates?.[key]
      if (v === null) throw unsupported()
      return v ?? true
    }

  const params = (
    over: Partial<EstimateJobSubsidyParams> = {}
  ): EstimateJobSubsidyParams => ({
    signer: {} as Signer,
    chainId: CHAIN,
    payer: PAYER,
    node: 'http://node.test',
    token: TOKEN,
    environmentId: 'env-1',
    resources: [{ id: 'cpu', amount: 1 }],
    durationSeconds: 600, // 10 minutes * 1 cpu * 1 = cost 10
    jobType: 2,
    container: { image: IMAGE, tag: '1.0' },
    tokenDecimals: DECIMALS,
    provider: {
      getNodeStatus: async () => status,
      getComputeEnvironments: async () => [env]
    } as any,
    ...over
  })

  const find = (providers: JobSubsidyProviderQuote[], address: string) =>
    providers.find((p) => p.address === address)

  beforeEach(() => {
    behaviours = {}
    gateCalls = []
    quoteCalls = []
    maxSponsors = 10
    escrowAvailable = eth(3)
    lockSubsidyOn = true
    status = {
      address: PAYEE,
      escrowAddress: { [String(CHAIN)]: ESCROW },
      subsidyProviders: { [String(CHAIN)]: [P1, P2] },
      subsidyProviderFilter: false
    }
    stub(SubsidyView.prototype, 'isNodeAllowed', gate('node'))
    stub(SubsidyView.prototype, 'isUserAllowed', gate('user'))
    stub(SubsidyView.prototype, 'isJobTypeSubsidized', gate('job'))
    stub(SubsidyView.prototype, 'subsidyKind', async function (this: any) {
      return behaviours[this.address].kind ?? SubsidyKind.ONE_TIME
    })
    stub(SubsidyView.prototype, 'version', async function (this: any) {
      return behaviours[this.address].v2 ? 2 : 1
    })
    stub(SubsidyView.prototype, 'isSubsidyViewV2', async function (this: any) {
      return Boolean(behaviours[this.address].v2)
    })
    stub(SubsidyView.prototype, 'quoteSubsidyModes', async function (this: any) {
      quoteCalls.push(this.address)
      const m = behaviours[this.address].modes
      return [
        { mode: 0, subsidy: String(m.re), bonus: '0' },
        { mode: 1, subsidy: String(m.pre), bonus: '0' }
      ]
    })
    stub(SubsidyView.prototype, 'quoteSubsidy', async function (this: any) {
      quoteCalls.push(this.address)
      return { subsidy: String(behaviours[this.address].v1 ?? 0), bonus: '0' }
    })
    stub(EscrowContract.prototype, 'maxSponsorsPerLock', async () => maxSponsors)
    stub(EscrowContract.prototype, 'getUserFunds', async () =>
      Result.fromItems([escrowAvailable, 0n], ['available', 'locked'])
    )
    stub(EscrowContract.prototype, 'isEscrowLockSubsidy', async () => lockSubsidyOn)
  })

  afterEach(() => {
    while (saved.length) {
      const [proto, name, original] = saved.pop()
      proto[name] = original
    }
  })

  it('computes cost, a v2 and a v1 provider, and both scenarios with per-mode escrow', async () => {
    behaviours[P1] = { v2: true, modes: { re: 6, pre: 8 } }
    behaviours[P2] = { v1: 5 }
    const r = await estimateJobSubsidy(params())

    assert.equal(num(r.cost), 10)
    assert.equal(r.costBaseUnits, eth(10).toString())
    assert.equal(r.minutesBilled, 10)
    assert.equal(r.node, PAYEE)
    assert.equal(r.escrowAddress, ESCROW)
    assert.equal(r.maxSponsorsPerLock, 10)
    assert.equal(num(r.subsidyNeeded), 10)

    const p1 = find(r.providers, P1)
    assert.isTrue(p1.isV2)
    assert.equal(p1.version, 2)
    assert.equal(p1.subsidyKind, SubsidyKind.ONE_TIME)
    assert.equal(num(p1.quotes.reimbursement.subsidy), 6)
    assert.equal(num(p1.quotes.prefunded.subsidy), 8)
    const p2 = find(r.providers, P2)
    assert.isFalse(p2.isV2)
    assert.equal(num(p2.quotes.reimbursement.subsidy), 5)
    assert.equal(num(p2.quotes.prefunded.subsidy), 0) // v1: prefunded leg is 0

    // REIMBURSEMENT: 6 + 5 = 11, capped at the cost of 10; the payer fronts the full cost
    const re = r.scenarios.reimbursement
    assert.deepEqual(re.selected, [P1, P2])
    assert.equal(num(re.projectedTotalSubsidy), 10)
    assert.isTrue(re.meetsSubsidyNeeded)
    assert.equal(num(re.escrowNeeded), 10)
    assert.equal(num(re.escrowAvailable), 3)
    assert.equal(num(re.escrowShortfall), 7)

    // PREFUNDED: only the v2 provider contributes (8); the payer funds the remaining 2
    const pre = r.scenarios.prefunded
    assert.deepEqual(pre.selected, [P1])
    assert.equal(num(pre.projectedTotalSubsidy), 8)
    assert.isFalse(pre.meetsSubsidyNeeded)
    assert.equal(num(pre.escrowNeeded), 2)
    assert.equal(num(pre.escrowShortfall), 0)
  })

  it('stops the greedy fill once subsidyNeeded is covered', async () => {
    behaviours[P1] = { v2: true, modes: { re: 6, pre: 6 } }
    behaviours[P2] = { v2: true, modes: { re: 9, pre: 9 } }
    const r = await estimateJobSubsidy(params({ subsidyNeeded: '5' }))
    assert.deepEqual(r.scenarios.reimbursement.selected, [P2]) // ranked first, covers 5
    assert.isTrue(r.scenarios.reimbursement.meetsSubsidyNeeded)
    assert.equal(num(r.subsidyNeeded), 5)
  })

  describe('candidate set and subsidyProviderFilter', () => {
    beforeEach(() => {
      behaviours[P1] = { v2: true, modes: { re: 1, pre: 1 } }
      behaviours[P2] = { v2: true, modes: { re: 1, pre: 1 } }
      behaviours[P3] = { v2: true, modes: { re: 4, pre: 4 } }
    })

    it('filter on: a custom address outside the advertised set is dropped outside_node_set', async () => {
      status.subsidyProviderFilter = true
      const r = await estimateJobSubsidy(params({ customSubsidyProviders: [P3, P1] }))
      assert.isTrue(r.subsidyProviderFilter)
      const p3 = find(r.providers, P3)
      assert.equal(p3.dropped, 'outside_node_set')
      assert.isFalse(p3.eligible)
      assert.notInclude(r.scenarios.reimbursement.selected, P3)
      // a custom address that IS advertised is simply deduplicated
      assert.equal(r.providers.filter((p) => p.address === P1).length, 1)
    })

    it('filter off: customs are additive with the advertised set', async () => {
      const r = await estimateJobSubsidy(
        params({ customSubsidyProviders: [P3.toLowerCase(), P1] })
      )
      assert.isFalse(r.subsidyProviderFilter)
      assert.isUndefined(find(r.providers, P3).dropped)
      assert.deepEqual(r.scenarios.reimbursement.selected, [P3, P1, P2])
    })

    it('treats an absent filter as off and an absent set as empty', async () => {
      delete status.subsidyProviderFilter
      status.subsidyProviders = undefined
      const r = await estimateJobSubsidy(params({ customSubsidyProviders: [P3] }))
      assert.isFalse(r.subsidyProviderFilter)
      assert.deepEqual(r.scenarios.reimbursement.selected, [P3])
    })

    it('reports an invalid custom address as a dropped error', async () => {
      const r = await estimateJobSubsidy(params({ customSubsidyProviders: ['nope'] }))
      assert.equal(find(r.providers, 'nope').dropped, 'error')
    })
  })

  describe('image gate', () => {
    it('drops a keyed provider whose allowlist excludes the image; keeps unlisted ones', async () => {
      behaviours[P1] = { v2: true, modes: { re: 9, pre: 9 } }
      behaviours[P2] = { v2: true, modes: { re: 1, pre: 1 } }
      status.subsidyProviderAllowedImages = { [P1]: ['other/image:1'] }
      const r = await estimateJobSubsidy(params())
      const p1 = find(r.providers, P1)
      assert.equal(p1.dropped, 'image_not_allowed')
      assert.isFalse(p1.gates.imageAllowed)
      assert.isFalse(p1.eligible)
      assert.deepEqual(r.scenarios.reimbursement.selected, [P2])
      assert.isTrue(find(r.providers, P2).gates.imageAllowed)
    })

    it('keeps a keyed provider whose allowlist matches, and drops it on a custom entrypoint', async () => {
      behaviours[P1] = { v2: true, modes: { re: 9, pre: 9 } }
      behaviours[P2] = { v2: true, modes: { re: 1, pre: 1 } }
      status.subsidyProviderAllowedImages = { [P1]: [`${IMAGE}:1.0`] }
      const ok = await estimateJobSubsidy(params())
      assert.deepEqual(ok.scenarios.reimbursement.selected, [P1, P2])
      const custom = await estimateJobSubsidy(params({ hasCustomEntrypoint: true }))
      assert.equal(find(custom.providers, P1).dropped, 'image_not_allowed')
    })
  })

  describe('gates', () => {
    it('an explicit false disqualifies; null (unknown) does not', async () => {
      behaviours[P1] = { v2: true, modes: { re: 5, pre: 5 }, gates: { node: false } }
      behaviours[P2] = {
        v2: true,
        modes: { re: 5, pre: 5 },
        gates: { node: null, user: null, job: null }
      }
      status.subsidyProviders[String(CHAIN)] = [P1, P2, P3, P4]
      behaviours[P3] = { v2: true, modes: { re: 5, pre: 5 }, gates: { user: false } }
      behaviours[P4] = { v2: true, modes: { re: 5, pre: 5 }, gates: { job: false } }
      const r = await estimateJobSubsidy(params())

      assert.equal(find(r.providers, P1).dropped, 'node_not_allowed')
      assert.equal(find(r.providers, P3).dropped, 'user_not_allowed')
      assert.equal(find(r.providers, P4).dropped, 'job_type_not_subsidized')
      const p2 = find(r.providers, P2)
      assert.isTrue(p2.eligible)
      assert.isUndefined(p2.dropped)
      assert.deepEqual(p2.gates, {
        imageAllowed: true,
        isNodeAllowed: null,
        isUserAllowed: null,
        isJobTypeSubsidized: null
      })
      assert.deepEqual(r.scenarios.reimbursement.selected, [P2])
    })

    it('a genuine RPC failure propagates instead of silently emptying the selection', async () => {
      behaviours[P1] = { v1: 3 }
      behaviours[P2] = { fail: 'rpc exploded' }
      let err: Error
      try {
        await estimateJobSubsidy(params())
      } catch (e) {
        err = e
      }
      assert.include(err?.message, 'rpc exploded')
    })

    it('reports zero_quote, including when a quote method is unsupported by the contract', async () => {
      behaviours[P1] = { v1: 0 }
      behaviours[P2] = { v1: 1 }
      stub(SubsidyView.prototype, 'quoteSubsidy', async function (this: any) {
        if (this.address === P2) throw new TypeError('no such method')
        return { subsidy: '0', bonus: '0' }
      })
      const r = await estimateJobSubsidy(params())
      assert.equal(find(r.providers, P1).dropped, 'zero_quote')
      const p2 = find(r.providers, P2)
      assert.equal(p2.dropped, 'zero_quote')
      assert.deepEqual(r.scenarios.reimbursement.selected, [])
      assert.equal(num(r.scenarios.reimbursement.projectedTotalSubsidy), 0)
      assert.isFalse(r.scenarios.reimbursement.meetsSubsidyNeeded)
      assert.equal(num(r.scenarios.prefunded.escrowNeeded), 10)
    })
  })

  describe('maxSponsorsPerLock', () => {
    it('caps the selection at the on-chain value', async () => {
      maxSponsors = 2
      status.subsidyProviders[String(CHAIN)] = [P1, P2, P3, P4]
      for (const p of [P1, P2, P3, P4])
        behaviours[p] = { v2: true, modes: { re: 1, pre: 1 } }
      const r = await estimateJobSubsidy(params())
      assert.equal(r.maxSponsorsPerLock, 2)
      assert.lengthOf(r.scenarios.reimbursement.selected, 2)
      assert.lengthOf(r.scenarios.prefunded.selected, 2)
      assert.equal(num(r.scenarios.reimbursement.projectedTotalSubsidy), 2)
      assert.isTrue(r.warnings.some((w) => w.includes('maxSponsorsPerLock')))
    })

    it('defaults to 10 when the escrow does not expose it', async () => {
      stub(EscrowContract.prototype, 'maxSponsorsPerLock', async () => {
        throw Object.assign(new Error('revert'), { code: 'CALL_EXCEPTION' })
      })
      behaviours[P1] = { v1: 1 }
      behaviours[P2] = { v1: 1 }
      const r = await estimateJobSubsidy(params())
      assert.equal(r.maxSponsorsPerLock, 10)
    })
  })

  describe('escrow and inputs', () => {
    it('has no shortfall when the payer holds enough', async () => {
      escrowAvailable = eth(25)
      behaviours[P1] = { v2: true, modes: { re: 4, pre: 4 } }
      behaviours[P2] = { v2: true, modes: { re: 0, pre: 0 } }
      const r = await estimateJobSubsidy(params())
      assert.equal(num(r.scenarios.reimbursement.escrowShortfall), 0)
      assert.equal(num(r.scenarios.prefunded.escrowNeeded), 6)
      assert.equal(num(r.scenarios.prefunded.escrowShortfall), 0)
    })

    it('flags unpriced resources and uses the COMPUTE duration floor', async () => {
      behaviours[P1] = { v1: 1 }
      behaviours[P2] = { v1: 1 }
      const computeEnv = { ...env, minJobDuration: 1200 }
      const r = await estimateJobSubsidy(
        params({
          jobType: 1,
          resources: [
            { id: 'cpu', amount: 1 },
            { id: 'gpu', amount: 1 }
          ],
          provider: {
            getNodeStatus: async () => status,
            getComputeEnvironments: async () => [computeEnv]
          } as any
        })
      )
      assert.deepEqual(r.unpricedResourceIds, ['gpu'])
      assert.equal(r.minutesBilled, 20)
      assert.equal(num(r.cost), 20)
      assert.equal(r.minLockSeconds, 1200 + 3600)
    })

    it('throws clear errors for a missing env, fee schedule or escrow address', async () => {
      let err: Error
      try {
        await estimateJobSubsidy(params({ environmentId: 'nope' }))
      } catch (e) {
        err = e
      }
      assert.include(err.message, 'nope')

      try {
        err = undefined
        await estimateJobSubsidy(params({ chainId: 1 }))
      } catch (e) {
        err = e
      }
      assert.include(err.message, 'escrow address')

      status.escrowAddress = { '1': ESCROW }
      try {
        err = undefined
        await estimateJobSubsidy(params({ chainId: 1 }))
      } catch (e) {
        err = e
      }
      assert.include(err.message, 'no fee schedule')
    })
  })
  describe('hardening', () => {
    it('echoes the env feeToken spelling verbatim', async () => {
      behaviours[P1] = { v1: 1 }
      behaviours[P2] = { v1: 1 }
      const lower = TOKEN.toLowerCase()
      const lowerEnv = {
        ...env,
        fees: {
          [String(CHAIN)]: [{ feeToken: lower, prices: [{ id: 'cpu', price: 1 }] }]
        }
      }
      const r = await estimateJobSubsidy(
        params({
          provider: {
            getNodeStatus: async () => status,
            getComputeEnvironments: async () => [lowerEnv]
          } as any
        })
      )
      assert.equal(r.token, lower)
    })

    it('escrow address: matches config ok, mismatch throws, no config warns', async () => {
      behaviours[P1] = { v1: 1 }
      behaviours[P2] = { v1: 1 }
      const ok = await estimateJobSubsidy(params({ config: { escrow: ESCROW } as any }))
      assert.isFalse(ok.warnings.some((w) => w.includes('UNVERIFIED ESCROW')))

      let err: Error
      try {
        await estimateJobSubsidy(params({ config: { escrow: P4 } as any }))
      } catch (e) {
        err = e
      }
      assert.include(err?.message, 'does not match the configured escrow')

      const none = await estimateJobSubsidy(params())
      assert.isTrue(none.warnings.some((w) => w.includes('UNVERIFIED ESCROW')))
    })

    it('bounds the candidates examined and warns on truncation', async () => {
      const many = Array.from({ length: 40 }, (_, i) =>
        getAddress('0x' + (i + 1).toString(16).padStart(40, '0'))
      )
      status.subsidyProviders[String(CHAIN)] = many
      for (const a of many) behaviours[a] = { v1: 1 }
      const r = await estimateJobSubsidy(params())
      assert.equal(r.providers.length, MAX_SUBSIDY_CANDIDATES_QUOTED)
      assert.lengthOf(new Set(quoteCalls), MAX_SUBSIDY_CANDIDATES_QUOTED)
      assert.isTrue(r.warnings.some((w) => w.includes('examination ceiling')))
    })

    it('clamps the selection cap to 10 even if the escrow reports more', async () => {
      maxSponsors = 1000
      behaviours[P1] = { v1: 1 }
      behaviours[P2] = { v1: 1 }
      const r = await estimateJobSubsidy(params())
      assert.equal(r.maxSponsorsPerLock, 10)
    })

    it("accepts jobType 'compute' and still quotes providers", async () => {
      behaviours[P1] = { v2: true, modes: { re: 4, pre: 4 } }
      behaviours[P2] = { v1: 1 }
      const seen: any[] = []
      stub(SubsidyView.prototype, 'isJobTypeSubsidized', async (jt: any) => {
        seen.push(jt)
        return true
      })
      const r = await estimateJobSubsidy(params({ jobType: 'compute' }))
      assert.deepEqual(seen, [1, 1])
      assert.deepEqual(r.scenarios.reimbursement.selected, [P1, P2])
      let err: Error
      try {
        await estimateJobSubsidy(params({ jobType: 'bogus' }))
      } catch (e) {
        err = e
      }
      assert.include(err?.message, 'Invalid jobType')
    })

    it('validates numeric inputs', async () => {
      const bad = async (over: any, text: string) => {
        let err: Error
        try {
          await estimateJobSubsidy(params(over))
        } catch (e) {
          err = e
        }
        assert.include(err?.message, text)
      }
      await bad({ subsidyNeeded: '-1' }, 'subsidyNeeded')
      await bad({ subsidyNeeded: 'abc' }, 'subsidyNeeded')
      await bad({ subsidyNeeded: '1e3' }, 'subsidyNeeded')
      await bad({ subsidyNeeded: '1.' + '1'.repeat(19) }, 'fraction digits')
      await bad({ durationSeconds: 0 }, 'durationSeconds')
      await bad({ durationSeconds: NaN }, 'durationSeconds')
      await bad({ resources: [{ id: 'cpu', amount: -1 }] }, 'amount')
      await bad({ resources: [{ id: 'cpu', amount: Infinity }] }, 'amount')
    })

    it('rejects garbage node addresses with a clear message', async () => {
      status.address = 'garbage'
      let err: Error
      try {
        await estimateJobSubsidy(params())
      } catch (e) {
        err = e
      }
      assert.include(err?.message, 'not a valid address')
      status.address = PAYEE
      status.escrowAddress = { [String(CHAIN)]: 'garbage' }
      try {
        err = undefined
        await estimateJobSubsidy(params())
      } catch (e) {
        err = e
      }
      assert.include(err?.message, 'not a valid address')
    })

    it('treats an env price that is negative as unpriced instead of throwing', async () => {
      behaviours[P1] = { v1: 0 }
      behaviours[P2] = { v1: 0 }
      const badEnv = {
        ...env,
        fees: {
          [String(CHAIN)]: [{ feeToken: TOKEN, prices: [{ id: 'cpu', price: -5 }] }]
        }
      }
      const r = await estimateJobSubsidy(
        params({
          provider: {
            getNodeStatus: async () => status,
            getComputeEnvironments: async () => [badEnv]
          } as any
        })
      )
      assert.deepEqual(r.unpricedResourceIds, ['cpu'])
      assert.equal(num(r.cost), 0)
    })

    it('a REFUND_ONLY-style v2 provider is selected only in the reimbursement scenario', async () => {
      behaviours[P1] = { v2: true, modes: { re: 6, pre: 0 } }
      behaviours[P2] = { v2: true, modes: { re: 0, pre: 0 } }
      const r = await estimateJobSubsidy(params())
      assert.isUndefined(find(r.providers, P1).dropped)
      assert.deepEqual(r.scenarios.reimbursement.selected, [P1])
      assert.deepEqual(r.scenarios.prefunded.selected, [])
      assert.equal(num(r.scenarios.prefunded.escrowNeeded), 10)
    })

    it('never gate-checks or quotes an image-dropped provider', async () => {
      behaviours[P1] = { v2: true, modes: { re: 9, pre: 9 } }
      behaviours[P2] = { v2: true, modes: { re: 1, pre: 1 } }
      status.subsidyProviderAllowedImages = { [P1]: ['other/image:1'] }
      await estimateJobSubsidy(params())
      assert.notInclude(gateCalls, P1)
      assert.notInclude(quoteCalls, P1)
      assert.include(quoteCalls, P2)
    })

    it('resolves token decimals from the chain when tokenDecimals is omitted', async () => {
      behaviours[P1] = { v1: 5 }
      behaviours[P2] = { v1: 0 }
      escrowAvailable = parseUnits('3', 6)
      // minimal ContractRunner answering decimals() = 6
      const runner: any = {
        provider: {},
        call: async () => '0x' + '6'.padStart(64, '0')
      }
      const r = await estimateJobSubsidy(
        params({ signer: runner as Signer, tokenDecimals: undefined })
      )
      assert.equal(r.costBaseUnits, parseUnits('10', 6).toString())
      assert.equal(num(r.scenarios.reimbursement.escrowAvailable), 3)
    })

    it('ignores prefunded quotes when the escrow has no lock-subsidy support', async () => {
      lockSubsidyOn = false
      behaviours[P1] = { v2: true, modes: { re: 6, pre: 8 } }
      behaviours[P2] = { v2: true, modes: { re: 0, pre: 0 } }
      const r = await estimateJobSubsidy(params())
      // reimbursement is unaffected
      assert.deepEqual(r.scenarios.reimbursement.selected, [P1])
      assert.equal(num(r.scenarios.reimbursement.projectedTotalSubsidy), 6)
      // prefunded cannot pre-fund the lock: full cost, nothing selected, warned
      const pre = r.scenarios.prefunded
      assert.deepEqual(pre.selected, [])
      assert.equal(num(pre.projectedTotalSubsidy), 0)
      assert.equal(num(pre.escrowNeeded), 10)
      assert.isTrue(r.warnings.some((w) => w.includes('IEscrowLockSubsidy')))
    })

    it('adds queueMaxWaitTime to minLockSeconds but not to the billed cost', async () => {
      behaviours[P1] = { v1: 1 }
      behaviours[P2] = { v1: 1 }
      const r = await estimateJobSubsidy(params({ queueMaxWaitTime: 300 }))
      // effectiveDuration 600 + queue 300 = 900, padded by max(3600, ceil(0.25*900))
      assert.equal(r.minLockSeconds, 900 + 3600)
      assert.equal(num(r.cost), 10) // cost unchanged
      let err: Error
      try {
        await estimateJobSubsidy(params({ queueMaxWaitTime: -1 }))
      } catch (e) {
        err = e
      }
      assert.include(err?.message, 'queueMaxWaitTime')
    })
  })
})
