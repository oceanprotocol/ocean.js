[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Router

# Class: Router

Provides an interface for FactoryRouter contract

## Hierarchy

- [`SmartContractWithAddress`](SmartContractWithAddress.md)

  ↳ **`Router`**

## Table of contents

### Constructors

- [constructor](Router.md#constructor)

### Properties

- [abi](Router.md#abi)
- [address](Router.md#address)
- [config](Router.md#config)
- [contract](Router.md#contract)
- [web3](Router.md#web3)

### Methods

- [addApprovedToken](Router.md#addapprovedtoken)
- [addDispenserContract](Router.md#adddispensercontract)
- [addFixedRateContract](Router.md#addfixedratecontract)
- [amountToUnits](Router.md#amounttounits)
- [buyDatatokenBatch](Router.md#buydatatokenbatch)
- [getContract](Router.md#getcontract)
- [getCurrentOPCFee](Router.md#getcurrentopcfee)
- [getDefaultAbi](Router.md#getdefaultabi)
- [getFairGasPrice](Router.md#getfairgasprice)
- [getNFTFactory](Router.md#getnftfactory)
- [getOPCFee](Router.md#getopcfee)
- [getOwner](Router.md#getowner)
- [isApprovedToken](Router.md#isapprovedtoken)
- [isFixedPrice](Router.md#isfixedprice)
- [removeApprovedToken](Router.md#removeapprovedtoken)
- [removeDispenserContract](Router.md#removedispensercontract)
- [removeFixedRateContract](Router.md#removefixedratecontract)
- [unitsToAmount](Router.md#unitstoamount)
- [updateOPCFee](Router.md#updateopcfee)

## Constructors

### constructor

• **new Router**(`address`, `web3`, `network?`, `config?`, `abi?`)

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

### addApprovedToken

▸ **addApprovedToken**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Adds a token to the list of tokens with reduced fees

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | caller address |
| `tokenAddress` | `string` | token address to add |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:79](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L79)

___

### addDispenserContract

▸ **addDispenserContract**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Adds an address to the list of dispensers

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `tokenAddress` | `string` | contract address to add |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:214](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L214)

___

### addFixedRateContract

▸ **addFixedRateContract**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Adds an address to the list of fixed rate contracts

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `tokenAddress` | `string` | contract address to add |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:146](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L146)

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

### buyDatatokenBatch

▸ **buyDatatokenBatch**<`G`\>(`address`, `operations`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

buyDatatokenBatch

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `operations` | [`Operation`](../interfaces/Operation.md)[] | Operations objects array |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Transaction receipt

#### Defined in

[contracts/Router.ts:21](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L21)

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

### getCurrentOPCFee

▸ **getCurrentOPCFee**(): `Promise`<`number`\>

Get Current OPF Fee

#### Returns

`Promise`<`number`\>

OPF fee

#### Defined in

[contracts/Router.ts:284](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L284)

___

### getDefaultAbi

▸ **getDefaultAbi**(): `AbiItem` \| `AbiItem`[]

#### Returns

`AbiItem` \| `AbiItem`[]

#### Overrides

[SmartContractWithAddress](SmartContractWithAddress.md).[getDefaultAbi](SmartContractWithAddress.md#getdefaultabi)

#### Defined in

[contracts/Router.ts:11](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L11)

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

### getNFTFactory

▸ **getNFTFactory**(): `Promise`<`string`\>

Get NFT Factory address

#### Returns

`Promise`<`string`\>

NFT Factory address

#### Defined in

[contracts/Router.ts:69](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L69)

___

### getOPCFee

▸ **getOPCFee**(`baseToken`): `Promise`<`number`\>

Get OPF Fee per token

#### Parameters

| Name | Type |
| :------ | :------ |
| `baseToken` | `string` |

#### Returns

`Promise`<`number`\>

OPC fee for a specific baseToken

#### Defined in

[contracts/Router.ts:277](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L277)

___

### getOwner

▸ **getOwner**(): `Promise`<`string`\>

Get Router Owner

#### Returns

`Promise`<`string`\>

Router Owner address

#### Defined in

[contracts/Router.ts:62](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L62)

___

### isApprovedToken

▸ **isApprovedToken**(`address`): `Promise`<`boolean`\>

Check if a token is on approved tokens list, if true opfFee is lower in pools with that token/DT

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |

#### Returns

`Promise`<`boolean`\>

true if is on the list.

#### Defined in

[contracts/Router.ts:48](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L48)

___

### isFixedPrice

▸ **isFixedPrice**(`address`): `Promise`<`boolean`\>

Check if an address is a Fixed Rate contract.

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |

#### Returns

`Promise`<`boolean`\>

true if is a Fixed Rate contract

#### Defined in

[contracts/Router.ts:55](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L55)

___

### removeApprovedToken

▸ **removeApprovedToken**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Removes a token if exists from the list of tokens with reduced fees

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `tokenAddress` | `string` | address to remove |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:113](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L113)

___

### removeDispenserContract

▸ **removeDispenserContract**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Removes an address from the list of dispensers

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `tokenAddress` | `string` | address Contract to be removed |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:247](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L247)

___

### removeFixedRateContract

▸ **removeFixedRateContract**<`G`\>(`address`, `tokenAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Removes an address from the list of fixed rate contracts

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `tokenAddress` | `string` | contract address to add |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:180](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L180)

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

### updateOPCFee

▸ **updateOPCFee**<`G`\>(`address`, `newSwapOceanFee`, `newSwapNonOceanFee`, `newConsumeFee`, `newProviderFee`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Updates OP Community Fees

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `newSwapOceanFee` | `number` | Amount charged for swapping with ocean approved tokens |
| `newSwapNonOceanFee` | `number` | Amount charged for swapping with non ocean approved tokens |
| `newConsumeFee` | `number` | Amount charged from consumeFees |
| `newProviderFee` | `number` | Amount charged for providerFees |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/Router.ts:297](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/Router.ts#L297)
