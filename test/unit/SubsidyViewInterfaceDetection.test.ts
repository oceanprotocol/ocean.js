import { assert } from 'chai'
import { Signer } from 'ethers'
import { provider, getAddresses } from '../config'

import { SubsidyView } from '../../src/contracts/SubsidyView'
import { isUnsupportedInterfaceError } from '../../src/utils/ContractUtils'
import {
  ERC165_INTERFACE_ID,
  ISUBSIDY_VIEW_INTERFACE_ID,
  SubsidyKind
} from '../../src/@types/SubsidyView'

// Regression test for the supportsInterface()/isSubsidyView() false negative: the compiled
// ISubsidyView artifact omits the inherited ERC-165 supportsInterface(bytes4) fragment, so the
// ethers contract instance had no such method and every feature-detection call was silently
// swallowed to `false` — `SubsidyView.getDefaultAbi()` merges the fragment back in. Run it against
// the LOCALLY-deployed subsidy providers (the barge `SubsidyProviders` registry); a real on-chain
// ISubsidyView provider must report supportsInterface()/isSubsidyView() === true. No external RPC
// and no hardcoded live addresses — skips cleanly when no provider is deployed.
describe('SubsidyView ERC-165 detection against local providers', () => {
  let signer: Signer
  let chainId: number
  let providerAddrs: string[]

  before(async function () {
    signer = (await provider.getSigner(3)) as Signer
    chainId = Number(await signer.provider.getNetwork().then((n) => n.chainId))
    const addresses = await getAddresses()
    providerAddrs = addresses.SubsidyProviders || []
    if (providerAddrs.length === 0) this.skip()
  })

  it('detects ISubsidyView on every deployed subsidy provider', async function () {
    let checked = 0
    for (const address of providerAddrs) {
      const view = new SubsidyView(signer, address, chainId)
      // Decide whether this is a real subsidy provider using subsidyKind() — a native ISubsidyView
      // method that does NOT depend on the supportsInterface merge this test guards. Crucially we
      // must NOT gate on isSubsidyView()/supportsInterface() here: if those regressed to a false
      // negative, gating on them would skip every candidate and hide the very bug under test.
      let kind: SubsidyKind
      try {
        kind = await view.subsidyKind()
      } catch (error) {
        // A revert / empty data / missing method means this address is not a subsidy provider —
        // skip it. But re-throw genuine RPC/network errors so a transient failure can't silently
        // drop every candidate and let the suite skip instead of surfacing the problem.
        if (isUnsupportedInterfaceError(error)) continue
        throw error
      }
      checked++

      assert(kind in SubsidyKind, `${address} subsidyKind() not a known SubsidyKind`)
      // A real subsidy provider MUST advertise ERC-165 + ISubsidyView; a false here is the bug.
      assert.strictEqual(
        await view.supportsInterface(ERC165_INTERFACE_ID),
        true,
        `${address} should advertise ERC-165`
      )
      assert.strictEqual(
        await view.supportsInterface(ISUBSIDY_VIEW_INTERFACE_ID),
        true,
        `${address} should advertise ISubsidyView`
      )
      assert.strictEqual(
        await view.isSubsidyView(),
        true,
        `${address} isSubsidyView() must be true`
      )
      // Revert-tolerance is preserved: an unsupported id still yields false, not a throw.
      assert.strictEqual(await view.supportsInterface('0xffffffff'), false)
    }
    // Skip only when the fixture has no subsidy provider at all — never because detection failed.
    if (checked === 0) this.skip()
  })
})
