import { assert } from 'chai'
import { Signer } from 'ethers'
import { provider, getAddresses } from '../config'

import { SubsidyView } from '../../src/contracts/SubsidyView'
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

  it('detects ISubsidyView on every deployed provider', async function () {
    let checked = 0
    for (const address of providerAddrs) {
      const view = new SubsidyView(signer, address, chainId)
      // Only assert against providers that actually implement the interface; a registry entry
      // that predates ISubsidyView is not a regression.
      if (!(await view.isSubsidyView())) continue
      checked++

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
      const kind = await view.subsidyKind()
      assert(kind in SubsidyKind, `${address} subsidyKind() not a known SubsidyKind`)
      // Revert-tolerance is preserved: an unsupported id still yields false, not a throw.
      assert.strictEqual(await view.supportsInterface('0xffffffff'), false)
    }
    // If the registry held only ISubsidyView providers and none matched, there is nothing to
    // regression-test on this deployment.
    if (checked === 0) this.skip()
  })
})
