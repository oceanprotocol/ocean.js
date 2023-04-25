[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / NftFactory

# Class: NftFactory

Provides an interface for NFT Factory contract

## Hierarchy

- [`SmartContractWithAddress`](SmartContractWithAddress.md)

  ↳ **`NftFactory`**

## Table of contents

### Constructors

- [constructor](NftFactory.md#constructor)

### Properties

- [abi](NftFactory.md#abi)
- [address](NftFactory.md#address)
- [config](NftFactory.md#config)
- [contract](NftFactory.md#contract)
- [web3](NftFactory.md#web3)

### Methods

- [addNFTTemplate](NftFactory.md#addnfttemplate)
- [addTokenTemplate](NftFactory.md#addtokentemplate)
- [amountToUnits](NftFactory.md#amounttounits)
- [checkDatatoken](NftFactory.md#checkdatatoken)
- [checkNFT](NftFactory.md#checknft)
- [createNFT](NftFactory.md#createnft)
- [createNftWithDatatoken](NftFactory.md#createnftwithdatatoken)
- [createNftWithDatatokenWithDispenser](NftFactory.md#createnftwithdatatokenwithdispenser)
- [createNftWithDatatokenWithFixedRate](NftFactory.md#createnftwithdatatokenwithfixedrate)
- [disableNFTTemplate](NftFactory.md#disablenfttemplate)
- [disableTokenTemplate](NftFactory.md#disabletokentemplate)
- [getContract](NftFactory.md#getcontract)
- [getCurrentNFTCount](NftFactory.md#getcurrentnftcount)
- [getCurrentNFTTemplateCount](NftFactory.md#getcurrentnfttemplatecount)
- [getCurrentTokenCount](NftFactory.md#getcurrenttokencount)
- [getCurrentTokenTemplateCount](NftFactory.md#getcurrenttokentemplatecount)
- [getDefaultAbi](NftFactory.md#getdefaultabi)
- [getErcCreationParams](NftFactory.md#geterccreationparams)
- [getFairGasPrice](NftFactory.md#getfairgasprice)
- [getFreCreationParams](NftFactory.md#getfrecreationparams)
- [getNFTTemplate](NftFactory.md#getnfttemplate)
- [getOwner](NftFactory.md#getowner)
- [getTokenTemplate](NftFactory.md#gettokentemplate)
- [reactivateNFTTemplate](NftFactory.md#reactivatenfttemplate)
- [reactivateTokenTemplate](NftFactory.md#reactivatetokentemplate)
- [startMultipleTokenOrder](NftFactory.md#startmultipletokenorder)
- [unitsToAmount](NftFactory.md#unitstoamount)

## Constructors

### constructor

• **new NftFactory**(`address`, `web3`, `network?`, `config?`, `abi?`)

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

### addNFTTemplate

▸ **addNFTTemplate**<`G`\>(`address`, `templateAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Add a new NFT token template - only factory Owner

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `templateAddress` | `string` | template address to add |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/NFTFactory.ts:174](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L174)

___

### addTokenTemplate

▸ **addTokenTemplate**<`G`\>(`address`, `templateAddress`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Add a new NFT token template - only factory Owner

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `templateAddress` | `string` | template address to add |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/NFTFactory.ts:291](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L291)

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

### checkDatatoken

▸ **checkDatatoken**(`datatoken`): `Promise`<`Boolean`\>

Check if Datatoken is deployed from the factory

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `datatoken` | `string` | Datatoken address we want to check |

#### Returns

`Promise`<`Boolean`\>

return true if deployed from this factory

#### Defined in

[contracts/NFTFactory.ts:154](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L154)

___

### checkNFT

▸ **checkNFT**(`nftAddress`): `Promise`<`String`\>

Check if  NFT is deployed from the factory

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | nftAddress address we want to check |

#### Returns

`Promise`<`String`\>

return address(0) if it's not, or the nftAddress if true

#### Defined in

[contracts/NFTFactory.ts:163](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L163)

___

### createNFT

▸ **createNFT**<`G`\>(`address`, `nftData`, `estimateGas?`): `Promise`<`G` extends ``false`` ? `string` : `number`\>

Create new NFT

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `nftData` | [`NftCreateData`](../interfaces/NftCreateData.md) |
| `estimateGas?` | `G` |

#### Returns

`Promise`<`G` extends ``false`` ? `string` : `number`\>

NFT datatoken address

#### Defined in

[contracts/NFTFactory.ts:30](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L30)

___

### createNftWithDatatoken

▸ **createNftWithDatatoken**<`G`\>(`address`, `nftCreateData`, `dtParams`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

**`Dev`**

createNftWithDatatoken
     Creates a new NFT, then a Datatoken,all in one call

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | Caller address |
| `nftCreateData` | [`NftCreateData`](../interfaces/NftCreateData.md) | - |
| `dtParams` | [`DatatokenCreateParams`](../interfaces/DatatokenCreateParams.md) | - |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/NFTFactory.ts:458](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L458)

___

### createNftWithDatatokenWithDispenser

▸ **createNftWithDatatokenWithDispenser**<`G`\>(`address`, `nftCreateData`, `dtParams`, `dispenserParams`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

**`Dev`**

createNftWithDatatokenWithDispenser
     Creates a new NFT, then a Datatoken, then a Dispenser, all in one call
     Use this carefully, because if Dispenser creation fails, you are still going to pay a lot of gas

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | Caller address |
| `nftCreateData` | [`NftCreateData`](../interfaces/NftCreateData.md) | input data for NFT Creation |
| `dtParams` | [`DatatokenCreateParams`](../interfaces/DatatokenCreateParams.md) | input data for Datatoken Creation |
| `dispenserParams` | [`DispenserCreationParams`](../interfaces/DispenserCreationParams.md) | input data for Dispenser Creation |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/NFTFactory.ts:540](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L540)

___

### createNftWithDatatokenWithFixedRate

▸ **createNftWithDatatokenWithFixedRate**<`G`\>(`address`, `nftCreateData`, `dtParams`, `freParams`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

**`Dev`**

createNftWithDatatokenWithFixedRate
     Creates a new NFT, then a Datatoken, then a FixedRateExchange, all in one call
     Use this carefully, because if Fixed Rate creation fails, you are still going to pay a lot of gas

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | Caller address |
| `nftCreateData` | [`NftCreateData`](../interfaces/NftCreateData.md) | input data for NFT Creation |
| `dtParams` | [`DatatokenCreateParams`](../interfaces/DatatokenCreateParams.md) | input data for Datatoken Creation |
| `freParams` | [`FreCreationParams`](../interfaces/FreCreationParams.md) | input data for FixedRate Creation |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/NFTFactory.ts:497](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L497)

___

### disableNFTTemplate

▸ **disableNFTTemplate**<`G`\>(`address`, `templateIndex`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Disable token template - only factory Owner

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `templateIndex` | `number` | index of the template we want to disable |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

current token template count

#### Defined in

[contracts/NFTFactory.ts:210](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L210)

___

### disableTokenTemplate

▸ **disableTokenTemplate**<`G`\>(`address`, `templateIndex`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Disable token template - only factory Owner

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `templateIndex` | `number` | index of the template we want to disable |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

current token template count

#### Defined in

[contracts/NFTFactory.ts:328](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L328)

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

### getCurrentNFTCount

▸ **getCurrentNFTCount**(): `Promise`<`number`\>

Get Current NFT Count (NFT created)

#### Returns

`Promise`<`number`\>

Number of NFT created from this factory

#### Defined in

[contracts/NFTFactory.ts:88](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L88)

___

### getCurrentNFTTemplateCount

▸ **getCurrentNFTTemplateCount**(): `Promise`<`number`\>

Get Current NFT Template Count

#### Returns

`Promise`<`number`\>

Number of NFT Template added to this factory

#### Defined in

[contracts/NFTFactory.ts:112](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L112)

___

### getCurrentTokenCount

▸ **getCurrentTokenCount**(): `Promise`<`number`\>

Get Current Datatoken Count

#### Returns

`Promise`<`number`\>

Number of DTs created from this factory

#### Defined in

[contracts/NFTFactory.ts:96](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L96)

___

### getCurrentTokenTemplateCount

▸ **getCurrentTokenTemplateCount**(): `Promise`<`number`\>

Get Current Template  Datatoken (ERC20) Count

#### Returns

`Promise`<`number`\>

Number of Datatoken Template added to this factory

#### Defined in

[contracts/NFTFactory.ts:120](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L120)

___

### getDefaultAbi

▸ **getDefaultAbi**(): `AbiItem` \| `AbiItem`[]

#### Returns

`AbiItem` \| `AbiItem`[]

#### Overrides

[SmartContractWithAddress](SmartContractWithAddress.md).[getDefaultAbi](SmartContractWithAddress.md#getdefaultabi)

#### Defined in

[contracts/NFTFactory.ts:20](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L20)

___

### getErcCreationParams

▸ `Private` **getErcCreationParams**(`dtParams`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `dtParams` | [`DatatokenCreateParams`](../interfaces/DatatokenCreateParams.md) |

#### Returns

`any`

#### Defined in

[contracts/NFTFactory.ts:575](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L575)

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

### getFreCreationParams

▸ `Private` **getFreCreationParams**(`freParams`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `freParams` | [`FreCreationParams`](../interfaces/FreCreationParams.md) |

#### Returns

`any`

#### Defined in

[contracts/NFTFactory.ts:595](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L595)

___

### getNFTTemplate

▸ **getNFTTemplate**(`index`): `Promise`<[`Template`](../interfaces/Template.md)\>

Get NFT Template

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `index` | `number` | Template index |

#### Returns

`Promise`<[`Template`](../interfaces/Template.md)\>

Number of Template added to this factory

#### Defined in

[contracts/NFTFactory.ts:129](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L129)

___

### getOwner

▸ **getOwner**(): `Promise`<`string`\>

Get Factory Owner

#### Returns

`Promise`<`string`\>

Factory Owner address

#### Defined in

[contracts/NFTFactory.ts:104](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L104)

___

### getTokenTemplate

▸ **getTokenTemplate**(`index`): `Promise`<[`Template`](../interfaces/Template.md)\>

Get Datatoken (ERC20) Template

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `index` | `number` | Template index |

#### Returns

`Promise`<[`Template`](../interfaces/Template.md)\>

DT Template info

#### Defined in

[contracts/NFTFactory.ts:145](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L145)

___

### reactivateNFTTemplate

▸ **reactivateNFTTemplate**<`G`\>(`address`, `templateIndex`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Reactivate a previously disabled token template - only factory Owner

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `templateIndex` | `number` | index of the template we want to reactivate |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

current token template count

#### Defined in

[contracts/NFTFactory.ts:250](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L250)

___

### reactivateTokenTemplate

▸ **reactivateTokenTemplate**<`G`\>(`address`, `templateIndex`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Reactivate a previously disabled token template - only factory Owner

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` |  |
| `templateIndex` | `number` | index of the template we want to reactivate |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

current token template count

#### Defined in

[contracts/NFTFactory.ts:371](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L371)

___

### startMultipleTokenOrder

▸ **startMultipleTokenOrder**<`G`\>(`address`, `orders`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

**`Dev`**

startMultipleTokenOrder
     Used as a proxy to order multiple services
     Users can have inifinite approvals for fees for factory instead of having one approval/ Datatoken contract
     Requires previous approval of all :
         - consumeFeeTokens
         - publishMarketFeeTokens
         - ERC20 Datatokens

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | Caller address |
| `orders` | [`TokenOrder`](../interfaces/TokenOrder.md)[] | an array of struct tokenOrder |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/NFTFactory.ts:421](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFTFactory.ts#L421)

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
