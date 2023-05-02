[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Logger

# Class: Logger

## Table of contents

### Constructors

- [constructor](Logger.md#constructor)

### Properties

- [logLevel](Logger.md#loglevel)

### Methods

- [bypass](Logger.md#bypass)
- [debug](Logger.md#debug)
- [dispatch](Logger.md#dispatch)
- [error](Logger.md#error)
- [log](Logger.md#log)
- [setLevel](Logger.md#setlevel)
- [warn](Logger.md#warn)

## Constructors

### constructor

• **new Logger**(`logLevel?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `logLevel` | [`LogLevel`](../enums/LogLevel.md) | `LogLevel.Error` |

#### Defined in

[utils/Logger.ts:12](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Logger.ts#L12)

## Properties

### logLevel

• `Private` **logLevel**: [`LogLevel`](../enums/LogLevel.md) = `LogLevel.Error`

#### Defined in

[utils/Logger.ts:12](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Logger.ts#L12)

## Methods

### bypass

▸ **bypass**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Defined in

[utils/Logger.ts:18](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Logger.ts#L18)

___

### debug

▸ **debug**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Defined in

[utils/Logger.ts:22](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Logger.ts#L22)

___

### dispatch

▸ `Private` **dispatch**(`verb`, `level`, `...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `verb` | `string` |
| `level` | [`LogLevel`](../enums/LogLevel.md) |
| `...args` | `any`[] |

#### Returns

`void`

#### Defined in

[utils/Logger.ts:38](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Logger.ts#L38)

___

### error

▸ **error**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Defined in

[utils/Logger.ts:34](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Logger.ts#L34)

___

### log

▸ **log**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Defined in

[utils/Logger.ts:26](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Logger.ts#L26)

___

### setLevel

▸ **setLevel**(`logLevel`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `logLevel` | [`LogLevel`](../enums/LogLevel.md) |

#### Returns

`void`

#### Defined in

[utils/Logger.ts:14](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Logger.ts#L14)

___

### warn

▸ **warn**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Defined in

[utils/Logger.ts:30](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Logger.ts#L30)
