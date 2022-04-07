import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { Contract } from 'web3-eth-contract'
import SSContract from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { deployContracts, Addresses } from '../../../TestContractHandler'
import { web3 } from '../../../config'
import {
  allowance,
  amountToUnits,
  approve,
  NftFactory,
  NftCreateData,
  Pool,
  unitsToAmount
} from '../../../../src'
import { SideStaking } from '../../../../src/pools/ssContracts/SideStaking'
import {
  Erc20CreateParams,
  PoolCreationParams,
  TokenInOutMarket,
  AmountsInMaxFee,
  AmountsOutMaxFee
} from '../../../../src/@types'

describe('SideStaking unit test', () => {
  let factoryOwner: string
  let user1: string
  let user2: string
  let initialBlock: number
  let sideStakingAddress: string
  let contracts: Addresses
  let pool: Pool
  let sideStaking: SideStaking
  let poolAddress: string
  let erc20Token: string
  let erc20Contract: Contract
  let daiContract: Contract
  let usdcContract: Contract
  const vestedBlocks = 2500000

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)
    sideStakingAddress = contracts.sideStakingAddress

    // initialize Pool instance
    pool = new Pool(web3, PoolTemplate.abi as AbiItem[])
    assert(pool != null)
    //
    sideStaking = new SideStaking(web3, SSContract.abi as AbiItem[])
    assert(sideStaking != null)

    daiContract = new web3.eth.Contract(MockERC20.abi as AbiItem[], contracts.daiAddress)

    usdcContract = new web3.eth.Contract(
      MockERC20.abi as AbiItem[],
      contracts.usdcAddress
    )
    await approve(
      web3,
      factoryOwner,
      contracts.daiAddress,
      contracts.erc721FactoryAddress,
      '2000'
    )
    await approve(
      web3,
      factoryOwner,
      contracts.usdcAddress,
      contracts.erc721FactoryAddress,
      '10000'
    )

    let allowCheck = await allowance(
      web3,
      contracts.daiAddress,
      factoryOwner,
      contracts.erc721FactoryAddress
    )
    assert(parseInt(allowCheck) >= 2000)
    allowCheck = await allowance(
      web3,
      contracts.usdcAddress,
      factoryOwner,
      contracts.erc721FactoryAddress
    )
    assert(parseInt(allowCheck) >= 10000)

    console.log(
      await usdcContract.methods.decimals().call(),
      'USDC DECIMALS IN THIS TEST'
    )

    await amountToUnits(web3, contracts.usdcAddress, '20')
  })

  describe('Test a pool with DAI (18 Decimals)', () => {
    it('#create a pool', async () => {
      // CREATE A POOL
      // we prepare transaction parameters objects
      const nftFactory = new NftFactory(contracts.erc721FactoryAddress, web3)

      const nftData: NftCreateData = {
        name: '72120Bundle',
        symbol: '72Bundle',
        templateIndex: 1,
        tokenURI: 'https://oceanprotocol.com/nft/',
        transferable: true,
        owner: factoryOwner
      }

      const ercParams: Erc20CreateParams = {
        templateIndex: 1,
        minter: factoryOwner,
        paymentCollector: user2,
        mpFeeAddress: factoryOwner,
        feeToken: '0x0000000000000000000000000000000000000000',
        cap: '1000000',
        feeAmount: '0',
        name: 'ERC20B1',
        symbol: 'ERC20DT1Symbol'
      }

      const poolParams: PoolCreationParams = {
        ssContract: contracts.sideStakingAddress,
        baseTokenAddress: contracts.daiAddress,
        baseTokenSender: contracts.erc721FactoryAddress,
        publisherAddress: factoryOwner,
        marketFeeCollector: factoryOwner,
        poolTemplateAddress: contracts.poolTemplateAddress,
        rate: '1',
        baseTokenDecimals: 18,
        vestingAmount: '10000',
        vestedBlocks: vestedBlocks,
        initialBaseTokenLiquidity: '2000',
        swapFeeLiquidityProvider: '0.001',
        swapFeeMarketRunner: '0.001'
      }

      const txReceipt = await nftFactory.createNftErc20WithPool(
        factoryOwner,
        nftData,
        ercParams,
        poolParams
      )

      initialBlock = await web3.eth.getBlockNumber()
      erc20Token = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      poolAddress = txReceipt.events.NewPool.returnValues.poolAddress

      erc20Contract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], erc20Token)
      // user1 has no dt1
      expect(await erc20Contract.methods.balanceOf(user1).call()).to.equal('0')

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
      ).to.equal(factoryOwner)
    })

    it('#getBaseTokenBalance ', async () => {
      expect(
        await sideStaking.getBaseTokenBalance(sideStakingAddress, erc20Token)
      ).to.equal('0')
    })
    // it('#getDatatokenBalance ', async () => {
    //   expect(
    //     await sideStaking.getDatatokenBalance(sideStakingAddress, erc20Token)
    //   ).to.equal('997999.9999999999')
    // })

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
      expect(await erc20Contract.methods.balanceOf(factoryOwner).call()).to.equal('0')

      const tx = await sideStaking.getVesting(
        factoryOwner,
        sideStakingAddress,
        erc20Token
      )
      const collector = await erc20Contract.methods.getPaymentCollector().call()
      expect(
        await sideStaking.unitsToAmount(
          erc20Token,
          await erc20Contract.methods.balanceOf(collector).call()
        )
      ).to.equal(await sideStaking.getvestingAmountSoFar(sideStakingAddress, erc20Token))

      expect(
        await sideStaking.getvestingLastBlock(sideStakingAddress, erc20Token)
      ).to.equal((await web3.eth.getBlockNumber()).toString())
    })

    it('#swapExactAmountIn - should swap', async () => {
      await daiContract.methods
        .transfer(user1, web3.utils.toWei('1000'))
        .send({ from: factoryOwner })
      await approve(web3, user1, contracts.daiAddress, poolAddress, '10')
      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.daiAddress,
        tokenOut: erc20Token,
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
      expect(await erc20Contract.methods.balanceOf(user1).call()).to.equal(
        tx.events.LOG_SWAP.returnValues.tokenAmountOut
      )
    })

    it('#swapExactAmountOut - should swap', async () => {
      await approve(web3, user1, contracts.daiAddress, poolAddress, '100')
      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.daiAddress,
        tokenOut: erc20Token,
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

    it('#exitswapPoolAmountIn- user1 exit the pool receiving only DAI', async () => {
      const BPTAmountIn = '0.5'
      const minDAIOut = '0.5'

      const tx = await pool.exitswapPoolAmountIn(
        user1,
        poolAddress,
        BPTAmountIn,
        minDAIOut
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
      const nftFactory = new NftFactory(contracts.erc721FactoryAddress, web3)

      const nftData: NftCreateData = {
        name: '72120Bundle',
        symbol: '72Bundle',
        templateIndex: 1,
        tokenURI: 'https://oceanprotocol.com/nft/',
        transferable: true,
        owner: factoryOwner
      }

      const ercParams: Erc20CreateParams = {
        templateIndex: 1,
        minter: factoryOwner,
        paymentCollector: user2,
        mpFeeAddress: factoryOwner,
        feeToken: '0x0000000000000000000000000000000000000000',
        cap: '1000000',
        feeAmount: '0',
        name: 'ERC20B1',
        symbol: 'ERC20DT1Symbol'
      }

      const poolParams: PoolCreationParams = {
        ssContract: contracts.sideStakingAddress,
        baseTokenAddress: contracts.usdcAddress,
        baseTokenSender: contracts.erc721FactoryAddress,
        publisherAddress: factoryOwner,
        marketFeeCollector: factoryOwner,
        poolTemplateAddress: contracts.poolTemplateAddress,
        rate: '1',
        baseTokenDecimals: await usdcContract.methods.decimals().call(),
        vestingAmount: '10000',
        vestedBlocks: 2500000,
        initialBaseTokenLiquidity: await unitsToAmount(
          web3,
          contracts.usdcAddress,
          await amountToUnits(web3, contracts.usdcAddress, '2000')
        ),
        swapFeeLiquidityProvider: '0.001',
        swapFeeMarketRunner: '0.001'
      }

      const txReceipt = await nftFactory.createNftErc20WithPool(
        factoryOwner,
        nftData,
        ercParams,
        poolParams
      )

      initialBlock = await web3.eth.getBlockNumber()
      erc20Token = txReceipt.events.TokenCreated.returnValues.newTokenAddress
      poolAddress = txReceipt.events.NewPool.returnValues.poolAddress

      erc20Contract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], erc20Token)
      // user1 has no dt1
      expect(await erc20Contract.methods.balanceOf(user1).call()).to.equal('0')
    })

    it('#getBaseTokenBalance ', async () => {
      expect(
        await sideStaking.getBaseTokenBalance(sideStakingAddress, erc20Token)
      ).to.equal('0')
    })
    // it('#getDatatokenBalance ', async () => {
    //   expect(
    //     await sideStaking.getDatatokenBalance(sideStakingAddress, erc20Token)
    //   ).to.equal('997999.9999999999')
    // })

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
      expect(await erc20Contract.methods.balanceOf(factoryOwner).call()).to.equal('0')

      const tx = await sideStaking.getVesting(
        factoryOwner,
        sideStakingAddress,
        erc20Token
      )
      const collector = await erc20Contract.methods.getPaymentCollector().call()
      expect(
        await sideStaking.unitsToAmount(
          erc20Token,
          await erc20Contract.methods.balanceOf(collector).call()
        )
      ).to.equal(await sideStaking.getvestingAmountSoFar(sideStakingAddress, erc20Token))

      expect(
        await sideStaking.getvestingLastBlock(sideStakingAddress, erc20Token)
      ).to.equal((await web3.eth.getBlockNumber()).toString())
    })

    it('#swapExactAmountIn - should swap', async () => {
      const transferAmount = await amountToUnits(web3, contracts.usdcAddress, '1000') // 1000 USDC
      await usdcContract.methods
        .transfer(user1, transferAmount)
        .send({ from: factoryOwner })

      await approve(web3, user1, contracts.usdcAddress, poolAddress, '10')
      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.usdcAddress,
        tokenOut: erc20Token,
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
      expect(await erc20Contract.methods.balanceOf(user1).call()).to.equal(
        tx.events.LOG_SWAP.returnValues.tokenAmountOut
      )
    })

    it('#swapExactAmountOut - should swap', async () => {
      await approve(web3, user1, contracts.usdcAddress, poolAddress, '100')
      const tokenInOutMarket: TokenInOutMarket = {
        tokenIn: contracts.usdcAddress,
        tokenOut: erc20Token,
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
      // console.log(tx.events)
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

    it('#exitswapPoolAmountIn- user1 exit the pool receiving only USDC', async () => {
      const BPTAmountIn = '0.5'
      const minUSDCOut = '0.5'

      const tx = await pool.exitswapPoolAmountIn(
        user1,
        poolAddress,
        BPTAmountIn,
        minUSDCOut
      )

      assert(tx != null)

      expect(tx.events.LOG_EXIT[0].returnValues.tokenOut).to.equal(contracts.usdcAddress)

      // DTs were also unstaked in the same transaction (went to the staking contract)
      expect(tx.events.LOG_EXIT[1].returnValues.tokenOut).to.equal(erc20Token)
    })
  })
})
