[@oceanprotocol/lib](README.md) / Exports

# @oceanprotocol/lib

## Table of contents

### Enumerations

- [LogLevel](enums/LogLevel.md)

### Classes

- [Aquarius](classes/Aquarius.md)
- [Config](classes/Config.md)
- [ConfigHelper](classes/ConfigHelper.md)
- [Datatoken](classes/Datatoken.md)
- [DfRewards](classes/DfRewards.md)
- [DfStrategyV1](classes/DfStrategyV1.md)
- [Dispenser](classes/Dispenser.md)
- [FixedRateExchange](classes/FixedRateExchange.md)
- [Logger](classes/Logger.md)
- [Nft](classes/Nft.md)
- [NftFactory](classes/NftFactory.md)
- [Provider](classes/Provider.md)
- [Router](classes/Router.md)
- [SmartContract](classes/SmartContract.md)
- [SmartContractWithAddress](classes/SmartContractWithAddress.md)
- [VeAllocate](classes/VeAllocate.md)
- [VeFeeDistributor](classes/VeFeeDistributor.md)
- [VeFeeEstimate](classes/VeFeeEstimate.md)
- [VeOcean](classes/VeOcean.md)

### Interfaces

- [AbiInput](interfaces/AbiInput.md)
- [AbiItem](interfaces/AbiItem.md)
- [AbiOutput](interfaces/AbiOutput.md)
- [Arweave](interfaces/Arweave.md)
- [Asset](interfaces/Asset.md)
- [AssetDatatoken](interfaces/AssetDatatoken.md)
- [AssetLastEvent](interfaces/AssetLastEvent.md)
- [AssetNft](interfaces/AssetNft.md)
- [AssetPrice](interfaces/AssetPrice.md)
- [ComputeAlgorithm](interfaces/ComputeAlgorithm.md)
- [ComputeAsset](interfaces/ComputeAsset.md)
- [ComputeEnvironment](interfaces/ComputeEnvironment.md)
- [ComputeJob](interfaces/ComputeJob.md)
- [ComputeOutput](interfaces/ComputeOutput.md)
- [ComputeResult](interfaces/ComputeResult.md)
- [ConsumeMarketFee](interfaces/ConsumeMarketFee.md)
- [Credential](interfaces/Credential.md)
- [Credentials](interfaces/Credentials.md)
- [DDO](interfaces/DDO.md)
- [DatatokenCreateParams](interfaces/DatatokenCreateParams.md)
- [DatatokenRoles](interfaces/DatatokenRoles.md)
- [DispenserCreationParams](interfaces/DispenserCreationParams.md)
- [DispenserParams](interfaces/DispenserParams.md)
- [DispenserToken](interfaces/DispenserToken.md)
- [DownloadResponse](interfaces/DownloadResponse.md)
- [Event](interfaces/Event.md)
- [FeesInfo](interfaces/FeesInfo.md)
- [FileInfo](interfaces/FileInfo.md)
- [Files](interfaces/Files.md)
- [FixedPriceExchange](interfaces/FixedPriceExchange.md)
- [FreCreationParams](interfaces/FreCreationParams.md)
- [FreOrderParams](interfaces/FreOrderParams.md)
- [GraphqlQuery](interfaces/GraphqlQuery.md)
- [Ipfs](interfaces/Ipfs.md)
- [Metadata](interfaces/Metadata.md)
- [MetadataAlgorithm](interfaces/MetadataAlgorithm.md)
- [MetadataAndTokenURI](interfaces/MetadataAndTokenURI.md)
- [MetadataProof](interfaces/MetadataProof.md)
- [NftCreateData](interfaces/NftCreateData.md)
- [NftRoles](interfaces/NftRoles.md)
- [Operation](interfaces/Operation.md)
- [OrderParams](interfaces/OrderParams.md)
- [PriceAndFees](interfaces/PriceAndFees.md)
- [ProviderComputeInitialize](interfaces/ProviderComputeInitialize.md)
- [ProviderComputeInitializeResults](interfaces/ProviderComputeInitializeResults.md)
- [ProviderFees](interfaces/ProviderFees.md)
- [ProviderInitialize](interfaces/ProviderInitialize.md)
- [PublisherTrustedAlgorithm](interfaces/PublisherTrustedAlgorithm.md)
- [PublishingMarketFee](interfaces/PublishingMarketFee.md)
- [Purgatory](interfaces/Purgatory.md)
- [SearchQuery](interfaces/SearchQuery.md)
- [Service](interfaces/Service.md)
- [ServiceComputeOptions](interfaces/ServiceComputeOptions.md)
- [ServiceEndpoint](interfaces/ServiceEndpoint.md)
- [Smartcontract](interfaces/Smartcontract-1.md)
- [Stats](interfaces/Stats.md)
- [Template](interfaces/Template.md)
- [TokenOrder](interfaces/TokenOrder.md)
- [UrlFile](interfaces/UrlFile.md)
- [UserCustomParameters](interfaces/UserCustomParameters.md)
- [ValidateMetadata](interfaces/ValidateMetadata.md)

