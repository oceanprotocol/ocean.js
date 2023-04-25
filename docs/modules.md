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

- [ComputeResultType](modules.md#computeresulttype)
- [ReceiptOrEstimate](modules.md#receiptorestimate)

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
- [calculateEstimatedGas](modules.md#calculateestimatedgas)
- [decimals](modules.md#decimals)
- [downloadFile](modules.md#downloadfile)
- [downloadFileBrowser](modules.md#downloadfilebrowser)
- [generateDid](modules.md#generatedid)
- [generateDtName](modules.md#generatedtname)
- [getFairGasPrice](modules.md#getfairgasprice)
- [getHash](modules.md#gethash)
- [sendTx](modules.md#sendtx)
- [setContractDefaults](modules.md#setcontractdefaults)
- [signHash](modules.md#signhash)
- [sleep](modules.md#sleep)
- [transfer](modules.md#transfer)
- [unitsToAmount](modules.md#unitstoamount)

## Type Aliases

### ComputeResultType

Ƭ **ComputeResultType**: ``"algorithmLog"`` \| ``"output"`` \| ``"configrationLog"`` \| ``"publishLog"``

#### Defined in

[@types/Compute.ts:3](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/@types/Compute.ts#L3)

___

### ReceiptOrEstimate

Ƭ **ReceiptOrEstimate**<`G`\>: `G` extends ``false`` ? `TransactionReceipt` : `number`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Defined in

[@types/ReturnTypes.ts:3](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/@types/ReturnTypes.ts#L3)

## Variables

### FEE\_HISTORY\_NOT\_SUPPORTED

• `Const` **FEE\_HISTORY\_NOT\_SUPPORTED**: ``"Returned error: Method eth_feeHistory not supported."``

#### Defined in

[utils/Constants.ts:5](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/Constants.ts#L5)

___

### GASLIMIT\_DEFAULT

• `Const` **GASLIMIT\_DEFAULT**: ``1000000``

#### Defined in

[utils/Constants.ts:2](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/Constants.ts#L2)

___

### LoggerInstance

• `Const` **LoggerInstance**: [`Logger`](classes/Logger.md)

#### Defined in

[utils/Logger.ts:45](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/Logger.ts#L45)

___

### MAX\_UINT\_256

• `Const` **MAX\_UINT\_256**: ``"115792089237316195423570985008687907853269984665640564039457584007913129639934"``

#### Defined in

[utils/Constants.ts:3](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/Constants.ts#L3)

___

### ProviderInstance

• `Const` **ProviderInstance**: [`Provider`](classes/Provider.md)

#### Defined in

[services/Provider.ts:804](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/services/Provider.ts#L804)

___

### ZERO\_ADDRESS

• `Const` **ZERO\_ADDRESS**: ``"0x0000000000000000000000000000000000000000"``

#### Defined in

[utils/Constants.ts:1](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/Constants.ts#L1)

___

### configHelperNetworks

• `Const` **configHelperNetworks**: [`Config`](classes/Config.md)[]

#### Defined in

[config/ConfigHelper.ts:25](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/ConfigHelper.ts#L25)

___

### minAbi

• `Const` **minAbi**: `AbiItem`[]

#### Defined in

[utils/minAbi.ts:3](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/minAbi.ts#L3)

## Functions

### allowance

▸ **allowance**(`web3`, `tokenAddress`, `account`, `spender`, `tokenDecimals?`): `Promise`<`string`\>

Get Allowance for any Datatoken

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `web3` | `default` |  |
| `tokenAddress` | `string` | - |
| `account` | `string` |  |
| `spender` | `string` |  |
| `tokenDecimals?` | `number` | optional number of decimals of the token |

#### Returns

`Promise`<`string`\>

#### Defined in

[utils/TokenUtils.ts:170](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/TokenUtils.ts#L170)

___

### allowanceWei

▸ **allowanceWei**(`web3`, `tokenAddress`, `account`, `spender`): `Promise`<`string`\>

Get Allowance for any erc20

#### Parameters

| Name | Type |
| :------ | :------ |
| `web3` | `default` |
| `tokenAddress` | `string` |
| `account` | `string` |
| `spender` | `string` |

#### Returns

`Promise`<`string`\>

#### Defined in

[utils/TokenUtils.ts:210](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/TokenUtils.ts#L210)

___

### amountToUnits

▸ **amountToUnits**(`web3`, `token`, `amount`, `tokenDecimals?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `web3` | `default` |
| `token` | `string` |
| `amount` | `string` |
| `tokenDecimals?` | `number` |

#### Returns

`Promise`<`string`\>

#### Defined in

[utils/ContractUtils.ts:57](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/ContractUtils.ts#L57)

___

### approve

▸ **approve**<`G`\>(`web3`, `config`, `account`, `tokenAddress`, `spender`, `amount`, `force?`, `tokenDecimals?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](modules.md#receiptorestimate)<`G`\>\>

Approve spender to spent amount tokens

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `web3` | `default` | `undefined` |  |
| `config` | [`Config`](classes/Config.md) | `undefined` |  |
| `account` | `string` | `undefined` |  |
| `tokenAddress` | `string` | `undefined` |  |
| `spender` | `string` | `undefined` |  |
| `amount` | `string` | `undefined` | amount of ERC20 Datatokens (always expressed as wei) |
| `force` | `boolean` | `false` | if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed |
| `tokenDecimals?` | `number` | `undefined` | optional number of decimals of the token |
| `estimateGas?` | `G` | `undefined` | if true, returns the estimate gas cost for calling the method |

#### Returns

`Promise`<[`ReceiptOrEstimate`](modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[utils/TokenUtils.ts:27](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/TokenUtils.ts#L27)

___

### approveWei

▸ **approveWei**<`G`\>(`web3`, `config`, `account`, `tokenAddress`, `spender`, `amount`, `force?`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](modules.md#receiptorestimate)<`G`\>\>

Approve spender to spent amount tokens

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `web3` | `default` | `undefined` |  |
| `config` | [`Config`](classes/Config.md) | `undefined` |  |
| `account` | `string` | `undefined` |  |
| `tokenAddress` | `string` | `undefined` |  |
| `spender` | `string` | `undefined` |  |
| `amount` | `string` | `undefined` | amount of ERC20 tokens (always expressed as wei) |
| `force` | `boolean` | `false` | if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed |
| `estimateGas?` | `G` | `undefined` | if true, returns the estimate gas cost for calling the method |

#### Returns

`Promise`<[`ReceiptOrEstimate`](modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[utils/TokenUtils.ts:77](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/TokenUtils.ts#L77)

___

### balance

▸ **balance**(`web3`, `tokenAddress`, `account`, `tokenDecimals?`): `Promise`<`string`\>

Get balance for any Datatoken

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `web3` | `default` |  |
| `tokenAddress` | `string` | - |
| `account` | `string` | - |
| `tokenDecimals?` | `number` | optional number of decimals of the token |

#### Returns

`Promise`<`string`\>

#### Defined in

[utils/TokenUtils.ts:191](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/TokenUtils.ts#L191)

___

### calculateEstimatedGas

▸ **calculateEstimatedGas**(`from`, `functionToEstimateGas`, `...args`): `Promise`<`number`\>

Estimates the gas used when a function would be executed on chain

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `from` | `string` | account that calls the function |
| `functionToEstimateGas` | `Function` | function that we need to estimate the gas |
| `...args` | `any`[] | arguments of the function |

#### Returns

`Promise`<`number`\>

gas cost of the function

#### Defined in

[utils/ContractUtils.ts:83](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/ContractUtils.ts#L83)

___

### decimals

▸ **decimals**(`web3`, `tokenAddress`): `Promise`<`number`\>

Get decimals for any Datatoken

#### Parameters

| Name | Type |
| :------ | :------ |
| `web3` | `default` |
| `tokenAddress` | `string` |

#### Returns

`Promise`<`number`\>

Number of decimals of the token

#### Defined in

[utils/TokenUtils.ts:226](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/TokenUtils.ts#L226)

___

### downloadFile

▸ **downloadFile**(`url`, `index?`): `Promise`<[`DownloadResponse`](interfaces/DownloadResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `index?` | `number` |

#### Returns

`Promise`<[`DownloadResponse`](interfaces/DownloadResponse.md)\>

#### Defined in

[utils/FetchHelper.ts:24](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/FetchHelper.ts#L24)

___

### downloadFileBrowser

▸ **downloadFileBrowser**(`url`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[utils/FetchHelper.ts:4](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/FetchHelper.ts#L4)

___

### generateDid

▸ **generateDid**(`nftAddress`, `chainId`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `nftAddress` | `string` |
| `chainId` | `number` |

#### Returns

`string`

#### Defined in

[utils/DdoHelpers.ts:4](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/DdoHelpers.ts#L4)

___

### generateDtName

▸ **generateDtName**(`wordList?`): `Object`

Generate new datatoken name & symbol from a word list

#### Parameters

| Name | Type |
| :------ | :------ |
| `wordList?` | `Object` |
| `wordList.adjectives` | `string`[] |
| `wordList.nouns` | `string`[] |

#### Returns

`Object`

datatoken name & symbol. Produces e.g. "Endemic Jellyfish Token" & "ENDJEL-45"

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `symbol` | `string` |

#### Defined in

[utils/DatatokenName.ts:7](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/DatatokenName.ts#L7)

___

### getFairGasPrice

▸ **getFairGasPrice**(`web3`, `gasFeeMultiplier`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `web3` | `default` |
| `gasFeeMultiplier` | `number` |

#### Returns

`Promise`<`string`\>

#### Defined in

[utils/ContractUtils.ts:24](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/ContractUtils.ts#L24)

___

### getHash

▸ **getHash**(`data`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `any` |

#### Returns

`string`

#### Defined in

[utils/DdoHelpers.ts:10](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/DdoHelpers.ts#L10)

___

### sendTx

▸ **sendTx**(`from`, `estGas`, `web3`, `gasFeeMultiplier`, `functionToSend`, `...args`): `Promise`<`TransactionReceipt`\>

Send the transation on chain

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `from` | `string` | account that calls the function |
| `estGas` | `number` | estimated gas for the transaction |
| `web3` | `default` | web3 objcet |
| `gasFeeMultiplier` | `number` | - |
| `functionToSend` | `Function` | function that we need to send |
| `...args` | `any`[] | arguments of the function |

#### Returns

`Promise`<`TransactionReceipt`\>

transaction receipt

#### Defined in

[utils/ContractUtils.ts:103](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/ContractUtils.ts#L103)

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

[utils/ContractUtils.ts:12](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/ContractUtils.ts#L12)

___

### signHash

▸ **signHash**(`web3`, `message`, `address`): `Promise`<{ `r`: `string` ; `s`: `string` ; `v`: `string`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `web3` | `default` |
| `message` | `string` |
| `address` | `string` |

#### Returns

`Promise`<{ `r`: `string` ; `s`: `string` ; `v`: `string`  }\>

#### Defined in

[utils/SignatureUtils.ts:3](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/SignatureUtils.ts#L3)

___

### sleep

▸ **sleep**(`ms`): `Promise`<`unknown`\>

Simple blocking sleep function

#### Parameters

| Name | Type |
| :------ | :------ |
| `ms` | `number` |

#### Returns

`Promise`<`unknown`\>

#### Defined in

[utils/General.ts:4](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/General.ts#L4)

___

### transfer

▸ **transfer**<`G`\>(`web3`, `config`, `account`, `tokenAddress`, `recipient`, `amount`, `estimateGas?`): `Promise`<[`ReceiptOrEstimate`](modules.md#receiptorestimate)<`G`\>\>

Moves amount tokens from the caller’s account to recipient.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `G` | extends `boolean` = ``false`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `web3` | `default` | - |
| `config` | [`Config`](classes/Config.md) | - |
| `account` | `string` |  |
| `tokenAddress` | `string` |  |
| `recipient` | `string` |  |
| `amount` | `string` | amount of ERC20 Datatokens (not as wei) |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<[`ReceiptOrEstimate`](modules.md#receiptorestimate)<`G`\>\>

#### Defined in

[utils/TokenUtils.ts:130](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/TokenUtils.ts#L130)

___

### unitsToAmount

▸ **unitsToAmount**(`web3`, `token`, `amount`, `tokenDecimals?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `web3` | `default` |
| `token` | `string` |
| `amount` | `string` |
| `tokenDecimals?` | `number` |

#### Returns

`Promise`<`string`\>

#### Defined in

[utils/ContractUtils.ts:37](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/utils/ContractUtils.ts#L37)
