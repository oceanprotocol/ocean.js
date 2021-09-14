[![banner](https://raw.githubusercontent.com/oceanprotocol/art/master/github/repo-banner%402x.png)](https://oceanprotocol.com)

<h1 align="center">ocean.js</h1>

> JavaScript library to privately & securely publish, exchange, and consume data.

[![npm](https://img.shields.io/npm/v/@oceanprotocol/lib.svg)](https://www.npmjs.com/package/@oceanprotocol/lib)
[![Build Status](https://github.com/oceanprotocol/ocean.js/workflows/CI/badge.svg)](https://github.com/oceanprotocol/ocean.js/actions)
[![Maintainability](https://api.codeclimate.com/v1/badges/6381c81b8ac568a53537/maintainability)](https://codeclimate.com/github/oceanprotocol/ocean.js/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/6381c81b8ac568a53537/test_coverage)](https://codeclimate.com/github/oceanprotocol/ocean.js/test_coverage)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-7b1173.svg?style=flat-square)](https://github.com/prettier/prettier)
[![js oceanprotocol](https://img.shields.io/badge/js-oceanprotocol-7b1173.svg)](https://github.com/oceanprotocol/eslint-config-oceanprotocol)

With ocean.js, you can:

- **Publish** data services: downloadable files or compute-to-data.
  Ocean creates a new [ERC20](https://github.com/ethereum/EIPs/blob/7f4f0377730f5fc266824084188cc17cf246932e/EIPS/eip-20.md)
  datatoken for each dataset / data service.
- **Mint** datatokens for the service
- **Sell** datatokens via an OCEAN-datatoken Balancer pool (for auto price discovery), or for a fixed price
- **Stake** OCEAN on datatoken pools
- **Consume** datatokens, to access the service
- **Transfer** datatokens to another owner, and **all other ERC20 actions**
  using [web3.js](https://web3js.readthedocs.io/en/v1.2.9/web3-eth-contract.html) etc.

ocean.js is part of the [Ocean Protocol](https://oceanprotocol.com) toolset.

This is in alpha state and you can expect running into problems. If you run into them, please open up a [new issue](https://github.com/oceanprotocol/ocean.js/issues/new?assignees=&labels=bug&template=bug_report.md&title=).

- [📚 Prerequisites](#-prerequisites)
- [🏗 Installation](#-installation)
- [🏄 Quickstart](#-quickstart)
  - [Beginners Guide](#beginners-guide)
  - [Simple Flow](#simple-flow)
  - [Marketplace Flow](#marketplace-flow)
  - [📖 Learn More](#learn-more)
- [🦑 Development](#-development)
- [✨ Code Style](#-code-style)
- [👩‍🔬 Testing](#-testing)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
- [🛳 Production](#-production)
- [⬆️ Releases](#️-releases)
  - [Production](#production)
  - [Pre-releases](#pre-releases)
- [🏛 License](#-license)

## 📚 Prerequisites

- node.js ([Install from here](https://nodejs.org/en/download/))
- Docker ([Managed as a non-root user](https://docs.docker.com/engine/install/linux-postinstall/))
- A Unix based operating system (Mac or Linux)

### Note

Any function that uses `getPastEvents()` will only work on Eth (see: <https://github.com/oceanprotocol/ocean.js/issues/741>). This includes:

- searchPoolforDT()
- getPoolsbyCreator()
- getPoolSharesByAddress()
- getAllPoolLogs()
- getPreviousValidOrders()
- searchforDT()
- getExchangesbyCreator()
- getExchangeSwaps()
- getAllExchangesSwaps()

## 🏗 Installation

```bash
npm install @oceanprotocol/lib
```

## 🏄 Quickstart

```ts
import { Ocean, Config, ConfigHelper, Logger } from '@oceanprotocol/lib'

const defaultConfig: Config = new ConfigHelper().getConfig(
  'rinkeby',
  'YOUR_INFURA_PROJECT_ID'
)

const config = {
  ...defaultConfig,
  metadataCacheUri: 'https://your-metadata-cache.com',
  providerUri: 'https://your-provider.com'
}

async function init() {
  const ocean = await Ocean.getInstance(config)
  return ocean
}
```

### Beginners Guide

This introduction is aimed at developers who are completely new to blockchain, no coding experience is required.

[Go to beginners guide](docs/beginners_guide.md)

### Simple Flow

This stripped-down flow shows the essence of Ocean. Just downloading, no metadata.

[Go to simple flow](docs/quickstart_simple.md)

### Marketplace Flow

This batteries-included flow includes metadata, multiple services for one datatoken, and compute-to-data.

[Go to marketplace flow](docs/quickstart_marketplace.md)

### 📖 Learn more

- [Get test OCEAN](docs/get-test-OCEAN.md) - from rinkeby
- [Understand config parameters](docs/parameters.md) - envvars vs files
- [Learn about off-chain services](docs/services.md) - Ocean Provider for data services, Aquarius metadata store
- [Learn about wallets](docs/wallets.md) - on generating, storing, and accessing private keys
- [Get an overview of ocean.js](docs/overview.md) - key modules and functions

If you have any difficulties with the quickstarts, or if you have further questions about how to use ocean.js please reach out to us on [Discord](https://discord.gg/TnXjkR5).

If you notice any bugs or issues with ocean.js please [open an issue on github](https://github.com/oceanprotocol/ocean.js/issues/new?assignees=&labels=bug&template=bug_report.md&title=).

## 🦑 Development

The project is authored with TypeScript and compiled with `tsc`.

To start compiler in watch mode:

```bash
npm install
npm start
```

## ✨ Code Style

For linting and auto-formatting you can use from the root of the project:

```bash
# lint all js with eslint
npm run lint

# auto format all js & css with prettier, taking all configs into account
npm run format
```

## 👩‍🔬 Testing

Test suite for unit & integration tests is setup with [Mocha](https://mochajs.org) as test runner, and [nyc](https://github.com/istanbuljs/nyc) for coverage reporting. A combined coverage report is sent to CodeClimate via the `coverage` GitHub Actions job.

Running all tests requires running Ocean Protocol components beforehand with [Barge](https://github.com/oceanprotocol/barge), which also runs a `ganache-cli` instance:

```bash
git clone https://github.com/oceanprotocol/barge
cd barge

./start_ocean.sh --with-provider2 --no-dashboard
```

You can then proceed to run in another terminal.

Let ocean.js know where to pickup the smart contract addresses, which has been written out by Barge in this location:

```
export ADDRESS_FILE="${HOME}/.ocean/ocean-contracts/artifacts/address.json"
```

Build metadata:

```
npm run build:metadata
```

Executing linting, type checking, unit, and integration tests with coverage reporting all in one go:

```bash
npm test
```

### Unit Tests

You can execute the unit tests individually with:

```bash
npm run test:unit
# same thing, but with coverage reporting
npm run test:unit:cover
```

### Integration Tests

You can execute the integration tests individually with:

```bash
npm run test:integration
# same thing, but with coverage reporting
npm run test:integration:cover
```

## 🛳 Production

To create a production build, run from the root of the project:

```bash
npm run build
```

## ⬆️ Releases

Releases are managed semi-automatically. They are always manually triggered from a developer's machine with release scripts.

### Production

From a clean `main` branch you can run the release task bumping the version accordingly based on semantic versioning:

```bash
npm run release
```

The task does the following:

- bumps the project version in `package.json`, `package-lock.json`
- auto-generates and updates the CHANGELOG.md file from commit messages
- creates a Git tag
- commits and pushes everything
- creates a GitHub release with commit messages as description
- Git tag push will trigger a GitHub Action workflow to do a npm release

For the GitHub releases steps a GitHub personal access token, exported as `GITHUB_TOKEN` is required. [Setup](https://github.com/release-it/release-it#github-releases)

### Pre-Releases

For pre-releases, this is required for the first one like `v0.18.0-next.0`:

```bash
./node_modules/.bin/release-it major|minor|patch --preRelease=next
```

Further releases afterwards can be done with `npm run release` again and selecting the appropriate next version, in this case `v0.18.0-next.1` and so on.

## 🏛 License

```
Copyright ((C)) 2021 Ocean Protocol Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
