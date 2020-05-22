
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
   privateKey:'8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f',
}
const ocean = Ocean(alice_config)
const account = await ocean.accounts.list()[0]
const myToken = ocean.datatoken.create('localhost:8030',account)
const dt_address=myToken.getAddress()
console.log(dt_address)
```

## 2. Alice hosts the dataset

A locally providerService is required, which will serve just one file for this demo.
Let's create the file to be shared:
```
touch /var/mydata/myFolder1/file
````

Run the providerService:
(given that ERC20 contract address from the above is 0x1234)

```
ENV DT="{'0x1234':'/var/mydata/myFolder1'}"
docker run @oceanprotocol/provider-py -e CONFIG=DT
```


## 3. Alice mints 100 tokens

```javascript
myToken.mint(100)
```

## 4. Alice transfers 1 token to Bob

```javascript
myToken.transfer(1,BobAddress)
```

## 5. Bob consumes dataset

Now, you are Bob :)


```javascript

const bob_config={
   network: 'rinkeby',
   privateKey:'1234ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f'  
}
const bob_ocean = Ocean(bob_config)


const account = await bob_ocean.accounts.list()[0]
const asset=bob_ocean.assets.get(dt_address)
const file=asset.download(account)

```


