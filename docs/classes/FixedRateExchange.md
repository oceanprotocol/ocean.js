[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / FixedRateExchange

# Class: FixedRateExchange

## Hierarchy

- [`SmartContractWithAddress`](SmartContractWithAddress.md)

  ↳ **`FixedRateExchange`**

## Table of contents

### Constructors

- [constructor](FixedRateExchange.md#constructor)

### Properties

- [abi](FixedRateExchange.md#abi)
- [address](FixedRateExchange.md#address)
- [config](FixedRateExchange.md#config)
- [contract](FixedRateExchange.md#contract)
- [web3](FixedRateExchange.md#web3)

### Methods

- [activate](FixedRateExchange.md#activate)
- [activateMint](FixedRateExchange.md#activatemint)
- [amountToUnits](FixedRateExchange.md#amounttounits)
- [buyDatatokens](FixedRateExchange.md#buydatatokens)
- [calcBaseInGivenDatatokensOut](FixedRateExchange.md#calcbaseingivendatatokensout)
- [collectBasetokens](FixedRateExchange.md#collectbasetokens)
- [collectDatatokens](FixedRateExchange.md#collectdatatokens)
- [collectMarketFee](FixedRateExchange.md#collectmarketfee)
- [collectOceanFee](FixedRateExchange.md#collectoceanfee)
- [deactivate](FixedRateExchange.md#deactivate)
- [deactivateMint](FixedRateExchange.md#deactivatemint)
- [generateExchangeId](FixedRateExchange.md#generateexchangeid)
- [getAllowedSwapper](FixedRateExchange.md#getallowedswapper)
- [getAmountBasetokensOut](FixedRateExchange.md#getamountbasetokensout)
- [getBasetokenSupply](FixedRateExchange.md#getbasetokensupply)
- [getContract](FixedRateExchange.md#getcontract)
- [getDatatokenSupply](FixedRateExchange.md#getdatatokensupply)
- [getDefaultAbi](FixedRateExchange.md#getdefaultabi)
- [getExchange](FixedRateExchange.md#getexchange)
- [getExchangeOwner](FixedRateExchange.md#getexchangeowner)
- [getExchanges](FixedRateExchange.md#getexchanges)
- [getFairGasPrice](FixedRateExchange.md#getfairgasprice)
- [getFeesInfo](FixedRateExchange.md#getfeesinfo)
- [getNumberOfExchanges](FixedRateExchange.md#getnumberofexchanges)
- [getOPCCollector](FixedRateExchange.md#getopccollector)
- [getRate](FixedRateExchange.md#getrate)
- [getRouter](FixedRateExchange.md#getrouter)
- [isActive](FixedRateExchange.md#isactive)
- [sellDatatokens](FixedRateExchange.md#selldatatokens)
- [setAllowedSwapper](FixedRateExchange.md#setallowedswapper)
- [setRate](FixedRateExchange.md#setrate)
- [unitsToAmount](FixedRateExchange.md#unitstoamount)
- [updateMarketFee](FixedRateExchange.md#updatemarketfee)
- [updateMarketFeeCollector](FixedRateExchange.md#updatemarketfeecollector)

## Constructors

### constructor

• **new FixedRateExchange**(`address`, `web3`, `network?`, `config?`, `abi?`)

Instantiate the smart contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | Address of the smart contract |
| `web3` | `default` |  |
| `network?` | `string` \| `number` | Network id or name |
| `config?` | [`Config`](Config.md) | Configutation of the smart contract |
| `abi?` | `AbiItem` \| `AbiItem`[] | ABI of the smart contract |

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[constructor](SmartContractWithAddress.md#constructor)

#### Defined in

[contracts/SmartContractWithAddress.ts:19](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContractWithAddress.ts#L19)

## Properties

### abi

• **abi**: `AbiItem` \| `AbiItem`[]

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[abi](SmartContractWithAddress.md#abi)

#### Defined in

[contracts/SmartContract.ts:15](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L15)

___

### address

• **address**: `string`

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[address](SmartContractWithAddress.md#address)

#### Defined in

[contracts/SmartContractWithAddress.ts:8](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContractWithAddress.ts#L8)

___

### config

• **config**: [`Config`](Config.md)

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[config](SmartContractWithAddress.md#config)

#### Defined in

[contracts/SmartContract.ts:14](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L14)

___

### contract

• **contract**: `Contract`

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[contract](SmartContractWithAddress.md#contract)

#### Defined in

[contracts/SmartContractWithAddress.ts:9](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContractWithAddress.ts#L9)

___

### web3

• **web3**: `default`

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[web3](SmartContractWithAddress.md#web3)

#### Defined in

[contracts/SmartContract.ts:13](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L13)

## Methods

### activate

▸ **activate**<`G`\>(`address`, `exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Activate an exchange

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | User address |
| `exchangeId` | `string` | ExchangeId |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:225](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L225)

___

### activateMint

▸ **activateMint**<`G`\>(`address`, `exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Activate minting option for fixed rate contract

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | User address |
| `exchangeId` | `string` | ExchangeId |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:491](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L491)

___

### amountToUnits

▸ `Protected` **amountToUnits**(`token`, `amount`, `tokenDecimals?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `token` | `string` |
| `amount` | `string` |
| `tokenDecimals?` | `number` |

#### Returns

`Promise`<`string`\>

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[amountToUnits](SmartContractWithAddress.md#amounttounits)

#### Defined in

[contracts/SmartContract.ts:37](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L37)

___

### buyDatatokens

▸ **buyDatatokens**<`G`\>(`address`, `exchangeId`, `datatokenAmount`, `maxBaseTokenAmount`, `consumeMarketAddress?`, `consumeMarketFee?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Atomic swap

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `address` | `string` | `undefined` | User address |
| `exchangeId` | `string` | `undefined` | ExchangeId |
| `datatokenAmount` | `string` | `undefined` | Amount of datatokens |
| `maxBaseTokenAmount` | `string` | `undefined` | max amount of baseToken we want to pay for datatokenAmount |
| `consumeMarketAddress` | `string` | `ZERO_ADDRESS` | consumeMarketAddress |
| `consumeMarketFee` | `string` | `'0'` | consumeMarketFee in fraction |
| `estimateGas?` | `G` | `undefined` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:35](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L35)

___

### calcBaseInGivenDatatokensOut

▸ **calcBaseInGivenDatatokensOut**(`exchangeId`, `datatokenAmount`, `consumeMarketFee?`): `Promise`<[`PriceAndFees`](../interfaces/PriceAndFees.md)\>

calcBaseInGivenDatatokensOut - Calculates how many base tokens are needed to get specified amount of datatokens

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `exchangeId` | `string` | `undefined` | ExchangeId |
| `datatokenAmount` | `string` | `undefined` | Amount of datatokens user wants to buy |
| `consumeMarketFee` | `string` | `'0'` | consumeMarketFee in fraction |

#### Returns

`Promise`<[`PriceAndFees`](../interfaces/PriceAndFees.md)\>

how many base tokens are needed and fees

#### Defined in

[contracts/FixedRateExchange.ts:333](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L333)

___

### collectBasetokens

▸ **collectBasetokens**<`G`\>(`address`, `exchangeId`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Collect BaseTokens in the contract (anyone can call this, funds are sent to Datatoken.paymentCollector)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | User address |
| `exchangeId` | `string` | ExchangeId |
| `amount` | `string` | amount to be collected |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:562](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L562)

___

### collectDatatokens

▸ **collectDatatokens**<`G`\>(`address`, `exchangeId`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Collect datatokens in the contract (anyone can call this, funds are sent to Datatoken.paymentCollector)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | User address |
| `exchangeId` | `string` | ExchangeId |
| `amount` | `string` | amount to be collected |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:607](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L607)

___

### collectMarketFee

▸ **collectMarketFee**<`G`\>(`address`, `exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Collect market fee and send it to marketFeeCollector (anyone can call it)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | User address |
| `exchangeId` | `string` | ExchangeId |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:651](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L651)

___

### collectOceanFee

▸ **collectOceanFee**<`G`\>(`address`, `exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Collect ocean fee and send it to OPF collector (anyone can call it)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | User address |
| `exchangeId` | `string` | ExchangeId |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:684](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L684)

___

### deactivate

▸ **deactivate**<`G`\>(`address`, `exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deactivate an exchange

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | User address |
| `exchangeId` | `string` | ExchangeId |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:257](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L257)

___

### deactivateMint

▸ **deactivateMint**<`G`\>(`address`, `exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deactivate minting for fixed rate

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | User address |
| `exchangeId` | `string` | ExchangeId |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:526](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L526)

___

### generateExchangeId

▸ **generateExchangeId**(`baseToken`, `datatoken`): `Promise`<`string`\>

Creates unique exchange identifier.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `baseToken` | `string` | baseToken contract address |
| `datatoken` | `string` | Datatoken contract address |

#### Returns

`Promise`<`string`\>

exchangeId

#### Defined in

[contracts/FixedRateExchange.ts:18](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L18)

___

### getAllowedSwapper

▸ **getAllowedSwapper**(`exchangeId`): `Promise`<`string`\>

Get Allower Swapper (if set this is the only account which can use this exchange, else is set at address(0))

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |

#### Returns

`Promise`<`string`\>

address of allowedSwapper

#### Defined in

[contracts/FixedRateExchange.ts:322](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L322)

___

### getAmountBasetokensOut

▸ **getAmountBasetokensOut**(`exchangeId`, `datatokenAmount`, `consumeMarketFee?`): `Promise`<`string`\>

getBTOut - returns amount in baseToken that user will receive for datatokenAmount sold

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `exchangeId` | `string` | `undefined` | ExchangeId |
| `datatokenAmount` | `string` | `undefined` | Amount of datatokens |
| `consumeMarketFee` | `string` | `'0'` | consumeMarketFee in fraction |

#### Returns

`Promise`<`string`\>

Amount of baseTokens user will receive

#### Defined in

[contracts/FixedRateExchange.ts:383](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L383)

___

### getBasetokenSupply

▸ **getBasetokenSupply**(`exchangeId`): `Promise`<`string`\>

Get BaseToken Supply in the exchange

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |

#### Returns

`Promise`<`string`\>

dt supply formatted

#### Defined in

[contracts/FixedRateExchange.ts:311](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L311)

___

### getContract

▸ `Protected` **getContract**(`address`, `account?`, `abi?`): `Contract`

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `account?` | `string` |
| `abi?` | `AbiItem` \| `AbiItem`[] |

#### Returns

`Contract`

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[getContract](SmartContractWithAddress.md#getcontract)

#### Defined in

[contracts/SmartContract.ts:57](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L57)

___

### getDatatokenSupply

▸ **getDatatokenSupply**(`exchangeId`): `Promise`<`string`\>

Get Datatoken Supply in the exchange

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |

#### Returns

`Promise`<`string`\>

dt supply formatted

#### Defined in

[contracts/FixedRateExchange.ts:300](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L300)

___

### getDefaultAbi

▸ **getDefaultAbi**(): `AbiItem` \| `AbiItem`[]

#### Returns

`AbiItem` \| `AbiItem`[]

#### Overrides

[SmartContractWithAddress](SmartContractWithAddress.md).[getDefaultAbi](SmartContractWithAddress.md#getdefaultabi)

#### Defined in

[contracts/FixedRateExchange.ts:8](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L8)

___

### getExchange

▸ **getExchange**(`exchangeId`): `Promise`<[`FixedPriceExchange`](../interfaces/FixedPriceExchange.md)\>

Get exchange details

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |

#### Returns

`Promise`<[`FixedPriceExchange`](../interfaces/FixedPriceExchange.md)\>

Exchange details

#### Defined in

[contracts/FixedRateExchange.ts:409](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L409)

___

### getExchangeOwner

▸ **getExchangeOwner**(`exchangeId`): `Promise`<`string`\>

Get Exchange Owner given an exchangeId

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |

#### Returns

`Promise`<`string`\>

return exchange owner

#### Defined in

[contracts/FixedRateExchange.ts:734](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L734)

___

### getExchanges

▸ **getExchanges**(): `Promise`<`string`[]\>

Get all exchanges

#### Returns

`Promise`<`string`[]\>

Exchanges list

#### Defined in

[contracts/FixedRateExchange.ts:471](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L471)

___

### getFairGasPrice

▸ `Protected` **getFairGasPrice**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[getFairGasPrice](SmartContractWithAddress.md#getfairgasprice)

#### Defined in

[contracts/SmartContract.ts:53](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L53)

___

### getFeesInfo

▸ **getFeesInfo**(`exchangeId`): `Promise`<[`FeesInfo`](../interfaces/FeesInfo.md)\>

Get fee details for an exchange

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |

#### Returns

`Promise`<[`FeesInfo`](../interfaces/FeesInfo.md)\>

Exchange details

#### Defined in

[contracts/FixedRateExchange.ts:445](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L445)

___

### getNumberOfExchanges

▸ **getNumberOfExchanges**(): `Promise`<`number`\>

Gets total number of exchanges

#### Returns

`Promise`<`number`\>

no of available exchanges

#### Defined in

[contracts/FixedRateExchange.ts:147](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L147)

___

### getOPCCollector

▸ **getOPCCollector**(): `Promise`<`string`\>

Get OPF Collector of fixed rate contract

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/FixedRateExchange.ts:715](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L715)

___

### getRate

▸ **getRate**(`exchangeId`): `Promise`<`string`\>

Get Rate

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |

#### Returns

`Promise`<`string`\>

Rate (converted from wei)

#### Defined in

[contracts/FixedRateExchange.ts:289](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L289)

___

### getRouter

▸ **getRouter**(): `Promise`<`string`\>

Get Router address set in fixed rate contract

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/FixedRateExchange.ts:724](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L724)

___

### isActive

▸ **isActive**(`exchangeId`): `Promise`<`boolean`\>

Check if an exchange is active

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |

#### Returns

`Promise`<`boolean`\>

Result

#### Defined in

[contracts/FixedRateExchange.ts:480](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L480)

___

### sellDatatokens

▸ **sellDatatokens**<`G`\>(`address`, `exchangeId`, `datatokenAmount`, `minBaseTokenAmount`, `consumeMarketAddress?`, `consumeMarketFee?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Sell datatokenAmount while expecting at least minBaseTokenAmount

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `address` | `string` | `undefined` | User address |
| `exchangeId` | `string` | `undefined` | ExchangeId |
| `datatokenAmount` | `string` | `undefined` | Amount of datatokens |
| `minBaseTokenAmount` | `string` | `undefined` | min amount of baseToken we want to receive back |
| `consumeMarketAddress` | `string` | `ZERO_ADDRESS` | consumeMarketAddress |
| `consumeMarketFee` | `string` | `'0'` | consumeMarketFee in fraction |
| `estimateGas?` | `G` | `undefined` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:94](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L94)

___

### setAllowedSwapper

▸ **setAllowedSwapper**<`G`\>(`address`, `exchangeId`, `newAllowedSwapper`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Sets a new allowedSwapper

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | User account |
| `exchangeId` | `string` | ExchangeId |
| `newAllowedSwapper` | `string` | newAllowedSwapper (set address zero if we want to remove allowed swapper) |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:193](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L193)

___

### setRate

▸ **setRate**<`G`\>(`address`, `exchangeId`, `newRate`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Set new rate

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | User account |
| `exchangeId` | `string` | ExchangeId |
| `newRate` | `string` | New rate |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:159](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L159)

___

### unitsToAmount

▸ `Protected` **unitsToAmount**(`token`, `amount`, `tokenDecimals?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `token` | `string` |
| `amount` | `string` |
| `tokenDecimals?` | `number` |

#### Returns

`Promise`<`string`\>

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[unitsToAmount](SmartContractWithAddress.md#unitstoamount)

#### Defined in

[contracts/SmartContract.ts:45](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L45)

___

### updateMarketFee

▸ **updateMarketFee**<`G`\>(`address`, `exchangeId`, `newMarketFee`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Set new market fee, only market fee collector can update it

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | user address |
| `exchangeId` | `string` | ExchangeId |
| `newMarketFee` | `string` | New market fee |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:746](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L746)

___

### updateMarketFeeCollector

▸ **updateMarketFeeCollector**<`G`\>(`address`, `exchangeId`, `newMarketFeeCollector`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Set new market fee collector, only market fee collector can update it

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | user address |
| `exchangeId` | `string` | ExchangeId |
| `newMarketFeeCollector` | `string` | New market fee collector |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:780](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/FixedRateExchange.ts#L780)
