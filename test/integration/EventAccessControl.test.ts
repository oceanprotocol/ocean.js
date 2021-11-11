import { Ocean } from '../../src/ocean/Ocean'
import config from './config'
import { assert } from 'chai'

describe('Event Access Control tests', () => {
  let ocean: Ocean
  const aliceWallet = '0xBE5449a6A97aD46c8558A3356267Ee5D2731ab5e'

  it('Initialize Ocean with Event Access Control', async () => {
    const rbacUri = 'http://localhost:3000'
    ocean = await Ocean.getInstance(config)
    await ocean.eventAccessControl.setBaseUrl(rbacUri)
    assert(ocean.eventAccessControl.url === rbacUri)
  })

  it('Alice should not allow to publish an asset from the market', async () => {
    const isAllow = await ocean.eventAccessControl.isPermit(
      'market',
      'publish',
      'address',
      aliceWallet
    )
    assert(isAllow === false)
  })
})
