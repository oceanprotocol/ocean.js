import { assert, expect } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../TestContractHandler'
import Web3 from 'web3'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import Router from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import OPFCommunityFeeCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import { LoggerInstance } from '../../src/utils'
// import { NFTDataToken } from '../../../src/datatokens/NFTDatatoken'
import { NFTFactory } from '../../src/factories/NFTFactory'

const web3 = new Web3('http://127.0.0.1:8545')

describe('NFT Factory test', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let contracts: TestContractHandler
  let nftFactory: NFTFactory
  let dtAddress: string
  let dtAddress2: string
  let nftAddress: string

  it('should deploy contracts', async () => {
    contracts = new TestContractHandler(
      web3,
      ERC721Template.abi as AbiItem[],
      ERC20Template.abi as AbiItem[],
      PoolTemplate.abi as AbiItem[],
      ERC721Factory.abi as AbiItem[],
      Router.abi as AbiItem[],
      SideStaking.abi as AbiItem[],
      FixedRate.abi as AbiItem[],
      Dispenser.abi as AbiItem[],
      OPFCommunityFeeCollector.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      Router.bytecode,
      SideStaking.bytecode,
      FixedRate.bytecode,
      Dispenser.bytecode,
      OPFCommunityFeeCollector.bytecode
    )
    await contracts.getAccounts()
    factoryOwner = contracts.accounts[0]
    nftOwner = contracts.accounts[1]
    user1 = contracts.accounts[2]
    user2 = contracts.accounts[3]
    user3 = contracts.accounts[4]

    await contracts.deployContracts(factoryOwner, Router.abi as AbiItem[])

    console.log(
      'address',
      contracts.factory721Address,
      contracts.poolTemplateAddress,
      contracts.routerAddress,
      contracts.fixedRateAddress,
      contracts.dispenserAddress,
      contracts.sideStakingAddress,
      contracts.template721Address,
      contracts.template20Address
    )
    const daiContract = new web3.eth.Contract(
      contracts.MockERC20.options.jsonInterface,
      contracts.daiAddress
    )
    await daiContract.methods
      .approve(contracts.factory721Address, web3.utils.toWei('10000'))
      .send({ from: contracts.accounts[0] })
  })

  it('should initiate NFTFactory instance', async () => {
    nftFactory = new NFTFactory(contracts.factory721Address, web3, LoggerInstance)
  })

  it('#getCurrentNFTCount - should return actual nft count (0)', async () => {
    const nftCount = await nftFactory.getCurrentNFTCount()
    expect(nftCount).to.equal('0')
  })

  it('#getCurrentTokenCount - should return actual token count (0)', async () => {
    const tokenCount = await nftFactory.getCurrentTokenCount()
    expect(tokenCount).to.equal('0')
  })
  it('#getOwner - should return actual owner', async () => {
    const owner = await nftFactory.getOwner()
    assert(owner === contracts.accounts[0])
  })
  it('#getCurrentNFTTemplateCount - should return actual nft template count (1)', async () => {
    const nftTemplateCount = await nftFactory.getCurrentNFTTemplateCount()
    expect(nftTemplateCount).to.equal('1')
  })
  it('#getCurrentTokenTemplateCount - should return actual token template count (1)', async () => {
    const tokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()
    expect(tokenTemplateCount).to.equal('1')
  })
  it('#getNFTTemplate - should return NFT template struct', async () => {
    const nftTemplate = await nftFactory.getNFTTemplate(1)
    assert(nftTemplate.isActive === true)
    assert(nftTemplate.templateAddress === contracts.template721Address)
  })
  it('#getTokenTemplate - should return Token template struct', async () => {
    const tokenTemplate = await nftFactory.getTokenTemplate(1)
    assert(tokenTemplate.isActive === true)
    assert(tokenTemplate.templateAddress === contracts.template20Address)
  })
  it('#addNFTTemplate - should add NFT template if factory owner', async () => {
    await nftFactory.addNFTTemplate(contracts.accounts[0], contracts.fixedRateAddress) // contracts.fixedRateAddress it's just a dummy contract in this case
    const nftTemplateCount = await nftFactory.getCurrentNFTTemplateCount()
    expect(nftTemplateCount).to.equal('2')
    const nftTemplate = await nftFactory.getNFTTemplate(2)
    assert(nftTemplate.isActive === true)
    assert(nftTemplate.templateAddress === contracts.fixedRateAddress)
  })
  it('#disableNFTTemplate - should disable NFT template if factory owner', async () => {
    let nftTemplate = await nftFactory.getNFTTemplate(2)
    assert(nftTemplate.isActive === true)
    await nftFactory.disableNFTTemplate(contracts.accounts[0], 2) // owner disables template index = 2

    nftTemplate = await nftFactory.getNFTTemplate(2)
    assert(nftTemplate.isActive === false)
  })
  it('#reactivateNFTTemplate - should disable NFT template if factory owner', async () => {
    let nftTemplate = await nftFactory.getNFTTemplate(2)
    assert(nftTemplate.isActive === false)
    await nftFactory.reactivateNFTTemplate(contracts.accounts[0], 2) // owner reactivates template index = 2

    nftTemplate = await nftFactory.getNFTTemplate(2)
    assert(nftTemplate.isActive === true)
  })
  it('#addTokenTemplate - should add Datatoken template if factory owner', async () => {
    await nftFactory.addTokenTemplate(contracts.accounts[0], contracts.fixedRateAddress) // contracts.fixedRateAddress it's just a dummy contract in this case
    const tokenTemplateCount = await nftFactory.getCurrentTokenTemplateCount()
    expect(tokenTemplateCount).to.equal('2')
    const nftTemplate = await nftFactory.getTokenTemplate(2)
    assert(nftTemplate.isActive === true)
    assert(nftTemplate.templateAddress === contracts.fixedRateAddress)
  })

  it('#disableTokenTemplate - should disable Token template if factory owner', async () => {
    let tokenTemplate = await nftFactory.getTokenTemplate(2)
    assert(tokenTemplate.isActive === true)
    await nftFactory.disableTokenTemplate(contracts.accounts[0], 2) // owner disables template index = 2

    tokenTemplate = await nftFactory.getTokenTemplate(2)
    assert(tokenTemplate.isActive === false)
  })
  it('#reactivateTokenTemplate - should disable Token template if factory owner', async () => {
    let tokenTemplate = await nftFactory.getTokenTemplate(2)
    assert(tokenTemplate.isActive === false)
    await nftFactory.reactivateTokenTemplate(contracts.accounts[0], 2) // owner reactivates template index = 2

    tokenTemplate = await nftFactory.getTokenTemplate(2)
    assert(tokenTemplate.isActive === true)
  })

  it('#createNftwithErc - should create an NFT and a Datatoken ', async () => {
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
        user2,
        '0x0000000000000000000000000000000000000000'
      ],
      uints: [web3.utils.toWei('10000'), 0],
      bytess: []
    }

    const txReceipt = await nftFactory.createNftWithErc(
      contracts.accounts[0],
      nftData,
      ercData
    )

    // EVENTS HAVE BEEN EMITTED
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')

    // stored for later use in startMultipleTokenOrder test
    nftAddress = txReceipt.events.NFTCreated.returnValues.newTokenAddress
    dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('#createNftErcWithPool- should create an NFT, a Datatoken and a pool DT/DAI', async () => {
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
      addresses: [user2, user3, user2, '0x0000000000000000000000000000000000000000'],
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

    const txReceipt = await nftFactory.createNftErcWithPool(
      contracts.accounts[0],
      nftData,
      ercData,
      poolData
    )

    // EVENTS HAVE BEEN EMITTED
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')
    expect(txReceipt.events.NewPool.event === 'NewPool')
  })

  it('#createNftErcWithFixedRate- should create an NFT, a datatoken and create a Fixed Rate Exchange', async () => {
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
        user2,
        '0x0000000000000000000000000000000000000000'
      ],
      uints: [web3.utils.toWei('1000000'), 0],
      bytess: []
    }

    const fixedData = {
      fixedPriceAddress: contracts.fixedRateAddress,
      addresses: [
        contracts.daiAddress,
        contracts.accounts[0],
        contracts.accounts[0],
        contracts.accounts[0]
      ],
      uints: [18, 18, web3.utils.toWei('1'), 1e15, 0]
    }

    const txReceipt = await nftFactory.createNftErcWithFixedRate(
      contracts.accounts[0],
      nftData,
      ercData,
      fixedData
    )

    // EVENTS HAVE BEEN EMITTED
    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')
    expect(txReceipt.events.NewFixedRate.event === 'NewFixedRate')

    // stored for later use in startMultipleTokenOrder test
    dtAddress2 = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('#startMultipleTokenOrder- should succed to start multiple orders', async () => {
    const consumer = user2 // could be different user
    const dtAmount = web3.utils.toWei('1')
    const serviceId = 1 // dummy index
    const consumeFeeAddress = user3 // marketplace fee Collector
    const consumeFeeAmount = 0 // fee to be collected on top, requires approval
    const consumeFeeToken = contracts.daiAddress // token address for the feeAmount, in this case DAI

    // we reuse a DT created in a previous test
    const dtContract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress)
    expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')

    // dt owner mint dtAmount to user2
    await dtContract.methods.mint(user2, dtAmount).send({ from: contracts.accounts[0] })

    // user2 approves NFTFactory to move his dtAmount
    await dtContract.methods
      .approve(contracts.factory721Address, dtAmount)
      .send({ from: user2 })

    // we reuse another DT created in a previous test
    const dtContract2 = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress2)
    expect(await dtContract2.methods.balanceOf(user2).call()).to.equal('0')

    // dt owner mint dtAmount to user2
    await dtContract2.methods.mint(user2, dtAmount).send({ from: contracts.accounts[0] })
    // user2 approves NFTFactory to move his dtAmount
    await dtContract2.methods
      .approve(contracts.factory721Address, dtAmount)
      .send({ from: user2 })

    // we check user2 has enought DTs
    expect(await dtContract.methods.balanceOf(user2).call()).to.equal(dtAmount)
    expect(await dtContract2.methods.balanceOf(user2).call()).to.equal(dtAmount)

    const orders = [
      {
        tokenAddress: dtAddress,
        consumer: consumer,
        amount: dtAmount,
        serviceId: serviceId,
        consumeFeeAddress: consumeFeeAddress,
        consumeFeeToken: consumeFeeToken,
        consumeFeeAmount: consumeFeeAmount
      },
      {
        tokenAddress: dtAddress2,
        consumer: consumer,
        amount: dtAmount,
        serviceId: serviceId,
        consumeFeeAddress: consumeFeeAddress,
        consumeFeeToken: consumeFeeToken,
        consumeFeeAmount: consumeFeeAmount
      }
    ]

    await nftFactory.startMultipleTokenOrder(user2, orders)

    // we check user2 has no more DTs
    expect(await dtContract.methods.balanceOf(user2).call()).to.equal('0')
    expect(await dtContract2.methods.balanceOf(user2).call()).to.equal('0')
  })
  it('#checkDatatoken - should confirm if DT is from the factory', async () => {
    assert((await nftFactory.checkDatatoken(dtAddress)) === true)
    assert((await nftFactory.checkDatatoken(dtAddress2)) === true)
    assert((await nftFactory.checkDatatoken(user2)) === false)
    assert((await nftFactory.checkDatatoken(nftAddress)) === false)
  })

  it('#checkNFT - should return nftAddress if from the factory, or address(0) if not', async () => {
    assert(
      (await nftFactory.checkNFT(dtAddress)) ===
        '0x0000000000000000000000000000000000000000'
    )
    assert((await nftFactory.checkNFT(nftAddress)) === nftAddress)
  })
})
