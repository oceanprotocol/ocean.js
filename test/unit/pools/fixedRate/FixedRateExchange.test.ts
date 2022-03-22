import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { Contract } from 'web3-eth-contract'
import BN from 'bn.js'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { deployContracts, Addresses } from '../../../TestContractHandler'
import { web3 } from '../../../config'
import { NftFactory, NftCreateData, FixedRateExchange } from '../../../../src'
import { FreCreationParams, Erc20CreateParams } from '../../../../src/@types'

describe('Fixed Rate unit test', () => {
  let factoryOwner: string
  let nftOwner: string
  let exchangeOwner: string
  let user1: string
  let user2: string
  let user3: string
  let user4: string
  let initialBlock: number
  let fixedRateAddress: string
  let daiAddress: string
  let usdcAddress: string
  let exchangeId: string
  let contracts: Addresses
  let fixedRate: FixedRateExchange
  let dtAddress: string
  let dtAddress2: string
  let dtContract: Contract
  let daiContract: Contract
  let usdcContract: Contract
  const vestedBlocks = 2500000
  const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    nftOwner = accounts[1]
    user1 = accounts[2]
    user2 = accounts[3]
    user3 = accounts[4]
    user4 = accounts[5]
    exchangeOwner = accounts[0]
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)

    // initialize fixed rate
    //

    daiContract = new web3.eth.Contract(MockERC20.abi as AbiItem[], contracts.daiAddress)

    usdcContract = new web3.eth.Contract(
      MockERC20.abi as AbiItem[],
      contracts.usdcAddress
    )
  })

  describe('Test a Fixed Rate Exchange with DAI (18 Decimals)', () => {
    it('#create an exchange', async () => {
      // CREATE AN Exchange
      // we prepare transaction parameters objects

      const nftFactory = new NftFactory(contracts.erc721FactoryAddress, web3)

      const nftData: NftCreateData = {
        name: '72120Bundle',
        symbol: '72Bundle',
        templateIndex: 1,
        tokenURI: 'https://oceanprotocol.com/nft/'
      }

      const ercParams: Erc20CreateParams = {
        templateIndex: 1,
        minter: factoryOwner,
        feeManager: user3,
        mpFeeAddress: factoryOwner,
        feeToken: ADDRESS_ZERO,
        cap: '1000000',
        feeAmount: '0',
        name: 'ERC20B1',
        symbol: 'ERC20DT1Symbol'
      }

      const freParams: FreCreationParams = {
        fixedRateAddress: contracts.fixedRateAddress,
        baseTokenAddress: contracts.daiAddress,
        owner: exchangeOwner,
        marketFeeCollector: user3,
        baseTokenDecimals: 18,
        datatokenDecimals: 18,
        fixedRate: '1',
        marketFee: '0.001',
        allowedConsumer: ADDRESS_ZERO,
        withMint: false
      }

      const txReceipt = await nftFactory.createNftErc20WithFixedRate(
        exchangeOwner,
        nftData,
        ercParams,
        freParams
      )

      initialBlock = await web3.eth.getBlockNumber()
      dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      exchangeId = txReceipt.events.NewFixedRate.returnValues.exchangeId

      dtContract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress)
      // user2 has no dt1
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')

      fixedRateAddress = contracts.fixedRateAddress
      fixedRate = new FixedRateExchange(
        web3,
        fixedRateAddress,
        FixedRate.abi as AbiItem[],
        contracts.oceanAddress
      )
      assert(fixedRate != null)
    })

    it('#isActive - should return true if exchange is active', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
      expect(await fixedRate.isActive('0x00')).to.equal(false)
    })
    it('#getOwner - should get exchange owner given an id', async () => {
      expect(await fixedRate.getExchangeOwner(exchangeId)).to.equal(exchangeOwner)
    })
    it('#getOPFCollector - should get OPF collector', async () => {
      expect(await fixedRate.getOPCCollector()).to.equal(
        contracts.opfCommunityFeeCollectorAddress
      )
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

    it('#getDTSupply - should get the dt supply in the exchange', async () => {
      // exchange owner hasn't approved any DT for sell
      expect(await fixedRate.getDTSupply(exchangeId)).to.equal('0')
    })
    it('#getBTSupply - should get the bt supply in the exchange', async () => {
      // no baseToken at the beginning
      expect(await fixedRate.getBTSupply(exchangeId)).to.equal('0')
    })
    it('#calcBaseInGivenOutDT - should get bt amount in for a specific dt amount', async () => {
      // 100.2 DAI for 100 DT (0.1% market fee and 0.1% ocean fee)
      expect(
        await (
          await fixedRate.calcBaseInGivenOutDT(exchangeId, '100')
        ).baseTokenAmount
      ).to.equal('100.3')
    })
    it('#getAmountBTOut - should get bt amount out for a specific dt amount', async () => {
      // 99.8 DAI for 100 DT (0.1% market fee and 0.1% ocean fee)
      expect(await fixedRate.getAmountBTOut(exchangeId, '100')).to.equal('99.7')
    })

    it('#buyDT - user2 should buy some dt', async () => {
      // total supply is ZERO right now so dt owner mints 1000 DT and approves the fixed rate contract
      await dtContract.methods
        .mint(exchangeOwner, web3.utils.toWei('1000'))
        .send({ from: exchangeOwner })
      await dtContract.methods
        .approve(fixedRateAddress, web3.utils.toWei('1000'))
        .send({ from: exchangeOwner })
      // user2 gets 100 DAI so he can buy DTs
      await daiContract.methods
        .transfer(user2, web3.utils.toWei('100'))
        .send({ from: exchangeOwner })
      await daiContract.methods
        .approve(fixedRateAddress, web3.utils.toWei('100'))
        .send({ from: user2 })

      // user2 has no dts but has 100 DAI
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')
      const daiBalanceBefore = new BN(await daiContract.methods.balanceOf(user2).call())

      // user2 buys 10 DT
      const tx = await fixedRate.buyDT(user2, exchangeId, '10', '11')
      //  console.log(tx.events.Swapped.returnValues)
      assert(tx.events.Swapped != null)
      const args = tx.events.Swapped.returnValues
      expect(args.exchangeId).to.equal(exchangeId)
      expect(args.by).to.equal(user2)
      expect(args.datatokenSwappedAmount).to.equal(web3.utils.toWei('10'))
      expect(args.tokenOutAddress).to.equal(dtAddress)
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal(
        args.datatokenSwappedAmount
      )
      expect(
        daiBalanceBefore.sub(new BN(args.baseTokenSwappedAmount)).toString()
      ).to.equal(await daiContract.methods.balanceOf(user2).call())
      // baseToken stays in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('10')
      // no dt in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('0')
    })

    it('#sellDT - user2 should sell some dt', async () => {
      await dtContract.methods
        .approve(fixedRateAddress, web3.utils.toWei('10'))
        .send({ from: user2 })
      const daiBalanceBefore = new BN(await daiContract.methods.balanceOf(user2).call())
      const tx = await fixedRate.sellDT(user2, exchangeId, '10', '9')
      // console.log(tx.events.Swapped.returnValues)
      assert(tx.events.Swapped != null)
      const args = tx.events.Swapped.returnValues
      expect(args.exchangeId).to.equal(exchangeId)
      expect(args.by).to.equal(user2)
      expect(args.datatokenSwappedAmount).to.equal(web3.utils.toWei('10'))
      expect(args.tokenOutAddress).to.equal(contracts.daiAddress)
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')
      expect(
        daiBalanceBefore.add(new BN(args.baseTokenSwappedAmount)).toString()
      ).to.equal(await daiContract.methods.balanceOf(user2).call())
      // DTs stay in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('10')
      // no BTs in the contract (except for the fees, but not accounted here)
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
      // DT supply is back at 1000 (exchange Owner allowance + dt balance in the fixed rate)
      expect(await fixedRate.getDTSupply(exchangeId)).to.equal('1000')
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
      expect(result.marketFeeCollector).to.equal(user3)
      expect(result.opcFee).to.equal('0.002')
    })

    it('#getAllowedSwapper- should return address(0) if not set, if exchangeOwner', async () => {
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ADDRESS_ZERO)
    })
    it('#setAllowedSwapper- should set an allowed swapper, if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeOwner, exchangeId, user2)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(user2)
    })
    it('#setAllowedSwapper- should disable allowed swapper(return address(0)), if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeOwner, exchangeId, ADDRESS_ZERO)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ADDRESS_ZERO)
    })
    it('#collectBT- should collect BT in the contract, if exchangeOwner', async () => {
      // there are no bt in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
      // user2 buys 1 DT
      await fixedRate.buyDT(user2, exchangeId, '1', '2')
      // 1 DAI in the contract
      const fixedRateDetails = await fixedRate.getExchange(exchangeId)
      expect(fixedRateDetails.btBalance).to.equal('1')
      // owner collects BTs
      await fixedRate.collectBT(exchangeOwner, exchangeId, fixedRateDetails.btBalance)
      // btBalance is zero
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
    })
    it('#collectDT- should collect DT in the contract, if exchangeOwner', async () => {
      const result = await fixedRate.getExchange(exchangeId)
      // 9 dts left
      expect(result.dtBalance).to.equal('9')
      // owner collects DTs
      await fixedRate.collectDT(exchangeOwner, exchangeId, result.dtBalance)
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
      expect(result.marketFeeCollector).to.equal(user3)

      // user4 calls collectMarketFee
      await fixedRate.collectMarketFee(user4, exchangeId)
      result = await fixedRate.getFeesInfo(exchangeId)
      expect(result.marketFeeAvailable).to.equal('0')
      // ocean fee still available
      expect(result.oceanFeeAvailable).to.equal('0.042')
      // user3 is the marketFeeCollector
      expect(await daiContract.methods.balanceOf(user3).call()).to.equal(
        web3.utils.toWei('1.021')
      )
    })

    it('#updateMarketFee- should update Market fee if market fee collector', async () => {
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.001')
      // user3 is marketFeeCollector
      await fixedRate.updateMarketFee(user3, exchangeId, '0.01')

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.01')
    })

    it('#updateMarketFeeCollector - should update Market fee collector if market fee collector', async () => {
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(user3)

      await fixedRate.updateMarketFeeCollector(user3, exchangeId, user2)

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(user2)
    })
  })
  describe('Test a Fixed Rate Exchange with USDC (6 Decimals)', () => {
    it('#create an exchange', async () => {
      // CREATE AN Exchange
      // we prepare transaction parameters objects

      const nftFactory = new NftFactory(contracts.erc721FactoryAddress, web3)

      const nftData: NftCreateData = {
        name: '72120Bundle',
        symbol: '72Bundle',
        templateIndex: 1,
        tokenURI: 'https://oceanprotocol.com/nft/'
      }

      const ercParams: Erc20CreateParams = {
        templateIndex: 1,
        minter: factoryOwner,
        feeManager: user3,
        mpFeeAddress: factoryOwner,
        feeToken: ADDRESS_ZERO,
        cap: '1000000',
        feeAmount: '0',
        name: 'ERC20B1',
        symbol: 'ERC20DT1Symbol'
      }

      const freParams: FreCreationParams = {
        fixedRateAddress: contracts.fixedRateAddress,
        baseTokenAddress: contracts.usdcAddress,
        owner: exchangeOwner,
        marketFeeCollector: user3,
        baseTokenDecimals: 6,
        datatokenDecimals: 18,
        fixedRate: '1',
        marketFee: '0.001',
        allowedConsumer: ADDRESS_ZERO,
        withMint: false
      }

      const txReceipt = await nftFactory.createNftErc20WithFixedRate(
        exchangeOwner,
        nftData,
        ercParams,
        freParams
      )

      initialBlock = await web3.eth.getBlockNumber()
      dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      exchangeId = txReceipt.events.NewFixedRate.returnValues.exchangeId

      dtContract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress)
      // user2 has no dt1
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')

      fixedRateAddress = contracts.fixedRateAddress
      fixedRate = new FixedRateExchange(
        web3,
        fixedRateAddress,
        FixedRate.abi as AbiItem[],
        contracts.oceanAddress
      )
      assert(fixedRate != null)
    })

    it('#isActive - should return true if exchange is active', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(true)
      expect(await fixedRate.isActive('0x00')).to.equal(false)
    })
    it('#getOwner - should get exchange owner given an id', async () => {
      expect(await fixedRate.getExchangeOwner(exchangeId)).to.equal(exchangeOwner)
    })
    it('#getOPFCollector - should get OPF collector', async () => {
      expect(await fixedRate.getOPCCollector()).to.equal(
        contracts.opfCommunityFeeCollectorAddress
      )
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

    it('#getDTSupply - should get the dt supply in the exchange', async () => {
      // exchange owner hasn't approved any DT for sell
      expect(await fixedRate.getDTSupply(exchangeId)).to.equal('0')
    })
    it('#getBTSupply - should get the bt supply in the exchange', async () => {
      // no baseToken at the beginning
      expect(await fixedRate.getBTSupply(exchangeId)).to.equal('0')
    })
    it('#calcBaseInGivenOutDT - should get bt amount in for a specific dt amount', async () => {
      // 100.2 USDC for 100 DT (0.1% market fee and 0.1% ocean fee)
      expect(
        await (
          await fixedRate.calcBaseInGivenOutDT(exchangeId, '100')
        ).baseTokenAmount
      ).to.equal('100.3')
    })
    it('#getAmountBTOut - should get bt amount out for a specific dt amount', async () => {
      // 99.8 USDC for 100 DT (0.1% market fee and 0.1% ocean fee)
      expect(await fixedRate.getAmountBTOut(exchangeId, '100')).to.equal('99.7')
    })

    it('#buyDT - user2 should buy some dt', async () => {
      // total supply is ZERO right now so dt owner mints 1000 DT and approves the fixed rate contract
      await dtContract.methods
        .mint(exchangeOwner, web3.utils.toWei('1000'))
        .send({ from: exchangeOwner })
      await dtContract.methods
        .approve(fixedRateAddress, web3.utils.toWei('1000'))
        .send({ from: exchangeOwner })
      // user2 gets 100 USDC so he can buy DTs
      await usdcContract.methods.transfer(user2, 100 * 1e6).send({ from: exchangeOwner })
      await usdcContract.methods
        .approve(fixedRateAddress, 100 * 1e6)
        .send({ from: user2 })

      // user2 has no dts but has 100 USDC
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')
      const usdcBalanceBefore = new BN(await usdcContract.methods.balanceOf(user2).call())

      // user2 buys 10 DT
      const tx = await fixedRate.buyDT(user2, exchangeId, '10', '11')
      //  console.log(tx.events.Swapped.returnValues)
      assert(tx.events.Swapped != null)
      const args = tx.events.Swapped.returnValues
      expect(args.exchangeId).to.equal(exchangeId)
      expect(args.by).to.equal(user2)
      expect(args.datatokenSwappedAmount).to.equal(web3.utils.toWei('10'))
      expect(args.tokenOutAddress).to.equal(dtAddress)
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal(
        args.datatokenSwappedAmount
      )
      expect(
        usdcBalanceBefore.sub(new BN(args.baseTokenSwappedAmount)).toString()
      ).to.equal(await usdcContract.methods.balanceOf(user2).call())
      // baseToken stays in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('10')
      // no dt in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('0')
    })

    it('#sellDT - user2 should sell some dt', async () => {
      await dtContract.methods
        .approve(fixedRateAddress, web3.utils.toWei('10'))
        .send({ from: user2 })
      const usdcBalanceBefore = new BN(await usdcContract.methods.balanceOf(user2).call())
      const tx = await fixedRate.sellDT(user2, exchangeId, '10', '9')
      // console.log(tx.events.Swapped.returnValues)
      assert(tx.events.Swapped != null)
      const args = tx.events.Swapped.returnValues
      expect(args.exchangeId).to.equal(exchangeId)
      expect(args.by).to.equal(user2)
      expect(args.datatokenSwappedAmount).to.equal(web3.utils.toWei('10'))
      expect(args.tokenOutAddress).to.equal(contracts.usdcAddress)
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')
      expect(
        usdcBalanceBefore.add(new BN(args.baseTokenSwappedAmount)).toString()
      ).to.equal(await usdcContract.methods.balanceOf(user2).call())
      // DTs stay in the contract
      expect((await fixedRate.getExchange(exchangeId)).dtBalance).to.equal('10')
      // no BTs in the contract (except for the fees, but not accounted here)
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
      // DT supply is back at 1000 (exchange Owner allowance + dt balance in the fixed rate)
      expect(await fixedRate.getDTSupply(exchangeId)).to.equal('1000')
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
      expect(result.marketFeeCollector).to.equal(user3)
      expect(result.opcFee).to.equal('0.002')
    })

    it('#getAllowedSwapper- should return address(0) if not set, if exchangeOwner', async () => {
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ADDRESS_ZERO)
    })
    it('#setAllowedSwapper- should set an allowed swapper, if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeOwner, exchangeId, user2)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(user2)
    })
    it('#setAllowedSwapper- should disable allowed swapper(return address(0)), if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeOwner, exchangeId, ADDRESS_ZERO)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ADDRESS_ZERO)
    })
    it('#collectBT- should collect BT in the contract, if exchangeOwner', async () => {
      // there are no bt in the contract
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
      // user2 buys 1 DT
      await fixedRate.buyDT(user2, exchangeId, '1', '2')
      // 1 DAI in the contract
      const exchangeDetails = await fixedRate.getExchange(exchangeId)
      expect(exchangeDetails.btBalance).to.equal('1')
      // owner collects BTs
      await fixedRate.collectBT(exchangeOwner, exchangeId, exchangeDetails.btBalance)
      // btBalance is zero
      expect((await fixedRate.getExchange(exchangeId)).btBalance).to.equal('0')
    })
    it('#collectDT- should collect DT in the contract, if exchangeOwner', async () => {
      const result = await fixedRate.getExchange(exchangeId)
      // 9 dts left
      expect(result.dtBalance).to.equal('9')
      // owner collects DTs
      await fixedRate.collectDT(exchangeOwner, exchangeId, result.dtBalance)
      // no more dts in the contract
      const result2 = await fixedRate.getExchange(exchangeId)
      expect(result2.dtBalance).to.equal('0')
      // Only allowance left since dt is ZERO
      expect(result2.dtSupply).to.equal('990')
    })

    it('#updateMarketFee- should update Market fee if market fee collector', async () => {
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.001')
      // user3 is marketFeeCollector
      await fixedRate.updateMarketFee(user3, exchangeId, '0.01')

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFee).to.equal('0.01')
    })

    it('#updateMarketFeeCollector - should update Market fee collector if market fee collector', async () => {
      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(user3)

      await fixedRate.updateMarketFeeCollector(user3, exchangeId, user2)

      expect((await fixedRate.getFeesInfo(exchangeId)).marketFeeCollector).to.equal(user2)
    })
  })
})
