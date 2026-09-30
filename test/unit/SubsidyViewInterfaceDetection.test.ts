import { assert } from 'chai'
import { JsonRpcProvider, Wallet } from 'ethers'

import { SubsidyView } from '../../src/contracts/SubsidyView'
import {
  ERC165_INTERFACE_ID,
  ISUBSIDY_VIEW_INTERFACE_ID,
  SubsidyKind
} from '../../src/@types/SubsidyView'

// Regression test for the supportsInterface()/isSubsidyView() false negative: the compiled
// ISubsidyView artifact omits the inherited ERC-165 supportsInterface(bytes4) fragment, so
// the ethers contract instance had no such method and every feature-detection call was
// silently swallowed to `false`. These two live Base-mainnet providers provably implement
// ISubsidyView on-chain, so isSubsidyView() must be true and subsidyKind() must match.
const BASE_RPC = 'https://base-mainnet.g.alchemy.com/v2/GaWDSwsVY9z2CCzIQWv09FNm89uPBGgC'
const BASE_CHAIN_ID = 8453
const LIVE_PROVIDERS = [
  { address: '0x3EFDD8f728c8e774aB81D14d0B2F07a8238960f4', kind: SubsidyKind.ONE_TIME },
  {
    address: '0xA8513c0457AfaD54a57664Ba5C742c24f1D624be',
    kind: SubsidyKind.ROLLING_WINDOW
  }
]

describe('SubsidyView ERC-165 detection against live Base providers', () => {
  let signer: Wallet

  before(async function () {
    // Read-only calls, but SubsidyView needs a signer with a provider. A random wallet on
    // the Base RPC is enough. Skip cleanly if the RPC is unreachable so unit runs stay green
    // offline / in CI without network egress.
    this.timeout(20000)
    const rpc = new JsonRpcProvider(BASE_RPC)
    try {
      const { chainId } = await rpc.getNetwork()
      if (Number(chainId) !== BASE_CHAIN_ID) this.skip()
    } catch {
      this.skip()
      return
    }
    signer = Wallet.createRandom().connect(rpc)
  })

  for (const { address, kind } of LIVE_PROVIDERS) {
    it(`detects ISubsidyView on ${address} (${SubsidyKind[kind]})`, async function () {
      this.timeout(20000)
      const view = new SubsidyView(signer, address, BASE_CHAIN_ID)

      assert.strictEqual(
        await view.supportsInterface(ERC165_INTERFACE_ID),
        true,
        'should advertise ERC-165'
      )
      assert.strictEqual(
        await view.supportsInterface(ISUBSIDY_VIEW_INTERFACE_ID),
        true,
        'should advertise ISubsidyView'
      )
      assert.strictEqual(await view.isSubsidyView(), true, 'isSubsidyView() must be true')
      assert.strictEqual(
        await view.subsidyKind(),
        kind,
        'subsidyKind() should match the on-chain value'
      )
      // Revert-tolerance is preserved: an unsupported id still yields false, not a throw.
      assert.strictEqual(await view.supportsInterface('0xffffffff'), false)
    })
  }
})
