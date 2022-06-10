import { assert, expect } from 'chai'
import { deployContracts, Addresses } from '../../../TestContractHandler'
import { web3 } from '../../../config'
import {
  NftFactory,
  NftCreateData,
  Datatoken,
  DispenserParams,
  Dispenser,
  ZERO_ADDRESS
} from '../../../../src/'
import { DatatokenCreateParams } from '../../../../src/@types'

describe('Dispenser flow', () => {
  let factoryOwner: string
  let user1: string
  let user2: string
  let contracts: Addresses
  let DispenserClass: Dispenser
  let nftFactory: NftFactory
  let datatoken: Datatoken
  let dtAddress: string

  const nftData: NftCreateData = {
    name: '72120Bundle',
    symbol: '72Bundle',
    templateIndex: 1,
    tokenURI: 'https://oceanprotocol.com/nft/',
    transferable: true,
    owner: null
  }

  const ercParams: DatatokenCreateParams = {
    templateIndex: 1,
    minter: null,
    paymentCollector: null,
    mpFeeAddress: null,
    feeToken: ZERO_ADDRESS,
    cap: '1000000',
    feeAmount: '0',
    name: 'ERC20B1',
    symbol: 'ERC20DT1Symbol'
  }

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    user1 = accounts[3]
    user2 = accounts[4]

    nftData.owner = factoryOwner
    ercParams.minter = factoryOwner
    ercParams.paymentCollector = user2
    ercParams.mpFeeAddress = user1
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)
  })

  it('should initialize Dispenser class', async () => {
    DispenserClass = new Dispenser(contracts.dispenserAddress, web3, 8996)
    assert(DispenserClass !== null)
  })

  it('#createNftwithErc - should create an NFT and a Datatoken ', async () => {
    nftFactory = new NftFactory(contracts.nftFactoryAddress, web3)

    const txReceipt = await nftFactory.createNftWithDatatoken(
      factoryOwner,
      nftData,
      ercParams
    )

    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')

    dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('Make user2 minter', async () => {
    datatoken = new Datatoken(web3, 8996)
    await datatoken.addMinter(dtAddress, factoryOwner, user2)
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
      factoryOwner,
      contracts.dispenserAddress,
      dispenserParams
    )
    assert(tx, 'Cannot create dispenser')
  })

  it('Activate dispenser', async () => {
    const tx = await DispenserClass.activate(dtAddress, '1', '1', factoryOwner)
    assert(tx, 'Cannot activate dispenser')
  })

  it('user1 gets the dispenser status', async () => {
    const status = await DispenserClass.status(dtAddress)
    assert(status.active === true, 'Dispenser not active')
    assert(status.owner === factoryOwner, 'Dispenser owner is not alice')
    assert(status.isMinter === true, 'Dispenser is not a minter')
  })

  it('user1 deactivates the dispenser', async () => {
    const tx = await DispenserClass.deactivate(dtAddress, factoryOwner)
    assert(tx, 'Cannot deactivate dispenser')
    const status = await DispenserClass.status(dtAddress)
    assert(status.active === false, 'Dispenser is still active')
  })

  it('user1 sets user2 as an AllowedSwapper for the dispenser', async () => {
    const tx = await DispenserClass.setAllowedSwapper(dtAddress, factoryOwner, user2)
    assert(tx, 'Cannot set Allowed Swapper')
    const status = await DispenserClass.status(dtAddress)
    assert(status.allowedSwapper === user2, 'user2 is Allowed Swapper')
  })

  it('user2 requests datatokens', async () => {
    await DispenserClass.activate(dtAddress, '10', '10', factoryOwner)
    const check = await DispenserClass.isDispensable(dtAddress, datatoken, user2, '1')
    assert(check === true, 'isDispensable should return true')
    const tx = await DispenserClass.dispense(dtAddress, user2, '1', user2)
    assert(tx, 'user2 failed to get 1DT')
  })

  it('user1 withdraws all datatokens', async () => {
    const tx = await DispenserClass.ownerWithdraw(dtAddress, factoryOwner)
    assert(tx, 'user1 failed to withdraw all her tokens')
    const status = await DispenserClass.status(dtAddress)
    assert(status.balance === '0', 'Balance > 0')
  })
})
