[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / VeOcean

# Class: VeOcean

Provides an interface for veOcean contract

## Hierarchy

- [`SmartContractWithAddress`](SmartContractWithAddress.md)

  ↳ **`VeOcean`**

## Table of contents

### Constructors

- [constructor](VeOcean.md#constructor)

### Properties

- [abi](VeOcean.md#abi)
- [address](VeOcean.md#address)
- [config](VeOcean.md#config)
- [contract](VeOcean.md#contract)
- [signer](VeOcean.md#signer)

### Methods

- [amountToUnits](VeOcean.md#amounttounits)
- [depositFor](VeOcean.md#depositfor)
- [getContract](VeOcean.md#getcontract)
- [getDefaultAbi](VeOcean.md#getdefaultabi)
- [getFairGasPrice](VeOcean.md#getfairgasprice)
- [getLockedAmount](VeOcean.md#getlockedamount)
- [getToken](VeOcean.md#gettoken)
- [getVotingPower](VeOcean.md#getvotingpower)
- [increaseAmount](VeOcean.md#increaseamount)
- [increaseUnlockTime](VeOcean.md#increaseunlocktime)
- [lockEnd](VeOcean.md#lockend)
- [lockTokens](VeOcean.md#locktokens)
- [totalSupply](VeOcean.md#totalsupply)
- [unitsToAmount](VeOcean.md#unitstoamount)
- [withdraw](VeOcean.md#withdraw)

## Constructors

### constructor

• **new VeOcean**(`address`, `signer`, `network?`, `config?`, `abi?`)

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

### depositFor

▸ **depositFor**<`G`\>(`toAddress`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deposit `amount` tokens for `toAddress` and add to the existing lock
Anyone (even a smart contract) can deposit for someone else, but cannot extend their locktime and deposit for a brand new user

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `toAddress` | `string` | user address to deposit for |
| `amount` | `string` | Amount of tokens to be locked |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeOcean.ts:52](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L52)

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

[contracts/ve/VeOcean.ts:9](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L9)

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

### getLockedAmount

▸ **getLockedAmount**(`userAddress`): `Promise`<`string`\>

Get locked balance

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address |

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/ve/VeOcean.ts:156](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L156)

___

### getToken

▸ **getToken**(): `Promise`<`string`\>

Get token

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/ve/VeOcean.ts:189](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L189)

___

### getVotingPower

▸ **getVotingPower**(`userAddress`): `Promise`<`number`\>

Get voting power for address

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address |

#### Returns

`Promise`<`number`\>

#### Defined in

[contracts/ve/VeOcean.ts:147](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L147)

___

### increaseAmount

▸ **increaseAmount**<`G`\>(`amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deposit `amount` additional tokens for `userAddress` without modifying the unlock time

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `amount` | `string` | Amount of tokens to be locked |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeOcean.ts:79](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L79)

___

### increaseUnlockTime

▸ **increaseUnlockTime**<`G`\>(`unlockTime`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Extend the unlock time for `userAddress` to `unlockTime`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unlockTime` | `number` | Timestamp for new unlock time |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeOcean.ts:104](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L104)

___

### lockEnd

▸ **lockEnd**(`userAddress`): `Promise`<`number`\>

Get untilLock for address

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address |

#### Returns

`Promise`<`number`\>

#### Defined in

[contracts/ve/VeOcean.ts:170](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L170)

___

### lockTokens

▸ **lockTokens**<`G`\>(`amount`, `unlockTime`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deposit `amount` tokens for `userAddress` and lock until `unlockTime`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `amount` | `string` | Amount of tokens to be locked |
| `unlockTime` | `number` | Timestamp for unlock |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeOcean.ts:20](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L20)

___

### totalSupply

▸ **totalSupply**(): `Promise`<`string`\>

Get total supply

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/ve/VeOcean.ts:178](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L178)

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

### withdraw

▸ **withdraw**<`G`\>(`estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Withdraw all tokens for `userAddress`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeOcean.ts:127](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeOcean.ts#L127)
