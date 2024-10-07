import { assert, expect } from 'chai'
import { provider, getAddresses } from '../config'
import { ethers, Signer } from 'ethers'
import {
  NftFactory,
  NftCreateData,
  Datatoken,
  Nft,
  OrderParams,
  DispenserParams,
  ZERO_ADDRESS,
  signHash,
  getEventFromTx,
  amountToUnits
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
  let exchangeId: string
  let freParams: FreCreationParams
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

    addresses = await getAddresses()

    freParams = {
      fixedRateAddress: addresses.FixedPrice,
      baseTokenAddress: addresses.MockDAI,
      owner: await nftOwner.getAddress(),
      marketFeeCollector: await nftOwner.getAddress(),
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: await amountToUnits(nftOwner, null, '1', 18),
      marketFee: await amountToUnits(nftOwner, null, '0.01', 18)
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
    await datatoken.mint(
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

    assert(freCreatedEvent !== null)

    // fixedRateAddress = freCreatedEvent.args.ad
    exchangeId = freCreatedEvent?.args?.exchangeId
  })

  it('#createFixedRate - should FAIL create FRE if NOT DatatokenDeployer', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user3.getAddress())) ===
        false
    )
    try {
      await datatoken.createFixedRate(
        datatokenAddress,
        await user3.getAddress(),
        freParams
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'User is not Datatoken Deployer')
    }
  })

  it('#createDispenser - method creates a dispenser for the ERC20 Datatoken', async () => {
    const dispenserParams: DispenserParams = {
      maxTokens: await amountToUnits(nftOwner, null, '10', 18),
      maxBalance: await amountToUnits(nftOwner, null, '100', 18)
    }

    const dispenser = await datatoken.createDispenser(
      datatokenAddress,
      await nftOwner.getAddress(),
      addresses.Dispenser,
      dispenserParams
    )
    assert(dispenser)
  })

  it('#createDispenser - should FAIL to create a Dispenser if not Datatoken Deployer', async () => {
    const dispenserParams: DispenserParams = {
      maxTokens: await amountToUnits(nftOwner, null, '10', 18),
      maxBalance: await amountToUnits(nftOwner, null, '100', 18)
    }
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user3.getAddress())) ===
        false
    )
    try {
      await datatoken.createDispenser(
        datatokenAddress,
        await user2.getAddress(),
        addresses.Dispenser,
        dispenserParams
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'User is not Datatoken Deployer')
    }
  })

  it('#removeMinter - should FAIL to remove user1 as minter, if caller is NOT DatatokenDeployer', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user2.getAddress())) ===
        false
    )
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .minter === true
    )

    try {
      await datatoken.removeMinter(
        datatokenAddress,
        await user2.getAddress(),
        await user1.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not DatatokenDeployer')
    }
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .minter === true
    )
  })

  it('#removeMinter - should remove user1 as minter, if nftDatatoken has DatatokenDeployer permission', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(
        nftAddress,
        await nftOwner.getAddress()
      )) === true
    )
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .minter === true
    )

    await datatoken.removeMinter(
      datatokenAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .minter === false
    )
  })

  it('#addPaymentManager - should FAIL TO add user2 as paymentManager, if caller is NOT DatatokenDeployer', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user2.getAddress())) ===
        false
    )
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user3.getAddress()))
        .paymentManager === false
    )

    try {
      await datatoken.addPaymentManager(
        datatokenAddress,
        await user2.getAddress(),
        await user3.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not DatatokenDeployer')
    }
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user3.getAddress()))
        .paymentManager === false
    )
  })

  it('#addPaymentManager - should add user2 as paymentManager, if caller has DatatokenDeployer permission', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(
        nftAddress,
        await nftOwner.getAddress()
      )) === true
    )
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user2.getAddress()))
        .paymentManager === false
    )

    await datatoken.addPaymentManager(
      datatokenAddress,
      await nftOwner.getAddress(),
      await user2.getAddress()
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user2.getAddress()))
        .paymentManager === true
    )
  })

  it('#removePaymentManager - should FAIL TO remove user2 as paymentManager, if nftDatatoken has DatatokenDeployer permission', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user3.getAddress())) ===
        false
    )
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user2.getAddress()))
        .paymentManager === true
    )
    try {
      await datatoken.removePaymentManager(
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
        .paymentManager === true
    )
  })

  it('#removePaymentManager - should remove user2 as paymentManager, if Caller has DatatokenDeployer permission', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(
        nftAddress,
        await nftOwner.getAddress()
      )) === true
    )
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user2.getAddress()))
        .paymentManager === true
    )

    await datatoken.removePaymentManager(
      datatokenAddress,
      await nftOwner.getAddress(),
      await user2.getAddress()
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user2.getAddress()))
        .paymentManager === false
    )
  })

  it('#setPaymentCollector - should fail to set a new paymentCollector, if NOT PAYMENT Manager, NFT OWNER OR ERC 20 DEPLOYER', async () => {
    assert(
      (await datatoken.getPermissions(datatokenAddress, await user2.getAddress()))
        .paymentManager === false
    )

    try {
      await datatoken.setPaymentCollector(
        datatokenAddress,
        await user3.getAddress(),
        await user2.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Fee Manager, owner or Datatoken Deployer')
    }
  })

  it('#setPaymentCollector - should set a new paymentCollector, if PAYMENT MANAGER', async () => {
    assert(
      (await datatoken.getPaymentCollector(datatokenAddress)) ===
        (await user1.getAddress())
    )

    await datatoken.addPaymentManager(
      datatokenAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .paymentManager === true
    )

    await datatoken.setPaymentCollector(
      datatokenAddress,
      await user1.getAddress(),
      await user3.getAddress()
    )

    assert(
      (await datatoken.getPaymentCollector(datatokenAddress)) ===
        (await user3.getAddress())
    )
  })

  it('#setPaymentCollector - should set a new paymentCollector, if NFT OWNER', async () => {
    assert((await nftDatatoken.getNftOwner(nftAddress)) === (await nftOwner.getAddress()))

    await datatoken.setPaymentCollector(
      datatokenAddress,
      await nftOwner.getAddress(),
      await user2.getAddress()
    )

    assert(
      (await datatoken.getPaymentCollector(datatokenAddress)) ===
        (await user2.getAddress())
    )
  })

  it('#setPaymentCollector - should set a new paymentCollector, if ERC 20 DEPLOYER', async () => {
    assert(
      (
        await nftDatatoken.getNftPermissions(
          nftAddress,
          await datatokenDeployer.getAddress()
        )
      ).deployERC20 === true
    )

    await datatoken.setPaymentCollector(
      datatokenAddress,
      await datatokenDeployer.getAddress(),
      await user3.getAddress()
    )

    assert(
      (await datatoken.getPaymentCollector(datatokenAddress)) ===
        (await user3.getAddress())
    )
  })

  it('#startOrder- user2 should create an order for DT ', async () => {
    assert(
      (await datatoken.balance(datatokenAddress, await user1.getAddress())) === '10.0',
      'User1 does not hold 10 datatokens'
    )

    assert(
      (await datatoken.balance(datatokenAddress, await user2.getAddress())) === '0.0',
      'User2 does not hold 0 datatokens'
    )

    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = '0'
    const providerValidUntil = '0'

    const message = ethers.utils.solidityKeccak256(
      ['bytes', 'address', 'address', 'uint256', 'uint256'],
      [
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(providerData)),
        await user3.getAddress(),
        providerFeeToken,
        providerFeeAmount,
        providerValidUntil
      ]
    )

    const { v, r, s } = await signHash(user3, message)

    const providerFees: ProviderFees = {
      providerFeeAddress: await user3.getAddress(),
      providerFeeToken,
      providerFeeAmount,
      v,
      r,
      s,
      providerData: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(providerData)),
      validUntil: providerValidUntil
    }
    const order = await datatoken.startOrder(
      datatokenAddress,
      await user2.getAddress(),
      1,
      providerFees
    )
    assert(order !== null)

    assert(
      (await datatoken.balance(datatokenAddress, await user1.getAddress())) === '9.0',
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

    const message = ethers.utils.solidityKeccak256(
      ['bytes', 'address', 'address', 'uint256', 'uint256'],
      [
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(providerData)),
        await user3.getAddress(),
        providerFeeToken,
        providerFeeAmount,
        providerValidUntil
      ]
    )

    const { v, r, s } = await signHash(user3, message)

    const providerFees: ProviderFees = {
      providerFeeAddress: await user3.getAddress(),
      providerFeeToken,
      providerFeeAmount,
      v,
      r,
      s,
      providerData: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(providerData)),
      validUntil: providerValidUntil
    }

    const order = await datatoken.startOrder(
      datatokenAddress,
      await user2.getAddress(),
      1,
      providerFees
    )

    assert(order.blockHash, ' Failed to start order')
    const tx = await datatoken.reuseOrder(datatokenAddress, order.blockHash, providerFees)
    const reusedTx = await tx.wait()

    const orderReusedTx = getEventFromTx(reusedTx, 'OrderReused')
    const providerFeeTx = getEventFromTx(reusedTx, 'ProviderFee')

    expect(orderReusedTx.event === 'OrderReused')
    expect(providerFeeTx.event === 'ProviderFee')
  })

  it('#buyFromDispenserAndOrder- Enterprise method', async () => {
    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = '0'
    const providerValidUntil = '0'
    const message = ethers.utils.solidityKeccak256(
      ['bytes', 'address', 'address', 'uint256', 'uint256'],
      [
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(providerData)),
        await user3.getAddress(),
        providerFeeToken,
        providerFeeAmount,
        providerValidUntil
      ]
    )

    const { v, r, s } = await signHash(user3, message)

    const providerFees: ProviderFees = {
      providerFeeAddress: await user3.getAddress(),
      providerFeeToken,
      providerFeeAmount,
      v,
      r,
      s,
      providerData: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(providerData)),
      validUntil: providerValidUntil
    }

    const consumeMarketFee = {
      consumeMarketFeeAddress: ZERO_ADDRESS,
      consumeMarketFeeToken: ZERO_ADDRESS,
      consumeMarketFeeAmount: '0'
    }
    const order: OrderParams = {
      consumer: await user1.getAddress(),
      serviceIndex: 1,
      _providerFee: providerFees,
      _consumeMarketFee: consumeMarketFee
    }
    const buyFromDispenseTx = await datatoken.buyFromDispenserAndOrder(
      datatokenAddress,
      order,
      addresses.Dispenser
    )
    assert(buyFromDispenseTx)
  })

  it('#buyFromFreAndOrder - Enterprise method ', async () => {
    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = '0'
    const providerValidUntil = '0'

    const message = ethers.utils.solidityKeccak256(
      ['bytes', 'address', 'address', 'uint256', 'uint256'],
      [
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(providerData)),
        await user3.getAddress(),
        providerFeeToken,
        providerFeeAmount,
        providerValidUntil
      ]
    )

    const { v, r, s } = await signHash(user3, message)

    const providerFees: ProviderFees = {
      providerFeeAddress: await user1.getAddress(),
      providerFeeToken,
      providerFeeAmount,
      v,
      r,
      s,
      providerData: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(providerData)),
      validUntil: providerValidUntil
    }

    const consumeMarketFee = {
      consumeMarketFeeAddress: ZERO_ADDRESS,
      consumeMarketFeeToken: ZERO_ADDRESS,
      consumeMarketFeeAmount: '0'
    }
    const order: OrderParams = {
      consumer: await user1.getAddress(),
      serviceIndex: 1,
      _providerFee: providerFees,
      _consumeMarketFee: consumeMarketFee
    }

    const fre: FreOrderParams = {
      exchangeContract: addresses.FixedPrice,
      exchangeId,
      maxBaseTokenAmount: '1',
      baseTokenAddress: addresses.MockDAI,
      baseTokenDecimals: 18,
      swapMarketFee: '0.1',
      marketFeeAddress: ZERO_ADDRESS
    }

    const buyTx = await datatoken.buyFromFreAndOrder(datatokenAddress, order, fre)
    assert(buyTx)
  })

  it('#cleanPermissions - should FAIL to clean permissions at Datatoken level, if NOT NFT Owner', async () => {
    assert(
      (await datatoken.getPermissions(datatokenAddress, await nftOwner.getAddress()))
        .minter === true
    )

    assert(
      (await datatoken.getPaymentCollector(datatokenAddress)) ===
        (await user3.getAddress())
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .paymentManager === true
    )

    try {
      await datatoken.cleanPermissions(datatokenAddress, await user2.getAddress())
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is NOT Nft Owner')
    }

    assert(
      (await datatoken.getPaymentCollector(datatokenAddress)) ===
        (await user3.getAddress())
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await nftOwner.getAddress()))
        .minter === true
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .paymentManager === true
    )
  })

  it('#cleanPermissions - should clean permissions at Datatoken level', async () => {
    assert(
      (await datatoken.getPermissions(datatokenAddress, await nftOwner.getAddress()))
        .minter === true
    )

    assert(
      (await datatoken.getPaymentCollector(datatokenAddress)) ===
        (await user3.getAddress())
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .paymentManager === true
    )

    datatoken = new Datatoken(nftOwner, 8996)
    await datatoken.cleanPermissions(datatokenAddress, await nftOwner.getAddress())

    assert(
      (await datatoken.getPaymentCollector(datatokenAddress)) ===
        (await nftOwner.getAddress())
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await nftOwner.getAddress()))
        .minter === false
    )

    assert(
      (await datatoken.getPermissions(datatokenAddress, await user1.getAddress()))
        .paymentManager === false
    )
  })

  it('#getNFTAddress - should succeed to get the parent NFT address', async () => {
    const address = await datatoken.getNFTAddress(datatokenAddress)
    assert(address, 'Not able to get the parent NFT address')
  })

  it('#setData - should set a value into 725Y standard, if Caller has ERC20Deployer permission', async () => {
    const data = 'SomeData'

    assert(
      (await nftDatatoken.isDatatokenDeployer(
        nftAddress,
        await nftOwner.getAddress()
      )) === true
    )

    await datatoken.setData(datatokenAddress, await nftOwner.getAddress(), data)

    assert((await nftDatatoken.getData(nftAddress, datatokenAddress)) === data)
  })

  it('#setData - should FAIL to set a value into 725Y standard, if Caller has NOT ERC20Deployer permission', async () => {
    const data = 'NewData'
    const OldData = 'SomeData'
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user3.getAddress())) ===
        false
    )

    try {
      await datatoken.setData(datatokenAddress, await user3.getAddress(), data)
      assert(false)
    } catch (e) {
      assert(e.message === 'User is not Datatoken Deployer')
    }
    assert((await nftDatatoken.getData(nftAddress, datatokenAddress)) === OldData)
  })

  it('#getDecimals - should return the number of decimals of the datatoken', async () => {
    const decimals = await datatoken.getDecimals(datatokenAddress)
    assert(decimals === 18)
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
    datatoken = new Datatoken(user1, 8996)
    const balance1before = await datatoken.balance(
      datatokenAddress,
      await user1.getAddress()
    )
    const balance2before = await datatoken.balance(
      datatokenAddress,
      await user2.getAddress()
    )

    await datatoken.transfer(datatokenAddress, await user2.getAddress(), '1')

    const balance1after = await datatoken.balance(
      datatokenAddress,
      await user1.getAddress()
    )
    const balance2after = await datatoken.balance(
      datatokenAddress,
      await user2.getAddress()
    )

    assert(+balance1after === +balance1before - 1)
    assert(+balance2after === +balance2before + 1)
  })

  it('#setPublishingMarketFee - User should not be able to set the Publishing Market Fee', async () => {
    const originalPublishingMarketFee = await datatoken.getPublishingMarketFee(
      datatokenAddress
    )
    try {
      await datatoken.setPublishingMarketFee(
        datatokenAddress,
        await user1.getAddress(),
        addresses.MockDAI,
        ethers.utils.parseUnits('10').toString(),
        await user1.getAddress()
      )
    } catch (e) {
      assert(e.message === 'Caller is not the Publishing Market Fee Address')
    }
    const newPublishingMarketFee = await datatoken.getPublishingMarketFee(
      datatokenAddress
    )

    assert(
      newPublishingMarketFee.publishMarketFeeAddress ===
        originalPublishingMarketFee.publishMarketFeeAddress
    )
    assert(
      newPublishingMarketFee.publishMarketFeeToken ===
        originalPublishingMarketFee.publishMarketFeeToken
    )
    assert(
      newPublishingMarketFee.publishMarketFeeAmount ===
        originalPublishingMarketFee.publishMarketFeeAmount
    )
  })

  it('#setPublishingMarketFee - Marketplace fee address should be able to set the Publishing Market Fee', async () => {
    datatoken = new Datatoken(user2, 8996)

    const originalPublishingMarketFee = await datatoken.getPublishingMarketFee(
      datatokenAddress
    )
    try {
      await datatoken.setPublishingMarketFee(
        datatokenAddress,
        await user2.getAddress(),
        addresses.MockDAI,
        ethers.utils.parseUnits('10').toString(),
        await user2.getAddress()
      )
    } catch (e) {
      console.log('Error:', e)
    }
    const newPublishingMarketFee = await datatoken.getPublishingMarketFee(
      datatokenAddress
    )

    assert(newPublishingMarketFee !== originalPublishingMarketFee)
    assert(newPublishingMarketFee.publishMarketFeeAddress === (await user2.getAddress()))

    assert(
      newPublishingMarketFee.publishMarketFeeAmount ===
        ethers.utils.parseUnits('10').toString()
    )
    assert(newPublishingMarketFee.publishMarketFeeToken === addresses.MockDAI)
  })
})
