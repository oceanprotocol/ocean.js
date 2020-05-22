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

This section describes a marketplace flow with multiple services

Here's the steps.
1. Alice publishes a dataset (= publishes a datatoken contract)
1. Alice mints 100 tokens
1. Alice transfers 1 token to Bob
1. Bob consumes dataset

Let's go through each of these in detail.


## 1. Alice hosts the dataset

A locally providerService ,metadatastore and marketplace are required:

Run the providerService and metadatastore:
```
docker run @oceanprotocol/provider-py:latest
docker run @oceanprotocol/aquarius:latest
docker run @oceanprotocol/marketplace:latest
```


## 2. Alice publishes a dataset (= publishes a datatoken contract)

For now, you're Alice:) Let's proceed.


```javascript
const { Ocean, Logger } = require('@oceanprotocol/lib')

const marketPlaceAddress='0x9876'
//Alice's config
const config={
   network: 'rinkeby',
   privateKey:'8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f',
   metadataStoreURI: 'localhost:5000',
   providerUri: 'localhost:8030'
}
const ocean = Ocean(alice_config)
const account = await ocean.accounts.list()[0]


const myToken = ocean.datatoken.create(config.metadataStoreURI,account)
//Alice allows MarketPlace to transfer 20 DT
myToken.approve(marketPlaceAddress,20)

const dt_address=myToken.getAddress()

//create asset 1
const metaData={
   "did":"did:op:1234",
   "owner":"0xaaaaa",
   "dtAddress":dt_address,
   "name":"Asset1",
   "services="[
      {  "id":0, "serviceEndpoint":"providerUri", "type":"download", "dtCost":10, "timeout":0,
         "files":[{"url":"http://example.net"},{"url":"http://example.com" }]
      },
      { "id":1, "type":"compute", "serviceEndpoint":"providerUri", "dtCost":1,"timeout":3600},
      { "id":2,   "type":"compute",  "serviceEndpoint":"providerUri",  "dtCost":2, "timeout":7200 },
   ]
}
//create will encrypt the URLs using publisher and update the ddo before pushing to aquarius
//create will require that metaData.dtAddress is a valid DT Contract address
const asset = ocean.assets.create(metaData,account)
const did = asset.did
```



## 3. Alice mints 100 tokens

```javascript
myToken.mint(100)
```

## 4. Exchange of value : How Bob gets DT
```

const bob_config={
   network: 'rinkeby',
   privateKey:'1234ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f'  
   marketPlaceUri: 'localhost:3000'
}
const bob_ocean = Ocean(bob_config)
const bob_account = await bob_ocean.accounts.list()[0]

const asset = ocean.assets.resolve(did)
const serviceIndex = assets.findServiceByType('compute')
const num_dt_needed = assets.getDtCost(serviceIndex)
//Bob need to buy num_dt_needed . DTAddress = asset.dtAddress

const {price, currency } = ocean.marketplace.getPrice(num_dt_needed,asset.dtAddress)
bob_account.approve(price, currency, marketPlaceAddress)
ocean.marketplace.buy(num_dt_needed,asset.dtAddress)



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
const asset = ocean.assets.getFromDID(did)
const serviceIndex = assets.findServiceByType('compute')

export const rawAlgoMeta = {
  rawcode: `console.log('Hello world'!)`,
  format: 'docker-image',
  version: '0.1',
  container: {
    entrypoint: 'node $ALGO',
    image: 'node',
    tag: '10'
  }
}

const computeJob=asset.StartCompute(serviceIndex, rawAlgoMeta, account)

```


