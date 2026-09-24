import { assert } from 'chai'
import { provider, getAddresses, getTestConfig } from '../config'
import { Signer, isAddress } from 'ethers'

import { OPFSubsidyProvider } from '../../src/contracts/OPFSubsidyProvider'

describe('OPFSubsidyProvider read/quote flow', () => {
  let user1: Signer
  let subsidyProvider: OPFSubsidyProvider
  let addresses
  let subsidyAddress: string
  let OCEAN: string

  before(async () => {
    user1 = (await provider.getSigner(3)) as Signer
    addresses = await getAddresses()
    subsidyAddress = addresses.OPFSubsidyProvider
    OCEAN = addresses.Ocean
  })

  // The subsidy contract is not part of every stack; skip cleanly when it is not
  // deployed in the barge address file. Otherwise (re)build a fresh instance so each
  // read test is independent of test ordering.
  beforeEach(async function () {
    if (!subsidyAddress) {
      this.skip()
      return
    }
    const { chainId } = await user1.provider.getNetwork()
    subsidyProvider = new OPFSubsidyProvider(user1, subsidyAddress, Number(chainId))
  })

  it('should initialize with an explicit address', async () => {
    const { chainId } = await user1.provider.getNetwork()
    subsidyProvider = new OPFSubsidyProvider(user1, subsidyAddress, Number(chainId))
    assert(subsidyProvider !== null)
    assert(subsidyProvider.address === subsidyAddress)
  })

  it('should default the address to the configured OPFSubsidyProvider', async () => {
    const config = await getTestConfig(user1)
    config.OPFSubsidyProvider = subsidyAddress
    const defaulted = new OPFSubsidyProvider(user1, undefined, undefined, config)
    assert(defaulted.address === subsidyAddress)
  })

  it('should read the allowed job types', async () => {
    const jobTypes = await subsidyProvider.getAllowedJobTypes()
    assert(Array.isArray(jobTypes), 'allowed job types is not an array')
  })

  it('should read the current period indexes', async () => {
    const dayIndex = await subsidyProvider.currentDayIndex()
    assert(dayIndex !== undefined, 'failed to read current day index')
  })

  it('should read token limits for OCEAN', async () => {
    const limits = await subsidyProvider.getTokenLimits(OCEAN)
    assert(limits !== null, 'failed to read token limits')
    assert(typeof limits.enabled === 'boolean', 'enabled is not a boolean')
  })

  it('should check user eligibility', async () => {
    const allowed = await subsidyProvider.isUserAllowed(await user1.getAddress())
    assert(typeof allowed === 'boolean', 'isUserAllowed did not return a boolean')
  })

  it('should read the user access list', async () => {
    const userAccessList = await subsidyProvider.getUserAccessList()
    assert(isAddress(userAccessList), 'getUserAccessList did not return an address')
  })

  it('should read the node access list', async () => {
    const nodeAccessList = await subsidyProvider.getNodeAccessList()
    assert(isAddress(nodeAccessList), 'getNodeAccessList did not return an address')
  })
})
