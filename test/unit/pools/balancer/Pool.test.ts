import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../../TestContractHandler'
import Web3 from 'web3'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import FactoryRouter from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import { LoggerInstance } from '../../../../src/utils'
import { NFTFactory } from '../../../../src/factories/NFTFactory'
import { Pool } from '../../../../src/pools/balancer/Pool'
const { keccak256 } = require('@ethersproject/keccak256')
const web3 = new Web3('http://127.0.0.1:8545')
const communityCollector = '0xeE9300b7961e0a01d9f0adb863C7A227A07AaD75'

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

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      FactoryRouter.bytecode,
      SideStaking.bytecode,
      FixedRate.bytecode,
      Dispenser.bytecode
    )
    await contracts.getAccounts()
    factoryOwner = contracts.accounts[0]
    nftOwner = contracts.accounts[1]
    user1 = contracts.accounts[2]
    user2 = contracts.accounts[3]
    user3 = contracts.accounts[4]

    await contracts.deployContracts(factoryOwner, FactoryRouter.abi as AbiItem[])

    const daiContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.daiAddress
    )
    await daiContract.methods
      .approve(contracts.factory721Address, web3.utils.toWei('10000'))
      .send({ from: contracts.accounts[0] })

    expect(await daiContract.methods.balanceOf(contracts.accounts[0]).call()).to.equal(
      web3.utils.toWei('100000')
    )
  })

  it('should initiate Pool instance', async () => {
    pool = new Pool(web3, LoggerInstance,PoolTemplate.abi as AbiItem[])
    
  })

 
  it('#create a pool', async () => {
    // CREATE A POOL
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
      addresses: [
        contracts.accounts[0],
        user3,
        contracts.accounts[0],
        '0x0000000000000000000000000000000000000000'
      ],
      uints: [web3.utils.toWei('1000000'), 0],
      bytess: []
    }

    const poolData = {
      addresses: [
        contracts.sideStakingAddress,
        contracts.daiAddress,
        contracts.factory721Address,
        contracts.accounts[0],
        contracts.accounts[0],
        contracts.poolTemplateAddress
      ],
      ssParams: [
        web3.utils.toWei('1'), // rate
        18, // basetokenDecimals
        web3.utils.toWei('10000'),
        2500000, // vested blocks
        web3.utils.toWei('2000') // baseToken initial pool liquidity
      ],
      swapFees: [
        1e15, //
        1e15
      ]
    }

    const nftFactory = new NFTFactory(contracts.factory721Address, web3, LoggerInstance)

    const txReceipt = await nftFactory.createNftErcWithPool(
      contracts.accounts[0],
      nftData,
      ercData,
      poolData
    )

    erc20Token = txReceipt.events.TokenCreated.returnValues.newTokenAddress
    poolAddress = txReceipt.events.NewPool.returnValues.poolAddress
    
    

    const erc20Contract = new web3.eth.Contract(
      ERC20Template.abi as AbiItem[],
      erc20Token
    )
    // user2 has no dt1
    expect(await erc20Contract.methods.balanceOf(user2).call()).to.equal('0')


    
  })

  it('#getCurrentTokens - should return current pool tokens', async () => {
      const currentTokens = await pool.getCurrentTokens(poolAddress)
      expect(currentTokens[0]).to.equal(erc20Token)
      expect(currentTokens[1]).to.equal(contracts.daiAddress)
    
  })


})
