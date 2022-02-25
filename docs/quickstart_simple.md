# Quickstart: Simple Flow

This section describes how to create a datatoken and host a dataset using the simplest flow.

Here are the the steps:

1. Initialize services
2. Create a new node.js project
3. Install dependencies
4. Create a .env and config file
5. Publish a new dataNFT and datatoken
6. Mint 100 tokens
7. Transfer tokens between users.
8. Host a dataset

Let's go through each of these in detail.

## 1. Initialize services

We start by initializing the services. To do this, we clone the Barge repository and run it. This will run the current default versions of [Aquarius](https://github.com/oceanprotocol/aquarius), [Provider](https://github.com/oceanprotocol/provider-py), and [Ganache](https://github.com/trufflesuite/ganache-cli) with [our contracts](https://github.com/oceanprotocol/ocean-contracts) deployed to it.

```bash
git clone https://github.com/oceanprotocol/barge.git
cd barge/
./start_ocean.sh --with-provider2 --no-dashboard
```

## 2. Create a new node.js project

Start by creating a new Node.js project. Open a new terminal and enter the following commands:

```bash
mkdir ocean-quickstart
cd ocean-quickstart
npm init
# Answer the questions in the command line prompt
cat > index.js
# On linux press CTRL + D to save
```

## 3. Install dependencies

Open the package.json file in a text editor and update the dependencies to include the following:

```JSON
  "dependencies": {
    "@oceanprotocol/contracts": "^0.5.6", // TODO: replace version
    "@oceanprotocol/lib": "^0.6.5", // TODO: replace version
    "web3": "^1.7.0"
  }
```

Now in your terminal run the following command:

```bash
npm install
```

## 4. Create a config file and update contract addresses

### Create a .env file

```bash
NETWORK_URL=http://172.15.0.3:8545
AQUARIUS_URL=http://172.15.0.5:5000
PROVIDER_URL=http://172.15.0.4:8030
# Replace <12 words>
# If using barge locally, the mnemonic is "taxi music thumb unique chat sand crew more leg another off lamp"
MNEMONIC=<12 words>
OCEAN_NETWORK=development
# Replace <path-to-home>
ADDRESS_FILE="<path-to-home>/.ocean/ocean-contracts/artifacts/address.json"
```

### Create a new config.js file:

```bash
cat > config.js
```

Now open the config.js in your code editor and enter the following:

```Javascript
require('dotenv').config()
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs");
const { homedir } = require('os');
const { ConfigHelper } = require("@oceanprotocol/lib");

var oceanConfig = new ConfigHelper().getConfig(process.env.OCEAN_NETWORK);

if (process.env.OCEAN_NETWORK === 'development') {
  const addressData = JSON.parse(
    fs.readFileSync(
      process.env.ADDRESS_FILE ||
      `${homedir}/.ocean/ocean-contracts/artifacts/address.json`,
      'utf8'
    )
  )
  addresses = addressData[process.env.OCEAN_NETWORK]

  oceanConfig = {
    ...oceanConfig,
    oceanTokenAddress: addresses['Ocean'],
    poolTemplateAddress: addresses['poolTemplate'],
    fixedRateExchangeAddress: addresses['FixedPrice'],
    dispenserAddress: addresses['Dispenser'],
    erc721FactoryAddress: addresses['ERC721Factory'],
    sideStakingAddress: addresses['Staking'],
    opfCommunityFeeCollector: addresses['OPFCommunityFeeCollector']
  }
}

oceanConfig = {
  ...oceanConfig,
  metadataCacheUri: process.env.AQUARIUS_URL,
  nodeUri: process.env.NETWORK_URL,
  providerUri: process.env.PROVIDER_URL
}

const provider = new HDWalletProvider(process.env.MNEMONIC, oceanConfig.nodeUri);

module.exports = {
  provider,
  oceanConfig
};
```

Now check what your contract addresses are locally. In your terminal run:

```bash
cat ~/.ocean/ocean-contracts/artifacts/address.json
```

You should get an non-empty output.

## 5. Publish a new datatoken

Now open the `index.js` file in your text editor. Enter the following code and save the file:

```Javascript
const { NftFactory } = require("@oceanprotocol/lib");
const { provider, oceanConfig } = require('./config');
const Web3 = require("web3");

const web3 = new Web3(provider);

const createDataNFT = async (web3) => {
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
    }
}

createDataNFT(web3).then(({ erc721Address, datatokenAddress }) => {
    console.log(`DataNft address ${erc721Address}`);
    console.log(`Datatoken address ${datatokenAddress}`);
    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
})

```

Now in your terminal, run the following command:

```bash
node index.js
```

Congratulations, you've created your first Ocean datatoken! 🌊🐋

## 6. Mint 100 tokens

Next, we will edit the code in `index.js` to mint 100 datatokens. These 100 datatokens are minted and sent to ppublisher's address.

At the end of the file add the `mintDatatoken` function and replace the call to `createDataNFT` function and as follows:

```Javascript

const mintDatatoken = async (datatokenAddress, web3) => {

    const accounts = await web3.eth.getAccounts();
    const publisherAccount = accounts[0];

    const datatoken = new Datatoken(web3);

    await datatoken.mint(datatokenAddress, publisherAccount, '1', publisherAccount)
    const publisherBalance = await datatoken.balance(datatokenAddress, publisherAccount)
    console.log(`Publsiher balance ${publisherBalance}`)
}

createDataNFT(web3).then(({ erc721Address,
    datatokenAddress }) => {

    mintDatatoken(datatokenAddress, web3).then(() => {
        console.log("Done");
        process.exit(err => {
            console.error(err);
            process.exit(1);
        });
    }).catch()
}).catch(err => {
    console.error(err);
    process.exit(1);
})
```

Now run the `index.js` file again:

```bash
node index.js
```

You should now see in the console output that Alice has a token balance of 100.

## 7. Transfer tokens between users.

Next we will transfer tokens from Alice to Bob. First we will edit the callback of `createDataNFT` function to create an address for Bob. Change the callback function as follows:

```Javascript
createDataNFT(web3).then(async ({ erc721Address,
    datatokenAddress }) => {

    const accounts = await web3.eth.getAccounts();
    const alice = accounts[0];
    const bob = accounts[1];

    const datatoken = new Datatoken(web3);

    await datatoken.mint(datatokenAddress, alice, '1', alice)

    // Send 1 datatoken fro alice to bob 
    await datatoken.transfer(datatokenAddress, bob, '1', alice)

    const bobBalance = await datatoken.balance(datatokenAddress, bob)
    console.log(`Bob balance ${bobBalance}`)

    process.exit();

}).catch(err => {
    console.error(err);
    process.exit(1);
})
```

Save the `index.js` file and run it again. In your terminal enter:

```bash
node index.js
```

You should now see in the terminal output that both Alice and Bob have a token balance of 50.

## 8. Publish a dataset

Create a new file called data.js. In your terminal enter these commands:

```Bash
cat > data.js
```

Open the data.js file in your text editor. Enter the following code and save the file:

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
}

