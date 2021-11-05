import { assert } from 'chai'
import Web3 from 'web3'
import ERC20TemplateEnterprise from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20TemplateEnterprise.sol/ERC20TemplateEnterprise.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import Router from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import OPFCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'

import { TestContractHandler } from '../TestContractHandler'
import { NFTFactory } from '../../src/factories/NFTFactory'
import { Datatoken, NFTDatatoken, OrderParams, FreParams } from '../../src/datatokens'
import { AbiItem } from 'web3-utils'
import { LoggerInstance } from '../../src/utils'

const web3 = new Web3('http://127.0.0.1:8545')

describe('Datatoken', () => {
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let contractHandler: TestContractHandler
  let nftDatatoken: NFTDatatoken
  let datatoken: Datatoken
  let nftFactory: NFTFactory
  let nftAddress: string
  let datatokenAddress: string
  let fixedRateAddress: string
  let exchangeId: string

  const nftName = 'NFTName'
  const nftSymbol = 'NFTSymbol'

  it('should deploy contracts', async () => {
    contractHandler = new TestContractHandler(
      web3,
      ERC721Template.abi as AbiItem[],
      ERC20Template.abi as AbiItem[],
      PoolTemplate.abi as AbiItem[],
      ERC721Factory.abi as AbiItem[],
      Router.abi as AbiItem[],
      SideStaking.abi as AbiItem[],
      FixedRate.abi as AbiItem[],
      Dispenser.abi as AbiItem[],
      OPFCollector.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      Router.bytecode,
      SideStaking.bytecode,
      FixedRate.bytecode,
      Dispenser.bytecode,
      OPFCollector.bytecode
    )
    await contractHandler.getAccounts()
    nftOwner = contractHandler.accounts[0]
    user1 = contractHandler.accounts[1]
    user2 = contractHandler.accounts[2]
    user3 = contractHandler.accounts[3]
    await contractHandler.deployContracts(nftOwner, Router.abi as AbiItem[])

    const daiContract = new web3.eth.Contract(
      contractHandler.MockERC20.options.jsonInterface,
      contractHandler.daiAddress
    )
    await daiContract.methods
      .approve(contractHandler.factory721Address, web3.utils.toWei('10000'))
      .send({ from: contractHandler.accounts[0] })
  })

  it('should initialize NFTFactory instance and create a new NFT', async () => {
    nftFactory = new NFTFactory(
      contractHandler.factory721Address,
      web3,
      ERC721Factory.abi as AbiItem[]
    )
    const nftData = {
      name: nftName,
      symbol: nftSymbol,
      templateIndex: 1,
      baseURI: 'https://oceanprotocol.com/nft/'
    }

    nftAddress = await nftFactory.createNFT(nftOwner, nftData)
    nftDatatoken = new NFTDatatoken(web3, ERC721Template.abi as AbiItem[])
  })

  it('#createERC20 - should create a new ERC20 DT from NFT contract', async () => {
    // await nftDatatoken.addERC20Deployer(nftAddress, nftOwner, nftOwner)
    datatokenAddress = await nftDatatoken.createERC20(
      nftAddress,
      nftOwner,
      nftOwner,
      user1,
      user2,
      '0x0000000000000000000000000000000000000000',
      '0',
      '10000',
      nftName,
      nftSymbol,
      1
    )
    assert(datatokenAddress !== null)
  })

  it('should initialize DT20 Instance', async () => {
    datatoken = new Datatoken(
      web3,
      ERC20Template.abi as AbiItem[],
      ERC20TemplateEnterprise.abi as AbiItem[]
    )
  })

  it('#mint - should fail to mint DT20, if NOT Minter', async () => {
    // assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)
    try {
      await datatoken.mint(datatokenAddress, user1, '10', user1)
    } catch (e) {
      assert(e.message === 'Caller is not Minter')
    }
  })

  it('#addMinter - should add user1 as minter, if nftDatatoken has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)

    await datatoken.addMinter(datatokenAddress, nftOwner, user1)

    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)
  })

  it('#mint - should mint ERC20 datatoken to user1, if Minter', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)
    await datatoken.mint(datatokenAddress, nftOwner, '10', user1)

    assert((await datatoken.balance(datatokenAddress, user1)) === '10')
  })

  it('#createFixedRate - should create FRE for the erc20 dt', async () => {
    const fre = await datatoken.createFixedRate(
      datatokenAddress,
      nftOwner,
      contractHandler.fixedRateAddress,
      contractHandler.daiAddress,
      nftOwner,
      18,
      18,
      web3.utils.toWei('1'),
      1e15,
      1
    )
    assert(fre !== null)
    fixedRateAddress = fre.events.NewFixedRate.address
    exchangeId = fre.events.NewFixedRate.returnValues[0]
  })

  it('#createDispenser - method creates a dispenser for the erc20DT', async () => {
    const dispenser = await datatoken.createDispenser(
      datatokenAddress,
      nftOwner,
      contractHandler.dispenserAddress,
      '10',
      '100',
      true,
      user1
    )
    assert(dispenser !== null)
  })

  it('#removeMinter - should remove user1 as minter, if nftDatatoken has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)

    await datatoken.removeMinter(datatokenAddress, nftOwner, user1)

    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)
  })

  it('#addFeeManager - should add user2 as feeManager, if nftDatatoken has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).feeManager === false
    )

    await datatoken.addFeeManager(datatokenAddress, nftOwner, user2)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).feeManager === true
    )
  })

  it('#removeFeeManager - should remove user2 as feeManager, if nftDatatoken has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).feeManager === true
    )

    await datatoken.removeFeeManager(datatokenAddress, nftOwner, user2)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).feeManager === false
    )
  })

  it('#setFeeCollector - should fail to set a new feeCollector, if NOT Fee Manager', async () => {
    await datatoken.removeFeeManager(datatokenAddress, nftOwner, user2)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).feeManager === false
    )

    try {
      await datatoken.setFeeCollector(datatokenAddress, user1, user2)
    } catch (e) {
      assert(e.message === 'Caller is not Fee Manager')
    }
  })

  it('#setFeeCollector - should set a new feeCollector, if FEE MANAGER', async () => {
    assert((await datatoken.getFeeCollector(datatokenAddress)) === user2)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).feeManager === true
    )

    await datatoken.setFeeCollector(datatokenAddress, user1, user3)
    assert((await datatoken.getFeeCollector(datatokenAddress)) === user3)
  })

  it('#startOrder- user2 should create an order for DT ', async () => {
    assert(
      (await datatoken.balance(datatokenAddress, user1)) === '10',
      'User1 does not hold 10 datatokens'
    )
    assert(
      (await datatoken.balance(datatokenAddress, user2)) === '0',
      'User2 does not hold 0 datatokens'
    )

    const order = await datatoken.startOrder(
      datatokenAddress,
      user1,
      user2,
      '1',
      1,
      user3,
      '0x0000000000000000000000000000000000000000',
      '0'
    )
    assert(order !== null)

    assert(
      (await datatoken.balance(datatokenAddress, user1)) === '9',
      'Invalid user balance, DT was not substracted'
    )
    assert(
      (await datatoken.balance(
        datatokenAddress,
        await datatoken.getFeeCollector(datatokenAddress)
      )) === '1',
      'Invalid publisher reward, we should have 1 DT'
    )
  })

  it('#buyFromDispenserAndOrder- Enterprise method', async () => {
    const order: OrderParams = {
      consumer: user1,
      amount: '1',
      serviceId: 1,
      consumeFeeAddress: user1,
      consumeFeeToken: '0x0000000000000000000000000000000000000000',
      consumeFeeAmount: '0'
    }

    const buyFromDispenseTx = await datatoken.buyFromDispenserAndOrder(
      datatokenAddress,
      nftOwner,
      order,
      contractHandler.dispenserAddress
    )
    assert(buyFromDispenseTx !== null)
  })

  it('#buyFromFreAndOrder - Enterprise method ', async () => {
    const order: OrderParams = {
      consumer: user1,
      amount: '1',
      serviceId: 1,
      consumeFeeAddress: user1,
      consumeFeeToken: '0x0000000000000000000000000000000000000000',
      consumeFeeAmount: '0'
    }
    const fre: FreParams = {
      exchangeContract: fixedRateAddress,
      exchangeId: exchangeId,
      maxBaseTokenAmount: '1'
    }

    const buyTx = await datatoken.buyFromFreAndOrder(datatokenAddress, user1, order, fre)
    assert(buyTx !== null)
  })

  it('#cleanPermissions - should clean permissions at ERC20 level', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)

    assert((await datatoken.getFeeCollector(datatokenAddress)) === user3)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).feeManager === true
    )

    await datatoken.cleanPermissions(datatokenAddress, nftOwner)

    assert((await datatoken.getFeeCollector(datatokenAddress)) === nftOwner)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === false
    )

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).feeManager === false
    )
  })

  it('#setData - should set a value into 725Y standard, if nftDatatoken has ERC20Deployer permission', async () => {
    const data = web3.utils.asciiToHex('SomeData')

    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)

    await datatoken.setData(datatokenAddress, nftOwner, data)

    const key = web3.utils.keccak256(datatokenAddress)
    assert((await nftDatatoken.getData(nftAddress, key)) === data)
  })
})
