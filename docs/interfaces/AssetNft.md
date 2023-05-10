[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / AssetNft

# Interface: AssetNft

## Table of contents

### Properties

- [address](AssetNft.md#address)
- [created](AssetNft.md#created)
- [name](AssetNft.md#name)
- [owner](AssetNft.md#owner)
- [state](AssetNft.md#state)
- [symbol](AssetNft.md#symbol)
- [tokenURI](AssetNft.md#tokenuri)

## Properties

### address

• **address**: `string`

Contract address of the deployed ERC721 NFT contract.

#### Defined in

[@types/Asset.ts:8](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L8)

___

### created

• **created**: `string`

Contains the date of NFT creation.

#### Defined in

[@types/Asset.ts:44](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L44)

___

### name

• **name**: `string`

Name of NFT set in contract.

#### Defined in

[@types/Asset.ts:14](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L14)

___

### owner

• **owner**: `string`

ETH account address of the NFT owner.

#### Defined in

[@types/Asset.ts:26](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L26)

___

### state

• **state**: ``0`` \| ``2`` \| ``1`` \| ``3`` \| ``4`` \| ``5``

State of the asset reflecting the NFT contract value.
0	Active.
1	End-of-life.
2	Deprecated (by another asset).
3	Revoked by publisher.
4	Ordering is temporary disabled.
5  Unlisted in markets.

#### Defined in

[@types/Asset.ts:38](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L38)

___

### symbol

• **symbol**: `string`

Symbol of NFT set in contract.

#### Defined in

[@types/Asset.ts:20](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L20)

___

### tokenURI

• **tokenURI**: `string`

NFT token URI.

#### Defined in

[@types/Asset.ts:50](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L50)
