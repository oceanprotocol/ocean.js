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

[config/Config.ts:179](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L179)

___

### DFStrategyV1

• `Optional` **DFStrategyV1**: `string`

#### Defined in

[config/Config.ts:180](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L180)

___

### authMessage

• `Optional` **authMessage**: `string`

Message shown when the user creates its own token.

#### Defined in

[config/Config.ts:104](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L104)

___

### authTokenExpiration

• `Optional` **authTokenExpiration**: `number`

Token expiration time in ms.

#### Defined in

[config/Config.ts:110](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L110)

___

### chainId

• **chainId**: `number`

Chain ID

#### Defined in

[config/Config.ts:124](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L124)

___

### datatokensABI

• `Optional` **datatokensABI**: `AbiItem` \| `AbiItem`[]

datatokens ABI

#### Defined in

[config/Config.ts:51](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L51)

___

### dispenserABI

• `Optional` **dispenserABI**: `AbiItem` \| `AbiItem`[]

DispenserABI

#### Defined in

[config/Config.ts:75](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L75)

___

### dispenserAddress

• `Optional` **dispenserAddress**: `string`

DispenserAddress

#### Defined in

[config/Config.ts:69](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L69)

___

### explorerUri

• **explorerUri**: `string`

Url of the  blockchain exporer ex: https://etherscan.io

#### Defined in

[config/Config.ts:142](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L142)

___

### fixedRateExchangeAddress

• `Optional` **fixedRateExchangeAddress**: `string`

FixedRateExchangeAddress

#### Defined in

[config/Config.ts:57](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L57)

___

### fixedRateExchangeAddressABI

• `Optional` **fixedRateExchangeAddressABI**: `AbiItem` \| `AbiItem`[]

FixedRateExchangeAddressABI

#### Defined in

[config/Config.ts:63](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L63)

___

### gasFeeMultiplier

• **gasFeeMultiplier**: `number`

Specify the multiplier for the gas fee

#### Defined in

[config/Config.ts:172](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L172)

___

### metadataCacheUri

• `Optional` **metadataCacheUri**: `string`

Metadata Store URL.

#### Defined in

[config/Config.ts:21](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L21)

___

### network

• **network**: `string`

Network name ex: mainnet, goerli, polygon

#### Defined in

[config/Config.ts:130](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L130)

___

### nftFactoryAddress

• `Optional` **nftFactoryAddress**: `string`

Factory address

#### Defined in

[config/Config.ts:45](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L45)

___

### nodeUri

• `Optional` **nodeUri**: `string`

Ethereum node URL.

#### Defined in

[config/Config.ts:9](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L9)

___

### oceanTokenAddress

• `Optional` **oceanTokenAddress**: `string`

Ocean Token address

#### Defined in

[config/Config.ts:39](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L39)

___

### oceanTokenSymbol

• **oceanTokenSymbol**: `string`

Ocean toke symbol on the chain, it's used just for convenience to reduce number of calls

#### Defined in

[config/Config.ts:148](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L148)

___

### opfCommunityFeeCollector

• `Optional` **opfCommunityFeeCollector**: `string`

OPFCommunityFeeCollector

#### Defined in

[config/Config.ts:81](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L81)

___

### parityUri

• `Optional` **parityUri**: `string`

Parity config

#### Defined in

[config/Config.ts:116](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L116)

___

### providerAddress

• `Optional` **providerAddress**: `string`

Address of Provider.

#### Defined in

[config/Config.ts:15](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L15)

___

### providerUri

• `Optional` **providerUri**: `string`

Provider URL.

#### Defined in

[config/Config.ts:27](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L27)

___

### sideStakingAddress

• `Optional` **sideStakingAddress**: `string`

SideStaking address

#### Defined in

[config/Config.ts:87](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L87)

___

### startBlock

• `Optional` **startBlock**: `number`

block number of the deployment

#### Defined in

[config/Config.ts:93](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L93)

___

### subgraphUri

• **subgraphUri**: `string`

Url of the relevant subgraph instance ex: https://subgraph.mainnet.oceanprotocol.com

#### Defined in

[config/Config.ts:136](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L136)

___

### threshold

• `Optional` **threshold**: `number`

#### Defined in

[config/Config.ts:118](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L118)

___

### transactionBlockTimeout

• **transactionBlockTimeout**: `number`

Specify the transaction Block Timeout

#### Defined in

[config/Config.ts:154](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L154)

___

### transactionConfirmationBlocks

• **transactionConfirmationBlocks**: `number`

Specify the transaction Confirmation Blocks

#### Defined in

[config/Config.ts:160](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L160)

___

### transactionPollingTimeout

• **transactionPollingTimeout**: `number`

Specify the transaction Polling Blocks Timeout

#### Defined in

[config/Config.ts:166](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L166)

___

### veAllocate

• `Optional` **veAllocate**: `string`

#### Defined in

[config/Config.ts:174](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L174)

___

### veDelegation

• `Optional` **veDelegation**: `string`

#### Defined in

[config/Config.ts:176](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L176)

___

### veDelegationProxy

• `Optional` **veDelegationProxy**: `string`

#### Defined in

[config/Config.ts:178](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L178)

___

### veFeeDistributor

• `Optional` **veFeeDistributor**: `string`

#### Defined in

[config/Config.ts:177](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L177)

___

### veFeeEstimate

• `Optional` **veFeeEstimate**: `string`

#### Defined in

[config/Config.ts:181](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L181)

___

### veOCEAN

• `Optional` **veOCEAN**: `string`

#### Defined in

[config/Config.ts:175](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L175)

___

### verbose

• `Optional` **verbose**: `boolean` \| [`LogLevel`](../enums/LogLevel.md)

Log level.

#### Defined in

[config/Config.ts:98](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L98)

___

### web3Provider

• `Optional` **web3Provider**: `any`

Web3 Provider.

#### Defined in

[config/Config.ts:33](https://github.com/oceanprotocol/ocean.js/blob/fbcd13ac/src/config/Config.ts#L33)
