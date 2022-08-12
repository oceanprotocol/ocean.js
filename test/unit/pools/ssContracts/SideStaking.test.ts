import { assert, expect } from 'chai'
import BigNumber from 'bignumber.js'
import { deployContracts, Addresses } from '../../../TestContractHandler'
import { web3 } from '../../../config'
import {
  allowance,
  amountToUnits,
  approve,
  NftFactory,
  NftCreateData,
  Pool,
  SideStaking,
  unitsToAmount,
  ZERO_ADDRESS,
  balance,
  transfer,
  decimals
} from '../../../../src'
import {
  DatatokenCreateParams,
  PoolCreationParams,
  TokenInOutMarket,
  AmountsInMaxFee,
  AmountsOutMaxFee
} from '../../../../src/@types'
import { Contract } from 'web3-eth-contract'

describe('SideStaking unit test', () => {
  let factoryOwner: string
  let user1: string
  let user2: string
  let initialBlock: number
  let contracts: Addresses
  let pool: Pool
  let sideStaking: SideStaking
  let poolAddress: string
  let datatoken: string
  let datatokenContract: Contract
  let daiContract: Contract
  let usdcContract: Contract

  const VESTED_BLOCKS = 2500000
  const VESTING_AMOUNT = '10000'
  const BASE_TOKEN_LIQUIDITY = 2000

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

    nftData.owner = factoryOwner
    dtParams.minter = factoryOwner
    dtParams.paymentCollector = user2
    dtParams.mpFeeAddress = factoryOwner
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)

    // initialize Pool instance
    pool = new Pool(web3, 8996)
    assert(pool != null)
    //
    sideStaking = new SideStaking(web3, 8996)
    assert(sideStaking != null)

    await approve(
      web3,
      factoryOwner,
      contracts.daiAddress,
      contracts.nftFactoryAddress,
      BASE_TOKEN_LIQUIDITY.toString()
    )

    assert(
      parseInt(
        await allowance(
          web3,
          contracts.daiAddress,
          factoryOwner,
          contracts.nftFactoryAddress
        )
      ) >= BASE_TOKEN_LIQUIDITY
    )

    await approve(
      web3,
      factoryOwner,
      contracts.usdcAddress,
      contracts.nftFactoryAddress,
      BASE_TOKEN_LIQUIDITY.toString()
    )

    assert(
      parseInt(
        await allowance(
          web3,
          contracts.usdcAddress,
          factoryOwner,
          contracts.nftFactoryAddress
        )
      ) >= BASE_TOKEN_LIQUIDITY
    )
  })

  describe('Test a pool with DAI (18 Decimals)', () => {
    it('#create a pool', async () => {
      // CREATE A POOL
      // we prepare transaction parameters objects
      const nftFactory = new NftFactory(contracts.nftFactoryAddress, web3)

      const poolParams: PoolCreationParams = {
        ssContract: contracts.sideStakingAddress,
        baseTokenAddress: contracts.daiAddress,
        baseTokenSender: contracts.nftFactoryAddress,
        publisherAddress: factoryOwner,
        marketFeeCollector: factoryOwner,
        poolTemplateAddress: contracts.poolTemplateAddress,
        rate: '1',
        baseTokenDecimals: 18,
        vestingAmount: VESTING_AMOUNT,
        vestedBlocks: VESTED_BLOCKS,
        initialBaseTokenLiquidity: BASE_TOKEN_LIQUIDITY.toString(),
        swapFeeLiquidityProvider: '0.001',
        swapFeeMarketRunner: '0.001'
      }

      const txReceipt = await nftFactory.createNftWithDatatokenWithPool(
        factoryOwner,
        nftData,
        dtParams,
        poolParams
      )

      initialBlock = await web3.eth.getBlockNumber()
      datatoken = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      poolAddress = txReceipt.events.NewPool.returnValues.poolAddress

      // user1 has no dt1
      expect(await balance(web3, datatoken, user1)).to.equal('0')
    })

    it('#getRouter - should get Router address', async () => {
      expect(await sideStaking.getRouter(contracts.sideStakingAddress)).to.equal(
        contracts.routerAddress
      )
    })

    it('#getDatatokenCirculatingSupply - should get datatoken supply in circulation (vesting amount excluded)', async () => {
      expect(
        await sideStaking.getDatatokenCirculatingSupply(
          contracts.sideStakingAddress,
          datatoken
        )
      ).to.equal(web3.utils.toWei(BASE_TOKEN_LIQUIDITY.toString()))
    })

    it('#getDatatokenCurrentCirculatingSupply - should get datatoken supply in circulation ', async () => {
      expect(
        await sideStaking.getDatatokenCurrentCirculatingSupply(
          contracts.sideStakingAddress,
          datatoken
        )
      ).to.equal(web3.utils.toWei(BASE_TOKEN_LIQUIDITY.toString()))
    })

    it('#getBasetoken - should get baseToken address', async () => {
      expect(
        await sideStaking.getBasetoken(contracts.sideStakingAddress, datatoken)
      ).to.equal(contracts.daiAddress)
    })

    it('#getPoolAddress - should get pool address', async () => {
      expect(
        await sideStaking.getPoolAddress(contracts.sideStakingAddress, datatoken)
      ).to.equal(poolAddress)
    })

    it('#getPublisherAddress - should get publisher address', async () => {
      expect(
        await sideStaking.getPublisherAddress(contracts.sideStakingAddress, datatoken)
      ).to.equal(factoryOwner)
    })

    it('#getBasetokenBalance ', async () => {
      expect(
        await sideStaking.getBasetokenBalance(contracts.sideStakingAddress, datatoken)
      ).to.equal('0')
    })

    it('#getDatatokenBalance ', async () => {
      expect(
        await (
          await sideStaking.getDatatokenBalance(contracts.sideStakingAddress, datatoken)
        ).toString()
      ).to.equal(
        new BigNumber(2)
          .exponentiatedBy(256)
          .minus(1)
          .dividedBy(new BigNumber(10).exponentiatedBy(18))
          .minus(BASE_TOKEN_LIQUIDITY)
          .toString()
      )
    })

    it('#getVestingAmount ', async () => {
      expect(
        await sideStaking.getVestingAmount(contracts.sideStakingAddress, datatoken)
      ).to.equal('0')
    })

    it('#getVestingLastBlock ', async () => {
      expect(
        await sideStaking.getVestingLastBlock(contracts.sideStakingAddress, datatoken)
      ).to.equal(initialBlock.toString())
    })

    it('#getVestingAmountSoFar ', async () => {
      expect(
        await sideStaking.getVestingAmountSoFar(contracts.sideStakingAddress, datatoken)
      ).to.equal('0')
    })

    it('#swapExactAmountIn - should swap', async () => {
      await transfer(web3, factoryOwner, contracts.daiAddress, user1, '1000')
      await approve(web3, user1, contracts.daiAddress, poolAddress, '10')

      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.daiAddress,
        tokenOut: datatoken,
        marketFeeAddress: factoryOwner
      }

      const amountsInOutMaxFee: AmountsInMaxFee = {
        tokenAmountIn: '10',
        minAmountOut: '1',
        swapMarketFee: '0.1'
      }

      const tx = await pool.swapExactAmountIn(
        user1,
        poolAddress,
        tokenInOutMarket,
        amountsInOutMaxFee
      )

      expect(await balance(web3, datatoken, user1)).to.equal(
        await unitsToAmount(
          web3,
          datatoken,
          tx.events.LOG_SWAP.returnValues.tokenAmountOut
        )
      )
    })

    it('#swapExactAmountOut - should swap', async () => {
      await approve(web3, user1, contracts.daiAddress, poolAddress, '100')
      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.daiAddress,
        tokenOut: datatoken,
        marketFeeAddress: factoryOwner
      }
      const amountsInOutMaxFee: AmountsOutMaxFee = {
        maxAmountIn: '100',
        tokenAmountOut: '50',
        swapMarketFee: '0.1'
      }
      const tx = await pool.swapExactAmountOut(
        user1,
        poolAddress,
        tokenInOutMarket,
        amountsInOutMaxFee
      )
      assert(tx != null)
    })

    it('#joinswapExternAmountIn- user1 should add liquidity, receiving LP tokens', async () => {
      const daiAmountIn = '100'
      const minBPTOut = '0.1'
      await approve(web3, user1, contracts.daiAddress, poolAddress, '100', true)
      expect(await allowance(web3, contracts.daiAddress, user1, poolAddress)).to.equal(
        '100'
      )
      const tx = await pool.joinswapExternAmountIn(
        user1,
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

    it('#exitSwapPoolAmountIn- user1 exit the pool receiving only DAI', async () => {
      const BPTAmountIn = '0.5'
      const minDAIOut = '0.5'

      const tx = await pool.exitSwapPoolAmountIn(
        user1,
        poolAddress,
        BPTAmountIn,
        minDAIOut
      )

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.daiAddress)

      // DTs were also unstaked in the same transaction (went to the staking contract)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(datatoken)
    })
  })

  describe('Test a pool with USDC (6 Decimals)', () => {
    it('#create a pool', async () => {
      // CREATE A POOL
      // we prepare transaction parameters objects
      const nftFactory = new NftFactory(contracts.nftFactoryAddress, web3)

      const poolParams: PoolCreationParams = {
        ssContract: contracts.sideStakingAddress,
        baseTokenAddress: contracts.usdcAddress,
        baseTokenSender: contracts.nftFactoryAddress,
        publisherAddress: factoryOwner,
        marketFeeCollector: factoryOwner,
        poolTemplateAddress: contracts.poolTemplateAddress,
        rate: '1',
        baseTokenDecimals: await decimals(web3, contracts.usdcAddress),
        vestingAmount: VESTING_AMOUNT,
        vestedBlocks: VESTED_BLOCKS,
        initialBaseTokenLiquidity: await unitsToAmount(
          web3,
          contracts.usdcAddress,
          await amountToUnits(
            web3,
            contracts.usdcAddress,
            BASE_TOKEN_LIQUIDITY.toString()
          )
        ),
        swapFeeLiquidityProvider: '0.001',
        swapFeeMarketRunner: '0.001'
      }

      const txReceipt = await nftFactory.createNftWithDatatokenWithPool(
        factoryOwner,
        nftData,
        dtParams,
        poolParams
      )

      initialBlock = await web3.eth.getBlockNumber()
      datatoken = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      poolAddress = txReceipt.events.NewPool.returnValues.poolAddress

      // user1 has no dt1
      expect(await balance(web3, datatoken, user1)).to.equal('0')
    })

    it('#getBasetokenBalance ', async () => {
      expect(
        await sideStaking.getBasetokenBalance(contracts.sideStakingAddress, datatoken)
      ).to.equal('0')
    })

    it('#getDatatokenBalance ', async () => {
      expect(
        await (
          await sideStaking.getDatatokenBalance(contracts.sideStakingAddress, datatoken)
        ).toString()
      ).to.equal(
        new BigNumber(2)
          .exponentiatedBy(256)
          .minus(1)
          .dividedBy(new BigNumber(10).exponentiatedBy(18))
          .minus(BASE_TOKEN_LIQUIDITY)
          .toString()
      )
    })

    it('#getVestingAmount ', async () => {
      expect(
        await sideStaking.getVestingAmount(contracts.sideStakingAddress, datatoken)
      ).to.equal('0')
    })

    it('#getVestingLastBlock ', async () => {
      expect(
        await sideStaking.getVestingLastBlock(contracts.sideStakingAddress, datatoken)
      ).to.equal(initialBlock.toString())
    })

    it('#getVestingAmountSoFar ', async () => {
      expect(
        await sideStaking.getVestingAmountSoFar(contracts.sideStakingAddress, datatoken)
      ).to.equal('0')
    })

    it('#swapExactAmountIn - should swap', async () => {
      await transfer(web3, factoryOwner, contracts.usdcAddress, user1, '1000') // 1000 USDC
      await approve(web3, user1, contracts.usdcAddress, poolAddress, '10')

      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.usdcAddress,
        tokenOut: datatoken,
        marketFeeAddress: factoryOwner
      }
      const amountsInOutMaxFee: AmountsInMaxFee = {
        tokenAmountIn: '10',
        minAmountOut: '1',
        swapMarketFee: '0.1'
      }
      const tx = await pool.swapExactAmountIn(
        user1,
        poolAddress,
        tokenInOutMarket,
        amountsInOutMaxFee
      )

      expect(await balance(web3, datatoken, user1)).to.equal(
        await unitsToAmount(
          web3,
          datatoken,
          tx.events.LOG_SWAP.returnValues.tokenAmountOut
        )
      )
    })

    it('#swapExactAmountOut - should swap', async () => {
      await approve(web3, user1, contracts.usdcAddress, poolAddress, '100')
      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.usdcAddress,
        tokenOut: datatoken,
        marketFeeAddress: factoryOwner
      }
      const amountsInOutMaxFee: AmountsOutMaxFee = {
        maxAmountIn: '100',
        tokenAmountOut: '50',
        swapMarketFee: '0.1'
      }
      const tx = await pool.swapExactAmountOut(
        user1,
        poolAddress,
        tokenInOutMarket,
        amountsInOutMaxFee
      )
      assert(tx != null)
    })

    it('#joinswapExternAmountIn- user1 should add liquidity, receiving LP tokens', async () => {
      const usdcAmountIn = '100'
      const minBPTOut = '0.1'
      await approve(web3, user1, contracts.usdcAddress, poolAddress, '100', true)

      const tx = await pool.joinswapExternAmountIn(
        user1,
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

    it('#exitSwapPoolAmountIn- user1 exit the pool receiving only USDC', async () => {
      const BPTAmountIn = '0.5'
      const minUSDCOut = '0.5'

      const tx = await pool.exitSwapPoolAmountIn(
        user1,
        poolAddress,
        BPTAmountIn,
        minUSDCOut
      )

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.usdcAddress)

      // DTs were also unstaked in the same transaction (went to the staking contract)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(datatoken)
    })
  })
})
