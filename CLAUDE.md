# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@oceanprotocol/lib` (currently v8.x) — the JavaScript/TypeScript client library for Ocean Protocol. It lets apps publish data as ERC721 data NFTs + ERC20 datatokens, price them (fixed-rate exchange, free dispenser), and consume them (download or Compute-to-Data), talking to on-chain contracts via ethers and to off-chain Ocean Node services (Provider / Aquarius) over HTTP or libp2p P2P.

- Pure ESM package: `"type": "module"`, entry `src/index.ts`, Node `>=18` (CI builds on 20 & 22; `.nvmrc` = 22).
- Blockchain layer is **ethers v6** (the `web3` peerDependency is legacy and not used by the wrappers).
- Ships bundled by microbundle to `dist/` (cjs / esm / modern / umd + `dist/types/*.d.ts`).
- DDO parsing/validation and DID versioning are delegated to the external `@oceanprotocol/ddo-js` (`DDOManager`); ABIs come from `@oceanprotocol/contracts`.

## Common commands

Build / develop:
- `npm start` — clean, generate metadata, then `tsc -w` (watch mode).
- `npm run build` — production build: `clean` → `build:metadata` → microbundle (formats modern,esm,cjs,umd, compressed). This is what `prepublishOnly` runs.
- `npm run build:tsc` — plain `tsc --sourceMap` (no bundling).
- `npm run build:metadata` — writes `src/metadata.json` (package version + git commit) via `scripts/get-metadata.js`. **Required before type-check and before running tests**; `type-check`, the release hook, and CI all invoke it. If you see stale/odd metadata errors, re-run this.
- `npm run clean` — removes `dist/`, `doc/`, `.nyc_output`.

Lint / format / types:
- `npm run lint` — ESLint over `.ts,.tsx` **and** `npm run type-check`.
- `npm run lint:fix` — ESLint autofix.
- `npm run format` — Prettier over `**/*.{js,jsx,ts,tsx}`.
- `npm run type-check` — `build:metadata` + `tsc --noEmit`.
- Style is enforced by `.prettierrc` (no semicolons, single quotes, `printWidth` 90, no trailing commas, 2-space) and `.eslintrc` (extends `oceanprotocol` + `plugin:prettier/recommended`; empty catch allowed; several rules downgraded to `warn`).

Docs (generated — do not hand-edit output):
- `npm run docs` — TypeDoc + `typedoc-plugin-markdown` → `docs/` (per-class/interface markdown).
- `npm run doc:json` — TypeDoc JSON → `dist/lib.json` (attached to GitHub releases).

Tests:
- `npm test` — the full CI-equivalent gate: `lint` → `test:unit:cover` → `test:integration:cover`.
- `npm run test:unit` — unit tests only: `npx tsx ./node_modules/mocha/bin/mocha.js --config ./test/.mocharc.json 'test/unit/**/*.test.ts'`.
- `npm run test:unit:cover` — same under `nyc` (coverage → `coverage/unit`).
- `npm run test:integration` — integration tests, **excluding** `Sapphire.test.ts`.
- `npm run test:integration:cover` — same under `nyc` (coverage → `coverage/integration`, `--no-clean` so it merges with unit).
- `npm run test:sapphire` — runs only `test/integration/Sapphire.test.ts` against the **live Oasis Sapphire testnet** (needs `PRIVATE_KEY` and `PRIVATE_KEY_CONSUMER` exported); kept out of the normal integration run.
- `npm run mocha` — raw mocha runner (`TS_NODE_PROJECT=./test/tsconfig.json mocha --config=test/.mocharc.json --node-env=test --exit`); this is what `test:sapphire` wraps.

Running a SINGLE test:
- One file (recommended, matches the maintained unit/integration scripts):
  `npx tsx ./node_modules/mocha/bin/mocha.js --config ./test/.mocharc.json 'test/unit/Datatoken.test.ts'`
