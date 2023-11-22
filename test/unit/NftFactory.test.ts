import { assert, expect } from 'chai'
import { getTestConfig, provider, getAddresses } from '../config'
import { ethers, Signer } from 'ethers'
import {
  NftFactory,
  NftCreateData,
  TokenOrder,
  ZERO_ADDRESS,
  signHash,
  Nft,
  approve,
  Config,
  balance,
  Datatoken,
  getEventFromTx
} from '../../src'
import { ProviderFees, FreCreationParams, DatatokenCreateParams } from '../../src/@types'

describe('Nft Factory test', () => {
  let factoryOwner: Signer
  let nftOwner: Signer
  let user1: Signer
  let user2: Signer
  let addresses
  let nftFactory: NftFactory
  let dtAddress: string
  let dtAddress2: string
  let nftAddress: string
  let config: Config

  const DATA_TOKEN_AMOUNT = '1'
  const FEE = '0.001'

  let nftData: NftCreateData
  let dtParams: DatatokenCreateParams

  before(async () => {
    factoryOwner = (await provider.getSigner(0)) as Signer
    nftOwner = (await provider.getSigner(1)) as Signer
    user1 = (await provider.getSigner(2)) as Signer
    user2 = (await provider.getSigner(3)) as Signer

    config = await getTestConfig(factoryOwner as Signer)
    addresses = await getAddresses()

    nftData = {
      name: '72120Bundle',
      symbol: '72Bundle',
      templateIndex: 1,
      tokenURI: 'https://oceanprotocol.com/nft/',
      transferable: true,
      owner: await nftOwner.getAddress()
    }

    dtParams = {
      templateIndex: 1,
      minter: await nftOwner.getAddress(),
      paymentCollector: await user2.getAddress(),
      mpFeeAddress: await user1.getAddress(),
      feeToken: ZERO_ADDRESS,
      cap: '1000000',
      feeAmount: '0',
      name: 'ERC20B1',
      symbol: 'ERC20DT1Symbol'
    }
  })

  it('should initiate NFTFactory instance', async () => {
    nftFactory = new NftFactory(addresses.ERC721Factory, nftOwner)
  })

  it('#getOwner - should return actual owner', async () => {
    const owner = await nftFactory.getOwner()
    assert(owner.toLowerCase() === (await factoryOwner.getAddress()).toLowerCase())
  })

  it('#getNFTTemplate - should return NFT template struct', async () => {
    const nftTemplate = await nftFactory.getNFTTemplate(1)
    assert(nftTemplate[1] === true)
    assert(nftTemplate[0].toLowerCase() === addresses.ERC721Template['1'].toLowerCase())
  })

  it('#getTokenTemplate - should return Token template struct', async () => {
    const tokenTemplate = await nftFactory.getTokenTemplate(1)
    assert(tokenTemplate[1] === true)
    assert(tokenTemplate[0].toLowerCase() === addresses.ERC20Template['1'].toLowerCase())
  })

  it('#createNft - should create an NFT', async () => {
    // we prepare transaction parameters objects
    nftAddress = await nftFactory.createNFT(nftData)

    // we check the created nft
    const nftDatatoken = new Nft(nftOwner)
    const tokenURI = await nftDatatoken.getTokenURI(nftAddress, 1)
    assert(tokenURI === nftData.tokenURI)
  })

  it('#createNftwithErc - should create an NFT and a Datatoken', async () => {
    // we prepare transaction parameters objects
    const tx = await nftFactory.createNftWithDatatoken(nftData, dtParams)
    const trxReceipt = await tx.wait()
    const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
    const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')
    // events have been emitted
    expect(nftCreatedEvent.event === 'NFTCreated')
    expect(tokenCreatedEvent.event === 'TokenCreated')
    // stored for later use in startMultipleTokenOrder test
    nftAddress = nftCreatedEvent.args.newTokenAddress
    dtAddress = tokenCreatedEvent.args.newTokenAddress
  })

  it('#createNftwithErc - should increment nft and token count', async () => {
    const currentNFTCount = await nftFactory.getCurrentNFTCount()
    const currentTokenCount = await nftFactory.getCurrentTokenCount()

    await nftFactory.createNftWithDatatoken(nftData, dtParams)

    expect((await nftFactory.getCurrentNFTCount()) === currentNFTCount + 1)
    expect((await nftFactory.getCurrentTokenCount()) === currentTokenCount + 1)
  })

  it('#createNftErcWithFixedRate- should create an NFT, a datatoken and create a Fixed Rate Exchange', async () => {
    // we prepare transaction parameters objects
    const freParams: FreCreationParams = {
      fixedRateAddress: addresses.FixedPrice,
      baseTokenAddress: addresses.MockDAI,
      owner: await nftOwner.getAddress(),
      marketFeeCollector: await nftOwner.getAddress(),
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: FEE,
      allowedConsumer: await user1.getAddress(),
      withMint: true
    }

    const tx = await nftFactory.createNftWithDatatokenWithFixedRate(
      nftData,
      dtParams,
      freParams
    )
    const trxReceipt = await tx.wait()
    // events have been emitted
    const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
    const TokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')
    const NewFixedRateEvent = getEventFromTx(trxReceipt, 'NewFixedRate')
    expect(nftCreatedEvent.event === 'NFTCreated')
    expect(TokenCreatedEvent.event === 'TokenCreated')
    expect(NewFixedRateEvent.event === 'NewFixedRate')

    // stored for later use in startMultipleTokenOrder test
    dtAddress = TokenCreatedEvent.args.newTokenAddress
  })

  it('#createNftErcWithDispenser- should create an NFT, a datatoken and create a Dispenser', async () => {
    // we prepare transaction parameters objects
    const dispenserParams = {
      dispenserAddress: addresses.Dispenser,
      maxTokens: '1',
      maxBalance: '1',
      withMint: true,
      allowedSwapper: ZERO_ADDRESS
    }

    const tx = await nftFactory.createNftWithDatatokenWithDispenser(
      nftData,
      dtParams,
      dispenserParams
    )
    const trxReceipt = await tx.wait()
    // events have been emitted
    const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
    const TokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')
    const DispenserCreatedEvent = getEventFromTx(trxReceipt, 'DispenserCreated')
    expect(nftCreatedEvent.event === 'NFTCreated')
    expect(TokenCreatedEvent.event === 'TokenCreated')
    expect(DispenserCreatedEvent.event === 'DispenserCreated')

    // stored for later use in startMultipleTokenOrder test
    dtAddress2 = TokenCreatedEvent.args.newTokenAddress
  })

  it('#startMultipleTokenOrder- should succed to start multiple orders', async () => {
    const consumer = user1 // could be different user
    const serviceIndex = 1 // dummy index
    const consumeFeeAddress = user2 // marketplace fee Collector
    const consumeFeeAmount = '0' // fee to be collected on top, requires approval
    const consumeFeeToken = addresses.MockDAI // token address for the feeAmount, in this case DAI
    nftFactory = new NftFactory(addresses.ERC721Factory, consumer)
    // we reuse a DT created in a previous test
    expect(
      parseInt(await balance(nftOwner, dtAddress, await user1.getAddress()))
    ).to.equal(0)

    // dt owner mint DATA_TOKEN_AMOUNT to user1
    const datatoken = new Datatoken(nftOwner)
    datatoken.mint(
      dtAddress,
      await nftOwner.getAddress(),
      DATA_TOKEN_AMOUNT,
      await user1.getAddress()
    )

    // user1 approves NFTFactory to move his DATA_TOKEN_AMOUNT
    await approve(
      user1,
      config,
      await user1.getAddress(),
      dtAddress,
      addresses.ERC721Factory,
      DATA_TOKEN_AMOUNT
    )

    // we reuse another DT created in a previous test
    expect(parseInt(await balance(user1, dtAddress2, await user1.getAddress()))).to.equal(
      0
    )

    // dt owner mint DATA_TOKEN_AMOUNT to user1
    datatoken.mint(
      dtAddress2,
      await nftOwner.getAddress(),
      DATA_TOKEN_AMOUNT,
      await user1.getAddress()
    )
    // user1 approves NFTFactory to move his DATA_TOKEN_AMOUNT
    await approve(
      user1,
      config,
      await user1.getAddress(),
      dtAddress2,
      addresses.ERC721Factory,
      DATA_TOKEN_AMOUNT
    )

    // we check user1 has enought DTs
    const user1Dt1Balance = await balance(user1, dtAddress, await user1.getAddress())
    const user1Dt2Balance = await balance(user1, dtAddress2, await user1.getAddress())
    expect(parseInt(user1Dt1Balance)).to.equal(parseInt(DATA_TOKEN_AMOUNT))
    expect(parseInt(user1Dt2Balance)).to.equal(parseInt(DATA_TOKEN_AMOUNT))

    const providerData = JSON.stringify({ timeout: 0 })
    const providerValidUntil = '0'

    const message = ethers.utils.solidityKeccak256(
      ['bytes', 'address', 'address', 'uint256', 'uint256'],
      [
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(providerData)),
        await consumeFeeAddress.getAddress(),
        consumeFeeToken,
        consumeFeeAmount,
        providerValidUntil
      ]
    )

    const { v, r, s } = await signHash(consumeFeeAddress, message)

    const providerFees: ProviderFees = {
      providerFeeAddress: await consumeFeeAddress.getAddress(),
      providerFeeToken: consumeFeeToken,
      providerFeeAmount: consumeFeeAmount,
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
    const orders: TokenOrder[] = [
      {
        tokenAddress: dtAddress,
        consumer: await consumer.getAddress(),
        serviceIndex,
        _providerFee: providerFees,
        _consumeMarketFee: consumeMarketFee
      },
      {
        tokenAddress: dtAddress2,
        consumer: await consumer.getAddress(),
        serviceIndex,
        _providerFee: providerFees,
        _consumeMarketFee: consumeMarketFee
      }
    ]
    await nftFactory.startMultipleTokenOrder(orders)
    // we check user1 has no more DTs
    expect(parseInt(await balance(user1, dtAddress, await user1.getAddress()))).to.equal(
      0
    )
    expect(parseInt(await balance(user1, dtAddress2, await user1.getAddress()))).to.equal(
      0
    )
  })

  it('#checkDatatoken - should confirm if DT is from the factory', async () => {
    assert((await nftFactory.checkDatatoken(dtAddress)) === true)
    assert((await nftFactory.checkDatatoken(dtAddress2)) === true)
    assert((await nftFactory.checkDatatoken(await user1.getAddress())) === false)
    assert((await nftFactory.checkDatatoken(nftAddress)) === false)
  })

  it('#checkNFT - should return nftAddress if from the factory, or address(0) if not', async () => {
    assert((await nftFactory.checkNFT(dtAddress)) === ZERO_ADDRESS)
    assert((await nftFactory.checkNFT(nftAddress)) === nftAddress)
  })

  it('#addNFTTemplate - should add a new NFT token template', async () => {
    const currentNFTTemplateCount = await nftFactory.getCurrentNFTTemplateCount()
    nftFactory = new NftFactory(addresses.ERC721Factory, factoryOwner)
    await nftFactory.addNFTTemplate(
      await factoryOwner.getAddress(),
      addresses.ERC721Template['1']
    )

    expect(
      (await nftFactory.getCurrentNFTTemplateCount()) === currentNFTTemplateCount + 1
    )
  })

  it('#disableNFTTemplate - should disable an NFT token template', async () => {
    const currentNFTTemplateCount = await nftFactory.getCurrentNFTTemplateCount()
    nftFactory = new NftFactory(addresses.ERC721Factory, factoryOwner)
    let nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === true)

    await nftFactory.disableNFTTemplate(
      await factoryOwner.getAddress(),
      currentNFTTemplateCount
    )

    nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === false)
  })

  it('#reactivateNFTTemplate - should reactivate an NFT previously disabled token template', async () => {
    const currentNFTTemplateCount = await nftFactory.getCurrentNFTTemplateCount()
    nftFactory = new NftFactory(addresses.ERC721Factory, factoryOwner)
    let nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === false)

    await nftFactory.reactivateNFTTemplate(
      await factoryOwner.getAddress(),
      currentNFTTemplateCount
    )

    nftTemplate = await nftFactory.getNFTTemplate(currentNFTTemplateCount)
    assert(nftTemplate.isActive === true)
  })

  it('#addTokenTemplate - should add a new Datatokent template', async () => {
    const currentTokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()

    await nftFactory.addTokenTemplate(
      await factoryOwner.getAddress(),
      addresses.ERC20Template['1']
    )

    expect(
      (await nftFactory.getCurrentTokenTemplateCount()) === currentTokenTemplateCount + 1
    )
  })

  it('#disableTokenTemplate - should disable an Datatoken template', async () => {
    const currentTokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()

    let tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === true)

    await nftFactory.disableTokenTemplate(
      await factoryOwner.getAddress(),
      currentTokenTemplateCount
    )

    tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === false)
  })

  it('#reactivateTokenTemplate - should reactivate an previously disabled Datatoken template', async () => {
    const currentTokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()

    let tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === false)

    await nftFactory.reactivateTokenTemplate(
      await factoryOwner.getAddress(),
      currentTokenTemplateCount
    )

    tokenTemplate = await nftFactory.getTokenTemplate(currentTokenTemplateCount)
    assert(tokenTemplate.isActive === true)
  })
})
