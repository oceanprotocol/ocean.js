/// # Ocean.js Code Examples

/// ## Introduction

/// The following guide runs you through the process of using ocean.js to publish and then consume a dataset. The code examples below are all working and you can learn how to publish by following along.
/// The process involves creating a Data NFT (which represents the base-IP on-chain) and a datatoken (which will be used to purchase the dataset). This guide provides all the code you need and no prior knowledge is required. It is helpful if you have some experience with javascript but it is not necessary.

/// Selling your data over the blockchain puts you in charge of how it is used and can be a great source of passive income. There are many AI startups that have deep expertise in machine learning but need more data to improve their models. Selling your data via the blockchain gives you a level of security that you would be unable to achieve if you were selling via a centralised marketplace.

/// In this guide we'll be making use of the Ocean.js library. Ocean Protocol provides you with everything you need to quickly get setup and start selling data over the blockchain.

/// If you have any questions or issues at any point while following along to this article please reach out to us on [discord](https://discord.gg/TnXjkR5).

/// Here are the steps we will be following throughout the article:

/// 1. Prerequisites
/// 2. Create a new node.js project
/// 3. Install dependencies
/// 4. Define files and metadata
/// 5. Publish a dataset

/// Let's go through each step:

/// ## 1. Prerequisites
/// Before we start it is important that you have all of the necessary prerequisites installed on your computer.
/// - **A Unix based operating system (Linux or Mac)**. If you are a Windows user you can try to run linux inside a virtual machine but this is outside of the scope of this article.
/// - **Git**. Instructions for installing Git can be found here: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
/// - **Node.js** can be downloaded from here: https://nodejs.org/en/download/
/// - **Docker** can be installed from here: https://docs.docker.com/get-docker/. Please note that Docker must run as a non-root user, you can set this up by following these instructions: https://docs.docker.com/engine/install/linux-postinstall/

/// ## 2. Create a new node.js project

/// You are now ready to start your project. We start by creating a new folder and initiating a new Node.js project. Open a new terminal and enter the following commands:

/// ```bash
/// mkdir quickstart
/// cd quickstart
/// npm init
/// # Answer the questions in the command line prompt
/// cat > index.js
/// # On linux press CTRL + D to save
/// ```

/// ## 3. Install dependencies

/// ```bash
/// npm install @oceanprotocol/lib
/// ```

/// Now you're ready to start coding! Let's start by opening the index.js file and importing all of the necessary dependencies

/// ```Typescript
import { assert } from 'chai'
import { SHA256 } from 'crypto-js'
import { web3, getTestConfig, getAddresses } from '../config' // We'll be using the test config setup in this example
import {
  Config,
  ProviderInstance,
  Aquarius,
  NftFactory,
  NftCreateData,
  Datatoken,
  getHash,
  Nft,
  downloadFile
} from '../../src'
import { ProviderFees, Erc20CreateParams } from '../../src/@types'
/// ```

/// ## 4. Define files and metadata

/// We will need a file to publish, so here we define the file that we intend to publish.

/// ```Typescript
const assetUrl = [
  {
    type: 'url',
    url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
    method: 'GET'
  }
]
/// ```

/// Next, we define the metadata that will describe our data asset. This is what we call the DDO
/// ```Typescript
const ddo = {
  '@context': ['https://w3id.org/did/v1'],
  id: 'did:op:efba17455c127a885ec7830d687a8f6e64f5ba559f8506f8723c1f10f05c049c',
  version: '4.0.0',
  chainId: 4,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'dataset',
    name: 'dfgdfgdg',
    description: 'd dfgd fgd dfg dfgdfgd dfgdf',
    tags: [''],
    author: 'dd',
    license: 'https://market.oceanprotocol.com/terms',
    additionalInformation: {
      termsAndConditions: true
    }
  },
  services: [
    {
      id: 'notAnId',
      type: 'access',
      files: '',
      datatokenAddress: '0xa15024b732A8f2146423D14209eFd074e61964F3',
      serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
      timeout: 0
    }
  ]
}
/// ```

/// ## 5. Publish a dataset

/// ```Typescript
describe('Simple Publish & Consume Flow', async () => {
  const config: Config = await getTestConfig(web3)
  const addresses: any = getAddresses()
  const aquarius: Aquarius = new Aquarius(config.metadataCacheUri)
  const providerUrl: any = config.providerUri

  it('should publish a dataset (create NFT + ERC20)', async () => {
    const nft = new Nft(web3)
    const datatoken = new Datatoken(web3)
    const Factory = new NftFactory(addresses.ERC721Factory, web3)
    const accounts = await web3.eth.getAccounts()
    const publisherAccount = accounts[0]
    const consumerAccount = accounts[1]
    const nftParams: NftCreateData = {
      name: 'testNFT',
      symbol: 'TST',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }
    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: '0x0000000000000000000000000000000000000000',
      feeToken: '0x0000000000000000000000000000000000000000',
      minter: publisherAccount,
      mpFeeAddress: '0x0000000000000000000000000000000000000000'
    }
    const result = await Factory.createNftWithErc20(
      publisherAccount,
      nftParams,
      erc20Params
    )
    const erc721Address = result.events.NFTCreated.returnValues[0]
    const datatokenAddress = result.events.TokenCreated.returnValues[0]

    /// ```

    /// ### Create the files encrypted string

    /// ```Typescript

    let providerResponse = await ProviderInstance.encrypt(assetUrl, providerUrl)
    ddo.services[0].files = await providerResponse
    ddo.services[0].datatokenAddress = datatokenAddress
    // update ddo and set the right did
    ddo.nftAddress = erc721Address
    const chain = await web3.eth.getChainId()
    ddo.id =
      'did:op:' + SHA256(web3.utils.toChecksumAddress(erc721Address) + chain.toString(10))

    providerResponse = await ProviderInstance.encrypt(ddo, providerUrl)
    const encryptedResponse = await providerResponse
    const metadataHash = getHash(JSON.stringify(ddo))
    const res = await nft.setMetadata(
      erc721Address,
      publisherAccount,
      0,
      providerUrl,
      '',
      '0x2',
      encryptedResponse,
      '0x' + metadataHash
    )
    const resolvedDDO = await aquarius.waitForAqua(ddo.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')
    // mint 1 ERC20 and send it to the consumer
    await datatoken.mint(datatokenAddress, publisherAccount, '1', consumerAccount)
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
    const txid = await datatoken.startOrder(
      datatokenAddress,
      consumerAccount,
      consumerAccount,
      0,
      providerFees
    )
    // get the url
    const downloadURL = await ProviderInstance.getDownloadUrl(
      ddo.id,
      consumerAccount,
      ddo.services[0].id,
      0,
      txid.transactionHash,
      providerUrl,
      web3
    )
    assert(downloadURL, 'Provider getDownloadUrl failed')
    try {
      const fileData = await downloadFile(downloadURL)
    } catch (e) {
      assert.fail('Download failed')
    }
  })
})
/// ```
