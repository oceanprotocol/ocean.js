[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / ComputeResourcesRequest

# Interface: ComputeResourcesRequest

## Table of contents

### Properties

- [id](ComputeResourcesRequest.md#id)
- [amount](ComputeResourcesRequest.md#amount)

## Properties

### id

• **id**: `string`

Resource identifier (e.g., 'cpu', 'ram', 'disk')

#### Defined in

[@types/Compute.ts:50](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L50)

___

### amount

• **amount**: `number`

Amount of the specified resource to request. DISK and RAM are in GB, CPU is in number of cores.

#### Defined in

[@types/Compute.ts:51](https://github.com/oceanprotocol/ocean.js/blob/main/src/@types/Compute.ts#L51)
