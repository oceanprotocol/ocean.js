import { readFileSync } from 'fs'
import { expect } from 'chai'
import {
  assertSingleGpuGroup,
  deriveGpuLayouts,
  estimateHfSizingProfile,
  gpuFloorGb,
  GpuResourceRequirement,
  grantableAmount,
  isPooledGpuResource,
  legalTpWidths,
  parseMemoryTotalBytes,
  planGpuLayouts,
  sizeSharedResources,
  validateGpuPlan,
  validateGpuSizingProfile
} from '../../src/utils/ServiceResources.js'
import {
  ComputeResource,
  GpuSizingProfile,
  TemplateResourceRequirement
} from '../../src/@types/index.js'

// Shared with ocean-node-templates (copied verbatim there): see the file's $comment.
const SIZING_VECTORS: {
  vectors: Array<{
    name: string
    profile: GpuSizingProfile
    floors: Record<string, number>
    expected: GpuResourceRequirement
  }>
  invalid: Array<{ name: string; profile: GpuSizingProfile }>
} = JSON.parse(
  // fixed fixture path next to this file
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  readFileSync(new URL('./fixtures/gpu-sizing-vectors.json', import.meta.url), 'utf8')
)

/**
 * Conformance fixtures for the service-template GPU-layout planner. The env walkthrough
 * tables are the agreed contract (requirements-vram-FINAL "Env walkthrough"): every client
 * (dashboard, CLI) plans with these functions, so a row changing here is a behaviour change
 * for all of them.
 */

const H200 = { description: 'NVIDIA H200', memoryTotal: '143771 MiB' }
const H100 = { description: 'NVIDIA H100 80GB HBM3', memoryTotal: '81559 MiB' }
const L4 = { description: 'NVIDIA L4', memoryTotal: '23034 MiB' }
const L40S = { description: 'NVIDIA L40S', memoryTotal: '46068 MiB' }

// n single-card GPU resources, min 0 / max = total 1 per id; `busy` ids are in use.
function cards(
  n: number,
  card: { description?: string; memoryTotal?: string },
  prefix = 'gpu',
  busy: number[] = []
): ComputeResource[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    type: 'gpu',
    kind: 'discrete',
    total: 1,
    max: 1,
    min: 0,
    inUse: busy.includes(i) ? 1 : 0,
    ...card
  }))
}

const gpu = (
  recommended: number,
  layouts: Array<[number, number?]>
): GpuResourceRequirement => ({
  kind: 'discrete',
  type: 'gpu',
  recommended,
  unit: 'GB',
  layouts: layouts.map(([gpuCount, vramPerGpu]) =>
    vramPerGpu === undefined ? { gpuCount } : { gpuCount, vramPerGpu }
  )
})

const MUSIC = gpu(141, [[1]])
const PRIVATE = gpu(48, [[1]])
const GLM = gpu(564, [
  [4, 141],
  [8, 80]
])
const QWEN_NEXT = gpu(564, [
  [2, 282],
  [4, 141],
  [8, 141]
])
const DEEPSEEK = gpu(564, [
  [2, 282],
  [4, 141],
  [8, 80]
])
const KIMI = gpu(1040, [[8, 130]])

const fees = (resources: ComputeResource[], price = 1): Record<string, number> =>
  Object.fromEntries(resources.map((r) => [r.id, price]))

// gpuCount of every candidate, in planner order (best first)
const widths = (
  gpuResources: ComputeResource[],
  requirement: GpuResourceRequirement,
  forcedGpuCount?: number
): number[] =>
  planGpuLayouts({
    gpuResources,
    requirement,
    fees: fees(gpuResources),
    forcedGpuCount
  }).map((c) => c.layout.gpuCount)

