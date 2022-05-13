import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { deployContracts, Addresses } from '../../TestContractHandler'
import { web3 } from '../../config'
import {
  NftFactory,
  NftCreateData,
  ZERO_ADDRESS,
  GASLIMIT_DEFAULT,
  TokenOrder,
  signHash
} from '../../../src/'
import {
  DispenserCreationParams,
  Erc20CreateParams,
  FreCreationParams,
  PoolCreationParams,
  ProviderFees
} from '../../../src/@types'

describe('estimateGas() function', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let contracts: Addresses
  let nftFactory: NftFactory
  let dtAddress: string

  const FEE = '0.001'

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
    minter: nftOwner,
    paymentCollector: user2,
    mpFeeAddress: user1,
    feeToken: ZERO_ADDRESS,
    cap: '1000000',
    feeAmount: '0',
    name: 'ERC20B1',
    symbol: 'ERC20DT1Symbol'
  }

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    factoryOwner = accounts[0]
    nftOwner = accounts[1]
    user1 = accounts[2]
    user2 = accounts[3]

    nftData.owner = factoryOwner
    ercParams.minter = nftOwner
    ercParams.paymentCollector = user2
    ercParams.mpFeeAddress = user1
  })

  it('should deploy contracts', async () => {
    contracts = await deployContracts(web3, factoryOwner)
  })

  it('should initiate NFTFactory instance', async () => {
    nftFactory = new NftFactory(contracts.erc721FactoryAddress, web3)
  })

  it('nftFactory.estGasCreateNFT()', async () => {
    assert(
      (await nftFactory.estGasCreateNFT(nftOwner, nftData)) !==
        GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasCreateNftWithErc20()', async () => {
    assert(
      (await nftFactory.estGasCreateNftWithErc20(nftOwner, nftData, ercParams)) !==
        GASLIMIT_DEFAULT.toString()
    )

    const txReceipt = await nftFactory.createNftWithErc20(nftOwner, nftData, ercParams)

    // stored for later use in startMultipleTokenOrder test
    dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
  })

  it('nftFactory.estGasCreateNftErc20WithPool()', async () => {
    // we prepare transaction parameters objects
    const poolParams: PoolCreationParams = {
      ssContract: contracts.sideStakingAddress,
      baseTokenAddress: contracts.daiAddress,
      baseTokenSender: contracts.erc721FactoryAddress,
      publisherAddress: nftOwner,
      marketFeeCollector: nftOwner,
      poolTemplateAddress: contracts.poolTemplateAddress,
      rate: '1',
      baseTokenDecimals: 18,
      vestingAmount: '10000',
      vestedBlocks: 2500000,
      initialBaseTokenLiquidity: '2000',
      swapFeeLiquidityProvider: FEE,
      swapFeeMarketRunner: FEE
    }

    // approve poolParams.vestingAmount DAI to nftFactory
    const daiContract = new web3.eth.Contract(
      MockERC20.abi as AbiItem[],
      contracts.daiAddress
    )

    await daiContract.methods
      .transfer(nftOwner, web3.utils.toWei(poolParams.vestingAmount))
      .send({ from: factoryOwner })

    await daiContract.methods
      .approve(contracts.erc721FactoryAddress, web3.utils.toWei(poolParams.vestingAmount))
      .send({ from: nftOwner })

    assert(
      (await nftFactory.estGasCreateNftErc20WithPool(
        nftOwner,
        nftData,
        ercParams,
        poolParams
      )) !== GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasCreateNftErc20WithFixedRate()', async () => {
    // we prepare transaction parameters objects
    const freParams: FreCreationParams = {
      fixedRateAddress: contracts.fixedRateAddress,
      baseTokenAddress: contracts.daiAddress,
      owner: nftOwner,
      marketFeeCollector: nftOwner,
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: FEE,
      allowedConsumer: user1,
      withMint: false
    }

    assert(
      (await nftFactory.estGasCreateNftErc20WithFixedRate(
        nftOwner,
        nftData,
        ercParams,
        freParams
      )) !== GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasCreateNftErc20WithDispenser()', async () => {
    // we prepare transaction parameters objects
    const dispenerParams: DispenserCreationParams = {
      dispenserAddress: contracts.dispenserAddress,
      maxTokens: '1',
      maxBalance: '1',
      withMint: true,
      allowedSwapper: ZERO_ADDRESS
    }

    assert(
      (await nftFactory.estGasCreateNftErc20WithDispenser(
        nftOwner,
        nftData,
        ercParams,
        dispenerParams
      )) !== GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasAddNFTTemplate()', async () => {
    assert(
      (await nftFactory.estGasAddNFTTemplate(
        factoryOwner,
        contracts.erc721TemplateAddress
      )) !== GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasAddNFTTemplate()', async () => {
    assert(
      (await nftFactory.estGasAddNFTTemplate(
        factoryOwner,
        contracts.erc721TemplateAddress
      )) !== GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasDisableNFTTemplate()', async () => {
    assert(
      (await nftFactory.estGasDisableNFTTemplate(factoryOwner, 1)) !==
        GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasReactivateNFTTemplate()', async () => {
    assert(
      (await nftFactory.estGasReactivateNFTTemplate(factoryOwner, 1)) !==
        GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasAddNFTTemplate()', async () => {
    assert(
      (await nftFactory.estGasAddNFTTemplate(
        factoryOwner,
        contracts.erc721TemplateAddress
      )) !== GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasAddTokenTemplate()', async () => {
    assert(
      (await nftFactory.estGasAddTokenTemplate(
        factoryOwner,
        contracts.erc20TemplateAddress
      )) !== GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasDisableTokenTemplate()', async () => {
    assert(
      (await nftFactory.estGasDisableTokenTemplate(factoryOwner, 1)) !==
        GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasReactivateTokenTemplate()', async () => {
    assert(
      (await nftFactory.estGasReactivateTokenTemplate(factoryOwner, 1)) !==
        GASLIMIT_DEFAULT.toString()
    )
  })

  it('nftFactory.estGasReactivateTokenTemplate()', async () => {
    const DATA_TOKEN_AMOUNT = web3.utils.toWei('2')
    const consumeFeeAmount = '0' // fee to be collected on top, requires approval
    const consumeFeeToken = contracts.daiAddress // token address for the feeAmount, in this case DAI
    const providerData = JSON.stringify({ timeout: 0 })
    const providerValidUntil = '0'

    // we reuse a DT created in a previous test
    const dtContract = new web3.eth.Contract(ERC20Template.abi as AbiItem[], dtAddress)

    // dt owner mint DATA_TOKEN_AMOUNT to user1
    await dtContract.methods.mint(user1, DATA_TOKEN_AMOUNT).send({ from: nftOwner })

    // user1 approves NFTFactory to move his DATA_TOKEN_AMOUNT
    await dtContract.methods
      .approve(contracts.erc721FactoryAddress, DATA_TOKEN_AMOUNT)
      .send({ from: user1 })

    const message = web3.utils.soliditySha3(
      { t: 'bytes', v: web3.utils.toHex(web3.utils.asciiToHex(providerData)) },
      { t: 'address', v: user2 },
      { t: 'address', v: consumeFeeToken },
      { t: 'uint256', v: web3.utils.toWei(consumeFeeAmount) },
      { t: 'uint256', v: providerValidUntil }
    )

    const { v, r, s } = await signHash(web3, message, user2)
    const providerFees: ProviderFees = {
      providerFeeAddress: user2,
      providerFeeToken: consumeFeeToken,
      providerFeeAmount: consumeFeeAmount,
      v: v,
      r: r,
      s: s,
      providerData: web3.utils.toHex(web3.utils.asciiToHex(providerData)),
      validUntil: providerValidUntil
    }
    const consumeMarketFee = {
      consumeMarketFeeAddress: ZERO_ADDRESS,
      consumeMarketFeeToken: ZERO_ADDRESS,
      consumeMarketFeeAmount: '0'
    }
    const orders: TokenOrder[] = [
      {
        tokenAddress: dtAddress,
        consumer: user1,
        serviceIndex: 1,
        _providerFee: providerFees,
        _consumeMarketFee: consumeMarketFee
      },
      {
        tokenAddress: dtAddress,
        consumer: user1,
        serviceIndex: 1,
        _providerFee: providerFees,
        _consumeMarketFee: consumeMarketFee
      }
    ]

    assert(
      (await nftFactory.estGasStartMultipleTokenOrder(user1, orders)) !==
        GASLIMIT_DEFAULT.toString()
    )
  })
})
