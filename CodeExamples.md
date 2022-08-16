# Ocean.js Code Examples

## Introduction

The following guide runs you through the process of using ocean.js to publish and then consume a dataset. The code examples below are all working and you can learn how to publish by following along.
The process involves creating a Data NFT (which represents the base-IP on-chain) and a datatoken (which will be used to purchase the dataset). This guide provides all the code you need and no prior knowledge is required. It is helpful if you have some experience with javascript but it is not necessary.

Selling your data over the blockchain puts you in charge of how it is used and can be a great source of passive income. There are many AI startups that have deep expertise in machine learning but need more data to improve their models. Selling your data via the blockchain gives you a level of security that you would be unable to achieve if you were selling via a centralised marketplace.

In this guide we'll be making use of the Ocean.js library. Ocean Protocol provides you with everything you need to quickly get setup and start selling data over the blockchain.

These examples take you through a typical user journey that focuses on the experience of a publisher, and a buyer / consumer.

If you have any questions or issues at any point while following along to this article please reach out to us on [discord](https://discord.gg/TnXjkR5).

Here are the steps we will be following throughout the article:

Here are the steps:

0. [Prerequisites](#-Prerequisites)
1. [Initialize services](#-initialize-services)
2. [Create a new node.js project](#-create-a-new-node.js-project)
3. [Install dependencies](#-install-dependencies)
4. [Initialize accounts and deploy contracts](#-initialize-accounts-and-deploy-contracts)
5. [Import dependencies and add variables and constants](#-import-dependencies-and-add-variables-and-constants)
6. [Publish Data NFT and a Datatoken with a fixed rate exchange](#-publish-data-nft-and-a-datatoken-with-a-fixed-rate-exchange)
7. [Publish Data NFT and a Datatoken with a dispenser](#-publish-data-nft-and-a-datatoken-with-a-dispenser)

## 0. Prerequisites
Before we start it is important that you have all of the necessary prerequisites installed on your computer.
- **A Unix based operating system (Linux or Mac)**. If you are a Windows user you can try to run linux inside a virtual machine but this is outside of the scope of this article.
- **Git**. Instructions for installing Git can be found here: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
- **Node.js** can be downloaded from here: https://nodejs.org/en/download/
- **Docker** can be installed from here: https://docs.docker.com/get-docker/. Please note that Docker must run as a non-root user, you can set this up by following these instructions: https://docs.docker.com/engine/install/linux-postinstall/

## 1. Initialize services

Ocean.js uses off-chain services for metadata (Aquarius) and consuming datasets (Provider).

We start by initializing the services. To do this, we clone the Barge repository and run it. This will run the current default versions of [Aquarius](https://github.com/oceanprotocol/aquarius), [Provider](https://github.com/oceanprotocol/provider), and [Ganache](https://github.com/trufflesuite/ganache) with [our contracts](https://github.com/oceanprotocol/contracts) deployed to it.

```bash
git clone https://github.com/oceanprotocol/barge.git
cd barge/
./start_ocean.sh --with-provider2 --no-dashboard
```

## 2. Create a new node.js project

Start by creating a new Node.js project. Open a new terminal and enter the following commands:

```bash
mkdir marketplace-quickstart
cd marketplace-quickstart
npm init
# Answer the questions in the command line prompt
cat > marketplace.js
# On linux press CTRL + D to save
```

## 3. Install dependancies

Open the package.json file in a text editor and update the dependancies to include the following:

```JSON
  "dependencies": {
    "@oceanprotocol/contracts": "1.0.0-alpha.28",
    "@oceanprotocol/lib": "1.0.0-next.37",
    "crypto-js": "^4.1.1",
    "web3": "^1.7.3"
  }
```

Now in your terminal run the following command:

```bash
npm install
```

## 4. Import dependencies and add variables and constants

Now open the `marketplace.js` file in your text editor.

Start by importing all of the necessary dependencies

```Typescript

import { SHA256 } from 'crypto-js'
import {
  approve,
  Aquarius,
  balance,
  Config,
  Datatoken,
  Dispenser,
  DispenserCreationParams,
  downloadFile,
  DatatokenCreateParams,
  Files,
  FixedRateExchange,
  FreCreationParams,
  getHash,
  Nft,
  NftCreateData,
  NftFactory,
  ProviderFees,
  ProviderInstance,
  transfer,
  ZERO_ADDRESS
} from '../../src'
import { getAddresses, getTestConfig, web3 } from '../config'
```

<!--
describe('Marketplace flow tests
-->

Now we define the variables which we will need later

```Typescript
  let config: Config
  let aquarius: Aquarius
  let providerUrl: any
  let publisherAccount: string
  let consumerAccount: string
  let stakerAccount: string
  let addresses: any
  let freNftAddress: string
  let freDatatokenAddress: string
  let freAddress: string
  let freId: string
  let dispenserNftAddress: string
  let dispenserDatatokenAddress: string
  let dispenserAddress: string
```

We also define some constants that we will use:
```Typescript
  const FRE_NFT_NAME = 'Datatoken 2'
  const FRE_NFT_SYMBOL = 'DT2'
  const DISP_NFT_NAME = 'Datatoken 3'
  const DISP_NFT_SYMBOL = 'DT3'
```

 We will need a file to publish, so here we define the file that we intend to publish.
```Typescript
  const ASSET_URL: Files = {
    datatokenAddress: '0x0',
    nftAddress: '0x0',
    files: [
      {
        type: 'url',
        url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
        method: 'GET'
      }
    ]
  }
```

Next, we define the metadata that will describe our data asset. This is what we call the DDO
```Typescript
  const DDO = {
    '@context': ['https://w3id.org/did/v1'],
    id: '',
    version: '4.1.0',
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
        serviceEndpoint: 'https://v4.provider.rinkeby.oceanprotocol.com',
        timeout: 0
      }
    ]
  }
```

We load the configuration:
```Typescript
  
    config = await getTestConfig(web3)
    aquarius = new Aquarius(config.metadataCacheUri)
    providerUrl = config.providerUri
```
As we go along it's a good idea to console log the values so that you check they are right
```Typescript
    console.log(`Aquarius URL: ${config.metadataCacheUri}`)
    console.log(`Provider URL: ${providerUrl}`)
  
```

## 5. Initialize accounts and deploy contracts
  ### 5.1 Initialize accounts
```Typescript
    const accounts = await web3.eth.getAccounts()
    publisherAccount = accounts[0]
    consumerAccount = accounts[1]
    stakerAccount = accounts[2]
```
Again, lets console log the values so that we can check that they have been saved properly
```Typescript
    console.log(`Publisher account address: ${publisherAccount}`)
    console.log(`Consumer account address: ${consumerAccount}`)
    console.log(`Staker account address: ${stakerAccount}`)
  
```

  ### 5.2 Next, lets get the address of the deployed contracts
```Typescript
    addresses = getAddresses()
  
```

  ### 5.3 We send some OCEAN to consumer and staker accounts
```Typescript
    transfer(web3, publisherAccount, addresses.Ocean, consumerAccount, '100')
    transfer(web3, publisherAccount, addresses.Ocean, stakerAccount, '100')
  
```

## 6. Publish Data NFT and a Datatoken with a fixed rate exchange

  ### 6.1 Publish a dataset (create NFT + Datatoken) with a fixed rate exchange
```Typescript
    const factory = new NftFactory(addresses.ERC721Factory, web3)

    const nftParams: NftCreateData = {
      name: FRE_NFT_NAME,
      symbol: FRE_NFT_SYMBOL,
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const datatokenParams: DatatokenCreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

    const freParams: FreCreationParams = {
      fixedRateAddress: addresses.FixedPrice,
      baseTokenAddress: addresses.Ocean,
      owner: publisherAccount,
      marketFeeCollector: publisherAccount,
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: '0.001',
      allowedConsumer: ZERO_ADDRESS,
      withMint: false
    }

    const tx = await factory.createNftWithDatatokenWithFixedRate(
      publisherAccount,
      nftParams,
      datatokenParams,
      freParams
    )

    freNftAddress = tx.events.NFTCreated.returnValues[0]
    freDatatokenAddress = tx.events.TokenCreated.returnValues[0]
    freAddress = tx.events.NewFixedRate.returnValues.exchangeContract
    freId = tx.events.NewFixedRate.returnValues.exchangeId

```
Now let's console log each of those values to check everything is working
```Typescript
    console.log(`Fixed rate exchange NFT address: ${freNftAddress}`)
    console.log(`Fixed rate exchange Datatoken address: ${freDatatokenAddress}`)
    console.log(`Fixed rate exchange address: ${freAddress}`)
    console.log(`Fixed rate exchange Id: ${freId}`)
  
```

  ### 6.2 Set metadata in the fixed rate exchange NFT
```Typescript
    const nft = new Nft(web3)

```
Now we are going to update the ddo and set the did
```Typescript
    DDO.chainId = await web3.eth.getChainId()
    DDO.id =
      'did:op:' +
      SHA256(web3.utils.toChecksumAddress(freNftAddress) + DDO.chainId.toString(10))
    DDO.nftAddress = freNftAddress

```
Next, let's encrypt the file(s) using provider
```Typescript
    ASSET_URL.datatokenAddress = freDatatokenAddress
    ASSET_URL.nftAddress = freNftAddress
    const encryptedFiles = await ProviderInstance.encrypt(ASSET_URL, providerUrl)
    DDO.services[0].files = await encryptedFiles
    DDO.services[0].datatokenAddress = freDatatokenAddress

```
Now let's console log the DID to check everything is working
```Typescript
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
```

  ### 6.3 Marketplace displays fixed rate asset for sale
```Typescript
    const fixedRate = new FixedRateExchange(freAddress, web3)
    const oceanAmount = await (
      await fixedRate.calcBaseInGivenDatatokensOut(freId, '1')
    ).baseTokenAmount
```
Now that the market has fetched those values it can display the asset on the front end. In our case we will just console log the results:
```Typescript
    console.log(`Price of 1 ${FRE_NFT_SYMBOL} is ${oceanAmount} OCEAN`)
  
```

  ### 6.4 Consumer buys a fixed rate asset data asset, and downloads it
```Typescript
    const datatoken = new Datatoken(web3)
    const DATATOKEN_AMOUNT = '10000'

    await datatoken.mint(freDatatokenAddress, publisherAccount, DATATOKEN_AMOUNT)

    const consumerETHBalance = await web3.eth.getBalance(consumerAccount)

```
Let's do a quick check of the consumer ETH balance before the swap
```Typescript
    console.log(`Consumer ETH balance: ${consumerETHBalance}`)
    let consumerOCEANBalance = await balance(web3, addresses.Ocean, consumerAccount)
    console.log(`Consumer OCEAN balance before swap: ${consumerOCEANBalance}`)
    let consumerDTBalance = await balance(web3, freDatatokenAddress, consumerAccount)
    console.log(`Consumer ${FRE_NFT_SYMBOL} balance before swap: ${consumerDTBalance}`)

```
Before we call the contract we have to call `approve` so that the contract can move our tokens. This is standard when using any ERC20 Datatokens
```Typescript
    await approve(web3, consumerAccount, addresses.Ocean, freAddress, '100')
    await approve(
      web3,
      publisherAccount,
      freDatatokenAddress,
      freAddress,
      DATATOKEN_AMOUNT
    )

    const fixedRate = new FixedRateExchange(freAddress, web3)
```
Now we can make the contract call
```Typescript
    await fixedRate.buyDatatokens(consumerAccount, freId, '1', '2')

    consumerOCEANBalance = await balance(web3, addresses.Ocean, consumerAccount)
    console.log(`Consumer OCEAN balance after swap: ${consumerOCEANBalance}`)
    consumerDTBalance = await balance(web3, freDatatokenAddress, consumerAccount)
    console.log(`Consumer ${FRE_NFT_SYMBOL} balance after swap: ${consumerDTBalance}`)

    const resolvedDDO = await aquarius.waitForAqua(DDO.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')

```
Next, we need to initialize the provider
```Typescript
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

```
Lets now make the payment
```Typescript
    const tx = await datatoken.startOrder(
      freDatatokenAddress,
      consumerAccount,
      consumerAccount,
      0,
      providerFees
    )
```
Now we can get the url
```Typescript
    const downloadURL = await ProviderInstance.getDownloadUrl(
      DDO.id,
      consumerAccount,
      DDO.services[0].id,
      0,
      tx.transactionHash,
      providerUrl,
      web3
    )

```
Lets check that the download URL was successfully received
```Typescript
    console.log(`Download URL: ${downloadURL}`)

    consumerOCEANBalance = await balance(web3, addresses.Ocean, consumerAccount)
    console.log(`Consumer OCEAN balance after order: ${consumerOCEANBalance}`)
    consumerDTBalance = await balance(web3, freDatatokenAddress, consumerAccount)
    console.log(`Consumer ${FRE_NFT_SYMBOL} balance after order: ${consumerDTBalance}`)

    try {
      const fileData = await downloadFile(downloadURL)
      console.log(fileData)
    } catch (e) {
      assert.fail('Download failed')
    }
  
```

## 7. Publish Data NFT and a Datatoken with a dispenser

  ### 7.1 Publish a dataset (create NFT + Datatoken) with a dispenser
```Typescript
    const factory = new NftFactory(addresses.ERC721Factory, web3)

    const nftParams: NftCreateData = {
      name: DISP_NFT_NAME,
      symbol: DISP_NFT_SYMBOL,
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const datatokenParams: DatatokenCreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

    const dispenserParams: DispenserCreationParams = {
      dispenserAddress: addresses.Dispenser,
      maxTokens: '1',
      maxBalance: '1',
      withMint: true,
      allowedSwapper: ZERO_ADDRESS
    }

    const tx = await factory.createNftWithDatatokenWithDispenser(
      publisherAccount,
      nftParams,
      datatokenParams,
      dispenserParams
    )

    dispenserNftAddress = tx.events.NFTCreated.returnValues[0]
    dispenserDatatokenAddress = tx.events.TokenCreated.returnValues[0]
    dispenserAddress = tx.events.DispenserCreated.returnValues[0]
```
Lets check that we managed to received all of those values without any problems
```Typescript
    console.log(`Dispenser NFT address: ${dispenserNftAddress}`)
    console.log(`Dispenser Datatoken address: ${dispenserDatatokenAddress}`)
    console.log(`Dispenser address: ${dispenserAddress}`)
  
```

  ### 7.2 Set metadata in the dispenser NFT
```Typescript
    const nft = new Nft(web3)

```
Lets start by updating the ddo and setting the did
```Typescript
    DDO.chainId = await web3.eth.getChainId()
    DDO.id =
      'did:op:' +
      SHA256(web3.utils.toChecksumAddress(dispenserNftAddress) + DDO.chainId.toString(10))
    DDO.nftAddress = dispenserNftAddress

```
Now we need to encrypt file(s) using provider
```Typescript
    ASSET_URL.datatokenAddress = dispenserDatatokenAddress
    ASSET_URL.nftAddress = dispenserNftAddress
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
  
```

  ### 7.3 Consumer gets a dispenser data asset, and downloads it
```Typescript
    const datatoken = new Datatoken(web3)
    const dispenser = new Dispenser(addresses.Dispenser, web3)

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
```
At this point we need to encrypt file(s) using provider
```Typescript
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
```
Now we need to make the payment
```Typescript
    const tx = await datatoken.startOrder(
      dispenserDatatokenAddress,
      consumerAccount,
      consumerAccount,
      0,
      providerFees
    )
```
Now we can get the download URL
```Typescript
    const downloadURL = await ProviderInstance.getDownloadUrl(
      DDO.id,
      consumerAccount,
      DDO.services[0].id,
      0,
      tx.transactionHash,
      providerUrl,
      web3
    )
```
Let's check we received the download URL ok
```Typescript
    console.log(`Download URL: ${downloadURL}`)

    consumerDTBalance = await balance(web3, dispenserDatatokenAddress, consumerAccount)
    console.log(`Consumer ${DISP_NFT_SYMBOL} balance after order: ${consumerDTBalance}`)

    try {
      const fileData = await downloadFile(downloadURL)
      console.log(fileData)
    } catch (e) {
      assert.fail('Download failed')
    }
  
```


## Editing this file
Please note that CodeExamples.md is an autogenerated file, you should not edit it directly.
Updates should be done in `test/integration/CodeExamples.test.ts` and all markdown should have three forward slashes before it
e.g. `/// # H1 Title`
