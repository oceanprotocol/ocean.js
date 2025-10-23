[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / ComputeEnvironment

# Interface: ComputeEnvironment

## Table of contents

### Properties

- [id](ComputeEnvironment.md#id)
- [description](ComputeEnvironment.md#description)
- [consumerAddress](ComputeEnvironment.md#consumeraddress)
- [storageExpiry](ComputeEnvironment.md#storageexpiry)
- [minJobDuration](ComputeEnvironment.md#minjobduration)
- [maxJobDuration](ComputeEnvironment.md#maxjobduration)
- [maxJobs](ComputeEnvironment.md#maxjobs)
- [runningJobs](ComputeEnvironment.md#runningjobs)
- [runningfreeJobs](ComputeEnvironment.md#runningfreejobs)
- [fees](ComputeEnvironment.md#fees)
- [resources](ComputeEnvironment.md#resources)
- [free](ComputeEnvironment.md#free)
- [platform](ComputeEnvironment.md#platform)

## Properties

### id

• **id**: `string`

Unique identifier for the compute environment

#### Defined in

[@types/Compute.ts:88](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L88)

___

### description

• **description**: `string`

Description of the compute environment

#### Defined in

[@types/Compute.ts:89](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L89)

___

### consumerAddress

• **consumerAddress**: `string`

Consumer address for the compute environment

#### Defined in

[@types/Compute.ts:90](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L90)

___

### storageExpiry

• `Optional` **storageExpiry**: `number`

Amount of seconds for storage

#### Defined in

[@types/Compute.ts:91](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L91)

___

### minJobDuration

• `Optional` **minJobDuration**: `number`

Minimum billable seconds for a paid job

#### Defined in

[@types/Compute.ts:92](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L92)

___

### maxJobDuration

• `Optional` **maxJobDuration**: `number`

Maximum duration in seconds for a paid job

#### Defined in

[@types/Compute.ts:93](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L93)

___

### maxJobs

• `Optional` **maxJobs**: `number`

Maximum number of simultaneous paid jobs

#### Defined in

[@types/Compute.ts:94](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L94)

___

### runningJobs

• **runningJobs**: `number`

Amount of running jobs (paid jobs)

#### Defined in

[@types/Compute.ts:95](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L95)

___

### runningfreeJobs

• `Optional` **runningfreeJobs**: `number`

Amount of running jobs (free jobs)

#### Defined in

[@types/Compute.ts:96](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L96)

___

### fees

• **fees**: `ComputeEnvFeesStructure`

Fee structure for the compute environment

#### Defined in

[@types/Compute.ts:97](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L97)

___

### resources

• `Optional` **resources**: `ComputeResource[]`

Available compute resources (CPU, memory, storage)

#### Defined in

[@types/Compute.ts:98](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L98)

___

### free

• `Optional` **free**: `ComputeEnvironmentFreeOptions`

Free compute environment options

#### Defined in

[@types/Compute.ts:99](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L99)

___

### platform

• `Optional` **platform**: `RunningPlatform`

Platform information (architecture, OS)

#### Defined in

[@types/Compute.ts:100](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L100)
