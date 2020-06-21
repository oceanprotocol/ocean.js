
# ocean-lib

`ocean-lib-js` is a Javascript/Typescript library to privately & securely publish, exchange, and consume data. With it, you can:
* **Publish** data services: static data, streaming data, or compute-to-data. Every data service gets its own [ERC20](https://github.com/ethereum/EIPs/blob/7f4f0377730f5fc266824084188cc17cf246932e/EIPS/eip-20.md) token.
* **Mint** data tokens for a given data service
* **Transfer** data tokens to another owner
* **Consume** data tokens, to access the service

`ocean-lib-js` is part of the [Ocean Protocol](www.oceanprotocol.com) toolset.

# Installation
```
// ES6
import { Ocean, Logger } from '@oceanprotocol/lib'

// ES2015
const { Ocean, Logger } = require('@oceanprotocol/lib')

```

# Quickstart

This section describes a flow with the simplest transfer of value, for static data.

Here's the steps.
1. Alice publishes a dataset (= publishes a datatoken contract)
1. Alice mints 100 tokens
1. Alice transfers 1 token to Bob
1. Bob consumes dataset

Let's go through each of these in detail.


## 1. Alice publishes a dataset (= publishes a datatoken contract)

For now, you're Alice:) Let's proceed.

Run `ganache-cli` locally:
```bash
ganache-cli
```

Then proceed in with your code:
```javascript
const tokenAmount = 100
const transferAmount = 1
const blob = 'http://localhost:8030/api/v1/provider/services'

const alice = await ocean.accounts.list()[0]
const bob = await ocean.accounts.list()[0]
// create datatoken class
const datatoken = new DataTokens(contracts.factoryAddress, factoryABI, datatokensABI, web3)
// deploy datatoken
const tokenAddress = await datatoken.create(blob, alice)

```

## 2. Alice hosts the dataset

Clone [provider-py](https://github.com/oceanprotocol/provider-py) and update your local environment variables:

```
export FLASK_APP=ocean_provider/run.py
export PROVIDER_ADDRESS=your_provider_address
export PROVIDER_KEY=your_provider_key
export CONFIG='{"File": "https://raw.githubusercontent.com/oceanprotocol/barge/master/README.md"}'
```

## 3. Alice mints 100 tokens

```javascript
datatoken.mint(tokenAddress, alice, tokenAmount)
```

## 4. Alice transfers 1 token to Bob

```javascript
const ts = await datatoken.transfer(tokenAddress, bob, transferAmount, alice)
const transactionId = ts['transactionHash']
```

## 5. Bob consumes dataset

Now, you are Bob :)


```javascript

const config = new Config()        
const ocean = await Ocean.getInstance()

await ocean.assets.download(tokenAddress, blob, transactionId, bob)
```


