[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Asset

# Interface: Asset

DID Descriptor Object.
Contains metadata about the asset, and define access in at least one service.

## Hierarchy

- [`DDO`](DDO.md)

  ↳ **`Asset`**

## Table of contents

### Properties

- [@context](Asset.md#@context)
- [chainId](Asset.md#chainid)
- [credentials](Asset.md#credentials)
- [datatokens](Asset.md#datatokens)
- [event](Asset.md#event)
- [id](Asset.md#id)
- [metadata](Asset.md#metadata)
- [nft](Asset.md#nft)
- [nftAddress](Asset.md#nftaddress)
- [purgatory](Asset.md#purgatory)
- [services](Asset.md#services)
- [stats](Asset.md#stats)
- [version](Asset.md#version)

## Properties

### @context

• **@context**: `string`[]

Contexts used for validation.

#### Inherited from

[DDO](DDO.md).[@context](DDO.md#@context)

#### Defined in

[@types/DDO/DDO.ts:12](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L12)

___

### chainId

• **chainId**: `number`

ChainId of the network the DDO was published to.

#### Inherited from

[DDO](DDO.md).[chainId](DDO.md#chainid)

#### Defined in

[@types/DDO/DDO.ts:38](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L38)

___

### credentials

• `Optional` **credentials**: [`Credentials`](Credentials.md)

Describes the credentials needed to access a dataset
in addition to the services definition.

#### Inherited from

[DDO](DDO.md).[credentials](DDO.md#credentials)

#### Defined in

[@types/DDO/DDO.ts:57](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L57)

___

### datatokens

• **datatokens**: [`AssetDatatoken`](AssetDatatoken.md)[]

Contains information about the ERC20 Datatokens attached to asset services.

#### Defined in

[@types/Asset.ts:151](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L151)

___

### event

• **event**: [`AssetLastEvent`](AssetLastEvent.md)

Contains information about the last transaction that created or updated the DDO.

#### Overrides

[DDO](DDO.md).[event](DDO.md#event)

#### Defined in

[@types/Asset.ts:157](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L157)

___

### id

• **id**: `string`

DID, descentralized ID.
Computed as sha256(address of NFT contract + chainId)

#### Inherited from

[DDO](DDO.md).[id](DDO.md#id)

#### Defined in

[@types/DDO/DDO.ts:19](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L19)

___

### metadata

• **metadata**: [`Metadata`](Metadata.md)

Stores an object describing the asset.

#### Inherited from

[DDO](DDO.md).[metadata](DDO.md#metadata)

#### Defined in

[@types/DDO/DDO.ts:44](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L44)

___

### nft

• **nft**: [`AssetNft`](AssetNft.md)

Contains information about the ERC721 NFT contract which represents the intellectual property of the publisher.

#### Defined in

[@types/Asset.ts:145](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L145)

___

### nftAddress

• **nftAddress**: `string`

NFT contract address

#### Inherited from

[DDO](DDO.md).[nftAddress](DDO.md#nftaddress)

#### Defined in

[@types/DDO/DDO.ts:32](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L32)

___

### purgatory

• **purgatory**: [`Purgatory`](Purgatory.md)

Contains information about an asset's purgatory status defined in
[`list-purgatory`](https://github.com/oceanprotocol/list-purgatory).
Marketplace interfaces are encouraged to prevent certain user actions like downloading on assets in purgatory.

#### Defined in

[@types/Asset.ts:171](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L171)

___

### services

• **services**: [`Service`](Service.md)[]

Stores an array of services defining access to the asset.

#### Inherited from

[DDO](DDO.md).[services](DDO.md#services)

#### Defined in

[@types/DDO/DDO.ts:50](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L50)

___

### stats

• **stats**: [`Stats`](Stats.md)

The stats section contains different statistics fields. This section is added by Aquarius

#### Defined in

[@types/Asset.ts:163](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L163)

___

### version

• **version**: `string`

Version information in SemVer notation
referring to the DDO spec version

#### Inherited from

[DDO](DDO.md).[version](DDO.md#version)

#### Defined in

[@types/DDO/DDO.ts:26](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L26)
