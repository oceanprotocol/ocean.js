[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / EscrowContract

# Class: EscrowContract

Manages escrow payments for C2D jobs - handles deposits, locks, and authorizations.

## Hierarchy

- [`SmartContractWithAddress`](SmartContractWithAddress.md)

  ↳ **`EscrowContract`**

## Table of contents

### Constructors

- [constructor](Escrow.md#constructor)

### Methods

- [getFunds](Escrow.md#getfunds)
- [getUserFunds](Escrow.md#getuserfunds)
- [getUserTokens](Escrow.md#getusertokens)
- [getLocks](Escrow.md#getlocks)
- [getAuthorizations](Escrow.md#getauthorizations)
- [verifyFundsForEscrowPayment](Escrow.md#verifyfundsforescrowpayment)
- [deposit](Escrow.md#deposit)
- [withdraw](Escrow.md#withdraw)
- [authorize](Escrow.md#authorize)

## Constructors

### constructor

• **new EscrowContract**(`address`, `signer`, `network?`, `config?`, `abi?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signer` | `Signer` |
| `network?` | `string` \| `number` |
| `config?` | [`Config`](Config.md) |
| `abi?` | [`AbiItem`](../interfaces/AbiItem.md)[] |

#### Inherited from

[SmartContractWithAddress](SmartContractWithAddress.md).[constructor](SmartContractWithAddress.md#constructor)

#### Defined in

[contracts/Escrow.ts:26](https://github.com/oceanprotocol/ocean.js/blob/main/src/contracts/Escrow.ts#L26)

## Methods

### getFunds

▸ **getFunds**(`token`): `Promise`<`{available: bigint, locked: bigint}`\>

Get total funds in escrow for a token

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | token address |

#### Returns

`Promise`<`{available: bigint, locked: bigint}`\>

Object with `available` and `locked` amounts

#### Defined in

[contracts/Escrow.ts:41](https://github.com/oceanprotocol/ocean.js/blob/main/src/contracts/Escrow.ts#L41)

___

### getUserFunds

▸ **getUserFunds**(`payer`, `token`): `Promise`<`{available: bigint, locked: bigint}`\>

Get user's available escrow balance

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payer` | `string` | user address |
| `token` | `string` | token address |

#### Returns

`Promise`<`{available: bigint, locked: bigint}`\>

Object with `available` and `locked` amounts for this user/token pair

#### Defined in

[contracts/Escrow.ts:49](https://github.com/oceanprotocol/ocean.js/blob/main/src/contracts/Escrow.ts#L49)

___

### getUserTokens

▸ **getUserTokens**(`payer`): `Promise`<`string[]`\>

Get list of tokens user has deposited

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payer` | `string` | user address |

#### Returns

`Promise`<`string[]`\>

Array of token addresses this user has deposited

#### Defined in

[contracts/Escrow.ts:57](https://github.com/oceanprotocol/ocean.js/blob/main/src/contracts/Escrow.ts#L57)

___

### getLocks

▸ **getLocks**(`token`, `payer`, `payee`): `Promise`<`Lock[]`\>

Get active payment locks

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | token address |
| `payer` | `string` | payer address |
| `payee` | `string` | payee address |

#### Returns

`Promise`<`Lock[]`\>

Array of locks where each lock contains: `{jobId, payer, payee, amount, expiry, token}`

#### Defined in

[contracts/Escrow.ts:65](https://github.com/oceanprotocol/ocean.js/blob/main/src/contracts/Escrow.ts#L65)

___

### getAuthorizations

▸ **getAuthorizations**(`token`, `payer`, `payee`): `Promise`<`Authorization[]`\>

Get payment authorizations

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | token address |
| `payer` | `string` | payer address |
| `payee` | `string` | payee address |

#### Returns

`Promise`<`Authorization[]`\>

Array of authorizations where each contains: `{payee, maxLockedAmount, currentLockedAmount, maxLockSeconds, maxLockCounts, currentLocks}`

#### Defined in

[contracts/Escrow.ts:73](https://github.com/oceanprotocol/ocean.js/blob/main/src/contracts/Escrow.ts#L73)

___

### verifyFundsForEscrowPayment

▸ **verifyFundsForEscrowPayment**(`token`, `consumerAddress`, `amountToDeposit?`, `maxLockedAmount?`, `maxLockSeconds?`, `maxLockCounts?`): `Promise`<`ValidationResponse`\>

Checks if you have enough funds, authorizes and deposits if needed - all in one call

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | payment token |
| `consumerAddress` | `string` | compute environment consumer address |
| `amountToDeposit?` | `string` | how much to deposit (optional) |
| `maxLockedAmount?` | `string` | max amount for compute job |
| `maxLockSeconds?` | `string` | max lock duration |
| `maxLockCounts?` | `string` | max number of locks |

#### Returns

`Promise`<`ValidationResponse`\>

validation status

#### Defined in

[contracts/Escrow.ts:98](https://github.com/oceanprotocol/ocean.js/blob/main/src/contracts/Escrow.ts#L98)

___

### deposit

▸ **deposit**<`G`\>(`token`, `amount`, `estimateGas?`): `Promise`<`ReceiptOrEstimate`<`G`\>\>

Deposit tokens into escrow

#### Parameters

| Name | Type |
| :------ | :------ |
| `token` | `string` |
| `amount` | `string` |
| `estimateGas?` | `G` |

#### Returns

`Promise`<`ReceiptOrEstimate`<`G`\>\>

#### Defined in

[contracts/Escrow.ts:191](https://github.com/oceanprotocol/ocean.js/blob/main/src/contracts/Escrow.ts#L191)

___

### withdraw

▸ **withdraw**<`G`\>(`tokens`, `amounts`, `estimateGas?`): `Promise`<`ReceiptOrEstimate`<`G`\>\>

Withdraw tokens from escrow

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `tokens` | `string[]` | array of token addresses |
| `amounts` | `string[]` | array of amounts to withdraw |
| `estimateGas?` | `G` | - |

#### Returns

`Promise`<`ReceiptOrEstimate`<`G`\>\>

#### Defined in

[contracts/Escrow.ts:217](https://github.com/oceanprotocol/ocean.js/blob/main/src/contracts/Escrow.ts#L217)

___

### authorize

▸ **authorize**<`G`\>(`token`, `payee`, `maxLockedAmount`, `maxLockSeconds`, `maxLockCounts`, `estimateGas?`): `Promise`<`ReceiptOrEstimate`<`G`\>\>

Authorize someone to lock your funds

#### Parameters

| Name | Type |
| :------ | :------ |
| `token` | `string` |
| `payee` | `string` |
| `maxLockedAmount` | `string` |
| `maxLockSeconds` | `string` |
| `maxLockCounts` | `string` |
| `estimateGas?` | `G` |

#### Returns

`Promise`<`ReceiptOrEstimate`<`G`\>\>

#### Defined in

[contracts/Escrow.ts:274](https://github.com/oceanprotocol/ocean.js/blob/main/src/contracts/Escrow.ts#L274)

___

