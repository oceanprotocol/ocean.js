# Quickstart: Marketplace Flow

This batteries-included flow includes metadata, multiple services for one datatoken, and compute-to-data.

It focuses on Alice's experience as a publisher, and Bob's experience as a buyer & consumer. The rest are services used by Alice and Bob.

Here's the steps.

1. Initialize services
2. Create a new node.js project
3. Install dependancies
4. Create a config file and update contract addresses
5. Publish a new data token
6. Mint 200 tokens
7. Publish a dataset
8. Alice allows marketplace to sell her datatokens
9. Marketplace withdraws Alice's datatokens from allowance
10. Marketplace posts asset for sale
11. Bob acquires datatokens (value swap)
12. Bob downloads the dataset
13. Extensions


Let's go through each step.

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
Now open the `marketplace.js` file in your text editor. Enter the following code and save the file:

```Javascript
const Web3 = require("web3");
const { Ocean, DataTokens } = require("@oceanprotocol/lib");

const { factoryABI } = require("@oceanprotocol/contracts/artifacts/DTFactory.json");
const { datatokensABI } = require("@oceanprotocol/contracts/artifacts/DataTokenTemplate.json");
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
node marketplace.js
```

Congratulations, you've created your first Ocean datatoken! 🌊🐋

## 6. Mint 200 tokens

Next, we will edit the code in `marketplace.js` to mint 200 datatokens. These 200 data tokens are minted and sent to Alice's Address. 

At the end of the `init() { ... }` function (after `console.log('Deployed datatoken address: ${tokenAddress}')`) add the following line of code:

```Javascript
  await datatoken.mint(tokenAddress, alice, '200', alice)
  let aliceBalance = await datatoken.balance(tokenAddress, alice)
  console.log('Alice token balance:', aliceBalance)
```

Now run the `marketplace.js` file again:

```bash
node marketplace.js
```

You should now see in the console output that Alice has a token balance of 200. 

## 7. Publish a dataset

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

Now, in your `marketplace.js` file import the test data. Add the following line of code at the top of the file under the other `require()` statements:

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

Now save and run the `marketplace.js` file:

```Bash
node marketplace.js
```

In the terminal output you should now see the Data ID (did) outputed.  

Congratulations, you have published your first dataset! 🌊🐠

## 8. Alice allows marketplace to sell her datatokens

On the line after `const alice = accounts[0].id` add the following code:

```Javascript
  const marketplace = accounts[1].id;
  console.log('Marketplace account address:', marketplace);
```

At the end of the `init() { ... }` function (after `console.log('Data ID:', dataId)`) add the following code:

```Javascript
await datatoken.approve(
    tokenAddress,
    marketplace, // marketplace address,
    '100', // marketplaceAllowance
    alice
)

 const marketplaceAllowance = await datatoken.allowance(
    tokenAddress,
    alice,
    marketplace, // marketplace address,
 );

 console.log("Marketplace Allowance:", marketplaceAllowance);
```

You should see in the terminal output that the marketplace has a datatoken allowance of 100 tokens. 

Now save the file and run it:

```Bash
node marketplace.js
```

You should see in the terminal output that the marketplace has an allowance of 100 datatokens.

## 9. Marketplace withdraws Alice's datatokens from allowance

Now, you're the marketplace :) At the end of the `init() { ... }` function (after `console.log("Marketplace Allowance:", marketplaceAllowance)`) add the following code:

```Javascript
await datatoken.transferFrom(tokenAddress, alice, '100', marketplace)
const marketplaceBalance = await datatoken.balance(tokenAddress, marketplace)
aliceBalance = await datatoken.balance(tokenAddress, alice)

console.log("Marketplace balance:", marketplaceBalance)
console.log("Alice balance:", aliceBalance)
```

Now save and run the file:

```Bash
node marketplace.js
```

You should see in the terminal output that the Markeplace now has a datatoken balance of 100 and Alice now has a balance of 100.

## 10. Marketplace posts asset for sale

In this section we show how the maketplace can post the dataset for sale. 

First, in the same terminal that you are running your files, enter the following command: 

