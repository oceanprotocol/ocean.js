import { assert } from 'chai'
import { KNOWN_CONFIDENTIAL_EVMS } from '../../src/config'
import { isConfidentialEVM } from '../../src/utils'

describe('Asste utils (createAsset)', () => {
  it('should check if confidential EVM', async () => {
    for (const name of KNOWN_CONFIDENTIAL_EVMS.names) {
      assert(
        isConfidentialEVM(name) === true,
        `Network: "${name}" is not a confidental EVM`
      )
    }
    for (const chain of KNOWN_CONFIDENTIAL_EVMS.chainIds) {
      assert(
        isConfidentialEVM(chain) === true,
        `Chain Id: "${chain}" is not a confidental EVM`
      )
    }

    // optimism sepolia
    // 11155420
    assert(
      isConfidentialEVM(11155420) === false,
      `Chain Id: "11155420" is wrongly considered a confidental EVM`
    )
  })
})
