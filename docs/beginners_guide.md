# A beginners guide to selling data over the blockchain

This is a beginners guide to selling a dataset over the blockchain. The process involves creating a Data NFT and a datatoken. Datatoken will be used to purchase the dataset, and listing it on a marketplace. This guide provides all the code you need and no prior knowledge is required. It is helpful if you have some experience with javascript but it is not necessary.

Selling your data over the blockchain puts you in charge of how it is used and can be a great source of passive income. There are many AI startups that have deep expertise in machine learning but need more data to improve their models. Selling your data via the blockchain gives you a level of security that you would be unable to achieve if you were selling via a centralised marketplace.

In this guide we'll be making use of the Ocean.js library. Ocean Protocol provides you with everything you need to quickly get setup and start selling data over the blockchain.

If you have any questions or issues at any point while following along to this article please reach out to us on [discord](https://discord.gg/TnXjkR5).

Here are the steps we will be following throughout the article:

0. Prerequisites
1. Initialize services
2. Create a new node.js project
3. Install dependencies
4. Create a config file and update contract addresses
5. Publish a new Data NFT and datatoken
6. Mint 200 tokens
7. Publish a dataset
8. Allow the marketplace to sell your datatokens

Let's go through each step:

## 0. Prerequisites

Before we start it is important that you have all of the necessary prerequisites installed on your computer.

- **A Unix based operating system (Linux or Mac)**. If you are a Windows user you can try to run linux inside a virtual machine but this is outside of the scope of this article.
- **Git**. Instructions for installing Git can be found here: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
- **Node.js** can be downloaded from here: https://nodejs.org/en/download/
- **Docker** can be installed from here: https://docs.docker.com/get-docker/. Please note that Docker must run as a non-root user, you can set this up by following these instructions: https://docs.docker.com/engine/install/linux-postinstall/

## 1. Initialize services

For this tutorial we will be setting up and running a local blockchain and then the datatokens will be published to your local blockchain. This isn’t as difficult as it sounds, fortunately Ocean Protocol provides the services to start your local blockchain with a couple of commands. Deploying your Datatoken to a locally run blockchain is a great way to start as it is quick and avoids any costs.

Simply copy the following commands into your terminal and your own local blockchain will start running:

```Bash
git clone https://github.com/oceanprotocol/barge.git
cd barge/
./start_ocean.sh --with-provider2 --no-dashboard
```

These commands clone the Ocean Protocol Barge service and start running it. This does more than just start a local blockchain, it also deploys the Ocean Protocol smart contracts to your local blockchain and starts a local off-chain database for saving the metadata.

A smart contract is a self executing piece of code that is stored on the blockchain. They essentially provide the backend logic for managing your datasets and datatokens. They are not contracts in the legal sense.

You can read more about each of the services that barge runs via these links:

- **Aquarius** provides the off-chain database: https://github.com/oceanprotocol/aquarius
- **Ganache** is part of the Truffle Suite of blockchain tools and it sets up and runs the local blockchain: https://github.com/trufflesuite/ganache-cli
- Ocean Protocol **smart contracts**: https://github.com/oceanprotocol/ocean-contracts
- **Provider**: https://github.com/oceanprotocol/provider-py

You need to leave the Barge services running throughout the rest of the tutorial so make sure you keep this terminal window open. All of the remaining terminal commands will be done in a new terminal window.

## 2. Create a new node.js project

You are now ready to start your project. We start by creating a new folder and initiating a new Node.js project. Open a new terminal and enter the following commands:

```bash
mkdir quickstart
cd quickstart
npm init
# Answer the questions in the command line prompt
cat > index.js
# On linux press CTRL + D to save
```

## 3. Install dependencies

Next we need to set up the Node.js project so that it installs the necessary dependencies. These include the Ocean Protocol libaries and contracts, as well as web3.js which is a javascript library for interacting with the Blockchain. If you would like to learn more about web3.js, you can read the documentation here: https://web3js.readthedocs.io/en/v1.3.4/

Now in your terminal run the following command:

```bash
npm install @oceanprotocol/lib web3 dotenv
```

At this point you may get some warning messages but there shouldn’t be any errors. As long as you don’t have any errors, you are ready to proceed.

## 4. Create a .env and config file

Now we need to set up a configuration file that will determine where your Datatoken and dataset are published to. We will enter the local addresses where the Ocean Protocol services are running. When you are ready to deploy your Datatoken on the Ethereum mainnet you will need to update these addresses, the process of live deploying your dataset and datatokens will be covered in a later blog post.

Start by creating a new `.env` file place the content as below:

```bash
NETWORK_URL=http://localhost:8545
AQUARIUS_URI=http://localhost:5000
providerUrl=http://localhost:8030

# Replace <12 words>
# If using barge locally, the mnemonic is "taxi music thumb unique chat sand crew more leg another off lamp"
MNEMONIC=<12 words>
OCEAN_NETWORK=development

# Replace <path-to-home>
ADDRESS_FILE="<path-to-home>/.ocean/ocean-contracts/artifacts/address.json"
```

In your terminal, enter the following command.

```bash
cat > config.js
```

Make sure that this config.js file has been created inside your quickstart directory. Now open the config.js in your code editor and enter the following code:

```Javascript
require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const { homedir } = require('os');
const { ConfigHelper } = require('@oceanprotocol/lib');

let oceanConfig = new ConfigHelper().getConfig(process.env.OCEAN_NETWORK);

if (process.env.OCEAN_NETWORK === 'development') {
  const addressData = JSON.parse(
    fs.readFileSync(
      process.env.ADDRESS_FILE
        || `${homedir}/.ocean/ocean-contracts/artifacts/address.json`,
      'utf8'
    )
  );
  const addresses = addressData[process.env.OCEAN_NETWORK];

  oceanConfig = {
    ...oceanConfig,
    oceanTokenAddress: addresses.Ocean,
    poolTemplateAddress: addresses.poolTemplate,
    fixedRateExchangeAddress: addresses.FixedPrice,
    dispenserAddress: addresses.Dispenser,
    erc721FactoryAddress: addresses.ERC721Factory,
    sideStakingAddress: addresses.Staking,
    opfCommunityFeeCollector: addresses.OPFCommunityFeeCollector
  };
}

oceanConfig = {
  ...oceanConfig,
  metadataCacheUri: process.env.AQUARIUS_URL,
  nodeUri: process.env.NETWORK_URL,
  providerUri: process.env.PROVIDER_URL
};

const provider = new HDWalletProvider(
  process.env.MNEMONIC,
  oceanConfig.nodeUri
);

module.exports = {
  provider,
  oceanConfig
};
```

When the Barge service started running it automatically saved contract addresses in a JSON file in a hidden folder under your home directory. We can check what these contract addresses are by running the following command into your terminal:

```bash
cat ~/.ocean/ocean-contracts/artifacts/address.json
```

You should get an non-empty output.

## 5. Publish a new Data NFT and datatoken

Now you are ready to publish your first Data NFT and Datatoken!

The Data NFT is compliant with ERC721 standard and Datatoken that we will be deploying is an ERC20 token. ERC20 is standard for fungible tokens (meaning each token is identical and interchangeable), the standard contains a list of required and optional functions that form the smart contract which manages the token balances and transfers. ERC20 is the most popular standard for tokens deployed on the Ethereum Blockchain and many of the popular tokens that you will have heard of (Tether, USDC, Dai, Binance token) all follow the ERC20 standard. You can read more about the ERC20 token standard here: https://ethereum.org/en/developers/docs/standards/tokens/erc-20/

Security is incredibly important for any blockchain token (as they are a potential target for attacks) and for this reason it is not best practice to write an ERC20 from scratch. This would introduce unnecessary complexity and would require an in depth security audit. In general, complexity is the enemy of security. Instead of writing our own ERC20 token, the code we deploy will inherit from the OpenZepplin ERC20 library. This library has been thoroughly battle tested in live environments and is used to underpin millions of dollars. You can read more about the OpenZepplin ERC20 contract libraries here: https://docs.openzeppelin.com/contracts/2.x/api/token/erc20

The process of creating and deploying the ERC721 Data NFT and ERC20 datatokens has been automated by Ocean Protocol. All we need to do is open the `index.js` file in your text editor and enter the following code:

```Javascript
const { NftFactory } = require('@oceanprotocol/lib');
const Web3 = require('web3');
const { provider, oceanConfig } = require('./config');

const web3 = new Web3(provider);

const createDataNFT = async () => {
  const Factory = new NftFactory(oceanConfig.erc721FactoryAddress, web3);

  const accounts = await web3.eth.getAccounts();
  const publisherAccount = accounts[0];

  const nftParams = {
    name: 'testNFT',
    symbol: 'TST',
    templateIndex: 1,
    tokenURI: ''
  };

  const erc20Params = {
    templateIndex: 1,
    cap: '100000',
    feeAmount: '0',
    feeManager: '0x0000000000000000000000000000000000000000',
    feeToken: '0x0000000000000000000000000000000000000000',
    minter: publisherAccount,
    mpFeeAddress: '0x0000000000000000000000000000000000000000'
  };

  const result = await Factory.createNftWithErc20(
    publisherAccount,
    nftParams,
    erc20Params
  );

  const erc721Address = result.events.NFTCreated.returnValues[0];
  const datatokenAddress = result.events.TokenCreated.returnValues[0];

  return {
    erc721Address,
    datatokenAddress
  };
};

createDataNFT()
  .then(({ erc721Address, datatokenAddress }) => {
    console.log(`DataNft address ${erc721Address}`);
    console.log(`Datatoken address ${datatokenAddress}`);

    process.exit();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

This is all the code you need to deploy your first Data NFT. Now save the file and run it. In your terminal, run the following command:

```Bash
node index.js
```

You should see the console log message stating the address of your Data NFT and datatoken. Congratulations, you've created your first Ocean Data NFT and a datatoken! 🌊🐋

## 6. Mint 200 tokens

Next, we will edit the code in `index.js` to mint 200 datatokens. These 200 datatokens are minted and sent to Alice's Address.

Replace the `createDataNFT` function with the following line of code:

```Javascript
const mintDatatoken = async (datatokenAddress) => {
  const accounts = await web3.eth.getAccounts();
  const publisherAccount = accounts[0];
  const consumerAccount = accounts[1];

  const datatoken = new Datatoken(web3);

  await datatoken.mint(
    datatokenAddress,
    publisherAccount,
    '1',
    consumerAccount
  );
  const consumerBalance = await datatoken.balance(
    datatokenAddress,
    consumerAccount
  );
  console.log(`Consumer balance ${consumerBalance}`);
};

createDataNFT()
  .then(({ erc721Address, datatokenAddress }) => {
    console.log(`DataNft address ${erc721Address}`);
    console.log(`Datatoken address ${datatokenAddress}`);

    mintDatatoken(datatokenAddress)
      .then(() => {
        console.log('Done');
        process.exit((err) => {
          console.error(err);
          process.exit(1);
        });
      })
      .catch();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

Now run the `index.js` file again:

```bash
node index.js
```

You should now see in the console output that consumer address has a token balance of 1.

## 7. Publish a dataset

Now we will publish your dataset so that it can be sold over the blockchain. We start by creating a new file called data.js. In your terminal enter these commands:

```Bash
cat > data.js
```

Now open the data.js file in your text editor. Enter the following code and save the file:

```Javascript
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
};

const files = [
  {
    type: 'url',
    url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
    method: 'GET'
  }
];

module.exports = { ddo, files };
```

If you already have a dataset hosted somewhere you can replace the example link url to the address where your dataset is hosted. You should also update the `type` field with the file extension of your dataset. If you haven’t yet hosted your dataset, you can continue with the example link in place.

Now, we need to import the dataset into the index.js file. Open your your `index.js` in your text editor and replace the content as below:

```Javascript
const {
  NftFactory,
  Nft,
  ProviderInstance,
  getHash,
  Aquarius
} = require('@oceanprotocol/lib');
const { SHA256 } = require('crypto-js');
const Web3 = require('web3');
const { provider, oceanConfig } = require('./config');
const { ddo, files } = require('./data');

const web3 = new Web3(provider);
const aquarius = new Aquarius(oceanConfig.metadataCacheUri);
const nft = new Nft(web3);
const providerUrl = oceanConfig.providerUri;
const Factory = new NftFactory(oceanConfig.erc721FactoryAddress, web3);

const createDataNFT = async () => {
  const accounts = await web3.eth.getAccounts();
  const publisherAccount = accounts[0];

  const nftParams = {
    name: 'testNFT',
    symbol: 'TST',
    templateIndex: 1,
    tokenURI: ''
  };

  const erc20Params = {
    templateIndex: 1,
    cap: '100000',
    feeAmount: '0',
    feeManager: '0x0000000000000000000000000000000000000000',
    feeToken: '0x0000000000000000000000000000000000000000',
    minter: publisherAccount,
    mpFeeAddress: '0x0000000000000000000000000000000000000000'
  };

  const result = await Factory.createNftWithErc20(
    publisherAccount,
    nftParams,
    erc20Params
  );

  const erc721Address = result.events.NFTCreated.returnValues[0];
  const datatokenAddress = result.events.TokenCreated.returnValues[0];

  return {
    erc721Address,
    datatokenAddress
  };
};

const setMetadata = async (erc721Address, datatokenAddress) => {
  const accounts = await web3.eth.getAccounts();
  const publisherAccount = accounts[0];

  // create the files encrypted string
  let providerResponse = await ProviderInstance.encrypt(files, providerUrl);
  ddo.services[0].files = await providerResponse;
  ddo.services[0].datatokenAddress = datatokenAddress;
  // update ddo and set the right did
  ddo.nftAddress = erc721Address;
  const chain = await web3.eth.getChainId();
  ddo.id = `did:op:${
    SHA256(web3.utils.toChecksumAddress(erc721Address) + chain.toString(10))}`;

  providerResponse = await ProviderInstance.encrypt(ddo, providerUrl);
  const encryptedResponse = await providerResponse;
  const metadataHash = getHash(JSON.stringify(ddo));

  await nft.setMetadata(
    erc721Address,
    publisherAccount,
    0,
    providerUrl,
    '',
    '0x2',
    encryptedResponse,
    `0x${metadataHash}`
  );

  await aquarius.waitForAqua(ddo.id);

  console.log(`Resolved asset did [${ddo.id}]from aquarius.`);
};

createDataNFT()
  .then(({ erc721Address, datatokenAddress }) => {
    console.log(`DataNft address ${erc721Address}`);
    console.log(`Datatoken address ${datatokenAddress}`);

    setMetadata(erc721Address, datatokenAddress).then(() => {
      console.log('Metadata set.');
      process.exit();
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

Now save and run the `index.js` file:

```Bash
node index.js
```

In the terminal output you should now see the Data ID (did) output.

Congratulations, you have published your first dataset! 🌊🐠

## 8. Allow the marketplace to sell you datatokens

Finally we will go through the steps for allowing a marketplace to sell your dataset. For this demonstration we will use the address of a marketplace on your local blockchain but in a live environment you would need to use the address of the actual marketplace that will be selling your data. It is important to double check that this address is correct because if it isn’t you could permanently lose your datatokens.

We start by saving the address of the marketplace. On the line after `const alice = accounts[0].id` add the following code:

```Javascript
 const marketplace = accounts[1].id;
 console.log('Marketplace account address:', marketplace);
```

Next we will initiate a transaction that approves the marketplace to send your tokens (to buyers) on your behalf.

Add the following code in `index.js` and call `createDataNFT` as follows:

```Javascript
const approveDatatoken = async (datatokenAddress) => {
  const accounts = await web3.eth.getAccounts();
  const publisherAccount = accounts[0];
  const marketplaceAddress = accounts[1];

  const datatoken = new Datatoken(web3);

  await datatoken.approve(
    datatokenAddress,
    marketplaceAddress, // marketplace address,
    '100', // marketplaceAllowance
    publisherAccount
  );
};

createDataNFT()
  .then(({ erc721Address, datatokenAddress }) => {
    console.log(`DataNft address ${erc721Address}`);
    console.log(`Datatoken address ${datatokenAddress}`);

    approveDatatoken(datatokenAddress)
      .then(() => {
        process.exit();
      })
      .catch((err) => console.log(err));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

Now save the file and run it:

```Bash
node index.js
```

Well done, you have now completed the tutorial!

There are many more things that you can do with Ocean.js which will be the subject of future blog posts. If you have any questions or if you would like you learn more about Ocean Protocol, please reach out to us on [Discord](https://discord.gg/TnXjkR5) or if you have found any issues with Ocean.js please raise them on [GitHub](https://github.com/oceanprotocol/ocean.js/issues/new?assignees=&labels=bug&template=bug_report.md&title=).
