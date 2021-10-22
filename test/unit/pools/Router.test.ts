import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../TestContractHandler'
import Web3 from 'web3'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import FactoryRouter from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import { LoggerInstance } from '../../../src/utils'
// import { NFTDataToken } from '../../../src/datatokens/NFTDatatoken'
import { Router } from '../../../src/pools/Router'

const web3 = new Web3('http://127.0.0.1:8545')
const communityCollector = '0xeE9300b7961e0a01d9f0adb863C7A227A07AaD75'

describe('Router unit test', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let contracts: TestContractHandler
  let router: Router
  let dtAddress: string
  let dtAddress2: string
  let nftAddress: string

  it('should deploy contracts', async () => {
    contracts = new TestContractHandler(
      web3,
      ERC721Template.abi as AbiItem[],
      ERC20Template.abi as AbiItem[],
      PoolTemplate.abi as AbiItem[],
      ERC721Factory.abi as AbiItem[],
      FactoryRouter.abi as AbiItem[],
      SideStaking.abi as AbiItem[],
      FixedRate.abi as AbiItem[],
      Dispenser.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      FactoryRouter.bytecode,
      SideStaking.bytecode,
      FixedRate.bytecode,
      Dispenser.bytecode
    )
    await contracts.getAccounts()
    factoryOwner = contracts.accounts[0]
    nftOwner = contracts.accounts[1]
    user1 = contracts.accounts[2]
    user2 = contracts.accounts[3]
    user3 = contracts.accounts[4]

    await contracts.deployContracts(factoryOwner, FactoryRouter.abi as AbiItem[])

    const daiContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.daiAddress
    )
    await daiContract.methods
      .approve(contracts.factory721Address, web3.utils.toWei('10000'))
      .send({ from: contracts.accounts[0] })
  })

  it('should initiate Router instance', async () => {
    router = new Router(contracts.routerAddress, web3, LoggerInstance)
  })

  it('#getOwner - should return actual owner', async () => {
    const owner = await router.getOwner()
    assert(owner === contracts.accounts[0])
  })

  it('#getNFTFactory - should return NFT Factory address', async () => {
    const factory = await router.getNFTFactory()
    assert(factory === contracts.factory721Address)
  })

  it('#isOceanTokens - should return true if in oceanTokens list', async () => {
    expect(await router.isOceanTokens(contracts.oceanAddress)).to.equal(true)
    expect(await router.isOceanTokens(contracts.daiAddress)).to.equal(false)
  })
  it('#isSideStaking - should return true if in ssContracts list', async () => {
    expect(await router.isSideStaking(contracts.sideStakingAddress)).to.equal(true)
    expect(await router.isSideStaking(contracts.fixedRateAddress)).to.equal(false)
  })
  it('#isFixedPrice - should return true if in fixedPrice list', async () => {
    expect(await router.isFixedPrice(contracts.fixedRateAddress)).to.equal(true)
    expect(await router.isFixedPrice(contracts.daiAddress)).to.equal(false)
    // Dispenser contract is also a fixed price contract
    expect(await router.isFixedPrice(contracts.dispenserAddress)).to.equal(true)
  })
  it('#isPoolTemplate - should return true if in poolTemplates list', async () => {
    expect(await router.isPoolTemplate(contracts.poolTemplateAddress)).to.equal(true)
    expect(await router.isPoolTemplate(contracts.fixedRateAddress)).to.equal(false)
  })
  it('#addOceanToken - should add a new token into oceanTokens list(NO OPF FEE)', async () => {
    await router.addOceanToken(contracts.accounts[0], contracts.daiAddress)
    expect(await router.isOceanTokens(contracts.daiAddress)).to.equal(true)
  })
  it('#removeOceanToken - should remove a token from oceanTokens list', async () => {
    await router.removeOceanToken(contracts.accounts[0], contracts.daiAddress)
    expect(await router.isOceanTokens(contracts.daiAddress)).to.equal(false)
  })
  it('#addSSContract - should add a new token into SSContracts list', async () => {
    await router.addSSContract(contracts.accounts[0], contracts.daiAddress)
    expect(await router.isSideStaking(contracts.daiAddress)).to.equal(true)
  })
  it('#addFixedRate - should add a new token into fixedPrice list', async () => {
    await router.addFixedRateContract(contracts.accounts[0], contracts.daiAddress)
    expect(await router.isFixedPrice(contracts.daiAddress)).to.equal(true)
  })

  it('#getOPFFee - should return actual OPF fee for a given baseToken', async () => {
    const opfFee = 1e15
    expect(await router.getOPFFee(contracts.oceanAddress)).to.equal('0')
    expect(await router.getOPFFee(contracts.daiAddress)).to.equal(opfFee.toString())
  })

  it('#getCurrentOPFFee - should return actual OPF Fee', async () => {
    const opfFee = 1e15
    expect(await router.getCurrentOPFFee()).to.equal(opfFee.toString())
  })

  it('#updateOPFFee - should update opf fee if Router Owner', async () => {
    const opfFee = 1e15
    expect(await router.getCurrentOPFFee()).to.equal(opfFee.toString())
    const newOPFFee = 1e14
    await router.updateOPFFee(contracts.accounts[0], 1e14)
    expect(await router.getCurrentOPFFee()).to.equal(newOPFFee.toString())
  })

  it('#addPoolTemplate - should add a new token into poolTemplates mapping if Router Owner', async () => {
    await router.addPoolTemplate(contracts.accounts[0], contracts.daiAddress)
    expect(await router.isPoolTemplate(contracts.daiAddress)).to.equal(true)
  })

  it('#removePoolTemplate - should add a new token into poolTemplates mapping if Router Owner', async () => {
    await router.removePoolTemplate(contracts.accounts[0], contracts.daiAddress)
    expect(await router.isPoolTemplate(contracts.daiAddress)).to.equal(false)
  })
})
