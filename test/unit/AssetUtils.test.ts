import { assert } from 'chai'
import { KNOWN_CONFIDENTIAL_EVMS } from '../../src/config/index.js'
import { provider, getAddresses } from '../config.js'
import { calculateActiveTemplateIndex } from '../../src/utils/Adresses.js'
import { useOasisSDK } from '../../src/utils/Assets.js'
import { Signer } from 'ethers/lib/ethers.js'

let nftOwner: Signer
let addresses: any
describe('Asset utils (createAsset)', () => {
  before(async () => {
    nftOwner = (await provider.getSigner(0)) as Signer
    addresses = await getAddresses()
  })

  it('should check if confidential EVM', async () => {
    for (const chain of KNOWN_CONFIDENTIAL_EVMS) {
      assert(useOasisSDK(chain) === true, `Chain Id: "${chain}" is not a confidental EVM`)
    }

    // optimism sepolia
    // 11155420
    assert(
      useOasisSDK(11155420) === false,
      `Chain Id: "11155420" is wrongly considered a confidental EVM`
    )
  })

  // checking if active by connecting to the smart contract as well
  it('Calculate index -  Should get correct template index from contract getId() (using template ID as template)', async () => {
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