- A single `it(...)` case: add `--grep 'partial test title'` to the command above.
- The repo's own single-file pattern (used by `test:sapphire`) is `npm run mocha -- 'test/integration/<File>.test.ts'`.
- Note: both mocharc files set `bail: true`, so a run stops at the first failing assertion. Timeouts differ: root `.mocharc.json` = 200000ms, `test/.mocharc.json` (used by the npm scripts) = 20000ms.

### Unit vs integration split

- `test/unit/**` — pure contract-wrapper tests (Datatoken, Nft, NftFactory, FixedRateExchange, Dispenser, Router, Escrow, EnterpriseFeeCollector, AssetUtils). These still hit a **local chain** (they deploy/interact via the barge Ganache node) but don't require the full Node/Aquarius/Indexer stack the way integration does. `mock-local-storage` and `source-map-support` are auto-required (mocharc).
- `test/integration/**` — end-to-end flows against the whole Ocean stack: `PublishFlows`, `PublishEditConsume`, `ComputeFlow`, `Provider`, `Auth`, `Sapphire`, plus `CodeExamples`/`ComputeExamples` (see "Generated guides"). `_P2PWarmup.test.ts` warms up the libp2p transport first.
- Shared test setup is in `test/config.ts` (`getTestConfig`, `getAddresses`, a default `JsonRpcProvider` on the development network) and `test/integration/helpers.ts`.

### Integration tests need Barge (local Ocean stack)

