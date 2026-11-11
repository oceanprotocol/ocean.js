import { assert } from 'chai'
import { Signer } from 'ethers'
import { provider, getAddresses } from '../config.js'
import {
  assertProviderFeeWithinCeiling,
  buildProviderFeePreview
} from '../../src/utils/OrderUtils.js'
import { ZERO_ADDRESS } from '../../src/utils/Constants.js'
import { MaxProviderFee, ProviderFees } from '../../src/@types/Provider.js'

// OJ-02: `assertProviderFeeWithinCeiling` is the opt-in guard that bounds the provider fee the
// node asks `orderAsset` to approve and pay. These tests exercise every branch against the local
// Barge chain, using the deployed OCEAN token (18 decimals) for the base-unit conversion.

let signer: Signer
let addresses: any
let oceanToken: string
const OTHER_TOKEN = '0x1111111111111111111111111111111111111111'
const FEE_ADDRESS = '0x2222222222222222222222222222222222222222'

// Helper to build a minimal, valid-looking ProviderFees struct.
function makeFees(token: string, amount: string, address = FEE_ADDRESS): ProviderFees {
  return {
    providerFeeAddress: address,
    providerFeeToken: token,
    providerFeeAmount: amount,
    v: '27',
    r: '0x00',
    s: '0x00',
    providerData: '0x00',
    validUntil: '0'
  }
}

describe('OrderUtils - assertProviderFeeWithinCeiling (OJ-02 provider-fee ceiling)', () => {
  before(async () => {
    signer = await provider.getSigner(0)
    addresses = await getAddresses()
    oceanToken = addresses.Ocean
    assert(oceanToken, 'OCEAN token address must be available from barge address.json')
  })

  // --- Opt-out: no ceiling configured ---

  it('is a no-op when maxProviderFee is omitted (opt-out, backward compatible)', async () => {
    // A huge fee is accepted because no ceiling was configured.
    await assertProviderFeeWithinCeiling(
      makeFees(oceanToken, '999999999999999999999999'),
      undefined,
      signer
    )
  })

  it('is a no-op when the ceiling token is the zero address (documented opt-out)', async () => {
    const max: MaxProviderFee = { providerFeeToken: ZERO_ADDRESS, providerFeeAmount: '1' }
    await assertProviderFeeWithinCeiling(
      makeFees(oceanToken, '999999999999999999999999'),
      max,
      signer
    )
  })

  // --- Zero / absent node fee: nothing is charged, so nothing to bound ---

  it('is a no-op when the node fee amount is zero, even with a mismatched ceiling token', async () => {
    const max: MaxProviderFee = { providerFeeToken: oceanToken, providerFeeAmount: '1' }
    // Token differs but amount is 0 => no charge => must NOT throw on token mismatch.
    await assertProviderFeeWithinCeiling(makeFees(OTHER_TOKEN, '0'), max, signer)
  })

  it('is a no-op when the node fee amount is absent', async () => {
    const max: MaxProviderFee = { providerFeeToken: oceanToken, providerFeeAmount: '1' }
    await assertProviderFeeWithinCeiling(
      makeFees(oceanToken, undefined as any),
      max,
      signer
    )
  })

  // --- Fail closed on partial / malformed ceiling input ---

  it('throws (fail closed) when a ceiling token is set but the amount is missing', async () => {
    const max = { providerFeeToken: oceanToken } as unknown as MaxProviderFee
    try {
      await assertProviderFeeWithinCeiling(makeFees(oceanToken, '1000'), max, signer)
      assert.fail('expected a throw for a missing ceiling amount')
    } catch (e: any) {
      assert.include(e.message, 'maxProviderFee.providerFeeAmount is required')
    }
  })

  it('throws (fail closed) when a ceiling token is set but the amount is an empty string', async () => {
    const max: MaxProviderFee = { providerFeeToken: oceanToken, providerFeeAmount: '' }
    try {
      await assertProviderFeeWithinCeiling(makeFees(oceanToken, '1000'), max, signer)
      assert.fail('expected a throw for an empty ceiling amount')
    } catch (e: any) {
      assert.include(e.message, 'maxProviderFee.providerFeeAmount is required')
    }
  })

  it('throws when the node returns a non-integer providerFeeAmount', async () => {
    const max: MaxProviderFee = { providerFeeToken: oceanToken, providerFeeAmount: '5' }
    try {
      await assertProviderFeeWithinCeiling(makeFees(oceanToken, '1.5'), max, signer)
      assert.fail('expected a throw for a non-integer node fee')
    } catch (e: any) {
      assert.include(e.message, 'non-integer providerFeeAmount')
    }
  })

  // --- Token binding ---

  it('throws when the node fee token differs from the allowed ceiling token', async () => {
    const max: MaxProviderFee = { providerFeeToken: oceanToken, providerFeeAmount: '5' }
    try {
      await assertProviderFeeWithinCeiling(
        makeFees(OTHER_TOKEN, '1000000000000000000'),
        max,
        signer
      )
      assert.fail('expected a throw for a mismatched fee token')
    } catch (e: any) {
      assert.include(e.message, 'does not match the allowed token')
    }
  })

  it('matches the ceiling token case-insensitively', async () => {
    const max: MaxProviderFee = {
      providerFeeToken: oceanToken.toUpperCase().replace('0X', '0x'),
      providerFeeAmount: '5'
    }
    // 1 OCEAN fee, 5 OCEAN ceiling, token only differs in case => must pass.
    await assertProviderFeeWithinCeiling(
      makeFees(oceanToken.toLowerCase(), '1000000000000000000'),
      max,
      signer
    )
  })

  // --- Amount binding (real 18-decimal base-unit conversion via OCEAN.decimals()) ---

  it('throws when the node fee amount exceeds the ceiling', async () => {
    const max: MaxProviderFee = { providerFeeToken: oceanToken, providerFeeAmount: '5' } // 5e18
    try {
      await assertProviderFeeWithinCeiling(
        makeFees(oceanToken, '6000000000000000000'), // 6 OCEAN
        max,
        signer
      )
      assert.fail('expected a throw for a fee above the ceiling')
    } catch (e: any) {
      assert.include(e.message, 'exceeds the allowed maximum')
    }
  })

  it('passes when the node fee amount equals the ceiling exactly', async () => {
    const max: MaxProviderFee = { providerFeeToken: oceanToken, providerFeeAmount: '5' }
    await assertProviderFeeWithinCeiling(
      makeFees(oceanToken, '5000000000000000000'), // 5 OCEAN == ceiling
      max,
      signer
    )
  })

  it('passes when the node fee amount is below the ceiling', async () => {
    const max: MaxProviderFee = { providerFeeToken: oceanToken, providerFeeAmount: '5' }
    await assertProviderFeeWithinCeiling(
      makeFees(oceanToken, '4000000000000000000'), // 4 OCEAN < ceiling
      max,
      signer
    )
  })
})

