import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { deployContracts, Addresses } from '../../TestContractHandler'
import { web3 } from '../../config'
import { NftFactory, NftCreateData, ZERO_ADDRESS, GASLIMIT_DEFAULT } from '../../../src/'
import {
  DispenserCreationParams,
  Erc20CreateParams,
  FreCreationParams,
  PoolCreationParams
} from '../../../src/@types'

describe('estimateGas() function', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let contracts: Addresses
  let nftFactory: NftFactory

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
})
