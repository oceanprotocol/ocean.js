import { assert } from 'chai'
import {
  estimateServiceCost,
  serviceMinLockSeconds,
  toRawAmount
} from '../../src/utils/ServiceCost.js'
import type { ComputeEnvironment } from '../../src/@types/Compute.js'

const TOKEN = '0xAbCdEf0000000000000000000000000000000001'

function makeEnv(overrides: Partial<ComputeEnvironment> = {}): ComputeEnvironment {
  return {
    id: 'env-1',
    consumerAddress: '0x0000000000000000000000000000000000000001',
    runningJobs: 0,
    minJobDuration: 600,
    minServiceDuration: 120,
    fees: {
      '8996': [
        {
          feeToken: TOKEN,
          prices: [
            { id: 'cpu', price: 0.5 },
            { id: 'ram', price: 0.1 }
          ]
        }
      ]
    },
    ...overrides
  }
}

describe('estimateServiceCost', () => {
  it('sums price * amount * ceil(duration / 60)', () => {
    const r = estimateServiceCost(
      makeEnv(),
      8996,
      TOKEN,
      [
        { id: 'cpu', amount: 2 },
        { id: 'ram', amount: 4 }
      ],
      601
    )
    // 601s -> 11 minutes. (0.5*2 + 0.1*4) * 11
    assert.equal(r.minutesBilled, 11)
    assert.closeTo(r.costHuman, 1.4 * 11, 1e-9)
    assert.deepEqual(r.unpricedResourceIds, [])
  })

  it('floors on minServiceDuration for SERVICE (default) and minJobDuration for COMPUTE', () => {
    const resources = [{ id: 'cpu', amount: 1 }]
    const service = estimateServiceCost(makeEnv(), 8996, TOKEN, resources, 10)
    assert.equal(service.effectiveDurationSeconds, 120)
    assert.equal(service.minutesBilled, 2)

    const service2 = estimateServiceCost(makeEnv(), 8996, TOKEN, resources, 10, 2)
    assert.equal(service2.effectiveDurationSeconds, 120)

    const compute = estimateServiceCost(makeEnv(), 8996, TOKEN, resources, 10, 1)
    assert.equal(compute.effectiveDurationSeconds, 600)
    assert.equal(compute.minutesBilled, 10)
    assert.closeTo(compute.costHuman, 5, 1e-9)

    const computeStr = estimateServiceCost(makeEnv(), 8996, TOKEN, resources, 10, '1')
    assert.equal(computeStr.effectiveDurationSeconds, 600)
  })

  it('does not floor when the duration already exceeds the minimum', () => {
    const r = estimateServiceCost(
      makeEnv(),
      8996,
      TOKEN,
      [{ id: 'cpu', amount: 1 }],
      3600
    )
    assert.equal(r.effectiveDurationSeconds, 3600)
  })

  it('matches feeToken case-insensitively but returns the env spelling', () => {
    const r = estimateServiceCost(
      makeEnv(),
      8996,
      TOKEN.toLowerCase(),
      [{ id: 'cpu', amount: 1 }],
      60
    )
    assert.equal(r.feeToken, TOKEN)
  })

  it('prices an unknown resource id at 0 and flags it', () => {
    const r = estimateServiceCost(
      makeEnv(),
      8996,
      TOKEN,
      [
        { id: 'cpu', amount: 1 },
        { id: 'gpu', amount: 1 }
      ],
      60
    )
    assert.closeTo(r.costHuman, 0.5 * 2, 1e-9) // 60s floors to 120s => 2 min
    assert.deepEqual(r.unpricedResourceIds, ['gpu'])
  })

  it('treats non-finite or negative env prices as unpriced (0) and flags them', () => {
    const env = makeEnv({
      fees: {
        '8996': [
          {
            feeToken: TOKEN,
            prices: [
              { id: 'cpu', price: -1 },
              { id: 'ram', price: NaN }
            ]
          }
        ]
      }
    })
    const r = estimateServiceCost(
      env,
      8996,
      TOKEN,
      [
        { id: 'cpu', amount: 1 },
        { id: 'ram', amount: 1 }
      ],
      60
    )
    assert.equal(r.costHuman, 0)
    assert.deepEqual(r.unpricedResourceIds, ['cpu', 'ram'])
  })

  it('returns null when there is no schedule for the chain or token', () => {
    const resources = [{ id: 'cpu', amount: 1 }]
    assert.isNull(estimateServiceCost(makeEnv(), 1, TOKEN, resources, 60))
    assert.isNull(
      estimateServiceCost(
        makeEnv(),
        8996,
        '0x0000000000000000000000000000000000000009',
        resources,
        60
      )
    )
    assert.isNull(estimateServiceCost(makeEnv({ fees: {} }), 8996, TOKEN, resources, 60))
  })
})

describe('toRawAmount', () => {
  it('strips float noise instead of leaking it into base units', () => {
    // 123.456 is stored as 123.456000000000003070...
    assert.equal(toRawAmount(123.456, 18), '123456000000000000000')
    assert.equal(toRawAmount(0.1 + 0.2, 18), '300000000000000000')
  })

  it('handles whole numbers and zero decimals', () => {
    assert.equal(toRawAmount(5, 6), '5000000')
    assert.equal(toRawAmount(5, 0), '5')
    assert.equal(toRawAmount(0, 18), '0')
  })

  it('rounds the sub-decimals remainder UP', () => {
    assert.equal(toRawAmount(1.5, 0), '2')
    assert.equal(toRawAmount(0.0000001, 6), '1')
    assert.equal(toRawAmount(0.0000011, 6), '2')
    assert.equal(toRawAmount(1.000001, 6), '1000001')
  })

  it('expands exponent notation for tiny and huge values', () => {
    assert.equal(toRawAmount(1e-7, 18), '100000000000')
    assert.equal(toRawAmount(1e21, 0), '1000000000000000000000')
  })

  it('rejects negative and non-finite values', () => {
    assert.throws(() => toRawAmount(-1, 18))
    assert.throws(() => toRawAmount(NaN, 18))
    assert.throws(() => toRawAmount(Infinity, 18))
  })
})

describe('serviceMinLockSeconds', () => {
  it('pads by max(3600, ceil(0.25 * d))', () => {
    assert.equal(serviceMinLockSeconds(600), 600 + 3600)
    assert.equal(serviceMinLockSeconds(14400), 14400 + 3600)
    assert.equal(serviceMinLockSeconds(40000), 40000 + 10000)
    assert.equal(serviceMinLockSeconds(40001), 40001 + 10001)
  })
})
