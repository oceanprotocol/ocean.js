import { LoggerInstance } from './Logger'

// Ox transformer
export const zeroX = (input: string) => zeroXTransformer(input, true)
export const noZeroX = (input: string) => zeroXTransformer(input, false)
export function zeroXTransformer(input: string = '', zeroOutput: boolean) {
    const { valid, output } = inputMatch(
        input,
        /^(?:0x)*([a-f0-9]+)$/i,
        'zeroXTransformer'
    )
    return (zeroOutput && valid ? '0x' : '') + output
}

// did:op: transformer
export const didPrefixed = (input: string) => didTransformer(input, true)
export const noDidPrefixed = (input: string) => didTransformer(input, false)
export function didTransformer(input: string = '', prefixOutput: boolean) {
    const { valid, output } = inputMatch(
        input,
        /^(?:0x|did:op:)*([a-f0-9]{64})$/i,
        'didTransformer'
    )
    return (prefixOutput && valid ? 'did:op:' : '') + output
}

// 0x + did:op: transformer
export const didZeroX = (input: string) => zeroX(didTransformer(input, false))

// Shared functions
function inputMatch(
    input: string,
    regexp: RegExp,
    conversorName: string
): { valid: boolean; output: string } {
    if (typeof input !== 'string') {
        LoggerInstance.debug('Not input string:')
        LoggerInstance.debug(input)
        throw new Error(`[${conversorName}] Expected string, input type: ${typeof input}`)
    }
    const match = input.match(regexp)
    if (!match) {
        LoggerInstance.warn(`[${conversorName}] Input transformation failed.`)
        return { valid: false, output: input }
    }
    return { valid: true, output: match[1] }
}
