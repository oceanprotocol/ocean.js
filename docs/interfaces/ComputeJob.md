[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / ComputeJob

# Interface: ComputeJob

## Table of contents

### Properties

- [agreementId](ComputeJob.md#agreementid)
- [algoDID](ComputeJob.md#algodid)
- [dateCreated](ComputeJob.md#datecreated)
- [dateFinished](ComputeJob.md#datefinished)
- [did](ComputeJob.md#did)
- [expireTimestamp](ComputeJob.md#expiretimestamp)
- [inputDID](ComputeJob.md#inputdid)
- [jobId](ComputeJob.md#jobid)
- [owner](ComputeJob.md#owner)
- [results](ComputeJob.md#results)
- [status](ComputeJob.md#status)
- [statusText](ComputeJob.md#statustext)
- [metadata](ComputeJob.md#metadata)
- [terminationDetails](ComputeJob.md#terminationdetails)

## Properties

### agreementId

• `Optional` **agreementId**: `string`

#### Defined in

[@types/Compute.ts:45](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L45)

___

### algoDID

• `Optional` **algoDID**: `string`

#### Defined in

[@types/Compute.ts:44](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L44)

___

### dateCreated

• **dateCreated**: `string`

#### Defined in

[@types/Compute.ts:38](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L38)

___

### dateFinished

• **dateFinished**: `string`

#### Defined in

[@types/Compute.ts:39](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L39)

___

### did

• `Optional` **did**: `string`

#### Defined in

[@types/Compute.ts:36](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L36)

___

### expireTimestamp

• **expireTimestamp**: `number`

#### Defined in

[@types/Compute.ts:46](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L46)

___

### inputDID

• `Optional` **inputDID**: `string`[]

#### Defined in

[@types/Compute.ts:43](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L43)

___

### jobId

• **jobId**: `string`

#### Defined in

[@types/Compute.ts:37](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L37)

___

### owner

• **owner**: `string`

#### Defined in

[@types/Compute.ts:35](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L35)

___

### results

• **results**: [`ComputeResult`](ComputeResult.md)[]

#### Defined in

[@types/Compute.ts:42](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L42)

___

### status

• **status**: `number`

#### Defined in

[@types/Compute.ts:40](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L40)

___

### statusText

• **statusText**: `string`

#### Defined in

[@types/Compute.ts:121](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L121)

___

### metadata

• `Optional` **metadata**: `ComputeJobMetadata`

Custom metadata associated with the compute job

#### Defined in

[@types/Compute.ts:127](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L127)

___

### terminationDetails

• `Optional` **terminationDetails**: `object`

Details about job termination

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `exitCode?` | `number` | Exit code of the terminated job |
| `OOMKilled?` | `boolean` | Whether the job was killed due to out-of-memory |

#### Defined in

[@types/Compute.ts:128](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L128)
