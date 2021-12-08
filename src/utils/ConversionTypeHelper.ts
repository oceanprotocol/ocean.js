import { LoggerInstance } from './Logger'

export const zeroX = (input: string): string => zeroXTransformer(input, true)
export const noZeroX = (input: string): string => zeroXTransformer(input, false)
export function zeroXTransformer(input = '', zeroOutput: boolean): string {
  const { valid, output } = inputMatch(input, /^(?:0x)*([a-f0-9]+)$/i, 'zeroXTransformer')
  return (zeroOutput && valid ? '0x' : '') + output
}

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
