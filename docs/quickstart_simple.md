# Quickstart: Simple Flow

This section describes a flow with the simplest transfer of value, for static data.

Here's the steps.

1. Alice publishes a dataset (= publishes a datatoken contract)
2. Alice mints 100 tokens
3. Alice transfers 1 token to Bob
4. Bob consumes dataset

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
const datatoken = new DataTokens(
  contracts.factoryAddress,
  factoryABI,
  datatokensABI,
  web3,
  Logger
)
// deploy datatoken
const tokenAddress = await datatoken.create(blob, alice)
```

## 2. Alice hosts the dataset

Clone [provider-py](https://github.com/oceanprotocol/provider-py) and update your local environment variables:

```bash
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
