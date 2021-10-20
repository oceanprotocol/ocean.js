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

    const nftCount = await nftFactory.getCurrentNFTCount()
    assert(nftCount == 0)
  })
})
