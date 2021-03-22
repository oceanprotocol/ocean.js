# Quickstart: Simple Flow

This section describes how to create a datatoken, host a dataset and consume the data using the simplest flow.

Here are the the steps.

1. Initialize services
2. Create a new node.js project
3. Install dependancies
4. Create a config file and update contract addresses
5. Publish a new data token 
6. Mint 100 tokens
7. Transfer tokens between users.
8. Host a dataset
8. Consume the dataset

Let's go through each of these in detail.

## 1. Initialize services

We start by Initialize services. To do this, we clone the Barge repository and run it. This will run the current default versions of [Aquarius](https://github.com/oceanprotocol/aquarius), [Provider](https://github.com/oceanprotocol/provider-py), and [Ganache](https://github.com/trufflesuite/ganache-cli) with [our contracts](https://github.com/oceanprotocol/ocean-contracts) deployed to it.

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
## 5. Publish a new data token 
## 6. Mint 100 tokens
## 7. Transfer tokens between users.
## 8. Host a dataset
## 9. Consume the dataset
