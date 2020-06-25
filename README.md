[![banner](https://raw.githubusercontent.com/oceanprotocol/art/master/github/repo-banner%402x.png)](https://oceanprotocol.com)

[![Build Status](https://travis-ci.com/oceanprotocol/ocean-lib-js.svg?token=soMi2nNfCZq19zS1Rx4i&branch=develop)](https://travis-ci.com/oceanprotocol/lib-js)

<h1 align="center">Ocean-lib</h1>

`ocean-lib` is a Javascript library to privately & securely publish, exchange, 
and consume data. With it, you can:
* **Publish** data services: downloadable files, streaming data, or compute-to-data. 
Ocean creates a new [ERC20](https://github.com/ethereum/EIPs/blob/7f4f0377730f5fc266824084188cc17cf246932e/EIPS/eip-20.md) 
data token for each data service or set of services.
* **Mint** data tokens for the service
* **Consume** data tokens, to access the service
* **Transfer** data tokens to another owner, and **all other ERC20 actions** 
using [web3.js](https://web3js.readthedocs.io/en/v1.2.9/web3-eth-contract.html) etc.

`ocean-lib` is part of the [Ocean Protocol](www.oceanprotocol.com) toolset.

This is in alpha state and you can expect running into problems. If you run into them, please open up a [new issue](/issues).

## Quick Install

```npm i @oceanprotocol/lib```

## Quickstart: Simple Flow

This stripped-down flow shows the essence of Ocean. Just downloading, no metadata.

[Go to simple flow](README_simple_flow.md)

## Quickstart: Marketplace Flow

This batteries-included flow includes metadata, multiple services for one datatoken, and compute-to-data.

[Go to marketplace flow](README_marketplace_flow.md)

## For ocean-lib Developers

[Go to ocean-lib-developers flow](README_ocean-lib-developers.md)

## License

```
Copyright ((C)) 2020 Ocean Protocol Foundation

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
