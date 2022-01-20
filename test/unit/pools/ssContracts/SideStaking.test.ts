import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../../TestContractHandler'
import { Contract } from 'web3-eth-contract'
import Web3 from 'web3'
import ERC721Factory from '../../../../src/artifacts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '../../../../src/artifacts/templates/ERC721Template.sol/ERC721Template.json'
import SSContract from '../../../../src/artifacts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import FactoryRouter from '../../../../src/artifacts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '../../../../src/artifacts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '../../../../src/artifacts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '../../../../src/artifacts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import PoolTemplate from '../../../../src/artifacts/pools/balancer/BPool.sol/BPool.json'
import OPFCollector from '../../../../src/artifacts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import { LoggerInstance } from '../../../../src/utils'
import { NftFactory, NftCreateData } from '../../../../src/factories/NFTFactory'
import { Pool } from '../../../../src/pools/balancer/Pool'
import { SideStaking } from '../../../../src/pools/ssContracts/SideStaking'
import {
  Erc20CreateParams,
  PoolCreationParams,
  TokenInOutMarket,
  AmountsInMaxFee,
  AmountsOutMaxFee
} from '../../../../src/interfaces'
const web3 = new Web3('http://127.0.0.1:8545')

describe('SideStaking unit test', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let initialBlock: number
  let sideStakingAddress: string
  let contracts: TestContractHandler
  let pool: Pool
  let sideStaking: SideStaking
  let dtAddress: string
  let dtAddress2: string
  let poolAddress: string
  let erc20Token: string
  let erc20Contract: Contract
  let daiContract: Contract
  let usdcContract: Contract
  const vestedBlocks = 2500000

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
    sideStakingAddress = contracts.sideStakingAddress
    await contracts.deployContracts(factoryOwner, FactoryRouter.abi as AbiItem[])

    // initialize Pool instance
    pool = new Pool(web3, LoggerInstance, PoolTemplate.abi as AbiItem[])
    assert(pool != null)
    //
    sideStaking = new SideStaking(web3, SSContract.abi as AbiItem[])
    assert(sideStaking != null)

    daiContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.daiAddress
    )

    usdcContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.usdcAddress
    )
    await pool.approve(
      contracts.accounts[0],
      contracts.daiAddress,
      contracts.factory721Address,
      '2000'
    )
    await pool.approve(
      contracts.accounts[0],
      contracts.usdcAddress,
      contracts.factory721Address,
      '10000'
    )

    expect(
      await pool.allowance(
        contracts.daiAddress,
        contracts.accounts[0],
        contracts.factory721Address
      )
    ).to.equal('2000')
    expect(
      await pool.allowance(
        contracts.usdcAddress,
        contracts.accounts[0],
        contracts.factory721Address
      )
    ).to.equal('10000')
    expect(await daiContract.methods.balanceOf(contracts.accounts[0]).call()).to.equal(
      web3.utils.toWei('100000')
    )

    console.log(
      await usdcContract.methods.decimals().call(),
      'USDC DECIMALS IN THIS TEST'
    )

    await pool.amountToUnits(contracts.usdcAddress, '20')
  })

  describe('Test a pool with DAI (18 Decimals)', () => {
    it('#create a pool', async () => {
      // CREATE A POOL
      // we prepare transaction parameters objects
      const nftFactory = new NftFactory(contracts.factory721Address, web3)

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
        baseTokenAddress: contracts.daiAddress,
        baseTokenSender: contracts.factory721Address,
        publisherAddress: contracts.accounts[0],
        marketFeeCollector: contracts.accounts[0],
        poolTemplateAddress: contracts.poolTemplateAddress,
        rate: '1',
        baseTokenDecimals: 18,
        vestingAmount: '10000',
        vestedBlocks: vestedBlocks,
        initialBaseTokenLiquidity: '2000',
        swapFeeLiquidityProvider: 1e15,
        swapFeeMarketRunner: 1e15
      }

      const txReceipt = await nftFactory.createNftErcWithPool(
        contracts.accounts[0],
        nftData,
        ercParams,
        poolParams
      )

      initialBlock = await web3.eth.getBlockNumber()
      erc20Token = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      poolAddress = txReceipt.events.NewPool.returnValues.poolAddress

      erc20Contract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], erc20Token)
      // user2 has no dt1
      expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')

      sideStakingAddress = contracts.sideStakingAddress
    })
    it('#getRouter - should get Router address', async () => {
      expect(await sideStaking.getRouter(sideStakingAddress)).to.equal(
        contracts.routerAddress
      )
    })

    it('#getDatatokenCirculatingSupply - should get datatoken supply in circulation (vesting amount excluded)', async () => {
      expect(
        await sideStaking.getDatatokenCirculatingSupply(
          contracts.sideStakingAddress,
          erc20Token
        )
      ).to.equal(web3.utils.toWei('2000'))
    })
    it('#getDatatokenCurrentCirculatingSupply - should get datatoken supply in circulation ', async () => {
      expect(
        await sideStaking.getDatatokenCurrentCirculatingSupply(
          contracts.sideStakingAddress,
          erc20Token
        )
      ).to.equal(web3.utils.toWei('2000'))
    })
    it('#getBaseToken - should get baseToken address', async () => {
      expect(await sideStaking.getBaseToken(sideStakingAddress, erc20Token)).to.equal(
        contracts.daiAddress
      )
    })
    it('#getPoolAddress - should get pool address', async () => {
      expect(await sideStaking.getPoolAddress(sideStakingAddress, erc20Token)).to.equal(
        poolAddress
      )
    })
    it('#getPublisherAddress - should get publisher address', async () => {
      expect(
        await sideStaking.getPublisherAddress(sideStakingAddress, erc20Token)
      ).to.equal(contracts.accounts[0])
    })
    it('#getBaseTokenBalance ', async () => {
      expect(
        await sideStaking.getBaseTokenBalance(sideStakingAddress, erc20Token)
      ).to.equal('0')
    })
    it('#getDatatokenBalance ', async () => {
      expect(
        await sideStaking.getDatatokenBalance(sideStakingAddress, erc20Token)
      ).to.equal('997999.9999999999')
    })

    it('#getvestingAmount ', async () => {
      expect(await sideStaking.getvestingAmount(sideStakingAddress, erc20Token)).to.equal(
        '10000'
      )
    })
    it('#getvestingLastBlock ', async () => {
      expect(
        await sideStaking.getvestingLastBlock(sideStakingAddress, erc20Token)
      ).to.equal(initialBlock.toString())
    })

    it('#getvestingEndBlock ', async () => {
      expect(
        await sideStaking.getvestingEndBlock(sideStakingAddress, erc20Token)
      ).to.equal((initialBlock + vestedBlocks).toString())
    })
    it('#getvestingAmountSoFar ', async () => {
      expect(
        await sideStaking.getvestingAmountSoFar(sideStakingAddress, erc20Token)
      ).to.equal('0')
    })

    it('#getVesting ', async () => {
      expect(
        await erc20Contract.methods.balanceOf(contracts.accounts[0]).call()
      ).to.equal('0')

      const tx = await sideStaking.getVesting(
        contracts.accounts[0],
        sideStakingAddress,
        erc20Token
      )

      expect(
        await sideStaking.unitsToAmount(
          erc20Token,
          await erc20Contract.methods.balanceOf(contracts.accounts[0]).call()
        )
      ).to.equal(await sideStaking.getvestingAmountSoFar(sideStakingAddress, erc20Token))

      expect(
        await sideStaking.getvestingLastBlock(sideStakingAddress, erc20Token)
      ).to.equal((await web3.eth.getBlockNumber()).toString())
    })

    it('#swapExactAmountIn - should swap', async () => {
      await daiContract.methods
        .transfer(user2, web3.utils.toWei('1000'))
        .send({ from: contracts.accounts[0] })
      expect(await daiContract.methods.balanceOf(user2).call()).to.equal(
        web3.utils.toWei('1000')
      )
      expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')
      await pool.approve(user2, contracts.daiAddress, poolAddress, '10')
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
      await pool.approve(user2, contracts.daiAddress, poolAddress, '100')
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

    it('#joinswapExternAmountIn- user2 should add liquidity, receiving LP tokens', async () => {
      const daiAmountIn = '100'
      const minBPTOut = '0.1'
      await pool.approve(user2, contracts.daiAddress, poolAddress, '100', true)
      expect(await pool.allowance(contracts.daiAddress, user2, poolAddress)).to.equal(
        '100'
      )
      const tx = await pool.joinswapExternAmountIn(
        user2,
        poolAddress,
        contracts.daiAddress,
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

    it('#joinswapPoolAmountOut- user2 should add liquidity, receiving LP tokens', async () => {
      const BPTAmountOut = '0.1'
      const maxDAIIn = '100'

      await pool.approve(user2, contracts.daiAddress, poolAddress, '100')

      const tx = await pool.joinswapPoolAmountOut(
        user2,
        poolAddress,
        contracts.daiAddress,
        BPTAmountOut,
        maxDAIIn
      )

      assert(tx != null)

      expect(tx.events.LOG_JOIN[0].event === 'LOG_JOIN')
      expect(tx.events.LOG_BPT.event === 'LOG_BPT')
      // 2 JOIN EVENTS BECAUSE SIDE STAKING ALSO STAKED DTs, TODO: we should add to whom has been sent in the LOG_BPT event
      expect(tx.events.LOG_JOIN[0].returnValues.bptAmount).to.equal(
        tx.events.LOG_JOIN[1].returnValues.bptAmount
      )
    })

    it('#exitswapPoolAmountIn- user2 exit the pool receiving only DAI', async () => {
      const BPTAmountIn = '0.5'
      const minDAIOut = '0.5'

      const tx = await pool.exitswapPoolAmountIn(
        user2,
        poolAddress,
        contracts.daiAddress,
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
        contracts.daiAddress,
        maxBTPIn,
        exactDAIOut
      )

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.daiAddress)

      // DTs were also unstaked in the same transaction (went to the staking contract)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(erc20Token)
    })
  })

  describe('Test a pool with USDC (6 Decimals)', () => {
    it('#create a pool', async () => {
      // CREATE A POOL
      // we prepare transaction parameters objects
      const nftFactory = new NftFactory(contracts.factory721Address, web3)

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
          await pool.amountToUnits(contracts.usdcAddress, '2000')
        ),
        swapFeeLiquidityProvider: 1e15,
        swapFeeMarketRunner: 1e15
      }

      const txReceipt = await nftFactory.createNftErcWithPool(
        contracts.accounts[0],
        nftData,
        ercParams,
        poolParams
      )

      initialBlock = await web3.eth.getBlockNumber()
      erc20Token = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      poolAddress = txReceipt.events.NewPool.returnValues.poolAddress

      erc20Contract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], erc20Token)
      // user2 has no dt1
      expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')
    })

    it('#getBaseTokenBalance ', async () => {
      expect(
        await sideStaking.getBaseTokenBalance(sideStakingAddress, erc20Token)
      ).to.equal('0')
    })
    it('#getDatatokenBalance ', async () => {
      expect(
        await sideStaking.getDatatokenBalance(sideStakingAddress, erc20Token)
      ).to.equal('997999.9999999999')
    })

    it('#getvestingAmount ', async () => {
      expect(await sideStaking.getvestingAmount(sideStakingAddress, erc20Token)).to.equal(
        '10000'
      )
    })
    it('#getvestingLastBlock ', async () => {
      expect(
        await sideStaking.getvestingLastBlock(sideStakingAddress, erc20Token)
      ).to.equal(initialBlock.toString())
    })

    it('#getvestingEndBlock ', async () => {
      expect(
        await sideStaking.getvestingEndBlock(sideStakingAddress, erc20Token)
      ).to.equal((initialBlock + vestedBlocks).toString())
    })
    it('#getvestingAmountSoFar ', async () => {
      expect(
        await sideStaking.getvestingAmountSoFar(sideStakingAddress, erc20Token)
      ).to.equal('0')
    })

    it('#getVesting ', async () => {
      expect(
        await erc20Contract.methods.balanceOf(contracts.accounts[0]).call()
      ).to.equal('0')

      const tx = await sideStaking.getVesting(
        contracts.accounts[0],
        sideStakingAddress,
        erc20Token
      )

      expect(
        await sideStaking.unitsToAmount(
          erc20Token,
          await erc20Contract.methods.balanceOf(contracts.accounts[0]).call()
        )
      ).to.equal(await sideStaking.getvestingAmountSoFar(sideStakingAddress, erc20Token))

      expect(
        await sideStaking.getvestingLastBlock(sideStakingAddress, erc20Token)
      ).to.equal((await web3.eth.getBlockNumber()).toString())
    })

    it('#swapExactAmountIn - should swap', async () => {
      const transferAmount = await pool.amountToUnits(contracts.usdcAddress, '1000') // 1000 USDC
      await usdcContract.methods
        .transfer(user2, transferAmount)
        .send({ from: contracts.accounts[0] })
      expect(await usdcContract.methods.balanceOf(user2).call()).to.equal(
        transferAmount.toString()
      )

      expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')
      await pool.approve(user2, contracts.usdcAddress, poolAddress, '10')
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
        (await pool.amountToUnits(contracts.usdcAddress, '990')).toString()
      )
      await pool.approve(user2, contracts.usdcAddress, poolAddress, '100')
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

    it('#joinswapExternAmountIn- user2 should add liquidity, receiving LP tokens', async () => {
      const usdcAmountIn = '100'
      const minBPTOut = '0.1'
      await pool.approve(user2, contracts.usdcAddress, poolAddress, '100', true)

      const tx = await pool.joinswapExternAmountIn(
        user2,
        poolAddress,
        contracts.usdcAddress,
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

    it('#joinswapPoolAmountOut- user2 should add liquidity, receiving LP tokens', async () => {
      const BPTAmountOut = '0.1'
      const maxUSDCIn = '100'

      await pool.approve(user2, contracts.usdcAddress, poolAddress, '100')

      const tx = await pool.joinswapPoolAmountOut(
        user2,
        poolAddress,
        contracts.usdcAddress,
        BPTAmountOut,
        maxUSDCIn
      )

      assert(tx != null)

      expect(tx.events.LOG_JOIN[0].event === 'LOG_JOIN')
      expect(tx.events.LOG_BPT.event === 'LOG_BPT')
      // 2 JOIN EVENTS BECAUSE SIDE STAKING ALSO STAKED DTs, TODO: we should add to whom has been sent in the LOG_BPT event
      expect(tx.events.LOG_JOIN[0].returnValues.bptAmount).to.equal(
        tx.events.LOG_JOIN[1].returnValues.bptAmount
      )
    })

    it('#exitswapPoolAmountIn- user2 exit the pool receiving only USDC', async () => {
      const BPTAmountIn = '0.5'
      const minUSDCOut = '0.5'

      const tx = await pool.exitswapPoolAmountIn(
        user2,
        poolAddress,
        contracts.usdcAddress,
        BPTAmountIn,
        minUSDCOut
      )

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.usdcAddress)

      // DTs were also unstaked in the same transaction (went to the staking contract)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(erc20Token)
    })

    it('#exitswapExternAmountOut- user2 exit the pool receiving only USDC', async () => {
      const maxBTPIn = '0.5'
      const exactUSDCOut = '1'

      const tx = await pool.exitswapPoolAmountIn(
        user2,
        poolAddress,
        contracts.usdcAddress,
        maxBTPIn,
        exactUSDCOut
      )

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.usdcAddress)

      // DTs were also unstaked in the same transaction (went to the staking contract)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(erc20Token)
    })
  })
})
