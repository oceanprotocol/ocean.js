import { assert } from 'chai'
import { provider, getAddresses } from '../config'
import { Signer } from 'ethers'

import { SubsidyView } from '../../src/contracts/SubsidyView'
import { SubsidyMode, SubsidyModeConfig } from '../../src/@types/SubsidyView'

/**
 * ISubsidyViewV2 (dual-mode quoting) + ISubsidyModeConfig (owner mode switch), contracts #1057.
 * Walks the SubsidyProviders registry for the first provider that advertises ISubsidyViewV2 and
 * skips cleanly when none is deployed (pre-v2 chain). Assertions are shape/enum-level, since the
 * exact quoted amounts depend on the provider's on-chain config.
 */
describe('SubsidyView v2 (dual-mode quoting + mode config)', () => {
  let user1: Signer
  let view: SubsidyView
  let addresses
  let OCEAN: string
  let node: string
  let payer: string

  before(async function () {
    user1 = (await provider.getSigner(3)) as Signer
    addresses = await getAddresses()
    OCEAN = addresses.Ocean
    node = await user1.getAddress()
    payer = await user1.getAddress()

    const registry: string[] = addresses.SubsidyProviders || []
    if (registry.length === 0) this.skip()
    const { chainId } = await user1.provider.getNetwork()

    // Find the first registry entry that implements ISubsidyViewV2.
    for (const addr of registry) {
      const candidate = new SubsidyView(user1, addr, Number(chainId))
      if (await candidate.isSubsidyViewV2()) {
        view = candidate
        break
      }
    }
    if (!view) this.skip()
  })

  it('feature-detects v2, mode-config and lock-provider interfaces', async () => {
    assert.strictEqual(await view.isSubsidyViewV2(), true, 'should be an ISubsidyViewV2')
    assert(typeof (await view.isSubsidyModeConfig()) === 'boolean')
    assert(typeof (await view.isSubsidyLockProvider()) === 'boolean')
  })

  it('quoteSubsidyModes returns a leg per mode (REIMBURSEMENT, PREFUNDED)', async () => {
    const quotes = await view.quoteSubsidyModes(node, payer, 0, OCEAN, '1', '1')
    assert.strictEqual(quotes.length, 2, 'expected exactly two mode legs')
    assert.strictEqual(quotes[0].mode, SubsidyMode.REIMBURSEMENT)
    assert.strictEqual(quotes[1].mode, SubsidyMode.PREFUNDED)
    for (const q of quotes) {
      assert(typeof q.subsidy === 'string', 'leg.subsidy is not a string')
      assert(typeof q.bonus === 'string', 'leg.bonus is not a string')
    }
  })

  it('quoteSubsidyByMode matches the corresponding quoteSubsidyModes leg', async () => {
    const quotes = await view.quoteSubsidyModes(node, payer, 0, OCEAN, '1', '1')
    const refund = await view.quoteSubsidyByMode(
      node,
      payer,
      0,
      OCEAN,
      '1',
      '1',
      SubsidyMode.REIMBURSEMENT
    )
    const prepaid = await view.quoteSubsidyByMode(
      node,
      payer,
      0,
      OCEAN,
      '1',
      '1',
      SubsidyMode.PREFUNDED
    )
    assert.strictEqual(refund.subsidy, quotes[0].subsidy, 'refund leg mismatch')
    assert.strictEqual(prepaid.subsidy, quotes[1].subsidy, 'prepaid leg mismatch')
  })

  it('subsidyModeConfig returns a known mode when supported', async function () {
    if (!(await view.isSubsidyModeConfig())) this.skip()
    const mode = await view.subsidyModeConfig()
    assert(
      mode in SubsidyModeConfig,
      'subsidyModeConfig is not a known SubsidyModeConfig'
    )
  })
})
