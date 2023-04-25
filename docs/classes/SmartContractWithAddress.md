[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / SmartContractWithAddress

# Class: SmartContractWithAddress

## Hierarchy

- [`SmartContract`](SmartContract.md)

  ↳ **`SmartContractWithAddress`**

  ↳↳ [`Dispenser`](Dispenser.md)

  ↳↳ [`FixedRateExchange`](FixedRateExchange.md)

  ↳↳ [`Router`](Router.md)

  ↳↳ [`NftFactory`](NftFactory.md)

  ↳↳ [`VeOcean`](VeOcean.md)

  ↳↳ [`VeFeeDistributor`](VeFeeDistributor.md)

  ↳↳ [`VeFeeEstimate`](VeFeeEstimate.md)

  ↳↳ [`VeAllocate`](VeAllocate.md)

  ↳↳ [`DfRewards`](DfRewards.md)

  ↳↳ [`DfStrategyV1`](DfStrategyV1.md)

## Table of contents

### Constructors

- [constructor](SmartContractWithAddress.md#constructor)

### Properties

- [abi](SmartContractWithAddress.md#abi)
- [address](SmartContractWithAddress.md#address)
- [config](SmartContractWithAddress.md#config)
- [contract](SmartContractWithAddress.md#contract)
- [web3](SmartContractWithAddress.md#web3)

### Methods

- [amountToUnits](SmartContractWithAddress.md#amounttounits)
- [getContract](SmartContractWithAddress.md#getcontract)
- [getDefaultAbi](SmartContractWithAddress.md#getdefaultabi)
- [getFairGasPrice](SmartContractWithAddress.md#getfairgasprice)
- [unitsToAmount](SmartContractWithAddress.md#unitstoamount)

## Constructors

### constructor

• **new SmartContractWithAddress**(`address`, `web3`, `network?`, `config?`, `abi?`)

Instantiate the smart contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | Address of the smart contract |
| `web3` | `default` |  |
| `network?` | `string` \| `number` | Network id or name |
| `config?` | [`Config`](Config.md) | Configutation of the smart contract |
| `abi?` | `AbiItem` \| `AbiItem`[] | ABI of the smart contract |

#### Overrides

[SmartContract](SmartContract.md).[constructor](SmartContract.md#constructor)

#### Defined in

[contracts/SmartContractWithAddress.ts:19](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContractWithAddress.ts#L19)

## Properties

### abi

• **abi**: `AbiItem` \| `AbiItem`[]

#### Inherited from

[SmartContract](SmartContract.md).[abi](SmartContract.md#abi)

#### Defined in

[contracts/SmartContract.ts:15](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L15)

___

### address

• **address**: `string`

#### Defined in

[contracts/SmartContractWithAddress.ts:8](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContractWithAddress.ts#L8)

___

### config

• **config**: [`Config`](Config.md)

#### Inherited from

[SmartContract](SmartContract.md).[config](SmartContract.md#config)

#### Defined in

[contracts/SmartContract.ts:14](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L14)

___

### contract

• **contract**: `Contract`

#### Defined in

[contracts/SmartContractWithAddress.ts:9](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContractWithAddress.ts#L9)

___

### web3

• **web3**: `default`

#### Inherited from

[SmartContract](SmartContract.md).[web3](SmartContract.md#web3)

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

#### Inherited from

[SmartContract](SmartContract.md).[amountToUnits](SmartContract.md#amounttounits)

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

#### Inherited from

[SmartContract](SmartContract.md).[getContract](SmartContract.md#getcontract)

#### Defined in

[contracts/SmartContract.ts:57](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L57)

___

### getDefaultAbi

▸ `Abstract` **getDefaultAbi**(): `AbiItem` \| `AbiItem`[]

#### Returns

`AbiItem` \| `AbiItem`[]

#### Inherited from

[SmartContract](SmartContract.md).[getDefaultAbi](SmartContract.md#getdefaultabi)

#### Defined in

[contracts/SmartContract.ts:17](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L17)

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
