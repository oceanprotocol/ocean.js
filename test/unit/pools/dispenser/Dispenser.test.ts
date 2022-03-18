import { AbiItem } from 'web3-utils'
import { assert, expect } from 'chai'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import DispenserTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import { TestContractHandler } from '../../../TestContractHandler'
import { web3 } from '../../../config'
import {
  NftFactory,
  NftCreateData,
  Datatoken,
  DispenserParams,
  Dispenser
} from '../../../../src/'
import { Erc20CreateParams } from '../../../../src/@types'

describe('Dispenser flow', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let contracts: TestContractHandler
  let DispenserAddress: string
  let DispenserClass: Dispenser
  let nftFactory: NftFactory
  let datatoken: Datatoken
  let nftAddress: string
  let dtAddress: string

  it('should deploy contracts', async () => {
    contracts = new TestContractHandler(web3)
    await contracts.getAccounts()
    factoryOwner = contracts.accounts[0]
    nftOwner = contracts.accounts[1]
    user1 = contracts.accounts[2]
    user2 = contracts.accounts[3]
    user3 = contracts.accounts[4]

    await contracts.deployContracts(factoryOwner)
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
    nftFactory = new NftFactory(contracts.factory721Address, web3)

    const nftData: NftCreateData = {
      name: '72120Bundle',
      symbol: '72Bundle',
      templateIndex: 1,
      tokenURI: 'https://oceanprotocol.com/nft/'
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

    const txReceipt = await nftFactory.createNftWithErc20(
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
    const dispenserParams: DispenserParams = {
      maxTokens: '1',
      maxBalance: '1',
      withMint: true
    }
    const tx = await datatoken.createDispenser(
      dtAddress,
      contracts.accounts[0],
      contracts.dispenserAddress,
      dispenserParams
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
    assert(status.owner === contracts.accounts[0], 'Dispenser owner is not alice')
    assert(status.isMinter === true, 'Dispenser is not a minter')
  })

  it('user2 deactivates the dispenser', async () => {
    const tx = await DispenserClass.deactivate(dtAddress, contracts.accounts[0])
    assert(tx, 'Cannot deactivate dispenser')
    const status = await DispenserClass.status(dtAddress)
    assert(status.active === false, 'Dispenser is still active')
  })

  it('user2 sets user3 as an AllowedSwapper for the dispenser', async () => {
    const tx = await DispenserClass.setAllowedSwapper(
      dtAddress,
      contracts.accounts[0],
      user3
    )
    assert(tx, 'Cannot set Allowed Swapper')
    const status = await DispenserClass.status(dtAddress)
    assert(status.allowedSwapper === user3, 'user3 is Allowed Swapper')
  })

  it('User3 requests datatokens', async () => {
    const activate = await DispenserClass.activate(
      dtAddress,
      '10',
      '10',
      contracts.accounts[0]
    )
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
    const tx = await DispenserClass.ownerWithdraw(dtAddress, contracts.accounts[0])
    assert(tx, 'user2 failed to withdraw all her tokens')
    const status = await DispenserClass.status(dtAddress)
    assert(status.balance === '0', 'Balance > 0')
  })
})
