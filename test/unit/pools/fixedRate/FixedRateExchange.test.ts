import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../../TestContractHandler'
import { Contract } from 'web3-eth-contract'
import Web3 from 'web3'
import BigNumber from 'bignumber.js'
import BN from 'bn.js'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SSContract from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import FactoryRouter from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import OPFCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import { LoggerInstance } from '../../../../src/utils'
import { NFTFactory } from '../../../../src/factories/NFTFactory'
import { Pool } from '../../../../src/pools/balancer/Pool'
import { FixedRateExchange } from '../../../../src/pools/fixedRate/FixedRateExchange'
import { BADFAMILY } from 'dns'
const { keccak256 } = require('@ethersproject/keccak256')
const web3 = new Web3('http://127.0.0.1:8545')
const communityCollector = '0xeE9300b7961e0a01d9f0adb863C7A227A07AaD75'

describe('Fixed Rate unit test', () => {
  let factoryOwner: string
  let nftOwner: string
  let exchangeOwner: string
  let user1: string
  let user2: string
  let user3: string
  let initialBlock: number
  let fixedRateAddress: string
  let daiAddress: string
  let usdcAddress: string
  let exchangeId: string
  let contracts: TestContractHandler
  let fixedRate: FixedRateExchange
  let dtAddress: string
  let dtAddress2: string
  let dtContract: Contract
  let daiContract: Contract
  let usdcContract: Contract
  const vestedBlocks = 2500000
  const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
  it('should deploy contracts', async () => {
    contracts = new TestContractHandler(
      web3,
      ERC721Template.abi as AbiItem[],
      ERC20Template.abi as AbiItem[],
      PoolTemplate.abi as AbiItem[],
      ERC721Factory.abi as AbiItem[],
      FactoryRouter.abi as AbiItem[],
      SSContract.abi as AbiItem[],
      FixedRate.abi as AbiItem[],
      Dispenser.abi as AbiItem[],
      OPFCollector.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      FactoryRouter.bytecode,
      SSContract.bytecode,
      FixedRate.bytecode,
      Dispenser.bytecode,
      OPFCollector.bytecode
    )
    await contracts.getAccounts()
    factoryOwner = contracts.accounts[0]
    nftOwner = contracts.accounts[1]
    user1 = contracts.accounts[2]
    user2 = contracts.accounts[3]
    user3 = contracts.accounts[4]
    exchangeOwner = contracts.accounts[0]

    await contracts.deployContracts(factoryOwner, FactoryRouter.abi as AbiItem[])

    // initialize fixed rate
    //

    daiContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.daiAddress
    )

    usdcContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.usdcAddress
    )

    console.log(
      await usdcContract.methods.decimals().call(),
      'USDC DECIMALS IN THIS TEST'
    )
  })

  describe('Test a Fixed Rate Exchange with DAI (18 Decimals)', () => {
    it('#create an exchange', async () => {
      // CREATE AN Exchange
      // we prepare transaction parameters objects
      const nftData = {
        name: '72120Bundle',
        symbol: '72Bundle',
        templateIndex: 1,
        baseURI: 'https://oceanprotocol.com/nft/'
      }
      const ercData = {
        templateIndex: 1,
        strings: ['ERC20B1', 'ERC20DT1Symbol'],
        addresses: [contracts.accounts[0], user3, contracts.accounts[0], ADDRESS_ZERO],
        uints: [web3.utils.toWei('1000000'), 0],
        bytess: []
      }

      // [baseToken,owner,marketFeeCollector,allowedSwapper]
      const fixedRateData = {
        fixedPriceAddress: contracts.fixedRateAddress,
        addresses: [contracts.daiAddress, exchangeOwner, user3, ADDRESS_ZERO],
        uints: [18, 18, web3.utils.toWei('1'), 1e15, 0]
      }

      const nftFactory = new NFTFactory(contracts.factory721Address, web3, LoggerInstance)

      const txReceipt = await nftFactory.createNftErcWithFixedRate(
        exchangeOwner,
        nftData,
        ercData,
        fixedRateData
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
        LoggerInstance,
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
        await fixedRate.generateExchangeId(contracts.daiAddress, dtAddress, exchangeOwner)
      ).to.equal(exchangeId)
    })

    it('#getNumberOfExchanges - should return total number of exchanges', async () => {
      expect(await fixedRate.getNumberOfExchanges()).to.equal('1')
    })

    it('#getExchanges - should return all exchanges ids', async () => {
      const exchangeIds = await fixedRate.getExchanges()
      expect(exchangeIds[0]).to.equal(exchangeId)
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
      expect(await fixedRate.getDTSupply(exchangeId)).to.equal('0')
    })
    it('#getBTSupply - should get the bt supply in the exchange', async () => {
      expect(await fixedRate.getBTSupply(exchangeId)).to.equal('0')
    })
    it('#getBTNeeded - should get bt amount for a specific dt amount', async () => {
      console.log(await fixedRate.getAmountBTIn(exchangeId, '100'))
    })
    it('#getBTNeeded - should get bt amount for a specific dt amount', async () => {
      console.log(await fixedRate.getAmountBTOut(exchangeId, '100'))
    })

    it('#buyDT - user2 should buy some dt', async () => {
      await dtContract.methods
        .mint(exchangeOwner, web3.utils.toWei('1000'))
        .send({ from: exchangeOwner })
      await dtContract.methods
        .approve(fixedRateAddress, web3.utils.toWei('1000'))
        .send({ from: exchangeOwner })
      await daiContract.methods
        .transfer(user2, web3.utils.toWei('100'))
        .send({ from: exchangeOwner })
      await daiContract.methods
        .approve(fixedRateAddress, web3.utils.toWei('100'))
        .send({ from: user2 })
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')
      const daiBalanceBefore = new BN(await daiContract.methods.balanceOf(user2).call())
      expect(daiBalanceBefore.toString()).to.equal(web3.utils.toWei('100'))
      const tx = await fixedRate.buyDT(user2, exchangeId, '10', '11')
      //  console.log(tx.events.Swapped.returnValues)
      assert(tx.events.Swapped != null)
      const args = tx.events.Swapped.returnValues
      expect(args.exchangeId).to.equal(exchangeId)
      expect(args.by).to.equal(user2)
      expect(args.dataTokenSwappedAmount).to.equal(web3.utils.toWei('10'))
      expect(args.tokenOutAddress).to.equal(dtAddress)
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal(
        args.dataTokenSwappedAmount
      )
      expect(
        daiBalanceBefore.sub(new BN(args.baseTokenSwappedAmount)).toString()
      ).to.equal(await daiContract.methods.balanceOf(user2).call())
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
      expect(args.dataTokenSwappedAmount).to.equal(web3.utils.toWei('10'))
      expect(args.tokenOutAddress).to.equal(contracts.daiAddress)
      expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')
      expect(
        daiBalanceBefore.add(new BN(args.baseTokenSwappedAmount)).toString()
      ).to.equal(await daiContract.methods.balanceOf(user2).call())
    })

    it('#getExchange - should return exchange details', async () => {
      const result = await fixedRate.getExchange(exchangeId)
      expect(result.active).to.equal(true)
      expect(result.btDecimals).to.equal('18')
      expect(result.dtDecimals).to.equal('18')
      expect(result.baseToken).to.equal(contracts.daiAddress)
      expect(result.dataToken).to.equal(dtAddress)
      expect(result.exchangeOwner).to.equal(exchangeOwner)
      expect(result.withMint).to.equal(false)
      expect(result.dtBalance).to.equal('10')
      expect(result.btBalance).to.equal('0')
      expect(result.dtSupply).to.equal('1000')
      expect(result.btSupply).to.equal('0')
      expect(result.fixedRate).to.equal('1')
    })

    it('#getFeesInfo - should return exchange fee details', async () => {
      const result = await fixedRate.getFeesInfo(exchangeId)
      expect(result.marketFee).to.equal('0.001')
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for market and always in basetoken so it's 0.01 DAI
      // we made 2 swaps for 10 DT at rate 1, the fee is 0.1% for ocean community and always in basetoken so it's 0.01 DAI
      expect(result.marketFeeAvailable).to.equal('0.02') // formatted for basetoken decimals
      expect(result.oceanFeeAvailable).to.equal('0.02') // formatted for basetoken decimals
      expect(result.marketFeeCollector).to.equal(user3)
      expect(result.opfFee).to.equal('0.001')
    })

    it('#getAllowedSwapper- should return address(0) if not set, if exchangeOwner', async () => {
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(ADDRESS_ZERO)
    })
    it('#setAllowedSwapper- should return address(0) if not set, if exchangeOwner', async () => {
      await fixedRate.setAllowedSwapper(exchangeOwner, exchangeId, user2)
      expect(await fixedRate.getAllowedSwapper(exchangeId)).to.equal(user2)
    })
  })
})
