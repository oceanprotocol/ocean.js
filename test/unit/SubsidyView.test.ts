import { assert } from 'chai'
import { provider, getAddresses } from '../config'
import { Signer, isAddress } from 'ethers'

import { SubsidyView } from '../../src/contracts/SubsidyView'
import {
  ISUBSIDY_VIEW_INTERFACE_ID,
  ERC165_INTERFACE_ID,
  SubsidyKind
} from '../../src/@types/SubsidyView'

describe('SubsidyView (ISubsidyView read surface)', () => {
  let user1: Signer
  let view: SubsidyView
  let addresses
  let providerAddress: string
  let OCEAN: string

  before(async () => {
    user1 = (await provider.getSigner(3)) as Signer
    addresses = await getAddresses()
    // Any provider exposing ISubsidyView works; take the first from the registry.
    providerAddress = (addresses.SubsidyProviders || [])[0]
    OCEAN = addresses.Ocean
  })

  // ISubsidyView is only on the newer contracts; skip cleanly when the provider is either
  // not deployed in the barge address file or predates the interface. Rebuild a fresh
  // instance each test so reads stay independent of ordering.
  beforeEach(async function () {
    if (!providerAddress) {
      this.skip()
      return
    }
    const { chainId } = await user1.provider.getNetwork()
    view = new SubsidyView(user1, providerAddress, Number(chainId))
    if (!(await view.isSubsidyView())) this.skip()
  })

  it('should require an address', async () => {
    assert.throws(() => new SubsidyView(user1, undefined))
  })

  it('should advertise ERC-165 and ISubsidyView', async () => {
    assert(await view.supportsInterface(ERC165_INTERFACE_ID), 'missing ERC-165')
    assert(
      await view.supportsInterface(ISUBSIDY_VIEW_INTERFACE_ID),
      'missing ISubsidyView'
    )
  })

  it('should return false for an unsupported interface id', async () => {
    assert.strictEqual(await view.supportsInterface('0xffffffff'), false)
  })

  it('should read subsidyKind and version', async () => {
    const kind = await view.subsidyKind()
    assert(kind in SubsidyKind, 'subsidyKind is not a known SubsidyKind')
    const version = await view.version()
    assert(Number.isInteger(version) && version >= 1, 'version is not a positive integer')
  })

  it('should read the bucket report for a payer/token', async () => {
    const report = await view.subsidyBuckets(await user1.getAddress(), OCEAN)
    assert(typeof report.paused === 'boolean', 'paused is not a boolean')
    assert(typeof report.userAllowed === 'boolean', 'userAllowed is not a boolean')
    assert(typeof report.tokenEnabled === 'boolean', 'tokenEnabled is not a boolean')
    assert(Array.isArray(report.buckets), 'buckets is not an array')
    for (const bucket of report.buckets) {
      assert(typeof bucket.unlimited === 'boolean', 'bucket.unlimited is not a boolean')
      assert(typeof bucket.remaining === 'string', 'bucket.remaining is not a string')
    }
  })

  it('should read the single claimable-now figure', async () => {
    const remaining = await view.remainingSubsidy(await user1.getAddress(), OCEAN)
    assert(typeof remaining === 'string', 'remainingSubsidy did not return a string')
  })

  it('should quote a job, returning subsidy and bonus', async () => {
    const node = await user1.getAddress()
    const payer = await user1.getAddress()
    const quote = await view.quoteSubsidy(node, payer, 0, OCEAN, '1', '1')
    assert(typeof quote.subsidy === 'string', 'quote.subsidy is not a string')
    assert(typeof quote.bonus === 'string', 'quote.bonus is not a string')
  })

  it('should read eligibility gates and job types', async () => {
    assert(typeof (await view.isUserAllowed(await user1.getAddress())) === 'boolean')
    assert(typeof (await view.isNodeAllowed(await user1.getAddress())) === 'boolean')
    assert(Array.isArray(await view.getAllowedJobTypes()), 'job types not an array')
  })

  it('should read the available balance', async () => {
    const balance = await view.availableBalance(OCEAN)
    assert(typeof balance === 'string', 'availableBalance did not return a string')
    assert(isAddress(providerAddress), 'provider address invalid')
  })
})