const files = [
  {
    type: 'url',
    url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
    method: 'GET'
  }
]
```

Now, in your `index.js` file import the test data. Add the following line of code at the top of the file under the other `require()` statements:

```Javascript
const { ddo, files } = require("./data");
```

At the end of add remove the call to function `createDataNFT` add the following code:

```Javascript

const setMetadata = async (erc721Address, datatokenAddress) => {
    const accounts = await web3.eth.getAccounts();
    const publisherAccount = accounts[0];

    // create the files encrypted string
    let providerResponse = await ProviderInstance.encrypt(files, providerUrl)
    ddo.services[0].files = await providerResponse;
    ddo.services[0].datatokenAddress = datatokenAddress
    // update ddo and set the right did
    ddo.nftAddress = erc721Address
    const chain = await web3.eth.getChainId()
    ddo.id =
        'did:op:' + SHA256(web3.utils.toChecksumAddress(erc721Address) + chain.toString(10))

    providerResponse = await ProviderInstance.encrypt(ddo, providerUrl);
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

    console.log(`Resolved asset did [${ddo.id}]from aquarius.`)
}

createDataNFT().then(({ erc721Address,
    datatokenAddress }) => {

    console.log(`DataNft address ${erc721Address}`);
    console.log(`Datatoken address ${datatokenAddress}`);

    setMetadata(erc721Address, datatokenAddress).then(() => {
        console.log("Metadata set.")
        process.exit();
    })

}).catch(err => {
    console.error(err);
    process.exit(1);
})
```

Now save and run the `index.js` file:

```Bash
node index.js
```

In the terminal output you should now see the Data ID (did) outputed.

Congratulations, you have published your first dataset! 🌊🐠🐡 Now you are ready for the [marketplace flow](docs/quickstart_marketplace.md).
