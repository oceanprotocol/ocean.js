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

0. [Prerequisites](#0-prerequisites)
1. [Initialize services](#1-initialize-services)
2. [Create a new node.js project](#2-create-a-new-nodejs-project)
3. [Install dependencies](#3-install-dependancies)
4. [Import dependencies and add variables and constants](#4-import-dependencies-and-add-variables-and-constants)
5. [Load the configuration, initialize accounts and deploy contracts](#5-load-the-configuration-initialize-accounts-and-deploy-contracts)
6. [Publish Data NFT and a Datatoken with a fixed rate exchange](#6-publish-data-nft-and-a-datatoken-with-a-fixed-rate-exchange)
7. [Consume a fixed rate asset data asset'](#7-consume-a-fixed-rate-asset-data-asset)
8. [Publish Data NFT and a Datatoken with a dispenser](#8-publish-data-nft-and-a-datatoken-with-a-dispenserr)
9. [Consume a dispenser data asset](#9-consume-a-dispenser-data-asset)
10. [Using ERC725 Key-Value Store](#10-using-erc725-key-value-store)

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

## 3. Install dependencies

Install dependencies running the following command in your terminal:

```bash
npm install @oceanprotocol/lib crypto-js ethers@5.7.2 typescript @types/node ts-node
```

## 4. Import dependencies and add variables and constants

Now open the `marketplace.js` file in your text editor.

Start by importing all of the necessary dependencies

```Typescript
import fs from 'fs'

import { ethers, providers, Signer } from 'ethers'
import { SHA256 } from 'crypto-js'
import { homedir } from 'os'
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
  Nft,
  NftCreateData,
  NftFactory,
  ProviderFees,
  ProviderInstance,
  transfer,
  ZERO_ADDRESS,
  sendTx,
  ConfigHelper,
  configHelperNetworks,
  amountToUnits,
  ValidateMetadata,
  getEventFromTx,
  DDO,
  LoggerInstance
} from '@oceanprotocol/lib'
```

<!--
describe('Marketplace flow tests
-->

Now we define the variables which we will need later

```Typescript
  let provider: ethers.providers.JsonRpcProvider
  let config: Config
  let aquarius: Aquarius
  let datatoken: Datatoken
  let providerUrl: any
  let publisherAccount: Signer
  let consumerAccount: Signer
  let stakerAccount: Signer
  let addresses: any
  let freNftAddress: string
  let freDatatokenAddress: string
  let freAddress: string
  let freId: string
  let dispenserNftAddress: string
  let dispenserDatatokenAddress: string
  let dispenserAddress: string
  let fixedDDO
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
  const genericAsset: DDO = {
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
      license: 'MIT',
      tags: ['white-papers'],
      additionalInformation: { 'test-key': 'test-value' },
      links: ['http://data.ceda.ac.uk/badc/ukcp09/']
    },
    services: [
      {
        id: 'testFakeId',
        type: 'access',
        description: 'Download service',
        files: '',
        datatokenAddress: '0x0',
        serviceEndpoint: 'http://172.15.0.4:8030',
        timeout: 0
      }
    ]
  }
```

## 5. Load the configuration, initialize accounts and deploy contracts
```Typescript
  
    provider = new providers.JsonRpcProvider(
      process.env.NODE_URI || configHelperNetworks[1].nodeUri
    )
    publisherAccount = (await provider.getSigner(0)) as Signer
    consumerAccount = (await provider.getSigner(1)) as Signer
    stakerAccount = (await provider.getSigner(2)) as Signer
    const config = new ConfigHelper().getConfig(
      parseInt(String((await publisherAccount.provider.getNetwork()).chainId))
    )
    config.providerUri = process.env.PROVIDER_URL || config.providerUri
    aquarius = new Aquarius(config?.metadataCacheUri)
    providerUrl = config?.providerUri
    addresses = JSON.parse(
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.readFileSync(
        process.env.ADDRESS_FILE ||
          `${homedir}/.ocean/ocean-contracts/artifacts/address.json`,
        'utf8'
      )
    ).development
```
As we go along it's a good idea to console log the values so that you check they are right
```Typescript
    console.log(`Aquarius URL: ${config.metadataCacheUri}`)
    console.log(`Provider URL: ${providerUrl}`)
    console.log(`Deployed contracts address: ${addresses}`)
    console.log(`Publisher account address: ${await publisherAccount.getAddress()}`)
    console.log(`Consumer account address: ${await consumerAccount.getAddress()}`)
    console.log(`Staker account address: ${await stakerAccount.getAddress()}`)
  
```

  ### 5.1 Mint OCEAN to publisher account
You can skip this step if you are running your script against a remote network,
you need to mint oceans to mentioned accounts only if you are using barge to test your script

```Typescript
    const minAbi = [
      {
        constant: false,
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' }
        ],
        name: 'mint',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ]

    const tokenContract = new ethers.Contract(addresses.Ocean, minAbi, publisherAccount)
    const estGasPublisher = await tokenContract.estimateGas.mint(
      await publisherAccount.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )
    await sendTx(
      estGasPublisher,
      publisherAccount,
      1,
      tokenContract.mint,
      await publisherAccount.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )
  
```

  ### 5.3 We send some OCEAN to consumer and staker accounts
```Typescript
    transfer(
      publisherAccount,
      config,
      addresses.Ocean,
      await consumerAccount.getAddress(),
      '100'
    )
    transfer(
      publisherAccount,
      config,
      addresses.Ocean,
      await stakerAccount.getAddress(),
      '100'
    )
  
```

## 6. Publish Data NFT and a Datatoken with a fixed rate exchange

  ### 6.1 Publish a dataset (create NFT + Datatoken) with a fixed rate exchange
```Typescript
    const factory = new NftFactory(addresses.ERC721Factory, publisherAccount)

    const nftParams: NftCreateData = {
      name: FRE_NFT_NAME,
      symbol: FRE_NFT_SYMBOL,
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: await publisherAccount.getAddress()
    }

    const datatokenParams: DatatokenCreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: await publisherAccount.getAddress(),
      mpFeeAddress: ZERO_ADDRESS
    }

    const freParams: FreCreationParams = {
      fixedRateAddress: addresses.FixedPrice,
      baseTokenAddress: addresses.Ocean,
      owner: await publisherAccount.getAddress(),
      marketFeeCollector: await publisherAccount.getAddress(),
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: '1',
      marketFee: '0.001',
      allowedConsumer: ZERO_ADDRESS,
      withMint: true
    }

    const bundleNFT = await factory.createNftWithDatatokenWithFixedRate(
      nftParams,
      datatokenParams,
      freParams
    )

    const trxReceipt = await bundleNFT.wait()
    // events have been emitted
    const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
    const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')
    const newFreEvent = getEventFromTx(trxReceipt, 'NewFixedRate')

    freNftAddress = nftCreatedEvent.args.newTokenAddress
    freDatatokenAddress = tokenCreatedEvent.args.newTokenAddress
    freAddress = newFreEvent.args.exchangeContract
    freId = newFreEvent.args.exchangeId

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
    const nft = new Nft(
      publisherAccount,
      (await publisherAccount.provider.getNetwork()).chainId
    )

    fixedDDO = { ...genericAsset }

```
Now we are going to update the ddo and set the did
```Typescript

    fixedDDO.chainId = (await publisherAccount.provider.getNetwork()).chainId
    fixedDDO.id =
      'did:op:' +
      SHA256(ethers.utils.getAddress(freNftAddress) + fixedDDO.chainId.toString(10))
    fixedDDO.nftAddress = freNftAddress

```
Next, let's encrypt the file(s) using provider
```Typescript
    ASSET_URL.datatokenAddress = freDatatokenAddress
    ASSET_URL.nftAddress = freNftAddress
    fixedDDO.services[0].files = await ProviderInstance.encrypt(
      ASSET_URL,
      fixedDDO.chainId,
      providerUrl
    )
    fixedDDO.services[0].datatokenAddress = freDatatokenAddress

```
Now let's console log the DID to check everything is working
```Typescript
    console.log(`DID: ${fixedDDO.id}`)

    const providerResponse = await ProviderInstance.encrypt(
      fixedDDO,
      fixedDDO.chainId,
      providerUrl
    )
    const encryptedDDO = await providerResponse
    const isAssetValid: ValidateMetadata = await aquarius.validate(fixedDDO)
    assert(isAssetValid.valid === true, 'Published asset is not valid')
    await nft.setMetadata(
      freNftAddress,
      await publisherAccount.getAddress(),
      0,
      providerUrl,
      '',
      ethers.utils.hexlify(2),
      encryptedDDO,
      isAssetValid.hash
    )
  })
```

  ### 6.3 Marketplace displays fixed rate asset for sale
```Typescript
    const fixedRate = new FixedRateExchange(freAddress, publisherAccount)
    const oceanAmount = await (
      await fixedRate.calcBaseInGivenDatatokensOut(freId, '1')
    ).baseTokenAmount
```
Now that the market has fetched those values it can display the asset on the front end. In our case we will just console log the results:
```Typescript
    console.log(`Price of 1 ${FRE_NFT_SYMBOL} is ${oceanAmount} OCEAN`)
  
```

## 7. Consume a fixed rate asset data asset

  ### 7.1 Consumer buys a fixed rate asset data asset, and downloads it
```Typescript
    datatoken = new Datatoken(publisherAccount)
    const DATATOKEN_AMOUNT = '10000'

    await datatoken.mint(
      freDatatokenAddress,
      await publisherAccount.getAddress(),
      DATATOKEN_AMOUNT
    )

    const consumerBalance = await provider.getBalance(await consumerAccount.getAddress())
    const consumerETHBalance = ethers.utils.formatEther(consumerBalance)

```
Let's do a quick check of the consumer ETH balance before the swap
```Typescript
    console.log(`Consumer ETH balance: ${consumerETHBalance}`)
    let consumerOCEANBalance = await balance(
      consumerAccount,
      addresses.Ocean,
      await consumerAccount.getAddress()
    )
    console.log(`Consumer OCEAN balance before swap: ${consumerOCEANBalance}`)
    let consumerDTBalance = await balance(
      consumerAccount,
      freDatatokenAddress,
      await consumerAccount.getAddress()
    )
    console.log(`Consumer ${FRE_NFT_SYMBOL} balance before swap: ${consumerDTBalance}`)

```
Before we call the contract we have to call `approve` so that the contract can move our tokens. This is standard when using any ERC20 Datatokens
```Typescript
    await approve(
      consumerAccount,
      config,
      await consumerAccount.getAddress(),
      addresses.Ocean,
      freAddress,
      '100'
    )
    await approve(
      publisherAccount,
      config,
      await publisherAccount.getAddress(),
      freDatatokenAddress,
      freAddress,
      DATATOKEN_AMOUNT
    )

    const fixedRate = new FixedRateExchange(freAddress, consumerAccount)
```
Now we can make the contract call
```Typescript
    await fixedRate.buyDatatokens(freId, '1', '2')

    consumerOCEANBalance = await balance(
      consumerAccount,
      addresses.Ocean,
      await consumerAccount.getAddress()
    )
    console.log(`Consumer OCEAN balance after swap: ${consumerOCEANBalance}`)
    consumerDTBalance = await balance(
      consumerAccount,
      freDatatokenAddress,
      await consumerAccount.getAddress()
    )
    console.log(`Consumer ${FRE_NFT_SYMBOL} balance after swap: ${consumerDTBalance}`)

    const resolvedDDO = await aquarius.waitForAqua(fixedDDO.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')

```
Next, we need to initialize the provider
```Typescript
    const initializeData = await ProviderInstance.initialize(
      resolvedDDO.id,
      resolvedDDO.services[0].id,
      0,
      await consumerAccount.getAddress(),
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

    datatoken = new Datatoken(consumerAccount)

```
Lets now make the payment
```Typescript
    const tx = await datatoken.startOrder(
      freDatatokenAddress,
      await consumerAccount.getAddress(),
      0,
      providerFees
    )
    const orderTx = await tx.wait()
    const orderStartedTx = getEventFromTx(orderTx, 'OrderStarted')
```
Now we can get the url
```Typescript
    const downloadURL = await ProviderInstance.getDownloadUrl(
      fixedDDO.id,
      fixedDDO.services[0].id,
      0,
      orderStartedTx.transactionHash,
      providerUrl,
      consumerAccount
    )

```
Lets check that the download URL was successfully received
```Typescript
    console.log(`Download URL: ${downloadURL}`)

    consumerOCEANBalance = await balance(
      consumerAccount,
      addresses.Ocean,
      await consumerAccount.getAddress()
    )
    console.log(`Consumer OCEAN balance after order: ${consumerOCEANBalance}`)
    consumerDTBalance = await balance(
      consumerAccount,
      freDatatokenAddress,
      await consumerAccount.getAddress()
    )
    console.log(`Consumer ${FRE_NFT_SYMBOL} balance after order: ${consumerDTBalance}`)

    try {
      const fileData = await downloadFile(downloadURL)
      console.log(fileData)
    } catch (e) {
      LoggerInstance.error('Download failed', e)
      assert.fail('Download failed')
    }
  
```

## 8. Publish Data NFT and a Datatoken with a dispenser

  ### 8.1 Publish a dataset (create NFT + Datatoken) with a dispenser
```Typescript
    const factory = new NftFactory(addresses.ERC721Factory, publisherAccount)

    const nftParams: NftCreateData = {
      name: DISP_NFT_NAME,
      symbol: DISP_NFT_SYMBOL,
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: await publisherAccount.getAddress()
    }

    const datatokenParams: DatatokenCreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: await publisherAccount.getAddress(),
      mpFeeAddress: ZERO_ADDRESS
    }

    const dispenserParams: DispenserCreationParams = {
      dispenserAddress: addresses.Dispenser,
      maxTokens: '1',
      maxBalance: '1',
      withMint: true,
      allowedSwapper: ZERO_ADDRESS
    }

    const bundleNFT = await factory.createNftWithDatatokenWithDispenser(
      nftParams,
      datatokenParams,
      dispenserParams
    )
    const trxReceipt = await bundleNFT.wait()
    const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
    const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')
    const dispenserCreatedEvent = getEventFromTx(trxReceipt, 'DispenserCreated')

    dispenserNftAddress = nftCreatedEvent.args.newTokenAddress
    dispenserDatatokenAddress = tokenCreatedEvent.args.newTokenAddress
    dispenserAddress = dispenserCreatedEvent.args.newTokenAddress // double check this
```
Lets check that we managed to received all of those values without any problems
```Typescript
    console.log(`Dispenser NFT address: ${dispenserNftAddress}`)
    console.log(`Dispenser Datatoken address: ${dispenserDatatokenAddress}`)
    console.log(`Dispenser address: ${dispenserAddress}`)
  
```

  ### 8.2 Set metadata in the dispenser NFT
```Typescript
    const nft = new Nft(
      publisherAccount,
      (await publisherAccount.provider.getNetwork()).chainId
    )

```
Lets start by updating the ddo and setting the did
```Typescript
    fixedDDO.chainId = (await publisherAccount.provider.getNetwork()).chainId

    fixedDDO.id =
      'did:op:' +
      SHA256(ethers.utils.getAddress(dispenserNftAddress) + fixedDDO.chainId.toString(10))
    fixedDDO.nftAddress = dispenserNftAddress
```
Now we need to encrypt file(s) using provider
```Typescript
    ASSET_URL.datatokenAddress = dispenserDatatokenAddress
    ASSET_URL.nftAddress = dispenserNftAddress
    fixedDDO.services[0].files = await ProviderInstance.encrypt(
      ASSET_URL,
      fixedDDO.chainId,
      providerUrl
    )
    fixedDDO.services[0].datatokenAddress = dispenserDatatokenAddress

    console.log(`DID: ${fixedDDO.id}`)

    const encryptedDDO = await ProviderInstance.encrypt(
      fixedDDO,
      fixedDDO.chainId,
      providerUrl
    )
    const isAssetValid: ValidateMetadata = await aquarius.validate(fixedDDO)
    assert(isAssetValid.valid === true, 'Published asset is not valid')
    await nft.setMetadata(
      dispenserNftAddress,
      await publisherAccount.getAddress(),
      0,
      providerUrl,
      '',
      ethers.utils.hexlify(2),
      encryptedDDO,
      isAssetValid.hash
    )
  
```

## 9. Consume a dispenser data asset

  ### 9.1 Consumer gets a dispenser data asset, and downloads it
```Typescript
    datatoken = new Datatoken(publisherAccount)
    const dispenser = new Dispenser(addresses.Dispenser, consumerAccount)

    let consumerDTBalance = await balance(
      consumerAccount,
      dispenserDatatokenAddress,
      await consumerAccount.getAddress()
    )
    console.log(
      `Consumer ${DISP_NFT_SYMBOL} balance before dispense: ${consumerDTBalance}`
    )

    await dispenser.dispense(
      dispenserDatatokenAddress,
      '1',
      await consumerAccount.getAddress()
    )

    consumerDTBalance = await balance(
      consumerAccount,
      dispenserDatatokenAddress,
      await consumerAccount.getAddress()
    )
    console.log(
      `Consumer ${DISP_NFT_SYMBOL} balance after dispense: ${consumerDTBalance}`
    )

    const resolvedDDO = await aquarius.waitForAqua(fixedDDO.id)
    assert(resolvedDDO, 'Cannot fetch DDO from Aquarius')

    datatoken = new Datatoken(consumerAccount)

```
At this point we need to encrypt file(s) using provider
```Typescript
    const initializeData = await ProviderInstance.initialize(
      resolvedDDO.id,
      resolvedDDO.services[0].id,
      0,
      await consumerAccount.getAddress(),
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
      await consumerAccount.getAddress(),
      0,
      providerFees
    )
    const orderTx = await tx.wait()
    const orderStartedTx = getEventFromTx(orderTx, 'OrderStarted')
```
Now we can get the download URL
```Typescript
    const downloadURL = await ProviderInstance.getDownloadUrl(
      fixedDDO.id,
      fixedDDO.services[0].id,
      0,
      orderStartedTx.transactionHash,
      providerUrl,
      consumerAccount
    )
```
Let's check we received the download URL ok
```Typescript
    console.log(`Download URL: ${downloadURL}`)

    consumerDTBalance = await balance(
      consumerAccount,
      dispenserDatatokenAddress,
      await consumerAccount.getAddress()
    )
    console.log(`Consumer ${DISP_NFT_SYMBOL} balance after order: ${consumerDTBalance}`)

    try {
      const fileData = await downloadFile(downloadURL)
      console.log(fileData)
    } catch (e) {
      assert.fail('Download failed')
    }
  
```

## 10. Using ERC725 Key-Value Store

Data NFTs can store arbitrary key-value pairs on-chain. This opens up their usage for a broad variety of applications, such as comments & ratings, attestations, and privately sharing data (when the value is encrypted).

Let's see how!

Here are the steps:

1. Setup (same as above)
2. Publish data NFT (same as above)
3. Add key-value pair to data NFT (use the `setData` method)
4. Retrieve value from data NFT (use the `getData` method)

  ### 10.1 Add key-value pair to data NFT
Let's start by using the `setData` method to update the nft key value store with some data
```Typescript
    const nft = new Nft(publisherAccount)
    const data = 'SomeData'
    try {
      await nft.setData(
        freNftAddress,
        await publisherAccount.getAddress(),
        '0x1234',
        data
      )
    } catch (e) {
      console.log('e = ', e)
      assert.fail('Failed to set data in NFT ERC725 key value store', e)
    }
```

Under the hood, this uses [ERC725](https://erc725alliance.org/), which augments ERC721 with a well-defined way to set and get key-value pairs.

### 10.2 get the key-value pair data from the NFT'

Use the `getData` method to get the data stored in the nft key value store

```Typescript
    try {
      const response = await nft.getData(freNftAddress, '0x1234')
      console.log('getData response: ', response)
      assert(
        response === data,
        'Wrong data received when getting data from NFT ERC725 key value store'
      )
    } catch (e) {
      console.log('e = ', e)
      assert.fail('Failed to get data from NFT ERC725 key value store', e)
    }
```

That's it! Note the simplicity. All data was stored and retrieved from on-chain. We don't need Ocean Provider or Ocean Aquarius for these use cases (though the latter can help for fast querying & retrieval).
  


## Editing this file
Please note that CodeExamples.md is an autogenerated file, you should not edit it directly.
Updates should be done in `test/integration/CodeExamples.test.ts` and all markdown should have three forward slashes before it
e.g. `/// # H1 Title`
