# Quickstart: Marketplace Flow

This batteries-included flow includes metadata, multiple services for one datatoken, and compute-to-data.

It focuses on Alice's experience as a publisher, and Bob's experience as a buyer & consumer. The rest are services used by Alice and Bob.

Here's the steps.

1. Initialize services
1. Alice publishes assets for data services (= publishes a datatoken contract and metadata)
1. Alice mints 100 tokens
1. Alice allows marketplace to sell her datatokens
1. Marketplace posts asset for sale
1. Value swap: Bob buys datatokens from marketplace
1. Bob uses a service he just purchased (download)

Let's go through each step.

## 1. Initialize services

This quickstart treats the publisher service, ganache-cli, metadata store, and marketplace as
externally-run services. For convenience, we run barge locally in default settings.

```bash
git clone https://github.com/oceanprotocol/barge.git
cd barge/
git checkout v3
export PROVIDER_VERSION=latest
./start_ocean.sh --no-dashboard
```

## 2. Alice publishes assets for data services (= publishes a datatoken contract)

1. Create DataToken

```javascript
import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Ocean } from '../../src/ocean/Ocean'
import { LoggerInstance } from '../../src/utils'
const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')
const factory = require('@oceanprotocol/contracts/artifacts/DTFactory.json')
const datatokensTemplate = require('@oceanprotocol/contracts/artifacts/DataTokenTemplate.json')

// Alice's config
const config = {
  metadataCacheUri: 'http://aquarius:5000',
  providerUri: 'http://localhost:8030',
  nodeUri: `http://localhost:${process.env.ETH_PORT || 8545}`,
  verbose: LogLevel.Error,
  web3Provider: web3,
  factoryAddress: '0x123456789...'
}
const ocean = await Ocean.getInstance(config)
const alice = (await ocean.accounts.list())[0]

const datatoken = new DataTokens(
  config.factoryAddress,
  factory.abi,
  datatokensTemplate.abi,
  web3,
  LoggerInstance
)
const data = { t: 1, url: ocean.config.metadataCacheUri }
const blob = JSON.stringify(data)

const dataTokenAddress = await datatoken.create(blob, alice.getId())
```

2. Publish asset(s)

```javascript
const asset = {
  main: {
    type: 'dataset',
    name: 'test-dataset',
    dateCreated: new Date(Date.now()).toISOString().split('.')[0] + 'Z', // remove milliseconds
    author: 'oceanprotocol-team',
    license: 'MIT',
    files: [
      {
        url:
          'https://raw.githubusercontent.com/tbertinmahieux/MSongsDB/master/Tasks_Demos/CoverSongs/shs_dataset_test.txt',
        checksum: 'efb2c764274b745f5fc37f97c6b0e761',
        contentLength: '4535431',
        contentType: 'text/csv',
        encoding: 'UTF-8',
        compression: 'zip'
      }
    ]
  }
}

// create a service
service1 = await ocean.assets.createAccessServiceAttributes(
  alice,
  10, // set the price in datatoken
  new Date(Date.now()).toISOString().split('.')[0] + 'Z', // publishedDate
  0 // timeout
)

// publish asset
const ddo = await ocean.assets.create(asset, alice, [downloadService], dataTokenAddress)

const did = ddo.id
```

## 3. Alice mints 100 tokens

```javascript
await datatoken.mint(tokenAddress, alice.getId(), 100)
```

## 4. Alice allows marketplace to sell her datatokens

```javascript
await datatoken.approve(
  dataTokenAddress,
  '0x068ed00cf0441e4829d9784fcbe7b9e26d4bd8d0', // marketplace address,
  20, // marketplaceAllowance
  alice.getId()
)
```

## 5. Marketplace posts asset for sale

Now, you're the marketplace:)

```javascript
// Market's config
const marketOcean = await Ocean.getInstance(config)
const marketplace = (await ocean.accounts.list())[1]

const asset = await ocean.assets.resolve(ddo.id)
const accessService = await ocean.assets.getServiceByType(asset.id, 'access')
price = 20 // in USD per dataToken
assert(accessService.attributes.main.cost * price === 200)
```

## 6. Value swap: Bob buys datatokens from marketplace

```javascript
// Not shown: in marketplace GUI, Bob uses Stripe to send USD to marketplace (or other methods / currencies).
```

## 7. Bob uses a service he just purchased (download)

Now, you're Bob:)

```javascript
const accessService = await ocean.assets.getServiceByType(asset.id, 'access')
const bob = (await ocean.accounts.list())[2]
await ocean.assets
  .order(ddo.id, accessService.type, bob.getId())
  .then(async (res: string) => {
    res = JSON.parse(res)
    return await datatoken.transfer(
      res['dataToken'],
      res['to'],
      res['numTokens'],
      res['from']
    )
  })
  .then(async (tx) => {
    await ocean.assets.download(
      ddo.id,
      tx.transactionHash,
      dataTokenAddress,
      bob,
      '~/my-datasets'
    )
  })
```
