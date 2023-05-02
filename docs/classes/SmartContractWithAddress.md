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
- [signer](SmartContractWithAddress.md#signer)

### Methods

- [amountToUnits](SmartContractWithAddress.md#amounttounits)
- [getContract](SmartContractWithAddress.md#getcontract)
- [getDefaultAbi](SmartContractWithAddress.md#getdefaultabi)
- [getFairGasPrice](SmartContractWithAddress.md#getfairgasprice)
- [unitsToAmount](SmartContractWithAddress.md#unitstoamount)

## Constructors

### constructor

• **new SmartContractWithAddress**(`address`, `signer`, `network?`, `config?`, `abi?`)

Instantiate the smart contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | The address of the contract. |
| `signer` | `Signer` | The signer object. |
| `network?` | `string` \| `number` | Network id or name |
| `config?` | [`Config`](Config.md) | The configuration object. |
| `abi?` | [`AbiItem`](../interfaces/AbiItem.md)[] | ABI array of the smart contract |

#### Overrides

[SmartContract](SmartContract.md).[constructor](SmartContract.md#constructor)

#### Defined in

[contracts/SmartContractWithAddress.ts:17](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContractWithAddress.ts#L17)

## Properties

### abi

• **abi**: [`AbiItem`](../interfaces/AbiItem.md)[]

#### Inherited from

[SmartContract](SmartContract.md).[abi](SmartContract.md#abi)

#### Defined in

[contracts/SmartContract.ts:14](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L14)

___

### address

• **address**: `string`

#### Defined in

[contracts/SmartContractWithAddress.ts:6](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContractWithAddress.ts#L6)

___

### config

• **config**: [`Config`](Config.md)

#### Inherited from

[SmartContract](SmartContract.md).[config](SmartContract.md#config)

#### Defined in

[contracts/SmartContract.ts:13](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L13)

___

### contract

• **contract**: `Contract`

#### Defined in

[contracts/SmartContractWithAddress.ts:7](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContractWithAddress.ts#L7)

___

### signer

• **signer**: `Signer`

#### Inherited from

[SmartContract](SmartContract.md).[signer](SmartContract.md#signer)

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

#### Inherited from

[SmartContract](SmartContract.md).[amountToUnits](SmartContract.md#amounttounits)

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

#### Inherited from

[SmartContract](SmartContract.md).[getContract](SmartContract.md#getcontract)

#### Defined in

[contracts/SmartContract.ts:80](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L80)

___

### getDefaultAbi

▸ `Abstract` **getDefaultAbi**(): `any`

#### Returns

`any`

#### Inherited from

[SmartContract](SmartContract.md).[getDefaultAbi](SmartContract.md#getdefaultabi)

#### Defined in

[contracts/SmartContract.ts:16](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L16)

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
