import { assert } from 'chai'
import { getTestConfig, provider, getAddresses } from '../config'
import { ethers, Signer } from 'ethers'
import {
  Config,
  NftFactory,
  NftCreateData,
  Datatoken,
  Nft,
  OrderParams,
  DispenserParams,
  ZERO_ADDRESS,
  signHash,
  getEventFromTx
} from '../../src'
import { ProviderFees, FreCreationParams, FreOrderParams } from '../../src/@types'

describe('Datatoken', () => {
  let nftOwner: Signer
  let user1: Signer
  let user2: Signer
  let user3: Signer
  let datatokenDeployer: Signer
  let nftDatatoken: Nft
  let datatoken: Datatoken
  let nftFactory: NftFactory
  let nftAddress: string
  let datatokenAddress: string
  let fixedRateAddress: string
  let exchangeId: string
  let freParams: FreCreationParams
  let config: Config
  let addresses: any

  const nftData: NftCreateData = {
    name: 'NFTName',
    symbol: 'NFTSymbol',
    templateIndex: 1,
    tokenURI: 'https://oceanprotocol.com/nft/',
    transferable: true,
    owner: null
  }

  before(async () => {
    nftOwner = (await provider.getSigner(0)) as Signer
    user1 = (await provider.getSigner(1)) as Signer
    user2 = (await provider.getSigner(2)) as Signer
    user3 = (await provider.getSigner(3)) as Signer
    datatokenDeployer = (await provider.getSigner(4)) as Signer

    config = await getTestConfig(nftOwner as Signer)
    addresses = await getAddresses()

    console.log('addresses', addresses)
    freParams = {
      fixedRateAddress: addresses.FixedPrice,
      baseTokenAddress: addresses.MockDAI,
      owner: await nftOwner.getAddress(),
      marketFeeCollector: await nftOwner.getAddress(),
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: '0'
    }
  })

  it('should initialize NFTFactory instance and create a new NFT', async () => {
    nftFactory = new NftFactory(addresses.ERC721Factory, nftOwner, 8996)

    nftData.owner = await nftOwner.getAddress()
    nftAddress = await nftFactory.createNFT(nftData)
    nftDatatoken = new Nft(nftOwner, 8996)
  })

  it('#createDatatoken - should create a new ERC20 Datatoken from NFT contract', async () => {
    await nftDatatoken.addDatatokenDeployer(
      nftAddress,
      await nftOwner.getAddress(),
      await datatokenDeployer.getAddress()
    )
    datatokenAddress = await nftDatatoken.createDatatoken(
      nftAddress,
      await nftOwner.getAddress(),
      await nftOwner.getAddress(),
      await user1.getAddress(),
      await user2.getAddress(),
      ZERO_ADDRESS,
      '0',
      '10000',
      'ERC20B1',
      'ERC20DT1Symbol'
    )
    console.log('datatokenAddress', datatokenAddress)
    assert(datatokenAddress)
  })

  it('should initialize DT20 Instance', async () => {
    datatoken = new Datatoken(user1, 8996)
    assert(datatoken)
  })

  it('#mint - should fail to mint DT20, if NOT Minter', async () => {
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .minter === false
    )
    try {
      await datatoken.mint(
        datatokenAddress,
        await user1.getAddress(),
        '10',
        await user1.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Minter')
    }
  })

  it('#addMinter - should add user1 as minter, if user has DatatokenDeployer permission', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(
        nftAddress,
        await nftOwner.getAddress()
      )) === true
    )

    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        false
    )

    await nftDatatoken.addDatatokenDeployer(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .minter === false
    )

    await datatoken.addMinter(
      datatokenAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .minter === true
    )
  })

  it('#addMinter - should FAIL TO add user1 as minter, if user has DatatokenDeployer permission', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user3.getAddress())) ===
        false
    )
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user2.getAddress()))
        .minter === false
    )

    try {
      await datatoken.addMinter(
        datatokenAddress,
        await user3.getAddress(),
        await user2.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not DatatokenDeployer')
    }

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user2.getAddress()))
        .minter === false
    )
  })

  it('#mint - should mint ERC20 Datatoken to user1, if Minter', async () => {
    assert(
      (await datatoken.getPermissions(datatokenAddress, await nftOwner.getAddress()))
        .minter === true
    )
    const tx = await datatoken.mint(
      datatokenAddress,
      await nftOwner.getAddress(),
      '10',
      await user1.getAddress()
    )

    assert(
      (await datatoken.balance(datatokenAddress, await user1.getAddress())) === '10.0'
    )
  })

  it('#createFixedRate - should create FRE for the ERC20 Datatoken', async () => {
    const freTx = await datatoken.createFixedRate(
      datatokenAddress,
      await nftOwner.getAddress(),
      freParams
    )
    const trxReceipt = await freTx.wait()
    const freCreatedEvent = getEventFromTx(trxReceipt, 'NewFixedRate')

    console.log('freCreatedEvent', freCreatedEvent)
    assert(freCreatedEvent !== null)

    // fixedRateAddress = freCreatedEvent.args.ad
    exchangeId = freCreatedEvent.args.exchangeId
  })

  /*
    
  it('#createFixedRate - should FAIL create FRE if NOT DatatokenDeployer', async () => {
    assert((await nftDatatoken.isDatatokenDeployer(nftAddress, user3)) === false)
    try {
      await datatoken.createFixedRate(datatokenAddress, user3, freParams)
      assert(false)
    } catch (e) {
      assert(e.message === 'User is not Datatoken Deployer')
    }
  })

  it('#createDispenser - method creates a dispenser for the ERC20 Datatoken', async () => {
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

  it('#createDispenser - should FAIL to create a Dispenser if not Datatoken Deployer', async () => {
    const dispenserParams: DispenserParams = {
      maxTokens: '10',
      maxBalance: '100'
    }
    assert((await nftDatatoken.isDatatokenDeployer(nftAddress, user3)) === false)
    try {
      await datatoken.createDispenser(
        datatokenAddress,
        user2,
        contracts.dispenserAddress,
        dispenserParams
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'User is not Datatoken Deployer')
    }
  })

  it('#removeMinter - should FAIL to remove user1 as minter, if caller is NOT DatatokenDeployer', async () => {
    assert((await nftDatatoken.isDatatokenDeployer(nftAddress, user2)) === false)
    assert((await datatoken.getPermissions(datatokenAddress, user1)).minter === true)

    try {
      await datatoken.removeMinter(datatokenAddress, user2, user1)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not DatatokenDeployer')
    }
    assert((await datatoken.getPermissions(datatokenAddress, user1)).minter === true)
  })

  it('#removeMinter - should remove user1 as minter, if nftDatatoken has DatatokenDeployer permission', async () => {
    assert((await nftDatatoken.isDatatokenDeployer(nftAddress, nftOwner)) === true)
    assert((await datatoken.getPermissions(datatokenAddress, user1)).minter === true)

    await datatoken.removeMinter(datatokenAddress, nftOwner, user1)

    assert((await datatoken.getPermissions(datatokenAddress, user1)).minter === false)
  })

  it('#addPaymentManager - should FAIL TO add user2 as paymentManager, if caller is NOT DatatokenDeployer', async () => {
    assert((await nftDatatoken.isDatatokenDeployer(nftAddress, user1)) === false)
    assert(
      (await datatoken.getPermissions(datatokenAddress, user2)).paymentManager === false
    )

    try {
      await datatoken.addPaymentManager(datatokenAddress, user1, user2)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not DatatokenDeployer')
    }
    assert(
      (await datatoken.getPermissions(datatokenAddress, user2)).paymentManager === false
    )
  })

  it('#addPaymentManager - should add user2 as paymentManager, if caller has DatatokenDeployer permission', async () => {
    assert((await nftDatatoken.isDatatokenDeployer(nftAddress, nftOwner)) === true)
    assert(
      (await datatoken.getPermissions(datatokenAddress, user2)).paymentManager === false
    )

    await datatoken.addPaymentManager(datatokenAddress, nftOwner, user2)

    assert(
      (await datatoken.getPermissions(datatokenAddress, user2)).paymentManager === true
    )
  })

  it('#removePaymentManager - should FAIL TO remove user2 as paymentManager, if nftDatatoken has DatatokenDeployer permission', async () => {
    assert((await nftDatatoken.isDatatokenDeployer(nftAddress, user1)) === false)
    assert(
      (await datatoken.getPermissions(datatokenAddress, user2)).paymentManager === true
    )
    try {
      await datatoken.removePaymentManager(datatokenAddress, user1, user2)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not DatatokenDeployer')
    }

    assert(
      (await datatoken.getPermissions(datatokenAddress, user2)).paymentManager === true
    )
  })

  it('#removePaymentManager - should remove user2 as paymentManager, if Caller has DatatokenDeployer permission', async () => {
    assert((await nftDatatoken.isDatatokenDeployer(nftAddress, nftOwner)) === true)
    assert(
      (await datatoken.getPermissions(datatokenAddress, user2)).paymentManager === true
    )

    await datatoken.removePaymentManager(datatokenAddress, nftOwner, user2)

    assert(
      (await datatoken.getPermissions(datatokenAddress, user2)).paymentManager === false
    )
  })

  it('#setPaymentCollector - should fail to set a new paymentCollector, if NOT PAYMENT Manager, NFT OWNER OR ERC 20 DEPLOYER', async () => {
    assert(
      (await datatoken.getPermissions(datatokenAddress, user2)).paymentManager === false
    )

    try {
      await datatoken.setPaymentCollector(datatokenAddress, user1, user2)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Fee Manager, owner or Datatoken Deployer')
    }
  })

  it('#setPaymentCollector - should set a new paymentCollector, if PAYMENT MANAGER', async () => {
    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user1)

    await datatoken.addPaymentManager(datatokenAddress, nftOwner, user1)

    assert(
      (await datatoken.getPermissions(datatokenAddress, user1)).paymentManager === true
    )

    await datatoken.setPaymentCollector(datatokenAddress, user1, user3)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)
  })

  it('#setPaymentCollector - should set a new paymentCollector, if NFT OWNER', async () => {
    assert((await nftDatatoken.getNftOwner(nftAddress)) === nftOwner)

    await datatoken.setPaymentCollector(datatokenAddress, nftOwner, user2)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user2)
  })

  it('#setPaymentCollector - should set a new paymentCollector, if ERC 20 DEPLOYER', async () => {
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, datatokenDeployer))
        .deployERC20 === true
    )

    await datatoken.setPaymentCollector(datatokenAddress, datatokenDeployer, user3)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)
  })

  it('#startOrder- user2 should create an order for DT ', async () => {
    assert(
      (await datatoken.balance(datatokenAddress, user1)) === '10',
      'User1 does not hold 10 datatokens'
    )
    assert(
      (await datatoken.balance(datatokenAddress, user2)) === '0',
      'User2 does not hold 0 datatokens'
    )

    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = '0'
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
      providerFeeToken,
      providerFeeAmount,
      v,
      r,
      s,
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

  it('#reuseOrder- user2 should user should succeed to call reuseOrder on a using a previous txId ', async () => {
    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = '0'
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
      providerFeeToken,
      providerFeeAmount,
      v,
      r,
      s,
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
    assert(order.transactionHash, ' Failed to start order')
    const reusedOrder = await datatoken.reuseOrder(
      datatokenAddress,
      user2,
      order.transactionHash,
      providerFees
    )
    assert(reusedOrder.events.OrderReused.event === 'OrderReused')
    assert(reusedOrder.events.ProviderFee.event === 'ProviderFee')
  })

  it('#buyFromDispenserAndOrder- Enterprise method', async () => {
    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = '0'
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
      providerFeeToken,
      providerFeeAmount,
      v,
      r,
      s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const consumeMarketFee = {
      consumeMarketFeeAddress: ZERO_ADDRESS,
      consumeMarketFeeToken: ZERO_ADDRESS,
      consumeMarketFeeAmount: '0'
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
    const providerFeeAmount = '0'
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
      providerFeeToken,
      providerFeeAmount,
      v,
      r,
      s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const consumeMarketFee = {
      consumeMarketFeeAddress: ZERO_ADDRESS,
      consumeMarketFeeToken: ZERO_ADDRESS,
      consumeMarketFeeAmount: '0'
    }
    const order: OrderParams = {
      consumer: user1,
      serviceIndex: 1,
      _providerFee: providerFees,
      _consumeMarketFee: consumeMarketFee
    }

    const fre: FreOrderParams = {
      exchangeContract: fixedRateAddress,
      exchangeId,
      maxBaseTokenAmount: '1',
      baseTokenAddress: contracts.daiAddress,
      baseTokenDecimals: 18,
      swapMarketFee: '0.1',
      marketFeeAddress: ZERO_ADDRESS
    }

    const buyTx = await datatoken.buyFromFreAndOrder(datatokenAddress, user1, order, fre)
    assert(buyTx !== null)
  })

  it('#cleanPermissions - should FAIL to clean permissions at Datatoken level, if NOT NFT Owner', async () => {
    assert((await datatoken.getPermissions(datatokenAddress, nftOwner)).minter === true)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)

    assert(
      (await datatoken.getPermissions(datatokenAddress, user1)).paymentManager === true
    )

    try {
      await datatoken.cleanPermissions(datatokenAddress, user2)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is NOT Nft Owner')
    }

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)

    assert((await datatoken.getPermissions(datatokenAddress, nftOwner)).minter === true)

    assert(
      (await datatoken.getPermissions(datatokenAddress, user1)).paymentManager === true
    )
  })

  it('#cleanPermissions - should clean permissions at Datatoken level', async () => {
    assert((await datatoken.getPermissions(datatokenAddress, nftOwner)).minter === true)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)

    assert(
      (await datatoken.getPermissions(datatokenAddress, user1)).paymentManager === true
    )

    await datatoken.cleanPermissions(datatokenAddress, nftOwner)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === nftOwner)

    assert((await datatoken.getPermissions(datatokenAddress, nftOwner)).minter === false)

    assert(
      (await datatoken.getPermissions(datatokenAddress, user1)).paymentManager === false
    )
  })

  it('#getNFTAddress - should succeed to get the parent NFT address', async () => {
    const address = await datatoken.getNFTAddress(datatokenAddress)
    assert(address, 'Not able to get the parent NFT address')
  })

  it('#setData - should set a value into 725Y standard, if Caller has ERC20Deployer permission', async () => {
    const data = 'SomeData'

    assert((await nftDatatoken.isDatatokenDeployer(nftAddress, nftOwner)) === true)

    await datatoken.setData(datatokenAddress, nftOwner, data)

    assert((await nftDatatoken.getData(nftAddress, datatokenAddress)) === data)
  })

  it('#setData - should FAIL to set a value into 725Y standard, if Caller has NOT ERC20Deployer permission', async () => {
    const data = 'NewData'
    const OldData = 'SomeData'
    assert((await nftDatatoken.isDatatokenDeployer(nftAddress, user1)) === false)

    try {
      await datatoken.setData(datatokenAddress, user1, data)
      assert(false)
    } catch (e) {
      assert(e.message === 'User is not Datatoken Deployer')
    }
    assert((await nftDatatoken.getData(nftAddress, datatokenAddress)) === OldData)
  })

  it('#getDecimals - should return the number of decimals of the datatoken', async () => {
    const decimals = await datatoken.getDecimals(datatokenAddress)
    assert(decimals === '18')
  })

  it('#getSymbol - should return the symbbol of the datatoken', async () => {
    const symbol = await datatoken.getSymbol(datatokenAddress)
    assert(symbol === 'ERC20DT1Symbol')
  })

  it('#getName - should return the name of the datatoken', async () => {
    const name = await datatoken.getName(datatokenAddress)
    assert(name === 'ERC20B1')
  })

  it('#transfer - we can transfer the datatoken', async () => {
    const balance1before = await datatoken.balance(datatokenAddress, user1)
    const balance2before = await datatoken.balance(datatokenAddress, user2)

    await datatoken.transfer(datatokenAddress, user2, '1', user1)

    const balance1after = await datatoken.balance(datatokenAddress, user1)
    const balance2after = await datatoken.balance(datatokenAddress, user2)

    assert(+balance1after === +balance1before - 1)
    assert(+balance2after === +balance2before + 1)
  })

  it('#setPublishingMarketFee - User should not be able to set the Publishing Market Fee', async () => {
    const originalPublishingMarketFee = await datatoken.getPublishingMarketFee(
      datatokenAddress,
      user1
    )
    try {
      await datatoken.setPublishingMarketFee(
        datatokenAddress,
        user1,
        contracts.daiAddress,
        web3.utils.toWei('10'),
        user1
      )
    } catch (e) {
      console.log('Message:', e.message)
      assert(e.message === 'Caller is not the Publishing Market Fee Address')
    }
    const newPublishingMarketFee = await datatoken.getPublishingMarketFee(
      datatokenAddress,
      user3
    )

    assert(
      newPublishingMarketFee.publishMarketFeeAddress ===
        originalPublishingMarketFee.publishMarketFeeAddress
    )
    assert(
      newPublishingMarketFee.publishMarketFeeAmount ===
        originalPublishingMarketFee.publishMarketFeeAmount
    )
    assert(
      newPublishingMarketFee.publishMarketFeeToken ===
        originalPublishingMarketFee.publishMarketFeeToken
    )
  })
  it('#setPublishingMarketFee - Marketplace fee address should be able to set the Publishing Market Fee', async () => {
    const originalPublishingMarketFee = await datatoken.getPublishingMarketFee(
      datatokenAddress,
      user2
    )
    try {
      await datatoken.setPublishingMarketFee(
        datatokenAddress,
        user2,
        contracts.daiAddress,
        web3.utils.toWei('10'),
        user2
      )
    } catch (e) {
      console.log('Error:', e)
    }
    const newPublishingMarketFee = await datatoken.getPublishingMarketFee(
      datatokenAddress,
      user2
    )

    assert(newPublishingMarketFee !== originalPublishingMarketFee)
    assert(newPublishingMarketFee.publishMarketFeeAddress === user2)
    assert(newPublishingMarketFee.publishMarketFeeAmount === web3.utils.toWei('10'))
    assert(newPublishingMarketFee.publishMarketFeeToken === contracts.daiAddress)
  })
  */
})
