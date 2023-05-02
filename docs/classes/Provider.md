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

Get file details for a given DID and service ID.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `did` | `string` | `undefined` | The DID to check. |
| `serviceId` | `string` | `undefined` | The service ID to check. |
| `providerUri` | `string` | `undefined` | The URI of the provider. |
| `withChecksum?` | `boolean` | `false` | Whether or not to include a checksum. |
| `signal?` | `AbortSignal` | `undefined` | An optional abort signal. |

#### Returns

`Promise`<[`FileInfo`](../interfaces/FileInfo.md)[]\>

A promise that resolves with an array of file info objects.

#### Defined in

[services/Provider.ts:181](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L181)

___

### computeDelete

▸ **computeDelete**(`did`, `consumer`, `jobId`, `providerUri`, `signal?`): `Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

Deletes a compute job.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `did` | `string` | asset did |
| `consumer` | `Signer` | consumer Signer wallet object |
| `jobId` | `string` | the compute job ID |
| `providerUri` | `string` | The URI of the provider we want to query |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

#### Defined in

[services/Provider.ts:764](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L764)

___

### computeStart

▸ **computeStart**(`providerUri`, `consumer`, `computeEnv`, `dataset`, `algorithm`, `signal?`, `additionalDatasets?`, `output?`): `Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

Instruct the provider to start a compute job

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `providerUri` | `string` | The provider URI. |
| `consumer` | `Signer` | - |
| `computeEnv` | `string` | The compute environment. |
| `dataset` | [`ComputeAsset`](../interfaces/ComputeAsset.md) | The dataset to start compute on |
| `algorithm` | [`ComputeAlgorithm`](../interfaces/ComputeAlgorithm.md) | The algorithm to start compute with. |
| `signal?` | `AbortSignal` | abort signal |
| `additionalDatasets?` | [`ComputeAsset`](../interfaces/ComputeAsset.md)[] | The additional datasets if that is the case. |
| `output?` | [`ComputeOutput`](../interfaces/ComputeOutput.md) | The compute job output settings. |

#### Returns

`Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

The compute job or jobs.

#### Defined in

[services/Provider.ts:516](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L516)

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

[services/Provider.ts:662](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L662)

___

### computeStop

▸ **computeStop**(`did`, `consumerAddress`, `jobId`, `providerUri`, `signer`, `signal?`): `Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

Instruct the provider to Stop the execution of a to stop a compute job.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `did` | `string` | the asset did |
| `consumerAddress` | `string` | The consumer address. |
| `jobId` | `string` | the compute job id |
| `providerUri` | `string` | The provider URI. |
| `signer` | `Signer` | The consumer signer object. |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<[`ComputeJob`](../interfaces/ComputeJob.md) \| [`ComputeJob`](../interfaces/ComputeJob.md)[]\>

#### Defined in

[services/Provider.ts:587](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L587)

___

### encrypt

▸ **encrypt**(`data`, `chainId`, `providerUri`, `signal?`): `Promise`<`string`\>

Encrypt data using the Provider's own symmetric key

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `any` | data in json format that needs to be sent , it can either be a DDO or a File array |
| `chainId` | `number` | network's id so provider can choose the corresponding Signer object |
| `providerUri` | `string` | provider uri address |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<`string`\>

urlDetails

#### Defined in

[services/Provider.ts:142](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L142)

___

### getComputeEnvironments

▸ **getComputeEnvironments**(`providerUri`, `signal?`): `Promise`<{ `[chainId: number]`: [`ComputeEnvironment`](../interfaces/ComputeEnvironment.md)[];  }\>

Returns compute environments from a provider.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `providerUri` | `string` | The URI of the provider. |
| `signal?` | `AbortSignal` | An optional abort signal. |

#### Returns

`Promise`<{ `[chainId: number]`: [`ComputeEnvironment`](../interfaces/ComputeEnvironment.md)[];  }\>

A promise that resolves with an object containing compute environments for each chain ID.

#### Defined in

[services/Provider.ts:290](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L290)

___

### getComputeResultUrl

