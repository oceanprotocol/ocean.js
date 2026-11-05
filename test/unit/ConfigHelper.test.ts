import { assert } from 'chai'
import { ConfigHelper } from '../../src/config/ConfigHelper'

/**
 * Pure unit tests (no chain) for the address-registry fields threaded through
 * {@link ConfigHelper.getAddressesFromEnv}: the Escrow-v2 `SponsorshipLib` and the subsidy-provider
 * `SubsidyProviders` array. Uses the `customAddresses` argument so it does not depend on an
 * ADDRESS_FILE or the bundled defaults.
 */
describe('ConfigHelper address-registry threading', () => {
  const helper = new ConfigHelper()
  const sponsorshipLib = '0x1111111111111111111111111111111111111111'
  const providers = [
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333'
  ]

  it('threads SponsorshipLib from custom addresses', () => {
    const config = helper.getAddressesFromEnv('development', {
      development: { chainId: 8996, SponsorshipLib: sponsorshipLib }
    })
    assert.equal(config.SponsorshipLib, sponsorshipLib)
  })

  it('threads SubsidyProviders from custom addresses', () => {
    const config = helper.getAddressesFromEnv('development', {
      development: { chainId: 8996, SubsidyProviders: providers }
    })
    assert.deepEqual(config.SubsidyProviders, providers)
  })

  it('leaves SponsorshipLib/SubsidyProviders undefined when absent (no throw)', () => {
    const config = helper.getAddressesFromEnv('development', {
      development: { chainId: 8996 }
    })
    assert.isUndefined(config.SponsorshipLib)
    assert.isUndefined(config.SubsidyProviders)
  })
})
