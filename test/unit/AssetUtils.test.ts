import { assert } from 'chai'
import { KNOWN_CONFIDENTIAL_EVMS } from '../../src/config'
import { calculateTemplateIndex, isConfidentialEVM } from '../../src/utils'

describe('Asset utils (createAsset)', () => {
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

  it('should get correct template index from contract artifacts', async () => {
    const wrongOne = await calculateTemplateIndex(
      KNOWN_CONFIDENTIAL_EVMS.chainIds[0], // testnet chain
      '12'
    )
    assert(wrongOne === -1, 'wrong template index, should be inexistent!')

    const okIndex = await calculateTemplateIndex(
      KNOWN_CONFIDENTIAL_EVMS.chainIds[1], // mainnet chain
      '0x4dD281EB67DED07E76E413Df16176D66ae69e240'
    )
    assert(okIndex >= 1, 'wrong template index, should exist!')
  })
})
