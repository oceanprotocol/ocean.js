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
- [web3](VeOcean.md#web3)

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

• **new VeOcean**(`address`, `web3`, `network?`, `config?`, `abi?`)

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

### depositFor

▸ **depositFor**<`G`\>(`fromUserAddress`, `toAddress`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deposit `amount` tokens for `toAddress` and add to the existing lock
Anyone (even a smart contract) can deposit for someone else, but cannot extend their locktime and deposit for a brand new user

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `fromUserAddress` | `string` | user address that sends the tx |
| `toAddress` | `string` | user address to deposit for |
| `amount` | `string` | Amount of tokens to be locked |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeOcean.ts:57](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L57)

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

[contracts/ve/VeOcean.ts:10](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L10)

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

[contracts/ve/VeOcean.ts:185](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L185)

___

### getToken

▸ **getToken**(): `Promise`<`string`\>

Get token

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/ve/VeOcean.ts:218](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L218)

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

[contracts/ve/VeOcean.ts:176](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L176)

___

### increaseAmount

▸ **increaseAmount**<`G`\>(`userAddress`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deposit `amount` additional tokens for `userAddress` without modifying the unlock time

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address that sends the tx |
| `amount` | `string` | Amount of tokens to be locked |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeOcean.ts:91](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L91)

___

### increaseUnlockTime

▸ **increaseUnlockTime**<`G`\>(`userAddress`, `unlockTime`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Extend the unlock time for `userAddress` to `unlockTime`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address that sends the tx |
| `unlockTime` | `number` | Timestamp for new unlock time |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeOcean.ts:122](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L122)

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

[contracts/ve/VeOcean.ts:199](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L199)

___

### lockTokens

▸ **lockTokens**<`G`\>(`userAddress`, `amount`, `unlockTime`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Deposit `amount` tokens for `userAddress` and lock until `unlockTime`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address |
| `amount` | `string` | Amount of tokens to be locked |
| `unlockTime` | `number` | Timestamp for unlock |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeOcean.ts:21](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L21)

___

### totalSupply

▸ **totalSupply**(): `Promise`<`string`\>

Get total supply

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/ve/VeOcean.ts:207](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L207)

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

___

### withdraw

▸ **withdraw**<`G`\>(`userAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Withdraw all tokens for `userAddress`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address that sends the tx |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeOcean.ts:151](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeOcean.ts#L151)
