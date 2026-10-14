import { assert } from 'chai'
import { provider, getAddresses } from '../config'
import { Signer, isAddress } from 'ethers'

import { OneTimeSubsidyProvider } from '../../src/contracts/OneTimeSubsidyProvider'
import { SubsidyView } from '../../src/contracts/SubsidyView'
import { SubsidyKind } from '../../src/@types/SubsidyView'

describe('OneTimeSubsidyProvider read flow', () => {
  let user1: Signer
  let subsidy: OneTimeSubsidyProvider
  let addresses
  let oneTimeAddress: string
  let OCEAN: string

  before(async () => {
    user1 = (await provider.getSigner(3)) as Signer
    addresses = await getAddresses()
    OCEAN = addresses.Ocean
    // Discover the one-time provider among the SubsidyProviders registry by its kind.
    const registry: string[] = addresses.SubsidyProviders || []
    const { chainId } = await user1.provider.getNetwork()
    for (const addr of registry) {
      const view = new SubsidyView(user1, addr, Number(chainId))
      if (!(await view.isSubsidyView())) continue
      if ((await view.subsidyKind()) === SubsidyKind.ONE_TIME) {
        oneTimeAddress = addr
        break
      }
    }
  })

  // Skip cleanly when no one-time provider is deployed in the barge address file.
  beforeEach(async function () {
    if (!oneTimeAddress) {
      this.skip()
      return
    }
    const { chainId } = await user1.provider.getNetwork()
    subsidy = new OneTimeSubsidyProvider(user1, oneTimeAddress, Number(chainId))
  })

  it('should require an address', async () => {
    assert.throws(() => new OneTimeSubsidyProvider(user1, undefined))
  })

  it('should be a SubsidyView and report the ONE_TIME kind', async () => {
    assert(subsidy instanceof SubsidyView, 'not a SubsidyView subtype')
    assert.strictEqual(await subsidy.subsidyKind(), SubsidyKind.ONE_TIME)
  })

  it('should read the token config', async () => {
    const config = await subsidy.getTokenConfig(OCEAN)
    assert(typeof config.enabled === 'boolean', 'enabled is not a boolean')
    assert(typeof config.defaultCredit === 'string', 'defaultCredit is not a string')
    assert(typeof config.pctBps === 'string', 'pctBps is not a string')
  })

  it('should read credit, remaining credit and usage for a payer', async () => {
    const payer = await user1.getAddress()
    assert(typeof (await subsidy.effectiveCredit(payer, OCEAN)) === 'string')
    assert(typeof (await subsidy.remainingCredit(payer, OCEAN)) === 'string')
    assert(typeof (await subsidy.usedBy(payer, OCEAN)) === 'string')
    assert(typeof (await subsidy.hasUserCredit(payer, OCEAN)) === 'boolean')
  })

  it('should read the round accounting', async () => {
    const payer = await user1.getAddress()
    assert(typeof (await subsidy.globalRound()) === 'string', 'globalRound not a string')
    assert(typeof (await subsidy.userRound(payer)) === 'string', 'userRound not a string')
    assert(
      typeof (await subsidy.effectiveRound(payer)) === 'string',
      'effectiveRound not a string'
    )
  })

  it('should read the access-list gates', async () => {
    assert(
      isAddress(await subsidy.getUserAccessList()),
      'user access list not an address'
    )
    assert(
      isAddress(await subsidy.getNodeAccessList()),
      'node access list not an address'
    )
  })
})
