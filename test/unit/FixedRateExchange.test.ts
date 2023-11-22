import { assert, expect } from 'chai'
import { getTestConfig, provider, getAddresses } from '../config'
import { ethers, Signer } from 'ethers'

import {
  NftFactory,
  NftCreateData,
  FixedRateExchange,
  ZERO_ADDRESS,
  approve,
  transfer,
  balance,
  unitsToAmount,
  Config,
  Datatoken,
  getEventFromTx,
  amountToUnits
} from '../../src'
import { FreCreationParams, DatatokenCreateParams } from '../../src/@types'

describe('Fixed Rate unit test', () => {
  let factoryOwner: Signer
  let exchangeOwner: Signer
  let user1: Signer
  let user2: Signer
  let exchangeId: string
  let fixedRate: FixedRateExchange
  let dtAddress: string
  let config: Config
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
    exchangeOwner = (await provider.getSigner(0)) as Signer
    config = await getTestConfig(factoryOwner as Signer)
    addresses = await getAddresses()

    nftData.owner = await factoryOwner.getAddress()
    dtParams.minter = await factoryOwner.getAddress()
    dtParams.paymentCollector = await user2.getAddress()
    dtParams.mpFeeAddress = await factoryOwner.getAddress()
  })

  describe('Test a Fixed Rate Exchange with DAI (18 Decimals) as Basetoken', () => {
    it('#create an exchange', async () => {
      // CREATE AN Exchange
      // we prepare transaction parameters objects

      const nftFactory = new NftFactory(addresses.ERC721Factory, exchangeOwner)

      const freParams: FreCreationParams = {
        fixedRateAddress: addresses.FixedPrice,
        baseTokenAddress: addresses.MockDAI,
        owner: await exchangeOwner.getAddress(),
        marketFeeCollector: await user2.getAddress(),
        baseTokenDecimals: 18,
        datatokenDecimals: 18,
        fixedRate: '1',
        marketFee: '0.001',
        allowedConsumer: ZERO_ADDRESS,
        withMint: true
      }

      const tx = await nftFactory.createNftWithDatatokenWithFixedRate(
        nftData,
        dtParams,
        freParams
      )
      const trxReceipt = await tx.wait()
      const freCreatedEvent = getEventFromTx(trxReceipt, 'NewFixedRate')
      const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')

      dtAddress = tokenCreatedEvent?.args?.newTokenAddress
      exchangeId = freCreatedEvent?.args?.exchangeId

      // user1 has no dt1
      expect(await balance(user1, dtAddress, await user1.getAddress())).to.equal('0.0')

      fixedRate = new FixedRateExchange(addresses.FixedPrice, exchangeOwner)
      assert(fixedRate != null)
    })

    it('#isActive - should return true if exchange is active', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
      expect(
        await fixedRate.isActive(
          '0x0000000000000000000000000000000000000000000000000000000000000001'
        )
      ).to.equal(false)
    })

    it('#getOwner - should get exchange owner given an id', async () => {
      expect(await fixedRate.getExchangeOwner(exchangeId)).to.equal(
        await exchangeOwner.getAddress()
      )
    })

    it('#getRouter - should get Router address', async () => {
      expect(await fixedRate.getRouter()).to.equal(addresses.Router)
    })

    it('#deactivate - should deactivate an exchange if exchangeOwner', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
      await fixedRate.deactivate(exchangeId)

      expect(await fixedRate.isActive(exchangeId)).to.equal(false)
    })

    it('#activate - should activate an exchange if exchangeOwner', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(false)
      await fixedRate.activate(exchangeId)
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
    })
    it('#dectivateMint - should deactivate Mint if exchangeOwner', async () => {
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(true)
      await fixedRate.deactivateMint(exchangeId)
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(false)
    })
    it('#activateMint - should activate Mint(allows fixed rate contract to mint dts if required), if exchangeOwner', async () => {
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(false)
      await fixedRate.activateMint(exchangeId)
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(true)
    })
    it('#generate exchangeId - should generate a specific exchangeId', async () => {
      expect(await fixedRate.generateExchangeId(addresses.MockDAI, dtAddress)).to.equal(
        exchangeId
      )
    })

    it('#getNumberOfExchanges - should return total number of exchanges', async () => {
      assert((await fixedRate.getNumberOfExchanges()) >= 1)
    })

    it('#getExchanges - should return all exchanges ids', async () => {
      const exchangeIds = await fixedRate.getExchanges()
      assert(exchangeIds.includes(exchangeId))
    })

    it('#getRate - should return rate', async () => {
      expect(await fixedRate.getRate(exchangeId)).to.equal('1.0')
    })

    it('#setRate - set new rate if exchangeOwner', async () => {
      await fixedRate.setRate(exchangeId, '2')
      expect(await fixedRate.getRate(exchangeId)).to.equal('2.0')
      await fixedRate.setRate(exchangeId, '1')
      expect(await fixedRate.getRate(exchangeId)).to.equal('1.0')
    })

    it('#getDatatokenSupply - should get the dt supply in the exchange', async () => {
      // exchange owner hasn't approved any DT for sell
      // since fre is withMint, dtSupply is 2^256
      expect(parseFloat(await fixedRate.getDatatokenSupply(exchangeId))).to.greaterThan(0)
    })

    it('#getBasetokenSupply - should get the bt supply in the exchange', async () => {
      // no baseToken at the beginning
      expect(await fixedRate.getBasetokenSupply(exchangeId)).to.equal('0.0')
    })

    it('#calcBaseInGivenDatatokensOut - should get bt amount in for a specific dt amount', async () => {
      // 100.2 DAI for 100 DT (0.1% market fee and 0.1% ocean fee)
      expect(
        await (
          await fixedRate.calcBaseInGivenDatatokensOut(exchangeId, '100')
        ).baseTokenAmount
      ).to.equal('100.3')
    })

    it('#getAmountBasetokensOut - should get bt amount out for a specific dt amount', async () => {
      // 99.8 DAI for 100 DT (0.1% market fee and 0.1% ocean fee)
      expect(await fixedRate.getAmountBasetokensOut(exchangeId, '100')).to.equal('99.7')
    })

    it('#buyDatatokens - user1 should buy some dt', async () => {
      // total supply is ZERO right now so dt owner mints 1000 DT and approves the fixed rate contract
      const datatoken = new Datatoken(exchangeOwner)
      await datatoken.mint(
        dtAddress,
        await exchangeOwner.getAddress(),
        '1000',
        await exchangeOwner.getAddress()
      )
      await approve(
        exchangeOwner,
        config,
        await exchangeOwner.getAddress(),
        dtAddress,
        addresses.FixedPrice,
        '1000'
      )
      // user1 gets 100 DAI so he can buy DTs
      await transfer(
        exchangeOwner,
        config,
        addresses.MockDAI,
        await user1.getAddress(),
        '100'
      )
      await approve(
        user1,
        config,
        await user1.getAddress(),
        addresses.MockDAI,
        addresses.FixedPrice,
        '100'
      )

      // user1 has no dts but has 100 DAI
      expect(await balance(user1, dtAddress, await user1.getAddress())).to.equal('0.0')
      const daiBalanceBefore = await balance(
        user1,
        addresses.MockDAI,
        await user1.getAddress()
      )

      // user1 buys 10 DT
      fixedRate = new FixedRateExchange(addresses.FixedPrice, user1)
      const amount = '10'
      const maxAmount = '11'
      const tx = await fixedRate.buyDatatokens(exchangeId, amount, maxAmount)
      const trxReceipt = await tx.wait()
      const SwappedEvent = getEventFromTx(trxReceipt, 'Swapped')
      assert(SwappedEvent != null)
      expect(SwappedEvent.args.exchangeId).to.equal(exchangeId)
      expect(SwappedEvent.args.by).to.equal(await user1.getAddress())
      expect(SwappedEvent.args.datatokenSwappedAmount.toString()).to.equal(
        await amountToUnits(user1, addresses.MockDAI, amount)
      )
      expect(SwappedEvent.args.tokenOutAddress).to.equal(dtAddress)
      expect(await balance(user1, dtAddress, await user1.getAddress())).to.equal(
        await unitsToAmount(user1, dtAddress, SwappedEvent.args.datatokenSwappedAmount)
      )
      expect(
        ethers.BigNumber.from(
          await amountToUnits(user1, addresses.MockDAI, daiBalanceBefore)
        )
          .sub(ethers.BigNumber.from(SwappedEvent.args.baseTokenSwappedAmount))
          .toString()
      ).to.equal(
        await amountToUnits(
          user1,
          addresses.MockDAI,
          await balance(user1, addresses.MockDAI, await user1.getAddress())
        )
      )
      // baseToken stays in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('10.0')
      // no dt in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('0.0')
    })

    it('#sellDatatokens - user1 should sell some dt', async () => {
      await approve(
        user1,
        config,
        await user1.getAddress(),
        dtAddress,
        addresses.FixedPrice,
        '100'
      )
      const daiBalanceBefore = await balance(
        user1,
        addresses.MockDAI,
        await user1.getAddress()
      )

      const tx = await fixedRate.sellDatatokens(exchangeId, '10', '9')
      const trxReceipt = await tx.wait()
      const SwappedEvent = getEventFromTx(trxReceipt, 'Swapped')
      assert(SwappedEvent != null)
      expect(SwappedEvent.args.exchangeId).to.equal(exchangeId)
      expect(SwappedEvent.args.by).to.equal(await user1.getAddress())
      expect(SwappedEvent.args.datatokenSwappedAmount.toString()).to.equal(
        ethers.BigNumber.from(await amountToUnits(user1, dtAddress, '10')).toString()
      )
      expect(SwappedEvent.args.tokenOutAddress).to.equal(addresses.MockDAI)
      expect(await balance(user1, dtAddress, await user1.getAddress())).to.equal('0.0')
      expect(
        ethers.BigNumber.from(
          await amountToUnits(user1, addresses.MockDAI, daiBalanceBefore)
        )
          .add(ethers.BigNumber.from(SwappedEvent.args.baseTokenSwappedAmount))
          .toString()
      ).to.equal(
        await amountToUnits(
          user1,
          addresses.MockDAI,
          await balance(user1, addresses.MockDAI, await user1.getAddress())
        )
      )

      // DTs stay in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('10.0')
      // no BTs in the contract (except for the fees, but not accounted here)
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0.0')
    })

    it('#getExchange - should return exchange details', async () => {
      const result = await fixedRate.getExchange(exchangeId)
      expect(result.active).to.equal(true)
      expect(result.btDecimals).to.equal('18')
      expect(result.dtDecimals).to.equal('18')
      expect(result.baseToken).to.equal(addresses.MockDAI)
      expect(result.datatoken).to.equal(dtAddress)
      expect(result.exchangeOwner).to.equal(await exchangeOwner.getAddress())
      expect(result.withMint).to.equal(true)
      expect(result.dtBalance).to.equal('10.0') // balance in the fixedRate
      expect(result.btBalance).to.equal('0.0') // balance in the fixedRate
      // since fre is withMint, dtSupply is 2^256
      expect(parseFloat(result.dtSupply)).to.gt(0) // total supply available (owner allowance + dtBalance)
      expect(result.btSupply).to.equal('0.0') // total supply available of baseToken in the contract
      expect(result.fixedRate).to.equal('1.0')
    })

    it('#getFeesInfo - should return exchange fee details', async () => {
      const result = await fixedRate.getFeesInfo(exchangeId)
      expect(result.marketFee).to.equal('0.001')
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for market and always in baseToken so it's 0.01 DAI
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for ocean community and always in baseToken so it's 0.01 DAI
      expect(result.marketFeeAvailable).to.equal('0.02') // formatted for baseToken decimals
      expect(result.oceanFeeAvailable).to.equal('0.04') // formatted for baseToken decimals
      expect(result.marketFeeCollector).to.equal(await user2.getAddress())
      expect(result.opcFee).to.equal('0.002')
    })

    it('#getAllowedSwapper- should return address(0) if not set, if exchangeOwner', async () => {
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ZERO_ADDRESS)
    })

    it('#setAllowedSwapper- should set an allowed swapper, if exchangeOwner', async () => {
      fixedRate = new FixedRateExchange(addresses.FixedPrice, exchangeOwner)
      await fixedRate.setAllowedSwapper(exchangeId, await user1.getAddress())
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(
        await user1.getAddress()
      )
    })

    it('#setAllowedSwapper- should disable allowed swapper(return address(0)), if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeId, ZERO_ADDRESS)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ZERO_ADDRESS)
    })

    it('#collectBasetokens- should collect BT in the contract, if exchangeOwner', async () => {
      fixedRate = new FixedRateExchange(addresses.FixedPrice, user1)
      // there are no bt in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0.0')
      // user1 buys 1 DT
      await fixedRate.buyDatatokens(exchangeId, '1', '2')
      // 1 DAI in the contract
      const fixedRateDetails = await fixedRate.getExchange(exchangeId)
      expect(fixedRateDetails.btBalance).to.equal('1.0')
      // owner collects BTs
      await fixedRate.collectBasetokens(exchangeId, fixedRateDetails.btBalance)
      // btBalance is zero
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0.0')
    })

    it('#collectDatatokens- should collect DT in the contract, if exchangeOwner', async () => {
      fixedRate = new FixedRateExchange(addresses.FixedPrice, exchangeOwner)
      const result = await fixedRate.getExchange(exchangeId)
      // 9 dts left
      expect(result.dtBalance).to.equal('9.0')
      // owner collects DTs
      await fixedRate.collectDatatokens(exchangeId, result.dtBalance)
      // no more dts in the contract
      const result2 = await fixedRate.getExchange(exchangeId)
      // since fre is withMint, dtSupply is 2^256
      expect(result2.dtBalance).to.equal('0.0')
      // since fre is withMint, dtSupply is 2^256
      expect(parseFloat(result2.dtSupply)).to.gt(0)
    })

    it('#collectMarketFee- should collect marketFee and send it to marketFeeCollector, anyone can call it', async () => {
      fixedRate = new FixedRateExchange(addresses.FixedPrice, user2)
      let result = await fixedRate.getFeesInfo(exchangeId)
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for market and always in baseToken so it's 0.01 DAI
      // plus another swap for 1 DT
      expect(result.marketFeeAvailable).to.equal('0.021') // formatted for baseToken decimals
      // same for ocean fee
      expect(result.oceanFeeAvailable).to.equal('0.042') // formatted for baseToken decimals
      expect(result.marketFeeCollector).to.equal(await user2.getAddress())

      const daiBalanceBeforeCollect = await balance(
        user2,
        addresses.MockDAI,
        await user2.getAddress()
      )

      // user4 calls collectMarketFee
      await fixedRate.collectMarketFee(exchangeId)
      result = await fixedRate.getFeesInfo(exchangeId)
      expect(result.marketFeeAvailable).to.equal('0.0')
      // ocean fee still available
      expect(result.oceanFeeAvailable).to.equal('0.042')
      // user2 is the marketFeeCollector
      expect(
        await amountToUnits(
          user2,
          addresses.MockDAI,
          await balance(user2, addresses.MockDAI, await user2.getAddress())
        )
      ).to.equal(
        ethers.BigNumber.from(
          await amountToUnits(user1, addresses.MockDAI, daiBalanceBeforeCollect)
        )
          .add(
            ethers.BigNumber.from(await amountToUnits(user1, addresses.MockDAI, '0.021'))
          )
          .toString()
      )
    })

    it('#updateMarketFee- should update Market fee if market fee collector', async () => {
      fixedRate = new FixedRateExchange(addresses.FixedPrice, user2)
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.001')
      // user2 is marketFeeCollector
      await fixedRate.updateMarketFee(exchangeId, '0.01')

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.01')
    })

    it('#updateMarketFeeCollector - should update Market fee collector if market fee collector', async () => {
      fixedRate = new FixedRateExchange(addresses.FixedPrice, user2)
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(
        await user2.getAddress()
      )

      await fixedRate.updateMarketFeeCollector(exchangeId, await user1.getAddress())

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(
        await user1.getAddress()
      )
    })
  })

  describe('Test a Fixed Rate Exchange with USDC (6 Decimals) as Basetoken', () => {
    it('#create an exchange', async () => {
      // CREATE AN Exchange
      // since FRE is created without mint rights, owner has to send dt to that exchange
      // we prepare transaction parameters objects

      const nftFactory = new NftFactory(addresses.ERC721Factory, exchangeOwner)

      const freParams: FreCreationParams = {
        fixedRateAddress: addresses.FixedPrice,
        baseTokenAddress: addresses.MockUSDC,
        owner: await exchangeOwner.getAddress(),
        marketFeeCollector: await user2.getAddress(),
        baseTokenDecimals: 6,
        datatokenDecimals: 18,
        fixedRate: '1',
        marketFee: '0.001',
        allowedConsumer: ZERO_ADDRESS,
        withMint: true
      }

      const tx = await nftFactory.createNftWithDatatokenWithFixedRate(
        nftData,
        dtParams,
        freParams
      )
      const trxReceipt = await tx.wait()
      const freCreatedEvent = getEventFromTx(trxReceipt, 'NewFixedRate')
      const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')

      dtAddress = tokenCreatedEvent?.args?.newTokenAddress
      exchangeId = freCreatedEvent?.args?.exchangeId

      // user1 has no dt1
      expect(await balance(user1, dtAddress, await user1.getAddress())).to.equal('0.0')

      fixedRate = new FixedRateExchange(addresses.FixedPrice, exchangeOwner)
      assert(fixedRate != null)
    })

    it('#isActive - should return true if exchange is active', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
      expect(
        await fixedRate.isActive(
          '0x0000000000000000000000000000000000000000000000000000000000000001'
        )
      ).to.equal(false)
    })

    it('#getOwner - should get exchange owner given an id', async () => {
      expect(await fixedRate.getExchangeOwner(exchangeId)).to.equal(
        await exchangeOwner.getAddress()
      )
    })

    it('#getRouter - should get Router address', async () => {
      expect(await fixedRate.getRouter()).to.equal(addresses.Router)
    })

    it('#deactivate - should deactivate an exchange if exchangeOwner', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
      await fixedRate.deactivate(exchangeId)

      expect(await fixedRate.isActive(exchangeId)).to.equal(false)
    })

    it('#activate - should activate an exchange if exchangeOwner', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(false)
      await fixedRate.activate(exchangeId)
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
    })
    it('#dectivateMint - should deactivate Mint if exchangeOwner', async () => {
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(true)
      await fixedRate.deactivateMint(exchangeId)
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(false)
    })
    it('#activateMint - should activate Mint(allows fixed rate contract to mint dts if required), if exchangeOwner', async () => {
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(false)
      await fixedRate.activateMint(exchangeId)
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(true)
    })

    it('#generate exchangeId - should generate a specific exchangeId', async () => {
      expect(await fixedRate.generateExchangeId(addresses.MockUSDC, dtAddress)).to.equal(
        exchangeId
      )
    })

    it('#getExchanges - should return all exchanges ids', async () => {
      const exchangeIds = await fixedRate.getExchanges()
      assert(exchangeIds.includes(exchangeId))
    })

    it('#getRate - should return rate', async () => {
      expect(await fixedRate.getRate(exchangeId)).to.equal('1.0')
    })

    it('#setRate - set new rate if exchangeOwner', async () => {
      await fixedRate.setRate(exchangeId, '2')
      expect(await fixedRate.getRate(exchangeId)).to.equal('2.0')
      await fixedRate.setRate(exchangeId, '1')
      expect(await fixedRate.getRate(exchangeId)).to.equal('1.0')
    })

    it('#getDatatokenSupply - should get the dt supply in the exchange', async () => {
      // fre has mint rights
      expect(parseFloat(await fixedRate.getDatatokenSupply(exchangeId))).to.gt(0)
    })

    it('#getBasetokenSupply - should get the bt supply in the exchange', async () => {
      // no baseToken at the beginning
      expect(await fixedRate.getBasetokenSupply(exchangeId)).to.equal('0.0')
    })

    it('#calcBaseInGivenDatatokensOut - should get bt amount in for a specific dt amount', async () => {
      // 100.2 USDC for 100 DT (0.1% market fee and 0.1% ocean fee)
      expect(
        await (
          await fixedRate.calcBaseInGivenDatatokensOut(exchangeId, '100')
        ).baseTokenAmount
      ).to.equal('100.3')
    })

    it('#getAmountBasetokensOut - should get bt amount out for a specific dt amount', async () => {
      // 99.8 USDC for 100 DT (0.1% market fee and 0.1% ocean fee)
      expect(await fixedRate.getAmountBasetokensOut(exchangeId, '100')).to.equal('99.7')
    })

    it('#buyDatatokens - user1 should buy some dt', async () => {
      // total supply is ZERO right now so dt owner mints 1000 DT and approves the fixed rate contract
      const datatoken = new Datatoken(exchangeOwner)
      await datatoken.mint(
        dtAddress,
        await exchangeOwner.getAddress(),
        '1000',
        fixedRate.address
      )
      // user1 gets 100 USDC so he can buy DTs
      await transfer(
        exchangeOwner,
        config,
        addresses.MockUSDC,
        await user1.getAddress(),
        '100'
      )
      await approve(
        user1,
        config,
        await user1.getAddress(),
        addresses.MockUSDC,
        addresses.FixedPrice,
        '100'
      )

      // user1 has no dts but has 100 USDC
      expect(await balance(user1, dtAddress, await user1.getAddress())).to.equal('0.0')
      const usdcBalanceBefore = await balance(
        user1,
        addresses.MockUSDC,
        await user1.getAddress()
      )

      // user1 buys 10 DT
      fixedRate = new FixedRateExchange(addresses.FixedPrice, user1)
      const amount = '10'
      const maxAmount = '11'
      const tx = await fixedRate.buyDatatokens(exchangeId, amount, maxAmount)
      const trxReceipt = await tx.wait()
      const SwappedEvent = getEventFromTx(trxReceipt, 'Swapped')

      assert(SwappedEvent != null)
      expect(SwappedEvent.args.exchangeId).to.equal(exchangeId)
      expect(SwappedEvent.args.by).to.equal(await user1.getAddress())
      expect(SwappedEvent.args.datatokenSwappedAmount.toString()).to.equal(
        await amountToUnits(user1, dtAddress, amount)
      )
      expect(SwappedEvent.args.tokenOutAddress).to.equal(dtAddress)
      expect(await balance(user1, dtAddress, await user1.getAddress())).to.equal(
        await unitsToAmount(user1, dtAddress, SwappedEvent.args.datatokenSwappedAmount)
      )
      expect(
        ethers.BigNumber.from(
          await amountToUnits(user1, addresses.MockUSDC, usdcBalanceBefore)
        )
          .sub(ethers.BigNumber.from(SwappedEvent.args.baseTokenSwappedAmount))
          .toString()
      ).to.equal(
        await amountToUnits(
          user1,
          addresses.MockUSDC,
          await balance(user1, addresses.MockUSDC, await user1.getAddress())
        )
      )
      // baseToken stays in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('10.0')
      // no dt in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('0.0')
    })

    it('#sellDatatokens - user1 should sell some dt', async () => {
      await approve(
        user1,
        config,
        await user1.getAddress(),
        dtAddress,
        addresses.FixedPrice,
        '10'
      )
      const usdcBalanceBefore = await balance(
        user1,
        addresses.MockUSDC,
        await user1.getAddress()
      )

      const tx = await fixedRate.sellDatatokens(exchangeId, '10', '9')
      const trxReceipt = await tx.wait()
      const SwappedEvent = getEventFromTx(trxReceipt, 'Swapped')
      assert(SwappedEvent != null)
      expect(SwappedEvent.args.exchangeId).to.equal(exchangeId)
      expect(SwappedEvent.args.by).to.equal(await user1.getAddress())
      expect(SwappedEvent.args.datatokenSwappedAmount.toString()).to.equal(
        ethers.BigNumber.from(await amountToUnits(user1, dtAddress, '10')).toString()
      )
      expect(SwappedEvent.args.tokenOutAddress).to.equal(addresses.MockUSDC)
      expect(await balance(user1, dtAddress, await user1.getAddress())).to.equal('0.0')
      expect(
        ethers.BigNumber.from(
          await amountToUnits(user1, addresses.MockUSDC, usdcBalanceBefore)
        )
          .add(ethers.BigNumber.from(SwappedEvent.args.baseTokenSwappedAmount))
          .toString()
      ).to.equal(
        await amountToUnits(
          user1,
          addresses.MockUSDC,
          await balance(user1, addresses.MockUSDC, await user1.getAddress())
        )
      )
      // DTs stay in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('10.0')
      // no BTs in the contract (except for the fees, but not accounted here)
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0.0')
      // DT supply is huge, cause fre has mint rights
      expect(parseFloat(await fixedRate.getDatatokenSupply(exchangeId))).to.gt(1000)
    })

    it('#getExchange - should return exchange details', async () => {
      const result = await fixedRate.getExchange(exchangeId)
      expect(result.active).to.equal(true)
      expect(result.btDecimals).to.equal('6')
      expect(result.dtDecimals).to.equal('18')
      expect(result.baseToken).to.equal(addresses.MockUSDC)
      expect(result.datatoken).to.equal(dtAddress)
      expect(result.exchangeOwner).to.equal(await exchangeOwner.getAddress())
      expect(result.withMint).to.equal(true)
      expect(result.dtBalance).to.equal('10.0') // balance in the fixedRate
      expect(result.btBalance).to.equal('0.0') // balance in the fixedRate
      // since fre has mint rights, dtSupply is huge
      expect(parseFloat(result.dtSupply)).to.gt(1000) // total supply available (owner allowance + dtBalance)
      expect(result.btSupply).to.equal('0.0') // total supply available of baseToken in the contract
      expect(result.fixedRate).to.equal('1.0')
    })

    it('#getFeesInfo - should return exchange fee details', async () => {
      const result = await fixedRate.getFeesInfo(exchangeId)
      expect(result.marketFee).to.equal('0.001')
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for market and always in baseToken so it's 0.01 USDC
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for ocean community and always in baseToken so it's 0.01 USDC
      expect(result.marketFeeAvailable).to.equal('0.02') // formatted for baseToken decimals
      expect(result.oceanFeeAvailable).to.equal('0.04') // formatted for baseToken decimals
      expect(result.marketFeeCollector).to.equal(await user2.getAddress())
      expect(result.opcFee).to.equal('0.002')
    })

    it('#getAllowedSwapper- should return address(0) if not set, if exchangeOwner', async () => {
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ZERO_ADDRESS)
    })

    it('#setAllowedSwapper- should set an allowed swapper, if exchangeOwner', async () => {
      fixedRate = new FixedRateExchange(addresses.FixedPrice, exchangeOwner)

      await fixedRate.setAllowedSwapper(exchangeId, await user1.getAddress())
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(
        await user1.getAddress()
      )
    })

    it('#setAllowedSwapper- should disable allowed swapper(return address(0)), if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeId, ZERO_ADDRESS)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ZERO_ADDRESS)
    })

    it('#collectBasetokens- should collect BT in the contract, if exchangeOwner', async () => {
      fixedRate = new FixedRateExchange(addresses.FixedPrice, user1)

      // there are no bt in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0.0')
      // user1 buys 1 DT
      await fixedRate.buyDatatokens(exchangeId, '1', '2')
      // 1 DAI in the contract
      fixedRate = new FixedRateExchange(addresses.FixedPrice, exchangeOwner)

      const exchangeDetails = await fixedRate.getExchange(exchangeId)
      expect(exchangeDetails.btBalance).to.equal('1.0')
      // owner collects BTs
      await fixedRate.collectBasetokens(exchangeId, exchangeDetails.btBalance)
      // btBalance is zero
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0.0')
    })

    it('#collectDatatokens- should collect DT in the contract, if exchangeOwner', async () => {
      const result = await fixedRate.getExchange(exchangeId)
      // 9 dts left
      expect(result.dtBalance).to.equal('9.0')
      // owner collects DTs
      await fixedRate.collectDatatokens(exchangeId, result.dtBalance)
      // no more dts in the contract
      const result2 = await fixedRate.getExchange(exchangeId)
      expect(result2.dtBalance).to.equal('0.0')
      // since fre has mint rights, dtSupply is huge
      expect(parseFloat(result2.dtSupply)).to.gt(990)
    })

    it('#updateMarketFee- should update Market fee if market fee collector', async () => {
      fixedRate = new FixedRateExchange(addresses.FixedPrice, user2)

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.001')
      // user2 is marketFeeCollector
      await fixedRate.updateMarketFee(exchangeId, '0.01')

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.01')
    })

    it('#updateMarketFeeCollector - should update Market fee collector if market fee collector', async () => {
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(
        await user2.getAddress()
      )

      await fixedRate.updateMarketFeeCollector(exchangeId, await user1.getAddress())

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(
        await user1.getAddress()
      )
    })
  })

  describe('Test a Fixed Rate Exchange With Different Fee Tokens', () => {
    it('#create a fixed rate exchange with DAI as feetoken', async () => {
      // CREATE AN Exchange
      // we prepare transaction parameters objects

      const nftFactory = new NftFactory(addresses.ERC721Factory, exchangeOwner)

      const freParams: FreCreationParams = {
        fixedRateAddress: addresses.FixedPrice,
        baseTokenAddress: addresses.MockDAI,
        owner: await exchangeOwner.getAddress(),
        marketFeeCollector: await user2.getAddress(),
        baseTokenDecimals: 18,
        datatokenDecimals: 18,
        fixedRate: '1',
        marketFee: '0.001',
        allowedConsumer: ZERO_ADDRESS,
        withMint: true
      }

      dtParams.feeToken = addresses.MockDAI
      dtParams.feeAmount = '0.123456789'

      const tx = await nftFactory.createNftWithDatatokenWithFixedRate(
        nftData,
        dtParams,
        freParams
      )
      const txReceipt = await tx.wait()
      const tokenCreatedEvent = getEventFromTx(txReceipt, 'TokenCreated')

      const datatokenAddress = tokenCreatedEvent.args.newTokenAddress

      const datatoken = new Datatoken(exchangeOwner)

      const publishingMarketFee = await datatoken.getPublishingMarketFee(datatokenAddress)

      assert(
        publishingMarketFee.publishMarketFeeAmount ===
          ethers.utils.parseUnits('0.123456789').toString()
      )
    })

    it('#create a fixed rate exchange with USDC as feetoken', async () => {
      // CREATE AN Exchange
      // we prepare transaction parameters objects

      const nftFactory = new NftFactory(addresses.ERC721Factory, exchangeOwner)

      const freParams: FreCreationParams = {
        fixedRateAddress: addresses.FixedPrice,
        baseTokenAddress: addresses.MockDAI,
        owner: await exchangeOwner.getAddress(),
        marketFeeCollector: await user2.getAddress(),
        baseTokenDecimals: 18,
        datatokenDecimals: 18,
        fixedRate: '1',
        marketFee: '0.001',
        allowedConsumer: ZERO_ADDRESS,
        withMint: true
      }

      dtParams.feeToken = addresses.MockUSDC
      dtParams.feeAmount = '987654321'

      const tx = await nftFactory.createNftWithDatatokenWithFixedRate(
        nftData,
        dtParams,
        freParams
      )
      const txReceipt = await tx.wait()
      const tokenCreatedEvent = getEventFromTx(txReceipt, 'TokenCreated')

      const datatokenAddress = tokenCreatedEvent.args.newTokenAddress

      const datatoken = new Datatoken(exchangeOwner)

      const publishingMarketFee = await datatoken.getPublishingMarketFee(datatokenAddress)
      assert(
        publishingMarketFee.publishMarketFeeAmount ===
          ethers.utils.parseUnits('987654321', 6).toString()
      )
    })
  })
})
