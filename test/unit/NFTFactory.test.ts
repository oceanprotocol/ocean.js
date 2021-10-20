import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../TestContractHandler'
import Web3 from 'web3'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import Router from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import { LoggerInstance } from '../../src/utils'
// import { NFTDataToken } from '../../../src/datatokens/NFTDatatoken'
import { NFTFactory } from '../../src/factories/NFTFactory'
// import { DT20Factory } from '../../../src/factories/DT20Factory'

const web3 = new Web3('http://127.0.0.1:8545')

describe('NFT Factory test', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let contracts: TestContractHandler
  let nftFactory: NFTFactory

  const nftName = 'NFT'
  const nftSymbol = 'NFTSymbol'
  const nftTemplateIndex = 1
  const data = web3.utils.asciiToHex('SomeData')
  const flags = web3.utils.asciiToHex(
    'f8929916089218bdb4aa78c3ecd16633afd44b8aef89299160'
  )

  // TODO: complete unit test
  it('should deploy contracts', async () => {
    contracts = new TestContractHandler(
      web3,
      ERC721Template.abi as AbiItem[],
      ERC20Template.abi as AbiItem[],
      PoolTemplate.abi as AbiItem[],
      ERC721Factory.abi as AbiItem[],
      Router.abi as AbiItem[],
      SideStaking.abi as AbiItem[],
      FixedRate.abi as AbiItem[],
      Dispenser.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      Router.bytecode,
      SideStaking.bytecode,
      FixedRate.bytecode,
      Dispenser.bytecode
    )
    await contracts.getAccounts()
    factoryOwner = contracts.accounts[0]
    nftOwner = contracts.accounts[1]
    user1 = contracts.accounts[2]
    console.log(factoryOwner)
    await contracts.deployContracts(factoryOwner, Router.abi as AbiItem[])

    console.log('BOOM')
  })

  it('should initiate NFTFactory instance', async () => {
    nftFactory = new NFTFactory(contracts.factory721Address, web3, LoggerInstance)
  })

  it('#getCurrentNFTCount - should return actual nft count (0)', async () => {
    const nftCount = await nftFactory.getCurrentNFTCount()
    assert(nftCount == 0)
  })

  it('#getCurrentTokenCount - should return actual token count (0)', async () => {
    const tokenCount = await nftFactory.getCurrentTokenCount()
    assert(tokenCount == 0)
  })
  it('#getOwner - should return actual owner', async () => {
    const owner = await nftFactory.getOwner()
    assert(owner === contracts.accounts[0])
  })
  it('#getCurrentNFTTemplateCount - should return actual nft template count (1)', async () => {
    const nftTemplateCount = await nftFactory.getCurrentNFTTemplateCount()
    assert(nftTemplateCount == 1)
  })
  it('#getCurrentTokenTemplateCount - should return actual token template count (1)', async () => {
    const tokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()
    assert(tokenTemplateCount == 1)
  })
  it('#getNFTTemplate - should return NFT template struct', async () => {
    const nftTemplate = await nftFactory.getNFTTemplate(1)
    assert(nftTemplate.isActive === true)
    assert(nftTemplate.templateAddress === contracts.template721Address)
  })
  it('#getTokenTemplate - should return Token template struct', async () => {
    const tokenTemplate = await nftFactory.getTokenTemplate(1)
    assert(tokenTemplate.isActive === true)
    assert(tokenTemplate.templateAddress === contracts.template20Address)
  })
  it('#addNFTTemplate - should add NFT template if factory owner', async () => {
    await nftFactory.addNFTTemplate(contracts.accounts[0], contracts.fixedRateAddress) // contracts.fixedRateAddress it's just a dummy contract in this case
    const nftTemplateCount = await nftFactory.getCurrentNFTTemplateCount()
    assert(nftTemplateCount == 2)
    const nftTemplate = await nftFactory.getNFTTemplate(2)
    assert(nftTemplate.isActive === true)
    assert(nftTemplate.templateAddress === contracts.fixedRateAddress)
  })
  it('#disableNFTTemplate - should disable NFT template if factory owner', async () => {
    let nftTemplate = await nftFactory.getNFTTemplate(2)
    assert(nftTemplate.isActive === true)
    await nftFactory.disableNFTTemplate(contracts.accounts[0], 2) // owner disable template index = 2

    nftTemplate = await nftFactory.getNFTTemplate(2)
    assert(nftTemplate.isActive === false)
  })
  it('#reactivateNFTTemplate - should disable NFT template if factory owner', async () => {
    let nftTemplate = await nftFactory.getNFTTemplate(2)
    assert(nftTemplate.isActive === false)
    await nftFactory.reactivateNFTTemplate(contracts.accounts[0], 2) // owner reactivate template index = 2

    nftTemplate = await nftFactory.getNFTTemplate(2)
    assert(nftTemplate.isActive === true)
  })
  it('#addTokenTemplate - should add Datatoken template if factory owner', async () => {
    await nftFactory.addTokenTemplate(contracts.accounts[0], contracts.fixedRateAddress) // contracts.fixedRateAddress it's just a dummy contract in this case
    const tokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()
    assert(tokenTemplateCount == 2)
    const nftTemplate = await nftFactory.getTokenTemplate(2)
    assert(nftTemplate.isActive === true)
    assert(nftTemplate.templateAddress === contracts.fixedRateAddress)
  })

  it('#disableTokenTemplate - should disable Token template if factory owner', async () => {
    let tokenTemplate = await nftFactory.getTokenTemplate(2)
    assert(tokenTemplate.isActive === true)
    await nftFactory.disableTokenTemplate(contracts.accounts[0], 2) // owner disable template index = 2

    tokenTemplate = await nftFactory.getTokenTemplate(2)
    assert(tokenTemplate.isActive === false)
  })
  it('#reactivateTokenTemplate - should disable Token template if factory owner', async () => {
    let tokenTemplate = await nftFactory.getTokenTemplate(2)
    assert(tokenTemplate.isActive === false)
    await nftFactory.reactivateTokenTemplate(contracts.accounts[0], 2) // owner reactivate template index = 2

    tokenTemplate = await nftFactory.getTokenTemplate(2)
    assert(tokenTemplate.isActive === true)
  })
})
