import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import ERC20TemplateEnterprise from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20TemplateEnterprise.sol/ERC20TemplateEnterprise.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import Router from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import OPFCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'

import { TestContractHandler } from '../TestContractHandler'
import { Nft, Datatoken } from '../../src/tokens'
import { NftFactory, NftCreateData } from '../../src/factories'
import { LoggerInstance } from '../../src/utils'

const web3 = new Web3('http://127.0.0.1:8545')

describe('Simple flow', () => {
  let contracts: TestContractHandler
  let nft: Nft
  let datatoken: Datatoken
  let nftFactory: NftFactory
  let nftAddress: string
  let dtAddress: string
  let owner: string
  let bob: string
  let alice: string
  const tokenAmount = '100'
  const transferAmount = '1'

  it('Initialize Ocean v4 contracts', async () => {
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
      OPFCollector.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      Router.bytecode,
      SideStaking.bytecode,
      FixedRate.bytecode,
      Dispenser.bytecode,
      OPFCollector.bytecode
    )
    await contracts.getAccounts()
    owner = contracts.accounts[0]
    bob = contracts.accounts[1]
    alice = contracts.accounts[2]
    await contracts.deployContracts(owner, Router.abi as AbiItem[])
  })

  it('Alice publishes a dataset', async () => {
    nftFactory = new NftFactory(
      contracts.factory721Address,
      web3,
      ERC721Factory.abi as AbiItem[]
    )
    const nftData: NftCreateData = {
      name: 'AliceNFT',
      symbol: 'NFT',
      templateIndex: 1,
      tokenURI: 'https://oceanprotocol.com/nft/'
    }

    nftAddress = await nftFactory.createNFT(owner, nftData)
    nft = new Nft(web3, ERC721Template.abi as AbiItem[])

    dtAddress = await nft.createErc20(
      nftAddress,
      owner,
      owner,
      alice,
      bob,
      '0x0000000000000000000000000000000000000000',
      '0',
      '10000',
      'AliceNFT',
      'NFT',
      1
    )
  })

  it('Alice mints 100 tokens', async () => {
    datatoken = new Datatoken(
      web3,
      ERC20Template.abi as AbiItem[],
      ERC20TemplateEnterprise.abi as AbiItem[]
    )
    await datatoken.mint(dtAddress, alice, tokenAmount)
  })

  it('Alice transfers 1 token to Bob', async () => {
    const ts = await datatoken.transfer(dtAddress, bob, transferAmount, alice)
    LoggerInstance.log('Transfer tx', ts)
  })
})
