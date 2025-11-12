import { assert } from 'chai'
import { provider, getAddresses } from '../config'
import { Signer } from 'ethers'

import { Datatoken, amountToUnits, unitsToAmount } from '../../src/'
import { EnterpriseFeeCollectorContract } from '../../src/contracts/EnterpriseFeeCollector'
import BigNumber from 'bignumber.js'

describe('EnterpriseFeeCollector payments flow', () => {
  let user1: Signer
  let user2: Signer
  let EnterpriseFeeCollector: EnterpriseFeeCollectorContract
  let addresses
  let OCEAN

  before(async () => {
    user1 = (await provider.getSigner(3)) as Signer
    user2 = (await provider.getSigner(4)) as Signer

    addresses = await getAddresses()
    OCEAN = addresses.Ocean
  })

  it('should initialize EnterpriseFeeCollectorContract class', async () => {
    const { chainId } = await user2.provider.getNetwork()
    EnterpriseFeeCollector = new EnterpriseFeeCollectorContract(
      addresses.EnterpriseFeeCollector,
      user2,
      Number(chainId)
    )
    assert(EnterpriseFeeCollector !== null)
  })

  it('Get token', async () => {
    const tx = await EnterpriseFeeCollector.getToken(OCEAN)
    assert(tx, 'failed to get token')
  })
})
