
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
const config={
   network: 'rinkeby',
   privateKey:'8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f'
}
const ocean = Ocean(config)
const account = await ocean.accounts.list()[0]
const myToken = ocean.datatoken.create('123.com',account)
```

## 2. Alice mints 100 tokens

```javascript
myToken.mint(100)
```

## 3. Alice transfers 1 token to Bob

```javascript
myToken.transfer(1,BobAddress)
```

## 4. Bob consumes dataset

Now, you are Bob :)

```javascript

const config={
   network: 'rinkeby',
   privateKey:'8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f'
}
const ocean = Ocean(config)


const account = await ocean.accounts.list()[0]
const myToken = ocean.datatoken.load(erc20_address)
const asset=ocean.assets.loadFromDataToken(myToken)
const file=ocean.assets.download(asset,account)

```
where
```javascript
class assets{
    let ERC20address;
    
    function loadFromDataToken(erc20_address){
        this.ERC20address=erc20_address
    }

    async function download(account){
        const publisher = Ocean.publisher.loadFromERC20(this.ERC20address)
        const transaction = publisher.prepare(this.ERC20address)
        await account.signTransaction(transaction)
        const file=await publisher.download(this.ERC20address)
        return file
    }
}
```

Disclaimer: this is a logical flow only
