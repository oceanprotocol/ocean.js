[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Stats

# Interface: Stats

## Table of contents

### Properties

- [allocated](Stats.md#allocated)
- [orders](Stats.md#orders)
- [price](Stats.md#price)

## Properties

### allocated

• `Optional` **allocated**: `number`

Total amount of veOCEAN allocated on this asset.

#### Defined in

[@types/Asset.ts:129](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L129)

___

### orders

• **orders**: `number`

How often an asset was consumed, meaning how often it was either downloaded or used as part of a compute job.

#### Defined in

[@types/Asset.ts:117](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L117)

___

### price

• **price**: [`AssetPrice`](AssetPrice.md)

Contains information about the price of this asset.

#### Defined in

[@types/Asset.ts:123](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Asset.ts#L123)
