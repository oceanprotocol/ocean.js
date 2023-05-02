[@oceanprotocol/lib](../README.md) / [Exports](../modules.md) / Operation

# Interface: Operation

## Table of contents

### Properties

- [amountsIn](Operation.md#amountsin)
- [amountsOut](Operation.md#amountsout)
- [exchangeIds](Operation.md#exchangeids)
- [marketFeeAddress](Operation.md#marketfeeaddress)
- [maxPrice](Operation.md#maxprice)
- [operation](Operation.md#operation)
- [source](Operation.md#source)
- [swapMarketFee](Operation.md#swapmarketfee)
- [tokenIn](Operation.md#tokenin)
- [tokenOut](Operation.md#tokenout)

## Properties

### amountsIn

• **amountsIn**: `string` \| `number`

when swapExactAmountIn is EXACT amount IN
expressed in Wei

#### Defined in

[@types/Router.ts:31](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Router.ts#L31)

___

### amountsOut

• **amountsOut**: `string` \| `number`

when swapExactAmountIn is MIN amount OUT
expressed in Wei

#### Defined in

[@types/Router.ts:42](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Router.ts#L42)

___

### exchangeIds

• **exchangeIds**: `string`

used for FixedRate or Dispenser

#### Defined in

[@types/Router.ts:6](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Router.ts#L6)

___

### marketFeeAddress

• **marketFeeAddress**: `string`

market fee address to receive fees

#### Defined in

[@types/Router.ts:58](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Router.ts#L58)

___

### maxPrice

• **maxPrice**: `string` \| `number`

max price (only for pools)
expressed in Wei

#### Defined in

[@types/Router.ts:48](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Router.ts#L48)

___

### operation

• **operation**: `number`

operation:
0 - swapExactAmountIn
1 - swapExactAmountOut
2 - FixedRateExchange
3 - Dispenser

#### Defined in

[@types/Router.ts:20](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Router.ts#L20)

___

### source

• **source**: `string`

pool Address

#### Defined in

[@types/Router.ts:11](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Router.ts#L11)

___

### swapMarketFee

• **swapMarketFee**: `string`

swap fee amount

#### Defined in

[@types/Router.ts:53](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Router.ts#L53)

___

### tokenIn

• **tokenIn**: `string`

token in address

#### Defined in

[@types/Router.ts:25](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Router.ts#L25)

___

### tokenOut

• **tokenOut**: `string`

token out address

#### Defined in

[@types/Router.ts:36](https://github.com/oceanprotocol/ocean.js/blob/c99bc5c6/src/@types/Router.ts#L36)
