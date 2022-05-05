/// # Ocean.js Code Examples

/// ## Introduction

/// The following guide runs you through the process of using ocean.js to publish and then consume a dataset. The code examples below are all working and you can learn how to publish by following along.
/// The process involves creating a Data NFT (which represents the base-IP on-chain) and a datatoken (which will be used to purchase the dataset). This guide provides all the code you need and no prior knowledge is required. It is helpful if you have some experience with javascript but it is not necessary.

/// Selling your data over the blockchain puts you in charge of how it is used and can be a great source of passive income. There are many AI startups that have deep expertise in machine learning but need more data to improve their models. Selling your data via the blockchain gives you a level of security that you would be unable to achieve if you were selling via a centralised marketplace.

/// In this guide we'll be making use of the Ocean.js library. Ocean Protocol provides you with everything you need to quickly get setup and start selling data over the blockchain.

/// These examples take you through a typical user journey that focuses on Alice's experience as a publisher, and Bob's experience as a buyer & consumer. The rest are services used by Alice and Bob.

/// If you have any questions or issues at any point while following along to this article please reach out to us on [discord](https://discord.gg/TnXjkR5).

/// Here are the steps we will be following throughout the article:

/// Here are the steps:

/// 1. Prerequisites
/// 2. Initialize services
/// 3. Create a new node.js project
/// 4. Install dependancies
/// 5. Import dependencies and add variables and constants
/// 6. Publish Data NFT and a Datatoken with a liquidity pool
/// 7. Publish Data NFT and a Datatoken with a fixed rate exchange
/// 8. Publish Data NFT and a Datatoken with a dispenser

/// ## 1. Prerequisites
/// Before we start it is important that you have all of the necessary prerequisites installed on your computer.
/// - **A Unix based operating system (Linux or Mac)**. If you are a Windows user you can try to run linux inside a virtual machine but this is outside of the scope of this article.
/// - **Git**. Instructions for installing Git can be found here: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
/// - **Node.js** can be downloaded from here: https://nodejs.org/en/download/
/// - **Docker** can be installed from here: https://docs.docker.com/get-docker/. Please note that Docker must run as a non-root user, you can set this up by following these instructions: https://docs.docker.com/engine/install/linux-postinstall/

/// ## 1. Initialize services

/// Ocean.js uses off-chain services for metadata (Aquarius) and consuming datasets (Provider).

/// We start by initializing the services. To do this, we clone the Barge repository and run it. This will run the current default versions of [Aquarius](https://github.com/oceanprotocol/aquarius), [Provider](https://github.com/oceanprotocol/provider), and [Ganache](https://github.com/trufflesuite/ganache) with [our contracts](https://github.com/oceanprotocol/contracts) deployed to it.

/// ```bash
/// git clone https://github.com/oceanprotocol/barge.git
/// cd barge/
/// ./start_ocean.sh --with-provider2 --no-dashboard
/// ```

/// ## 2. Create a new node.js project

/// Start by creating a new Node.js project. Open a new terminal and enter the following commands:

/// ```bash
/// mkdir marketplace-quickstart
/// cd marketplace-quickstart
/// npm init
/// # Answer the questions in the command line prompt
/// cat > marketplace.js
/// # On linux press CTRL + D to save
/// ```

/// ## 3. Install dependancies

/// Open the package.json file in a text editor and update the dependancies to include the following:

/// ```JSON
///   "dependencies": {
///     "@oceanprotocol/contracts": "1.0.0-alpha.28",
///     "@oceanprotocol/lib": "1.0.0-next.37",
///     "crypto-js": "^4.1.1",
///     "web3": "^1.7.3"
///   }
/// ```

/// Now in your terminal run the following command:

/// ```bash
/// npm install
/// ```

/// ## 4. Import dependencies and add variables and constants

/// Now open the `marketplace.js` file in your text editor.

/// Start by importing all of the necessary dependencies

/// ```Typescript

import { AbiItem } from 'web3-utils/types'
import { SHA256 } from 'crypto-js'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import {
  AmountsOutMaxFee,
  approve,
  Aquarius,
  balance,
  Config,
  Datatoken,
  Dispenser,
  DispenserCreationParams,
  downloadFile,
  Erc20CreateParams,
  FixedRateExchange,
  FreCreationParams,
  getHash,
  Nft,
  NftCreateData,
  NftFactory,
  Pool,
  PoolCreationParams,
  ProviderFees,
  ProviderInstance,
  TokenInOutMarket,
  ZERO_ADDRESS
} from '../../src'
import { getTestConfig, web3 } from '../config'
import { Addresses, deployContracts } from '../TestContractHandler'
/// ```

