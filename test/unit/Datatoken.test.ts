import { assert } from 'chai'
import Web3 from 'web3'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import { TestContractHandler } from '../TestContractHandler'
import { NFTFactory } from '../../src/factories/NFTFactory'
import { Datatoken, NFTDatatoken } from '../../src/datatokens'
import { AbiItem } from 'web3-utils'
import { LoggerInstance } from '../../src/utils'

const web3 = new Web3('http://127.0.0.1:8545')

describe('Datatoken', () => {
  let nftOwner: string
  let user1: string
  let user2: string
  let contractHandler: TestContractHandler
  let nftDatatoken: NFTDatatoken
  let datatoken: Datatoken
  let nftFactory: NFTFactory
  let nftAddress: string
  let datatokenAddress: string

  const nftName = 'NFTName'
  const nftSymbol = 'NFTSymbol'
  const publishMarketFeeAdress = '0xeE9300b7961e0a01d9f0adb863C7A227A07AaD75'
  const oceanAddress = '0x967da4048cd07ab37855c090aaf366e4ce1b9f48'

  it('should deploy contracts', async () => {
    contractHandler = new TestContractHandler(
      web3,
      ERC721Template.abi as AbiItem,
      ERC20Template.abi as AbiItem,
      PoolTemplate.abi as AbiItem,
      ERC721Factory.abi as AbiItem
    )
    await contractHandler.getAccounts()
    nftOwner = contractHandler.accounts[0]
    user1 = contractHandler.accounts[1]
    user2 = contractHandler.accounts[2]
    await contractHandler.deployContracts(nftOwner)
  })

  it('should initialize NFTFactory instance and create a new NFT', async () => {
    nftFactory = new NFTFactory(
      contractHandler.factory721Address,
      web3,
      ERC721Factory.abi as AbiItem
    )
    nftAddress = await nftFactory.createNFT(nftOwner, nftName, nftSymbol, 1)
    nftDatatoken = new NFTDatatoken(web3, ERC721Template.abi as AbiItem)
  })

  it('#createERC20 - should create a new ERC20 DT from NFT contract', async () => {
    await nftDatatoken.addERC20Deployer(nftAddress, nftOwner, nftOwner)
    datatokenAddress = await nftDatatoken.createERC20(
      nftAddress,
      nftOwner,
      nftOwner,
      nftOwner,
      publishMarketFeeAdress,
      oceanAddress,
      '0,1',
      '10000',
      nftName,
      nftSymbol,
      1
    )
    assert(datatokenAddress !== null)
  })

  it('should initialize DT20 Instance', async () => {
    datatoken = new Datatoken(web3, ERC20Template.abi as AbiItem)
  })

  it('#mint - should fail to mint DT20, if NOT Minter', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)
    try {
      await datatoken.mint(datatokenAddress, user1, '10', user1)
    } catch (e) {
      assert(e.message === 'Caller is not Minter')
    }
  })

  it('#addMinter - should add user1 as minter, if nftDatatoken has ERC20Deployer permission', async () => {
    assert(
      (await nftDatatoken.getNFTPermissions(nftAddress, nftOwner)).deployERC20 === true
    )
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)

    await datatoken.addMinter(datatokenAddress, nftOwner, user1)

    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)
  })

  it('#mint - should mint ERC20 datatoken to user1, if Minter', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)
    await datatoken.mint(datatokenAddress, nftOwner, '10', user1)

    assert((await datatoken.balance(datatokenAddress, user1)) === '10')
  })

  it('#removeMinter - should remove user1 as minter, if nftDatatoken has ERC20Deployer permission', async () => {
    assert(
      (await nftDatatoken.getNFTPermissions(nftAddress, nftOwner)).deployERC20 === true
    )
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)

    await datatoken.removeMinter(datatokenAddress, nftOwner, user1)

    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)
  })

  it('#addFeeManager - should add user2 as feeManager, if nftDatatoken has ERC20Deployer permission', async () => {
    assert(
      (await nftDatatoken.getNFTPermissions(nftAddress, nftOwner)).deployERC20 === true
    )
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).feeManager === false
    )

    await datatoken.addFeeManager(datatokenAddress, nftOwner, user2)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).feeManager === true
    )
  })

  it('#removeFeeManager - should remove user2 as feeManager, if nftDatatoken has ERC20Deployer permission', async () => {
    assert(
      (await nftDatatoken.getNFTPermissions(nftAddress, nftOwner)).deployERC20 === true
    )
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).feeManager === true
    )

    await datatoken.removeFeeManager(datatokenAddress, nftOwner, user2)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).feeManager === false
    )
  })

  it('#setFeeCollector - should fail to set a new feeCollector, if NOT Fee Manager', async () => {
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).feeManager === false
    )

    try {
      await datatoken.setFeeCollector(datatokenAddress, user1, user1)
    } catch (e) {
      assert(e.message === 'Caller is not Fee Manager')
    }
  })

  it('#setFeeCollector - should set a new feeCollector, if FEE MANAGER', async () => {
    assert((await datatoken.getFeeCollector(datatokenAddress)) === nftOwner)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).feeManager === false
    )

    await datatoken.addFeeManager(datatokenAddress, nftOwner, user1)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).feeManager === true
    )

    await datatoken.setFeeCollector(datatokenAddress, user1, user2)
    assert((await datatoken.getFeeCollector(datatokenAddress)) === user2)
  })

  it('#cleanPermissions - should clean permissions at ERC20 level', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)

    assert((await datatoken.getFeeCollector(datatokenAddress)) === user2)

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

    assert(
      (await nftDatatoken.getNFTPermissions(nftAddress, nftOwner)).deployERC20 === true
    )

    await datatoken.setData(datatokenAddress, nftOwner, data)

    const key = web3.utils.keccak256(datatokenAddress)
    assert((await nftDatatoken.getData(nftAddress, key)) === data)
  })
})
