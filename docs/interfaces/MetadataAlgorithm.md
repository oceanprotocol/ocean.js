[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / MetadataAlgorithm

# Interface: MetadataAlgorithm

## Table of contents

### Properties

- [container](MetadataAlgorithm.md#container)
- [language](MetadataAlgorithm.md#language)
- [rawcode](MetadataAlgorithm.md#rawcode)
- [version](MetadataAlgorithm.md#version)

## Properties

### container

• **container**: `Object`

Object describing the Docker container image.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `checksum` | `string` | Checksum of the Docker image. |
| `entrypoint` | `string` | The command to execute, or script to run inside the Docker image. |
| `image` | `string` | Name of the Docker image. |
| `tag` | `string` | Tag of the Docker image. |

#### Defined in

[@types/DDO/Metadata.ts:24](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L24)

___

### language

• `Optional` **language**: `string`

Programming language used to implement the software.

#### Defined in

[@types/DDO/Metadata.ts:6](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L6)

___

### rawcode

• `Optional` **rawcode**: `string`

Rawcode

#### Defined in

[@types/DDO/Metadata.ts:18](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L18)

___

### version

• `Optional` **version**: `string`

Version of the software preferably in SemVer notation.

#### Defined in

[@types/DDO/Metadata.ts:12](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/DDO/Metadata.ts#L12)
