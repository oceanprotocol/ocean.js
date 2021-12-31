# A beginners guide to selling data over the blockchain

This is a beginners guide to selling a dataset over the blockchain. The process involves creating a datatoken, which will be used to purchase the dataset, and listing it on a marketplace. This guide provides all the code you need and no prior knowledge is required. It is helpful if you have some experience with javascript but it is not necessary. 

Selling your data over the blockchain puts you in charge of how it is used and can be a great source of passive income. There are many AI startups that have deep expertise in machine learning but need more data to improve their models. Selling your data via the blockchain gives you a level of security that you would be unable to achieve if you were selling via a centralised marketplace. 

In this guide we'll be making use of the Ocean.js library. Ocean Protocol provides you with everything you need to quickly get setup and start selling data over the blockchain.

If you have any questions or issues at any point while following along to this article please reach out to us on [discord](https://discord.gg/TnXjkR5). 

Here are the steps we will be following throughout the article:

0. Prerequisites
1. Initialize services
2. Create a new node.js project
3. Install dependencies
4. Create a config file and update contract addresses
5. Publish a new datatoken
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
For this tutorial we will be setting up and running a local blockchain and then the datatokens will be published to your local blockchain. This isn’t as difficult as it sounds, fortunately Ocean Protocol provides the services to start your local blockchain with a couple of commands. Deploying your datatoken to a locally run blockchain is a great way to start as it is quick and avoids any costs. 

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

At this point you may get some warning messages but there shouldn’t be any errors. As long as you don’t have any errors, you are ready to proceed. 

## 4. Create a config file and update contract addresses
Now we need to set up a configuration file that will determine where your datatoken and dataset are published to. We will enter the local addresses where the Ocean Protocol services are running. When you are ready to deploy your datatoken on the Ethereum mainnet you will need to update these addresses, the process of live deploying your dataset and datatokens will be covered in a later blog post.  

Start by creating a new config.js file. In your terminal, enter the following command. 

```bash 
cat > config.js
```

Make sure that this config.js file has been created inside your quickstart directory. Now open the config.js in your code editor and enter the following code:

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

You will notice that the code currently contains placeholders for the contract addresses (e.g. `“0x_YOUR_DTFactory_ADDRESS_"`). This is because we need to update these addresses with the addresses of the Ocean Protocol smart contracts on your local blockchain. 

When the Barge service started running it automatically saved contract addresses in a JSON file in a hidden folder under your home directory. We can check what these contract addresses are by running the following command into your terminal: 

```bash
cat ~/.ocean/ocean-contracts/artifacts/address.json
```
You should get an output that looks like this:

```JSON
{
 "development": {
   "DTFactory": "0x27F7b0C827596C7355ee39EdFd3235F8b47C2862",
   "BFactory": "0xCe7c408C56f8BFF8EF616F5CE3E7868486de3748",
   "FixedRateExchange": "0xf4C7B100cECA95Badc583bdBd10F6CA8D9123B09",
   "Metadata": "0x2c11A9763AaCb838fDFD6Ee01fD1179196ee20f5",
   "Ocean": "0x11570aE63B4fDe21d213Bc1A9BF61eEA51d13D56"
 }
}
```

Now we need to remove the placeholder contract addresses from the config.js file and replace them with the contract addresses that were outputted to your terminal. When you have done this, save the file. 

## 5. Publish a new datatoken
Now you are ready to publish your first datatoken! 

The datatoken that we will be deploying is an ERC20 token. ERC20 is standard for fungible tokens (meaning each token is identical and interchangeable), the standard contains a list of required and optional functions that form the smart contract which manages the token balances and transfers. ERC20 is the most popular standard for tokens deployed on the Ethereum Blockchain and many of the popular tokens that you will have heard of (Tether, USDC, Dai, Binance token) all follow the ERC20 standard. You can read more about the ERC20 token standard here: https://ethereum.org/en/developers/docs/standards/tokens/erc-20/ 

Security is incredibly important for any blockchain token (as they are a potential target for attacks) and for this reason it is not best practice to write an ERC20 from scratch. This would introduce unnecessary complexity and would require an in depth security audit. In general, complexity is the enemy of security. Instead of writing our own ERC20 token, the code we deploy will inherit from the OpenZepplin ERC20 library. This library has been thoroughly battle tested in live environments and is used to underpin millions of dollars. You can read more about the OpenZepplin ERC20 contract libraries here: https://docs.openzeppelin.com/contracts/2.x/api/token/erc20 

The process of creating and deploying the ERC20 datatokens has been automated by Ocean Protocol. All we need to do is open the `index.js` file in your text editor and enter the following code:

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

This is all the code you need to deploy your first datatoken. Now save the file and run it. In your terminal, run the following command:

```Bash
node index.js
```

You should see the console log message stating the address of your datatoken. Congratulations, you've created your first Ocean datatoken! 🌊🐋

## 6. Mint 200 tokens

Next, we will edit the code in `index.js` to mint 200 datatokens. These 200 datatokens are minted and sent to Alice's Address.

At the end of the `init() { ... }` function (after `console.log('Deployed datatoken address: ${tokenAddress}')`) add the following line of code:
 
```Javascript 
 await datatoken.mint(tokenAddress, alice, '200', alice)
 let aliceBalance = await datatoken.balance(tokenAddress, alice)
 console.log('Alice token balance:', aliceBalance)
```

Now run the `index.js` file again:

```bash
node index.js
```

You should now see in the console output that Alice has a token balance of 200.

## 7. Publish a dataset

Now we will publish your dataset so that it can be sold over the blockchain. We start by creating a new file called data.js. In your terminal enter these commands:

```Bash
cat > data.js
```

Now open the data.js file in your text editor. Enter the following code and save the file:
 
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

If you already have a dataset hosted somewhere you can replace the example link url to the address where your dataset is hosted. You should also update the contentType field with the file extension of your dataset. If you haven’t yet hosted your dataset, you can continue with the example link in place.

Now, we need to import the dataset into the index.js file. Open your your `index.js` in your text editor and add the following line of code at the top of the file under the other `require()` statements:

```Javascript
const { testData } = require("./data");
```

Next we add the code for publishing the dataset. This includes important information about your dataset such as the price, the publishing date and the timeout. At the end of the `init() { ... }` function (after `console.log('Bob token balance:', bobBalance)`) add the following code:

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

In the terminal output you should now see the Data ID (did) output. 

Congratulations, you have published your first dataset! 🌊🐠

## 8. Allow the marketplace to sell you datatokens

Finally we will go through the steps for allowing a marketplace to sell your dataset. For this demonstration we will use the address of a marketplace on your local blockchain but in a live environment you would need to use the address of the actual marketplace that will be selling your data. It is important to double check that this address is correct because if it isn’t you could permanently lose your datatokens. 

We start by saving the address of the marketplace. On the line after `const alice = accounts[0].id` add the following code:

```Javascript
 const marketplace = accounts[1].id;
 console.log('Marketplace account address:', marketplace);
```

Next we will initiate a transaction that approves the marketplace to send your tokens (to buyers) on your behalf. We then make a call on the datatoken contract to check the allowance that the marketplace now has. 

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

Now save the file and run it:

```Bash
node index.js
```

You should see in the terminal output that the marketplace has an allowance of 100 datatokens.

Well done, you have now completed the tutorial! 

There are many more things that you can do with Ocean.js which will be the subject of future blog posts. If you have any questions or if you would like you learn more about Ocean Protocol, please reach out to us on [Discord](https://discord.gg/TnXjkR5) or if you have found any issues with Ocean.js please raise them on [GitHub](https://github.com/oceanprotocol/ocean.js/issues/new?assignees=&labels=bug&template=bug_report.md&title=). 

