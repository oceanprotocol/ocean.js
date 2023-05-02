[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Service

# Interface: Service

## Table of contents

### Properties

- [additionalInformation](Service.md#additionalinformation)
- [compute](Service.md#compute)
- [datatokenAddress](Service.md#datatokenaddress)
- [description](Service.md#description)
- [files](Service.md#files)
- [id](Service.md#id)
- [name](Service.md#name)
- [serviceEndpoint](Service.md#serviceendpoint)
- [timeout](Service.md#timeout)
- [type](Service.md#type)

## Properties

### additionalInformation

• `Optional` **additionalInformation**: `any`

Stores service specific additional information, this is customizable by publisher

#### Defined in

[@types/DDO/Service.ts:109](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L109)

___

### compute

• `Optional` **compute**: [`ServiceComputeOptions`](ServiceComputeOptions.md)

If service is of type compute, holds information about the compute-related privacy settings & resources.

#### Defined in

[@types/DDO/Service.ts:103](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L103)

___

### datatokenAddress

• **datatokenAddress**: `string`

Datatoken address

#### Defined in

[@types/DDO/Service.ts:73](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L73)

___

### description

• `Optional` **description**: `string`

Service description

#### Defined in

[@types/DDO/Service.ts:97](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L97)

___

### files

• **files**: `string`

Encrypted file URLs.

#### Defined in

[@types/DDO/Service.ts:67](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L67)

___

### id

• **id**: `string`

Unique ID

#### Defined in

[@types/DDO/Service.ts:55](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L55)

___

### name

• `Optional` **name**: `string`

Service friendly name

#### Defined in

[@types/DDO/Service.ts:91](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L91)

___

### serviceEndpoint

• **serviceEndpoint**: `string`

Provider URL (schema + host).

#### Defined in

[@types/DDO/Service.ts:79](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L79)

___

### timeout

• **timeout**: `number`

Describing how long the service can be used after consumption is initiated.

#### Defined in

[@types/DDO/Service.ts:85](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L85)

___

### type

• **type**: `string`

Type of service (access, compute, wss.

#### Defined in

[@types/DDO/Service.ts:61](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L61)
