[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Datatoken

# Class: Datatoken

## Hierarchy

- [`SmartContract`](SmartContract.md)

  ↳ **`Datatoken`**

## Table of contents

### Constructors

- [constructor](Datatoken.md#constructor)

### Properties

- [abi](Datatoken.md#abi)
- [abiEnterprise](Datatoken.md#abienterprise)
- [config](Datatoken.md#config)
- [nft](Datatoken.md#nft)
- [signer](Datatoken.md#signer)

### Methods

- [addMinter](Datatoken.md#addminter)
- [addPaymentManager](Datatoken.md#addpaymentmanager)
- [amountToUnits](Datatoken.md#amounttounits)
- [approve](Datatoken.md#approve)
- [balance](Datatoken.md#balance)
- [buyFromDispenserAndOrder](Datatoken.md#buyfromdispenserandorder)
- [buyFromFreAndOrder](Datatoken.md#buyfromfreandorder)
- [cleanPermissions](Datatoken.md#cleanpermissions)
- [createDispenser](Datatoken.md#createdispenser)
- [createFixedRate](Datatoken.md#createfixedrate)
- [getCap](Datatoken.md#getcap)
- [getContract](Datatoken.md#getcontract)
- [getDecimals](Datatoken.md#getdecimals)
- [getDefaultAbi](Datatoken.md#getdefaultabi)
- [getFairGasPrice](Datatoken.md#getfairgasprice)
- [getFreOrderParams](Datatoken.md#getfreorderparams)
- [getNFTAddress](Datatoken.md#getnftaddress)
- [getName](Datatoken.md#getname)
- [getPaymentCollector](Datatoken.md#getpaymentcollector)
- [getPermissions](Datatoken.md#getpermissions)
- [getPublishingMarketFee](Datatoken.md#getpublishingmarketfee)
- [getSymbol](Datatoken.md#getsymbol)
- [isDatatokenDeployer](Datatoken.md#isdatatokendeployer)
- [mint](Datatoken.md#mint)
- [removeMinter](Datatoken.md#removeminter)
- [removePaymentManager](Datatoken.md#removepaymentmanager)
- [reuseOrder](Datatoken.md#reuseorder)
- [setData](Datatoken.md#setdata)
- [setPaymentCollector](Datatoken.md#setpaymentcollector)
- [setPublishingMarketFee](Datatoken.md#setpublishingmarketfee)
- [startOrder](Datatoken.md#startorder)
- [transfer](Datatoken.md#transfer)
- [transferWei](Datatoken.md#transferwei)
- [unitsToAmount](Datatoken.md#unitstoamount)

## Constructors

### constructor

• **new Datatoken**(`signer`, `network?`, `config?`, `abi?`, `abiEnterprise?`)

Instantiate Datatoken class

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object. |
| `network?` | `string` \| `number` | Network id or name |
| `config?` | [`Config`](Config.md) | The configuration object. |
| `abi?` | [`AbiItem`](../interfaces/AbiItem.md)[] | ABI array of the smart contract |
| `abiEnterprise?` | [`AbiItem`](../interfaces/AbiItem.md)[] | Enterprise ABI array of the smart contract |

#### Overrides

[SmartContract](SmartContract.md).[constructor](SmartContract.md#constructor)

#### Defined in

[contracts/Datatoken.ts:38](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L38)

## Properties

### abi

• **abi**: [`AbiItem`](../interfaces/AbiItem.md)[]

#### Inherited from

[SmartContract](SmartContract.md).[abi](SmartContract.md#abi)

#### Defined in

[contracts/SmartContract.ts:14](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L14)

___

### abiEnterprise

• **abiEnterprise**: [`AbiItem`](../interfaces/AbiItem.md)[]

#### Defined in

[contracts/Datatoken.ts:23](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L23)

___

### config

• **config**: [`Config`](Config.md)

#### Inherited from

[SmartContract](SmartContract.md).[config](SmartContract.md#config)

#### Defined in

[contracts/SmartContract.ts:13](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L13)

___

### nft

• **nft**: [`Nft`](Nft.md)

#### Defined in

[contracts/Datatoken.ts:24](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L24)

___

### signer

• **signer**: `Signer`

#### Inherited from

[SmartContract](SmartContract.md).[signer](SmartContract.md#signer)

#### Defined in

[contracts/SmartContract.ts:12](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L12)

## Methods

### addMinter

▸ **addMinter**<`G`\>(`dtAddress`, `address`, `minter`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Add Minter for an ERC20 Datatoken
only DatatokenDeployer can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | caller address |
| `minter` | `string` | address which is going to be a Minter |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:252](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L252)

___

### addPaymentManager

▸ **addPaymentManager**<`G`\>(`dtAddress`, `address`, `paymentManager`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Adds a payment manager on a datatoken to a desired address.(can set who's going to collect fee when consuming orders)
only DatatokenDeployer can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | Caller address |
| `paymentManager` | `string` | The address of the payment manager |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:322](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L322)

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

[SmartContract](SmartContract.md).[amountToUnits](SmartContract.md#amounttounits)

#### Defined in

[contracts/SmartContract.ts:43](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L43)

___

### approve

▸ **approve**<`G`\>(`dtAddress`, `spender`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Approves a spender to spend a certain amount of datatokens.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `spender` | `string` | Spender address |
| `amount` | `string` | Number of datatokens, as number. Will be converted to wei |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Datatoken.ts:58](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L58)

___

### balance

▸ **balance**(`datatokenAddress`, `address`): `Promise`<`string`\>

Get Address Balance for datatoken

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `datatokenAddress` | `string` | - |
| `address` | `string` | user adress |

#### Returns

`Promise`<`string`\>

balance  Number of datatokens. Will be converted from wei

#### Defined in

[contracts/Datatoken.ts:791](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L791)

___

### buyFromDispenserAndOrder

▸ **buyFromDispenserAndOrder**<`G`\>(`dtAddress`, `orderParams`, `dispenserContract`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Gets 1 DT from dispenser and then startsOrder, while burning that DT

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `orderParams` | [`OrderParams`](../interfaces/OrderParams.md) | The parameters required to place an order. |
| `dispenserContract` | `string` | dispenser address |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Datatoken.ts:610](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L610)

___

### buyFromFreAndOrder

▸ **buyFromFreAndOrder**<`G`\>(`dtAddress`, `orderParams`, `freParams`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Buys 1 DT from the FRE and then startsOrder, while burning that DT

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `orderParams` | [`OrderParams`](../interfaces/OrderParams.md) | The parameters required to place an order. |
| `freParams` | [`FreOrderParams`](../interfaces/FreOrderParams.md) | The parameters required to buy from a fixed-rate exchange. |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Datatoken.ts:575](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L575)

___

### cleanPermissions

▸ **cleanPermissions**<`G`\>(`dtAddress`, `address`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Clean Datatoken level Permissions (minters, paymentManager and reset the paymentCollector) for an ERC20 Datatoken
Only NFT Owner (at 721 level) can call it.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address where we want to clean permissions |
| `address` | `string` | User adress |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:680](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L680)

___

### createDispenser

▸ **createDispenser**<`G`\>(`dtAddress`, `address`, `dispenserAddress`, `dispenserParams`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Creates a new Dispenser

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | Caller address |
| `dispenserAddress` | `string` | Dispenser contract address |
| `dispenserParams` | [`DispenserParams`](../interfaces/DispenserParams.md) | The parameters required to create a dispenser contract. |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:157](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L157)

___

### createFixedRate

▸ **createFixedRate**<`G`\>(`dtAddress`, `address`, `fixedRateParams`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Creates a new FixedRateExchange setup.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | Caller address |
| `fixedRateParams` | [`FreCreationParams`](../interfaces/FreCreationParams.md) | The parameters required to create a fixed-rate exchange contract. |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Datatoken.ts:91](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L91)

___

### getCap

▸ **getCap**(`dtAddress`): `Promise`<`string`\>

Returns the Datatoken cap

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken adress |

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/Datatoken.ts:723](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L723)

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

[SmartContract](SmartContract.md).[getContract](SmartContract.md#getcontract)

#### Defined in

[contracts/SmartContract.ts:80](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L80)

___

### getDecimals

▸ **getDecimals**(`dtAddress`): `Promise`<`number`\>

It returns the token decimals, how many supported decimal points

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken adress |

#### Returns

`Promise`<`number`\>

#### Defined in

[contracts/Datatoken.ts:734](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L734)

___

### getDefaultAbi

▸ **getDefaultAbi**(): [`AbiItem`](../interfaces/AbiItem.md)[]

#### Returns

[`AbiItem`](../interfaces/AbiItem.md)[]

#### Overrides

[SmartContract](SmartContract.md).[getDefaultAbi](SmartContract.md#getdefaultabi)

#### Defined in

[contracts/Datatoken.ts:26](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L26)

___

### getFairGasPrice

▸ `Protected` **getFairGasPrice**(): `Promise`<`string`\>

Retruns the gas price

#### Returns

`Promise`<`string`\>

- The fair gas price

#### Inherited from

[SmartContract](SmartContract.md).[getFairGasPrice](SmartContract.md#getfairgasprice)

#### Defined in

[contracts/SmartContract.ts:70](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L70)

___

### getFreOrderParams

▸ `Private` **getFreOrderParams**(`freParams`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `freParams` | [`FreOrderParams`](../interfaces/FreOrderParams.md) |

#### Returns

`Promise`<`any`\>

#### Defined in

[contracts/Datatoken.ts:859](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L859)

___

### getNFTAddress

▸ **getNFTAddress**(`dtAddress`): `Promise`<`string`\>

It returns the token decimals, how many supported decimal points

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken adress |

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/Datatoken.ts:767](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L767)

___

### getName

▸ **getName**(`dtAddress`): `Promise`<`string`\>

It returns the name of the token

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken adress |

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/Datatoken.ts:756](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L756)

___

### getPaymentCollector

▸ **getPaymentCollector**(`dtAddress`): `Promise`<`string`\>

getPaymentCollector - It returns the current paymentCollector

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | datatoken address |

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/Datatoken.ts:429](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L429)

___

### getPermissions

▸ **getPermissions**(`dtAddress`, `address`): `Promise`<[`DatatokenRoles`](../interfaces/DatatokenRoles.md)\>

Returns ERC20 Datatoken user's permissions for a datatoken

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken adress |
| `address` | `string` | user adress |

#### Returns

`Promise`<[`DatatokenRoles`](../interfaces/DatatokenRoles.md)\>

#### Defined in

[contracts/Datatoken.ts:709](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L709)

___

### getPublishingMarketFee

▸ **getPublishingMarketFee**(`datatokenAddress`): `Promise`<[`PublishingMarketFee`](../interfaces/PublishingMarketFee.md)\>

Returns the current fee set by the publishing market

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `datatokenAddress` | `string` | Datatoken adress |

#### Returns

`Promise`<[`PublishingMarketFee`](../interfaces/PublishingMarketFee.md)\>

Current fee set by the publishing market

#### Defined in

[contracts/Datatoken.ts:845](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L845)

___

### getSymbol

▸ **getSymbol**(`dtAddress`): `Promise`<`string`\>

It returns the token symbol

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken adress |

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/Datatoken.ts:745](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L745)

___

### isDatatokenDeployer

▸ **isDatatokenDeployer**(`dtAddress`, `address`): `Promise`<`boolean`\>

Returns true if address has deployERC20 role

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken adress |
| `address` | `string` | - |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[contracts/Datatoken.ts:779](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L779)

___

### mint

▸ **mint**<`G`\>(`dtAddress`, `address`, `amount`, `toAddress?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Mints datatokens

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | Minter address |
| `amount` | `string` | Number of datatokens, as number. Will be converted to wei |
| `toAddress?` | `string` | only if toAddress is different from the minter |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:208](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L208)

___

### removeMinter

▸ **removeMinter**<`G`\>(`dtAddress`, `address`, `minter`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Revoke Minter permission for an ERC20 Datatoken
only DatatokenDeployer can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | caller address |
| `minter` | `string` | address which will have removed the Minter permission |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Datatoken.ts:287](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L287)

___

### removePaymentManager

▸ **removePaymentManager**<`G`\>(`dtAddress`, `address`, `paymentManager`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Revoke paymentManager permission for an ERC20 Datatoken
only DatatokenDeployer can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | User address |
| `paymentManager` | `string` | User which will be removed from paymentManager permission |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/Datatoken.ts:357](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L357)

___

### reuseOrder

▸ **reuseOrder**<`G`\>(`dtAddress`, `orderTxId`, `providerFees`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Reuse Order: called by payer or consumer having a valid order, but with expired provider access.
Pays the provider fee again, but it will not require a new datatoken payment
Requires previous approval of provider fee.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `orderTxId` | `string` | previous valid order |
| `providerFees` | [`ProviderFees`](../interfaces/ProviderFees.md) | provider fees |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

string

#### Defined in

[contracts/Datatoken.ts:545](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L545)

___

### setData

▸ **setData**<`G`\>(`dtAddress`, `address`, `value`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

setData
This function allows to store data with a preset key (keccak256(dtAddress)) into NFT 725 Store
only DatatokenDeployer can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | User address |
| `value` | `string` | Data to be stored into 725Y standard |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:644](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L644)

___

### setPaymentCollector

▸ **setPaymentCollector**<`G`\>(`dtAddress`, `address`, `paymentCollector`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

This function allows to set a new PaymentCollector (receives DT when consuming)
If not set the paymentCollector is the NFT Owner
only NFT owner can call

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | Caller address |
| `paymentCollector` | `string` | User to be set as new payment collector |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/Datatoken.ts:393](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L393)

___

### setPublishingMarketFee

▸ **setPublishingMarketFee**<`G`\>(`datatokenAddress`, `publishMarketFeeAddress`, `publishMarketFeeToken`, `publishMarketFeeAmount`, `address`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Allows to set the fee required by the publisherMarket
only publishMarketFeeAddress can call it

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `datatokenAddress` | `string` | Datatoken adress |
| `publishMarketFeeAddress` | `string` | new publish Market Fee Address |
| `publishMarketFeeToken` | `string` | new publish Market Fee Token |
| `publishMarketFeeAmount` | `string` | new fee amount |
| `address` | `string` | user adress |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Datatoken.ts:807](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L807)

___

### startOrder

▸ **startOrder**<`G`\>(`dtAddress`, `consumer`, `serviceIndex`, `providerFees`, `consumeMarketFee?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Start Order: called by payer or consumer prior ordering a service consume on a marketplace.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `consumer` | `string` | Consumer Address |
| `serviceIndex` | `number` | Service index in the metadata |
| `providerFees` | [`ProviderFees`](../interfaces/ProviderFees.md) | provider fees |
| `consumeMarketFee?` | [`ConsumeMarketFee`](../interfaces/ConsumeMarketFee.md) | - |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

string

#### Defined in

[contracts/Datatoken.ts:497](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L497)

___

### transfer

▸ **transfer**<`G`\>(`dtAddress`, `toAddress`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Transfer tokens(as number) from address to toAddress

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `toAddress` | `string` | Receiver address |
| `amount` | `string` | Number of datatokens, as number. Will be converted to wei. |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:443](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L443)

___

### transferWei

▸ **transferWei**<`G`\>(`dtAddress`, `toAddress`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Transfer in wei from address to toAddress

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `toAddress` | `string` | Receiver address |
| `amount` | `string` | Number of datatokens (number) expressed as wei |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:465](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Datatoken.ts#L465)

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

[SmartContract](SmartContract.md).[unitsToAmount](SmartContract.md#unitstoamount)

#### Defined in

[contracts/SmartContract.ts:58](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L58)
