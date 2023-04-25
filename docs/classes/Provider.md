[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Provider

# Class: Provider

## Table of contents

### Constructors

- [constructor](Provider.md#constructor)

### Methods

- [checkDidFiles](Provider.md#checkdidfiles)
- [computeDelete](Provider.md#computedelete)
- [computeStart](Provider.md#computestart)
- [computeStatus](Provider.md#computestatus)
- [computeStop](Provider.md#computestop)
- [encrypt](Provider.md#encrypt)
- [getComputeEnvironments](Provider.md#getcomputeenvironments)
- [getComputeResultUrl](Provider.md#getcomputeresulturl)
- [getData](Provider.md#getdata)
- [getDownloadUrl](Provider.md#getdownloadurl)
- [getEndpointURL](Provider.md#getendpointurl)
- [getEndpoints](Provider.md#getendpoints)
- [getFileInfo](Provider.md#getfileinfo)
- [getNonce](Provider.md#getnonce)
- [getServiceEndpoints](Provider.md#getserviceendpoints)
- [initialize](Provider.md#initialize)
- [initializeCompute](Provider.md#initializecompute)
- [inputMatch](Provider.md#inputmatch)
- [isValidProvider](Provider.md#isvalidprovider)
- [noZeroX](Provider.md#nozerox)
- [signProviderRequest](Provider.md#signproviderrequest)
- [zeroXTransformer](Provider.md#zeroxtransformer)

## Constructors

### constructor

• **new Provider**()

## Methods

### checkDidFiles

▸ **checkDidFiles**(`did`, `serviceId`, `providerUri`, `withChecksum?`, `signal?`): `Promise`<[`FileInfo`](../interfaces/FileInfo.md)[]\>

Get DDO File details (if possible)

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `did` | `string` | `undefined` | - |
| `serviceId` | `string` | `undefined` | the id of the service for which to check the files |
| `providerUri` | `string` | `undefined` | uri of the provider that will be used to check the file |
| `withChecksum` | `boolean` | `false` | if true, will return checksum of files content |
| `signal?` | `AbortSignal` | `undefined` | abort signal |

#### Returns

`Promise`<[`FileInfo`](../interfaces/FileInfo.md)[]\>

urlDetails

#### Defined in

[services/Provider.ts:163](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L163)

___

### computeDelete

▸ **computeDelete**(`did`, `consumerAddress`, `jobId`, `providerUri`, `web3`, `signal?`): `Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

Deletes a compute job.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `did` | `string` |  |
| `consumerAddress` | `string` |  |
| `jobId` | `string` |  |
| `providerUri` | `string` |  |
| `web3` | `default` |  |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

#### Defined in

[services/Provider.ts:671](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L671)

___

### computeStart

▸ **computeStart**(`providerUri`, `web3`, `consumerAddress`, `computeEnv`, `dataset`, `algorithm`, `signal?`, `additionalDatasets?`, `output?`): `Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

Instruct the provider to start a compute job

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `providerUri` | `string` |  |
| `web3` | `default` |  |
| `consumerAddress` | `string` |  |
| `computeEnv` | `string` |  |
| `dataset` | [`ComputeAsset`](../interfaces/ComputeAsset.md) | - |
| `algorithm` | [`ComputeAlgorithm`](../interfaces/ComputeAlgorithm.md) |  |
| `signal?` | `AbortSignal` | abort signal |
| `additionalDatasets?` | [`ComputeAsset`](../interfaces/ComputeAsset.md)[] | - |
| `output?` | [`ComputeOutput`](../interfaces/ComputeOutput.md) |  |

#### Returns

`Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

#### Defined in

[services/Provider.ts:426](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L426)

___

### computeStatus

▸ **computeStatus**(`providerUri`, `consumerAddress`, `jobId?`, `did?`, `signal?`): `Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

Get compute status for a specific jobId/documentId/owner.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `providerUri` | `string` | The URI of the provider we want to query |
| `consumerAddress` | `string` | The consumer ethereum address |
| `jobId?` | `string` | The ID of a compute job. |
| `did?` | `string` | The ID of the asset |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

#### Defined in

[services/Provider.ts:574](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L574)

___

### computeStop

▸ **computeStop**(`did`, `consumerAddress`, `jobId`, `providerUri`, `web3`, `signal?`): `Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

Instruct the provider to Stop the execution of a to stop a compute job.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `did` | `string` |  |
| `consumerAddress` | `string` |  |
| `jobId` | `string` |  |
| `providerUri` | `string` |  |
| `web3` | `default` |  |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

#### Defined in

[services/Provider.ts:502](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L502)

___

### encrypt

▸ **encrypt**(`data`, `chainId`, `providerUri`, `signal?`): `Promise`<`string`\>

Encrypt data using the Provider's own symmetric key

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `any` | data in json format that needs to be sent , it can either be a DDO or a File array |
| `chainId` | `number` | network's id so provider can choose the corresponding web3 object |
| `providerUri` | `string` | provider uri address |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<`string`\>

urlDetails

#### Defined in

[services/Provider.ts:125](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L125)

___

### getComputeEnvironments

▸ **getComputeEnvironments**(`providerUri`, `signal?`): `Promise`<[`ComputeEnvironment`](../interfaces/ComputeEnvironment.md)[]\>

Get Compute Environments

#### Parameters

| Name | Type |
| :------ | :------ |
| `providerUri` | `string` |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`<[`ComputeEnvironment`](../interfaces/ComputeEnvironment.md)[]\>

urlDetails

#### Defined in

[services/Provider.ts:244](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L244)

___

### getComputeResultUrl

▸ **getComputeResultUrl**(`providerUri`, `web3`, `consumerAddress`, `jobId`, `index`): `Promise`<`string`\>

Get compute result url

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `providerUri` | `string` | The URI of the provider we want to query |
| `web3` | `default` | Web3 instance |
| `consumerAddress` | `string` | The consumer ethereum address |
| `jobId` | `string` | The ID of a compute job. |
| `index` | `number` | Result index |

#### Returns

`Promise`<`string`\>

#### Defined in

[services/Provider.ts:626](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L626)

___

### getData

▸ `Private` **getData**(`url`): `Promise`<`Response`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<`Response`\>

#### Defined in

[services/Provider.ts:794](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L794)

___

### getDownloadUrl

▸ **getDownloadUrl**(`did`, `accountId`, `serviceId`, `fileIndex`, `transferTxId`, `providerUri`, `web3`, `userCustomParameters?`): `Promise`<`any`\>

Gets fully signed URL for download

#### Parameters

| Name | Type |
| :------ | :------ |
| `did` | `string` |
| `accountId` | `string` |
| `serviceId` | `string` |
| `fileIndex` | `number` |
| `transferTxId` | `string` |
| `providerUri` | `string` |
| `web3` | `default` |
| `userCustomParameters?` | [`UserCustomParameters`](../interfaces/UserCustomParameters.md) |

#### Returns

`Promise`<`any`\>

#### Defined in

[services/Provider.ts:381](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L381)

___

### getEndpointURL

▸ **getEndpointURL**(`servicesEndpoints`, `serviceName`): [`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `servicesEndpoints` | [`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)[] |
| `serviceName` | `string` |

#### Returns

[`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)

#### Defined in

[services/Provider.ts:37](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L37)

___

### getEndpoints

▸ **getEndpoints**(`providerUri`): `Promise`<`any`\>

Returns the provider endpoints

#### Parameters

| Name | Type |
| :------ | :------ |
| `providerUri` | `string` |

#### Returns

`Promise`<`any`\>

#### Defined in

[services/Provider.ts:27](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L27)

___

### getFileInfo

▸ **getFileInfo**(`file`, `providerUri`, `withChecksum?`, `signal?`): `Promise`<[`FileInfo`](../interfaces/FileInfo.md)[]\>

Get URL details (if possible)

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `file` | [`UrlFile`](../interfaces/UrlFile.md) \| [`GraphqlQuery`](../interfaces/GraphqlQuery.md) \| [`Arweave`](../interfaces/Arweave.md) \| [`Ipfs`](../interfaces/Ipfs.md) \| [`Smartcontract`](../interfaces/Smartcontract-1.md) | `undefined` | one of the supported file structures |
| `providerUri` | `string` | `undefined` | uri of the provider that will be used to check the file |
| `withChecksum` | `boolean` | `false` | if true, will return checksum of files content |
| `signal?` | `AbortSignal` | `undefined` | abort signal |

#### Returns

`Promise`<[`FileInfo`](../interfaces/FileInfo.md)[]\>

urlDetails

#### Defined in

[services/Provider.ts:206](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L206)

___

### getNonce

▸ **getNonce**(`providerUri`, `consumerAddress`, `signal?`, `providerEndpoints?`, `serviceEndpoints?`): `Promise`<`string`\>

Gets current nonce

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `providerUri` | `string` | provider uri address |
| `consumerAddress` | `string` | Publisher address |
| `signal?` | `AbortSignal` | abort signal |
| `providerEndpoints?` | `any` | Identifier of the asset to be registered in ocean |
| `serviceEndpoints?` | [`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)[] | document description object (DDO)= |

#### Returns

`Promise`<`string`\>

urlDetails

#### Defined in

[services/Provider.ts:71](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L71)

___

### getServiceEndpoints

▸ **getServiceEndpoints**(`providerEndpoint`, `endpoints`): `Promise`<[`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)[]\>

Returns the service endpoints that exist in provider.

#### Parameters

| Name | Type |
| :------ | :------ |
| `providerEndpoint` | `string` |
| `endpoints` | `any` |

#### Returns

`Promise`<[`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)[]\>

#### Defined in

[services/Provider.ts:50](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L50)

___

### initialize

▸ **initialize**(`did`, `serviceId`, `fileIndex`, `consumerAddress`, `providerUri`, `signal?`, `userCustomParameters?`, `computeEnv?`, `validUntil?`): `Promise`<[`ProviderInitialize`](../interfaces/ProviderInitialize.md)\>

Initialize a service request.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `did` | `string` | - |
| `serviceId` | `string` | - |
| `fileIndex` | `number` | - |
| `consumerAddress` | `string` |  |
| `providerUri` | `string` | Identifier of the asset to be registered in ocean |
| `signal?` | `AbortSignal` | abort signal |
| `userCustomParameters?` | [`UserCustomParameters`](../interfaces/UserCustomParameters.md) |  |
| `computeEnv?` | `string` | - |
| `validUntil?` | `number` | - |

#### Returns

`Promise`<[`ProviderInitialize`](../interfaces/ProviderInitialize.md)\>

ProviderInitialize data

#### Defined in

[services/Provider.ts:279](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L279)

___

### initializeCompute

▸ **initializeCompute**(`assets`, `algorithm`, `computeEnv`, `validUntil`, `providerUri`, `accountId`, `signal?`): `Promise`<[`ProviderComputeInitializeResults`](../interfaces/ProviderComputeInitializeResults.md)\>

Initialize a compute request.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `assets` | [`ComputeAsset`](../interfaces/ComputeAsset.md)[] |  |
| `algorithm` | [`ComputeAlgorithm`](../interfaces/ComputeAlgorithm.md) |  |
| `computeEnv` | `string` |  |
| `validUntil` | `number` |  |
| `providerUri` | `string` | Identifier of the asset to be registered in ocean |
| `accountId` | `string` |  |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<[`ProviderComputeInitializeResults`](../interfaces/ProviderComputeInitializeResults.md)\>

ProviderComputeInitialize data

#### Defined in

[services/Provider.ts:332](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L332)

___

### inputMatch

▸ `Private` **inputMatch**(`input`, `regexp`, `conversorName`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `string` |
| `regexp` | `RegExp` |
| `conversorName` | `string` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `output` | `string` |
| `valid` | `boolean` |

#### Defined in

[services/Provider.ts:776](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L776)

___

### isValidProvider

▸ **isValidProvider**(`url`, `signal?`): `Promise`<`boolean`\>

Check for a valid provider at URL

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | provider uri address |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<`boolean`\>

string

#### Defined in

[services/Provider.ts:744](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L744)

___

### noZeroX

▸ `Private` **noZeroX**(`input`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `string` |

#### Returns

`string`

#### Defined in

[services/Provider.ts:762](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L762)

___

### signProviderRequest

▸ **signProviderRequest**(`web3`, `accountId`, `message`, `password?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `web3` | `default` |
| `accountId` | `string` |
| `message` | `string` |
| `password?` | `string` |

#### Returns

`Promise`<`string`\>

#### Defined in

[services/Provider.ts:101](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L101)

___

### zeroXTransformer

▸ `Private` **zeroXTransformer**(`input?`, `zeroOutput`): `string`

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `input` | `string` | `''` |
| `zeroOutput` | `boolean` | `undefined` |

#### Returns

`string`

#### Defined in

[services/Provider.ts:766](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L766)
