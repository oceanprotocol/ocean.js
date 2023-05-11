[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / ServiceComputeOptions

# Interface: ServiceComputeOptions

## Table of contents

### Properties

- [allowNetworkAccess](ServiceComputeOptions.md#allownetworkaccess)
- [allowRawAlgorithm](ServiceComputeOptions.md#allowrawalgorithm)
- [publisherTrustedAlgorithmPublishers](ServiceComputeOptions.md#publishertrustedalgorithmpublishers)
- [publisherTrustedAlgorithms](ServiceComputeOptions.md#publishertrustedalgorithms)

## Properties

### allowNetworkAccess

• **allowNetworkAccess**: `boolean`

If true, the algorithm job will have network access.

#### Defined in

[@types/DDO/Service.ts:34](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L34)

___

### allowRawAlgorithm

• **allowRawAlgorithm**: `boolean`

If true, any passed raw text will be allowed to run.
Useful for an algorithm drag & drop use case, but increases risk of data escape through malicious user input.
Should be false by default in all implementations.

#### Defined in

[@types/DDO/Service.ts:28](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L28)

___

### publisherTrustedAlgorithmPublishers

• **publisherTrustedAlgorithmPublishers**: `string`[]

If empty, then any published algorithm is allowed.
Otherwise, only published algorithms by some publishers are allowed

#### Defined in

[@types/DDO/Service.ts:41](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L41)

___

### publisherTrustedAlgorithms

• **publisherTrustedAlgorithms**: [`PublisherTrustedAlgorithm`](PublisherTrustedAlgorithm.md)[]

If empty, then any published algorithm is allowed. (see below)

#### Defined in

[@types/DDO/Service.ts:47](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Service.ts#L47)
