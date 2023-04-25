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
- [web3](Nft.md#web3)

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

• **new Nft**(`web3`, `network?`, `config?`, `abi?`)

Instantiate the smart contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `web3` | `default` |  |
| `network?` | `string` \| `number` | Network id or name |
| `config?` | [`Config`](Config.md) | Configutation of the smart contract |
| `abi?` | `AbiItem` \| `AbiItem`[] | ABI of the smart contract |

#### Inherited from

[SmartContract](SmartContract.md).[constructor](SmartContract.md#constructor)

#### Defined in

[contracts/SmartContract.ts:26](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L26)

## Properties

### abi

• **abi**: `AbiItem` \| `AbiItem`[]

#### Inherited from

[SmartContract](SmartContract.md).[abi](SmartContract.md#abi)

#### Defined in

[contracts/SmartContract.ts:15](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L15)

___

### config

• **config**: [`Config`](Config.md)

#### Inherited from

[SmartContract](SmartContract.md).[config](SmartContract.md#config)

#### Defined in

[contracts/SmartContract.ts:14](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L14)

___

### web3

• **web3**: `default`

#### Inherited from

[SmartContract](SmartContract.md).[web3](SmartContract.md#web3)

#### Defined in

[contracts/SmartContract.ts:13](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L13)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:170](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L170)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:94](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L94)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:250](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L250)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:328](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L328)

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

[SmartContract](SmartContract.md).[amountToUnits](SmartContract.md#amounttounits)

#### Defined in

[contracts/SmartContract.ts:37](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L37)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:410](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L410)

___

### createDatatoken

▸ **createDatatoken**<`G`\>(`nftAddress`, `address`, `minter`, `paymentCollector`, `mpFeeAddress`, `feeToken`, `feeAmount`, `cap`, `name?`, `symbol?`, `templateIndex?`, `estimateGas?`): `Promise`<`G` extends ``false`` ? `string` : `number`\>

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<`G` extends ``false`` ? `string` : `number`\>

ERC20 Datatoken address

#### Defined in

[contracts/NFT.ts:33](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L33)

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

[SmartContract](SmartContract.md).[getContract](SmartContract.md#getcontract)

#### Defined in

[contracts/SmartContract.ts:57](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L57)

___

### getData

▸ **getData**(`nftAddress`, `key`): `Promise`<`string`\>

Gets data at a given `key`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `key` | `string` | the key which value to retrieve |

#### Returns

`Promise`<`string`\>

The data stored at the key

#### Defined in

[contracts/NFT.ts:796](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L796)

___

### getDefaultAbi

▸ **getDefaultAbi**(): `AbiItem` \| `AbiItem`[]

#### Returns

`AbiItem` \| `AbiItem`[]

#### Overrides

[SmartContract](SmartContract.md).[getDefaultAbi](SmartContract.md#getdefaultabi)

#### Defined in

[contracts/NFT.ts:14](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L14)

___

### getFairGasPrice

▸ `Protected` **getFairGasPrice**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Inherited from

[SmartContract](SmartContract.md).[getFairGasPrice](SmartContract.md#getfairgasprice)

#### Defined in

[contracts/SmartContract.ts:53](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L53)

___

### getMetadata

▸ **getMetadata**(`nftAddress`): `Promise`<`Object`\>

Get users Metadata, return Metadata details

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |

#### Returns

`Promise`<`Object`\>

#### Defined in

[contracts/NFT.ts:728](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L728)

___

### getNftOwner

▸ **getNftOwner**(`nftAddress`): `Promise`<`string`\>

Get Owner

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |

#### Returns

`Promise`<`string`\>

string

#### Defined in

[contracts/NFT.ts:707](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L707)

___

### getNftPermissions

▸ **getNftPermissions**(`nftAddress`, `address`): `Promise`<[`NftRoles`](../interfaces/NftRoles.md)\>

Get users NFT Permissions

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | user adress |

#### Returns

`Promise`<[`NftRoles`](../interfaces/NftRoles.md)\>

#### Defined in

[contracts/NFT.ts:718](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L718)

___

### getTokenURI

▸ **getTokenURI**(`nftAddress`, `id`): `Promise`<`string`\>

Gets data at a given `key`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `id` | `number` |  |

#### Returns

`Promise`<`string`\>

The data stored at the key

#### Defined in

[contracts/NFT.ts:808](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L808)

___

### isDatatokenDeployer

▸ **isDatatokenDeployer**(`nftAddress`, `address`): `Promise`<`boolean`\>

Get users DatatokenDeployer role

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | user adress |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[contracts/NFT.ts:738](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L738)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:209](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L209)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:132](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L132)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:287](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L287)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:366](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L366)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:494](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L494)

___

### setData

▸ **setData**(`nftAddress`, `address`, `key`, `value`): `Promise`<`TransactionReceipt`\>

setData
This function allows to store data with a preset key (keccak256(ERC20Address)) into NFT 725 Store
only ERC20Deployer can succeed

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | erc721 contract adress |
| `address` | `string` | user adress |
| `key` | `string` | Key of the data to be stored into 725Y standard |
| `value` | `string` | Data to be stored into 725Y standard |

#### Returns

`Promise`<`TransactionReceipt`\>

transactionId

#### Defined in

[contracts/NFT.ts:756](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L756)

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
| `metadataState` | `number` | - |
| `metadataDecryptorUrl` | `string` | - |
| `metadataDecryptorAddress` | `string` | - |
| `flags` | `string` | - |
| `data` | `string` | - |
| `metadataHash` | `string` | - |
| `metadataProofs?` | [`MetadataProof`](../interfaces/MetadataProof.md)[] | - |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:544](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L544)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:599](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L599)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:639](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L639)

___

### setTokenURI

▸ **setTokenURI**<`G`\>(`nftAddress`, `address`, `data`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

set TokenURI on an nft

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | NFT contract address |
| `address` | `string` | user adress |
| `data` | `string` | input data for TokenURI |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

transaction receipt

#### Defined in

[contracts/NFT.ts:675](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L675)

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
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](../modules.md#receiptorestimate)<`G`\>\>

trxReceipt

#### Defined in

[contracts/NFT.ts:447](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/NFT.ts#L447)

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

[SmartContract](SmartContract.md).[unitsToAmount](SmartContract.md#unitstoamount)

#### Defined in

[contracts/SmartContract.ts:45](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/contracts/SmartContract.ts#L45)