### Type Aliases

- [AbiType](modules.md#abitype)
- [ComputeResultType](modules.md#computeresulttype)
- [ReceiptOrDecimal](modules.md#receiptordecimal)
- [ReceiptOrEstimate](modules.md#receiptorestimate)
- [StateMutabilityType](modules.md#statemutabilitytype)

### Variables

- [FEE\_HISTORY\_NOT\_SUPPORTED](modules.md#fee_history_not_supported)
- [GASLIMIT\_DEFAULT](modules.md#gaslimit_default)
- [LoggerInstance](modules.md#loggerinstance)
- [MAX\_UINT\_256](modules.md#max_uint_256)
- [ProviderInstance](modules.md#providerinstance)
- [ZERO\_ADDRESS](modules.md#zero_address)
- [configHelperNetworks](modules.md#confighelpernetworks)
- [minAbi](modules.md#minabi)

### Functions

- [allowance](modules.md#allowance)
- [allowanceWei](modules.md#allowancewei)
- [amountToUnits](modules.md#amounttounits)
- [approve](modules.md#approve)
- [approveWei](modules.md#approvewei)
- [balance](modules.md#balance)
- [decimals](modules.md#decimals)
- [downloadFile](modules.md#downloadfile)
- [downloadFileBrowser](modules.md#downloadfilebrowser)
- [generateDid](modules.md#generatedid)
- [generateDtName](modules.md#generatedtname)
- [getErrorMessage](modules.md#geterrormessage)
- [getEventFromTx](modules.md#geteventfromtx)
- [getFairGasPrice](modules.md#getfairgasprice)
- [getHash](modules.md#gethash)
- [getTokenDecimals](modules.md#gettokendecimals)
- [sendTx](modules.md#sendtx)
- [setContractDefaults](modules.md#setcontractdefaults)
- [signHash](modules.md#signhash)
- [sleep](modules.md#sleep)
- [transfer](modules.md#transfer)
- [unitsToAmount](modules.md#unitstoamount)

## Type Aliases

### AbiType

Ƭ **AbiType**: ``"function"`` \| ``"constructor"`` \| ``"event"`` \| ``"fallback"``

#### Defined in

[@types/Contracts.ts:1](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Contracts.ts#L1)

___

### ComputeResultType

Ƭ **ComputeResultType**: ``"algorithmLog"`` \| ``"output"`` \| ``"configrationLog"`` \| ``"publishLog"``

#### Defined in

[@types/Compute.ts:3](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Compute.ts#L3)

___

### ReceiptOrDecimal

Ƭ **ReceiptOrDecimal**<`G`\>: `G` extends ``false`` ? `providers.TransactionResponse` : `number`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Defined in

[@types/ReturnTypes.ts:5](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/ReturnTypes.ts#L5)

___

### ReceiptOrEstimate

Ƭ **ReceiptOrEstimate**<`G`\>: `G` extends ``false`` ? `providers.TransactionResponse` : `BigNumber`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Defined in

[@types/ReturnTypes.ts:2](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/ReturnTypes.ts#L2)

___

### StateMutabilityType

Ƭ **StateMutabilityType**: ``"pure"`` \| ``"view"`` \| ``"nonpayable"`` \| ``"payable"``

#### Defined in

[@types/Contracts.ts:2](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Contracts.ts#L2)

## Variables

### FEE\_HISTORY\_NOT\_SUPPORTED

• `Const` **FEE\_HISTORY\_NOT\_SUPPORTED**: ``"Returned error: Method eth_feeHistory not supported."``

#### Defined in

[utils/Constants.ts:5](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Constants.ts#L5)

___

### GASLIMIT\_DEFAULT

• `Const` **GASLIMIT\_DEFAULT**: ``1000000``

#### Defined in

[utils/Constants.ts:2](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Constants.ts#L2)

___

### LoggerInstance

• `Const` **LoggerInstance**: [`Logger`](classes/Logger.md)

#### Defined in

[utils/Logger.ts:45](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Logger.ts#L45)

___

### MAX\_UINT\_256

• `Const` **MAX\_UINT\_256**: ``"115792089237316195423570985008687907853269984665640564039457584007913129639934"``

#### Defined in

[utils/Constants.ts:3](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Constants.ts#L3)

___

### ProviderInstance

• `Const` **ProviderInstance**: [`Provider`](classes/Provider.md)

#### Defined in

[services/Provider.ts:916](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/services/Provider.ts#L916)

___

### ZERO\_ADDRESS

• `Const` **ZERO\_ADDRESS**: ``"0x0000000000000000000000000000000000000000"``

#### Defined in

[utils/Constants.ts:1](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/Constants.ts#L1)

___

### configHelperNetworks

• `Const` **configHelperNetworks**: [`Config`](classes/Config.md)[]

#### Defined in

[config/ConfigHelper.ts:25](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/ConfigHelper.ts#L25)

___

### minAbi

• `Const` **minAbi**: ({ `anonymous?`: `undefined` = false; `constant`: `boolean` = false; `inputs`: { `name`: `string` = '\_spender'; `type`: `string` = 'address' }[] ; `name`: `string` = 'approve'; `outputs`: { `name`: `string` = ''; `type`: `string` = 'bool' }[] ; `payable`: `boolean` = false; `stateMutability`: `string` = 'nonpayable'; `type`: `string` = 'function' } \| { `anonymous?`: `undefined` = false; `constant?`: `undefined` = false; `inputs?`: `undefined` ; `name?`: `undefined` = 'Approval'; `outputs?`: `undefined` ; `payable`: `boolean` = true; `stateMutability`: `string` = 'payable'; `type`: `string` = 'fallback' } \| { `anonymous`: `boolean` = false; `constant?`: `undefined` = false; `inputs`: { `indexed`: `boolean` = true; `name`: `string` = 'owner'; `type`: `string` = 'address' }[] ; `name`: `string` = 'Approval'; `outputs?`: `undefined` ; `payable?`: `undefined` = true; `stateMutability?`: `undefined` = 'payable'; `type`: `string` = 'event' })[]

#### Defined in

[utils/minAbi.ts:1](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/minAbi.ts#L1)

## Functions

### allowance

▸ **allowance**(`signer`, `tokenAddress`, `account`, `spender`, `tokenDecimals?`): `Promise`<`string`\>

Get Allowance for any Datatoken

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object |
| `tokenAddress` | `string` | The address of the token |
| `account` | `string` | The address of the caller |
| `spender` | `string` | The address of the spender |
| `tokenDecimals?` | `number` | optional number of decimals of the token |

#### Returns

`Promise`<`string`\>

#### Defined in

[utils/TokenUtils.ts:143](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/TokenUtils.ts#L143)

___

### allowanceWei

▸ **allowanceWei**(`signer`, `tokenAddress`, `account`, `spender`): `Promise`<`string`\>

Get Allowance in wei for any erc20

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object |
| `tokenAddress` | `string` | The address of the token |
| `account` | `string` | The address of the caller |
| `spender` | `string` | The address of the spneder |

#### Returns

`Promise`<`string`\>

#### Defined in

[utils/TokenUtils.ts:182](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/TokenUtils.ts#L182)

___

### amountToUnits

▸ **amountToUnits**(`signer`, `token`, `amount`, `tokenDecimals?`): `Promise`<`string`\>

Converts an amount of tokens to units

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object to use. |
| `token` | `string` | The token to convert |
| `amount` | `string` | The amount of tokens to convert |
| `tokenDecimals?` | `number` | The number of decimals of the token |

#### Returns

`Promise`<`string`\>

- The converted amount in units

#### Defined in

[utils/ContractUtils.ts:82](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/ContractUtils.ts#L82)

___

### approve

▸ **approve**<`G`\>(`signer`, `config`, `account`, `tokenAddress`, `spender`, `amount`, `force?`, `tokenDecimals?`, `estimateGas?`): `Promise`<[`ReceiptOrDecimal`](modules.md#receiptordecimal)<`G`\> \| `number`\>

Approve spender to spent amount tokens

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `signer` | `Signer` | `undefined` | The signer object |
| `config` | [`Config`](classes/Config.md) | `undefined` | The config object |
| `account` | `string` | `undefined` | The address of the caller |
| `tokenAddress` | `string` | `undefined` | The address of the token |
| `spender` | `string` | `undefined` | The address of the spender |
| `amount` | `string` | `undefined` | amount of ERC20 Datatokens (always expressed as wei) |
| `force` | `boolean` | `false` | if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed |
| `tokenDecimals?` | `number` | `undefined` | optional number of decimals of the token |
| `estimateGas?` | `G` | `undefined` | if true, returns the estimate gas cost for calling the method |

#### Returns

`Promise`<[`ReceiptOrDecimal`](modules.md#receiptordecimal)<`G`\> \| `number`\>

#### Defined in

[utils/TokenUtils.ts:19](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/TokenUtils.ts#L19)

___

### approveWei

▸ **approveWei**<`G`\>(`signer`, `config`, `account`, `tokenAddress`, `spender`, `amount`, `force?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](modules.md#receiptorestimate)<`G`\>\>

Approve spender to spent amount tokens

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `signer` | `Signer` | `undefined` | The signer object |
| `config` | [`Config`](classes/Config.md) | `undefined` | The config object |
| `account` | `string` | `undefined` | The address of the caller |
| `tokenAddress` | `string` | `undefined` | The address of the token |
| `spender` | `string` | `undefined` | The address of the spender |
| `amount` | `string` | `undefined` | amount of ERC20 tokens (always expressed as wei) |
| `force` | `boolean` | `false` | if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed |
| `estimateGas?` | `G` | `undefined` | if true, returns the estimate gas cost for calling the method |

#### Returns

`Promise`<[`ReceiptOrEstimate`](modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[utils/TokenUtils.ts:63](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/TokenUtils.ts#L63)

___

### balance

▸ **balance**(`signer`, `tokenAddress`, `account`, `tokenDecimals?`): `Promise`<`string`\>

Get balance for any Datatoken

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object |
| `tokenAddress` | `string` | The address of the token |
| `account` | `string` | The address of the caller |
| `tokenDecimals?` | `number` | optional number of decimals of the token |

#### Returns

`Promise`<`string`\>

#### Defined in

[utils/TokenUtils.ts:163](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/TokenUtils.ts#L163)

___

### decimals

▸ **decimals**(`signer`, `tokenAddress`): `Promise`<`number`\>

Get decimals for any Datatoken

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object |
| `tokenAddress` | `string` | The address of the token |

#### Returns

`Promise`<`number`\>

Number of decimals of the token

#### Defined in

[utils/TokenUtils.ts:198](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/TokenUtils.ts#L198)

___

### downloadFile

▸ **downloadFile**(`url`, `index?`): `Promise`<[`DownloadResponse`](interfaces/DownloadResponse.md)\>

Triggers  a file download from the specified URL when called from a browser context.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The URL of the file to download |
| `index?` | `number` | The file index |

#### Returns

`Promise`<[`DownloadResponse`](interfaces/DownloadResponse.md)\>

- A Promise that resolves when the file has been downloaded

#### Defined in

[utils/FetchHelper.ts:35](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/FetchHelper.ts#L35)

___

### downloadFileBrowser

▸ **downloadFileBrowser**(`url`): `Promise`<`void`\>

Triggers  a file download from the specified URL when called from a browser context.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The URL of the file to download |

#### Returns

`Promise`<`void`\>

- A Promise that resolves when the file has been downloaded

#### Defined in

[utils/FetchHelper.ts:9](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/FetchHelper.ts#L9)

___

### generateDid

▸ **generateDid**(`nftAddress`, `chainId`): `string`

Generates a valid DID

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nftAddress` | `string` | The NFT address |
| `chainId` | `number` | The chain ID |

#### Returns

`string`

- The DID

#### Defined in

[utils/DdoHelpers.ts:10](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/DdoHelpers.ts#L10)

___

### generateDtName

▸ **generateDtName**(`wordList?`): `Object`

This function generates a datatoken name and symbol from a given word list.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `wordList?` | `Object` | An object containing an array of nouns and adjectives. |
| `wordList.adjectives` | `string`[] | An array of adjectives. |
| `wordList.nouns` | `string`[] | An array of nouns. |

#### Returns

`Object`

Returns an object containing the generated name and symbol. Produces e.g. "Endemic Jellyfish Token" & "ENDJEL-45"

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `symbol` | `string` |

#### Defined in

[utils/DatatokenName.ts:10](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/DatatokenName.ts#L10)

___

### getErrorMessage

▸ **getErrorMessage**(`error`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Object` |

#### Returns

`string`

#### Defined in

[utils/ProviderErrors.ts:77](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/ProviderErrors.ts#L77)

___

### getEventFromTx

▸ **getEventFromTx**(`txReceipt`, `eventName`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `txReceipt` | `any` |
| `eventName` | `any` |

#### Returns

`any`

#### Defined in

[utils/ContractUtils.ts:96](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/ContractUtils.ts#L96)

___

### getFairGasPrice

▸ **getFairGasPrice**(`signer`, `gasFeeMultiplier`): `Promise`<`string`\>

Asynchronous function that returns a fair gas price based on the current gas price and a multiplier.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object to use for fetching the current gas price. |
| `gasFeeMultiplier` | `number` | The multiplier to apply to the current gas price. If not provided, the current gas price is returned as a string. |

#### Returns

`Promise`<`string`\>

A Promise that resolves to a string representation of the fair gas price.

#### Defined in

[utils/ContractUtils.ts:30](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/ContractUtils.ts#L30)

___

### getHash

▸ **getHash**(`data`): `string`

Returns the SHA256 hash of the input data

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `any` | The input data |

#### Returns

`string`

- The SHA256 hash of the input data

#### Defined in

[utils/DdoHelpers.ts:21](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/DdoHelpers.ts#L21)

___

### getTokenDecimals

▸ **getTokenDecimals**(`signer`, `token`): `Promise`<`any`\>

Asynchronous function that returns the number of decimal places for a given token.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object to use for fetching the token decimals. |
| `token` | `string` | The address of the token contract. |

#### Returns

`Promise`<`any`\>

A Promise that resolves to the number of decimal places for the token.

#### Defined in

[utils/ContractUtils.ts:46](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/ContractUtils.ts#L46)

___

### sendTx

▸ **sendTx**(`estGas`, `signer`, `gasFeeMultiplier`, `functionToSend`, `...args`): `Promise`<`providers.TransactionResponse`\>

Send the transation on chain

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `estGas` | `BigNumber` | estimated gas for the transaction |
| `signer` | `Signer` | signer object |
| `gasFeeMultiplier` | `number` | number represinting the multiplier we apply to gas fees |
| `functionToSend` | `ContractFunction`<`any`\> | function that we need to send |
| `...args` | `any`[] | arguments of the function |

#### Returns

`Promise`<`providers.TransactionResponse`\>

transaction receipt

#### Defined in

[utils/ContractUtils.ts:111](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/ContractUtils.ts#L111)

___

### setContractDefaults

▸ **setContractDefaults**(`contract`, `config`): `Contract`

#### Parameters

| Name | Type |
| :------ | :------ |
| `contract` | `Contract` |
| `config` | [`Config`](classes/Config.md) |

#### Returns

`Contract`

#### Defined in

[utils/ContractUtils.ts:10](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/ContractUtils.ts#L10)

___

### signHash

▸ **signHash**(`signer`, `message`): `Promise`<{ `r`: `string` ; `s`: `string` ; `v`: `string`  }\>

Signs the hash of a message using the provided signer.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer to use for signing the hash. |
| `message` | `string` | The message to sign. |

#### Returns

`Promise`<{ `r`: `string` ; `s`: `string` ; `v`: `string`  }\>

- A Promise that resolves to the signature of the hash of the message.

#### Defined in

[utils/SignatureUtils.ts:9](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/SignatureUtils.ts#L9)

___

### sleep

▸ **sleep**(`ms`): `Promise`<`unknown`\>

Simple blocking sleep function

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `ms` | `number` | Number of miliseconds to wait |

#### Returns

`Promise`<`unknown`\>

#### Defined in

[utils/General.ts:5](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/General.ts#L5)

___

### transfer

▸ **transfer**<`G`\>(`signer`, `config`, `tokenAddress`, `recipient`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](modules.md#receiptorestimate)<`G`\>\>

Moves amount tokens from the caller’s account to recipient.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object |
| `config` | [`Config`](classes/Config.md) | The config object |
| `tokenAddress` | `string` | The address of the token |
| `recipient` | `string` | The address of the tokens receiver |
| `amount` | `string` | amount of ERC20 Datatokens (not as wei) |
| `estimateGas?` | `G` | if true returns the gas estimate |

#### Returns

`Promise`<[`ReceiptOrEstimate`](modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[utils/TokenUtils.ts:111](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/TokenUtils.ts#L111)

___

### unitsToAmount

▸ **unitsToAmount**(`signer`, `token`, `amount`, `tokenDecimals?`): `Promise`<`string`\>

Converts an amount of units to tokens

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | `Signer` | The signer object to use. |
| `token` | `string` | The token to convert |
| `amount` | `string` | The amount of units to convert |
| `tokenDecimals?` | `number` | The number of decimals in the token |

#### Returns

`Promise`<`string`\>

- The converted amount in tokens

#### Defined in

[utils/ContractUtils.ts:59](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/utils/ContractUtils.ts#L59)
