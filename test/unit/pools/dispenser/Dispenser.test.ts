import Web3 from 'web3'
import { AbiItem, AbiInput } from 'web3-utils'
import { assert, expect } from 'chai'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import FactoryRouter from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import DispenserTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import OPFCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import { NFTFactory, NFTCreateData } from '../../../../src/factories/'
import { Datatoken } from '../../../../src/datatokens/'
import { Dispenser } from '../../../../src/pools/dispenser/'
import { TestContractHandler } from '../../../TestContractHandler'
import { Erc20CreateParams } from '../../../../src/interfaces'

const web3 = new Web3('http://127.0.0.1:8545')

describe('Dispenser flow', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let contracts: TestContractHandler
  let DispenserAddress: string
  let DispenserClass: Dispenser
  let nftFactory: NFTFactory
  let datatoken: Datatoken
  let nftAddress: string
  let dtAddress: string

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
      DispenserTemplate.abi as AbiItem[],
      OPFCollector.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      FactoryRouter.bytecode,
      SideStaking.bytecode,
      FixedRate.bytecode,
      DispenserTemplate.bytecode,
      OPFCollector.bytecode
    )
    await contracts.getAccounts()
    factoryOwner = contracts.accounts[0]
    nftOwner = contracts.accounts[1]
    user1 = contracts.accounts[2]
    user2 = contracts.accounts[3]
    user3 = contracts.accounts[4]

    await contracts.deployContracts(factoryOwner, FactoryRouter.abi as AbiItem[])
  })

  it('should initialize Dispenser class', async () => {
    DispenserClass = new Dispenser(
      web3,
      contracts.dispenserAddress,
      DispenserTemplate.abi as AbiItem[]
    )
    assert(DispenserClass !== null)
  })

  it('#createNftwithErc - should create an NFT and a Datatoken ', async () => {
    nftFactory = new NFTFactory(contracts.factory721Address, web3)

    const nftData: NFTCreateData = {
      name: '72120Bundle',
      symbol: '72Bundle',
      templateIndex: 1,
      baseURI: 'https://oceanprotocol.com/nft/'
    }

    const ercParams: Erc20CreateParams = {
      templateIndex: 1,
      minter: contracts.accounts[0],
      feeManager: user3,
      mpFeeAddress: user2,
      feeToken: '0x0000000000000000000000000000000000000000',
      cap: '10000',
      feeAmount: '0',
      name: 'ERC20B1',
      symbol: 'ERC20DT1Symbol'
    }

    const txReceipt = await nftFactory.createNftWithErc(
      contracts.accounts[0],
      nftData,
      ercParams
    )

    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')

    nftAddress = txReceipt.events.NFTCreated.returnValues.newTokenAddress
    dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('Make user2 minter', async () => {
    datatoken = new Datatoken(web3, ERC20Template.abi as AbiItem[])
    await datatoken.addMinter(dtAddress, contracts.accounts[0], user2)
    assert((await datatoken.getDTPermissions(dtAddress, user2)).minter === true)
  })

  it('Create dispenser', async () => {
    const tx = await DispenserClass.create(
      dtAddress,
      contracts.accounts[0],
      '1',
      '1',
      '0x0000000000000000000000000000000000000000'
    )
    assert(tx, 'Cannot create dispenser')
  })

  it('Activate dispenser', async () => {
    const tx = await DispenserClass.activate(dtAddress, '1', '1', contracts.accounts[0])
    assert(tx, 'Cannot activate dispenser')
  })

  it('user2 gets the dispenser status', async () => {
    const status = await DispenserClass.status(dtAddress)
    assert(status.active === true, 'Dispenser not active')
    assert(status.owner === user2, 'Dispenser owner is not alice')
    assert(status.minterApproved === true, 'Dispenser is not a minter')
  })

  it('user2 deactivates the dispenser', async () => {
    const tx = await DispenserClass.deactivate(dtAddress, user2)
    assert(tx, 'Cannot deactivate dispenser')
    const status = await DispenserClass.status(dtAddress)
    assert(status.active === false, 'Dispenser is still active')
  })

  it('user2 sets user3 as an AllowedSwapper for the dispenser', async () => {
    const tx = await DispenserClass.setAllowedSwapper(dtAddress, user2, user3)
    assert(tx, 'Cannot deactivate dispenser')
    const status = await DispenserClass.status(dtAddress)
    assert(status.allowedSwapper === user3, 'Dispenser is still active')
  })

  it('User3 requests datatokens', async () => {
    const check = await DispenserClass.isDispensable(dtAddress, datatoken, user3, '1')
    assert(check === true, 'isDispensable should return true')
    const tx = await DispenserClass.dispense(dtAddress, user3, '1', user3)
    assert(tx, 'user3 failed to get 1DT')
  })

  it('tries to withdraw all datatokens', async () => {
    const tx = await DispenserClass.ownerWithdraw(dtAddress, user3)
    assert(tx === null, 'Request should fail')
  })

  it('user2 withdraws all datatokens', async () => {
    const tx = await DispenserClass.ownerWithdraw(dtAddress, user2)
    assert(tx, 'user2 failed to withdraw all her tokens')
    const status = await DispenserClass.status(dtAddress)
    assert(status.balance === '0', 'Balance > 0')
  })
})