/// <!--
describe('Marketplace flow tests', async () => {
  /// -->

  /// Variables and constants needed for the test:

  /// ```Typescript
  let config: Config
  let aquarius: Aquarius
  let providerUrl: any
  let publisherAccount: string
  let consumerAccount: string
  let stakerAccount: string
  let contracts: Addresses
  let poolNftAddress: string
  let poolDatatokenAddress: string
  let poolAddress: string
  let freNftAddress: string
  let freDatatokenAddress: string
  let freAddress: string
  let freId: string
  let dispenserNftAddress: string
  let dispenserDatatokenAddress: string
  let dispenserAddress: string

  const POOL_NFT_NAME = 'Datatoken 1'
  const POOL_NFT_SYMBOL = 'DT1'
  const FRE_NFT_NAME = 'Datatoken 2'
  const FRE_NFT_SYMBOL = 'DT2'
  const DISP_NFT_NAME = 'Datatoken 3'
  const DISP_NFT_SYMBOL = 'DT3'
  /// ```

  ///  We will need a file to publish, so here we define the file that we intend to publish.
  /// ```Typescript
  const ASSET_URL = [
    {
      type: 'url',
      url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
      method: 'GET'
    }
  ]
  /// ```

  /// Next, we define the metadata that will describe our data asset. This is what we call the DDO
  /// ```Typescript
  const DDO = {
    '@context': ['https://w3id.org/did/v1'],
    id: '',
    version: '4.0.0',
    chainId: 4,
    nftAddress: '0x0',
    metadata: {
      created: '2021-12-20T14:35:20Z',
      updated: '2021-12-20T14:35:20Z',
      type: 'dataset',
      name: 'dataset-name',
      description: 'Ocean protocol test dataset description',
      author: 'oceanprotocol-team',
      license: 'MIT'
    },
    services: [
      {
        id: 'testFakeId',
        type: 'access',
        files: '',
        datatokenAddress: '0x0',
        serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
        timeout: 0
      }
    ]
  }
  /// ```

  /// We load the configuration:
  /// ```Typescript
  before(async () => {
    config = await getTestConfig(web3)
    aquarius = new Aquarius(config.metadataCacheUri)
    providerUrl = config.providerUri

    console.log(`Aquarius URL: ${config.metadataCacheUri}`)
    console.log(`Provider URL: ${providerUrl}`)
  })
  /// ```

  it('Initialize accounts', async () => {
    /// ```Typescript
    const accounts = await web3.eth.getAccounts()
    publisherAccount = accounts[0]
    consumerAccount = accounts[1]
    stakerAccount = accounts[2]

    console.log(`Publisher account address: ${publisherAccount}`)
    console.log(`Consumer account address: ${consumerAccount}`)
    console.log(`Staker account address: ${stakerAccount}`)
  })
  /// ```

  it('Deploy contracts', async () => {
    /// ```Typescript
    contracts = await deployContracts(web3, publisherAccount)
  })
  /// ```

  it('We send some OCEAN to consumer and staker accounts', async () => {
    /// ```Typescript
    const oceanContract = new web3.eth.Contract(
      MockERC20.abi as AbiItem[],
      contracts.oceanAddress
    )

    await oceanContract.methods
      .transfer(consumerAccount, web3.utils.toWei('100'))
      .send({ from: publisherAccount })

    await oceanContract.methods
      .transfer(stakerAccount, web3.utils.toWei('100'))
      .send({ from: publisherAccount })
  })
  /// ```

  /// ## 4. Publish Data NFT and a Datatoken with a liquidity pool

  /// For pool creation, the OCEAN token is used as the base token. The base token can be changed into something else, such as USDC, DAI etc., but it will require an extra fee.

  it('Publish a dataset (create NFT + Datatoken) with a liquidity pool', async () => {
    /// ```Typescript
    const factory = new NftFactory(contracts.erc721FactoryAddress, web3)

    const nftParams: NftCreateData = {
      name: POOL_NFT_NAME,
      symbol: POOL_NFT_SYMBOL,
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

    const poolParams: PoolCreationParams = {
      ssContract: contracts.sideStakingAddress,
      baseTokenAddress: contracts.oceanAddress,
      baseTokenSender: contracts.erc721FactoryAddress,
      publisherAddress: publisherAccount,
      marketFeeCollector: publisherAccount,
      poolTemplateAddress: contracts.poolTemplateAddress,
      rate: '1',
      baseTokenDecimals: 18,
      vestingAmount: '10000',
      vestedBlocks: 2500000,
      initialBaseTokenLiquidity: '2000',
      swapFeeLiquidityProvider: '0.001',
      swapFeeMarketRunner: '0.001'
    }

    await approve(
      web3,
      publisherAccount,
      contracts.oceanAddress,
      contracts.erc721FactoryAddress,
      poolParams.vestingAmount
    )

    const tx = await factory.createNftErc20WithPool(
      publisherAccount,
      nftParams,
      erc20Params,
      poolParams
    )

    poolNftAddress = tx.events.NFTCreated.returnValues[0]
    poolDatatokenAddress = tx.events.TokenCreated.returnValues[0]
    poolAddress = tx.events.NewPool.returnValues[0]

    console.log(`Pool NFT address: ${poolNftAddress}`)
    console.log(`Pool Datatoken address: ${poolDatatokenAddress}`)
    console.log(`Pool address: ${poolAddress}`)
  })
  /// ```

  it('Set metadata in the pool NFT', async () => {
    /// ```Typescript
    const nft = new Nft(web3)

    // update ddo and set the right did
    DDO.chainId = await web3.eth.getChainId()
    DDO.id =
      'did:op:' +
      SHA256(web3.utils.toChecksumAddress(poolNftAddress) + DDO.chainId.toString(10))
    DDO.nftAddress = poolNftAddress
    // encrypt file(s) using provider
    const encryptedFiles = await ProviderInstance.encrypt(ASSET_URL, providerUrl)
    DDO.services[0].files = await encryptedFiles
    DDO.services[0].datatokenAddress = poolDatatokenAddress

    console.log(`DID: ${DDO.id}`)

    const providerResponse = await ProviderInstance.encrypt(DDO, providerUrl)
    const encryptedDDO = await providerResponse
    const metadataHash = getHash(JSON.stringify(DDO))
    await nft.setMetadata(
      poolNftAddress,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedDDO,
      '0x' + metadataHash
    )
  })
  /// ```

  it('User should add liquidity to the pool, receiving LP tokens', async () => {
    /// ```Typescript
    const pool = new Pool(web3)

    await approve(web3, stakerAccount, contracts.oceanAddress, poolAddress, '5', true)

    await pool.joinswapExternAmountIn(stakerAccount, poolAddress, '5', '0.1')
  })
  /// ```

  it('Marketplace displays pool asset for sale', async () => {
    /// ```Typescript
    const pool = new Pool(web3)
    const prices = await pool.getAmountInExactOut(
      poolAddress,
      poolDatatokenAddress,
      contracts.oceanAddress,
      '1',
      '0.01'
    )
    console.log(`Price of 1 ${POOL_NFT_SYMBOL} is ${prices.tokenAmount} OCEAN`)
  })
  /// ```

  it('Consumer buys a pool data asset, and downloads it', async () => {
    /// ```Typescript
    const datatoken = new Datatoken(web3)

    const consumerETHBalance = await web3.eth.getBalance(consumerAccount)
    console.log(`Consumer ETH balance: ${consumerETHBalance}`)
    let consumerOCEANBalance = await balance(
      web3,
      contracts.oceanAddress,
      consumerAccount
    )
    console.log(`Consumer OCEAN balance before swap: ${consumerOCEANBalance}`)
    let consumerDTBalance = await balance(web3, poolDatatokenAddress, consumerAccount)
    console.log(`Consumer ${POOL_NFT_SYMBOL} balance before swap: ${consumerDTBalance}`)

    await approve(web3, consumerAccount, contracts.oceanAddress, poolAddress, '100')

    const pool = new Pool(web3)
    const tokenInOutMarket: TokenInOutMarket = {
      tokenIn: contracts.oceanAddress,
      tokenOut: poolDatatokenAddress,
      marketFeeAddress: consumerAccount
    }
    const amountsInOutMaxFee: AmountsOutMaxFee = {
      maxAmountIn: '10',
      tokenAmountOut: '1',
      swapMarketFee: '0.1'
    }
    await pool.swapExactAmountOut(
      consumerAccount,
      poolAddress,
      tokenInOutMarket,
      amountsInOutMaxFee
    )

    consumerOCEANBalance = await balance(web3, contracts.oceanAddress, consumerAccount)
    console.log(`Consumer OCEAN balance after swap: ${consumerOCEANBalance}`)
    consumerDTBalance = await balance(web3, poolDatatokenAddress, consumerAccount)
    console.log(`Consumer ${POOL_NFT_SYMBOL} balance after swap: ${consumerDTBalance}`)

    const resolvedDDO = await aquarius.waitForAqua(DDO.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')

    // initialize provider
    const initializeData = await ProviderInstance.initialize(
      resolvedDDO.id,
      resolvedDDO.services[0].id,
      0,
      consumerAccount,
      providerUrl
    )

    const providerFees: ProviderFees = {
      providerFeeAddress: initializeData.providerFee.providerFeeAddress,
      providerFeeToken: initializeData.providerFee.providerFeeToken,
      providerFeeAmount: initializeData.providerFee.providerFeeAmount,
      v: initializeData.providerFee.v,
      r: initializeData.providerFee.r,
      s: initializeData.providerFee.s,
      providerData: initializeData.providerFee.providerData,
      validUntil: initializeData.providerFee.validUntil
    }
    // make the payment
    const tx = await datatoken.startOrder(
      poolDatatokenAddress,
      consumerAccount,
      consumerAccount,
      0,
      providerFees
    )
    // get the url
    const downloadURL = await ProviderInstance.getDownloadUrl(
      DDO.id,
      consumerAccount,
      DDO.services[0].id,
      0,
      tx.transactionHash,
      providerUrl,
      web3
    )

    console.log(`Download URL: ${downloadURL}`)

    consumerOCEANBalance = await balance(web3, contracts.oceanAddress, consumerAccount)
    console.log(`Consumer OCEAN balance after order: ${consumerOCEANBalance}`)
    consumerDTBalance = await balance(web3, poolDatatokenAddress, consumerAccount)
    console.log(`Consumer ${POOL_NFT_SYMBOL} balance after order: ${consumerDTBalance}`)

    try {
      const fileData = await downloadFile(downloadURL)
      console.log(fileData)
    } catch (e) {
      assert.fail('Download failed')
    }
  })
  /// ```

  /// ## 5. Publish Data NFT and a Datatoken with a fixed rate exchange

  it('Publish a dataset (create NFT + Datatoken) with a fixed rate exchange', async () => {
    /// ```Typescript
    const factory = new NftFactory(contracts.erc721FactoryAddress, web3)

    const nftParams: NftCreateData = {
      name: FRE_NFT_NAME,
      symbol: FRE_NFT_SYMBOL,
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

    const freParams: FreCreationParams = {
      fixedRateAddress: contracts.fixedRateAddress,
      baseTokenAddress: contracts.oceanAddress,
      owner: publisherAccount,
      marketFeeCollector: publisherAccount,
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: '0.001',
      allowedConsumer: ZERO_ADDRESS,
      withMint: false
    }

    const tx = await factory.createNftErc20WithFixedRate(
      publisherAccount,
      nftParams,
      erc20Params,
      freParams
    )

    freNftAddress = tx.events.NFTCreated.returnValues[0]
    freDatatokenAddress = tx.events.TokenCreated.returnValues[0]
    freAddress = tx.events.NewFixedRate.returnValues.exchangeContract
    freId = tx.events.NewFixedRate.returnValues.exchangeId

    console.log(`Fixed rate exchange NFT address: ${freNftAddress}`)
    console.log(`Fixed rate exchange Datatoken address: ${freDatatokenAddress}`)
    console.log(`Fixed rate exchange address: ${freAddress}`)
    console.log(`Fixed rate exchange Id: ${freId}`)
  })
  /// ```

  it('Set metadata in the fixed rate exchange NFT', async () => {
    /// ```Typescript
    const nft = new Nft(web3)

    // update ddo and set the right did
    DDO.chainId = await web3.eth.getChainId()
    DDO.id =
      'did:op:' +
      SHA256(web3.utils.toChecksumAddress(freNftAddress) + DDO.chainId.toString(10))
    DDO.nftAddress = freNftAddress
    // encrypt file(s) using provider
    const encryptedFiles = await ProviderInstance.encrypt(ASSET_URL, providerUrl)
    DDO.services[0].files = await encryptedFiles
    DDO.services[0].datatokenAddress = freDatatokenAddress

    console.log(`DID: ${DDO.id}`)

    const providerResponse = await ProviderInstance.encrypt(DDO, providerUrl)
    const encryptedDDO = await providerResponse
    const metadataHash = getHash(JSON.stringify(DDO))
    await nft.setMetadata(
      freNftAddress,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedDDO,
      '0x' + metadataHash
    )
  })
  /// ```

  it('Marketplace displays fixed rate asset for sale', async () => {
    /// ```Typescript
    const fixedRate = new FixedRateExchange(web3, freAddress)
    const oceanAmount = await (
      await fixedRate.calcBaseInGivenOutDT(freId, '1')
    ).baseTokenAmount
    console.log(`Price of 1 ${FRE_NFT_SYMBOL} is ${oceanAmount} OCEAN`)
  })
  /// ```

  it('Consumer buys a fixed rate asset data asset, and downloads it', async () => {
    /// ```Typescript
    const datatoken = new Datatoken(web3)
    const DATATOKEN_AMOUNT = '10000'

    await datatoken.mint(freDatatokenAddress, publisherAccount, DATATOKEN_AMOUNT)

    const consumerETHBalance = await web3.eth.getBalance(consumerAccount)
    console.log(`Consumer ETH balance: ${consumerETHBalance}`)
    let consumerOCEANBalance = await balance(
      web3,
      contracts.oceanAddress,
      consumerAccount
    )
    console.log(`Consumer OCEAN balance before swap: ${consumerOCEANBalance}`)
    let consumerDTBalance = await balance(web3, freDatatokenAddress, consumerAccount)
    console.log(`Consumer ${FRE_NFT_SYMBOL} balance before swap: ${consumerDTBalance}`)

    await approve(web3, consumerAccount, contracts.oceanAddress, freAddress, '100')
    await approve(
      web3,
      publisherAccount,
      freDatatokenAddress,
      freAddress,
      DATATOKEN_AMOUNT
    )

    const fixedRate = new FixedRateExchange(web3, freAddress)
    await fixedRate.buyDT(consumerAccount, freId, '1', '2')

    consumerOCEANBalance = await balance(web3, contracts.oceanAddress, consumerAccount)
    console.log(`Consumer OCEAN balance after swap: ${consumerOCEANBalance}`)
    consumerDTBalance = await balance(web3, freDatatokenAddress, consumerAccount)
    console.log(`Consumer ${FRE_NFT_SYMBOL} balance after swap: ${consumerDTBalance}`)

    const resolvedDDO = await aquarius.waitForAqua(DDO.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')

    // initialize provider
    const initializeData = await ProviderInstance.initialize(
      resolvedDDO.id,
      resolvedDDO.services[0].id,
      0,
      consumerAccount,
      providerUrl
    )

    const providerFees: ProviderFees = {
      providerFeeAddress: initializeData.providerFee.providerFeeAddress,
      providerFeeToken: initializeData.providerFee.providerFeeToken,
      providerFeeAmount: initializeData.providerFee.providerFeeAmount,
      v: initializeData.providerFee.v,
      r: initializeData.providerFee.r,
      s: initializeData.providerFee.s,
      providerData: initializeData.providerFee.providerData,
      validUntil: initializeData.providerFee.validUntil
    }
    // make the payment
    const tx = await datatoken.startOrder(
      freDatatokenAddress,
      consumerAccount,
      consumerAccount,
      0,
      providerFees
    )
    // get the url
    const downloadURL = await ProviderInstance.getDownloadUrl(
      DDO.id,
      consumerAccount,
      DDO.services[0].id,
      0,
      tx.transactionHash,
      providerUrl,
      web3
    )

    console.log(`Download URL: ${downloadURL}`)

    consumerOCEANBalance = await balance(web3, contracts.oceanAddress, consumerAccount)
    console.log(`Consumer OCEAN balance after order: ${consumerOCEANBalance}`)
    consumerDTBalance = await balance(web3, freDatatokenAddress, consumerAccount)
    console.log(`Consumer ${FRE_NFT_SYMBOL} balance after order: ${consumerDTBalance}`)

    try {
      const fileData = await downloadFile(downloadURL)
      console.log(fileData)
    } catch (e) {
      assert.fail('Download failed')
    }
  })
  /// ```

  /// ## 6. Publish Data NFT and a Datatoken with a dispenser

  it('Publish a dataset (create NFT + Datatoken) with a dipenser', async () => {
    /// ```Typescript
    const factory = new NftFactory(contracts.erc721FactoryAddress, web3)

    const nftParams: NftCreateData = {
      name: DISP_NFT_NAME,
      symbol: DISP_NFT_SYMBOL,
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

    const dispenserParams: DispenserCreationParams = {
      dispenserAddress: contracts.dispenserAddress,
      maxTokens: '1',
      maxBalance: '1',
      withMint: true,
      allowedSwapper: ZERO_ADDRESS
    }

    const tx = await factory.createNftErc20WithDispenser(
      publisherAccount,
      nftParams,
      erc20Params,
      dispenserParams
    )

    dispenserNftAddress = tx.events.NFTCreated.returnValues[0]
    dispenserDatatokenAddress = tx.events.TokenCreated.returnValues[0]
    dispenserAddress = tx.events.DispenserCreated.returnValues[0]

    console.log(`Dispenser NFT address: ${dispenserNftAddress}`)
    console.log(`Dispenser Datatoken address: ${dispenserDatatokenAddress}`)
    console.log(`Dispenser address: ${dispenserAddress}`)
  })
  /// ```

  it('Set metadata in the dispenser NFT', async () => {
    /// ```Typescript
    const nft = new Nft(web3)

    // update ddo and set the right did
    DDO.chainId = await web3.eth.getChainId()
    DDO.id =
      'did:op:' +
      SHA256(web3.utils.toChecksumAddress(dispenserNftAddress) + DDO.chainId.toString(10))
    DDO.nftAddress = dispenserNftAddress
    // encrypt file(s) using provider
    const encryptedFiles = await ProviderInstance.encrypt(ASSET_URL, providerUrl)
    DDO.services[0].files = await encryptedFiles
    DDO.services[0].datatokenAddress = dispenserDatatokenAddress

    console.log(`DID: ${DDO.id}`)

    const providerResponse = await ProviderInstance.encrypt(DDO, providerUrl)
    const encryptedDDO = await providerResponse
    const metadataHash = getHash(JSON.stringify(DDO))
    await nft.setMetadata(
      dispenserNftAddress,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedDDO,
      '0x' + metadataHash
    )
  })
  /// ```

  it('Consumer gets a dispenser data asset, and downloads it', async () => {
    /// ```Typescript
    const datatoken = new Datatoken(web3)
    const dispenser = new Dispenser(web3, contracts.dispenserAddress)

    let consumerDTBalance = await balance(
      web3,
      dispenserDatatokenAddress,
      consumerAccount
    )
    console.log(
      `Consumer ${DISP_NFT_SYMBOL} balance before dispense: ${consumerDTBalance}`
    )

    await dispenser.dispense(
      dispenserDatatokenAddress,
      consumerAccount,
      '1',
      consumerAccount
    )

    consumerDTBalance = await balance(web3, dispenserDatatokenAddress, consumerAccount)
    console.log(
      `Consumer ${DISP_NFT_SYMBOL} balance after dispense: ${consumerDTBalance}`
    )

    const resolvedDDO = await aquarius.waitForAqua(DDO.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')

    // initialize provider
    const initializeData = await ProviderInstance.initialize(
      resolvedDDO.id,
      resolvedDDO.services[0].id,
      0,
      consumerAccount,
      providerUrl
    )

    const providerFees: ProviderFees = {
      providerFeeAddress: initializeData.providerFee.providerFeeAddress,
      providerFeeToken: initializeData.providerFee.providerFeeToken,
      providerFeeAmount: initializeData.providerFee.providerFeeAmount,
      v: initializeData.providerFee.v,
      r: initializeData.providerFee.r,
      s: initializeData.providerFee.s,
      providerData: initializeData.providerFee.providerData,
      validUntil: initializeData.providerFee.validUntil
    }
    // make the payment
    const tx = await datatoken.startOrder(
      dispenserDatatokenAddress,
      consumerAccount,
      consumerAccount,
      0,
      providerFees
    )
    // get the url
    const downloadURL = await ProviderInstance.getDownloadUrl(
      DDO.id,
      consumerAccount,
      DDO.services[0].id,
      0,
      tx.transactionHash,
      providerUrl,
      web3
    )

    console.log(`Download URL: ${downloadURL}`)

    consumerDTBalance = await balance(web3, dispenserDatatokenAddress, consumerAccount)
    console.log(`Consumer ${DISP_NFT_SYMBOL} balance after order: ${consumerDTBalance}`)

    try {
      const fileData = await downloadFile(downloadURL)
      console.log(fileData)
    } catch (e) {
      assert.fail('Download failed')
    }
  })
  /// ```
})
