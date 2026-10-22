import { assert } from 'chai'
import { Interface } from 'ethers'
import { createRequire } from 'module'
import {
  ISUBSIDY_VIEW_INTERFACE_ID,
  ISUBSIDY_PROVIDER_INTERFACE_ID,
  ISUBSIDY_VIEW_V2_INTERFACE_ID,
  ISUBSIDY_MODE_CONFIG_INTERFACE_ID,
  ISUBSIDY_LOCK_PROVIDER_INTERFACE_ID,
  IESCROW_CORE_INTERFACE_ID,
  IESCROW_LOCK_SUBSIDY_INTERFACE_ID,
  IESCROW_ENTERPRISE_INTERFACE_ID
} from '../../src/@types'

/**
 * Guards the hardcoded ERC-165 interface-id constants against drift: for each interface, recompute
 * the id from the shipped @oceanprotocol/contracts ABI (the XOR of its function selectors — the
 * ERC-165 rule, unaffected by events/errors) and assert it equals the exported constant.
 *
 * No chain needed. Cases whose artifact isn't present in the installed contracts package (e.g. the
 * Escrow-v2 interfaces before the contracts bump lands) skip cleanly, so this runs green both before
 * and after the bump and will catch an id change once the new package is installed.
 */
const require = createRequire(import.meta.url)

const ARTIFACTS = '@oceanprotocol/contracts/artifacts/contracts/interfaces'

function computeInterfaceId(artifactPath: string): string | null {
  let abi
  try {
    abi = require(artifactPath).abi
  } catch {
    return null // artifact not present in the installed contracts package
  }
  const iface = new Interface(abi)
  let acc = 0n
  iface.forEachFunction((fn) => {
    acc ^= BigInt(fn.selector)
  })
  return '0x' + acc.toString(16).padStart(8, '0')
}

const CASES: Array<[string, string, string]> = [
  [
    'ISubsidyView',
    `${ARTIFACTS}/ISubsidyView.sol/ISubsidyView.json`,
    ISUBSIDY_VIEW_INTERFACE_ID
  ],
  [
    'ISubsidyProvider',
    `${ARTIFACTS}/ISubsidyProvider.sol/ISubsidyProvider.json`,
    ISUBSIDY_PROVIDER_INTERFACE_ID
  ],
  [
    'ISubsidyViewV2',
    `${ARTIFACTS}/ISubsidyViewV2.sol/ISubsidyViewV2.json`,
    ISUBSIDY_VIEW_V2_INTERFACE_ID
  ],
  [
    'ISubsidyModeConfig',
    `${ARTIFACTS}/ISubsidyModeConfig.sol/ISubsidyModeConfig.json`,
    ISUBSIDY_MODE_CONFIG_INTERFACE_ID
  ],
  [
    'ISubsidyLockProvider',
    `${ARTIFACTS}/ISubsidyLockProvider.sol/ISubsidyLockProvider.json`,
    ISUBSIDY_LOCK_PROVIDER_INTERFACE_ID
  ],
  [
    'IEscrowCore',
    `${ARTIFACTS}/IEscrowCore.sol/IEscrowCore.json`,
    IESCROW_CORE_INTERFACE_ID
  ],
  [
    'IEscrowLockSubsidy',
    `${ARTIFACTS}/IEscrowLockSubsidy.sol/IEscrowLockSubsidy.json`,
    IESCROW_LOCK_SUBSIDY_INTERFACE_ID
  ],
  [
    'IEscrowEnterprise',
    `${ARTIFACTS}/IEscrowEnterprise.sol/IEscrowEnterprise.json`,
    IESCROW_ENTERPRISE_INTERFACE_ID
  ]
]

describe('ERC-165 interface id constants match the contract ABIs', () => {
  for (const [name, artifactPath, expected] of CASES) {
    it(`${name} constant matches the computed id`, function () {
      const actual = computeInterfaceId(artifactPath)
      if (actual === null) {
        this.skip() // v2 interface not in the installed contracts package yet
        return
      }
      assert.equal(
        actual,
        expected.toLowerCase(),
        `${name} interface id drift: constant ${expected}, computed ${actual}`
      )
    })
  }
})
