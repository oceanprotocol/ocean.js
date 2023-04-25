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
- [web3](Datatoken.md#web3)

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

• **new Datatoken**(`web3`, `network?`, `config?`, `abi?`, `abiEnterprise?`)

Instantiate ERC20 Datatokens

#### Parameters

| Name | Type |
| :------ | :------ |
| `web3` | `default` |
| `network?` | `string` \| `number` |
| `config?` | [`Config`](Config.md) |
| `abi?` | `AbiItem` \| `AbiItem`[] |
| `abiEnterprise?` | `AbiItem` \| `AbiItem`[] |

#### Overrides

[SmartContract](SmartContract.md).[constructor](SmartContract.md#constructor)

#### Defined in

[contracts/Datatoken.ts:36](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L36)

## Properties

### abi

• **abi**: `AbiItem` \| `AbiItem`[]

#### Inherited from

[SmartContract](SmartContract.md).[abi](SmartContract.md#abi)

#### Defined in

[contracts/SmartContract.ts:15](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L15)

___

### abiEnterprise

• **abiEnterprise**: `AbiItem` \| `AbiItem`[]

#### Defined in

[contracts/Datatoken.ts:24](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L24)

___

### config

• **config**: [`Config`](Config.md)

#### Inherited from

[SmartContract](SmartContract.md).[config](SmartContract.md#config)

#### Defined in

[contracts/SmartContract.ts:14](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L14)

___

### nft

• **nft**: [`Nft`](Nft.md)

#### Defined in

[contracts/Datatoken.ts:25](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L25)

___

### web3

• **web3**: `default`

#### Inherited from

[SmartContract](SmartContract.md).[web3](SmartContract.md#web3)

#### Defined in

[contracts/SmartContract.ts:13](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L13)

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
| `address` | `string` | User address |
| `minter` | `string` | User which is going to be a Minter |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:260](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L260)

___

### addPaymentManager

▸ **addPaymentManager**<`G`\>(`dtAddress`, `address`, `paymentManager`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Add addPaymentManager (can set who's going to collect fee when consuming orders)
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
| `paymentManager` | `string` | User which is going to be a Minter |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:339](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L339)

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

[SmartContract](SmartContract.md).[amountToUnits](SmartContract.md#amounttounits)

#### Defined in

[contracts/SmartContract.ts:37](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L37)

___

### approve

▸ **approve**<`G`\>(`dtAddress`, `spender`, `amount`, `address`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Approve

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
| `address` | `string` | User adress |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/Datatoken.ts:56](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L56)

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

[contracts/Datatoken.ts:838](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L838)

___

### buyFromDispenserAndOrder

▸ **buyFromDispenserAndOrder**<`G`\>(`dtAddress`, `address`, `orderParams`, `dispenserContract`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Gets DT from dispenser and then startsOrder, while burning that DT

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | User address which calls |
| `orderParams` | [`OrderParams`](../interfaces/OrderParams.md) |  |
| `dispenserContract` | `string` |  |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Datatoken.ts:653](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L653)

___

### buyFromFreAndOrder

▸ **buyFromFreAndOrder**<`G`\>(`dtAddress`, `address`, `orderParams`, `freParams`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Buys 1 DT from the FRE and then startsOrder, while burning that DT

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | User address which calls |
| `orderParams` | [`OrderParams`](../interfaces/OrderParams.md) | Consumer Address |
| `freParams` | [`FreOrderParams`](../interfaces/FreOrderParams.md) | Amount of tokens that is going to be transfered |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Datatoken.ts:615](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L615)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:730](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L730)

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
| `dispenserAddress` | `string` | ispenser contract address |
| `dispenserParams` | [`DispenserParams`](../interfaces/DispenserParams.md) |  |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:161](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L161)

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
| `fixedRateParams` | [`FreCreationParams`](../interfaces/FreCreationParams.md) |  |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:93](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L93)

___

### getCap

▸ **getCap**(`dtAddress`): `Promise`<`string`\>

Returns the Datatoken capital

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken adress |

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/Datatoken.ts:775](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L775)

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

[SmartContract](SmartContract.md).[getContract](SmartContract.md#getcontract)

#### Defined in

[contracts/SmartContract.ts:57](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L57)

___

### getDecimals

▸ **getDecimals**(`dtAddress`): `Promise`<`string`\>

It returns the token decimals, how many supported decimal points

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken adress |

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/Datatoken.ts:785](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L785)

___

### getDefaultAbi

▸ **getDefaultAbi**(): `AbiItem` \| `AbiItem`[]

#### Returns

`AbiItem` \| `AbiItem`[]

#### Overrides

[SmartContract](SmartContract.md).[getDefaultAbi](SmartContract.md#getdefaultabi)

#### Defined in

[contracts/Datatoken.ts:27](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L27)

___

### getFairGasPrice

▸ `Protected` **getFairGasPrice**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Inherited from

[SmartContract](SmartContract.md).[getFairGasPrice](SmartContract.md#getfairgasprice)

#### Defined in

[contracts/SmartContract.ts:53](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L53)

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

[contracts/Datatoken.ts:913](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L913)

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

[contracts/Datatoken.ts:815](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L815)

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

[contracts/Datatoken.ts:805](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L805)

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

[contracts/Datatoken.ts:458](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L458)

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

[contracts/Datatoken.ts:762](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L762)

___

### getPublishingMarketFee

▸ **getPublishingMarketFee**(`datatokenAddress`, `address`): `Promise`<[`PublishingMarketFee`](../interfaces/PublishingMarketFee.md)\>

**`Dev`**

getPublishingMarketFee
     Get publishingMarket Fee
     This function allows to get the current fee set by the publishing market

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `datatokenAddress` | `string` | Datatoken adress |
| `address` | `string` | user adress |

#### Returns

`Promise`<[`PublishingMarketFee`](../interfaces/PublishingMarketFee.md)\>

Current fee set by the publishing market

#### Defined in

[contracts/Datatoken.ts:898](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L898)

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

[contracts/Datatoken.ts:795](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L795)

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

[contracts/Datatoken.ts:826](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L826)

___

### mint

▸ **mint**<`G`\>(`dtAddress`, `address`, `amount`, `toAddress?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Mint

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:214](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L214)

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
| `address` | `string` | User address |
| `minter` | `string` | User which will be removed from Minter permission |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Datatoken.ts:300](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L300)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/Datatoken.ts:378](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L378)

___

### reuseOrder

▸ **reuseOrder**<`G`\>(`dtAddress`, `address`, `orderTxId`, `providerFees`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

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
| `address` | `string` | User address which calls |
| `orderTxId` | `string` | previous valid order |
| `providerFees` | [`ProviderFees`](../interfaces/ProviderFees.md) | provider fees |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

string

#### Defined in

[contracts/Datatoken.ts:579](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L579)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:690](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L690)

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
| `dtAddress` | `string` | datatoken address |
| `address` | `string` | Caller address |
| `paymentCollector` | `string` | User to be set as new payment collector |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/Datatoken.ts:418](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L418)

___

### setPublishingMarketFee

▸ **setPublishingMarketFee**<`G`\>(`datatokenAddress`, `publishMarketFeeAddress`, `publishMarketFeeToken`, `publishMarketFeeAmount`, `address`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

**`Dev`**

setPublishingMarketFee
     Only publishMarketFeeAddress can call it
     This function allows to set the fee required by the publisherMarket

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Datatoken.ts:854](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L854)

___

### startOrder

▸ **startOrder**<`G`\>(`dtAddress`, `address`, `consumer`, `serviceIndex`, `providerFees`, `consumeMarketFee?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Start Order: called by payer or consumer prior ordering a service consume on a marketplace.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | User address which calls |
| `consumer` | `string` | Consumer Address |
| `serviceIndex` | `number` | Service index in the metadata |
| `providerFees` | [`ProviderFees`](../interfaces/ProviderFees.md) | provider fees |
| `consumeMarketFee?` | [`ConsumeMarketFee`](../interfaces/ConsumeMarketFee.md) | - |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

string

#### Defined in

[contracts/Datatoken.ts:528](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L528)

___

### transfer

▸ **transfer**(`dtAddress`, `toAddress`, `amount`, `address`): `Promise`<`TransactionReceipt`\>

Transfer as number from address to toAddress

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `toAddress` | `string` | Receiver address |
| `amount` | `string` | Number of datatokens, as number. To be converted to wei. |
| `address` | `string` | User adress |

#### Returns

`Promise`<`TransactionReceipt`\>

transactionId

#### Defined in

[contracts/Datatoken.ts:472](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L472)

___

### transferWei

▸ **transferWei**<`G`\>(`dtAddress`, `toAddress`, `amount`, `address`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

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
| `amount` | `string` | Number of datatokens, as number. Expressed as wei |
| `address` | `string` | User adress |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Datatoken.ts:490](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Datatoken.ts#L490)

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

[SmartContract](SmartContract.md).[unitsToAmount](SmartContract.md#unitstoamount)

#### Defined in

[contracts/SmartContract.ts:45](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L45)