Integration tests run against [Barge](https://github.com/oceanprotocol/barge), which spins up a local blockchain (chainId `8996`, network name `development`), an Ocean Node (Provider + Aquarius + Indexer), and an Elasticsearch DB in Docker.

```bash
git clone https://github.com/oceanprotocol/barge && cd barge
./start_ocean.sh
# in another terminal, back in ocean.js:
export ADDRESS_FILE="${HOME}/.ocean/ocean-contracts/artifacts/address.json"
npm run build:metadata
npm run test:integration      # or: npm test
```

- `ADDRESS_FILE` is how the library learns barge's freshly-deployed contract addresses (see `ConfigHelper` below). `scripts/waitforcontracts.sh` polls for the barge `ready` markers and prints `address.json`.
- Point the client at a specific node via `NODE_ENDPOINT` (or `NODE_URL`) — an HTTP URL for the REST transport, or a peerId/multiaddr for the P2P transport. `NODE_URI` overrides the RPC endpoint.
- CI (`.github/workflows/ci.yml`) runs the integration matrix twice — `transport: http` (`NODE_ENDPOINT=http://127.0.0.1:8001`) and `transport: p2p` (`NODE_ENDPOINT=<peerId>`) — and sets Elasticsearch env (`DB_URL=http://172.15.0.6:9200`, `DB_TYPE=elasticsearch`, `DB_USERNAME`/`DB_PASSWORD`) plus `INDEXING_RETRY_INTERVAL`/`INDEXING_MAX_RETRIES`. It waits for the `ocean-node-1` container to be up before testing.
- macOS caveat (from README): barge's internal IPs aren't reachable; use `http://127.0.0.1` for direct Provider/metadataCache/subgraph calls but keep the internal `http://172.15.0.4:8030` provider URL inside DDO `serviceEndpoint` and in `nft.setMetadata()`.

### Release / publish

Semi-automatic via `release-it`, always triggered manually from a clean `main`:
- `npm run release` — bumps version, regenerates `CHANGELOG.md` (`auto-changelog`) + `dist/lib.json` (via the `after:bump` hook that runs `build` + `changelog` + `doc:json`), commits, tags `v${version}`, and creates a GitHub release. Needs `GITHUB_TOKEN`.
- `release-it` is configured with `npm.publish = false` — the actual npm publish is done by `.github/workflows/publish.yml`, triggered on the **git tag push**: `npm publish` for normal tags, `npm publish --tag next` when the tag contains `next`.
- Pre-releases: first one `./node_modules/.bin/release-it minor --preRelease=next` (→ e.g. `v0.18.0-next.0`), then `npm run release` for subsequent `next.N`.

## Architecture

`src/index.ts` is a barrel that re-exports five modules: `@types`, `config`, `contracts`, `services`, `utils`. There is intentionally **no single "Ocean" god-object** — high-level publish/consume flows are plain functions in `utils/` that compose the contract wrappers and services.

### config/ — networks & addresses

- `Config` (class) holds RPC/node URIs, all contract addresses, tx tuning (block timeout, confirmations, gas multiplier), and an `sdk: 'evm' | 'oasis'` flag.
- `ConfigHelper.getConfig(chainId | networkName, infuraProjectId?)` looks up a per-network template from the static `configHelperNetworks` array (mainnet, polygon, base, optimism/-sepolia, sepolia, bsc, energyweb, moonriver, gen-x, gaiax, oasis_sapphire (+testnet), pontus-x-devnet, and `development`=8996 for barge). It then merges in contract addresses from `@oceanprotocol/contracts` `address.json`, or — in Node when `ADDRESS_FILE` is set — from that file on disk (this is what makes local/barge testing work). Address keys are remapped (`ERC721Factory`→`nftFactoryAddress`, `FixedPrice`→`fixedRateExchangeAddress`, etc.).
- `KNOWN_CONFIDENTIAL_EVMS` = Sapphire chain IDs `23294`/`23295`; these force `sdk='oasis'`. `getNodeEndpointConfig()` applies `NODE_ENDPOINT`/`NODE_URL` env over `oceanNodeUri` (default `http://127.0.0.1:8001`).

### contracts/ — typed ethers v6 wrappers

Base classes:
- `SmartContract` (abstract): stores `signer`, `config`, `abi`; each subclass implements `getDefaultAbi()` (returns the ABI imported from the `@oceanprotocol/contracts` artifacts). Provides `getContract(address)`, amount↔units conversion, fair gas price, and `getSignerAccordingSdk()` which wraps the signer with `@oasisprotocol/sapphire-paratime` when `sdk==='oasis'`.
- `SmartContractWithAddress` extends it with a fixed `address` + instantiated `contract`.

Wrappers (each maps to an Ocean contract):
- `NftFactory` — deploys the NFT+datatoken **bundle** in one tx: `createNftWithDatatoken`, `createNftWithDatatokenWithFixedRate`, `createNftWithDatatokenWithDispenser`; template management; `startMultipleTokenOrder`.
- `Nft` — the ERC721 data NFT: metadata (`setMetadata`, `setMetadataAndTokenURI`), roles/permissions (managers, deployers, metadata/store updaters), `createDatatoken`, transfer, and the ERC725 key-value store (`setData`/`getData`).
- `Datatoken` — the ERC20 access token: `startOrder`, `reuseOrder`, `buyFromFreAndOrder`, `buyFromDispenserAndOrder`, `mint`, `approve`, roles (minter/payment-manager), `createFixedRate`/`createDispenser`, and reads like `getFixedRates`, `getDispensers`, `getId` (template index), `getPublishingMarketFee`.
- `Datatoken4` extends `Datatoken` for `ERC20Template4` (confidential / Oasis): adds on-chain files object (`setFileObject`/`getFileObject`) and allow/deny access-list contracts.
- `FixedRateExchange` — buy/sell datatokens at a fixed rate, rate/fee management, `calcBaseInGivenDatatokensOut`, `getExchange`/`getFeesInfo`.
- `Dispenser` — free datatoken faucet (`dispense`, `create`, `status`, `isDispensable`).
- `Router` (FactoryRouter) — approved base tokens, OPC fees, `buyDatatokenBatch`.
- `Escrow` — payment escrow (deposit/withdraw/authorize/locks/reLock/bundle); the current feature branch (`feature/new_bundle_for_escrow`) is actively evolving this.
- `EnterpriseFeeCollector`, plus `AccessList` + `AccessListFactory` (soulbound allow/deny lists used on confidential EVM).

**Dual-method transaction pattern (important — follow it when adding methods).** Every state-changing operation exists as a pair:
- `fooTx(...) : Promise<TransactionRequest>` — builds the *unsigned* tx (gas estimated via `buildTxOverrides`, assembled via `buildUnsignedTx`).
- `foo<G extends boolean = false>(..., estimateGas?: G) : Promise<ReceiptOrEstimate<G>>` — calls `fooTx`, then either returns the gas estimate (`estimateGas===true`) or signs & sends via `sendPreparedTransaction(getSignerAccordingSdk(), tx)` and returns the receipt.
Read-only methods are plain `getX`. `ReceiptOrEstimate<G>` lives in `@types/ReturnTypes`.

### services/ — off-chain Ocean Node clients

- `Provider` / `ProviderInstance` — exported names for `BaseProvider`, a **transport-dispatching façade**. Every method takes an `OceanNode` target and routes to `HttpProvider` (REST) or `P2pProvider` (libp2p) based on `isP2pUri()` (URL → HTTP; peerId/multiaddr/NodeP2P → P2P). Surface includes: `getNonce`, `encrypt`, `getFileInfo`/`checkDidFiles`, `initialize` (returns provider fees for an order), `getDownloadUrl` (consume), the full compute lifecycle (`getComputeEnvironments`, `initializeCompute`, `computeStart`, `freeComputeStart`, `computeStatus`, `computeStop`, `computeStreamableLogs`, `getComputeResultUrl`, `getComputeResult`), JWT auth tokens (`generateAuthToken`, `generateSignedAuthToken`, `invalidateAuthToken`), P2P DDO `resolveDdo`/`validateDdo`, node status/jobs/logs, policy-server passthrough, and persistent-storage buckets. Auth params accept a `SignerOrAuthTokenOrSignature` (an ethers `Signer`, a JWT string, or a precomputed `CompleteSignature`). On compute start it also fire-and-forgets a notification to an incentive backend if `INCENTIVE_BACKEND_URL` is set. Request signing scheme throughout = `address + nonce + command` (see `SignatureUtils.signRequest` and `@types/Provider` `PROTOCOL_COMMANDS`).
- `Aquarius` — metadata/DDO index client: `resolve(did)`, `waitForIndexer(did, txid?)` (polls until the indexer has cached the asset/update), `validate(ddo, signer, providerUrl)`, `querySearch(query)`, `getAssetMetadata(did)`. Transparently supports a P2P node URI (delegates to `ProviderInstance.resolveDdo/validateDdo`). DDO shape handling is via `@oceanprotocol/ddo-js`.

### utils/ — flows + helpers (the flows live here)

- `Assets.ts` → `createAsset(...)`: the canonical **publish** flow. Chooses pricing from the DDO stats price (no price → plain bundle; `'0'` → dispenser; `>0` → fixed rate), deploys the NFT+datatoken bundle via `NftFactory.createNftWithDatatoken*`, reads `NFTCreated`/`TokenCreated` events for the new addresses, encrypts the files object + DDO via `ProviderInstance.encrypt` and validates via `Aquarius.validate` (or, on Oasis, stores the files object on-chain through `ERC20Template4.setFilesObject` and leaves `files` empty), then writes it with `Nft.setMetadata`. Returns the DID. Also `createAccessListFactory`, `useOasisSDK`.
- `OrderUtils.ts` → `orderAsset(...)`: the canonical **consume/order** flow. Detects pricing type from the datatoken (`getFixedRates` vs `getDispensers`), gets provider fees from `Provider.initialize`, approves fee tokens, then branches on the datatoken **template index**: template `1` (base `ERC20Template`) does buy-then-`startOrder` in separate steps; templates `2`/`4` (Enterprise/Template4) do atomic `buyFromFreAndOrder` / `buyFromDispenserAndOrder`. After ordering, callers use `Provider.getDownloadUrl` (download) or `Provider.initializeCompute` + `computeStart` (compute).
- `ContractUtils.ts` — `sendPreparedTransaction`, `buildUnsignedTx`, `buildTxOverrides`, `getEventFromTx`, `getFairGasPrice`, `amountToUnits`/`unitsToAmount`, `getTokenDecimals`, `setContractDefaults`.
- `TokenUtils.ts` — ERC20 `approve`/`approveWei`/`allowance`/`balance`/`transfer`/`decimals`.
- `SignatureUtils.ts` — `signRequest`/`signHash` (the address+nonce+command signing used by Provider/Aquarius). `DdoHelpers.ts` — `generateDid`, `getHash`. Plus `Jwt`, `Logger` (`LoggerInstance`, `LogLevel`), `Constants` (`ZERO_ADDRESS`), `bytes`, `Addresses` (`calculateActiveTemplateIndex`), `eciesencrypt`, and `minAbi` (a minimal ERC20 ABI for token utils).

### @types/ — shared types

All public interfaces/types (Assets, Compute, Datatoken, Provider, NFTFactory, FixedPrice, Dispenser, Escrow, Router, File/FileInfo, PolicyServer, Jwt, AccessList, and `ReturnTypes` incl. `ReceiptOrEstimate`). Add new public types here and export from `@types/index.ts`.

### End-to-end flow summaries

- **Publish**: `ConfigHelper.getConfig` → build a DDO (ddo-js) → `createAsset()` [NftFactory bundle → `Provider.encrypt` → `Aquarius.validate` → `Nft.setMetadata`] → `Aquarius.waitForIndexer`.
- **Consume (download)**: `Aquarius.resolve(did)` → `orderAsset()` [`Provider.initialize` fees → FRE/Dispenser buy → `Datatoken.startOrder`] → `Provider.getDownloadUrl` → download.
- **Compute-to-Data**: resolve dataset + algorithm → `Provider.getComputeEnvironments` → `Provider.initializeCompute` → (paid) order dataset+algo, or (free) `Provider.freeComputeStart` → `Provider.computeStart` → poll `computeStatus` → `getComputeResultUrl`/`getComputeResult`.

## Conventions & gotchas

- **No ABI codegen.** ABIs are imported straight from `@oceanprotocol/contracts/artifacts/**/*.json`; each wrapper's `getDefaultAbi()` returns one. Bumping the `@oceanprotocol/contracts` dependency is how contract interfaces change.
- **ESM `.js` import extensions are mandatory** even though sources are `.ts` (moduleResolution `node`, pure ESM). Follow the existing `import ... from './Foo.js'` style. Library consumers need `moduleResolution: node` (or `bundler` for Next.js), `esModuleInterop`, `allowSyntheticDefaultImports` (README).
- **Barrel exports**: add a class/type, then export it from the module's `index.ts` so it reaches `src/index.ts`.
- **Generated files — never hand-edit**: `src/metadata.json` (from `build:metadata`), everything in `docs/` and `dist/lib.json` (from TypeDoc), and the two guide docs. `CodeExamples.md` and `ComputeExamples.md` are generated from `test/integration/CodeExamples.test.ts` / `ComputeExamples.test.ts` by `scripts/createCodeExamples.sh` (`npm run create:guide` / `create:guidec2d`), which strips imports and turns `it('...')` / `///`-prefixed comment lines into markdown. To change a guide, edit the corresponding test and regenerate; CI's `create_guide` job commits regenerated guides via `npm run commit:guides`.
- **Dual EVM/Oasis paths are pervasive.** The `sdk` flag, `getSignerAccordingSdk()` (Sapphire wrap), `Datatoken4`/`ERC20Template4`, on-chain-vs-encrypted files, and access lists all branch on confidential EVM. Keep both the standard `evm` and `oasis` paths working when touching publish/consume/contracts.
- **Cheatsheet.md** is a quick reference for the common publish/consume/compute snippets and is a good orientation read alongside the two example guides.
