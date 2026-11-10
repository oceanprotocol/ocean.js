[![banner](https://raw.githubusercontent.com/oceanprotocol/art/master/github/repo-banner%402x.png)](https://oceanprotocol.com)

<h1 align="center">ocean.js</h1>

> JavaScript/TypeScript client library to privately & securely publish, exchange, and consume data on Ocean Protocol.

[![npm](https://img.shields.io/npm/v/@oceanprotocol/lib.svg)](https://www.npmjs.com/package/@oceanprotocol/lib)
[![Build Status](https://github.com/oceanprotocol/ocean.js/workflows/CI/badge.svg)](https://github.com/oceanprotocol/ocean.js/actions)
[![Maintainability](https://api.codeclimate.com/v1/badges/6381c81b8ac568a53537/maintainability)](https://codeclimate.com/github/oceanprotocol/ocean.js/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/6381c81b8ac568a53537/test_coverage)](https://codeclimate.com/github/oceanprotocol/ocean.js/test_coverage)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-7b1173.svg?style=flat-square)](https://github.com/prettier/prettier)
[![js oceanprotocol](https://img.shields.io/badge/js-oceanprotocol-7b1173.svg)](https://github.com/oceanprotocol/eslint-config-oceanprotocol)

`@oceanprotocol/lib` v9 | ESM-only | Node.js >= 22 | ethers v6

## What it is

ocean.js (`@oceanprotocol/lib`) is the client library for [Ocean Nodes](https://github.com/oceanprotocol/ocean-node) and the Ocean smart contracts. It gives you:

- **An Ocean Node client** that speaks both **HTTP** and **P2P (libp2p)**. The same API works over either transport.
- **Typed wrappers for the Ocean contracts**: data NFTs, datatokens, fixed-rate exchange, dispenser, router, escrow, access lists, fee collector.
- **Publish and consume flows**: publish downloadable files or compute-to-data (C2D) services, order access, download, and run free or paid compute jobs.
- **Pricing**: fixed-rate exchanges and dispensers (free access).
- **v9 highlights**: P2P transport, JWT/auth tokens, escrow for paid compute, Oasis Sapphire (confidential EVM) support, access lists, and node persistent storage.

The package is **ESM-only** and requires **Node.js >= 22**. It is built with [tsup](https://tsup.egoist.dev); `tsc` is only used to emit type declarations.

ocean.js is part of the [Ocean Protocol](https://oceanprotocol.com) toolset. Questions: [Discord](https://discord.gg/TnXjkR5). Bugs: [open an issue](https://github.com/oceanprotocol/ocean.js/issues/new?assignees=&labels=bug&template=bug_report.md&title=).

- [Install](#install)
- [Quickstart](#quickstart)
- [Core concepts](#core-concepts)
- [Common recipes](#common-recipes)
- [Configuration and networks](#configuration-and-networks)
- [Architecture](#architecture)
- [Error handling and gotchas](#error-handling-and-gotchas)
- [Docs map](#docs-map)
- [Contributing](#contributing)
- [License](#license)

## Install

```bash
npm i @oceanprotocol/lib ethers
```

`ethers` v6 is used for signers and providers. `@oceanprotocol/ddo-js` ships as a runtime dependency of this library; if you import it directly (e.g. `DDOManager`) to build or validate DDOs, add it to your own `package.json` as well (`npm i @oceanprotocol/ddo-js`) so strict package managers such as pnpm resolve it. Developers using this library from TypeScript should ensure their `tsconfig.json` includes the necessary options:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "module": "esnext",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

`nodenext` works too, but it requires both `"module": "nodenext"` and `"moduleResolution": "nodenext"`. Avoid the older `"node"` (node10) mode — it cannot resolve this package's `exports` map.

### ESM only

`@oceanprotocol/lib` ships as ES modules only. There is no CommonJS build, because most of its runtime dependencies (the libp2p stack, `multiformats`, `uint8arrays`) are themselves ESM-only. Import it:

```js
import { ProviderInstance, ConfigHelper } from '@oceanprotocol/lib'
```

From CommonJS code, use Node's built-in `require(esm)` support, available from **Node 22.12**:

```js
const { ConfigHelper } = require('@oceanprotocol/lib')
```

On Node 22.0 to 22.11 this throws `ERR_REQUIRE_ESM`; use a dynamic `await import(...)` instead, or move the calling module to ESM.

## Quickstart

Resolve an asset, order access, and download its file. This assumes the asset is already published, has a fixed-rate or dispenser price, and that the wallet holds the needed gas and base token. For the full publish-then-consume walkthrough, see [CodeExamples.md](CodeExamples.md).

```ts
import { JsonRpcProvider, Wallet } from 'ethers'
import {
  ConfigHelper,
  Datatoken,
  ProviderInstance,
  orderAsset,
  downloadFile
} from '@oceanprotocol/lib'

const chainId = 11155111 // or a network name such as 'sepolia'
// sepolia/mainnet/polygon need an Infura project id for config.nodeUri; or set config.nodeUri to your own RPC URL
const config = new ConfigHelper().getConfig(chainId, process.env.INFURA_PROJECT_ID)
// config.oceanNodeUri defaults to http://127.0.0.1:8001; getConfig applies NODE_ENDPOINT / NODE_URL (URL or peer ID) automatically

const privateKey = process.env.PRIVATE_KEY
if (!privateKey) throw new Error('PRIVATE_KEY environment variable is not set')
const signer = new Wallet(privateKey, new JsonRpcProvider(config.nodeUri))

// 1. Resolve the DDO from the node
const did = 'did:op:...'
const ddo = await ProviderInstance.resolveDdo(config.oceanNodeUri, did)

// Select the access service and the datatoken that grants access to it
const serviceIndex = ddo.services.findIndex((s) => s.type === 'access')
if (serviceIndex === -1) throw new Error(`Asset ${did} has no access service`)
const service = ddo.services[serviceIndex]
const datatokenIndex = ddo.datatokens.findIndex(
  (dt) => dt.address.toLowerCase() === service.datatokenAddress.toLowerCase()
)
if (datatokenIndex === -1) throw new Error('No datatoken matches the access service')

// 2. Order access (always buys 1 datatoken, then starts the order)
const datatoken = new Datatoken(signer, chainId, config)
const tx = await orderAsset(
  ddo,
  signer,
  config,
  datatoken,
  undefined, // providerUrl (defaults to config.oceanNodeUri)
  undefined, // consumerAddress (defaults to the signer)
  undefined, // consumeMarketOrderFee
  undefined, // providerFees (fetched from the node)
  '0', // consumeMarketFixedSwapFee
  datatokenIndex,
  serviceIndex
)
// orderAsset returns null if the order fails (bad funds, approvals or provider fees)
if (!tx) throw new Error('orderAsset failed')
const receipt = await tx.wait()

// 3. Ask the node for the download, then fetch the file
const download = await ProviderInstance.getDownloadUrl(
  did,
  service.id, // getDownloadUrl takes the service id, not its index
  0, // file index
  receipt.hash, // transferTxId: the order transaction
  config.oceanNodeUri,
  signer
)
const file = await downloadFile(download) // works for HTTP (URL) and P2P (buffered response)
```

`orderAsset` detects whether the service is priced by a fixed-rate exchange or a dispenser, handles the approvals, fetches provider fees from the node, and starts the order.

## Core concepts

- **[Cheatsheet](Cheatsheet.md)**: Quick reference for common operations
  - Publishing datasets
  - Consuming data
  - Free and paid compute workflows
  - Getting compute job status
  - Node maintenance (drain) mode: `setMaintenance`, `NodeStatus.maintenance`, and detecting rejections with `isMaintenanceError` / `OceanNodeProviderError` / `MAINTENANCE_MODE_CODE`
- **Data NFT** (ERC721): represents ownership of an asset. Its metadata points at the DDO.
- **Datatoken** (ERC20): the access token. One datatoken (1.0) buys access to one service. Created from a data NFT.
- **DDO**: the DID document describing the asset (metadata, services, files, credentials). Schema and validation live in [`@oceanprotocol/ddo-js`](https://github.com/oceanprotocol/ddo.js).
- **Node**: an [Ocean Node](https://github.com/oceanprotocol/ocean-node) that plays three roles for you: **Provider** (encrypts file URLs, signs fees, serves downloads, runs C2D), **Aquarius** (DDO metadata store and search) and **Indexer** (follows the chain and indexes published assets). In the library these are `ProviderInstance` and `Aquarius`, both pointed at the same node.

### HTTP vs P2P transport

The same functions work over both transports. The library inspects the node identifier you pass and routes the call with `isP2pUri()`.

| | HTTP | P2P |
| --- | --- | --- |
| Node identifier | URL, e.g. `http://127.0.0.1:8001` | libp2p peer ID or multiaddr, e.g. `16Uiu2HAm...` |
| Setup | none | optional `ProviderInstance.setupP2P(config)`; call `stopP2P()` / `dispose()` on shutdown in long-lived processes |
| `getDownloadUrl` returns | a URL string | a buffered `DownloadResponse` |
| `downloadFile()` | fetches the URL | passes the response through |

Always pass the result of `getDownloadUrl` to `downloadFile()` and your code works on both.

## Common recipes

Each recipe is a pointer plus the key calls. Complete, tested versions are in the generated guides.

**Publish** ([CodeExamples.md](CodeExamples.md)). Use `createAsset(...)` from `@oceanprotocol/lib`. It creates the data NFT and datatoken, encrypts the files through the node, builds and registers the DDO, and returns the DID. Then wait for indexing:

```ts
const did = await createAsset(name, symbol, signer, files, 1, ddo, true, config.oceanNodeUri, config.oceanTokenAddress, aquarius)
const asset = await aquarius.waitForIndexer(did)
```

**Consume** ([CodeExamples.md](CodeExamples.md)). `ProviderInstance.initialize(...)` to get provider fees, `datatoken.startOrder(...)` (or `orderAsset`), then `ProviderInstance.getDownloadUrl(...)` and `downloadFile(...)` as in the quickstart.

**Compute-to-data, free and paid** ([ComputeExamples.md](ComputeExamples.md)).

```ts
const envs = await ProviderInstance.getComputeEnvironments(config.oceanNodeUri)
// free tier
await ProviderInstance.freeComputeStart(config.oceanNodeUri, signer, envId, datasets, algorithm)
// paid: initializeCompute -> order datasets/algorithm -> computeStart
await ProviderInstance.initializeCompute(/* assets, algorithm, env, token, validUntil, node, consumer, resources, chainId */)
await ProviderInstance.computeStart(/* node, signer, env, datasets, algorithm, maxJobDuration, token, resources, chainId */)
await ProviderInstance.computeStatus(/* ... */)
```

**Pricing**. Two models are supported: **fixed-rate** (`FixedRateExchange`, or `datatoken.createFixedRate`) and **dispenser** for free access (`Dispenser`, or `datatoken.createDispenser`). There are no other pricing mechanisms in this library.

**Escrow** (paid compute). Funds are deposited into the escrow contract and authorized for the node to lock and charge per job:

```ts
import { EscrowContract, Datatoken } from '@oceanprotocol/lib'
const escrow = new EscrowContract(config.escrow, signer, chainId, config)
// Approve the escrow contract to pull the deposit first (approve scales by the token's decimals)
await new Datatoken(signer, chainId, config).approve(tokenAddress, config.escrow, '10')
await escrow.deposit(tokenAddress, '10')
// also: authorize(...), withdraw(...), getUserFunds(payer, token), getUserTokens(payer)
```

## Configuration and networks

```ts
const config = new ConfigHelper().getConfig(11155111) // chainId (number) or name (string)
```

`getConfig(chainId | networkName, infuraProjectId?)` returns a `Config` with RPC `nodeUri`, `oceanNodeUri` (the Ocean Node, default `http://127.0.0.1:8001`) and the contract addresses (bundled from `@oceanprotocol/contracts`). Some networks (`mainnet`, `polygon`, `sepolia`) ship a keyless Infura `nodeUri` that will not connect on its own: pass your Infura project id as the second argument or set `config.nodeUri` to your own RPC URL. It returns `null` and logs an error for an unknown network.

Accepted network names: `mainnet` (1), `polygon` (137), `base` (8453), `optimism` (10), `sepolia` (11155111), `optimism_sepolia` (11155420), `bsc` (56), `energyweb` (246), `moonriver` (1285), `oasis_sapphire` (23294), `oasis_sapphire_testnet` (23295), `pontus-x-devnet` (32456), and `development` (8996, a local [barge](https://github.com/oceanprotocol/barge) stack). Legacy entries that remain in the table but are unmaintained: `mumbai` (80001), `gaiaxtestnet` (2021000) and `gen-x-testnet` (100). `src/config/ConfigHelper.ts` is the authoritative list.

**Environment variables** (Node.js only):

| Variable | Effect |
| --- | --- |
| `NODE_ENDPOINT` (or `NODE_URL`) | overrides `oceanNodeUri`. Set it to an `http(s)` URL for HTTP or a peer ID for P2P. |
| `ADDRESS_FILE` | path to a contracts `address.json` (e.g. written by barge) that overrides the bundled addresses. |

**Auth modes.** Node calls that need authentication accept any of:

- a **signer** (an ethers `Signer`): the library fetches a nonce and signs each request;
- a **JWT auth token** (`string`): create one with `ProviderInstance.generateAuthToken(signer, nodeUri)` and reuse it, avoiding a signature per call; revoke with `invalidateAuthToken`;
- a **precomputed signature** object (`{ consumerAddress, nonce, signature }`): for agents or wallets that sign out of process. `generateSignedAuthToken` mints a token from such a signature (P2P only; on HTTP use `generateAuthToken(signer, nodeUri)`).

**Sapphire / confidential EVM.** On `oasis_sapphire` and `oasis_sapphire_testnet` the config sets `sdk: 'oasis'`. Contract calls are wrapped with the Sapphire ethers shim and datatokens use the confidential **Template 4** (`Datatoken4`). Use `useOasisSDK(network)` to check programmatically.

## Architecture

There is no single `Ocean` object. The library is a set of small, composable pieces exported from one barrel (`src/index.ts`: types, config, contracts, services, utils):

- **Contract wrappers** (`src/contracts`): `NftFactory`, `Nft`, `Datatoken` (+ `Datatoken4`), `FixedRateExchange`, `Dispenser`, `Router`, `EscrowContract`, `AccessListContract`, `AccesslistFactory`, `EnterpriseFeeCollectorContract`.
- **Node services** (`src/services`): `ProviderInstance` (a ready-made `BaseProvider`, routing HTTP/P2P) and `Aquarius`.
- **Flows** (`src/utils`): `createAsset`, `orderAsset`, and helpers for approvals, DDO handling and signatures.

Every state-changing contract method comes in two forms:

- `foo(..., estimateGas?)` signs, sends and waits for the transaction, returning the ethers `TransactionResponse` (not the receipt — call `await tx.wait()` for that), or `null` if the send fails; pass `estimateGas = true` to get the gas estimate instead of sending;
- `fooTx(...)` returns the **unsigned** `TransactionRequest`, for custom signing, batching, or smart-account/agent flows.

## Error handling and gotchas

- **Node unreachable.** HTTP calls throw on connection failure; P2P calls throw a `P2pError` with a `type` you can branch on (see `classifyP2pError`, `isRetryableP2pError`). Check `oceanNodeUri`, and that the node is reachable from your network. Most node methods accept an `AbortSignal`.
- **Wrong chain.** `orderAsset` throws if the DDO's `chainId` differs from the signer's network. Make sure `ConfigHelper.getConfig(chainId)` and the signer's RPC point at the same chain as the asset.
- **Transaction reverted / insufficient balance.** Reverts surface as ethers errors. Check native-token balance for gas and base-token / datatoken balance and approvals (`approve`, `approveWei`) before ordering. Use the `estimateGas` flag to fail early.
- **Stale nonces.** If you send several transactions from one signer in parallel, serialize them or manage nonces yourself; prefer `await tx.wait()` between dependent steps.
- **Indexer lag.** A freshly published asset is not resolvable until the node indexes it. Use `aquarius.waitForIndexer(did)` (it polls, `interval` defaults to 30 s) before resolving or ordering.
- **Provider errors.** Node-side validation failures for compute and downloads are mapped to readable messages (see `src/utils/ProviderErrors.ts`).
- **Browser bundles.** `fs` is stubbed out; `ADDRESS_FILE` and the `NODE_ENDPOINT` env override are Node-only.

## Docs map

| Resource | What it is |
| --- | --- |
| [CodeExamples.md](CodeExamples.md) | **Generated** from `test/integration/CodeExamples.test.ts` (`npm run create:guide`). Publish and consume walkthrough. Do not edit by hand. |
| [ComputeExamples.md](ComputeExamples.md) | **Generated** from `test/integration/ComputeExamples.test.ts` (`npm run create:guidec2d`). Free and paid C2D walkthrough. Do not edit by hand. |
| [Cheatsheet.md](Cheatsheet.md) | **Hand-written** quick reference. |
| [`docs/`](docs/README.md) | **Generated** TypeDoc API reference (`npm run docs`). May lag `src/`; source and `dist/types` are authoritative. |
| [CHANGELOG.md](CHANGELOG.md) | Auto-generated release notes. |
| [Ocean docs](https://docs.oceanprotocol.com/) | Protocol guides and tutorials. |
| [Ocean Protocol website](https://oceanprotocol.com) | General information. |

**Upgrading from v8.** v9 is a major release: the library is ESM-only (no CJS/UMD bundle), requires Node >= 22 and ethers v6, talks to a single Ocean Node via `oceanNodeUri` (the separate `providerUri`/`metadataCacheUri`/subgraph configuration is gone) and adds P2P, auth tokens and escrow. See the [v9.0.0 entry in the CHANGELOG](CHANGELOG.md) and update imports and config accordingly.

**Compatibility.** Contract ABIs and addresses are bundled into the build from `@oceanprotocol/contracts` (`^2.9.0`, a devDependency; consumers do not install it); DDO handling uses the runtime dependency `@oceanprotocol/ddo-js` (`^1.0.0`). [ocean-cli](https://github.com/oceanprotocol/ocean-cli) consumes this library (`^9.0.0`).

## Contributing

See [CLAUDE.md](CLAUDE.md) for repository conventions and structure.

```bash
nvm use                  # Node version from .nvmrc (22.x)
npm ci
npm run build:metadata   # required before type-check and tests (generates src/metadata.json)
npm run lint             # eslint + tsc --noEmit
npm run test:unit        # contract-wrapper + unit tests; needs a local Barge chain + ADDRESS_FILE (see "Testing against barge")
npm run build            # tsup bundles + tsc declarations into dist/
npm start                # tsc watch mode
```

Formatting: `npm run format` (prettier).

### Testing against barge

Both suites run against a local [Barge](https://github.com/oceanprotocol/barge) stack (Docker on Linux/macOS). `test/unit` deploys and calls the contracts on the local chain (chainId 8996) and reads the deployed addresses from `ADDRESS_FILE`; `test/integration` additionally needs the Ocean Node and indexer. Start Barge and export `ADDRESS_FILE`:

```bash
git clone https://github.com/oceanprotocol/barge && cd barge && ./start_ocean.sh
export ADDRESS_FILE="${HOME}/.ocean/ocean-contracts/artifacts/address.json"
npm run test:integration            # defaults to NODE_ENDPOINT=http://127.0.0.1:8001 (HTTP)
NODE_ENDPOINT=<node peer id> npm run test:integration   # same suite over P2P
```

CI runs the integration suite as an `http` x `p2p` matrix by switching `NODE_ENDPOINT`. Sapphire tests (`npm run test:sapphire`) run against the live Sapphire testnet and need `PRIVATE_KEY` and `PRIVATE_KEY_CONSUMER`. On macOS, barge container IPs may be unreachable; use `http://127.0.0.1:8001` for the node.

### Releases

Releases are manually triggered with `npm run release` (release-it) from a clean `main`: it bumps the version, regenerates the CHANGELOG and docs, tags, creates a GitHub release, and the tag push triggers the npm publish workflow. A `GITHUB_TOKEN` is required ([setup](https://github.com/release-it/release-it#github-releases)). Pre-releases: `./node_modules/.bin/release-it major|minor|patch --preRelease=next`. Follow semver: breaking changes need a major bump and a migration note.

## License

```
Copyright (C) 2025 Ocean Protocol Foundation

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
