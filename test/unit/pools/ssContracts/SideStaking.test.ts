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
import { NFTFactory, NFTCreateData } from '../../../../src/factories/NFTFactory'
import { Pool } from '../../../../src/pools/balancer/Pool'
import { SideStaking } from '../../../../src/pools/ssContracts/SideStaking'
import { Erc20CreateParams, PoolCreationParams } from '../../../../src/interfaces'
const { keccak256 } = require('@ethersproject/keccak256')
const web3 = new Web3('http://127.0.0.1:8545')
const communityCollector = '0xeE9300b7961e0a01d9f0adb863C7A227A07AaD75'

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
      const nftFactory = new NFTFactory(contracts.factory721Address, web3)

      const nftData: NFTCreateData = {
        name: '72120Bundle',
        symbol: '72Bundle',
        templateIndex: 1,
        baseURI: 'https://oceanprotocol.com/nft/'
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
        basetokenAddress: contracts.daiAddress,
        basetokenSender: contracts.factory721Address,
        publisherAddress: contracts.accounts[0],
        marketFeeCollector: contracts.accounts[0],
        poolTemplateAddress: contracts.poolTemplateAddress,
        rate: '1',
        basetokenDecimals: 18,
        vestingAmount: '10000',
        vestedBlocks: vestedBlocks,
        initialBasetokenLiquidity: '2000',
        swapFeeLiquidityProvider: 1e15,
        swapFeeMarketPlaceRunner: 1e15
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

    it('#getDataTokenCirculatingSupply - should get datatoken supply in circulation (vesting amount excluded)', async () => {
      expect(
        await sideStaking.getDataTokenCirculatingSupply(
          contracts.sideStakingAddress,
          erc20Token
        )
      ).to.equal(web3.utils.toWei('12000'))
    })
    // it('#getDataTokenCurrentCirculatingSupply - should get datatoken supply in circulation ', async () => {
    //   expect(
    //     await sideStaking.getDataTokenCurrentCirculatingSupply(
    //       contracts.sideStakingAddress,
    //       erc20Token
    //     )
    //   ).to.equal(web3.utils.toWei('2000'))
    // })
    it('#getBasetoken - should get basetoken address', async () => {
      expect(await sideStaking.getBasetoken(sideStakingAddress, erc20Token)).to.equal(
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
    it('#getBasetokenBalance ', async () => {
      expect(
        await sideStaking.getBasetokenBalance(sideStakingAddress, erc20Token)
      ).to.equal('0')
    })
    it('#getDatatokenBalance ', async () => {
      expect(
        await sideStaking.getDatatokenBalance(sideStakingAddress, erc20Token)
      ).to.equal('988000')
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
      const tx = await pool.swapExactAmountIn(
        user2,
        poolAddress,
        contracts.daiAddress,
        '10',
        erc20Token,
        '1'
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
      const tx = await pool.swapExactAmountOut(
        user2,
        poolAddress,
        contracts.daiAddress,
        '100',
        erc20Token,
        '50'
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
      const nftFactory = new NFTFactory(contracts.factory721Address, web3)

      const nftData: NFTCreateData = {
        name: '72120Bundle',
        symbol: '72Bundle',
        templateIndex: 1,
        baseURI: 'https://oceanprotocol.com/nft/'
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
        basetokenAddress: contracts.usdcAddress,
        basetokenSender: contracts.factory721Address,
        publisherAddress: contracts.accounts[0],
        marketFeeCollector: contracts.accounts[0],
        poolTemplateAddress: contracts.poolTemplateAddress,
        rate: '1',
        basetokenDecimals: await usdcContract.methods.decimals().call(),
        vestingAmount: '10000',
        vestedBlocks: 2500000,
        initialBasetokenLiquidity: web3.utils.fromWei(
          await pool.amountToUnits(contracts.usdcAddress, '2000')
        ),
        swapFeeLiquidityProvider: 1e15,
        swapFeeMarketPlaceRunner: 1e15
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

    it('#getBasetokenBalance ', async () => {
      expect(
        await sideStaking.getBasetokenBalance(sideStakingAddress, erc20Token)
      ).to.equal('0')
    })
    it('#getDatatokenBalance ', async () => {
      expect(
        await sideStaking.getDatatokenBalance(sideStakingAddress, erc20Token)
      ).to.equal('988000')
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
      const tx = await pool.swapExactAmountIn(
        user2,
        poolAddress,
        contracts.usdcAddress,
        '10',
        erc20Token,
        '1'
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
      const tx = await pool.swapExactAmountOut(
        user2,
        poolAddress,
        contracts.usdcAddress,
        '100',
        erc20Token,
        '50'
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
