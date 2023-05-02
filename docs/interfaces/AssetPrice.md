[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / AssetPrice

# Interface: AssetPrice

## Table of contents

### Properties

- [tokenAddress](AssetPrice.md#tokenaddress)
- [tokenSymbol](AssetPrice.md#tokensymbol)
- [value](AssetPrice.md#value)

## Properties

### tokenAddress

• `Optional` **tokenAddress**: `string`

The address of the token that the price needs to be paid in.

#### Defined in

[@types/Asset.ts:110](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L110)

___

### tokenSymbol

• `Optional` **tokenSymbol**: `string`

The symbol that the price of the asset is expressed in.

#### Defined in

[@types/Asset.ts:104](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L104)

___

### value

• **value**: `number`

The price of the asset expressed as a number. If 0 then the price is FREE.

#### Defined in

[@types/Asset.ts:98](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L98)
