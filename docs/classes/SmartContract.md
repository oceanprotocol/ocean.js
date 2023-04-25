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
- [web3](SmartContract.md#web3)

### Methods

- [amountToUnits](SmartContract.md#amounttounits)
- [getContract](SmartContract.md#getcontract)
- [getDefaultAbi](SmartContract.md#getdefaultabi)
- [getFairGasPrice](SmartContract.md#getfairgasprice)
- [unitsToAmount](SmartContract.md#unitstoamount)

## Constructors

### constructor

• **new SmartContract**(`web3`, `network?`, `config?`, `abi?`)

Instantiate the smart contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `web3` | `default` |  |
| `network?` | `string` \| `number` | Network id or name |
| `config?` | [`Config`](Config.md) | Configutation of the smart contract |
| `abi?` | `AbiItem` \| `AbiItem`[] | ABI of the smart contract |

#### Defined in

[contracts/SmartContract.ts:26](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L26)

## Properties

### abi

• **abi**: `AbiItem` \| `AbiItem`[]

#### Defined in

[contracts/SmartContract.ts:15](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L15)

___

### config

• **config**: [`Config`](Config.md)

#### Defined in

[contracts/SmartContract.ts:14](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L14)

___

### web3

• **web3**: `default`

#### Defined in

[contracts/SmartContract.ts:13](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L13)

## Methods

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

#### Defined in

[contracts/SmartContract.ts:37](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L37)

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

#### Defined in

[contracts/SmartContract.ts:57](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L57)

___

### getDefaultAbi

▸ `Abstract` **getDefaultAbi**(): `AbiItem` \| `AbiItem`[]

#### Returns

`AbiItem` \| `AbiItem`[]

#### Defined in

[contracts/SmartContract.ts:17](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L17)

___

### getFairGasPrice

▸ `Protected` **getFairGasPrice**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/SmartContract.ts:53](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L53)

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

#### Defined in

[contracts/SmartContract.ts:45](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L45)
