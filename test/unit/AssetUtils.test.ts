import { assert } from 'chai'
import { KNOWN_CONFIDENTIAL_EVMS } from '../../src/config'
import { calculateTemplateIndex, isConfidentialEVM } from '../../src/utils'

describe('Asset utils (createAsset)', () => {
  it('should check if confidential EVM', async () => {
    for (const network of KNOWN_CONFIDENTIAL_EVMS.networks) {
      network.name.map((networkName) => {
        assert(
          isConfidentialEVM(networkName) === true,
          `Network: "${networkName}" is not a confidental EVM`
        )
        return true
      })
    }
    for (const chain of KNOWN_CONFIDENTIAL_EVMS.networks) {
      assert(
        isConfidentialEVM(chain.chainId) === true,
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

  it('should get correct template index from contract artifacts (using SC address as template)', async () => {
    const wrongOne = await calculateTemplateIndex(
      KNOWN_CONFIDENTIAL_EVMS.networks[1].chainId, // testnet chain
      '12'
    )
    assert(wrongOne === -1, 'wrong template index, should be inexistent!')

    const okIndex = await calculateTemplateIndex(
      KNOWN_CONFIDENTIAL_EVMS.networks[0].chainId, // mainnet chain
      '0x4dD281EB67DED07E76E413Df16176D66ae69e240'
    )
    assert(okIndex >= 1, 'wrong template index, should exist!')

    const okIndexNonConfidential = await calculateTemplateIndex(
      11155111, // sepolia
      '0xDEfD0018969cd2d4E648209F876ADe184815f038'
    )
    assert(okIndexNonConfidential === 2, 'Should be template 2 for sepolia!')

    const notOkIndexNonConfidential = await calculateTemplateIndex(
      11155111, // sepolia
      '0xDEfD0018969cd2d4E648209F876ADe184815f022' // wrong template
    )
    assert(notOkIndexNonConfidential === -1, 'Template should not exist on sepolia!')
  })

  it('should get correct template index from contract artifacts (using template ID as template)', async () => {
    const okTemplate = await calculateTemplateIndex(
      KNOWN_CONFIDENTIAL_EVMS.networks[1].chainId, // testnet chain
      4
    )
    assert(okTemplate === 4, 'wrong template index, should be index 4!')

    const wrongOne = await calculateTemplateIndex(
      KNOWN_CONFIDENTIAL_EVMS.networks[0].chainId, // mainnet chain
      6
    )
    assert(wrongOne === -1, 'wrong template index, should only exist 5!')

    const okIndexNonConfidential = await calculateTemplateIndex(
      11155111, // sepolia
      2 // ok template
    )
    assert(okIndexNonConfidential === 2, 'Should be template 2 for sepolia!')

    const notOkIndexNonConfidential = await calculateTemplateIndex(
      11155111, // sepolia
      3 // wrong template
    )
    assert(notOkIndexNonConfidential === -1, 'Template 3 should not exist on sepolia!')
  })
})
