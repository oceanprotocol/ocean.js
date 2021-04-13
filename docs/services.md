<!--
Copyright 2021 Ocean Protocol Foundation
SPDX-License-Identifier: Apache-2.0
-->

# About Ocean off-chain services

## Introduction

Ocean uses these off-chain services:

-   [Ocean Provider](https://github.com/oceanprotocol/provider) is for data services. Specifically, it's a REST API serving requests for two types of data services: static urls (for downloading data) and compute services. It's run by the marketplace or the data publisher.
-   [Ocean Aquarius](https://github.com/oceanprotocol/aquarius) is metadata cache REST API. This helps to aid search in marketplaces.

We now describe how to use these.

## 1. Set config values for services

Here we use a file to set config values.

In your working directory, create a file `config.ini` and fill it with the following. It will use pre-existing services running for rinkeby testnet.

    [eth-network]
    network = https://rinkeby.infura.io/v3/<your Infura project id>

    [resources]
    aquarius.url = AQUARIUS_URL=https://aquarius.rinkeby.oceanprotocol.com
    provider.url = PROVIDER_URL=https://provider.rinkeby.oceanprotocol.com

Ensure that envvars don't override the config file values:

```console
unset NETWORK_URL AQUARIUS_URL PROVIDER_URL
```

Create an envvar to point to the new config file. In the console:

```console
export CONFIG_FILE=config.ini
```

## 2. Use the services within Javascrtipt

In Javascript, import and configure the components / services:

```javascript
const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')

#configure the components
const config = {
  metadataCacheUri: 'http://aquarius:5000',
  providerUri: 'http://localhost:8030',
  nodeUri: `http://localhost:${process.env.ETH_PORT || 8545}`,
  verbose: LogLevel.Error,
  web3Provider: web3,
  factoryAddress: '0x123456789...'
}
```

Now you're ready to use the services! 🐳 The marketplace tutorial will use them in more detail.

## Alternatives on Services

Above, we described a specific flow to go through configuring services. Here are some variants of that flow.

### Point to services in other networks

The service urls above are for rinkeby. [Ocean's docs have urls](https://docs.oceanprotocol.com/concepts/networks) for Ethereum mainnet and other supported networks.

### Run your own services, separately

Above, we pointed to existing services. Alternatively, you can run your own. Here's how.

Open a new console, and get provider running:

```console
docker run oceanprotocol/provider:latest
```

Open another new console, and get aquarius running:

```console
docker run oceanprotocol/aquarius:latest
```

Here are the urls for the local services, for use in `config.ini` etc.

-   Provider url: `http://127.0.0.1:8030`
-   Aquarius url: `http://127.0.0.1:5000`

### Run your own services, all at once

Above, we ran all services separately. You can also run [Ocean Barge](https://github.com/oceanprotocol/barge) to conveniently run them all at once.
