import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { Contract } from 'web3-eth-contract'
import BigNumber from 'bignumber.js'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import { deployContracts, Addresses } from '../../../TestContractHandler'
import { web3, getTestConfig } from '../../../config'
import {
  NftFactory,
  NftCreateData,
  FixedRateExchange,
  ZERO_ADDRESS,
  approve,
  transfer,
  balance,
  unitsToAmount,
  Config
} from '../../../../src'
import { FreCreationParams, DatatokenCreateParams } from '../../../../src/@types'

describe('Fixed Rate unit test', () => {
  let factoryOwner: string
  let exchangeOwner: string
  let user1: string
  let user2: string
  let exchangeId: string
  let contracts: Addresses
  let fixedRate: FixedRateExchange
  let dtAddress: string
  let dtContract: Contract
  let config: Config

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
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]
    exchangeOwner = accounts[0]

    nftData.owner = factoryOwner
    dtParams.minter = factoryOwner
    dtParams.paymentCollector = user2
    dtParams.mpFeeAddress = factoryOwner

    config = await getTestConfig(web3)
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)
  })

  describe('Test a Fixed Rate Exchange with DAI (18 Decimals)', () => {
    it('#create an exchange', async () => {
      // CREATE AN Exchange
      // we prepare transaction parameters objects

      const nftFactory = new NftFactory(contracts.nftFactoryAddress, web3)

      const freParams: FreCreationParams = {
        fixedRateAddress: contracts.fixedRateAddress,
        baseTokenAddress: contracts.daiAddress,
        owner: exchangeOwner,
        marketFeeCollector: user2,
        baseTokenDecimals: 18,
        datatokenDecimals: 18,
        fixedRate: '1',
        marketFee: '0.001',
        allowedConsumer: ZERO_ADDRESS,
        withMint: false
      }

      const txReceipt = await nftFactory.createNftWithDatatokenWithFixedRate(
        exchangeOwner,
        nftData,
        dtParams,
        freParams
      )

      dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      exchangeId = txReceipt.events.NewFixedRate.returnValues.exchangeId

      dtContract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress)
      // user1 has no dt1
      expect(await balance(web3, dtAddress, user1)).to.equal('0')

      fixedRate = new FixedRateExchange(contracts.fixedRateAddress, web3, 8996)
      assert(fixedRate != null)
    })

    it('#isActive - should return true if exchange is active', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
      expect(await fixedRate.isActive('0x00')).to.equal(false)
    })

    it('#getOwner - should get exchange owner given an id', async () => {
      expect(await fixedRate.getExchangeOwner(exchangeId)).to.equal(exchangeOwner)
    })

    it('#getRouter - should get Router address', async () => {
      expect(await fixedRate.getRouter()).to.equal(contracts.routerAddress)
    })

    it('#deactivate - should deactivate an exchange if exchangeOwner', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
      await fixedRate.deactivate(exchangeOwner, exchangeId)

      expect(await fixedRate.isActive(exchangeId)).to.equal(false)
    })

    it('#activate - should activate an exchange if exchangeOwner', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(false)
      await fixedRate.activate(exchangeOwner, exchangeId)
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
    })

    it('#activateMint - should activate Mint(allows fixed rate contract to mint dts if required), if exchangeOwner', async () => {
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(false)
      await fixedRate.activateMint(exchangeOwner, exchangeId)
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(true)
    })

    it('#dectivateMint - should deactivate Mint if exchangeOwner', async () => {
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(true)
      await fixedRate.deactivateMint(exchangeOwner, exchangeId)
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(false)
    })

    it('#generate exchangeId - should generate a specific exchangeId', async () => {
      expect(
        await fixedRate.generateExchangeId(contracts.daiAddress, dtAddress)
      ).to.equal(exchangeId)
    })

    it('#getNumberOfExchanges - should return total number of exchanges', async () => {
      assert((await fixedRate.getNumberOfExchanges()) >= 1)
    })

    it('#getExchanges - should return all exchanges ids', async () => {
      const exchangeIds = await fixedRate.getExchanges()
      assert(exchangeIds.includes(exchangeId))
    })

    it('#getRate - should return rate', async () => {
      expect(await fixedRate.getRate(exchangeId)).to.equal('1')
    })

    it('#setRate - set new rate if exchangeOwner', async () => {
      await fixedRate.setRate(exchangeOwner, exchangeId, '2')
      expect(await fixedRate.getRate(exchangeId)).to.equal('2')
      await fixedRate.setRate(exchangeOwner, exchangeId, '1')
      expect(await fixedRate.getRate(exchangeId)).to.equal('1')
    })

    it('#getDatatokenSupply - should get the dt supply in the exchange', async () => {
      // exchange owner hasn't approved any DT for sell
      expect(await fixedRate.getDatatokenSupply(exchangeId)).to.equal('0')
    })

    it('#getBasetokenSupply - should get the bt supply in the exchange', async () => {
      // no baseToken at the beginning
      expect(await fixedRate.getBasetokenSupply(exchangeId)).to.equal('0')
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
      await dtContract.methods
        .mint(exchangeOwner, web3.utils.toWei('1000'))
        .send({ from: exchangeOwner })
      await approve(
        web3,
        config,
        exchangeOwner,
        dtAddress,
        contracts.fixedRateAddress,
        '1000'
      )
      // user1 gets 100 DAI so he can buy DTs
      await transfer(web3, config, exchangeOwner, contracts.daiAddress, user1, '100')
      await approve(
        web3,
        config,
        user1,
        contracts.daiAddress,
        contracts.fixedRateAddress,
        '100'
      )

      // user1 has no dts but has 100 DAI
      expect(await balance(web3, dtAddress, user1)).to.equal('0')
      const daiBalanceBefore = new BigNumber(
        await balance(web3, contracts.daiAddress, user1)
      )

      // user1 buys 10 DT
      const tx = await fixedRate.buyDatatokens(user1, exchangeId, '10', '11')
      //  console.log(tx.events.Swapped.returnValues)
      assert(tx.events.Swapped != null)
      const args = tx.events.Swapped.returnValues
      expect(args.exchangeId).to.equal(exchangeId)
      expect(args.by).to.equal(user1)
      expect(args.datatokenSwappedAmount).to.equal(web3.utils.toWei('10'))
      expect(args.tokenOutAddress).to.equal(dtAddress)
      expect(await balance(web3, dtAddress, user1)).to.equal(
        await unitsToAmount(web3, dtAddress, args.datatokenSwappedAmount)
      )
      expect(
        daiBalanceBefore
          .minus(
            new BigNumber(
              await unitsToAmount(web3, contracts.daiAddress, args.baseTokenSwappedAmount)
            )
          )
          .toString()
      ).to.equal(await balance(web3, contracts.daiAddress, user1))
      // baseToken stays in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('10')
      // no dt in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('0')
    })

    it('#sellDatatokens - user1 should sell some dt', async () => {
      await approve(web3, config, user1, dtAddress, contracts.fixedRateAddress, '100')
      const daiBalanceBefore = new BigNumber(
        await balance(web3, contracts.daiAddress, user1)
      )
      const tx = await fixedRate.sellDatatokens(user1, exchangeId, '10', '9')
      // console.log(tx.events.Swapped.returnValues)
      assert(tx.events.Swapped != null)
      const args = tx.events.Swapped.returnValues
      expect(args.exchangeId).to.equal(exchangeId)
      expect(args.by).to.equal(user1)
      expect(args.datatokenSwappedAmount).to.equal(web3.utils.toWei('10'))
      expect(args.tokenOutAddress).to.equal(contracts.daiAddress)
      expect(await balance(web3, dtAddress, user1)).to.equal('0')
      expect(
        daiBalanceBefore
          .plus(
            new BigNumber(
              await unitsToAmount(web3, contracts.daiAddress, args.baseTokenSwappedAmount)
            )
          )
          .toString()
      ).to.equal(await balance(web3, contracts.daiAddress, user1))
      // DTs stay in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('10')
      // no BTs in the contract (except for the fees, but not accounted here)
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
      // DT supply is back at 1000 (exchange Owner allowance + dt balance in the fixed rate)
      expect(await fixedRate.getDatatokenSupply(exchangeId)).to.equal('1000')
    })

    it('#getExchange - should return exchange details', async () => {
      const result = await fixedRate.getExchange(exchangeId)
      expect(result.active).to.equal(true)
      expect(result.btDecimals).to.equal('18')
      expect(result.dtDecimals).to.equal('18')
      expect(result.baseToken).to.equal(contracts.daiAddress)
      expect(result.datatoken).to.equal(dtAddress)
      expect(result.exchangeOwner).to.equal(exchangeOwner)
      expect(result.withMint).to.equal(false)
      expect(result.dtBalance).to.equal('10') // balance in the fixedRate
      expect(result.btBalance).to.equal('0') // balance in the fixedRate
      expect(result.dtSupply).to.equal('1000') // total supply available (owner allowance + dtBalance)
      expect(result.btSupply).to.equal('0') // total supply available of baseToken in the contract
      expect(result.fixedRate).to.equal('1')
    })

    it('#getFeesInfo - should return exchange fee details', async () => {
      const result = await fixedRate.getFeesInfo(exchangeId)
      expect(result.marketFee).to.equal('0.001')
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for market and always in baseToken so it's 0.01 DAI
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for ocean community and always in baseToken so it's 0.01 DAI
      expect(result.marketFeeAvailable).to.equal('0.02') // formatted for baseToken decimals
      expect(result.oceanFeeAvailable).to.equal('0.04') // formatted for baseToken decimals
      expect(result.marketFeeCollector).to.equal(user2)
      expect(result.opcFee).to.equal('0.002')
    })

    it('#getAllowedSwapper- should return address(0) if not set, if exchangeOwner', async () => {
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ZERO_ADDRESS)
    })

    it('#setAllowedSwapper- should set an allowed swapper, if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeOwner, exchangeId, user1)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(user1)
    })

    it('#setAllowedSwapper- should disable allowed swapper(return address(0)), if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeOwner, exchangeId, ZERO_ADDRESS)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ZERO_ADDRESS)
    })

    it('#collectBasetokens- should collect BT in the contract, if exchangeOwner', async () => {
      // there are no bt in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
      // user1 buys 1 DT
      await fixedRate.buyDatatokens(user1, exchangeId, '1', '2')
      // 1 DAI in the contract
      const fixedRateDetails = await fixedRate.getExchange(exchangeId)
      expect(fixedRateDetails.btBalance).to.equal('1')
      // owner collects BTs
      await fixedRate.collectBasetokens(
        exchangeOwner,
        exchangeId,
        fixedRateDetails.btBalance
      )
      // btBalance is zero
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
    })

    it('#collectDatatokens- should collect DT in the contract, if exchangeOwner', async () => {
      const result = await fixedRate.getExchange(exchangeId)
      // 9 dts left
      expect(result.dtBalance).to.equal('9')
      // owner collects DTs
      await fixedRate.collectDatatokens(exchangeOwner, exchangeId, result.dtBalance)
      // no more dts in the contract
      const result2 = await fixedRate.getExchange(exchangeId)
      expect(result2.dtBalance).to.equal('0')
      // Only allowance left since dt is ZERO
      expect(result2.dtSupply).to.equal('990')
    })

    it('#collectMarketFee- should collect marketFee and send it to marketFeeCollector, anyone can call it', async () => {
      let result = await fixedRate.getFeesInfo(exchangeId)
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for market and always in baseToken so it's 0.01 DAI
      // plus another swap for 1 DT
      expect(result.marketFeeAvailable).to.equal('0.021') // formatted for baseToken decimals
      // same for ocean fee
      expect(result.oceanFeeAvailable).to.equal('0.042') // formatted for baseToken decimals
      expect(result.marketFeeCollector).to.equal(user2)

      const daiBalanceBeforeCollect = new BigNumber(
        await balance(web3, contracts.daiAddress, user2)
      )

      // user4 calls collectMarketFee
      await fixedRate.collectMarketFee(user2, exchangeId)
      result = await fixedRate.getFeesInfo(exchangeId)
      expect(result.marketFeeAvailable).to.equal('0')
      // ocean fee still available
      expect(result.oceanFeeAvailable).to.equal('0.042')
      // user2 is the marketFeeCollector
      expect(await balance(web3, contracts.daiAddress, user2)).to.equal(
        daiBalanceBeforeCollect.plus(new BigNumber('0.021')).toString()
      )
    })

    it('#updateMarketFee- should update Market fee if market fee collector', async () => {
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.001')
      // user2 is marketFeeCollector
      await fixedRate.updateMarketFee(user2, exchangeId, '0.01')

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.01')
    })

    it('#updateMarketFeeCollector - should update Market fee collector if market fee collector', async () => {
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(user2)

      await fixedRate.updateMarketFeeCollector(user2, exchangeId, user1)

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(user1)
    })
  })
  describe('Test a Fixed Rate Exchange with USDC (6 Decimals)', () => {
    it('#create an exchange', async () => {
      // CREATE AN Exchange
      // we prepare transaction parameters objects

      const nftFactory = new NftFactory(contracts.nftFactoryAddress, web3)

      const freParams: FreCreationParams = {
        fixedRateAddress: contracts.fixedRateAddress,
        baseTokenAddress: contracts.usdcAddress,
        owner: exchangeOwner,
        marketFeeCollector: user2,
        baseTokenDecimals: 6,
        datatokenDecimals: 18,
        fixedRate: '1',
        marketFee: '0.001',
        allowedConsumer: ZERO_ADDRESS,
        withMint: false
      }

      const txReceipt = await nftFactory.createNftWithDatatokenWithFixedRate(
        exchangeOwner,
        nftData,
        dtParams,
        freParams
      )

      dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      exchangeId = txReceipt.events.NewFixedRate.returnValues.exchangeId

      dtContract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress)
      // user1 has no dt1
      expect(await balance(web3, dtAddress, user1)).to.equal('0')

      fixedRate = new FixedRateExchange(contracts.fixedRateAddress, web3, 8996)
      assert(fixedRate != null)
    })

    it('#isActive - should return true if exchange is active', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
      expect(await fixedRate.isActive('0x00')).to.equal(false)
    })

    it('#getOwner - should get exchange owner given an id', async () => {
      expect(await fixedRate.getExchangeOwner(exchangeId)).to.equal(exchangeOwner)
    })

    it('#getRouter - should get Router address', async () => {
      expect(await fixedRate.getRouter()).to.equal(contracts.routerAddress)
    })

    it('#deactivate - should deactivate an exchange if exchangeOwner', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
      await fixedRate.deactivate(exchangeOwner, exchangeId)

      expect(await fixedRate.isActive(exchangeId)).to.equal(false)
    })

    it('#activate - should activate an exchange if exchangeOwner', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(false)
      await fixedRate.activate(exchangeOwner, exchangeId)
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
    })

    it('#activateMint - should activate Mint(allows fixed rate contract to mint dts if required), if exchangeOwner', async () => {
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(false)
      await fixedRate.activateMint(exchangeOwner, exchangeId)
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(true)
    })

    it('#dectivateMint - should deactivate Mint if exchangeOwner', async () => {
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(true)
      await fixedRate.deactivateMint(exchangeOwner, exchangeId)
      expect((await fixedRate.getExchange(exchangeId)).withMint).to.equal(false)
    })

    it('#generate exchangeId - should generate a specific exchangeId', async () => {
      expect(
        await fixedRate.generateExchangeId(contracts.usdcAddress, dtAddress)
      ).to.equal(exchangeId)
    })

    it('#getExchanges - should return all exchanges ids', async () => {
      const exchangeIds = await fixedRate.getExchanges()
      assert(exchangeIds.includes(exchangeId))
    })

    it('#getRate - should return rate', async () => {
      expect(await fixedRate.getRate(exchangeId)).to.equal('1')
    })

    it('#setRate - set new rate if exchangeOwner', async () => {
      await fixedRate.setRate(exchangeOwner, exchangeId, '2')
      expect(await fixedRate.getRate(exchangeId)).to.equal('2')
      await fixedRate.setRate(exchangeOwner, exchangeId, '1')
      expect(await fixedRate.getRate(exchangeId)).to.equal('1')
    })

    it('#getDatatokenSupply - should get the dt supply in the exchange', async () => {
      // exchange owner hasn't approved any DT for sell
      expect(await fixedRate.getDatatokenSupply(exchangeId)).to.equal('0')
    })

    it('#getBasetokenSupply - should get the bt supply in the exchange', async () => {
      // no baseToken at the beginning
      expect(await fixedRate.getBasetokenSupply(exchangeId)).to.equal('0')
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
      await dtContract.methods
        .mint(exchangeOwner, web3.utils.toWei('1000'))
        .send({ from: exchangeOwner })
      await approve(
        web3,
        config,
        exchangeOwner,
        dtAddress,
        contracts.fixedRateAddress,
        '1000'
      )
      // user1 gets 100 USDC so he can buy DTs
      await transfer(web3, config, exchangeOwner, contracts.usdcAddress, user1, '100')
      await approve(
        web3,
        config,
        user1,
        contracts.usdcAddress,
        contracts.fixedRateAddress,
        '100'
      )

      // user1 has no dts but has 100 USDC
      expect(await balance(web3, dtAddress, user1)).to.equal('0')
      const usdcBalanceBefore = new BigNumber(
        await balance(web3, contracts.usdcAddress, user1)
      )

      // user1 buys 10 DT
      const tx = await fixedRate.buyDatatokens(user1, exchangeId, '10', '11')
      //  console.log(tx.events.Swapped.returnValues)
      assert(tx.events.Swapped != null)
      const args = tx.events.Swapped.returnValues
      expect(args.exchangeId).to.equal(exchangeId)
      expect(args.by).to.equal(user1)
      expect(args.datatokenSwappedAmount).to.equal(web3.utils.toWei('10'))
      expect(args.tokenOutAddress).to.equal(dtAddress)
      expect(await balance(web3, dtAddress, user1)).to.equal(
        await unitsToAmount(web3, dtAddress, args.datatokenSwappedAmount)
      )
      expect(
        usdcBalanceBefore
          .minus(
            new BigNumber(
              await unitsToAmount(
                web3,
                contracts.usdcAddress,
                args.baseTokenSwappedAmount
              )
            )
          )
          .toString()
      ).to.equal(await balance(web3, contracts.usdcAddress, user1))
      // baseToken stays in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('10')
      // no dt in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('0')
    })

    it('#sellDatatokens - user1 should sell some dt', async () => {
      await approve(web3, config, user1, dtAddress, contracts.fixedRateAddress, '10')
      const usdcBalanceBefore = new BigNumber(
        await balance(web3, contracts.usdcAddress, user1)
      )
      const tx = await fixedRate.sellDatatokens(user1, exchangeId, '10', '9')
      // console.log(tx.events.Swapped.returnValues)
      assert(tx.events.Swapped != null)
      const args = tx.events.Swapped.returnValues
      expect(args.exchangeId).to.equal(exchangeId)
      expect(args.by).to.equal(user1)
      expect(args.datatokenSwappedAmount).to.equal(web3.utils.toWei('10'))
      expect(args.tokenOutAddress).to.equal(contracts.usdcAddress)
      expect(await balance(web3, dtAddress, user1)).to.equal('0')
      expect(
        usdcBalanceBefore
          .plus(
            new BigNumber(
              await unitsToAmount(
                web3,
                contracts.usdcAddress,
                args.baseTokenSwappedAmount
              )
            )
          )
          .toString()
      ).to.equal(await balance(web3, contracts.usdcAddress, user1))
      // DTs stay in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('10')
      // no BTs in the contract (except for the fees, but not accounted here)
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
      // DT supply is back at 1000 (exchange Owner allowance + dt balance in the fixed rate)
      expect(await fixedRate.getDatatokenSupply(exchangeId)).to.equal('1000')
    })

    it('#getExchange - should return exchange details', async () => {
      const result = await fixedRate.getExchange(exchangeId)
      expect(result.active).to.equal(true)
      expect(result.btDecimals).to.equal('6')
      expect(result.dtDecimals).to.equal('18')
      expect(result.baseToken).to.equal(contracts.usdcAddress)
      expect(result.datatoken).to.equal(dtAddress)
      expect(result.exchangeOwner).to.equal(exchangeOwner)
      expect(result.withMint).to.equal(false)
      expect(result.dtBalance).to.equal('10') // balance in the fixedRate
      expect(result.btBalance).to.equal('0') // balance in the fixedRate
      expect(result.dtSupply).to.equal('1000') // total supply available (owner allowance + dtBalance)
      expect(result.btSupply).to.equal('0') // total supply available of baseToken in the contract
      expect(result.fixedRate).to.equal('1')
    })

    it('#getFeesInfo - should return exchange fee details', async () => {
      const result = await fixedRate.getFeesInfo(exchangeId)
      expect(result.marketFee).to.equal('0.001')
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for market and always in baseToken so it's 0.01 USDC
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for ocean community and always in baseToken so it's 0.01 USDC
      expect(result.marketFeeAvailable).to.equal('0.02') // formatted for baseToken decimals
      expect(result.oceanFeeAvailable).to.equal('0.04') // formatted for baseToken decimals
      expect(result.marketFeeCollector).to.equal(user2)
      expect(result.opcFee).to.equal('0.002')
    })

    it('#getAllowedSwapper- should return address(0) if not set, if exchangeOwner', async () => {
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ZERO_ADDRESS)
    })

    it('#setAllowedSwapper- should set an allowed swapper, if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeOwner, exchangeId, user1)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(user1)
    })

    it('#setAllowedSwapper- should disable allowed swapper(return address(0)), if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeOwner, exchangeId, ZERO_ADDRESS)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ZERO_ADDRESS)
    })

    it('#collectBasetokens- should collect BT in the contract, if exchangeOwner', async () => {
      // there are no bt in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
      // user1 buys 1 DT
      await fixedRate.buyDatatokens(user1, exchangeId, '1', '2')
      // 1 DAI in the contract
      const exchangeDetails = await fixedRate.getExchange(exchangeId)
      expect(exchangeDetails.btBalance).to.equal('1')
      // owner collects BTs
      await fixedRate.collectBasetokens(
        exchangeOwner,
        exchangeId,
        exchangeDetails.btBalance
      )
      // btBalance is zero
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
    })

    it('#collectDatatokens- should collect DT in the contract, if exchangeOwner', async () => {
      const result = await fixedRate.getExchange(exchangeId)
      // 9 dts left
      expect(result.dtBalance).to.equal('9')
      // owner collects DTs
      await fixedRate.collectDatatokens(exchangeOwner, exchangeId, result.dtBalance)
      // no more dts in the contract
      const result2 = await fixedRate.getExchange(exchangeId)
      expect(result2.dtBalance).to.equal('0')
      // Only allowance left since dt is ZERO
      expect(result2.dtSupply).to.equal('990')
    })

    it('#updateMarketFee- should update Market fee if market fee collector', async () => {
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.001')
      // user2 is marketFeeCollector
      await fixedRate.updateMarketFee(user2, exchangeId, '0.01')

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.01')
    })

    it('#updateMarketFeeCollector - should update Market fee collector if market fee collector', async () => {
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(user2)

      await fixedRate.updateMarketFeeCollector(user2, exchangeId, user1)

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(user1)
    })
  })
})
