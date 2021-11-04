import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../../TestContractHandler'
import { Contract } from 'web3-eth-contract'
import Web3 from 'web3'
import BigNumber from 'bignumber.js'
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
  let exchangeId: string
  let contracts: TestContractHandler
  let fixedRate: FixedRateExchange
  let dtAddress: string
  let dtAddress2: string
  let dtContract: Contract
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
        addresses: [
          contracts.accounts[0],
          user3,
          contracts.accounts[0],
          '0x0000000000000000000000000000000000000000'
        ],
        uints: [web3.utils.toWei('1000000'), 0],
        bytess: []
      }

      //[baseToken,owner,marketFeeCollector,allowedSwapper]
      const fixedRateData = {
        fixedPriceAddress:contracts.fixedRateAddress,
        addresses:[contracts.daiAddress,exchangeOwner,user3, '0x0000000000000000000000000000000000000000'],
        uints:[18,18,web3.utils.toWei('1'),1e15,0]
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
      fixedRate = new FixedRateExchange(web3, LoggerInstance, fixedRateAddress, FixedRate.abi as AbiItem[],contracts.oceanAddress)
      assert(fixedRate != null)
    })

    it('#isActive - should return true if exchange is active', async () => {
      expect(await fixedRate.isActive(exchangeId)).to.equal(
        true
      )
      expect(await fixedRate.isActive('0x00')).to.equal(
        false
      )
    })

  })
})
