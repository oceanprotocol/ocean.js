import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../../TestContractHandler'
import { Contract } from 'web3-eth-contract'
import Web3 from 'web3'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import FactoryRouter from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import OPFCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import { allowance, amountToUnits, approve, LoggerInstance } from '../../../../src/utils'
import { NftFactory, NftCreateData } from '../../../../src/factories/NFTFactory'
import { Pool } from '../../../../src/pools/balancer/Pool'
import {
  PoolCreationParams,
  Erc20CreateParams,
  CurrentFees,
  TokenInOutMarket,
  AmountsInMaxFee,
  AmountsOutMaxFee
} from '../../../../src/@types'
const web3 = new Web3('http://127.0.0.1:8545')

describe('Pool unit test', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let contracts: TestContractHandler
  let pool: Pool
  let dtAddress: string
  let dtAddress2: string
  let poolAddress: string
  let erc20Token: string
  let erc20Contract: Contract
  let daiContract: Contract
  let usdcContract: Contract

  it('should deploy contracts', async () => {
    contracts = new TestContractHandler(
      web3,
      ERC721Template.abi as AbiItem[],
      ERC20Template.abi as AbiItem[],
      PoolTemplate.abi as AbiItem[],
      ERC721Factory.abi as AbiItem[],
      FactoryRouter.abi as AbiItem[],
      SideStaking.abi as AbiItem[],
      FixedRate.abi as AbiItem[],
      Dispenser.abi as AbiItem[],
      OPFCollector.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      FactoryRouter.bytecode,
      SideStaking.bytecode,
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

    await contracts.deployContracts(factoryOwner, FactoryRouter.abi as AbiItem[])

    // initialize Pool instance
    pool = new Pool(web3, PoolTemplate.abi as AbiItem[])
    assert(pool != null)

    daiContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.daiAddress
    )

    usdcContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.usdcAddress
    )
    await approve(
      web3,
      contracts.accounts[0],
      contracts.daiAddress,
      contracts.factory721Address,
      '2000'
    )
    await approve(
      web3,
      contracts.accounts[0],
      contracts.usdcAddress,
      contracts.factory721Address,
      '10000'
    )
    expect(
      await allowance(
        web3,
        contracts.daiAddress,
        contracts.accounts[0],
        contracts.factory721Address
      )
    ).to.equal('2000')
    expect(
      await allowance(
        web3,
        contracts.usdcAddress,
        contracts.accounts[0],
        contracts.factory721Address
      )
    ).to.equal('10000')
    expect(await daiContract.methods.balanceOf(contracts.accounts[0]).call()).to.equal(
      web3.utils.toWei('100000')
    )

    await amountToUnits(web3, contracts.usdcAddress, '20')
  })

  describe('Test a pool with DAI (18 Decimals)', () => {
    it('#create a pool', async () => {
      // CREATE A POOL
      // we prepare transaction parameters objects
      const nftData: NftCreateData = {
        name: '72120Bundle',
        symbol: '72Bundle',
        templateIndex: 1,
        tokenURI: 'https://oceanprotocol.com/nft/'
      }

      const ercParams: Erc20CreateParams = {
        templateIndex: 1,
        minter: contracts.accounts[0],
        feeManager: user3,
        mpFeeAddress: contracts.accounts[0],
        feeToken: '0x0000000000000000000000000000000000000000',
        cap: '1000000',
        feeAmount: '0',
        name: 'ERC20B1',
        symbol: 'ERC20DT1Symbol'
      }

      const baseTokenInitialLiq = await amountToUnits(web3, contracts.daiAddress, '2000')

      const poolParams: PoolCreationParams = {
        ssContract: contracts.sideStakingAddress,
        baseTokenAddress: contracts.daiAddress,
        baseTokenSender: contracts.factory721Address,
        publisherAddress: contracts.accounts[0],
        marketFeeCollector: contracts.accounts[0],
        poolTemplateAddress: contracts.poolTemplateAddress,
        rate: '1',
        baseTokenDecimals: 18,
        vestingAmount: '10000',
        vestedBlocks: 2500000,
        initialBaseTokenLiquidity: '2000',
        swapFeeLiquidityProvider: '0.1',
        swapFeeMarketRunner: '0'
      }

      const nftFactory = new NftFactory(
        contracts.factory721Address,
        web3,
        ERC721Factory.abi as AbiItem[]
      )

      const txReceipt = await nftFactory.createNftErc20WithPool(
        contracts.accounts[0],
        nftData,
        ercParams,
        poolParams
      )

      erc20Token = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      poolAddress = txReceipt.events.NewPool.returnValues.poolAddress

      erc20Contract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], erc20Token)
      // user2 has no dt1
      expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')
    })

    it('#sharesBalance - should return user shares balance (datatoken balance, LPT balance, etc) ', async () => {
      expect(await daiContract.methods.balanceOf(user2).call()).to.equal(
        await pool.sharesBalance(user2, contracts.daiAddress)
      )
    })

    it('#getNumTokens - should return num of tokens in pool (2)', async () => {
      expect(await pool.getNumTokens(poolAddress)).to.equal('2')
    })

    it('#getPoolSharesTotalSupply - should return totalSupply of LPT', async () => {
      // dt owner which added liquidity has half of pool shares (the rest is in the sidestaking contracta)
      const dtOwnerLPTBalance = await pool.sharesBalance(
        contracts.accounts[0],
        poolAddress
      )
      expect(await pool.sharesBalance(contracts.accounts[0], poolAddress)).to.equal(
        await pool.sharesBalance(contracts.sideStakingAddress, poolAddress)
      )
      // total supply is twice the dtOwner balance
      expect(await pool.getPoolSharesTotalSupply(poolAddress)).to.equal(
        (2 * Number(dtOwnerLPTBalance)).toString()
      )
    })
    it('#getCurrentTokens - should return current pool tokens', async () => {
      const currentTokens = await pool.getCurrentTokens(poolAddress)
      expect(currentTokens[0]).to.equal(erc20Token)
      expect(currentTokens[1]).to.equal(contracts.daiAddress)
    })

    it('#getFinalTokens - should return final pool tokens', async () => {
      const finalTokens = await pool.getFinalTokens(poolAddress)
      expect(finalTokens[0]).to.equal(erc20Token)
      expect(finalTokens[1]).to.equal(contracts.daiAddress)
    })

    it('#getController - should return the pool controller (sideStaking address)', async () => {
      expect(await pool.getController(poolAddress)).to.equal(contracts.sideStakingAddress)
    })

    it('#isBound - should return true if token is bound into the pool', async () => {
      expect(await pool.isBound(poolAddress, contracts.daiAddress)).to.equal(true)
      expect(await pool.isBound(poolAddress, contracts.oceanAddress)).to.equal(false)
    })

    it('#getReserve - should return final pool tokens', async () => {
      expect(await pool.getReserve(poolAddress, contracts.daiAddress)).to.equal('2000') // baseToken initial liquidity
      // rate is 1 so we have the same amount of DTs
      expect(await pool.getReserve(poolAddress, erc20Token)).to.equal('2000')
    })

    it('#isFinalized - should return true if pool is finalized', async () => {
      expect(await pool.isFinalized(poolAddress)).to.equal(true)
    })

    it('#getSwapFee - should return the swap fee', async () => {
      expect(await pool.getSwapFee(poolAddress)).to.equal('0.1') // 0.1%
    })

    it('#getNormalizedWeight - should return the normalized weight', async () => {
      expect(await pool.getNormalizedWeight(poolAddress, contracts.daiAddress)).to.equal(
        '0.5'
      )
      expect(await pool.getNormalizedWeight(poolAddress, erc20Token)).to.equal('0.5')
    })

    it('#getDenormalizedWeight - should return the denormalized weight', async () => {
      expect(
        await pool.getDenormalizedWeight(poolAddress, contracts.daiAddress)
      ).to.equal('5')
      expect(await pool.getDenormalizedWeight(poolAddress, erc20Token)).to.equal('5')
    })

    it('#getBaseToken - should return the baseToken address', async () => {
      expect(await pool.getBaseToken(poolAddress)).to.equal(contracts.daiAddress)
    })

    it('#getDatatoken - should return the datatoken address', async () => {
      expect(await pool.getDatatoken(poolAddress)).to.equal(erc20Token)
    })

    it('#swapExactAmountIn - should swap', async () => {
      await daiContract.methods
        .transfer(user2, web3.utils.toWei('1000'))
        .send({ from: contracts.accounts[0] })
      expect(await daiContract.methods.balanceOf(user2).call()).to.equal(
        web3.utils.toWei('1000')
      )
      expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')
      await approve(web3, user2, contracts.daiAddress, poolAddress, '10')

      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.daiAddress,
        tokenOut: erc20Token,
        marketFeeAddress: contracts.accounts[0]
      }
      const amountsInOutMaxFee: AmountsInMaxFee = {
        tokenAmountIn: '10',
        minAmountOut: '1',
        swapMarketFee: '0.1'
      }
      const tx = await pool.swapExactAmountIn(
        user2,
        poolAddress,
        tokenInOutMarket,
        amountsInOutMaxFee
      )
      expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal(
        tx.events.LOG_SWAP.returnValues.tokenAmountOut
      )
    })

    it('#swapExactAmountOut - should swap', async () => {
      await approve(web3, user2, contracts.daiAddress, poolAddress, '100')
      expect(await daiContract.methods.balanceOf(user2).call()).to.equal(
        web3.utils.toWei('990')
      )
      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.daiAddress,
        tokenOut: erc20Token,
        marketFeeAddress: contracts.accounts[0]
      }
      const amountsInOutMaxFee: AmountsOutMaxFee = {
        maxAmountIn: '100',
        tokenAmountOut: '50',
        swapMarketFee: '0.1'
      }
      const tx = await pool.swapExactAmountOut(
        user2,
        poolAddress,
        tokenInOutMarket,
        amountsInOutMaxFee
      )
      assert(tx != null)
    })

    it('#joinPool- user2 should add liquidity, receiving LP tokens', async () => {
      const BPTAmountOut = '0.01'
      const maxAmountsIn = [
        '50', // Amounts IN
        '50' // Amounts IN
      ]

      await approve(web3, user2, erc20Token, poolAddress, '50')
      await approve(web3, user2, contracts.daiAddress, poolAddress, '50')
      const tx = await pool.joinPool(user2, poolAddress, BPTAmountOut, maxAmountsIn)
      assert(tx != null)
      expect(await pool.sharesBalance(user2, poolAddress)).to.equal(BPTAmountOut)
      expect(tx.events.LOG_JOIN.event === 'LOG_JOIN')
      expect(tx.events.LOG_BPT.event === 'LOG_BPT')
    })
    it('#joinswapExternAmountIn- user2 should add liquidity, receiving LP tokens', async () => {
      const daiAmountIn = '100'
      const minBPTOut = '0.1'
      await approve(web3, user2, contracts.daiAddress, poolAddress, '100', true)
      expect(await allowance(web3, contracts.daiAddress, user2, poolAddress)).to.equal(
        '100'
      )
      const tx = await pool.joinswapExternAmountIn(
        user2,
        poolAddress,
        daiAmountIn,
        minBPTOut
      )

      assert(tx != null)

      expect(tx.events.LOG_JOIN[0].event === 'LOG_JOIN')
      expect(tx.events.LOG_BPT.event === 'LOG_BPT')
      // 2 JOIN EVENTS BECAUSE SIDE STAKING ALSO STAKED DTs, TODO: we should add to whom has been sent in the LOG_BPT event
      expect(tx.events.LOG_JOIN[0].returnValues.bptAmount).to.equal(
        tx.events.LOG_JOIN[1].returnValues.bptAmount
      )
    })

    it('#exitPool- user2 exit the pool receiving both tokens, burning LP', async () => {
      const BPTAmountIn = '0.5'
      const minAmountOut = [
        '1', // min amount out for OCEAN AND DT
        '1'
      ]

      const tx = await pool.exitPool(user2, poolAddress, BPTAmountIn, minAmountOut)

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(erc20Token)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(contracts.daiAddress)
    })

    it('#exitswapPoolAmountIn- user2 exit the pool receiving only DAI', async () => {
      const BPTAmountIn = '0.5'
      const minDAIOut = '0.5'

      const tx = await pool.exitswapPoolAmountIn(
        user2,
        poolAddress,
        BPTAmountIn,
        minDAIOut
      )

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.daiAddress)

      // DTs were also unstaked in the same transaction (went to the staking contract)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(erc20Token)
    })

    it('#exitswapExternAmountOut- user2 exit the pool receiving only DAI', async () => {
      const maxBTPIn = '0.5'
      const exactDAIOut = '1'

      const tx = await pool.exitswapPoolAmountIn(
        user2,
        poolAddress,
        maxBTPIn,
        exactDAIOut
      )

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.daiAddress)

      // DTs were also unstaked in the same transaction (went to the staking contract)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(erc20Token)
    })

    it('#getAmountInExactOut- should get the amount in for exact out', async () => {
      const maxBTPIn = '0.5'
      const exactDAIOut = '1'

      const amountIn = await pool.getAmountInExactOut(
        poolAddress,
        erc20Token,
        contracts.daiAddress,
        exactDAIOut,
        '0.1'
      )

      assert(amountIn != null)

      // console.log(tx)

      const spotPrice = await pool.getSpotPrice(
        poolAddress,
        erc20Token,
        contracts.daiAddress,
        '0.1'
      )

      // amount of DAI In will be slightly bigger than spotPrice
      assert(amountIn > spotPrice)
    })

    it('#getAmountOutExactIn- should get the amount out for exact In', async () => {
      const exactDTIn = '1'

      const amountOut = await pool.getAmountOutExactIn(
        poolAddress,
        erc20Token,
        contracts.daiAddress,
        exactDTIn,
        '0.1'
      )

      assert(amountOut != null)

      const spotPrice = await pool.getSpotPrice(
        poolAddress,
        contracts.daiAddress,
        erc20Token,
        '0.1'
      )
      // amount of DAI received will be slightly less than spotPrice
      assert(amountOut < spotPrice)
    })

    it('#getSpotPrice- should get the spot price', async () => {
      assert(
        (await pool.getSpotPrice(poolAddress, erc20Token, contracts.daiAddress, '0.1')) !=
          null
      )
      assert(
        (await pool.getSpotPrice(poolAddress, contracts.daiAddress, erc20Token, '0.1')) !=
          null
      )
    })

    it('#getMarketFees- should get market fees for each token', async () => {
      // we haven't performed any swap DT => DAI so there's no fee in erc20Token
      // but there's a fee in DAI
      assert((await pool.getMarketFees(poolAddress, erc20Token)) === '0')
      assert((await pool.getMarketFees(poolAddress, contracts.daiAddress)) > '0')
    })

    it('#getCommunityFees- should get community fees for each token', async () => {
      // we haven't performed any swap DT => DAI so there's no fee in erc20Token
      // but there's a fee in DAI

      assert((await pool.getCommunityFees(poolAddress, erc20Token)) === '0')
      assert((await pool.getCommunityFees(poolAddress, contracts.daiAddress)) > '0')
    })

    it('#collectMarketFee- should collect market fees for each token', async () => {
      const spotPriceBefore = await pool.getSpotPrice(
        poolAddress,
        erc20Token,
        contracts.daiAddress,
        '0.1'
      )

      // contracts.accounts[0] is the marketFeeCollector
      assert((await pool.getMarketFeeCollector(poolAddress)) === contracts.accounts[0])
      // user3 has no DAI (we are going to send DAI fee to him)
      assert((await daiContract.methods.balanceOf(user3).call()) === '0')
      // only marketFeeCollector can call this, set user3 as receiver
      await pool.collectMarketFee(contracts.accounts[0], poolAddress)
      // DAI fees have been collected
      assert((await pool.getMarketFees(poolAddress, contracts.daiAddress)) === '0')

      // Spot price hasn't changed after fee collection
      assert(
        (await pool.getSpotPrice(
          poolAddress,
          erc20Token,
          contracts.daiAddress,
          '0.1'
        )) === spotPriceBefore
      )
    })

    it('#getMarketFeeCollector- should get market fees for each token', async () => {
      // contracts.accounts[0] is the marketFeeCollector
      assert((await pool.getMarketFeeCollector(poolAddress)) === contracts.accounts[0])
    })

    it('#getOPCCollector- should get market fees for each token', async () => {
      assert((await pool.getOPCCollector(poolAddress)) === contracts.opfCollectorAddress)
    })

    it('#collectCommunityFee- should get community fees for each token', async () => {
      const spotPriceBefore = await pool.getSpotPrice(
        poolAddress,
        erc20Token,
        contracts.daiAddress,
        '0.1'
      )
      // some fee are available in DAI
      assert((await pool.getCommunityFees(poolAddress, contracts.daiAddress)) > '0')
      // opf collector has no DAI
      assert(
        (await daiContract.methods.balanceOf(contracts.opfCollectorAddress).call()) ===
          '0'
      )
      // anyone can call callectOPF
      await pool.collectOPC(contracts.accounts[0], poolAddress)
      // DAI fees have been collected
      assert((await pool.getCommunityFees(poolAddress, contracts.daiAddress)) === '0')
      // OPF collector got DAI
      assert(
        (await daiContract.methods.balanceOf(contracts.opfCollectorAddress).call()) > '0'
      )
      // Spot price hasn't changed after fee collection
      assert(
        (await pool.getSpotPrice(
          poolAddress,
          erc20Token,
          contracts.daiAddress,
          '0.1'
        )) === spotPriceBefore
      )
    })

    it('#updateMarketFeeCollector- should update market fee collector', async () => {
      // contracts.accounts[0] is the marketFeeCollector
      assert((await pool.getMarketFeeCollector(poolAddress)) === contracts.accounts[0])

      await pool.updateMarketFeeCollector(contracts.accounts[0], poolAddress, user3)

      assert((await pool.getMarketFeeCollector(poolAddress)) === user3)
    })
  })

  describe('Test a pool with USDC (6 Decimals)', () => {
    it('#create a pool', async () => {
      // CREATE A POOL
      // we prepare transaction parameters objects
      const nftData: NftCreateData = {
        name: '72120Bundle',
        symbol: '72Bundle',
        templateIndex: 1,
        tokenURI: 'https://oceanprotocol.com/nft/'
      }

      const ercParams: Erc20CreateParams = {
        templateIndex: 1,
        minter: contracts.accounts[0],
        feeManager: user3,
        mpFeeAddress: contracts.accounts[0],
        feeToken: '0x0000000000000000000000000000000000000000',
        cap: '1000000',
        feeAmount: '0',
        name: 'ERC20B1',
        symbol: 'ERC20DT1Symbol'
      }

      const poolParams: PoolCreationParams = {
        ssContract: contracts.sideStakingAddress,
        baseTokenAddress: contracts.usdcAddress,
        baseTokenSender: contracts.factory721Address,
        publisherAddress: contracts.accounts[0],
        marketFeeCollector: contracts.accounts[0],
        poolTemplateAddress: contracts.poolTemplateAddress,
        rate: '1',
        baseTokenDecimals: await usdcContract.methods.decimals().call(),
        vestingAmount: '10000',
        vestedBlocks: 2500000,
        initialBaseTokenLiquidity: web3.utils.fromWei(
          await amountToUnits(web3, contracts.usdcAddress, '2000')
        ),
        swapFeeLiquidityProvider: '0.1',
        swapFeeMarketRunner: '0'
      }

      const nftFactory = new NftFactory(
        contracts.factory721Address,
        web3,
        ERC721Factory.abi as AbiItem[]
      )

      const txReceipt = await nftFactory.createNftErc20WithPool(
        contracts.accounts[0],
        nftData,
        ercParams,
        poolParams
      )

      erc20Token = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      poolAddress = txReceipt.events.NewPool.returnValues.poolAddress

      erc20Contract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], erc20Token)
      // user2 has no dt1
      expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')
    })

    it('#calcPoolOutGivenSingleIn - should get the amount of pool OUT for exact token IN', async () => {
      // since rate is 1 and the pool is just created
      // amount of pool out received for same amount of different token In is equal
      const tokenInAmount = '10' // 10 USDC or 10 DTs
      expect(
        await pool.calcPoolOutGivenSingleIn(poolAddress, erc20Token, tokenInAmount)
      ).to.equal(
        await pool.calcPoolOutGivenSingleIn(
          poolAddress,
          contracts.usdcAddress,
          tokenInAmount
        )
      )
      // console.log(await pool.calcPoolOutGivenSingleIn(poolAddress, erc20Token, tokenInAmount))
    })

    it('#calcSingleInGivenPoolOut - should get the amount of token IN for exact pool token OUT', async () => {
      // since rate is 1 and the pool is just created
      // amount of different token In for getting same pool amount out is equal
      const poolAmountOut = '1'
      expect(
        parseInt(
          await pool.calcSingleInGivenPoolOut(poolAddress, erc20Token, poolAmountOut)
        )
      ).to.be.closeTo(
        parseInt(
          await pool.calcSingleInGivenPoolOut(
            poolAddress,
            contracts.usdcAddress,
            poolAmountOut
          )
        ),
        1e9
      )
    })

    it('#calcSingleOutGivenPoolIn - should get the amount of token OUT for exact pool token IN', async () => {
      // since rate is 1 and the pool is just created
      // amount amount of different token Out for rediming the same pool In is equal
      const poolAmountIn = '10'
      expect(
        await pool.calcSingleOutGivenPoolIn(poolAddress, erc20Token, poolAmountIn)
      ).to.equal(
        await pool.calcSingleOutGivenPoolIn(
          poolAddress,
          contracts.usdcAddress,
          poolAmountIn
        )
      )
    })

    it('#calcPoolInGivenSingleOut - should get the amount of pool IN for exact token OUT', async () => {
      // since rate is 1 and the pool is just created
      // amount of pool In for getting the same amount of different token Out is equal
      const tokenAmountOut = '10'
      expect(
        parseInt(
          await pool.calcPoolInGivenSingleOut(poolAddress, erc20Token, tokenAmountOut)
        )
      ).to.be.closeTo(
        parseInt(
          await pool.calcPoolInGivenSingleOut(
            poolAddress,
            contracts.usdcAddress,
            tokenAmountOut
          )
        ),
        1e11
      )
    })

    it('#sharesBalance - should return user shares balance (datatoken balance, LPT balance, etc) ', async () => {
      expect(await usdcContract.methods.balanceOf(user2).call()).to.equal(
        await pool.sharesBalance(user2, contracts.usdcAddress)
      )
    })

    it('#getNumTokens - should return num of tokens in pool (2)', async () => {
      expect(await pool.getNumTokens(poolAddress)).to.equal('2')
    })

    it('#getPoolSharesTotalSupply - should return totalSupply of LPT', async () => {
      // dt owner which added liquidity has half of pool shares (the rest is in the sidestaking contracta)
      const dtOwnerLPTBalance = await pool.sharesBalance(
        contracts.accounts[0],
        poolAddress
      )
      expect(await pool.sharesBalance(contracts.accounts[0], poolAddress)).to.equal(
        await pool.sharesBalance(contracts.sideStakingAddress, poolAddress)
      )
      // total supply is twice the dtOwner balance
      expect(await pool.getPoolSharesTotalSupply(poolAddress)).to.equal(
        (2 * Number(dtOwnerLPTBalance)).toString()
      )
    })
    it('#getCurrentTokens - should return current pool tokens', async () => {
      const currentTokens = await pool.getCurrentTokens(poolAddress)
      expect(currentTokens[0]).to.equal(erc20Token)
      expect(currentTokens[1]).to.equal(contracts.usdcAddress)
    })

    it('#getFinalTokens - should return final pool tokens', async () => {
      const finalTokens = await pool.getFinalTokens(poolAddress)
      expect(finalTokens[0]).to.equal(erc20Token)
      expect(finalTokens[1]).to.equal(contracts.usdcAddress)
    })

    it('#getController - should return the pool controller (sideStaking address)', async () => {
      expect(await pool.getController(poolAddress)).to.equal(contracts.sideStakingAddress)
    })

    it('#isBound - should return true if token is bound into the pool', async () => {
      expect(await pool.isBound(poolAddress, contracts.usdcAddress)).to.equal(true)
      expect(await pool.isBound(poolAddress, contracts.oceanAddress)).to.equal(false)
    })

    it('#getReserve - should return final pool tokens Reserve', async () => {
      expect(await pool.getReserve(poolAddress, contracts.usdcAddress)).to.equal('2000') // baseToken initial liquidity
      // rate is 1 so we have the same amount of DTs
      expect(await pool.getReserve(poolAddress, erc20Token)).to.equal('2000')
    })

    it('#isFinalized - should return true if pool is finalized', async () => {
      expect(await pool.isFinalized(poolAddress)).to.equal(true)
    })

    it('#getSwapFee - should return the swap fee', async () => {
      expect(await pool.getSwapFee(poolAddress)).to.equal('0.1') // 0.1%
    })

    it('#getNormalizedWeight - should return the normalized weight', async () => {
      expect(await pool.getNormalizedWeight(poolAddress, contracts.usdcAddress)).to.equal(
        '0.5'
      )
      expect(await pool.getNormalizedWeight(poolAddress, erc20Token)).to.equal('0.5')
    })

    it('#getDenormalizedWeight - should return the denormalized weight', async () => {
      expect(
        await pool.getDenormalizedWeight(poolAddress, contracts.usdcAddress)
      ).to.equal('5')
      expect(await pool.getDenormalizedWeight(poolAddress, erc20Token)).to.equal('5')
    })

    it('#getBaseToken - should return the baseToken address', async () => {
      expect(await pool.getBaseToken(poolAddress)).to.equal(contracts.usdcAddress)
    })

    it('#getDatatoken - should return the datatoken address', async () => {
      expect(await pool.getDatatoken(poolAddress)).to.equal(erc20Token)
    })

    it('#swapExactAmountIn - should swap', async () => {
      const transferAmount = await amountToUnits(web3, contracts.usdcAddress, '1000') // 1000 USDC
      await usdcContract.methods
        .transfer(user2, transferAmount)
        .send({ from: contracts.accounts[0] })
      expect(await usdcContract.methods.balanceOf(user2).call()).to.equal(
        transferAmount.toString()
      )

      expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')
      await approve(web3, user2, contracts.usdcAddress, poolAddress, '10')
      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.usdcAddress,
        tokenOut: erc20Token,
        marketFeeAddress: contracts.accounts[0]
      }
      const amountsInOutMaxFee: AmountsInMaxFee = {
        tokenAmountIn: '10',
        minAmountOut: '1',
        swapMarketFee: '0.1'
      }
      const tx = await pool.swapExactAmountIn(
        user2,
        poolAddress,
        tokenInOutMarket,
        amountsInOutMaxFee
      )
      expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal(
        tx.events.LOG_SWAP.returnValues.tokenAmountOut
      )
    })

    it('#swapExactAmountOut - should swap', async () => {
      expect(await usdcContract.methods.balanceOf(user2).call()).to.equal(
        (await amountToUnits(web3, contracts.usdcAddress, '990')).toString()
      )
      await approve(web3, user2, contracts.usdcAddress, poolAddress, '100')
      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.usdcAddress,
        tokenOut: erc20Token,
        marketFeeAddress: contracts.accounts[0]
      }
      const amountsInOutMaxFee: AmountsOutMaxFee = {
        maxAmountIn: '100',
        tokenAmountOut: '50',
        swapMarketFee: '0.1'
      }
      const tx = await pool.swapExactAmountOut(
        user2,
        poolAddress,
        tokenInOutMarket,
        amountsInOutMaxFee
      )
      assert(tx != null)
      // console.log(tx.events)
    })

    it('#joinPool- user2 should add liquidity, receiving LP tokens', async () => {
      const BPTAmountOut = '0.01'
      const maxAmountsIn = [
        '50', // Amounts IN
        '50' // Amounts IN
      ]

      await approve(web3, user2, erc20Token, poolAddress, '50')
      await approve(web3, user2, contracts.usdcAddress, poolAddress, '50')
      const tx = await pool.joinPool(user2, poolAddress, BPTAmountOut, maxAmountsIn)
      assert(tx != null)
      expect(await pool.sharesBalance(user2, poolAddress)).to.equal(BPTAmountOut)
      expect(tx.events.LOG_JOIN.event === 'LOG_JOIN')
      expect(tx.events.LOG_BPT.event === 'LOG_BPT')

      // console.log(tx)
      // console.log(tx.events.LOG_JOIN)
      // console.log(tx.events.LOG_BPT)
    })
    it('#joinswapExternAmountIn- user2 should add liquidity, receiving LP tokens', async () => {
      const usdcAmountIn = '100'
      const minBPTOut = '0.1'
      await approve(web3, user2, contracts.usdcAddress, poolAddress, '100', true)

      const tx = await pool.joinswapExternAmountIn(
        user2,
        poolAddress,
        usdcAmountIn,
        minBPTOut
      )

      assert(tx != null)

      expect(tx.events.LOG_JOIN[0].event === 'LOG_JOIN')
      expect(tx.events.LOG_BPT.event === 'LOG_BPT')
      // 2 JOIN EVENTS BECAUSE SIDE STAKING ALSO STAKED DTs, TODO: we should add to whom has been sent in the LOG_BPT event
      expect(tx.events.LOG_JOIN[0].returnValues.bptAmount).to.equal(
        tx.events.LOG_JOIN[1].returnValues.bptAmount
      )
    })

    it('#exitPool- user2 exit the pool receiving both tokens, burning LP', async () => {
      const BPTAmountIn = '0.5'
      const minAmountOut = [
        '1', // min amount out for USDC AND DT
        '1'
      ]

      const tx = await pool.exitPool(user2, poolAddress, BPTAmountIn, minAmountOut)

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(erc20Token)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(contracts.usdcAddress)
    })

    it('#exitswapPoolAmountIn- user2 exit the pool receiving only USDC', async () => {
      const BPTAmountIn = '0.5'
      const minUSDCOut = '0.5'

      const tx = await pool.exitswapPoolAmountIn(
        user2,
        poolAddress,
        BPTAmountIn,
        minUSDCOut
      )

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.usdcAddress)

      // DTs were also unstaked in the same transaction (went to the staking contract)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(erc20Token)
    })

    it('#getAmountInExactOut- should get the amount in for exact out', async () => {
      const maxBTPIn = '0.5'
      const exactUSDCOut = '1'

      const amountIn = await pool.getAmountInExactOut(
        poolAddress,
        erc20Token,
        contracts.usdcAddress,
        exactUSDCOut,
        '0.1'
      )

      assert(amountIn != null)

      const spotPrice = await pool.getSpotPrice(
        poolAddress,
        erc20Token,
        contracts.usdcAddress,
        '0.1'
      )
      // amount of USDC In will be slightly bigger than spotPrice
      assert(amountIn > spotPrice)
    })

    it('#getAmountOutExactIn- should get the amount out for exact In', async () => {
      const exactDTIn = '1'

      const amountOut = await pool.getAmountOutExactIn(
        poolAddress,
        erc20Token,
        contracts.usdcAddress,
        exactDTIn,
        '0.1'
      )

      assert(amountOut != null)

      const spotPrice = await pool.getSpotPrice(
        poolAddress,
        contracts.usdcAddress,
        erc20Token,
        '0.1'
      )
      // amount of USDC received will be slightly less than spotPrice
      assert(amountOut < spotPrice)
    })

    it('#getSpotPrice- should get the spot price', async () => {
      assert(
        (await pool.getSpotPrice(
          poolAddress,
          erc20Token,
          contracts.usdcAddress,
          '0.1'
        )) != null
      )
      assert(
        (await pool.getSpotPrice(
          poolAddress,
          contracts.usdcAddress,
          erc20Token,
          '0.1'
        )) != null
      )
    })

    it('#getMarketFees- should get market fees for each token', async () => {
      // we haven't performed any swap DT => USDC so there's no fee in erc20Token
      // but there's a fee in USDC
      assert((await pool.getMarketFees(poolAddress, erc20Token)) === '0')
      assert((await pool.getMarketFees(poolAddress, contracts.usdcAddress)) > '0')
    })

    it('#getCommunityFees- should get community fees for each token', async () => {
      // we haven't performed any swap DT => USDC so there's no fee in erc20Token
      // but there's a fee in USDC

      assert((await pool.getCommunityFees(poolAddress, erc20Token)) === '0')
      assert((await pool.getCommunityFees(poolAddress, contracts.usdcAddress)) > '0')
    })

    it('#collectMarketFee- should collect market fees for each token', async () => {
      const spotPriceBefore = await pool.getSpotPrice(
        poolAddress,
        erc20Token,
        contracts.usdcAddress,
        '0.1'
      )
      // contracts.accounts[0] is the marketFeeCollector
      assert((await pool.getMarketFeeCollector(poolAddress)) === contracts.accounts[0])
      // user3 has no USDC (we are going to send USDC fee to him)
      assert((await usdcContract.methods.balanceOf(user3).call()) === '0')
      // only marketFeeCollector can call this, set user3 as receiver
      await pool.collectMarketFee(contracts.accounts[0], poolAddress)
      // USDC fees have been collected
      assert((await pool.getMarketFees(poolAddress, contracts.usdcAddress)) === '0')

      // Spot price hasn't changed after fee collection
      assert(
        (await pool.getSpotPrice(
          poolAddress,
          erc20Token,
          contracts.usdcAddress,
          '0.1'
        )) === spotPriceBefore
      )
    })

    it('#getMarketFeeCollector- should get market fees for each token', async () => {
      // contracts.accounts[0] is the marketFeeCollector
      assert((await pool.getMarketFeeCollector(poolAddress)) === contracts.accounts[0])
    })

    it('#getOPCCollector- should get market fees for each token', async () => {
      assert((await pool.getOPCCollector(poolAddress)) === contracts.opfCollectorAddress)
    })

    it('#getCurrentMarketFees- should get curent market fees for each token', async () => {
      const currentMarketFees: CurrentFees = await pool.getCurrentMarketFees(poolAddress)
      assert(currentMarketFees !== null)
    })

    it('#getCurrentOPFFees- should get curent market fees for each token', async () => {
      const curentOPFFees: CurrentFees = await pool.getCurrentOPCFees(poolAddress)
      assert(curentOPFFees !== null)
    })

    it('#collectCommunityFee- should get community fees for each token', async () => {
      const spotPriceBefore = await pool.getSpotPrice(
        poolAddress,
        erc20Token,
        contracts.usdcAddress,
        '0.1'
      )
      // some fee are available in USDC
      assert((await pool.getCommunityFees(poolAddress, contracts.usdcAddress)) > '0')
      // opf collector has no USDC
      assert(
        (await usdcContract.methods.balanceOf(contracts.opfCollectorAddress).call()) ===
          '0'
      )
      // anyone can call callectOPF
      await pool.collectOPC(contracts.accounts[0], poolAddress)
      // USDC fees have been collected
      assert((await pool.getCommunityFees(poolAddress, contracts.usdcAddress)) === '0')
      // OPF collector got USDC
      assert(
        (await usdcContract.methods.balanceOf(contracts.opfCollectorAddress).call()) > '0'
      )
      // Spot price hasn't changed after fee collection
      assert(
        (await pool.getSpotPrice(
          poolAddress,
          erc20Token,
          contracts.usdcAddress,
          '0.1'
        )) === spotPriceBefore
      )
    })

    it('#updateMarketFeeCollector- should update market fee collector', async () => {
      // contracts.accounts[0] is the marketFeeCollector
      assert((await pool.getMarketFeeCollector(poolAddress)) === contracts.accounts[0])

      await pool.updateMarketFeeCollector(contracts.accounts[0], poolAddress, user3)

      assert((await pool.getMarketFeeCollector(poolAddress)) === user3)
    })
  })
})
