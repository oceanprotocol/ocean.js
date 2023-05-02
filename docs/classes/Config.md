[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Config

# Class: Config

## Table of contents

### Constructors

- [constructor](Config.md#constructor)

### Properties

- [DFRewards](Config.md#dfrewards)
- [DFStrategyV1](Config.md#dfstrategyv1)
- [authMessage](Config.md#authmessage)
- [authTokenExpiration](Config.md#authtokenexpiration)
- [chainId](Config.md#chainid)
- [datatokensABI](Config.md#datatokensabi)
- [dispenserABI](Config.md#dispenserabi)
- [dispenserAddress](Config.md#dispenseraddress)
- [explorerUri](Config.md#exploreruri)
- [fixedRateExchangeAddress](Config.md#fixedrateexchangeaddress)
- [fixedRateExchangeAddressABI](Config.md#fixedrateexchangeaddressabi)
- [gasFeeMultiplier](Config.md#gasfeemultiplier)
- [metadataCacheUri](Config.md#metadatacacheuri)
- [network](Config.md#network)
- [nftFactoryAddress](Config.md#nftfactoryaddress)
- [nodeUri](Config.md#nodeuri)
- [oceanTokenAddress](Config.md#oceantokenaddress)
- [oceanTokenSymbol](Config.md#oceantokensymbol)
- [opfCommunityFeeCollector](Config.md#opfcommunityfeecollector)
- [parityUri](Config.md#parityuri)
- [providerAddress](Config.md#provideraddress)
- [providerUri](Config.md#provideruri)
- [sideStakingAddress](Config.md#sidestakingaddress)
- [startBlock](Config.md#startblock)
- [subgraphUri](Config.md#subgraphuri)
- [threshold](Config.md#threshold)
- [transactionBlockTimeout](Config.md#transactionblocktimeout)
- [transactionConfirmationBlocks](Config.md#transactionconfirmationblocks)
- [transactionPollingTimeout](Config.md#transactionpollingtimeout)
- [veAllocate](Config.md#veallocate)
- [veDelegation](Config.md#vedelegation)
- [veDelegationProxy](Config.md#vedelegationproxy)
- [veFeeDistributor](Config.md#vefeedistributor)
- [veFeeEstimate](Config.md#vefeeestimate)
- [veOCEAN](Config.md#veocean)
- [verbose](Config.md#verbose)
- [web3Provider](Config.md#web3provider)

## Constructors

### constructor

• **new Config**()

## Properties

### DFRewards

• `Optional` **DFRewards**: `string`

#### Defined in

[config/Config.ts:180](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L180)

___

### DFStrategyV1

• `Optional` **DFStrategyV1**: `string`

#### Defined in

[config/Config.ts:181](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L181)

___

### authMessage

• `Optional` **authMessage**: `string`

Message shown when the user creates its own token.

#### Defined in

[config/Config.ts:105](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L105)

___

### authTokenExpiration

• `Optional` **authTokenExpiration**: `number`

Token expiration time in ms.

#### Defined in

[config/Config.ts:111](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L111)

___

### chainId

• **chainId**: `number`

Chain ID

#### Defined in

[config/Config.ts:125](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L125)

___

### datatokensABI

• `Optional` **datatokensABI**: [`AbiItem`](../interfaces/AbiItem.md) \| [`AbiItem`](../interfaces/AbiItem.md)[]

datatokens ABI

#### Defined in

[config/Config.ts:52](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L52)

___

### dispenserABI

• `Optional` **dispenserABI**: [`AbiItem`](../interfaces/AbiItem.md) \| [`AbiItem`](../interfaces/AbiItem.md)[]

DispenserABI

#### Defined in

[config/Config.ts:76](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L76)

___

### dispenserAddress

• `Optional` **dispenserAddress**: `string`

DispenserAddress

#### Defined in

[config/Config.ts:70](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L70)

___

### explorerUri

• **explorerUri**: `string`

Url of the  blockchain exporer ex: https://etherscan.io

#### Defined in

[config/Config.ts:143](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L143)

___

### fixedRateExchangeAddress

• `Optional` **fixedRateExchangeAddress**: `string`

FixedRateExchangeAddress

#### Defined in

[config/Config.ts:58](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L58)

___

### fixedRateExchangeAddressABI

• `Optional` **fixedRateExchangeAddressABI**: [`AbiItem`](../interfaces/AbiItem.md) \| [`AbiItem`](../interfaces/AbiItem.md)[]

FixedRateExchangeAddressABI

#### Defined in

[config/Config.ts:64](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L64)

___

### gasFeeMultiplier

• **gasFeeMultiplier**: `number`

Specify the multiplier for the gas fee

#### Defined in

[config/Config.ts:173](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L173)

___

### metadataCacheUri

• `Optional` **metadataCacheUri**: `string`

Metadata Store URL.

#### Defined in

[config/Config.ts:21](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L21)

___

### network

• **network**: `string`

Network name ex: mainnet, goerli, polygon

#### Defined in

[config/Config.ts:131](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L131)

___

### nftFactoryAddress

• `Optional` **nftFactoryAddress**: `string`

Factory address

#### Defined in

[config/Config.ts:46](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L46)

___

### nodeUri

• `Optional` **nodeUri**: `string`

Ethereum node URL.

#### Defined in

[config/Config.ts:9](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L9)

___

### oceanTokenAddress

• `Optional` **oceanTokenAddress**: `string`

Ocean Token address

#### Defined in

[config/Config.ts:40](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L40)

___

### oceanTokenSymbol

• **oceanTokenSymbol**: `string`

Ocean toke symbol on the chain, it's used just for convenience to reduce number of calls

#### Defined in

[config/Config.ts:149](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L149)

___

### opfCommunityFeeCollector

• `Optional` **opfCommunityFeeCollector**: `string`

OPFCommunityFeeCollector

#### Defined in

[config/Config.ts:82](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L82)

___

### parityUri

• `Optional` **parityUri**: `string`

Parity config

#### Defined in

[config/Config.ts:117](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L117)

___

### providerAddress

• `Optional` **providerAddress**: `string`

Address of Provider.

#### Defined in

[config/Config.ts:15](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L15)

___

### providerUri

• `Optional` **providerUri**: `string`

Provider URL.

#### Defined in

[config/Config.ts:27](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L27)

___

### sideStakingAddress

• `Optional` **sideStakingAddress**: `string`

SideStaking address

#### Defined in

[config/Config.ts:88](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L88)

___

### startBlock

• `Optional` **startBlock**: `number`

block number of the deployment

#### Defined in

[config/Config.ts:94](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L94)

___

### subgraphUri

• **subgraphUri**: `string`

Url of the relevant subgraph instance ex: https://subgraph.mainnet.oceanprotocol.com

#### Defined in

[config/Config.ts:137](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L137)

___

### threshold

• `Optional` **threshold**: `number`

#### Defined in

[config/Config.ts:119](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L119)

___

### transactionBlockTimeout

• **transactionBlockTimeout**: `number`

Specify the transaction Block Timeout

#### Defined in

[config/Config.ts:155](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L155)

___

### transactionConfirmationBlocks

• **transactionConfirmationBlocks**: `number`

Specify the transaction Confirmation Blocks

#### Defined in

[config/Config.ts:161](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L161)

___

### transactionPollingTimeout

• **transactionPollingTimeout**: `number`

Specify the transaction Polling Blocks Timeout

#### Defined in

[config/Config.ts:167](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L167)

___

### veAllocate

• `Optional` **veAllocate**: `string`

#### Defined in

[config/Config.ts:175](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L175)

___

### veDelegation

• `Optional` **veDelegation**: `string`

#### Defined in

[config/Config.ts:177](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L177)

___

### veDelegationProxy

• `Optional` **veDelegationProxy**: `string`

#### Defined in

[config/Config.ts:179](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L179)

___

### veFeeDistributor

• `Optional` **veFeeDistributor**: `string`

#### Defined in

[config/Config.ts:178](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L178)

___

### veFeeEstimate

• `Optional` **veFeeEstimate**: `string`

#### Defined in

[config/Config.ts:182](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L182)

___

### veOCEAN

• `Optional` **veOCEAN**: `string`

#### Defined in

[config/Config.ts:176](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L176)

___

### verbose

• `Optional` **verbose**: `boolean` \| [`LogLevel`](../enums/LogLevel.md)

Log level.

#### Defined in

[config/Config.ts:99](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L99)

___

### web3Provider

• `Optional` **web3Provider**: `any`

Web3 Provider.

#### Defined in

[config/Config.ts:34](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/config/Config.ts#L34)
