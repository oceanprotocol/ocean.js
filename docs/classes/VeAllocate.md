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
- [web3](VeAllocate.md#web3)

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

• **new VeAllocate**(`address`, `web3`, `network?`, `config?`, `abi?`)

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

[contracts/ve/VeAllocate.ts:10](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeAllocate.ts#L10)

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

[contracts/ve/VeAllocate.ts:96](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeAllocate.ts#L96)

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

[contracts/ve/VeAllocate.ts:107](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeAllocate.ts#L107)

___

### setAllocation

▸ **setAllocation**<`G`\>(`userAddress`, `amount`, `nft`, `chainId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

set a specific percentage of veOcean to a specific nft
Maximum allocated percentage is 10000, so 1% is specified as 100

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address |
| `amount` | `string` | Percentage used |
| `nft` | `string` | NFT address to allocate to |
| `chainId` | `number` | chainId of NFT |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeAllocate.ts:23](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeAllocate.ts#L23)

___

### setBatchAllocation

▸ **setBatchAllocation**<`G`\>(`userAddress`, `amount`, `nft`, `chainId`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

set specific percetage of veOcean to multiple nfts
Maximum allocated percentage is 10000, so 1% is specified as 100

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | user address |
| `amount` | `string`[] | Array of percentages used |
| `nft` | `string`[] | Array of NFT addresses |
| `chainId` | `number`[] | Array of chainIds |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/ve/VeAllocate.ts:62](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/ve/VeAllocate.ts#L62)

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
