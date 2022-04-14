import { assert } from 'chai'
import ERC20TemplateEnterprise from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20TemplateEnterprise.sol/ERC20TemplateEnterprise.json'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { deployContracts, Addresses } from '../../TestContractHandler'
import { AbiItem } from 'web3-utils'
import { web3 } from '../../config'
import {
  NftFactory,
  NftCreateData,
  Datatoken,
  Nft,
  OrderParams,
  DispenserParams,
  ZERO_ADDRESS,
  signHash
} from '../../../src'
import { ProviderFees, FreCreationParams, FreOrderParams } from '../../../src/@types/'

describe('Datatoken', () => {
  let nftOwner: string
  let user1: string
  let user2: string
  let user3: string
  let erc20DeployerUser: string
  let contracts: Addresses
  let nftDatatoken: Nft
  let datatoken: Datatoken
  let nftFactory: NftFactory
  let nftAddress: string
  let datatokenAddress: string
  let fixedRateAddress: string
  let exchangeId: string

  const nftName = 'NFTName'
  const nftSymbol = 'NFTSymbol'

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    nftOwner = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]
    user3 = accounts[3]
    erc20DeployerUser = accounts[4]
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, nftOwner)

    const daiContract = new web3.eth.Contract(
      MockERC20.abi as AbiItem[],
      contracts.daiAddress
    )
    await daiContract.methods
      .approve(contracts.erc721FactoryAddress, web3.utils.toWei('10000'))
      .send({ from: nftOwner })
  })

  it('should initialize NFTFactory instance and create a new NFT', async () => {
    nftFactory = new NftFactory(
      contracts.erc721FactoryAddress,
      web3,
      ERC721Factory.abi as AbiItem[]
    )
    const nftData: NftCreateData = {
      name: nftName,
      symbol: nftSymbol,
      templateIndex: 1,
      tokenURI: 'https://oceanprotocol.com/nft/',
      transferable: true,
      owner: nftOwner
    }

    nftAddress = await nftFactory.createNFT(nftOwner, nftData)
    nftDatatoken = new Nft(web3, ERC721Template.abi as AbiItem[])
  })

  it('#createERC20 - should create a new ERC20 DT from NFT contract', async () => {
    await nftDatatoken.addErc20Deployer(nftAddress, nftOwner, erc20DeployerUser)
    datatokenAddress = await nftDatatoken.createErc20(
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

  it('#addMinter - should add user1 as minter, if user has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)

    await datatoken.addMinter(datatokenAddress, nftOwner, user1)

    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)
  })

  it('#addMinter - should FAIL TO add user1 as minter, if user has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user3)) === false)
    assert((await datatoken.getDTPermissions(datatokenAddress, user2)).minter === false)

    try {
      await datatoken.addMinter(datatokenAddress, user3, user2)
    } catch (e) {
      assert(e.message === 'Caller is not ERC20Deployer')
    }

    assert((await datatoken.getDTPermissions(datatokenAddress, user2)).minter === false)
  })

  it('#mint - should mint ERC20 datatoken to user1, if Minter', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)
    await datatoken.mint(datatokenAddress, nftOwner, '10', user1)

    assert((await datatoken.balance(datatokenAddress, user1)) === '10')
  })

  it('#createFixedRate - should create FRE for the erc20 dt', async () => {
    const freParams: FreCreationParams = {
      fixedRateAddress: contracts.fixedRateAddress,
      baseTokenAddress: contracts.daiAddress,
      owner: nftOwner,
      marketFeeCollector: nftOwner,
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: web3.utils.toWei('1'),
      marketFee: '0'
    }
    const fre = await datatoken.createFixedRate(datatokenAddress, nftOwner, freParams)
    assert(fre !== null)
    fixedRateAddress = fre.events.NewFixedRate.address
    exchangeId = fre.events.NewFixedRate.returnValues[0]
  })

  it('#createFixedRate - should FAIL create FRE if NOT ERC20Deployer', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user3)) === false)
    const freParams: FreCreationParams = {
      fixedRateAddress: contracts.fixedRateAddress,
      baseTokenAddress: contracts.daiAddress,
      owner: nftOwner,
      marketFeeCollector: nftOwner,
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: web3.utils.toWei('1'),
      marketFee: '0'
    }
    try {
      await datatoken.createFixedRate(datatokenAddress, user3, freParams)
    } catch (e) {
      assert(e.message === 'User is not ERC20 Deployer')
    }
  })

  it('#createDispenser - method creates a dispenser for the erc20DT', async () => {
    const dispenserParams: DispenserParams = {
      maxTokens: '10',
      maxBalance: '100'
    }

    const dispenser = await datatoken.createDispenser(
      datatokenAddress,
      nftOwner,
      contracts.dispenserAddress,
      dispenserParams
    )
    assert(dispenser !== null)
  })

  it('#createDispenser - should FAIL to create a Dispenser if not ERC20 Deployer', async () => {
    const dispenserParams: DispenserParams = {
      maxTokens: '10',
      maxBalance: '100'
    }
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user3)) === false)
    try {
      await datatoken.createDispenser(
        datatokenAddress,
        user2,
        contracts.dispenserAddress,
        dispenserParams
      )
    } catch (e) {
      assert(e.message === 'User is not ERC20 Deployer')
    }
  })

  it('#removeMinter - should FAIL to remove user1 as minter, if caller is NOT ERC20Deployer', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user2)) === false)
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)

    try {
      await datatoken.removeMinter(datatokenAddress, user2, user1)
    } catch (e) {
      assert(e.message === 'Caller is not ERC20Deployer')
    }
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)
  })

  it('#removeMinter - should remove user1 as minter, if nftDatatoken has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === true)

    await datatoken.removeMinter(datatokenAddress, nftOwner, user1)

    assert((await datatoken.getDTPermissions(datatokenAddress, user1)).minter === false)
  })

  it('#addPaymentManager - should FAIL TO add user2 as paymentManager, if caller is NOT ERC20Deployer', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user1)) === false)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === false
    )

    try {
      await datatoken.addPaymentManager(datatokenAddress, user1, user2)
    } catch (e) {
      assert(e.message === 'Caller is not ERC20Deployer')
    }
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === false
    )
  })

  it('#addPaymentManager - should add user2 as paymentManager, if caller has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === false
    )

    await datatoken.addPaymentManager(datatokenAddress, nftOwner, user2)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === true
    )
  })

  it('#removePaymentManager - should FAIL TO remove user2 as paymentManager, if nftDatatoken has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user1)) === false)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === true
    )
    try {
      await datatoken.removePaymentManager(datatokenAddress, user1, user2)
    } catch (e) {
      assert(e.message === 'Caller is not ERC20Deployer')
    }

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === true
    )
  })

  it('#removePaymentManager - should remove user2 as paymentManager, if Caller has ERC20Deployer permission', async () => {
    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === true
    )

    await datatoken.removePaymentManager(datatokenAddress, nftOwner, user2)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === false
    )
  })

  it('#setPaymentCollector - should fail to set a new paymentCollector, if NOT PAYMENT Manager, NFT OWNER OR ERC 20 DEPLOYER', async () => {
    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user2)).paymentManager === false
    )

    try {
      await datatoken.setPaymentCollector(datatokenAddress, user1, user2)
    } catch (e) {
      assert(e.message === 'Caller is not Fee Manager, owner or erc20 Deployer')
    }
  })

  it('#setPaymentCollector - should set a new paymentCollector, if PAYMENT MANAGER', async () => {
    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user1)

    await datatoken.addPaymentManager(datatokenAddress, nftOwner, user1)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).paymentManager === true
    )

    await datatoken.setPaymentCollector(datatokenAddress, user1, user3)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)
  })

  it('#setPaymentCollector - should set a new paymentCollector, if NFT OWNER', async () => {
    assert((await nftDatatoken.getNftOwner(nftAddress)) === nftOwner)

    await datatoken.setPaymentCollector(datatokenAddress, nftOwner, user2)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user2)
  })

  it('#setPaymentCollector - should set a new paymentCollector, if ERC 20 DEPLOYER', async () => {
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, erc20DeployerUser))
        .deployERC20 === true
    )

    await datatoken.setPaymentCollector(datatokenAddress, erc20DeployerUser, user3)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)
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

    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = '0'
    const providerValidUntil = '0'
    const message = web3.utils.soliditySha3(
      { t: 'bytes', v: web3.utils.toHex(web3.utils.asciiToHex(providerData)) },
      { t: 'address', v: user3 },
      { t: 'address', v: providerFeeToken },
      { t: 'uint256', v: providerFeeAmount },
      { t: 'uint256', v: providerValidUntil }
    )
    const { v, r, s } = await signHash(web3, message, user3)
    const providerFees: ProviderFees = {
      providerFeeAddress: user3,
      providerFeeToken: providerFeeToken,
      providerFeeAmount: providerFeeAmount,
      v: v,
      r: r,
      s: s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const order = await datatoken.startOrder(
      datatokenAddress,
      user1,
      user2,
      1,
      providerFees
    )
    assert(order !== null)

    assert(
      (await datatoken.balance(datatokenAddress, user1)) === '9',
      'Invalid user balance, DT was not substracted'
    )
    assert(
      (await datatoken.balance(
        datatokenAddress,
        await datatoken.getPaymentCollector(datatokenAddress)
      )) === '0.97',
      'Invalid publisher reward, we should have 1 DT'
    )
  })

  it('#buyFromDispenserAndOrder- Enterprise method', async () => {
    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = '0'
    const dtAmount = web3.utils.toWei('1')
    const message = web3.utils.soliditySha3(
      { t: 'bytes', v: web3.utils.toHex(web3.utils.asciiToHex(providerData)) },
      { t: 'address', v: user3 },
      { t: 'address', v: providerFeeToken },
      { t: 'uint256', v: providerFeeAmount }
    )
    const { v, r, s } = await signHash(web3, message, user3)
    const providerValidUntil = '0'
    const providerFees: ProviderFees = {
      providerFeeAddress: user3,
      providerFeeToken: providerFeeToken,
      providerFeeAmount: providerFeeAmount,
      v: v,
      r: r,
      s: s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const consumeMarketFee = {
      consumeMarketFeeAddress: '0x0000000000000000000000000000000000000000',
      consumeMarketFeeToken: '0x0000000000000000000000000000000000000000',
      consumeMarketFeeAmount: '0'
    }
    const order: OrderParams = {
      consumer: user1,
      serviceIndex: 1,
      _providerFee: providerFees,
      _consumeMarketFee: consumeMarketFee
    }
    const buyFromDispenseTx = await datatoken.buyFromDispenserAndOrder(
      datatokenAddress,
      nftOwner,
      order,
      contracts.dispenserAddress
    )
    assert(buyFromDispenseTx !== null)
  })

  it('#buyFromFreAndOrder - Enterprise method ', async () => {
    const providerData = JSON.stringify({ timeout: 0 })
    const providerFeeToken = ZERO_ADDRESS
    const providerFeeAmount = '0'
    const message = web3.utils.soliditySha3(
      { t: 'bytes', v: web3.utils.toHex(web3.utils.asciiToHex(providerData)) },
      { t: 'address', v: user3 },
      { t: 'address', v: providerFeeToken },
      { t: 'uint256', v: providerFeeAmount }
    )
    const { v, r, s } = await signHash(web3, message, user3)
    const providerValidUntil = '0'
    const providerFees: ProviderFees = {
      providerFeeAddress: user1,
      providerFeeToken: providerFeeToken,
      providerFeeAmount: providerFeeAmount,
      v: v,
      r: r,
      s: s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const consumeMarketFee = {
      consumeMarketFeeAddress: '0x0000000000000000000000000000000000000000',
      consumeMarketFeeToken: '0x0000000000000000000000000000000000000000',
      consumeMarketFeeAmount: '0'
    }
    const order: OrderParams = {
      consumer: user1,
      serviceIndex: 1,
      _providerFee: providerFees,
      _consumeMarketFee: consumeMarketFee
    }

    const fre: FreOrderParams = {
      exchangeContract: fixedRateAddress,
      exchangeId: exchangeId,
      maxBaseTokenAmount: '1',
      swapMarketFee: '0.1',
      marketFeeAddress: '0x0000000000000000000000000000000000000000'
    }

    const buyTx = await datatoken.buyFromFreAndOrder(datatokenAddress, user1, order, fre)
    assert(buyTx !== null)
  })

  it('#cleanPermissions - should FAIL to clean permissions at ERC20 level, if NOT NFT Owner', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).paymentManager === true
    )

    try {
      await datatoken.cleanPermissions(datatokenAddress, user2)
    } catch (e) {
      assert(e.message === 'Caller is NOT Nft Owner')
    }

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)

    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).paymentManager === true
    )
  })

  it('#cleanPermissions - should clean permissions at ERC20 level', async () => {
    assert((await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === true)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === user3)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).paymentManager === true
    )

    await datatoken.cleanPermissions(datatokenAddress, nftOwner)

    assert((await datatoken.getPaymentCollector(datatokenAddress)) === nftOwner)

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, nftOwner)).minter === false
    )

    assert(
      (await datatoken.getDTPermissions(datatokenAddress, user1)).paymentManager === false
    )
  })

  it('#getERC721Address - should succeed to get the parent ERC721 address', async () => {
    const address = await datatoken.getNFTAddress(datatokenAddress)
    assert(address, 'Not able to get the parent ERC721 address')
  })

  it('#setData - should set a value into 725Y standard, if Caller has ERC20Deployer permission', async () => {
    const data = web3.utils.asciiToHex('SomeData')

    assert((await nftDatatoken.isErc20Deployer(nftAddress, nftOwner)) === true)

    await datatoken.setData(datatokenAddress, nftOwner, data)

    const key = web3.utils.keccak256(datatokenAddress)
    assert((await nftDatatoken.getData(nftAddress, key)) === data)
  })

  it('#setData - should FAIL to set a value into 725Y standard, if Caller has NOT ERC20Deployer permission', async () => {
    const data = web3.utils.asciiToHex('NewData')
    const OldData = web3.utils.asciiToHex('SomeData')
    assert((await nftDatatoken.isErc20Deployer(nftAddress, user1)) === false)

    try {
      await datatoken.setData(datatokenAddress, user1, data)
    } catch (e) {
      assert(e.message === 'User is not ERC20 Deployer')
    }
    const key = web3.utils.keccak256(datatokenAddress)
    assert((await nftDatatoken.getData(nftAddress, key)) === OldData)
  })
})
