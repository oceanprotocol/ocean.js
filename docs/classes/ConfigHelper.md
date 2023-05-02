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

[config/ConfigHelper.ts:124](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/ConfigHelper.ts#L124)

___

### getConfig

▸ **getConfig**(`network`, `infuraProjectId?`): [`Config`](Config.md)

Returns the config object for a specific network supported by the oceanprotocol stack

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `network` | `string` \| `number` | the network's chainId or name |
| `infuraProjectId?` | `string` | optional infura project id that will replace the configs node URI |

#### Returns

[`Config`](Config.md)

Config obhjedct

#### Defined in

[config/ConfigHelper.ts:214](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/ConfigHelper.ts#L214)
