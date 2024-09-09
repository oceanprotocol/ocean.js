import { assert } from 'chai'
import { KNOWN_CONFIDENTIAL_EVMS } from '../../src/config'
import { provider, getAddresses } from '../config'
import {
  calculateActiveTemplateIndex,
  calculateTemplateIndex,
  isConfidentialEVM
} from '../../src/utils'
import { Signer } from 'ethers/lib/ethers'

let nftOwner: Signer
let addresses: any
describe('Asset utils (createAsset)', () => {
  before(async () => {
    nftOwner = (await provider.getSigner(0)) as Signer
    addresses = await getAddresses()
  })

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

  // checking if active by connecting to the smart contract as well
  it('V2 - should get correct template index from contract artifacts (using template ID as template)', async () => {
    const okTemplate = await calculateActiveTemplateIndex(
      nftOwner,
      addresses.ERC721Factory,
      3
    )
    assert(okTemplate === 3, 'wrong template index, should be index 3!')

    const wrongOne = await calculateActiveTemplateIndex(
      nftOwner,
      addresses.ERC721Factory,
      6
    )
    assert(wrongOne === -1, 'wrong template index, should only exist 3!')
  })
})
