[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / SmartContract

# Class: SmartContract

## Hierarchy

- **`SmartContract`**

  ↳ [`SmartContractWithAddress`](SmartContractWithAddress.md)

  ↳ [`Datatoken`](Datatoken.md)

  ↳ [`Nft`](Nft.md)

## Table of contents

### Constructors

- [constructor](SmartContract.md#constructor)

### Properties

- [abi](SmartContract.md#abi)
- [config](SmartContract.md#config)
- [signer](SmartContract.md#signer)

### Methods

- [amountToUnits](SmartContract.md#amounttounits)
- [getContract](SmartContract.md#getcontract)
- [getDefaultAbi](SmartContract.md#getdefaultabi)
- [getFairGasPrice](SmartContract.md#getfairgasprice)
- [unitsToAmount](SmartContract.md#unitstoamount)

## Constructors

### constructor

• **new SmartContract**(`signer`, `network?`, `config?`, `abi?`)

Instantiate the smart contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object. |
| `network?` | `string` \| `number` | Network id or name |
| `config?` | [`Config`](Config.md) | The configuration object. |
| `abi?` | [`AbiItem`](../interfaces/AbiItem.md)[] | ABI array of the smart contract |

#### Defined in

[contracts/SmartContract.ts:25](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L25)

## Properties

### abi

• **abi**: [`AbiItem`](../interfaces/AbiItem.md)[]

#### Defined in

[contracts/SmartContract.ts:14](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L14)

___

### config

• **config**: [`Config`](Config.md)

#### Defined in

[contracts/SmartContract.ts:13](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L13)

___

### signer

• **signer**: `Signer`

#### Defined in

[contracts/SmartContract.ts:12](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L12)

## Methods

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

#### Defined in

[contracts/SmartContract.ts:43](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L43)

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

#### Defined in

[contracts/SmartContract.ts:80](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L80)

___

### getDefaultAbi

▸ `Abstract` **getDefaultAbi**(): `any`

#### Returns

`any`

#### Defined in

[contracts/SmartContract.ts:16](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L16)

___

### getFairGasPrice

▸ `Protected` **getFairGasPrice**(): `Promise`<`string`\>

Retruns the gas price

#### Returns

`Promise`<`string`\>

- The fair gas price

#### Defined in

[contracts/SmartContract.ts:70](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L70)

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

#### Defined in

[contracts/SmartContract.ts:58](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L58)
