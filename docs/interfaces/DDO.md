[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / DDO

# Interface: DDO

DID Descriptor Object.
Contains metadata about the asset, and define access in at least one service.

## Hierarchy

- **`DDO`**

  ↳ [`Asset`](Asset.md)

## Table of contents

### Properties

- [@context](DDO.md#@context)
- [chainId](DDO.md#chainid)
- [credentials](DDO.md#credentials)
- [event](DDO.md#event)
- [id](DDO.md#id)
- [metadata](DDO.md#metadata)
- [nftAddress](DDO.md#nftaddress)
- [services](DDO.md#services)
- [version](DDO.md#version)

## Properties

### @context

• **@context**: `string`[]

Contexts used for validation.

#### Defined in

[@types/DDO/DDO.ts:12](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L12)

___

### chainId

• **chainId**: `number`

ChainId of the network the DDO was published to.

#### Defined in

[@types/DDO/DDO.ts:38](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L38)

___

### credentials

• `Optional` **credentials**: [`Credentials`](Credentials.md)

Describes the credentials needed to access a dataset
in addition to the services definition.

#### Defined in

[@types/DDO/DDO.ts:57](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L57)

___

### event

• `Optional` **event**: [`Event`](Event.md)

Describes the event of last metadata event

#### Defined in

[@types/DDO/DDO.ts:63](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L63)

___

### id

• **id**: `string`

DID, descentralized ID.
Computed as sha256(address of NFT contract + chainId)

#### Defined in

[@types/DDO/DDO.ts:19](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L19)

___

### metadata

• **metadata**: [`Metadata`](Metadata.md)

Stores an object describing the asset.

#### Defined in

[@types/DDO/DDO.ts:44](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L44)

___

### nftAddress

• **nftAddress**: `string`

NFT contract address

#### Defined in

[@types/DDO/DDO.ts:32](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L32)

___

### services

• **services**: [`Service`](Service.md)[]

Stores an array of services defining access to the asset.

#### Defined in

[@types/DDO/DDO.ts:50](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L50)

___

### version

• **version**: `string`

Version information in SemVer notation
referring to the DDO spec version

#### Defined in

[@types/DDO/DDO.ts:26](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/DDO.ts#L26)
