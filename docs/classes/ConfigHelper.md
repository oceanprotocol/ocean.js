[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / ConfigHelper

# Class: ConfigHelper

## Table of contents

### Constructors

- [constructor](ConfigHelper.md#constructor)

### Methods

- [getAddressesFromEnv](ConfigHelper.md#getaddressesfromenv)
- [getConfig](ConfigHelper.md#getconfig)

## Constructors

### constructor

• **new ConfigHelper**()

## Methods

### getAddressesFromEnv

▸ **getAddressesFromEnv**(`network`, `customAddresses?`): `Partial`<[`Config`](Config.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `network` | `string` |
| `customAddresses?` | `any` |

#### Returns

`Partial`<[`Config`](Config.md)\>

#### Defined in

[config/ConfigHelper.ts:119](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/ConfigHelper.ts#L119)

___

### getConfig

▸ **getConfig**(`network`, `infuraProjectId?`): [`Config`](Config.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `network` | `string` \| `number` |
| `infuraProjectId?` | `string` |

#### Returns

[`Config`](Config.md)

#### Defined in

[config/ConfigHelper.ts:203](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/ConfigHelper.ts#L203)
