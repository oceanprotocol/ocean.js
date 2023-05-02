[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / DfRewards

# Class: DfRewards

Provides an interface for DFRewards contract

## Hierarchy

- [`SmartContractWithAddress`](SmartContractWithAddress.md)

  ↳ **`DfRewards`**

## Table of contents

### Constructors

- [constructor](DfRewards.md#constructor)

### Properties

- [abi](DfRewards.md#abi)
- [address](DfRewards.md#address)
- [config](DfRewards.md#config)
- [contract](DfRewards.md#contract)
- [signer](DfRewards.md#signer)

### Methods

- [allocateRewards](DfRewards.md#allocaterewards)
- [amountToUnits](DfRewards.md#amounttounits)
- [claimRewards](DfRewards.md#claimrewards)
- [getAvailableRewards](DfRewards.md#getavailablerewards)
- [getContract](DfRewards.md#getcontract)
- [getDefaultAbi](DfRewards.md#getdefaultabi)
- [getFairGasPrice](DfRewards.md#getfairgasprice)
- [unitsToAmount](DfRewards.md#unitstoamount)

## Constructors

### constructor

• **new DfRewards**(`address`, `signer`, `network?`, `config?`, `abi?`)

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

### allocateRewards

▸ **allocateRewards**<`G`\>(`userAddresses`, `amounts`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

allocate rewards to address.  An approve must exist before calling this function.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddresses` | `string`[] | array of users that will receive rewards |
| `amounts` | `string`[] | array of amounts |
| `tokenAddress` | `string` | token address |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/df/DfRewards.ts:64](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/df/DfRewards.ts#L64)

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

### claimRewards

▸ **claimRewards**<`G`\>(`userAddress`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

claim rewards for any address

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address to claim |
| `tokenAddress` | `string` | token address |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/df/DfRewards.ts:36](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/df/DfRewards.ts#L36)

___

### getAvailableRewards

▸ **getAvailableRewards**(`userAddress`, `tokenAddress`): `Promise`<`string`\>

Get available DF Rewards for a token

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address |
| `tokenAddress` | `string` | token address |

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/df/DfRewards.ts:19](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/df/DfRewards.ts#L19)

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

[contracts/df/DfRewards.ts:10](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/df/DfRewards.ts#L10)

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
