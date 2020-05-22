
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


```javascript
const { Ocean, Logger } = require('@oceanprotocol/lib')
//you can use default ABIs or use custom ones
//you can use default factoryAddress or use default one, depending on the network (auto-determined)
const ocean = Ocean(rpc_url='https://pacific.oceanprotocol.com',factoryABI=Ocean.factoryABI,dataTokenABI=Ocean.dataTokenABI,factoryAddress='0x123',web3Provider: web3)

const accounts = await ocean.accounts.list()
erc20_address = ocean.datatokens.deployNewDT(publisher_service_url='123.com',account[0])
```

## 2. Alice mints 100 tokens

```javascript
const dataToken=Ocean.datatokens.loadContract(erc20_address)
dataToken.mint(100,account[0])
```

## 3. Alice transfers 1 token to Bob

```javascript
//transfer amount to destination using account
dataToken.transfer(1,bob_address, account[0])
```

## 4. Bob consumes dataset

Now, we are Bob :)

```javascript
const ocean = Ocean(rpc_url='https://pacific.oceanprotocol.com',factoryABI=Ocean.factoryABI,dataTokenABI=Ocean.dataTokenABI,factoryAddress='0x123',web3Provider: web3)

const accounts = await ocean.accounts.list()
const account=account[0]

const asset=ocean.assets.loadFromDataToken(erc20_address)

const file=asset.download(account)

```
where
```javascript
class assets{
    async function download(account){
        const publisher = Ocean.publisher.loadFromERC20(ERC20address)
        const transaction = publisher.prepare(asset.ERC20address)
        await account.signTransaction(transaction)
        const file=await publisher.download(asset.ERC20address)
        return file
    }
}
```

