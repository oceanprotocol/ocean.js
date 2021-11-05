import { Ocean } from '../../src/ocean/Ocean'
import config from './config'
import { assert } from 'chai'

describe('Event Access Control tests', () => {
  let ocean: Ocean
  const aliceWallet = '0xbcE5A3468386C64507D30136685A99cFD5603135'

  it('Initialize Ocean with Event Access Control', async () => {
    const rbacUri = 'http://localhost:3000'
    ocean = await Ocean.getInstance(config)
    await ocean.eventAccessControl.setBaseUrl(rbacUri)
    assert(ocean.eventAccessControl.url === rbacUri)
  })
  it('Alice should not allow to comsume an asset from the market', async () => {
    const isAllow = await ocean.eventAccessControl.isPermit(
      'market',
      'consume',
      'address',
      aliceWallet
    )
    assert(isAllow === false)
  })
})