▸ **getComputeResultUrl**(`providerUri`, `consumer`, `jobId`, `index`): `Promise`<`string`\>

Get compute result url

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `providerUri` | `string` | The URI of the provider we want to query |
| `consumer` | `Signer` | consumer Signer wallet object |
| `jobId` | `string` | The ID of a compute job. |
| `index` | `number` | Result index |

#### Returns

`Promise`<`string`\>

#### Defined in

[services/Provider.ts:725](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L725)

___

### getData

▸ `Private` **getData**(`url`): `Promise`<`Response`\>

Private method that fetches data from a URL using the GET method.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The URL to fetch data from. |

#### Returns

`Promise`<`Response`\>

A Promise that resolves to a Response object.

#### Defined in

[services/Provider.ts:906](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L906)

___

### getDownloadUrl

▸ **getDownloadUrl**(`did`, `serviceId`, `fileIndex`, `transferTxId`, `providerUri`, `signer`, `userCustomParameters?`): `Promise`<`any`\>

Gets the download URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `did` | `string` | The DID. |
| `serviceId` | `string` | The service ID. |
| `fileIndex` | `number` | The file index. |
| `transferTxId` | `string` | The transfer transaction ID. |
| `providerUri` | `string` | The provider URI. |
| `signer` | `Signer` | The signer. |
| `userCustomParameters?` | [`UserCustomParameters`](../interfaces/UserCustomParameters.md) | The user custom parameters. |

#### Returns

`Promise`<`any`\>

The download URL.

#### Defined in

[services/Provider.ts:472](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L472)

___

### getEndpointURL

▸ **getEndpointURL**(`servicesEndpoints`, `serviceName`): [`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)

This function returns the endpoint URL for a given service name.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `servicesEndpoints` | [`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)[] | The array of service endpoints |
| `serviceName` | `string` | The name of the service |

#### Returns

[`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)

The endpoint URL for the given service name

#### Defined in

[services/Provider.ts:44](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L44)

___

### getEndpoints

▸ **getEndpoints**(`providerUri`): `Promise`<`any`\>

Returns the provider endpoints

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `providerUri` | `string` | the provider url |

#### Returns

`Promise`<`any`\>

#### Defined in

[services/Provider.ts:28](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L28)

___

### getFileInfo

▸ **getFileInfo**(`file`, `providerUri`, `withChecksum?`, `signal?`): `Promise`<[`FileInfo`](../interfaces/FileInfo.md)[]\>

Get File details (if possible)

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `file` | [`UrlFile`](../interfaces/UrlFile.md) \| [`GraphqlQuery`](../interfaces/GraphqlQuery.md) \| [`Arweave`](../interfaces/Arweave.md) \| [`Ipfs`](../interfaces/Ipfs.md) \| [`Smartcontract`](../interfaces/Smartcontract-1.md) | `undefined` | one of the supported file structures |
| `providerUri` | `string` | `undefined` | uri of the provider that will be used to check the file |
| `withChecksum?` | `boolean` | `false` | Whether or not to include a checksum. |
| `signal?` | `AbortSignal` | `undefined` | An optional abort signal. |

#### Returns

`Promise`<[`FileInfo`](../interfaces/FileInfo.md)[]\>

A promise that resolves with an array of file info objects.

#### Defined in

[services/Provider.ts:237](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L237)

___

### getNonce

▸ **getNonce**(`providerUri`, `consumerAddress`, `signal?`, `providerEndpoints?`, `serviceEndpoints?`): `Promise`<`string`\>

Get current nonce from the provider.

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

[services/Provider.ts:80](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L80)

___

### getServiceEndpoints

▸ **getServiceEndpoints**(`providerEndpoint`, `endpoints`): `Promise`<[`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)[]\>

This function returns an array of service endpoints for a given provider endpoint.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `providerEndpoint` | `string` | The provider endpoint |
| `endpoints` | `any` | The endpoints object |

#### Returns

`Promise`<[`ServiceEndpoint`](../interfaces/ServiceEndpoint.md)[]\>

An array of service endpoints

