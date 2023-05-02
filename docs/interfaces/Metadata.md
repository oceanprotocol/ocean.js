[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Metadata

# Interface: Metadata

## Table of contents

### Properties

- [additionalInformation](Metadata.md#additionalinformation)
- [algorithm](Metadata.md#algorithm)
- [author](Metadata.md#author)
- [categories](Metadata.md#categories)
- [contentLanguage](Metadata.md#contentlanguage)
- [copyrightHolder](Metadata.md#copyrightholder)
- [created](Metadata.md#created)
- [description](Metadata.md#description)
- [license](Metadata.md#license)
- [links](Metadata.md#links)
- [name](Metadata.md#name)
- [tags](Metadata.md#tags)
- [type](Metadata.md#type)
- [updated](Metadata.md#updated)

## Properties

### additionalInformation

• `Optional` **additionalInformation**: `any`

Stores additional information, this is customizable by publisher

#### Defined in

[@types/DDO/Metadata.ts:137](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L137)

___

### algorithm

• `Optional` **algorithm**: [`MetadataAlgorithm`](MetadataAlgorithm.md)

Information about asset of type algorithm. Required for algorithm assets.

#### Defined in

[@types/DDO/Metadata.ts:131](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L131)

___

### author

• **author**: `string`

Name of the entity generating this data (e.g. Tfl, Disney Corp, etc.).

#### Defined in

[@types/DDO/Metadata.ts:87](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L87)

___

### categories

• `Optional` **categories**: `string`[]

Array of categories associated to the asset. Note: recommended to use tags instead of this.

#### Defined in

[@types/DDO/Metadata.ts:113](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L113)

___

### contentLanguage

• `Optional` **contentLanguage**: `string`

The language of the content. Use one of the language codes from the IETF BCP 47 standard

#### Defined in

[@types/DDO/Metadata.ts:125](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L125)

___

### copyrightHolder

• `Optional` **copyrightHolder**: `string`

The party holding the legal copyright. Empty by default.

#### Defined in

[@types/DDO/Metadata.ts:119](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L119)

___

### created

• **created**: `string`

Contains the date of publishing in ISO Date Time

#### Defined in

[@types/DDO/Metadata.ts:56](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L56)

___

### description

• **description**: `string`

Details of what the resource is.

#### Defined in

[@types/DDO/Metadata.ts:74](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L74)

___

### license

• **license**: `string`

Short name referencing the license of the asset.
If it’s not specified, the following value will be added: “No License Specified”.

#### Defined in

[@types/DDO/Metadata.ts:94](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L94)

___

### links

• `Optional` **links**: `string`[]

Mapping of URL strings for data samples, or links to find out more information.
Links may be to either a URL or another asset.

#### Defined in

[@types/DDO/Metadata.ts:101](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L101)

___

### name

• **name**: `string`

Descriptive name or title of the asset.

#### Defined in

[@types/DDO/Metadata.ts:68](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L68)

___

### tags

• `Optional` **tags**: `string`[]

Array of keywords or tags used to describe this content. Empty by default.

#### Defined in

[@types/DDO/Metadata.ts:107](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L107)

___

### type

• **type**: ``"dataset"`` \| ``"algorithm"``

Asset type. Includes "dataset" (e.g. csv file), "algorithm" (e.g. Python script).
Each type needs a different subset of metadata attributes.

#### Defined in

[@types/DDO/Metadata.ts:81](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L81)

___

### updated

• **updated**: `string`

Contains the the date of last update in ISO Date Time

#### Defined in

[@types/DDO/Metadata.ts:62](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L62)
