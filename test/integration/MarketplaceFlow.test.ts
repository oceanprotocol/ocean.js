/// # Quickstart: Marketplace Flow

/// This quickstart describes a batteries-included flow including using off-chain services for metadata (Aquarius) and consuming datasets (Provider).

/// For pool creation, it is used as base token, OCEAN token. The base token can be changed into something else, such as USDC, DAI etc., but it will require an extra fee.

/// It focuses on Alice's experience as a publisher, and Bob's experience as a buyer & consumer. The rest are services used by Alice and Bob.

/// Here are the steps:

/// 1. Initialize services
/// 2. Create a new node.js project
/// 3. Install dependancies
/// 4. Publish Data NFT, Datatoken & Pool
/// 5. Market displays the asset for sale
/// 6. Consumer buys data asset, and downloads it

/// Let's go through each step.

/// ## 1. Initialize services

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

/// ## 4. Publish Data NFT, Datatoken & Pool

/// Now open the `marketplace.js` file in your text editor.

/// Start by importing all of the necessary dependencies

/// ```Typescript
import { assert } from 'chai'
import { SHA256 } from 'crypto-js'
import {
  AmountsOutMaxFee,
  approve,
  Aquarius,
  balance,
  Config,
  Datatoken,
  downloadFile,
  Erc20CreateParams,
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
  let contracts: Addresses
  let erc721Address: string
  let datatokenAddress: string
  let poolAddress: string

  const NFT_SYMBOL = 'DT1'
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

  /// ```Typescript
  before(async () => {
    config = await getTestConfig(web3)
    aquarius = new Aquarius(config.metadataCacheUri)
    providerUrl = 'http://127.0.0.1:8030' // config.providerUri

    console.log(`Aquarius URL: ${config.metadataCacheUri}`)
    console.log(`Provider URL: ${providerUrl}`)
  })

  it('initialize accounts', async () => {
    const accounts = await web3.eth.getAccounts()
    publisherAccount = accounts[0]
    consumerAccount = accounts[1]

    console.log(`Publisher account address: ${publisherAccount}`)
    console.log(`Consumer account address: ${consumerAccount}`)
  })

  it('deploy contracts', async () => {
    contracts = await deployContracts(web3, publisherAccount)
  })

  it('publish a dataset (create NFT + ERC20) with a liquidity pool', async () => {
    const factory = new NftFactory(contracts.erc721FactoryAddress, web3)

    const nftParams: NftCreateData = {
      name: 'Datatoken 1',
      symbol: 'DT1',
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
      '10000'
    )

    const tx = await factory.createNftErc20WithPool(
      publisherAccount,
      nftParams,
      erc20Params,
      poolParams
    )

    erc721Address = tx.events.NFTCreated.returnValues[0]
    datatokenAddress = tx.events.TokenCreated.returnValues[0]
    poolAddress = tx.events.NewPool.returnValues[0]

    console.log(`NFT address: ${erc721Address}`)
    console.log(`Datatoken address: ${datatokenAddress}`)
    console.log(`Pool address: ${poolAddress}`)

    // update ddo and set the right did
    DDO.chainId = await web3.eth.getChainId()
    DDO.id =
      'did:op:' +
      SHA256(web3.utils.toChecksumAddress(erc721Address) + DDO.chainId.toString(10))
    DDO.nftAddress = erc721Address
    // encrypt file(s) using provider
    const encryptedFiles = await ProviderInstance.encrypt(ASSET_URL, providerUrl)
    DDO.services[0].files = await encryptedFiles
    DDO.services[0].datatokenAddress = datatokenAddress

    console.log(`DID: ${DDO.id}`)
  })

  it('set metadata in the NFT', async () => {
    const nft = new Nft(web3)
    const providerResponse = await ProviderInstance.encrypt(DDO, providerUrl)
    const encryptedDDO = await providerResponse
    const metadataHash = getHash(JSON.stringify(DDO))
    await nft.setMetadata(
      erc721Address,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedDDO,
      '0x' + metadataHash
    )
    // TODO: const resolvedDDO = await aquarius.waitForAqua(DDO.id)
    // TODO: assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')
  })

  it('marketplace displays asset for sale', async () => {
    const pool = new Pool(web3)
    const prices = await pool.getAmountInExactOut(
      poolAddress,
      datatokenAddress,
      contracts.oceanAddress,
      '1',
      '0.01'
    )
    console.log(`Price of 1 ${NFT_SYMBOL} is ${prices.tokenAmount} OCEAN`)
  })

  it('consumer buys data asset, and downloads it', async () => {
    const datatoken = new Datatoken(web3)

    const consumerETHBalance = await web3.eth.getBalance(consumerAccount)
    console.log(`Consumer ETH balance: ${consumerETHBalance}`)
    let consumerOCEANBalance = await balance(
      web3,
      contracts.oceanAddress,
      publisherAccount
    )
    console.log(`Consumer OCEAN balance before swap: ${consumerOCEANBalance}`)
    let consumerDTBalance = await balance(web3, datatokenAddress, publisherAccount)
    console.log(`Consumer ${NFT_SYMBOL} balance before swap: ${consumerDTBalance}`)

    await approve(web3, publisherAccount, contracts.oceanAddress, poolAddress, '100')

    const pool = new Pool(web3)
    const tokenInOutMarket: TokenInOutMarket = {
      tokenIn: contracts.oceanAddress,
      tokenOut: datatokenAddress,
      marketFeeAddress: publisherAccount
    }
    const amountsInOutMaxFee: AmountsOutMaxFee = {
      maxAmountIn: '10',
      tokenAmountOut: '1',
      swapMarketFee: '0.1'
    }
    await pool.swapExactAmountOut(
      publisherAccount,
      poolAddress,
      tokenInOutMarket,
      amountsInOutMaxFee
    )

    consumerOCEANBalance = await balance(web3, contracts.oceanAddress, publisherAccount)
    console.log(`Consumer OCEAN balance after swap: ${consumerOCEANBalance}`)
    consumerDTBalance = await balance(web3, datatokenAddress, publisherAccount)
    console.log(`Consumer ${NFT_SYMBOL} balance after swap: ${consumerDTBalance}`)

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
    console.log(initializeData)
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
    const txid = await datatoken.startOrder(
      datatokenAddress,
      publisherAccount,
      publisherAccount,
      0,
      providerFees
    )
    // get the url
    const downloadURL = await ProviderInstance.getDownloadUrl(
      DDO.id,
      publisherAccount,
      DDO.services[0].id,
      0,
      txid.transactionHash,
      providerUrl,
      web3
    )

    console.log(`Download URL: ${downloadURL}`)

    consumerOCEANBalance = await balance(web3, contracts.oceanAddress, publisherAccount)
    console.log(`Consumer OCEAN balance after order: ${consumerOCEANBalance}`)
    consumerDTBalance = await balance(web3, datatokenAddress, publisherAccount)
    console.log(`Consumer ${NFT_SYMBOL} balance after order: ${consumerDTBalance}`)

    try {
      const fileData = await downloadFile(downloadURL)
      console.log(fileData)
    } catch (e) {
      assert.fail('Download failed')
    }
  })
})
/// ```
