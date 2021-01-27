import { assert } from 'chai'
import { ConfigHelper } from '../../../src'

describe('ConfigHelper', () => {
  it('should get config based on network name', () => {
    const network = 'rinkeby'
    const config = new ConfigHelper().getConfig(network)
    assert(config.nodeUri.includes(network))
    assert(config.factoryAddress != null)
  })

  it('should get config based on network name, and add passed Infura ID', () => {
    const network = 'rinkeby'
    const infuraId = 'helloInfura'
    const config = new ConfigHelper().getConfig(network, infuraId)
    assert(config.nodeUri.includes(infuraId))
    assert(config.factoryAddress != null)
  })

  it('should get config based on chain ID', () => {
    const network = 4
    const config = new ConfigHelper().getConfig(network)
    assert(config.nodeUri.includes('rinkeby'))
    assert(config.factoryAddress != null)
  })

  it('should return nothing with unknown network', () => {
    const network = 'blabla'
    const config = new ConfigHelper().getConfig(network)
    assert(config === null)
  })
  it('should get a custom config', () => {
    const network = 'unknown'
    const config = new ConfigHelper().getConfig(network)
    assert(config.factoryAddress === '0x1234')
  })
})
