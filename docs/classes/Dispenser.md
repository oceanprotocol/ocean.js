[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Dispenser

# Class: Dispenser

## Hierarchy

- [`SmartContractWithAddress`](SmartContractWithAddress.md)

  ↳ **`Dispenser`**

## Table of contents

### Constructors

- [constructor](Dispenser.md#constructor)

### Properties

- [abi](Dispenser.md#abi)
- [address](Dispenser.md#address)
- [config](Dispenser.md#config)
- [contract](Dispenser.md#contract)
- [signer](Dispenser.md#signer)

### Methods

- [activate](Dispenser.md#activate)
- [amountToUnits](Dispenser.md#amounttounits)
- [create](Dispenser.md#create)
- [deactivate](Dispenser.md#deactivate)
- [dispense](Dispenser.md#dispense)
- [getContract](Dispenser.md#getcontract)
- [getDefaultAbi](Dispenser.md#getdefaultabi)
- [getFairGasPrice](Dispenser.md#getfairgasprice)
- [isDispensable](Dispenser.md#isdispensable)
- [ownerWithdraw](Dispenser.md#ownerwithdraw)
- [setAllowedSwapper](Dispenser.md#setallowedswapper)
- [status](Dispenser.md#status)
- [unitsToAmount](Dispenser.md#unitstoamount)

## Constructors

### constructor

• **new Dispenser**(`address`, `signer`, `network?`, `config?`, `abi?`)

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

▸ **activate**<`G`\>(`dtAddress`, `maxTokens`, `maxBalance`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Activates a dispener.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | refers to datatoken address. |
| `maxTokens` | `string` | max amount of tokens to dispense |
| `maxBalance` | `string` | max balance of user. If user balance is >, then dispense will be rejected |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

TransactionReceipt

#### Defined in

[contracts/Dispenser.ts:86](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Dispenser.ts#L86)

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

### create

▸ **create**<`G`\>(`dtAddress`, `address`, `maxTokens`, `maxBalance`, `allowedSwapper`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Creates a new Dispenser

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address |
| `address` | `string` | Owner address |
| `maxTokens` | `string` | max tokens to dispense |
| `maxBalance` | `string` | max balance of requester |
| `allowedSwapper` | `string` | only account that can ask tokens. set address(0) if not required |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Dispenser.ts:45](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Dispenser.ts#L45)

___

### deactivate

▸ **deactivate**<`G`\>(`dtAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deactivate an existing dispenser.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | refers to datatoken address. |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

TransactionReceipt

#### Defined in

[contracts/Dispenser.ts:118](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Dispenser.ts#L118)

___

### dispense

▸ **dispense**<`G`\>(`dtAddress`, `amount?`, `destination`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Dispense datatokens to caller.
The dispenser must be active, hold enough datatokens (or be able to mint more)
and respect maxTokens/maxBalance requirements

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `dtAddress` | `string` | `undefined` | Datatoken address. |
| `amount` | `string` | `'1'` | Amount of datatokens required. |
| `destination` | `string` | `undefined` | address of tokens receiver |
| `estimateGas?` | `G` | `undefined` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Dispenser.ts:175](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Dispenser.ts#L175)

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

### getDefaultAbi

▸ **getDefaultAbi**(): [`AbiItem`](../interfaces/AbiItem.md)[]

#### Returns

[`AbiItem`](../interfaces/AbiItem.md)[]

#### Overrides

[SmartContractWithAddress](SmartContractWithAddress.md).[getDefaultAbi](SmartContractWithAddress.md#getdefaultabi)

#### Defined in

[contracts/Dispenser.ts:9](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Dispenser.ts#L9)

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

### isDispensable

▸ **isDispensable**(`dtAddress`, `datatoken`, `address`, `amount?`): `Promise`<`Boolean`\>

Check if tokens can be dispensed

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `dtAddress` | `string` | `undefined` | Datatoken address |
| `datatoken` | [`Datatoken`](Datatoken.md) | `undefined` | - |
| `address` | `string` | `undefined` | User address that will receive datatokens |
| `amount` | `string` | `'1'` | amount of datatokens required. |

#### Returns

`Promise`<`Boolean`\>

#### Defined in

[contracts/Dispenser.ts:231](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Dispenser.ts#L231)

___

### ownerWithdraw

▸ **ownerWithdraw**<`G`\>(`dtAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Withdraw all tokens from the dispenser

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address. |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Dispenser.ts:206](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Dispenser.ts#L206)

___

### setAllowedSwapper

▸ **setAllowedSwapper**<`G`\>(`dtAddress`, `newAllowedSwapper`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Sets a new allowed swapper.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | Datatoken address. |
| `newAllowedSwapper` | `string` | The address of the new allowed swapper. |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Dispenser.ts:143](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Dispenser.ts#L143)

___

### status

▸ **status**(`dtAdress`): `Promise`<[`DispenserToken`](../interfaces/DispenserToken.md)\>

Get information about a datatoken dispenser

#### Parameters

| Name | Type |
| :------ | :------ |
| `dtAdress` | `string` |

#### Returns

`Promise`<[`DispenserToken`](../interfaces/DispenserToken.md)\>

#### Defined in

[contracts/Dispenser.ts:18](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/Dispenser.ts#L18)

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
