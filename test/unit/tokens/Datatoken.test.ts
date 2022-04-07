import { assert } from 'chai'
import { deployContracts, Addresses } from '../../TestContractHandler'
import { web3 } from '../../config'
import {
  NftFactory,
  NftCreateData,
  Datatoken,
  Nft,
  OrderParams,
  DispenserParams,
  ZERO_ADDRESS,
  signHash
} from '../../../src'
import { ProviderFees, FreCreationParams, FreOrderParams } from '../../../src/@types'

describe('Datatoken', () => {
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let contracts: Addresses
  let nftDatatoken: Nft
  let datatoken: Datatoken
  let nftFactory: NftFactory
  let nftAddress: string
  let datatokenAddress: string
  let fixedRateAddress: string
  let exchangeId: string

  const NFT_NAME = 'NFTName'
  const NFT_SYMBOL = 'NFTSymbol'
  const NFT_TOKEN_URI = 'https://oceanprotocol.com/nft/'
  const FEE_ZERO = '0'
  const CAP_AMOUNT = '10000'
  const DECIMALS = 18
  const FIXED_RATE = web3.utils.toWei('1')
  const DATATOKENS_AMOUNT = '10'
  const ERC20_NAME = 'ERC20B1'
  const ERC20_SYMBOL = 'ERC20DT1Symbol'

  const NFT_DATA: NftCreateData = {
    name: NFT_NAME,
    symbol: NFT_SYMBOL,
    templateIndex: 1,
    tokenURI: NFT_TOKEN_URI,
    transferable: true,
    owner: nftOwner
  }

  const FRE_PARAMS: FreCreationParams = {
    fixedRateAddress: contracts.fixedRateAddress,
    baseTokenAddress: contracts.daiAddress,
    owner: nftOwner,
    marketFeeCollector: nftOwner,
    baseTokenDecimals: DECIMALS,
    datatokenDecimals: DECIMALS,
    fixedRate: FIXED_RATE,
    marketFee: FEE_ZERO
  }

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    nftOwner = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]
    user3 = accounts[3]

    NFT_DATA.owner = nftOwner
    FRE_PARAMS.owner = nftOwner
    FRE_PARAMS.marketFeeCollector = nftOwner
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, nftOwner)
  })

  it('should initialize NFTFactory, nftDT and DT instances and create a new NFT', async () => {
    nftFactory = new NftFactory(contracts.erc721FactoryAddress, web3)
    nftDatatoken = new Nft(web3)
    datatoken = new Datatoken(web3)

    nftAddress = await nftFactory.createNFT(nftOwner, NFT_DATA)
  })

  it('#createERC20 - should create a new ERC20 DT from NFT contract', async () => {
    // await nftDatatoken.addERC20Deployer(nftAddress, nftOwner, nftOwner)
    datatokenAddress = await nftDatatoken.createErc20(
      nftAddress,
      nftOwner,
      nftOwner,
      user1,
      user2,
      ZERO_ADDRESS,
      FEE_ZERO,
      CAP_AMOUNT,
      ERC20_NAME,
      ERC20_SYMBOL
    )
    assert(datatokenAddress !== null)
  })

  it('#mint - should fail to mint DT20, if NOT Minter', async () => {
    // assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)
    try {
      await datatoken.mint(datatokenAddress, user1, DATATOKENS_AMOUNT, user1)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Minter')
    }
  })

  it('#addMinter - should add user1 as minter, if user has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)

    await datatoken.addMinter(datatokenAddress, nftOwner, user1)

    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)
  })

  it('#addMinter - should FAIL TO add user1 as minter, if user has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user3)) === false)
    assert((await datatoken.getDTPermissions(datatokenAddress, user2)).minter === false)

    try {
      await datatoken.addMinter(datatokenAddress, user3, user2)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not ERC20Deployer')
    }

    assert((await datatoken.getDTPermissions(datatokenAddress, user2)).minter === false)
  })

  it('#mint - should mint ERC20 datatoken to user1, if Minter', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)
    await datatoken.mint(datatokenAddress, nftOwner, DATATOKENS_AMOUNT, user1)

    assert((await datatoken.balance(datatokenAddress, user1)) === DATATOKENS_AMOUNT)
  })

  it('#createFixedRate - should create FRE for the erc20 dt', async () => {
    const fre = await datatoken.createFixedRate(datatokenAddress, nftOwner, FRE_PARAMS)
    assert(fre !== null)
    fixedRateAddress = fre.events.NewFixedRate.address
    exchangeId = fre.events.NewFixedRate.returnValues[0]
  })

  it('#createFixedRate - should FAIL create FRE if NOT ERC20Deployer', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user3)) === false)
    try {
      await datatoken.createFixedRate(datatokenAddress, user3, FRE_PARAMS)
      assert(false)
    } catch (e) {
      assert(e.message === 'User is not ERC20 Deployer')
    }
  })

  it('#createDispenser - method creates a dispenser for the erc20DT', async () => {
    const dispenserParams: DispenserParams = {
      maxTokens: '10',
      maxBalance: '100'
    }

    const dispenser = await datatoken.createDispenser(
      datatokenAddress,
      nftOwner,
      contracts.dispenserAddress,
      dispenserParams
    )
    assert(dispenser !== null)
  })

  it('#createDispenser - should FAIL to create a Dispenser if not ERC20 Deployer', async () => {
    const dispenserParams: DispenserParams = {
      maxTokens: '10',
      maxBalance: '100'
    }
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user3)) === false)
    try {
      await datatoken.createDispenser(
        datatokenAddress,
        user2,
        contracts.dispenserAddress,
        dispenserParams
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'User is not ERC20 Deployer')
    }
  })

  it('#removeMinter - should FAIL to remove user1 as minter, if caller is NOT ERC20Deployer', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user2)) === false)
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)

    try {
      await datatoken.removeMinter(datatokenAddress, user2, user1)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not ERC20Deployer')
    }
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)
  })

  it('#removeMinter - should remove user1 as minter, if nftDatatoken has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)

    await datatoken.removeMinter(datatokenAddress, nftOwner, user1)

    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)
  })

  it('#addPaymentManager - should FAIL TO add user2 as paymentManager, if caller is NOT ERC20Deployer', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user1)) === false)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === false
    )

    try {
      await datatoken.addPaymentManager(datatokenAddress, user1, user2)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not ERC20Deployer')
    }
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === false
    )
  })

  it('#addPaymentManager - should add user2 as paymentManager, if caller has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === false
    )

    await datatoken.addPaymentManager(datatokenAddress, nftOwner, user2)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === true
    )
  })

  it('#removePaymentManager - should FAIL TO remove user2 as paymentManager, if nftDatatoken has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user1)) === false)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === true
    )
    try {
      await datatoken.removePaymentManager(datatokenAddress, user1, user2)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not ERC20Deployer')
    }

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === true
    )
  })

  it('#removePaymentManager - should remove user2 as paymentManager, if Caller has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === true
    )

    await datatoken.removePaymentManager(datatokenAddress, nftOwner, user2)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === false
    )
  })

  it('#setPaymentCollector - should fail to set a new paymentCollector, if NOT PAYMENT Manager', async () => {
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === false
    )

    try {
      await datatoken.setPaymentCollector(datatokenAddress, user1, user2)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Fee Manager')
    }
  })

  it('#setPaymentCollector - should set a new paymentCollector, if PAYMENT MANAGER', async () => {
    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user1)

    await datatoken.addPaymentManager(datatokenAddress, nftOwner, user1)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).paymentManager === true
    )

    await datatoken.setPaymentCollector(datatokenAddress, user1, user3)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)
  })

  it('#startOrder- user2 should create an order for DT ', async () => {
    assert(
      (await datatoken.balance(datatokenAddress, user1)) === DATATOKENS_AMOUNT,
      'User1 does not hold 10 datatokens'
    )
    assert(
      (await datatoken.balance(datatokenAddress, user2)) === '0',
      'User2 does not hold 0 datatokens'
    )

    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = FEE_ZERO
    const providerValidUntil = '0'
    const message = web3.utils.soliditySha3(
      { t: 'bytes', v: web3.utils.toHex(web3.utils.asciiToHex(providerData)) },
      { t: 'address', v: user3 },
      { t: 'address', v: providerFeeToken },
      { t: 'uint256', v: providerFeeAmount },
      { t: 'uint256', v: providerValidUntil }
    )
    const { v, r, s } = await signHash(web3, message, user3)
    const providerFees: ProviderFees = {
      providerFeeAddress: user3,
      providerFeeToken: providerFeeToken,
      providerFeeAmount: providerFeeAmount,
      v: v,
      r: r,
      s: s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const order = await datatoken.startOrder(
      datatokenAddress,
      user1,
      user2,
      1,
      providerFees
    )
    assert(order !== null)

    assert(
      (await datatoken.balance(datatokenAddress, user1)) === '9',
      'Invalid user balance, DT was not substracted'
    )
    assert(
      (await datatoken.balance(
        datatokenAddress,
        await datatoken.getPaymentCollector(datatokenAddress)
      )) === '0.97',
      'Invalid publisher reward, we should have 1 DT'
    )
  })

  it('#buyFromDispenserAndOrder- Enterprise method', async () => {
    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = FEE_ZERO
    const message = web3.utils.soliditySha3(
      { t: 'bytes', v: web3.utils.toHex(web3.utils.asciiToHex(providerData)) },
      { t: 'address', v: user3 },
      { t: 'address', v: providerFeeToken },
      { t: 'uint256', v: providerFeeAmount }
    )
    const { v, r, s } = await signHash(web3, message, user3)
    const providerValidUntil = '0'
    const providerFees: ProviderFees = {
      providerFeeAddress: user3,
      providerFeeToken: providerFeeToken,
      providerFeeAmount: providerFeeAmount,
      v: v,
      r: r,
      s: s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const consumeMarketFee = {
      consumeMarketFeeAddress: ZERO_ADDRESS,
      consumeMarketFeeToken: ZERO_ADDRESS,
      consumeMarketFeeAmount: FEE_ZERO
    }
    const order: OrderParams = {
      consumer: user1,
      serviceIndex: 1,
      _providerFee: providerFees,
      _consumeMarketFee: consumeMarketFee
    }
    const buyFromDispenseTx = await datatoken.buyFromDispenserAndOrder(
      datatokenAddress,
      nftOwner,
      order,
      contracts.dispenserAddress
    )
    assert(buyFromDispenseTx !== null)
  })

  it('#buyFromFreAndOrder - Enterprise method ', async () => {
    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = FEE_ZERO
    const message = web3.utils.soliditySha3(
      { t: 'bytes', v: web3.utils.toHex(web3.utils.asciiToHex(providerData)) },
      { t: 'address', v: user3 },
      { t: 'address', v: providerFeeToken },
      { t: 'uint256', v: providerFeeAmount }
    )
    const { v, r, s } = await signHash(web3, message, user3)
    const providerValidUntil = '0'
    const providerFees: ProviderFees = {
      providerFeeAddress: user1,
      providerFeeToken: providerFeeToken,
      providerFeeAmount: providerFeeAmount,
      v: v,
      r: r,
      s: s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const consumeMarketFee = {
      consumeMarketFeeAddress: ZERO_ADDRESS,
      consumeMarketFeeToken: ZERO_ADDRESS,
      consumeMarketFeeAmount: FEE_ZERO
    }
    const order: OrderParams = {
      consumer: user1,
      serviceIndex: 1,
      _providerFee: providerFees,
      _consumeMarketFee: consumeMarketFee
    }

    const fre: FreOrderParams = {
      exchangeContract: fixedRateAddress,
      exchangeId: exchangeId,
      maxBaseTokenAmount: '1',
      swapMarketFee: '0.1',
      marketFeeAddress: ZERO_ADDRESS
    }

    const buyTx = await datatoken.buyFromFreAndOrder(datatokenAddress, user1, order, fre)
    assert(buyTx !== null)
  })

  it('#cleanPermissions - should FAIL to clean permissions at ERC20 level, if NOT NFT Owner', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).paymentManager === true
    )

    try {
      await datatoken.cleanPermissions(datatokenAddress, user2)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is NOT Nft Owner')
    }

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)

    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).paymentManager === true
    )
  })

  it('#cleanPermissions - should clean permissions at ERC20 level', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).paymentManager === true
    )

    await datatoken.cleanPermissions(datatokenAddress, nftOwner)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === nftOwner)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === false
    )

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).paymentManager === false
    )
  })

  it('#getERC721Address - should succeed to get the parent ERC721 address', async () => {
    const address = await datatoken.getNFTAddress(datatokenAddress)
    assert(address, 'Not able to get the parent ERC721 address')
  })

  it('#setData - should set a value into 725Y standard, if Caller has ERC20Deployer permission', async () => {
    const data = web3.utils.asciiToHex('SomeData')

    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)

    await datatoken.setData(datatokenAddress, nftOwner, data)

    const key = web3.utils.keccak256(datatokenAddress)
    assert((await nftDatatoken.getData(nftAddress, key)) === data)
  })

  it('#setData - should FAIL to set a value into 725Y standard, if Caller has NOT ERC20Deployer permission', async () => {
    const data = web3.utils.asciiToHex('NewData')
    const OldData = web3.utils.asciiToHex('SomeData')
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user1)) === false)

    try {
      await datatoken.setData(datatokenAddress, user1, data)
      assert(false)
    } catch (e) {
      assert(e.message === 'User is not ERC20 Deployer')
    }
    const key = web3.utils.keccak256(datatokenAddress)
    assert((await nftDatatoken.getData(nftAddress, key)) === OldData)
  })
})