// `buildProviderFeePreview` is the pure core of `getProviderFees` (the UI preview). It is extracted
// so its defaulting, "is a fee charged?" predicate and hostile-token fallback are testable without a
// live node: the amount formatter is injected here instead of the real on-chain `unitsToAmount`.
describe('OrderUtils - buildProviderFeePreview (getProviderFees core)', () => {
  const CHARGED_TOKEN = '0x3333333333333333333333333333333333333333'
  const CHARGED_ADDRESS = '0x4444444444444444444444444444444444444444'

  // A formatter that records its calls, so we can assert it is NOT invoked when nothing is charged.
  function recordingFormatter(ret: string) {
    const calls: Array<{ token: string; amount: string }> = []
    const fn = async (token: string, amount: string) => {
      calls.push({ token, amount })
      return ret
    }
    return { fn, calls }
  }

  it('defaults every field and does not format when providerFee is undefined', async () => {
    const { fn, calls } = recordingFormatter('ignored')
    const preview = await buildProviderFeePreview(undefined, fn)
    assert.equal(preview.providerFeeToken, ZERO_ADDRESS)
    assert.equal(preview.providerFeeAmount, '0')
    assert.equal(preview.providerFeeAddress, ZERO_ADDRESS)
    assert.equal(preview.providerFeeAmountFormatted, '0')
    assert.equal(preview.validUntil, '0')
    assert.equal(calls.length, 0, 'formatter must not run when there is no fee')
  })

  it('does not format when the amount is zero (no charge)', async () => {
    const { fn, calls } = recordingFormatter('ignored')
    const preview = await buildProviderFeePreview(
      makeFees(CHARGED_TOKEN, '0', CHARGED_ADDRESS),
      fn
    )
    assert.equal(preview.providerFeeAmountFormatted, '0')
    assert.equal(calls.length, 0)
  })

  it('does not format when the recipient is the zero address (no charge), mirroring orderAsset', async () => {
    const { fn, calls } = recordingFormatter('ignored')
    const preview = await buildProviderFeePreview(
      makeFees(CHARGED_TOKEN, '1000000000000000000', ZERO_ADDRESS),
      fn
    )
    assert.equal(preview.providerFeeAmountFormatted, '0')
    assert.equal(
      calls.length,
      0,
      'a zero-recipient fee is not charged, so it is not formatted'
    )
  })

  it('does not format and reports not-charged when the amount is malformed', async () => {
    const { fn, calls } = recordingFormatter('ignored')
    const preview = await buildProviderFeePreview(
      makeFees(CHARGED_TOKEN, '1.5', CHARGED_ADDRESS),
      fn
    )
    assert.equal(
      preview.providerFeeAmount,
      '1.5',
      'raw amount is passed through verbatim'
    )
    assert.equal(preview.providerFeeAmountFormatted, '0')
    assert.equal(calls.length, 0)
  })

  it('formats a real charged fee via the injected formatter', async () => {
    const { fn, calls } = recordingFormatter('1.0')
    const preview = await buildProviderFeePreview(
      makeFees(CHARGED_TOKEN, '1000000000000000000', CHARGED_ADDRESS),
      fn
    )
    assert.equal(preview.providerFeeToken, CHARGED_TOKEN)
    assert.equal(preview.providerFeeAmount, '1000000000000000000')
    assert.equal(preview.providerFeeAddress, CHARGED_ADDRESS)
    assert.equal(preview.providerFeeAmountFormatted, '1.0')
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0], {
      token: CHARGED_TOKEN,
      amount: '1000000000000000000'
    })
  })

  it('falls back to the raw base-unit amount when the formatter throws (hostile token on decimals())', async () => {
    const throwingFormatter = async () => {
      throw new Error('decimals() reverted')
    }
    const preview = await buildProviderFeePreview(
      makeFees(CHARGED_TOKEN, '7500000000000000000', CHARGED_ADDRESS),
      throwingFormatter
    )
    // Must not throw the whole preview, and must NOT silently show 0 for a real fee.
    assert.equal(preview.providerFeeAmountFormatted, '7500000000000000000')
  })
})
