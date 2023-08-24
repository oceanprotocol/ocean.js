import { assert, expect } from 'chai'
import { provider, getAddresses } from '../config'
import { Signer } from 'ethers'

import {
  NftFactory,
  NftCreateData,
  Datatoken,
  DispenserParams,
  Dispenser,
  ZERO_ADDRESS,
  getEventFromTx
} from '../../src/'
import { DatatokenCreateParams } from '../../src/@types'

describe('Dispenser flow', () => {
  let factoryOwner: Signer
  let user1: Signer
  let user2: Signer
  let DispenserClass: Dispenser
  let nftFactory: NftFactory
  let datatoken: Datatoken
  let dtAddress: string
  let addresses

  const nftData: NftCreateData = {
    name: '72120Bundle',
    symbol: '72Bundle',
    templateIndex: 1,
    tokenURI: 'https://oceanprotocol.com/nft/',
    transferable: true,
    owner: null
  }

  const dtParams: DatatokenCreateParams = {
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
    factoryOwner = (await provider.getSigner(0)) as Signer
    user1 = (await provider.getSigner(3)) as Signer
    user2 = (await provider.getSigner(4)) as Signer

    addresses = await getAddresses()

    nftData.owner = await factoryOwner.getAddress()
    dtParams.minter = await factoryOwner.getAddress()
    dtParams.paymentCollector = await user2.getAddress()
    dtParams.mpFeeAddress = await user1.getAddress()
  })

  it('should initialize Dispenser class', async () => {
    DispenserClass = new Dispenser(addresses.Dispenser, factoryOwner)
    assert(DispenserClass !== null)
  })

  it('#createNftwithErc - should create an NFT and a Datatoken ', async () => {
    nftFactory = new NftFactory(addresses.ERC721Factory, factoryOwner)

    const tx = await nftFactory.createNftWithDatatoken(nftData, dtParams)
    const trxReceipt = await tx.wait()
    const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
    const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')
    expect(nftCreatedEvent.event === 'NFTCreated')
    expect(tokenCreatedEvent.event === 'TokenCreated')

    dtAddress = tokenCreatedEvent.args.newTokenAddress
  })

  it('Make user2 minter', async () => {
    datatoken = new Datatoken(factoryOwner)
    await datatoken.addMinter(
      dtAddress,
      await factoryOwner.getAddress(),
      await user2.getAddress()
    )
    assert(
      (await datatoken.getPermissions(dtAddress, await user2.getAddress())).minter ===
        true
    )
  })

  it('Create dispenser', async () => {
    const dispenserParams: DispenserParams = {
      maxTokens: '1',
      maxBalance: '1',
      withMint: true
    }
    const tx = await datatoken.createDispenser(
      dtAddress,
      await factoryOwner.getAddress(),
      addresses.Dispenser,
      dispenserParams
    )
    assert(tx, 'Cannot create dispenser')
  })

  it('Activate dispenser', async () => {
    const tx = await DispenserClass.activate(dtAddress, '1', '1')
    assert(tx, 'Cannot activate dispenser')
  })

  it('user1 gets the dispenser status', async () => {
    const status = await DispenserClass.status(dtAddress)
    assert(status.active === true, 'Dispenser not active')
    assert(
      status.owner === (await factoryOwner.getAddress()),
      'Dispenser owner is not alice'
    )
    assert(status.isMinter === true, 'Dispenser is not a minter')
  })

  it('Deactivates the dispenser', async () => {
    const tx = await DispenserClass.deactivate(dtAddress)
    assert(tx, 'Cannot deactivate dispenser')
    const status = await DispenserClass.status(dtAddress)
    assert(status.active === false, 'Dispenser is still active')
  })

  it('Sets user2 as an AllowedSwapper for the dispenser', async () => {
    const tx = await DispenserClass.setAllowedSwapper(dtAddress, await user2.getAddress())
    assert(tx, 'Cannot set Allowed Swapper')
    const status = await DispenserClass.status(dtAddress)
    assert(
      status.allowedSwapper === (await user2.getAddress()),
      'user2 is Allowed Swapper'
    )
  })

  it('user2 requests datatokens', async () => {
    await DispenserClass.activate(dtAddress, '10', '10')
    const check = await DispenserClass.isDispensable(
      dtAddress,
      datatoken,
      await user2.getAddress(),
      '1'
    )
    assert(check === true, 'isDispensable should return true')
    const DispenserClassForUser2 = new Dispenser(addresses.Dispenser, user2)
    const tx = await DispenserClassForUser2.dispense(
      dtAddress,
      '1',
      await user2.getAddress()
    )
    assert(tx, 'user2 failed to get 1DT')
  })

  it('Withdraws all datatokens', async () => {
    const tx = await DispenserClass.ownerWithdraw(dtAddress)
    assert(tx, 'failed to withdraw all her tokens')
    const status = await DispenserClass.status(dtAddress)
    assert(status.balance === '0.0', 'Balance > 0')
  })
})
