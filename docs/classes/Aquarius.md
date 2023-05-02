[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Aquarius

# Class: Aquarius

## Table of contents

### Constructors

- [constructor](Aquarius.md#constructor)

### Properties

- [aquariusURL](Aquarius.md#aquariusurl)

### Methods

- [getAssetMetadata](Aquarius.md#getassetmetadata)
- [querySearch](Aquarius.md#querysearch)
- [resolve](Aquarius.md#resolve)
- [validate](Aquarius.md#validate)
- [waitForAqua](Aquarius.md#waitforaqua)

## Constructors

### constructor

• **new Aquarius**(`aquariusURL`)

Instantiate Aquarius

#### Parameters

| Name | Type |
| :------ | :------ |
| `aquariusURL` | `string` |

#### Defined in

[services/Aquarius.ts:21](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Aquarius.ts#L21)

## Properties

### aquariusURL

• **aquariusURL**: `string`

#### Defined in

[services/Aquarius.ts:15](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Aquarius.ts#L15)

## Methods

### getAssetMetadata

▸ **getAssetMetadata**(`did`, `signal?`): `Promise`<`any`\>

Search over the DDOs using a query.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `did` | `string` | DID of the asset |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<`any`\>

#### Defined in

[services/Aquarius.ts:135](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Aquarius.ts#L135)

___

### querySearch

▸ **querySearch**(`query`, `signal?`): `Promise`<`any`\>

Search over the DDOs using a query.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `query` | [`SearchQuery`](../interfaces/SearchQuery.md) | Query to filter the DDOs. |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<`any`\>

#### Defined in

[services/Aquarius.ts:166](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Aquarius.ts#L166)

___

### resolve

▸ **resolve**(`did`, `signal?`): `Promise`<[`Asset`](../interfaces/Asset.md)\>

Resolves a DID

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `did` | `string` | DID of the asset. |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<[`Asset`](../interfaces/Asset.md)\>

Asset

#### Defined in

[services/Aquarius.ts:30](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Aquarius.ts#L30)

___

### validate

▸ **validate**(`ddo`, `signal?`): `Promise`<[`ValidateMetadata`](../interfaces/ValidateMetadata.md)\>

Validate DDO content

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `ddo` | [`DDO`](../interfaces/DDO.md) | DID Descriptor Object content. |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<[`ValidateMetadata`](../interfaces/ValidateMetadata.md)\>

.

#### Defined in

[services/Aquarius.ts:94](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Aquarius.ts#L94)

___

### waitForAqua

▸ **waitForAqua**(`did`, `txid?`, `signal?`): `Promise`<[`Asset`](../interfaces/Asset.md)\>

Blocks until Aqua will cache the did (or the update for that did) or timeouts

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `did` | `string` | DID of the asset. |
| `txid?` | `string` | used when the did exists and we expect an update with that txid. |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<[`Asset`](../interfaces/Asset.md)\>

DDO of the asset.

#### Defined in

[services/Aquarius.ts:58](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Aquarius.ts#L58)