#### Defined in

[services/Provider.ts:58](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L58)

___

### initialize

▸ **initialize**(`did`, `serviceId`, `fileIndex`, `consumerAddress`, `providerUri`, `signal?`, `userCustomParameters?`, `computeEnv?`, `validUntil?`): `Promise`<[`ProviderInitialize`](../interfaces/ProviderInitialize.md)\>

Initializes the provider for a service request.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `did` | `string` | The asset DID . |
| `serviceId` | `string` | The asset service ID. |
| `fileIndex` | `number` | The file index. |
| `consumerAddress` | `string` | The consumer address. |
| `providerUri` | `string` | The URI of the provider. |
| `signal?` | `AbortSignal` | The abort signal if any. |
| `userCustomParameters?` | [`UserCustomParameters`](../interfaces/UserCustomParameters.md) | The custom parameters if any. |
| `computeEnv?` | `string` | The compute environment if any. |
| `validUntil?` | `number` | The validity time if any. |

#### Returns

`Promise`<[`ProviderInitialize`](../interfaces/ProviderInitialize.md)\>

A promise that resolves with ProviderInitialize response.

#### Defined in

[services/Provider.ts:344](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L344)

___

### initializeCompute

▸ **initializeCompute**(`assets`, `algorithm`, `computeEnv`, `validUntil`, `providerUri`, `accountId`, `signal?`): `Promise`<[`ProviderComputeInitializeResults`](../interfaces/ProviderComputeInitializeResults.md)\>

Initializes the provider for a compute request.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `assets` | [`ComputeAsset`](../interfaces/ComputeAsset.md)[] | The datasets array to initialize compute request. |
| `algorithm` | [`ComputeAlgorithm`](../interfaces/ComputeAlgorithm.md) | The algorithm to use. |
| `computeEnv` | `string` | The compute environment. |
| `validUntil` | `number` | The job expiration date. |
| `providerUri` | `string` | The provider URI. |
| `accountId` | `string` | caller address |
| `signal?` | `AbortSignal` | abort signal |

#### Returns

`Promise`<[`ProviderComputeInitializeResults`](../interfaces/ProviderComputeInitializeResults.md)\>

ProviderComputeInitialize data

#### Defined in

[services/Provider.ts:409](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L409)

___

### inputMatch

▸ `Private` **inputMatch**(`input`, `regexp`, `conversorName`): `Object`

Private method that matches an input string against a regular expression and returns the first capture group.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `string` | The input string to match. |
| `regexp` | `RegExp` | The regular expression to match against. |
| `conversorName` | `string` | The name of the method calling this function. |

#### Returns

`Object`

An object with two properties: `valid` (a boolean indicating whether the input matched the regular expression) and `output` (the first capture group of the match, or the original input if there was no match).

| Name | Type |
| :------ | :------ |
| `output` | `string` |
| `valid` | `boolean` |

#### Defined in

[services/Provider.ts:883](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L883)

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

valid or not

#### Defined in

[services/Provider.ts:834](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L834)

___

### noZeroX

▸ `Private` **noZeroX**(`input`): `string`

Private method that removes the leading 0x from a string.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `string` | The input string. |

#### Returns

`string`

The transformed string.

#### Defined in

[services/Provider.ts:857](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L857)

___

### signProviderRequest

▸ **signProviderRequest**(`signer`, `message`): `Promise`<`string`\>

Sign a provider request with a signer.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer to use. |
| `message` | `string` | The message to sign. |

#### Returns

`Promise`<`string`\>

A promise that resolves with the signature.

#### Defined in

[services/Provider.ts:116](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L116)

___

### zeroXTransformer

▸ `Private` **zeroXTransformer**(`input?`, `zeroOutput`): `string`

Private method that removes the leading 0x from a string.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `input` | `string` | `''` | The input string. |
| `zeroOutput` | `boolean` | `undefined` | Whether to include 0x in the output if the input is valid and zeroOutput is true. |

#### Returns

`string`

The transformed string.

#### Defined in

[services/Provider.ts:867](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L867)