describe('ServiceResources', () => {
  describe('parseMemoryTotalBytes', () => {
    it('parses the walkthrough cards exactly', () => {
      expect(parseMemoryTotalBytes('143771 MiB')).to.equal(150754820096)
      expect(parseMemoryTotalBytes('81559 MiB')).to.equal(85520809984)
      expect(parseMemoryTotalBytes('23034 MiB')).to.equal(24152899584)
    })

    it('accepts decimal and binary units, any case, optional space, bare bytes', () => {
      expect(parseMemoryTotalBytes('16 GiB')).to.equal(16 * 1024 ** 3)
      expect(parseMemoryTotalBytes('8GB')).to.equal(8e9)
      expect(parseMemoryTotalBytes('8gb')).to.equal(8e9)
      expect(parseMemoryTotalBytes('1.5 TB')).to.equal(1.5e12)
      expect(parseMemoryTotalBytes('2 TiB')).to.equal(2 * 1024 ** 4)
      expect(parseMemoryTotalBytes('512 KiB')).to.equal(512 * 1024)
      expect(parseMemoryTotalBytes('3 kb')).to.equal(3000)
      expect(parseMemoryTotalBytes('7 MB')).to.equal(7e6)
      expect(parseMemoryTotalBytes('1024')).to.equal(1024)
      expect(parseMemoryTotalBytes('100 B')).to.equal(100)
      expect(parseMemoryTotalBytes('  80 GB  ')).to.equal(80e9)
    })

    it('returns undefined for absent, unparseable or non-positive input', () => {
      for (const bad of [
        undefined,
        '',
        '   ',
        'lots',
        '0 MiB',
        '0',
        '-5 GB',
        '5 PB',
        'GB 5',
        '1e3 GB',
        '80 GB HBM3'
      ]) {
        expect(parseMemoryTotalBytes(bad), String(bad)).to.equal(undefined)
      }
    })
  })

  describe('grantableAmount', () => {
    it('is max(0, min(max, total - inUse)), legacy total falls back to max', () => {
      expect(grantableAmount({ id: 'g', max: 1, total: 1, inUse: 0 })).to.equal(1)
      expect(grantableAmount({ id: 'g', max: 1, total: 1, inUse: 1 })).to.equal(0)
      expect(grantableAmount({ id: 'g', max: 4, total: 8, inUse: 2 })).to.equal(4)
      expect(grantableAmount({ id: 'g', max: 8, total: 8, inUse: 6 })).to.equal(2)
      expect(grantableAmount({ id: 'g', max: 3 })).to.equal(3)
      expect(grantableAmount({ id: 'g', max: 3, total: 0 })).to.equal(0)
      expect(grantableAmount({ id: 'g', max: 1, total: 1, inUse: 5 })).to.equal(0)
    })
  })

  describe('planGpuLayouts: env walkthrough', () => {
    const envs: Record<string, ComputeResource[]> = {
      '1xH200': cards(1, H200),
      '7xH200': cards(7, H200, 'gpu', [0]),
      '8xH100': cards(8, H100),
      '2xL4': cards(2, L4)
    }
    // best candidate's gpuCount per requirement; null = environment hidden
    const expected: Record<string, Record<string, number | null>> = {
      '1xH200': { music: 1, private: 1, glm: null, qwen: null, deepseek: null },
      '7xH200': { music: 1, private: 1, glm: 4, qwen: 4, deepseek: 4 },
      '8xH100': { music: null, private: 1, glm: 8, qwen: null, deepseek: 8 },
      '2xL4': { music: null, private: null, glm: null, qwen: null, deepseek: null }
    }
    const reqs: Record<string, GpuResourceRequirement> = {
      music: MUSIC,
      private: PRIVATE,
      glm: GLM,
      qwen: QWEN_NEXT,
      deepseek: DEEPSEEK
    }

    for (const [envName, row] of Object.entries(expected)) {
      for (const [reqName, want] of Object.entries(row)) {
        it(`${envName} / ${reqName} -> ${want === null ? 'none' : want}`, () => {
          const resources = envs[envName]
          const got = planGpuLayouts({
            gpuResources: resources,
            requirement: reqs[reqName],
            fees: fees(resources)
          })
          if (want === null) {
            expect(got).to.deep.equal([])
            return
          }
          // exactly one declared layout is feasible in every walkthrough cell
          expect(got.map((c) => c.layout.gpuCount)).to.deep.equal([want])
          const [best] = got
          expect(best.gpuRequests).to.have.length(want)
          expect(best.gpuRequests.every((r) => r.amount === 1)).to.equal(true)
          expect(best.gpuPrice).to.equal(want)
          expect(best.perCardBytes).to.equal(
            parseMemoryTotalBytes(resources[0].memoryTotal)
          )
          // never books a card that is already in use
          const busy = resources.filter((r) => r.inUse).map((r) => r.id)
          expect(best.gpuRequests.some((r) => busy.includes(r.id))).to.equal(false)
        })
      }
    }

    it('7xH200 books one card for music (6 free) and 4 for GLM (3 free), cheapest ids first', () => {
      const resources = envs['7xH200']
      const [music] = planGpuLayouts({
        gpuResources: resources,
        requirement: MUSIC,
        fees: fees(resources)
      })
      expect(music.gpuRequests).to.deep.equal([{ id: 'gpu1', amount: 1 }])
      const [glm] = planGpuLayouts({
        gpuResources: resources,
        requirement: GLM,
        fees: fees(resources)
      })
      expect(glm.layout).to.deep.equal({ gpuCount: 4, vramPerGpu: 141 })
      expect(glm.gpuRequests.map((r) => r.id)).to.deep.equal([
        'gpu1',
        'gpu2',
        'gpu3',
        'gpu4'
      ])
    })

    it('2xL4 never pools two 24 GB cards for a 48 GB one-device recommendation', () => {
      // 2 x 24.15 GB = 48.3 GB passes aggregate arithmetic, but TP1 cannot pool cards
      expect(widths(envs['2xL4'], PRIVATE)).to.deep.equal([])
    })

    it('8xH200 Qwen exposes both 4x141 (default, cheaper) and 8x141 TEP8', () => {
      const resources = cards(8, H200)
      const got = planGpuLayouts({
        gpuResources: resources,
        requirement: QWEN_NEXT,
        fees: fees(resources)
      })
      expect(got.map((c) => [c.layout.gpuCount, c.gpuPrice])).to.deep.equal([
        [4, 4],
        [8, 8]
      ])
    })

    it('Kimi 1040 [8x130] on 7xH200 is hidden although 7 x 150.75 GB > 1040 GB', () => {
      expect(widths(envs['7xH200'], KIMI)).to.deep.equal([])
      expect(widths(cards(8, H200), KIMI)).to.deep.equal([8])
    })
  })

  describe('planGpuLayouts: rules', () => {
    it('no GPU requirement -> one candidate with no GPU requests', () => {
      expect(planGpuLayouts({ gpuResources: cards(8, H100) })).to.deep.equal([
        { layout: null, groupKey: null, gpuRequests: [], gpuPrice: 0, perCardBytes: null }
      ])
    })

    it('forcedGpuCount keeps only the declared layout of that width', () => {
      const h200x8 = cards(8, H200)
      expect(widths(h200x8, QWEN_NEXT, 8)).to.deep.equal([8])
      expect(widths(h200x8, QWEN_NEXT, 4)).to.deep.equal([4])
      expect(widths(h200x8, QWEN_NEXT, 2)).to.deep.equal([]) // declared, but 150.75 < 282
      expect(widths(h200x8, QWEN_NEXT, 16)).to.deep.equal([]) // not declared
      expect(widths(h200x8, QWEN_NEXT, 6)).to.deep.equal([]) // not declared
      expect(widths(cards(8, H100), GLM, 4)).to.deep.equal([]) // 85.52 < 141
      expect(widths(cards(8, H100), GLM, 8)).to.deep.equal([8])
    })

    it('a group with any member of unknown memory is ineligible', () => {
      const resources = [
        ...cards(7, H200),
        { ...cards(1, { description: H200.description }, 'x')[0] }
      ]
      expect(widths(resources, MUSIC)).to.deep.equal([])
      expect(widths(cards(2, { description: 'Mystery GPU' }), PRIVATE)).to.deep.equal([])
      expect(
        widths(cards(2, { description: 'Mystery GPU', memoryTotal: 'lots' }), PRIVATE)
      ).to.deep.equal([])
    })

    it('an ineligible group does not hide an eligible one', () => {
      const resources = [
        ...cards(1, { description: 'Mystery GPU' }, 'm'),
        ...cards(1, H200)
      ]
      const got = planGpuLayouts({ gpuResources: resources, requirement: PRIVATE })
      expect(got).to.have.length(1)
      expect(got[0].groupKey).to.equal('NVIDIA H200')
      expect(got[0].gpuRequests).to.deep.equal([{ id: 'gpu0', amount: 1 }])
    })

    it('uses the smallest member memory as the group per-card bytes', () => {
      const resources = [
        ...cards(1, H200),
        ...cards(1, { description: H200.description, memoryTotal: '80 GB' }, 'small')
      ]
      const got = planGpuLayouts({ gpuResources: resources, requirement: MUSIC })
      expect(got).to.deep.equal([])
      const [p] = planGpuLayouts({ gpuResources: resources, requirement: PRIVATE })
      expect(p.perCardBytes).to.equal(80e9)
    })

    it('never mixes GPU groups to reach a width', () => {
      const req = gpu(48, [[1], [2, 24]])
      const resources = [...cards(1, H200, 'h'), ...cards(1, L4, 'l')]
      const got = planGpuLayouts({ gpuResources: resources, requirement: req })
      expect(got.map((c) => [c.groupKey, c.layout.gpuCount])).to.deep.equal([
        ['NVIDIA H200', 1]
      ])
      // with two L4s the 2x24 layout becomes feasible inside the L4 group
      const twoL4 = planGpuLayouts({ gpuResources: cards(2, L4), requirement: req })
      expect(twoL4.map((c) => c.layout.gpuCount)).to.deep.equal([2])
    })

    it('compares bytes against ceil(GB * 1e9) with no slack', () => {
      const card = (memoryTotal: string) => cards(1, { description: 'G', memoryTotal })
      expect(widths(card('48000000000'), PRIVATE)).to.deep.equal([1])
      expect(widths(card('47999999999'), PRIVATE)).to.deep.equal([])
      expect(widths(card('48 GB'), PRIVATE)).to.deep.equal([1])
      expect(widths(card('44.7 GiB'), PRIVATE)).to.deep.equal([]) // 47.996 GB
    })

    it('selects the cheapest ids by per-id fee, ties by id, and prices the exact ids', () => {
      const resources = cards(4, H200, 'gpu')
      const perId = { gpu0: 3, gpu1: 1, gpu2: 2, gpu3: 1 }
      const [one] = planGpuLayouts({
        gpuResources: resources,
        requirement: MUSIC,
        fees: perId
      })
      expect(one.gpuRequests).to.deep.equal([{ id: 'gpu1', amount: 1 }])
      expect(one.gpuPrice).to.equal(1)
      const [two] = planGpuLayouts({
        gpuResources: resources,
        requirement: gpu(282, [[2, 141]]),
        fees: perId
      })
      expect(two.gpuRequests).to.deep.equal([
        { id: 'gpu1', amount: 1 },
        { id: 'gpu3', amount: 1 }
      ])
      expect(two.gpuPrice).to.equal(2)
    })

    it('ranks candidates by actual price before width and group', () => {
      const req = gpu(48, [[1]])
      const resources = [...cards(1, H200, 'h'), ...cards(1, H100, 'c')]
      const got = planGpuLayouts({
        gpuResources: resources,
        requirement: req,
        fees: { h0: 5, c0: 2 }
      })
      expect(got.map((c) => [c.groupKey, c.gpuPrice])).to.deep.equal([
        ['NVIDIA H100 80GB HBM3', 2],
        ['NVIDIA H200', 5]
      ])
      // equal prices: narrower first, then group key
      const tie = planGpuLayouts({
        gpuResources: resources,
        requirement: req,
        fees: { h0: 1, c0: 1 }
      })
      expect(tie.map((c) => c.groupKey)).to.deep.equal([
        'NVIDIA H100 80GB HBM3',
        'NVIDIA H200'
      ])
    })

    it('books a pooled resource only whole: 2-of-8 is never offered, whole 8 is', () => {
      const pooled: ComputeResource = {
        id: 'gpu',
        type: 'gpu',
        total: 8,
        max: 8,
        min: 0,
        inUse: 0,
        ...H100
      }
      expect(isPooledGpuResource(pooled)).to.equal(true)
      expect(isPooledGpuResource(cards(1, H100)[0])).to.equal(false)
      const req = gpu(160, [
        [2, 80],
        [8, 20]
      ])
      const got = planGpuLayouts({
        gpuResources: [pooled],
        requirement: req,
        fees: { gpu: 2 }
      })
      // the node would hand all 8 DeviceIDs to a 2-GPU booking: only the whole pool is offered
      expect(got).to.have.length(1)
      expect(got[0].layout).to.deep.equal({ gpuCount: 8, vramPerGpu: 20 })
      expect(got[0].gpuRequests).to.deep.equal([{ id: 'gpu', amount: 8 }])
      expect(got[0].gpuPrice).to.equal(16)
      expect(widths([pooled], req, 2)).to.deep.equal([])
      // a partly used pool cannot be booked at all
      expect(widths([{ ...pooled, inUse: 3 }], req)).to.deep.equal([])
      // nor one whose per-job max is below its total; legacy (no total) uses max as the size
      expect(widths([{ ...pooled, max: 4 }], req)).to.deep.equal([])
      expect(widths([{ ...pooled, total: undefined }], req)).to.deep.equal([8])
    })

    it('fills small widths from single cards and takes a same-group pool whole', () => {
      const pooled: ComputeResource = {
        id: 'pool',
        type: 'gpu',
        total: 8,
        max: 8,
        min: 0,
        inUse: 0,
        ...H100
      }
      const resources = [pooled, ...cards(2, H100, 'single')]
      const got = planGpuLayouts({
        gpuResources: resources,
        requirement: gpu(160, [
          [2, 80],
          [8, 20]
        ])
      })
      expect(got.map((c) => c.gpuRequests)).to.deep.equal([
        [
          { id: 'single0', amount: 1 },
          { id: 'single1', amount: 1 }
        ],
        [{ id: 'pool', amount: 8 }]
      ])
    })

    it('a mandatory pool (min > 0) must be booked whole', () => {
      const pooled: ComputeResource = {
        id: 'pool',
        type: 'gpu',
        total: 4,
        max: 4,
        min: 1,
        inUse: 0,
        ...H200
      }
      const req = gpu(141, [[1], [4, 141]])
      expect(widths([pooled], req)).to.deep.equal([4])
    })

    const pool = (id: string, size: number): ComputeResource => ({
      id,
      type: 'gpu',
      total: size,
      max: size,
      min: 0,
      inUse: 0,
      ...H200
    })

    it('picks the cheapest exact combination when a pool is cheaper than single cards', () => {
      // a single card at 0.9 is the cheapest unit, but a + c costs 100.9; the whole pool costs 2
      const resources = [cards(1, H200, 'a')[0], pool('b', 2), cards(1, H200, 'c')[0]]
      const [best] = planGpuLayouts({
        gpuResources: resources,
        requirement: gpu(141, [[2, 69]]),
        fees: { a0: 0.9, b: 1, c0: 100 }
      })
      expect(best.gpuRequests).to.deep.equal([{ id: 'b', amount: 2 }])
      expect(best.gpuPrice).to.equal(2)
    })

    it('finds a width that only one pool can fill exactly', () => {
      // taking the cheaper 2-card pool first would leave 1 card nobody can supply
      const resources = [pool('a', 2), pool('b', 3)]
      const got = planGpuLayouts({
        gpuResources: resources,
        requirement: gpu(207, [[3, 69]]),
        fees: { a: 1, b: 2 }
      })
      expect(got).to.have.length(1)
      expect(got[0].gpuRequests).to.deep.equal([{ id: 'b', amount: 3 }])
      expect(got[0].gpuPrice).to.equal(6)
      expect(
        validateGpuPlan({
          gpuResources: resources,
          requirement: gpu(207, [[3, 69]]),
          requests: got[0].gpuRequests
        }).ok
      ).to.equal(true)
    })

    it('combines pools and single cards, keeping mandatory members in', () => {
      const single = cards(2, H200, 's')
      single[1].min = 1
      const resources = [pool('p', 4), ...single]
      // width 5: mandatory s1 (1) + pool (4); s0 cannot complete it without breaking the pool
      const [best] = planGpuLayouts({
        gpuResources: resources,
        requirement: gpu(345, [[5, 69]]),
        fees: { p: 1, s0: 1, s1: 1 }
      })
      expect(best.gpuRequests).to.deep.equal([
        { id: 'p', amount: 4 },
        { id: 's1', amount: 1 }
      ])
    })

    it('prefers cheaper single cards in fee order on equal-cost alternatives', () => {
      const resources = cards(4, H200)
      const [best] = planGpuLayouts({
        gpuResources: resources,
        requirement: gpu(138, [[2, 69]]),
        fees: { gpu0: 3, gpu1: 1, gpu2: 1, gpu3: 2 }
      })
      expect(best.gpuRequests).to.deep.equal([
        { id: 'gpu1', amount: 1 },
        { id: 'gpu2', amount: 1 }
      ])
      expect(best.gpuPrice).to.equal(2)
    })

    it('includes a resource with min > 0 (the node would add it anyway)', () => {
      const resources = cards(8, H100)
      resources[7].min = 1
      const [p] = planGpuLayouts({ gpuResources: resources, requirement: PRIVATE })
      expect(p.gpuRequests).to.deep.equal([{ id: 'gpu7', amount: 1 }])
      const [g] = planGpuLayouts({ gpuResources: resources, requirement: GLM })
      expect(g.gpuRequests.map((r) => r.id)).to.include('gpu7')
      // a mandatory card in another group makes this group's bookings impossible
      const mixed = [...cards(1, H200), ...cards(1, { ...L4 }, 'l')]
      mixed[1].min = 1
      expect(widths(mixed, PRIVATE)).to.deep.equal([])
    })

    it('ignores malformed layouts instead of guessing', () => {
      const bad: GpuResourceRequirement = {
        kind: 'discrete',
        type: 'gpu',
        recommended: 100,
        unit: 'GB',
        layouts: [{ gpuCount: 2 }, { gpuCount: 1.5, vramPerGpu: 80 }, { gpuCount: 0 }]
      }
      expect(widths(cards(4, H200), bad)).to.deep.equal([])
    })
  })

  describe('sizeSharedResources', () => {
    const env: ComputeResource[] = [
      { id: 'cpu', total: 32, max: 16, min: 1, inUse: 20 },
      { id: 'ram', total: 256, max: 256, min: 1, inUse: 0 },
      { id: 'disk', total: 1000, max: 500, min: 10, inUse: 0 },
      ...cards(1, H200)
    ]
    const recs: TemplateResourceRequirement[] = [
      { id: 'cpu', recommended: 16, unit: 'cores' },
      { id: 'ram', recommended: 128, unit: 'GB' },
      MUSIC
    ]

    it('clamps to grantable, reports shortfalls and leaves undeclared ids to the caller', () => {
      const sized = sizeSharedResources(env, recs)
      expect(sized.amounts).to.deep.equal({ cpu: 12, ram: 128 })
      expect(sized.amounts.disk).to.equal(undefined)
      expect(sized.requests).to.deep.equal([
        { id: 'cpu', amount: 12 },
        { id: 'ram', amount: 128 }
      ])
      expect(sized.shortfalls).to.deep.equal([
        { id: 'cpu', recommended: 16, allocated: 12 }
      ])
    })

    it('raises to the env minimum', () => {
      const sized = sizeSharedResources(env, [{ id: 'disk', recommended: 2, unit: 'GB' }])
      expect(sized.amounts).to.deep.equal({ disk: 10 })
      expect(sized.shortfalls).to.deep.equal([])
    })

    it('rejects when a declared resource is exhausted, absent, or its min exceeds grantable', () => {
      const exhausted = env.map((r) => (r.id === 'ram' ? { ...r, inUse: 256 } : r))
      expect(sizeSharedResources(exhausted, recs)).to.equal(null)
      const noRam = env.filter((r) => r.id !== 'ram')
      expect(sizeSharedResources(noRam, recs)).to.equal(null)
      const tightCpu = env.map((r) => (r.id === 'cpu' ? { ...r, min: 13 } : r))
      expect(sizeSharedResources(tightCpu, recs)).to.equal(null)
    })

    it('a zero recommendation is satisfied without a request', () => {
      const sized = sizeSharedResources(
        env.filter((r) => r.id !== 'ram'),
        [{ id: 'ram', recommended: 0, unit: 'GB' }]
      )
      expect(sized).to.deep.equal({ amounts: { ram: 0 }, requests: [], shortfalls: [] })
    })

    it('no declaration -> empty sizing', () => {
      expect(sizeSharedResources(env, undefined)).to.deep.equal({
        amounts: {},
        requests: [],
        shortfalls: []
      })
    })
  })

  describe('GpuSizingProfile: shared vectors', () => {
    for (const v of SIZING_VECTORS.vectors) {
      it(`derives: ${v.name}`, () => {
        expect(deriveGpuLayouts(v.profile)).to.deep.equal(v.expected)
        for (const [n, floor] of Object.entries(v.floors)) {
          expect(gpuFloorGb(v.profile, Number(n)), `floor ${n}`).to.equal(floor)
        }
        expect(Object.keys(v.floors).map(Number)).to.deep.equal(v.profile.widths)
      })
    }
    for (const v of SIZING_VECTORS.invalid) {
      it(`rejects: ${v.name}`, () => {
        expect(() => deriveGpuLayouts(v.profile)).to.throw(Error)
      })
    }
    it('has at least 5 vectors covering util maps, overrides, outsideGiB and width 1 both ways', () => {
      const ps = SIZING_VECTORS.vectors.map((v) => v.profile)
      expect(ps.length).to.be.at.least(5)
      expect(ps.some((p) => typeof p.memUtil === 'object')).to.equal(true)
      expect(ps.some((p) => p.overrides)).to.equal(true)
      expect(ps.some((p) => (p.outsideGiB ?? 0) > 0)).to.equal(true)
      expect(ps.some((p) => p.widths.includes(1))).to.equal(true)
      expect(ps.some((p) => !p.widths.includes(1))).to.equal(true)
    })
  })

  describe('GpuSizingProfile: rules', () => {
    const base: GpuSizingProfile = {
      version: 1,
      engine: 'vllm',
      confidence: 'estimated',
      widths: [1, 2, 4],
      shardableGiB: 104,
      replicatedGiB: 4.2,
      memUtil: 0.9
    }

    it('throws a clear error when a wider layout totals less than the 1-GPU floor', () => {
      expect(() =>
        deriveGpuLayouts({ ...base, widths: [1, 2], memUtil: { '1': 0.5, '2': 0.95 } })
      ).to.throw(/width 2 totals .* below the 1-GPU floor/)
    })

    it('names the problem of an invalid profile', () => {
      expect(() => validateGpuSizingProfile({ ...base, widths: [] })).to.throw(/widths/)
      expect(() => validateGpuSizingProfile({ ...base, widths: [1.5] })).to.throw(
        /1\.\.64/
      )
      expect(() => validateGpuSizingProfile({ ...base, memUtil: 0 })).to.throw(/\(0,1\)/)
      expect(() => validateGpuSizingProfile({ ...base, shardableGiB: -1 })).to.throw(
        /shardableGiB/
      )
      expect(() => validateGpuSizingProfile({ ...base, outsideGiB: -2 })).to.throw(
        /outsideGiB/
      )
      expect(() =>
        validateGpuSizingProfile({
          ...base,
          memUtil: { '1': 0.9, '2': 0.9, '4': 0.9, '8': 0.9 }
        })
      ).to.throw(/undeclared width "8"/)
      expect(() =>
        validateGpuSizingProfile({
          ...base,
          overrides: { '8': { vramPerGpu: 80, source: 'policy', note: 'x' } }
        })
      ).to.throw(/override for undeclared width "8"/)
      expect(() =>
        validateGpuSizingProfile({ ...base, version: 2 as unknown as 1 })
      ).to.throw(/version/)
    })

    it('gpuFloorGb throws for an undeclared width', () => {
      expect(gpuFloorGb(base, 2)).to.equal(68)
      expect(() => gpuFloorGb(base, 8)).to.throw(/not declared/)
    })
  })

  describe('130 GB model matrix (profile -> layouts -> planner)', () => {
    const req = deriveGpuLayouts(SIZING_VECTORS.vectors[0].profile)

    it('derives {1}, {2 x 68}, {4 x 37} with a 130 GB headline', () => {
      expect(req.recommended).to.equal(130)
      expect(req.layouts).to.deep.equal([
        { gpuCount: 1 },
        { gpuCount: 2, vramPerGpu: 68 },
        { gpuCount: 4, vramPerGpu: 37 }
      ])
    })

    it('1xH200 (143771 MiB) books one card', () => {
      expect(widths(cards(1, H200), req)).to.deep.equal([1])
    })

    it('8xH100 (81559 MiB) books 2 by default (4 is also offered)', () => {
      const resources = cards(8, H100)
      const got = planGpuLayouts({
        gpuResources: resources,
        requirement: req,
        fees: fees(resources)
      })
      expect(got.map((c) => c.layout.gpuCount)).to.deep.equal([2, 4])
      expect(got[0].gpuRequests).to.deep.equal([
        { id: 'gpu0', amount: 1 },
        { id: 'gpu1', amount: 1 }
      ])
    })

    it('4xL40S (46068 MiB) books all 4', () => {
      const resources = cards(4, L40S)
      const got = planGpuLayouts({
        gpuResources: resources,
        requirement: req,
        fees: fees(resources)
      })
      expect(got.map((c) => c.layout.gpuCount)).to.deep.equal([4])
      expect(got[0].gpuRequests.map((r) => r.id)).to.deep.equal([
        'gpu0',
        'gpu1',
        'gpu2',
        'gpu3'
      ])
    })

    it('mixed 2xH100 + 2xL40S never mixes: only 2xH100', () => {
      const resources = [...cards(2, H100, 'h'), ...cards(2, L40S, 'l')]
      const got = planGpuLayouts({
        gpuResources: resources,
        requirement: req,
        fees: fees(resources)
      })
      expect(got.map((c) => [c.groupKey, c.layout.gpuCount])).to.deep.equal([
        [H100.description, 2]
      ])
      for (const c of got) {
        expect(assertSingleGpuGroup(resources, c.gpuRequests).ok).to.equal(true)
      }
      // the 4-card mix is rejected by the validators too
      const mixed = resources.map((r) => ({ id: r.id, amount: 1 }))
      expect(assertSingleGpuGroup(resources, mixed).ok).to.equal(false)
      expect(
        validateGpuPlan({ gpuResources: resources, requirement: req, requests: mixed }).ok
      ).to.equal(false)
    })
  })

  describe('legalTpWidths', () => {
    it('keeps widths dividing the heads whose KV heads split or replicate evenly', () => {
      expect(
        legalTpWidths({ num_attention_heads: 32, num_key_value_heads: 8 })
      ).to.deep.equal([1, 2, 4, 8])
      expect(legalTpWidths({ num_attention_heads: 40 })).to.deep.equal([1, 2, 4, 8])
      expect(legalTpWidths({ num_attention_heads: 71 })).to.deep.equal([1])
      expect(
        legalTpWidths({ num_attention_heads: 28, num_key_value_heads: 4 })
      ).to.deep.equal([1, 2, 4])
      // kv 2 < n: n must be a multiple of kv to replicate KV heads
      expect(
        legalTpWidths(
          { num_attention_heads: 24, num_key_value_heads: 2 },
          { candidates: [1, 2, 3, 4, 6, 8] }
        )
      ).to.deep.equal([1, 2, 4, 6, 8])
      expect(
        legalTpWidths(
          { num_attention_heads: 24, num_key_value_heads: 8 },
          { candidates: [3, 6] }
        )
      ).to.deep.equal([])
    })

    it('prefers text_config when it has num_attention_heads', () => {
      expect(
        legalTpWidths({
          num_attention_heads: 16,
          text_config: { num_attention_heads: 28, num_key_value_heads: 4 }
        })
      ).to.deep.equal([1, 2, 4])
      expect(legalTpWidths({ num_attention_heads: 32, text_config: {} })).to.deep.equal([
        1, 2, 4, 8
      ])
    })

    it('unknown heads -> null (unknown, not "all legal")', () => {
      expect(legalTpWidths({})).to.equal(null)
      expect(legalTpWidths(undefined)).to.equal(null)
      expect(legalTpWidths({ num_attention_heads: 0 })).to.equal(null)
    })

    it('sorts and dedupes candidates and rejects invalid ones', () => {
      expect(
        legalTpWidths({ num_attention_heads: 32 }, { candidates: [8, 2, 2, 1] })
      ).to.deep.equal([1, 2, 8])
      expect(() =>
        legalTpWidths({ num_attention_heads: 32 }, { candidates: [0] })
      ).to.throw(/candidates/)
      expect(() =>
        legalTpWidths({ num_attention_heads: 32 }, { candidates: [65] })
      ).to.throw(/candidates/)
    })
  })

  describe('estimateHfSizingProfile', () => {
    const GIB = 1024 ** 3

    it('DeepSeek-like MLA: weights shard, the latent KV is replicated on every rank', () => {
      const est = estimateHfSizingProfile({
        paramsByDtype: { BF16: 1e9, F8_E4M3: 100e9, F32: 1e8 },
        numLayers: 61,
        kvLoraRank: 512,
        qkRopeHeadDim: 64,
        contextTokens: 32768,
        widths: [2, 4, 8]
      })
      const kvGiB = ((512 + 64) * 2 * 61 * 32768) / GIB
      expect(est.confidence).to.equal('estimated')
      expect(est.profile.confidence).to.equal('estimated')
      expect(est.unknown).to.deep.equal([])
      expect(est.profile.shardableGiB).to.be.closeTo(102.4e9 / GIB, 1e-9)
      expect(est.profile.replicatedGiB).to.be.closeTo(5.5 + kvGiB, 1e-9)
      expect(est.profile.memUtil).to.equal(0.9)
      expect(est.profile.widths).to.deep.equal([2, 4, 8])
      // the result is a valid profile
      expect(deriveGpuLayouts(est.profile).layouts.map((l) => l.gpuCount)).to.deep.equal([
        2, 4, 8
      ])
    })

    it('GQA KV shards when kv heads >= every width, else is replicated', () => {
      const shape = {
        totalParams: 8e9,
        bytesPerParam: 2,
        numLayers: 32,
        headDim: 128,
        contextTokens: 8192,
        concurrentSeqs: 2,
        widths: [1, 2, 4, 8]
      }
      const kvGiB = (2 * 8 * 128 * 2 * 32 * 8192 * 2) / GIB
      const sharded = estimateHfSizingProfile({ ...shape, numKvHeads: 8 })
      expect(sharded.profile.shardableGiB).to.be.closeTo(16e9 / GIB + kvGiB, 1e-9)
      expect(sharded.profile.replicatedGiB).to.equal(5.5)
      const replicated = estimateHfSizingProfile({ ...shape, numKvHeads: 4 })
      expect(replicated.profile.shardableGiB).to.be.closeTo(16e9 / GIB, 1e-9)
      expect(replicated.profile.replicatedGiB).to.be.closeTo(5.5 + kvGiB / 2, 1e-9)
    })

    it('lists missing inputs and returns null when the weights are unknown', () => {
      const est = estimateHfSizingProfile({
        totalParams: 7e9,
        contextTokens: 4096,
        widths: [1]
      })
      expect(est.unknown).to.deep.equal([
        'bytesPerParam',
        'numLayers',
        'numKvHeads',
        'headDim'
      ])
      expect(est.profile.shardableGiB).to.be.closeTo(14e9 / GIB, 1e-9)
      expect(est.profile.replicatedGiB).to.equal(5.5)
      expect(estimateHfSizingProfile({ contextTokens: 4096, widths: [1] })).to.equal(null)
      expect(
        estimateHfSizingProfile({
          paramsByDtype: { F4: 1e9 },
          contextTokens: 1,
          widths: [1]
        })
      ).to.equal(null)
      const fallback = estimateHfSizingProfile({
        paramsByDtype: { F4: 1e9 },
        bytesPerParam: 0.5,
        contextTokens: 1,
        widths: [1]
      })
      expect(fallback.unknown).to.include('dtype:F4')
      expect(fallback.profile.shardableGiB).to.be.closeTo(0.5e9 / GIB, 1e-9)
    })

    it('throws on invalid knobs or widths', () => {
      const ok = { totalParams: 1e9, bytesPerParam: 2, contextTokens: 1024, widths: [1] }
      expect(() => estimateHfSizingProfile({ ...ok, contextTokens: 0 })).to.throw(
        /contextTokens/
      )
      expect(() => estimateHfSizingProfile({ ...ok, memUtil: 1 })).to.throw(/memUtil/)
      expect(() => estimateHfSizingProfile({ ...ok, widths: [3, 2] })).to.throw(
        /ascending/
      )
    })
  })

  describe('assertSingleGpuGroup', () => {
    const resources = [...cards(2, H100, 'h'), ...cards(2, L40S, 'l')]

    it('accepts one group and ignores non-GPU ids and zero amounts', () => {
      expect(
        assertSingleGpuGroup(resources, [
          { id: 'h0', amount: 1 },
          { id: 'h1', amount: 1 },
          { id: 'l0', amount: 0 },
          { id: 'cpu', amount: 8 }
        ])
      ).to.deep.equal({ ok: true, groupKey: H100.description })
      expect(assertSingleGpuGroup(resources, [{ id: 'ram', amount: 4 }])).to.deep.equal({
        ok: true,
        groupKey: null
      })
    })

    it('rejects a selection spanning two groups', () => {
      const got = assertSingleGpuGroup(resources, [
        { id: 'h0', amount: 1 },
        { id: 'l1', amount: 1 }
      ])
      expect(got.ok).to.equal(false)
      expect(got.ok === false && got.reason).to.match(/mixes groups/)
    })
  })

  describe('validateGpuPlan', () => {
    const req = gpu(130, [[1], [2, 68], [4, 37]])
    const fresh = () => cards(8, H100)
    const plan = () => {
      const [best] = planGpuLayouts({ gpuResources: fresh(), requirement: req })
      return best.gpuRequests
    }
    const reasonOf = (r: ReturnType<typeof validateGpuPlan>): string =>
      r.ok === false ? r.reason : ''

    it('accepts a planned selection on an unchanged snapshot', () => {
      expect(
        validateGpuPlan({ gpuResources: fresh(), requirement: req, requests: plan() })
      ).to.deep.equal({
        ok: true,
        layout: { gpuCount: 2, vramPerGpu: 68 },
        groupKey: H100.description
      })
      expect(
        validateGpuPlan({
          gpuResources: fresh(),
          requirement: req,
          requests: plan(),
          forcedGpuCount: 2
        }).ok
      ).to.equal(true)
    })

    it('rejects an id taken since planning', () => {
      const taken = fresh()
      taken[0].inUse = 1
      const got = validateGpuPlan({
        gpuResources: taken,
        requirement: req,
        requests: plan()
      })
      expect(reasonOf(got)).to.match(/"gpu0" can grant 0/)
    })

    it('rejects an id that left the environment', () => {
      const got = validateGpuPlan({
        gpuResources: fresh().slice(1),
        requirement: req,
        requests: plan()
      })
      expect(reasonOf(got)).to.match(/no longer in the environment/)
    })

    it('rejects when the advertised memory changed below the layout floor', () => {
      const shrunk = cards(8, { ...H100, memoryTotal: '60 GB' })
      const got = validateGpuPlan({
        gpuResources: shrunk,
        requirement: req,
        requests: plan()
      })
      expect(reasonOf(got)).to.match(/needs 68 GB each/)
      const unknownMem = cards(8, { description: H100.description })
      expect(
        reasonOf(
          validateGpuPlan({
            gpuResources: unknownMem,
            requirement: req,
            requests: plan()
          })
        )
      ).to.match(/unknown memory/)
    })

    it('rejects a count that is not a declared layout, or not the forced width', () => {
      const three = ['gpu0', 'gpu1', 'gpu2'].map((id) => ({ id, amount: 1 }))
      expect(
        reasonOf(
          validateGpuPlan({ gpuResources: fresh(), requirement: req, requests: three })
        )
      ).to.match(/3 GPU\(s\) is not a declared layout/)
      expect(
        reasonOf(
          validateGpuPlan({
            gpuResources: fresh(),
            requirement: req,
            requests: plan(),
            forcedGpuCount: 4
          })
        )
      ).to.match(/runtime width is 4/)
    })

    it('rejects partial pools, duplicates, bad amounts and left-out mandatory cards', () => {
      const pooled: ComputeResource = {
        id: 'pool',
        type: 'gpu',
        total: 8,
        max: 8,
        min: 0,
        inUse: 0,
        ...H100
      }
      expect(
        reasonOf(
          validateGpuPlan({
            gpuResources: [pooled],
            requirement: req,
            requests: [{ id: 'pool', amount: 2 }]
          })
        )
      ).to.match(/only be booked whole/)
      expect(
        reasonOf(
          validateGpuPlan({
            gpuResources: fresh(),
            requirement: req,
            requests: [
              { id: 'gpu0', amount: 1 },
              { id: 'gpu0', amount: 1 }
            ]
          })
        )
      ).to.match(/duplicate/)
      expect(
        reasonOf(
          validateGpuPlan({
            gpuResources: fresh(),
            requirement: req,
            requests: [{ id: 'gpu0', amount: 0.5 }]
          })
        )
      ).to.match(/invalid amount/)
      const withMandatory = fresh()
      withMandatory[7].min = 1
      expect(
        reasonOf(
          validateGpuPlan({
            gpuResources: withMandatory,
            requirement: req,
            requests: plan()
          })
        )
      ).to.match(/"gpu7" has min 1/)
    })

    it('without a requirement only checks group, grantability and pools', () => {
      expect(validateGpuPlan({ gpuResources: fresh(), requests: [] })).to.deep.equal({
        ok: true,
        layout: null,
        groupKey: null
      })
      expect(
        validateGpuPlan({ gpuResources: fresh(), requests: [{ id: 'gpu3', amount: 1 }] })
      ).to.deep.equal({ ok: true, layout: null, groupKey: H100.description })
      expect(
        reasonOf(
          validateGpuPlan({ gpuResources: fresh(), requirement: req, requests: [] })
        )
      ).to.match(/books no GPU/)
    })
  })
})
