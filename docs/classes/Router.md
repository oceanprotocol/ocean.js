[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Router

# Class: Router

Provides an interface for FactoryRouter contract

## Hierarchy

- [`SmartContractWithAddress`](SmartContractWithAddress.md)

  ↳ **`Router`**

## Table of contents

### Constructors

- [constructor](Router.md#constructor)

### Properties

- [abi](Router.md#abi)
- [address](Router.md#address)
- [config](Router.md#config)
- [contract](Router.md#contract)
- [signer](Router.md#signer)

### Methods

- [addApprovedToken](Router.md#addapprovedtoken)
- [addDispenserContract](Router.md#adddispensercontract)
- [addFixedRateContract](Router.md#addfixedratecontract)
- [amountToUnits](Router.md#amounttounits)
- [buyDatatokenBatch](Router.md#buydatatokenbatch)
- [getContract](Router.md#getcontract)
- [getCurrentOPCFee](Router.md#getcurrentopcfee)
- [getDefaultAbi](Router.md#getdefaultabi)
- [getFairGasPrice](Router.md#getfairgasprice)
- [getNFTFactory](Router.md#getnftfactory)
- [getOPCFee](Router.md#getopcfee)
- [getOwner](Router.md#getowner)
- [isApprovedToken](Router.md#isapprovedtoken)
- [isFixedPrice](Router.md#isfixedprice)
- [removeApprovedToken](Router.md#removeapprovedtoken)
- [removeDispenserContract](Router.md#removedispensercontract)
- [removeFixedRateContract](Router.md#removefixedratecontract)
- [unitsToAmount](Router.md#unitstoamount)
- [updateOPCFee](Router.md#updateopcfee)

## Constructors

### constructor

• **new Router**(`address`, `signer`, `network?`, `config?`, `abi?`)

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

### addApprovedToken

▸ **addApprovedToken**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Adds a token to the list of tokens with reduced fees

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | caller address |
| `tokenAddress` | `string` | token address to add |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:82](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L82)

___

### addDispenserContract

▸ **addDispenserContract**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Adds an address to the list of dispensers

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | caller address |
| `tokenAddress` | `string` | contract address to add |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:201](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L201)

___

### addFixedRateContract

▸ **addFixedRateContract**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Adds an address to the list of fixed rate contracts

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | caller address |
| `tokenAddress` | `string` | contract address to add |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:141](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L141)

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

### buyDatatokenBatch

▸ **buyDatatokenBatch**<`G`\>(`operations`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

* Buys a batch of datatokens.
one single call to buy multiple DT for multiple assets.
require tokenIn approvals for router from user. (except for dispenser operations)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `operations` | [`Operation`](../interfaces/Operation.md)[] | The operations to execute. |
| `estimateGas?` | `G` | Whether to return only the estimate gas or not. |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Transaction receipt

#### Defined in

[contracts/Router.ts:22](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L22)

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

### getCurrentOPCFee

▸ **getCurrentOPCFee**(): `Promise`<`number`\>

Get Current OPF Fee

#### Returns

`Promise`<`number`\>

OPF fee

#### Defined in

[contracts/Router.ts:262](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L262)

___

### getDefaultAbi

▸ **getDefaultAbi**(): [`AbiItem`](../interfaces/AbiItem.md)[]

#### Returns

[`AbiItem`](../interfaces/AbiItem.md)[]

#### Overrides

[SmartContractWithAddress](SmartContractWithAddress.md).[getDefaultAbi](SmartContractWithAddress.md#getdefaultabi)

#### Defined in

[contracts/Router.ts:10](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L10)

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

### getNFTFactory

▸ **getNFTFactory**(): `Promise`<`string`\>

Get NFT Factory address

#### Returns

`Promise`<`string`\>

NFT Factory address

#### Defined in

[contracts/Router.ts:71](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L71)

___

### getOPCFee

▸ **getOPCFee**(`baseToken`): `Promise`<`number`\>

Get OPF Fee per token

#### Parameters

| Name | Type |
| :------ | :------ |
| `baseToken` | `string` |

#### Returns

`Promise`<`number`\>

OPC fee for a specific baseToken

#### Defined in

[contracts/Router.ts:255](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L255)

___

### getOwner

▸ **getOwner**(): `Promise`<`string`\>

Get Router Owner

#### Returns

`Promise`<`string`\>

Router Owner address

#### Defined in

[contracts/Router.ts:63](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L63)

___

### isApprovedToken

▸ **isApprovedToken**(`address`): `Promise`<`boolean`\>

Checks if a token is on approved tokens list,
if true opfFee is lower in pools with that token/DT

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | The address of the token to check. |

#### Returns

`Promise`<`boolean`\>

true if is on the list.

#### Defined in

[contracts/Router.ts:46](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L46)

___

### isFixedPrice

▸ **isFixedPrice**(`address`): `Promise`<`boolean`\>

Check if an address is a Fixed Rate contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | The address of the fixed rate exchange to check. |

#### Returns

`Promise`<`boolean`\>

true if is a Fixed Rate contract

#### Defined in

[contracts/Router.ts:55](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L55)

___

### removeApprovedToken

▸ **removeApprovedToken**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Removes a token if exists from the list of tokens with reduced fees

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | caller address |
| `tokenAddress` | `string` | token address to remove |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:112](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L112)

___

### removeDispenserContract

▸ **removeDispenserContract**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Removes an address from the list of dispensers

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | caller address |
| `tokenAddress` | `string` | address Contract to be removed |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:230](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L230)

___

### removeFixedRateContract

▸ **removeFixedRateContract**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Removes an address from the list of fixed rate contracts

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | caller address |
| `tokenAddress` | `string` | contract address to add |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:171](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L171)

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

### updateOPCFee

▸ **updateOPCFee**<`G`\>(`address`, `newSwapOceanFee`, `newSwapNonOceanFee`, `newConsumeFee`, `newProviderFee`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Updates OP Community Fees

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | caller address |
| `newSwapOceanFee` | `number` | Amount charged for swapping with ocean approved tokens |
| `newSwapNonOceanFee` | `number` | Amount charged for swapping with non ocean approved tokens |
| `newConsumeFee` | `number` | Amount charged from consumeFees |
| `newProviderFee` | `number` | Amount charged for providerFees |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:276](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Router.ts#L276)
