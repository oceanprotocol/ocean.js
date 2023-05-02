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
- [signer](NftFactory.md#signer)

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

• **new NftFactory**(`address`, `signer`, `network?`, `config?`, `abi?`)

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
| `address` | `string` | caller address |
| `templateAddress` | `string` | template address to add |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/NFTFactory.ts:181](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L181)

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
| `address` | `string` | caller address |
| `templateAddress` | `string` | template address to add |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/NFTFactory.ts:288](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L288)

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

### checkDatatoken

▸ **checkDatatoken**(`datatoken`): `Promise`<`Boolean`\>

Check if Datatoken is deployed from the factory

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `datatoken` | `string` | Datatoken address to check |

#### Returns

`Promise`<`Boolean`\>

return true if deployed from this factory

#### Defined in

[contracts/NFTFactory.ts:159](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L159)

___

### checkNFT

▸ **checkNFT**(`nftAddress`): `Promise`<`String`\>

Check if  NFT is deployed from the factory

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | nftAddress address to check |

#### Returns

`Promise`<`String`\>

return address(0) if it's not, or the nftAddress if true

#### Defined in

[contracts/NFTFactory.ts:169](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L169)

___

### createNFT

▸ **createNFT**<`G`\>(`nftData`, `estimateGas?`): `Promise`<`G` extends ``false`` ? `string` : `BigNumber`\>

Create new data NFT

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftData` | [`NftCreateData`](../interfaces/NftCreateData.md) | The data needed to create an NFT. |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<`G` extends ``false`` ? `string` : `BigNumber`\>

The transaction hash or the gas estimate.

#### Defined in

[contracts/NFTFactory.ts:30](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L30)

___

### createNftWithDatatoken

▸ **createNftWithDatatoken**<`G`\>(`nftCreateData`, `dtParams`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Creates a new NFT, then a datatoken,all in one call

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftCreateData` | [`NftCreateData`](../interfaces/NftCreateData.md) | The data required to create an NFT. |
| `dtParams` | [`DatatokenCreateParams`](../interfaces/DatatokenCreateParams.md) | The parameters required to create a datatoken. |
| `estimateGas?` | `G` | Whether to return only estimate gas or not. |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/NFTFactory.ts:434](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L434)

___

### createNftWithDatatokenWithDispenser

▸ **createNftWithDatatokenWithDispenser**<`G`\>(`nftCreateData`, `dtParams`, `dispenserParams`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Creates an NFT with a datatoken with a dispenser in one call.
Be aware if Fixed Rate creation fails, you are still going to pay a lot of gas

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftCreateData` | [`NftCreateData`](../interfaces/NftCreateData.md) | The data required to create an NFT. |
| `dtParams` | [`DatatokenCreateParams`](../interfaces/DatatokenCreateParams.md) | The parameters required to create a datatoken. |
| `dispenserParams` | [`DispenserCreationParams`](../interfaces/DispenserCreationParams.md) | The parameters required to create a dispenser contract. |
| `estimateGas?` | `G` | Whether to estimate gas or not. |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/NFTFactory.ts:505](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L505)

___

### createNftWithDatatokenWithFixedRate

▸ **createNftWithDatatokenWithFixedRate**<`G`\>(`nftCreateData`, `dtParams`, `freParams`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Creates an NFT with a datatoken with a fixed rate  all in one call.
be aware if Fixed Rate creation fails, you are still going to pay a lot of gas

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftCreateData` | [`NftCreateData`](../interfaces/NftCreateData.md) | The data required to create an NFT. |
| `dtParams` | [`DatatokenCreateParams`](../interfaces/DatatokenCreateParams.md) | The parameters required to create a datatoken. |
| `freParams` | [`FreCreationParams`](../interfaces/FreCreationParams.md) | The parameters required to create a fixed-rate exchange contract. |
| `estimateGas?` | `G` | Whether to return only estimate gas or not. |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[contracts/NFTFactory.ts:467](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L467)

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
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

current token template count

#### Defined in

[contracts/NFTFactory.ts:213](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L213)

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
| `address` | `string` | caller address |
| `templateIndex` | `number` | index of the template we want to disable |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

current token template count

#### Defined in

[contracts/NFTFactory.ts:321](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L321)

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

### getCurrentNFTCount

▸ **getCurrentNFTCount**(): `Promise`<`number`\>

Get Current NFT Count (NFT created)

#### Returns

`Promise`<`number`\>

Number of NFT created from this factory

#### Defined in

[contracts/NFTFactory.ts:86](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L86)

___

### getCurrentNFTTemplateCount

▸ **getCurrentNFTTemplateCount**(): `Promise`<`number`\>

Get Current NFT Template Count

#### Returns

`Promise`<`number`\>

Number of NFT Template added to this factory

#### Defined in

[contracts/NFTFactory.ts:113](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L113)

___

### getCurrentTokenCount

▸ **getCurrentTokenCount**(): `Promise`<`number`\>

Get Current Datatoken Count

#### Returns

`Promise`<`number`\>

Number of DTs created from this factory

#### Defined in

[contracts/NFTFactory.ts:95](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L95)

___

### getCurrentTokenTemplateCount

▸ **getCurrentTokenTemplateCount**(): `Promise`<`number`\>

Get Current Template  Datatoken (ERC20) Count

#### Returns

`Promise`<`number`\>

Number of Datatoken Template added to this factory

#### Defined in

[contracts/NFTFactory.ts:122](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L122)

___

### getDefaultAbi

▸ **getDefaultAbi**(): [`AbiItem`](../interfaces/AbiItem.md)[]

#### Returns

[`AbiItem`](../interfaces/AbiItem.md)[]

#### Overrides

[SmartContractWithAddress](SmartContractWithAddress.md).[getDefaultAbi](SmartContractWithAddress.md#getdefaultabi)

#### Defined in

[contracts/NFTFactory.ts:20](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L20)

___

### getErcCreationParams

▸ `Private` **getErcCreationParams**(`dtParams`): `Promise`<`any`\>

Gets the parameters required to create an ERC20 token.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtParams` | [`DatatokenCreateParams`](../interfaces/DatatokenCreateParams.md) | The parameters required to create a datatoken. |

#### Returns

`Promise`<`any`\>

#### Defined in

[contracts/NFTFactory.ts:550](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L550)

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

### getFreCreationParams

▸ `Private` **getFreCreationParams**(`freParams`): `Promise`<`any`\>

Gets the parameters required to create a fixed-rate exchange contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `freParams` | [`FreCreationParams`](../interfaces/FreCreationParams.md) | The parameters required to create a fixed-rate exchange contract. |

#### Returns

`Promise`<`any`\>

#### Defined in

[contracts/NFTFactory.ts:578](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L578)

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

[contracts/NFTFactory.ts:132](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L132)

___

### getOwner

▸ **getOwner**(): `Promise`<`string`\>

Get Factory Owner

#### Returns

`Promise`<`string`\>

Factory Owner address

#### Defined in

[contracts/NFTFactory.ts:104](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L104)

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

[contracts/NFTFactory.ts:149](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L149)

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
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

current token template count

#### Defined in

[contracts/NFTFactory.ts:249](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L249)

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
| `address` | `string` | caller address |
| `templateIndex` | `number` | index of the template we want to reactivate |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

current token template count

#### Defined in

[contracts/NFTFactory.ts:360](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L360)

___

### startMultipleTokenOrder

▸ **startMultipleTokenOrder**<`G`\>(`orders`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

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
| `orders` | [`TokenOrder`](../interfaces/TokenOrder.md)[] | array of of orders |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/NFTFactory.ts:404](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFTFactory.ts#L404)

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
