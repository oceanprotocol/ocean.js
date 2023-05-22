[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / VeAllocate

# Class: VeAllocate

Provides an interface for veOcean contract

## Hierarchy

- [`SmartContractWithAddress`](SmartContractWithAddress.md)

  ↳ **`VeAllocate`**

## Table of contents

### Constructors

- [constructor](VeAllocate.md#constructor)

### Properties

- [abi](VeAllocate.md#abi)
- [address](VeAllocate.md#address)
- [config](VeAllocate.md#config)
- [contract](VeAllocate.md#contract)
- [signer](VeAllocate.md#signer)

### Methods

- [amountToUnits](VeAllocate.md#amounttounits)
- [getContract](VeAllocate.md#getcontract)
- [getDefaultAbi](VeAllocate.md#getdefaultabi)
- [getFairGasPrice](VeAllocate.md#getfairgasprice)
- [getTotalAllocation](VeAllocate.md#gettotalallocation)
- [getVeAllocation](VeAllocate.md#getveallocation)
- [setAllocation](VeAllocate.md#setallocation)
- [setBatchAllocation](VeAllocate.md#setbatchallocation)
- [unitsToAmount](VeAllocate.md#unitstoamount)

## Constructors

### constructor

• **new VeAllocate**(`address`, `signer`, `network?`, `config?`, `abi?`)

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

[contracts/ve/VeAllocate.ts:9](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeAllocate.ts#L9)

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

### getTotalAllocation

▸ **getTotalAllocation**(`userAddress`): `Promise`<`number`\>

Get totalAllocation for address

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address |

#### Returns

`Promise`<`number`\>

#### Defined in

[contracts/ve/VeAllocate.ts:81](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeAllocate.ts#L81)

___

### getVeAllocation

▸ **getVeAllocation**(`userAddress`, `nft`, `chainId`): `Promise`<`number`\>

Get getveAllocation for address, nft, chainId

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address |
| `nft` | `string` | NFT address to allocate to |
| `chainId` | `string` | chainId of NFT |

#### Returns

`Promise`<`number`\>

#### Defined in

[contracts/ve/VeAllocate.ts:92](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeAllocate.ts#L92)

___

### setAllocation

▸ **setAllocation**<`G`\>(`amount`, `nft`, `chainId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

set a specific percentage of veOcean to a specific nft
Maximum allocated percentage is 10000, so 1% is specified as 100

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `amount` | `string` | Percentage used |
| `nft` | `string` | NFT address to allocate to |
| `chainId` | `number` | chainId of NFT |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeAllocate.ts:21](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeAllocate.ts#L21)

___

### setBatchAllocation

▸ **setBatchAllocation**<`G`\>(`amount`, `nft`, `chainId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

set specific percetage of veOcean to multiple nfts
Maximum allocated percentage is 10000, so 1% is specified as 100

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `amount` | `string`[] | Array of percentages used |
| `nft` | `string`[] | Array of NFT addresses |
| `chainId` | `number`[] | Array of chainIds |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeAllocate.ts:51](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/ve/VeAllocate.ts#L51)

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