```bash
export ADDRESS_FILE="${HOME}/.ocean/ocean-contracts/artifacts/address.json"
```
This tells ocean.js the location of the contract addresses. 

At the end of the `init() { ... }` function (after `console.log("Alice balance:", aliceBalance)`) add the following code:

```javascript
// Wait for datatoken to be published
await new Promise(r => setTimeout(r, 15000)); 

const asset = await ocean.assets.resolve(dataId)
const accessService = await ocean.assets.getServiceByType(asset.id, 'access')
console.log("accessService", accessService)
```

Now save and run the file:

```Bash
node marketplace.js
```

In the terminal output you should see the atributes of your dataset, including the cost, creator address and published date. 

## 11. Bob acquires datatokens (value swap)

Now, you're Bob :) In production environment, Bob would visit the marketplace website and purchase datatokends with USD via a payment gateway such as Stripe. In this example we demonstrate Alice sending Bob datatokens so that he is able to consume the dataset. 

First we will edit the `init() { ... }` function to create an address for Bob. On the line after `const marketplace = accounts[1].id;` add the following code:

```Javascript
  const bob = accounts[2].id;
  console.log('Bob account address:', bob);
```

Now at the end of the `init() { ... }` function (after `console.log('transactionId', transactionId)`) add the following code:

```Javascript
  const transaction = await datatoken.transfer(tokenAddress, bob, '50', alice)
  const transactionId = transaction['transactionHash']
  console.log('transactionId', transactionId)

  let bobBalance = await datatoken.balance(tokenAddress, bob)
  aliceBalance = await datatoken.balance(tokenAddress, alice)

  console.log('Alice token balance:', aliceBalance)
  console.log('Bob token balance:', bobBalance)
```

Save the `marketplace.js` file and run it again. In your terminal enter:

```bash
node marketplace.js
```
You should see in the terminal output that both Bob and Alice have a balance of 50 tokens.

## 12. Bob downloads the dataset

Finally, Bob downloads the dataset. This is is a two part process where he first orders the dataset and then downloads it. 

At the end of the `init() { ... }` function (after `console.log("bobTransaction", bobTransaction)`) add the following code:

```javascript
const bobTransaction = await ocean.assets.order(asset.id, accessService.type, bob)
console.log("bobTransaction", bobTransaction)

const data = await ocean.assets.download(
  asset.id,
  bobTransaction,
  tokenAddress,
  accounts[2],
  './datafiles'
)
bobBalance = await datatoken.balance(tokenAddress, bob)
console.log("Bob token balance:", bobBalance)
```

Save the `marketplace.js` file and run it again. In your terminal enter:

You should see in the terminal output that Bob's balance has now been reduce to 40 tokens, as he has spent 10 on the dataset. You can confirm in the terminal that the data has been downloaded with the following commands: 

```bash
cd datafiles
ls
```
In the terminal output you should see a new directory has been created that contains your data. 


To view Bob's previous orders you can enter the following code at the end of the `init() { ... }` function (after `console.log("Bob token balance:", bobBalance)`):

```javascript
const history = await ocean.assets.getOrderHistory(accounts[2])
console.log("Bob's history", history)
```

If you save the file and run it again you should see all of Bob's previous orders. 

## 13. Extensions

Congratulations on completing the Oceon.js Marketplace tutorial 🌊🐋🐠. This has given you a solid foundation upon which you can start using Ocean.js. There is still a lot more you can do with Ocean.js, here are some suggestions for next steps to continue learning: 

1. Check Alice's order history using `ocean.assets.getOrderHistory(accounts[0])`
2. List all of Alice's assets with `ocean.assets.ownerAssets(alice)`
3. Update metadata for Alice's dataset using `ocean.assets.editMetadata(ddo, newMetaData)` 
4. Update the new metadata onchain with `ocean.onChainMetadata.update(newDdo.id, newDdo, alice)`
5. Check the metadata with `ocean.assets.getServiceByType(ddo.id, 'metadata')`
6. Update the timeout for the dataset with `ocean.assets.editServiceTimeout(ddo, serviceIndex, newTimeout)`

