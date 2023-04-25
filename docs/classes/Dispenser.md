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
- [web3](Dispenser.md#web3)

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

• **new Dispenser**(`address`, `web3`, `network?`, `config?`, `abi?`)

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

▸ **activate**<`G`\>(`dtAddress`, `maxTokens`, `maxBalance`, `address`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Activates a new dispener.

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
| `address` | `string` | User address (must be owner of the datatoken) |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

TransactionReceipt

#### Defined in

[contracts/Dispenser.ts:83](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Dispenser.ts#L83)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/Dispenser.ts:39](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Dispenser.ts#L39)

___

### deactivate

▸ **deactivate**<`G`\>(`dtAddress`, `address`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deactivate an existing dispenser.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | refers to datatoken address. |
| `address` | `string` | User address (must be owner of the datatoken) |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

TransactionReceipt

#### Defined in

[contracts/Dispenser.ts:119](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Dispenser.ts#L119)

___

### dispense

▸ **dispense**<`G`\>(`dtAddress`, `address`, `amount?`, `destination`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Dispense datatokens to caller.
The dispenser must be active, hold enough DT (or be able to mint more)
and respect maxTokens/maxBalance requirements

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `dtAddress` | `string` | `undefined` | refers to datatoken address. |
| `address` | `string` | `undefined` | User address |
| `amount` | `string` | `'1'` | amount of datatokens required. |
| `destination` | `string` | `undefined` | who will receive the tokens |
| `estimateGas?` | `G` | `undefined` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

TransactionReceipt

#### Defined in

[contracts/Dispenser.ts:186](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Dispenser.ts#L186)

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

### getDefaultAbi

▸ **getDefaultAbi**(): `AbiItem` \| `AbiItem`[]

#### Returns

`AbiItem` \| `AbiItem`[]

#### Overrides

[SmartContractWithAddress](SmartContractWithAddress.md).[getDefaultAbi](SmartContractWithAddress.md#getdefaultabi)

#### Defined in

[contracts/Dispenser.ts:10](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Dispenser.ts#L10)

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

### isDispensable

▸ **isDispensable**(`dtAddress`, `datatoken`, `address`, `amount?`): `Promise`<`Boolean`\>

Check if tokens can be dispensed

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `dtAddress` | `string` | `undefined` |  |
| `datatoken` | [`Datatoken`](Datatoken.md) | `undefined` | - |
| `address` | `string` | `undefined` | User address that will receive datatokens |
| `amount` | `string` | `'1'` | amount of datatokens required. |

#### Returns

`Promise`<`Boolean`\>

#### Defined in

[contracts/Dispenser.ts:252](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Dispenser.ts#L252)

___

### ownerWithdraw

▸ **ownerWithdraw**<`G`\>(`dtAddress`, `address`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Withdraw all tokens from the dispenser

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | refers to datatoken address. |
| `address` | `string` | User address (must be owner of the dispenser) |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

TransactionReceipt

#### Defined in

[contracts/Dispenser.ts:221](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Dispenser.ts#L221)

___

### setAllowedSwapper

▸ **setAllowedSwapper**<`G`\>(`dtAddress`, `address`, `newAllowedSwapper`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Sets a new allowedSwapper.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtAddress` | `string` | refers to datatoken address. |
| `address` | `string` | User address (must be owner of the datatoken) |
| `newAllowedSwapper` | `string` | refers to the new allowedSwapper |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

TransactionReceipt

#### Defined in

[contracts/Dispenser.ts:150](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Dispenser.ts#L150)

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

Exchange details

#### Defined in

[contracts/Dispenser.ts:19](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Dispenser.ts#L19)

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
