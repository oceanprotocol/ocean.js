[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Nft

# Class: Nft

## Hierarchy

- [`SmartContract`](SmartContract.md)

  ↳ **`Nft`**

## Table of contents

### Constructors

- [constructor](Nft.md#constructor)

### Properties

- [abi](Nft.md#abi)
- [config](Nft.md#config)
- [signer](Nft.md#signer)

### Methods

- [addDatatokenDeployer](Nft.md#adddatatokendeployer)
- [addManager](Nft.md#addmanager)
- [addMetadataUpdater](Nft.md#addmetadataupdater)
- [addStoreUpdater](Nft.md#addstoreupdater)
- [amountToUnits](Nft.md#amounttounits)
- [cleanPermissions](Nft.md#cleanpermissions)
- [createDatatoken](Nft.md#createdatatoken)
- [getContract](Nft.md#getcontract)
- [getData](Nft.md#getdata)
- [getDefaultAbi](Nft.md#getdefaultabi)
- [getFairGasPrice](Nft.md#getfairgasprice)
- [getMetadata](Nft.md#getmetadata)
- [getNftOwner](Nft.md#getnftowner)
- [getNftPermissions](Nft.md#getnftpermissions)
- [getTokenURI](Nft.md#gettokenuri)
- [isDatatokenDeployer](Nft.md#isdatatokendeployer)
- [removeDatatokenDeployer](Nft.md#removedatatokendeployer)
- [removeManager](Nft.md#removemanager)
- [removeMetadataUpdater](Nft.md#removemetadataupdater)
- [removeStoreUpdater](Nft.md#removestoreupdater)
- [safeTransferNft](Nft.md#safetransfernft)
- [setData](Nft.md#setdata)
- [setMetadata](Nft.md#setmetadata)
- [setMetadataAndTokenURI](Nft.md#setmetadataandtokenuri)
- [setMetadataState](Nft.md#setmetadatastate)
- [setTokenURI](Nft.md#settokenuri)
- [transferNft](Nft.md#transfernft)
- [unitsToAmount](Nft.md#unitstoamount)

## Constructors

### constructor

• **new Nft**(`signer`, `network?`, `config?`, `abi?`)

Instantiate the smart contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object. |
| `network?` | `string` \| `number` | Network id or name |
| `config?` | [`Config`](Config.md) | The configuration object. |
| `abi?` | [`AbiItem`](../interfaces/AbiItem.md)[] | ABI array of the smart contract |

#### Inherited from

[SmartContract](SmartContract.md).[constructor](SmartContract.md#constructor)

#### Defined in

[contracts/SmartContract.ts:25](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L25)

## Properties

### abi

• **abi**: [`AbiItem`](../interfaces/AbiItem.md)[]

#### Inherited from

[SmartContract](SmartContract.md).[abi](SmartContract.md#abi)

#### Defined in

[contracts/SmartContract.ts:14](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L14)

___

### config

• **config**: [`Config`](Config.md)

#### Inherited from

[SmartContract](SmartContract.md).[config](SmartContract.md#config)

#### Defined in

[contracts/SmartContract.ts:13](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L13)

___

### signer

• **signer**: `Signer`

#### Inherited from

[SmartContract](SmartContract.md).[signer](SmartContract.md#signer)

#### Defined in

[contracts/SmartContract.ts:12](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L12)

## Methods

### addDatatokenDeployer

▸ **addDatatokenDeployer**<`G`\>(`nftAddress`, `address`, `datatokenDeployer`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Add DatatokenDeployer permission - only Manager can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | NFT Manager adress |
| `datatokenDeployer` | `string` | User adress which is going to have DatatokenDeployer permission |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:169](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L169)

___

### addManager

▸ **addManager**<`G`\>(`nftAddress`, `address`, `manager`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Add Manager for NFT Contract (only NFT Owner can succeed)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | NFT Owner adress |
| `manager` | `string` | User adress which is going to be assing manager |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:101](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L101)

___

### addMetadataUpdater

▸ **addMetadataUpdater**<`G`\>(`nftAddress`, `address`, `metadataUpdater`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Add Metadata Updater permission - only Manager can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | NFT Manager adress |
| `metadataUpdater` | `string` | User adress which is going to have Metadata Updater permission |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:243](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L243)

___

### addStoreUpdater

▸ **addStoreUpdater**<`G`\>(`nftAddress`, `address`, `storeUpdater`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Add Store Updater permission - only Manager can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | NFT Manager adress |
| `storeUpdater` | `string` | User adress which is going to have Store Updater permission |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:313](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L313)

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

[SmartContract](SmartContract.md).[amountToUnits](SmartContract.md#amounttounits)

#### Defined in

[contracts/SmartContract.ts:43](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/SmartContract.ts#L43)

___

### cleanPermissions

▸ **cleanPermissions**<`G`\>(`nftAddress`, `address`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

This function allows to remove all ROLES at NFT level: Managers, DatatokenDeployer, MetadataUpdater, StoreUpdater
Even NFT Owner has to readd himself as Manager
Permissions at Datatoken level stay.
Only NFT Owner  can call it.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | NFT Owner adress |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:387](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L387)

___

### createDatatoken

▸ **createDatatoken**<`G`\>(`nftAddress`, `address`, `minter`, `paymentCollector`, `mpFeeAddress`, `feeToken`, `feeAmount`, `cap`, `name?`, `symbol?`, `templateIndex?`, `estimateGas?`): `Promise`<`G` extends ``false`` ? `string` : `BigNumber`\>

Create new ERC20 Datatoken - only user with DatatokenDeployer permission can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT address |
| `address` | `string` | User address |
| `minter` | `string` | User set as initial minter for the Datatoken |
| `paymentCollector` | `string` | initial paymentCollector for this DT |
| `mpFeeAddress` | `string` | Consume marketplace fee address |
| `feeToken` | `string` | address of the token marketplace wants to add fee on top |
| `feeAmount` | `string` | amount of feeToken to be transferred to mpFeeAddress on top, will be converted to WEI |
| `cap` | `string` | Maximum cap (Number) - will be converted to wei |
| `name?` | `string` | Token name |
| `symbol?` | `string` | Token symbol |
| `templateIndex?` | `number` | NFT template index |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<`G` extends ``false`` ? `string` : `BigNumber`\>

ERC20 Datatoken address

#### Defined in

[contracts/NFT.ts:34](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L34)

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

### getData

▸ **getData**(`nftAddress`, `key`): `Promise`<`string`\>

Gets stored data at a given `key` in an NFT

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | The address of the NFT. |
| `key` | `string` | The key of the data to get. |

#### Returns

`Promise`<`string`\>

The data stored at the key

#### Defined in

[contracts/NFT.ts:753](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L753)

___

### getDefaultAbi

▸ **getDefaultAbi**(): [`AbiItem`](../interfaces/AbiItem.md)[]

#### Returns

[`AbiItem`](../interfaces/AbiItem.md)[]

#### Overrides

[SmartContract](SmartContract.md).[getDefaultAbi](SmartContract.md#getdefaultabi)

#### Defined in

[contracts/NFT.ts:14](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L14)

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

### getMetadata

▸ **getMetadata**(`nftAddress`): `Promise`<`Object`\>

Returns Metadata details for an NFT

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |

#### Returns

`Promise`<`Object`\>

#### Defined in

[contracts/NFT.ts:687](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L687)

___

### getNftOwner

▸ **getNftOwner**(`nftAddress`): `Promise`<`string`\>

Get NFT Owner

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |

#### Returns

`Promise`<`string`\>

string

#### Defined in

[contracts/NFT.ts:664](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L664)

___

### getNftPermissions

▸ **getNftPermissions**(`nftAddress`, `address`): `Promise`<[`NftRoles`](../interfaces/NftRoles.md)\>

Gets NFT Permissions for a specified user

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | user adress |

#### Returns

`Promise`<[`NftRoles`](../interfaces/NftRoles.md)\>

#### Defined in

[contracts/NFT.ts:676](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L676)

___

### getTokenURI

▸ **getTokenURI**(`nftAddress`, `id`): `Promise`<`string`\>

Gets the token URI of an NFT.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | The address of the NFT. |
| `id` | `number` | The ID of the token. |

#### Returns

`Promise`<`string`\>

#### Defined in

[contracts/NFT.ts:766](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L766)

___

### isDatatokenDeployer

▸ **isDatatokenDeployer**(`nftAddress`, `address`): `Promise`<`boolean`\>

Checks if user has DatatokenDeployer role

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | user adress |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[contracts/NFT.ts:698](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L698)

___

### removeDatatokenDeployer

▸ **removeDatatokenDeployer**<`G`\>(`nftAddress`, `address`, `datatokenDeployer`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Remove DatatokenDeployer permission - only Manager can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | NFT Manager adress |
| `datatokenDeployer` | `string` | Address of the user to be revoked DatatokenDeployer Permission |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:204](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L204)

___

### removeManager

▸ **removeManager**<`G`\>(`nftAddress`, `address`, `manager`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Removes a specific manager for NFT Contract (only NFT Owner can succeed)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | NFT Owner adress |
| `manager` | `string` | User adress which is going to be removed as manager |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:135](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L135)

___

### removeMetadataUpdater

▸ **removeMetadataUpdater**<`G`\>(`nftAddress`, `address`, `metadataUpdater`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Remove Metadata Updater permission - only Manager can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | NFT Manager adress |
| `metadataUpdater` | `string` | Address of the user to be revoked Metadata updater Permission |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:276](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L276)

___

### removeStoreUpdater

▸ **removeStoreUpdater**<`G`\>(`nftAddress`, `address`, `storeUpdater`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Remove Store Updater permission - only Manager can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | NFT Manager adress |
| `storeUpdater` | `string` | Address of the user to be revoked Store Updater Permission |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:347](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L347)

___

### safeTransferNft

▸ **safeTransferNft**<`G`\>(`nftAddress`, `nftOwner`, `nftReceiver`, `tokenId?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

safeTransferNFT Used for transferring the NFT, can be used by an approved relayer
will clean all permissions both on NFT and Datatoken level.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `nftOwner` | `string` | Current NFT Owner adress |
| `nftReceiver` | `string` | User which will receive the NFT, will also be set as Manager |
| `tokenId?` | `number` | The id of the token to be transfered |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:466](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L466)

___

### setData

▸ **setData**<`G`\>(`nftAddress`, `address`, `key`, `value`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Allows users to store data with a preset key (keccak256(ERC20Address)) into NFT 725 Store
only ERC20Deployer can succeed

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | Nft datatoken adress |
| `address` | `string` | User adress |
| `key` | `string` | Key of the data to be stored into 725Y standard |
| `value` | `string` | Data to be stored into 725Y standard |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transactionId

#### Defined in

[contracts/NFT.ts:717](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L717)

___

### setMetadata

▸ **setMetadata**<`G`\>(`nftAddress`, `address`, `metadataState`, `metadataDecryptorUrl`, `metadataDecryptorAddress`, `flags`, `data`, `metadataHash`, `metadataProofs?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Creates or update Metadata cached by Aquarius. Also, updates the METADATA_DECRYPTOR key

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | Caller address NFT Owner adress |
| `metadataState` | `number` |  |
| `metadataDecryptorUrl` | `string` |  |
| `metadataDecryptorAddress` | `string` |  |
| `flags` | `string` |  |
| `data` | `string` |  |
| `metadataHash` | `string` |  |
| `metadataProofs?` | [`MetadataProof`](../interfaces/MetadataProof.md)[] |  |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:515](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L515)

___

### setMetadataAndTokenURI

▸ **setMetadataAndTokenURI**<`G`\>(`nftAddress`, `metadataUpdater`, `metadataAndTokenURI`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Helper function to improve UX sets both MetaData & TokenURI in one tx

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `metadataUpdater` | `string` | - |
| `metadataAndTokenURI` | [`MetadataAndTokenURI`](../interfaces/MetadataAndTokenURI.md) | metaDataAndTokenURI object |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:568](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L568)

___

### setMetadataState

▸ **setMetadataState**<`G`\>(`nftAddress`, `address`, `metadataState`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

setMetadataState Used for updating the metadata State

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | Caller address => metadata updater |
| `metadataState` | `number` | new metadata state |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:606](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L606)

___

### setTokenURI

▸ **setTokenURI**<`G`\>(`nftAddress`, `data`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

set TokenURI on an nft

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `data` | `string` | input data for TokenURI |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/NFT.ts:638](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L638)

___

### transferNft

▸ **transferNft**<`G`\>(`nftAddress`, `nftOwner`, `nftReceiver`, `tokenId?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

Transfers the NFT
will clean all permissions both on NFT and Datatoken level.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `nftOwner` | `string` | Current NFT Owner adress |
| `nftReceiver` | `string` | User which will receive the NFT, will also be set as Manager |
| `tokenId?` | `number` | The id of the token to be transfered |
| `estimateGas?` | `G` | if True, return gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:421](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/contracts/NFT.ts#L421)

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
