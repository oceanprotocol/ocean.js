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
import { Erc20CreateParams } from '../../../../src/@types'

describe('Dispenser flow', () => {
  let factoryOwner: string
  let user1: string
  let user2: string
  let contracts: Addresses
  let DispenserClass: Dispenser
  let nftFactory: NftFactory
  let datatoken: Datatoken
  let dtAddress: string

  const CAP_AMOUNT = '1000000'
  const NFT_NAME = '72120Bundle'
  const NFT_SYMBOL = '72Bundle'
  const NFT_TOKEN_URI = 'https://oceanprotocol.com/nft/'
  const ERC20_NAME = 'ERC20B1'
  const ERC20_SYMBOL = 'ERC20DT1Symbol'
  const FEE_ZERO = '0'

  const NFT_DATA: NftCreateData = {
    name: NFT_NAME,
    symbol: NFT_SYMBOL,
    templateIndex: 1,
    tokenURI: NFT_TOKEN_URI,
    transferable: true,
    owner: factoryOwner
  }

  const ERC_PARAMS: Erc20CreateParams = {
    templateIndex: 1,
    minter: factoryOwner,
    paymentCollector: user2,
    mpFeeAddress: user1,
    feeToken: ZERO_ADDRESS,
    cap: CAP_AMOUNT,
    feeAmount: FEE_ZERO,
    name: ERC20_NAME,
    symbol: ERC20_SYMBOL
  }

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    user1 = accounts[3]
    user2 = accounts[4]

    NFT_DATA.owner = factoryOwner
    ERC_PARAMS.minter = factoryOwner
    ERC_PARAMS.paymentCollector = user2
    ERC_PARAMS.mpFeeAddress = user1
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)
  })

  it('should initialize Dispenser class', async () => {
    DispenserClass = new Dispenser(web3, contracts.dispenserAddress)
    assert(DispenserClass !== null)
  })

  it('#createNftwithErc - should create an NFT and a Datatoken ', async () => {
    nftFactory = new NftFactory(contracts.erc721FactoryAddress, web3)

    const txReceipt = await nftFactory.createNftWithErc20(
      factoryOwner,
      NFT_DATA,
      ERC_PARAMS
    )

    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')

    dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('Make user1 minter', async () => {
    datatoken = new Datatoken(web3)
    await datatoken.addMinter(dtAddress, factoryOwner, user1)
    assert((await datatoken.getDTPermissions(dtAddress, user1)).minter === true)
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
