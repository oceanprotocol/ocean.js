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
- [signer](FixedRateExchange.md#signer)

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

• **new FixedRateExchange**(`address`, `signer`, `network?`, `config?`, `abi?`)

Instantiate the smart contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | The address of the contract. |
| `signer` | `Signer` | The signer object. |
| `network?` | `string` \| `number` | Network id or name |
| `config?` | [`Config`](Config.md) | The configuration object. |
| `abi?` | [`AbiItem`](../interfaces/AbiItem.md)[] | ABI array of the smart contract |

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[constructor](SmartContractWithAddress.md#constructor)

#### Defined in

[contracts/SmartContractWithAddress.ts:17](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContractWithAddress.ts#L17)

## Properties

### abi

• **abi**: [`AbiItem`](../interfaces/AbiItem.md)[]

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[abi](SmartContractWithAddress.md#abi)

#### Defined in

[contracts/SmartContract.ts:14](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L14)

___

### address

• **address**: `string`

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[address](SmartContractWithAddress.md#address)

#### Defined in

[contracts/SmartContractWithAddress.ts:6](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContractWithAddress.ts#L6)

___

### config

• **config**: [`Config`](Config.md)

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[config](SmartContractWithAddress.md#config)

#### Defined in

[contracts/SmartContract.ts:13](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L13)

___

### contract

• **contract**: `Contract`

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[contract](SmartContractWithAddress.md#contract)

#### Defined in

[contracts/SmartContractWithAddress.ts:7](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContractWithAddress.ts#L7)

___

### signer

• **signer**: `Signer`

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[signer](SmartContractWithAddress.md#signer)

#### Defined in

[contracts/SmartContract.ts:12](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L12)

## Methods

### activate

▸ **activate**<`G`\>(`exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Activate an exchange

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:210](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L210)

___

### activateMint

▸ **activateMint**<`G`\>(`exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Activate minting option for fixed rate contract

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchang eId |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:462](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L462)

___

### amountToUnits

▸ `Protected` **amountToUnits**(`token`, `amount`, `tokenDecimals?`): `Promise`<`string`\>

Converts an amount of tokens to units

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | The token to convert |
| `amount` | `string` | The amount of tokens to convert |
| `tokenDecimals?` | `number` | The number of decimals of the token |

#### Returns

`Promise`<`string`\>

- The converted amount in units

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[amountToUnits](SmartContractWithAddress.md#amounttounits)

#### Defined in

[contracts/SmartContract.ts:43](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L43)

___

### buyDatatokens

▸ **buyDatatokens**<`G`\>(`exchangeId`, `datatokenAmount`, `maxBaseTokenAmount`, `consumeMarketAddress?`, `consumeMarketFee?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Atomic swap

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `exchangeId` | `string` | `undefined` | ExchangeId |
| `datatokenAmount` | `string` | `undefined` | Amount of datatokens |
| `maxBaseTokenAmount` | `string` | `undefined` | max amount of baseToken we want to pay for datatokenAmount |
| `consumeMarketAddress` | `string` | `ZERO_ADDRESS` | consumeMarketAddress |
| `consumeMarketFee` | `string` | `'0'` | consumeMarketFee in fraction |
| `estimateGas?` | `G` | `undefined` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:38](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L38)

___

### calcBaseInGivenDatatokensOut

▸ **calcBaseInGivenDatatokensOut**(`exchangeId`, `datatokenAmount`, `consumeMarketFee?`): `Promise`<[`PriceAndFees`](../interfaces/PriceAndFees.md)\>

calcBaseInGivenDatatokensOut - Calculates how many base tokens are needed to get specified amount of datatokens

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `exchangeId` | `string` | `undefined` | Exchange Id |
| `datatokenAmount` | `string` | `undefined` | Amount of datatokens user wants to buy |
| `consumeMarketFee` | `string` | `'0'` | consumeMarketFee in fraction |

#### Returns

`Promise`<[`PriceAndFees`](../interfaces/PriceAndFees.md)\>

how many base tokens are needed and fees

#### Defined in

[contracts/FixedRateExchange.ts:305](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L305)

___

### collectBasetokens

▸ **collectBasetokens**<`G`\>(`exchangeId`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Collect BaseTokens in the contract (anyone can call this, funds are sent to Datatoken.paymentCollector)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |
| `amount` | `string` | amount to be collected |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:519](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L519)

___

### collectDatatokens

▸ **collectDatatokens**<`G`\>(`exchangeId`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Collect datatokens in the contract (anyone can call this, funds are sent to Datatoken.paymentCollector)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |
| `amount` | `string` | amount to be collected |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:555](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L555)

___

### collectMarketFee

▸ **collectMarketFee**<`G`\>(`exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Collect market fee and send it to marketFeeCollector (anyone can call it)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:590](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L590)

___

### collectOceanFee

▸ **collectOceanFee**<`G`\>(`exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Collect ocean fee and send it to OPF collector (anyone can call it)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:617](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L617)

___

### deactivate

▸ **deactivate**<`G`\>(`exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deactivate an exchange

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:236](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L236)

___

### deactivateMint

▸ **deactivateMint**<`G`\>(`exchangeId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deactivate minting for fixed rate

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | ExchangeId |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:490](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L490)

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

[contracts/FixedRateExchange.ts:23](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L23)

___

### getAllowedSwapper

▸ **getAllowedSwapper**(`exchangeId`): `Promise`<`string`\>

Get Allower Swapper (if set this is the only account which can use this exchange, else is set at address(0))

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |

#### Returns

`Promise`<`string`\>

address of allowed swapper

#### Defined in

[contracts/FixedRateExchange.ts:294](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L294)

___

### getAmountBasetokensOut

▸ **getAmountBasetokensOut**(`exchangeId`, `datatokenAmount`, `consumeMarketFee?`): `Promise`<`string`\>

Returns amount in baseToken that user will receive for datatokenAmount sold

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `exchangeId` | `string` | `undefined` | Exchange Id |
| `datatokenAmount` | `string` | `undefined` | Amount of datatokens |
| `consumeMarketFee` | `string` | `'0'` | consumeMarketFee in fraction |

#### Returns

`Promise`<`string`\>

Amount of baseTokens user will receive

#### Defined in

[contracts/FixedRateExchange.ts:352](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L352)

___

### getBasetokenSupply

▸ **getBasetokenSupply**(`exchangeId`): `Promise`<`string`\>

Returns basetoken supply in the exchange

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |

#### Returns

`Promise`<`string`\>

dt supply formatted

#### Defined in

[contracts/FixedRateExchange.ts:283](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L283)

___

### getContract

▸ `Protected` **getContract**(`address`, `abi?`): `Contract`

Returns a contract instance for the given address

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | The address of the contract |
| `abi?` | [`AbiItem`](../interfaces/AbiItem.md)[] | The ABI of the contract |

#### Returns

`Contract`

- The contract instance

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[getContract](SmartContractWithAddress.md#getcontract)

#### Defined in

[contracts/SmartContract.ts:80](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L80)

___

### getDatatokenSupply

▸ **getDatatokenSupply**(`exchangeId`): `Promise`<`string`\>

Get Datatoken Supply in the exchange

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |

#### Returns

`Promise`<`string`\>

dt supply formatted

#### Defined in

[contracts/FixedRateExchange.ts:272](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L272)

___

### getDefaultAbi

▸ **getDefaultAbi**(): [`AbiItem`](../interfaces/AbiItem.md)[]

#### Returns

[`AbiItem`](../interfaces/AbiItem.md)[]

#### Overrides

[SmartContractWithAddress](SmartContractWithAddress.md).[getDefaultAbi](SmartContractWithAddress.md#getdefaultabi)

#### Defined in

[contracts/FixedRateExchange.ts:13](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L13)

___

### getExchange

▸ **getExchange**(`exchangeId`): `Promise`<[`FixedPriceExchange`](../interfaces/FixedPriceExchange.md)\>

Get exchange details

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |

#### Returns

`Promise`<[`FixedPriceExchange`](../interfaces/FixedPriceExchange.md)\>

Exchange details

#### Defined in

[contracts/FixedRateExchange.ts:372](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L372)

___

### getExchangeOwner

▸ **getExchangeOwner**(`exchangeId`): `Promise`<`string`\>

Get Exchange Owner given an exchangeId

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |

#### Returns

`Promise`<`string`\>

return exchange owner

#### Defined in

[contracts/FixedRateExchange.ts:661](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L661)

___

### getExchanges

▸ **getExchanges**(): `Promise`<`string`[]\>

Returns all exchanges

#### Returns

`Promise`<`string`[]\>

Exchanges list

#### Defined in

[contracts/FixedRateExchange.ts:442](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L442)

___

### getFairGasPrice

▸ `Protected` **getFairGasPrice**(): `Promise`<`string`\>

Retruns the gas price

#### Returns

`Promise`<`string`\>

- The fair gas price

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[getFairGasPrice](SmartContractWithAddress.md#getfairgasprice)

#### Defined in

[contracts/SmartContract.ts:70](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L70)

___

### getFeesInfo

▸ **getFeesInfo**(`exchangeId`): `Promise`<[`FeesInfo`](../interfaces/FeesInfo.md)\>

Get fee details for an exchange

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |

#### Returns

`Promise`<[`FeesInfo`](../interfaces/FeesInfo.md)\>

Exchange details

#### Defined in

[contracts/FixedRateExchange.ts:414](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L414)

___

### getNumberOfExchanges

▸ **getNumberOfExchanges**(): `Promise`<`number`\>

Gets total number of exchanges

#### Returns

`Promise`<`number`\>

no of available exchanges

#### Defined in

[contracts/FixedRateExchange.ts:140](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L140)

___

### getOPCCollector

▸ **getOPCCollector**(): `Promise`<`string`\>

Get OPF Collector of fixed rate contract

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/FixedRateExchange.ts:642](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L642)

___

### getRate

▸ **getRate**(`exchangeId`): `Promise`<`string`\>

Get Exchange Rate

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange ID |

#### Returns

`Promise`<`string`\>

Rate (converted from wei)

#### Defined in

[contracts/FixedRateExchange.ts:262](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L262)

___

### getRouter

▸ **getRouter**(): `Promise`<`string`\>

Get Router address set in fixed rate contract

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/FixedRateExchange.ts:651](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L651)

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

#### Defined in

[contracts/FixedRateExchange.ts:451](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L451)

___

### sellDatatokens

▸ **sellDatatokens**<`G`\>(`exchangeId`, `datatokenAmount`, `minBaseTokenAmount`, `consumeMarketAddress?`, `consumeMarketFee?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Sell datatokenAmount while expecting at least minBaseTokenAmount

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `exchangeId` | `string` | `undefined` | ExchangeId |
| `datatokenAmount` | `string` | `undefined` | Amount of datatokens |
| `minBaseTokenAmount` | `string` | `undefined` | min amount of baseToken we want to receive back |
| `consumeMarketAddress` | `string` | `ZERO_ADDRESS` | consumeMarketAddress |
| `consumeMarketFee` | `string` | `'0'` | consumeMarketFee in fraction |
| `estimateGas?` | `G` | `undefined` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:93](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L93)

___

### setAllowedSwapper

▸ **setAllowedSwapper**<`G`\>(`exchangeId`, `newAllowedSwapper`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Sets a new allowedSwapper

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange ID |
| `newAllowedSwapper` | `string` | The address of the new allowed swapper (set address zero if we want to remove allowed swapper) |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:182](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L182)

___

### setRate

▸ **setRate**<`G`\>(`exchangeId`, `newRate`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Set new rate

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange ID |
| `newRate` | `string` | New rate |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:152](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L152)

___

### unitsToAmount

▸ `Protected` **unitsToAmount**(`token`, `amount`, `tokenDecimals?`): `Promise`<`string`\>

Converts an amount of units to tokens

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | The token to convert |
| `amount` | `string` | The amount of units to convert |
| `tokenDecimals?` | `number` | The number of decimals in the token |

#### Returns

`Promise`<`string`\>

- The converted amount in tokens

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[unitsToAmount](SmartContractWithAddress.md#unitstoamount)

#### Defined in

[contracts/SmartContract.ts:58](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L58)

___

### updateMarketFee

▸ **updateMarketFee**<`G`\>(`exchangeId`, `newMarketFee`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Set new market fee, only market fee collector can update it

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |
| `newMarketFee` | `string` | New market fee |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:673](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L673)

___

### updateMarketFeeCollector

▸ **updateMarketFeeCollector**<`G`\>(`exchangeId`, `newMarketFeeCollector`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Set new market fee collector, only market fee collector can update it

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `exchangeId` | `string` | Exchange Id |
| `newMarketFeeCollector` | `string` | New market fee collector |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/FixedRateExchange.ts:703](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/FixedRateExchange.ts#L703)
