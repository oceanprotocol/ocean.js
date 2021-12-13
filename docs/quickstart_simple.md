# Quickstart: Simple Flow

This section describes how to create a datatoken and host a dataset using the simplest flow.

Here are the the steps:

1. Initialize services
2. Create a new node.js project
3. Install dependencies
4. Create a config file and update contract addresses
5. Publish a new data token 
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
    "@oceanprotocol/contracts": "^0.5.6",
    "@oceanprotocol/lib": "^0.6.5",
    "web3": "^1.3.0"
  }
```

Now in your terminal run the following command: 

```bash
npm install
```

## 4. Create a config file and update contract addresses

Create a new config.js file: 

```bash
cat > config.js
```

Now open the config.js in your code editor and enter the following:

```Javascript
const { ConfigHelper } = require("@oceanprotocol/lib");
const Web3 = require("web3");
const defaultConfig = new ConfigHelper().getConfig("development");

const urls = {
  networkUrl: "http://localhost:8545",
  aquarius: "http://localhost:5000",
  providerUri: "http://localhost:8030",
};

const contracts = {
  "DTFactory": "0x_YOUR_DTFactory_ADDRESS_",
  "BFactory": "0x_YOUR_DTFactory_ADDRESS_",
  "FixedRateExchange": "0x_YOUR_DTFactory_ADDRESS_",
  "Metadata": "0x_YOUR_Metadata_ADDRESS_",
  "Ocean": "0x_YOUR_Ocean_ADDRESS_"
};

const config = {
  ...defaultConfig,
  metadataCacheUri: urls.aquarius,
  providerUri: urls.providerUri,
  web3Provider: new Web3(urls.networkUrl),
};

module.exports = {
  config,
  contracts,
  urls,
};

```

Now check what your contract addresses are locally. In your terminal run:

```bash
cat ~/.ocean/ocean-contracts/artifacts/address.json
```

Next, update the contract addresses in your config.js file. Replace each of the place holders with the actual addresses that were outputted into your terminal. 

## 5. Publish a new data token 
Now open the `index.js` file in your text editor. Enter the following code and save the file:

```Javascript
const Web3 = require("web3");
const { Ocean, DataTokens } = require("@oceanprotocol/lib");

const factoryABI = require("@oceanprotocol/contracts/artifacts/DTFactory.json").abi;
const datatokensABI = require("@oceanprotocol/contracts/artifacts/DataTokenTemplate.json").abi;
const { config, contracts, urls } = require("./config");



const init = async () => {
  const ocean = await Ocean.getInstance(config);
  const blob = `http://localhost:8030/api/v1/services/consume`;

  const accounts = await ocean.accounts.list();
  const alice = accounts[0].id;
  console.log('Alice account address:', alice)

  const datatoken = new DataTokens(
    contracts.DTFactory,
    factoryABI,
    datatokensABI,
    new Web3(urls.networkUrl)
  );
  const tokenAddress = await datatoken.create(blob, alice);
  console.log(`Deployed datatoken address: ${tokenAddress}`);
};

init();
```

Now in your terminal, run the following command: 

```bash
node index.js
```

Congratulations, you've created your first Ocean datatoken! 🌊🐋

## 6. Mint 100 tokens

Next, we will edit the code in `index.js` to mint 100 datatokens. These 100 data tokens are minted and sent to Alice's Address. 

At the end of the `init() { ... }` function (after `console.log('Deployed datatoken address: ${tokenAddress}')`) add the following line of code:

```Javascript
  await datatoken.mint(tokenAddress, alice, '100', alice)
  let aliceBalance = await datatoken.balance(tokenAddress, alice)
  console.log('Alice token balance:', aliceBalance)
```

Now run the `index.js` file again:

```bash
node index.js
```

You should now see in the console output that Alice has a token balance of 100. 

## 7. Transfer tokens between users.

Next we will transfer tokens from Alice to Bob. First we will edit the `init() { ... }` function to create an address for Bob. On the line after `const alice = accounts[0].id` add the following code:

```Javascript
  const bob = accounts[1].id;
  console.log('Bob account address:', bob);
```

Now at the end of the `init() { ... }` function (after `console.log('Alice token balance:', aliceBalance)`) add the following code:

```Javascript
  const transaction = await datatoken.transfer(tokenAddress, bob, '50', alice)
  const transactionId = transaction['transactionHash']
  console.log('transactionId', transactionId)

  const bobBalance = await datatoken.balance(tokenAddress, bob)
  aliceBalance = await datatoken.balance(tokenAddress, alice)

  console.log('Alice token balance:', aliceBalance)
  console.log('Bob token balance:', bobBalance)
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
const testData = {
  main: {
    type: "dataset",
    name: "test-dataset",
    dateCreated: new Date(Date.now()).toISOString().split(".")[0] + "Z",
    author: "test",
    license: "MIT",
    files: [
      {
        url:
          "https://file-examples-com.github.io/uploads/2017/02/file_example_XLS_10.xls",
        contentType: "xlsx",
      },
    ],
  },
};

module.exports = { testData };
```

Now, in your `index.js` file import the test data. Add the following line of code at the top of the file under the other `require()` statements:

```Javascript
const { testData } = require("./data");
```

At the end of the `init() { ... }` function (after `console.log('Bob token balance:', bobBalance)`) add the following code:

```Javascript
  dataService = await ocean.assets.createAccessServiceAttributes(
    accounts[0],
    10, // set the price in datatoken
    new Date(Date.now()).toISOString().split(".")[0] + "Z", // publishedDate
    0 // timeout
  );

  // publish asset
  const createData = await ocean.assets.create(
    testData,
    accounts[0],
    [dataService],
    tokenAddress
  );

  const dataId = createData.id;
  console.log('Data ID:', dataId);
```

Now save and run the `index.js` file:

```Bash
node index.js
```

In the terminal output you should now see the Data ID (did) outputed.  

Congratulations, you have published your first dataset! 🌊🐠🐡 Now you are ready for the [marketplace flow](docs/quickstart_marketplace.md). 
