import { allowance, LoggerInstance, ZERO_ADDRESS } from '.'
import Decimal from 'decimal.js'
import Web3 from 'web3'

/**
 * Check allowance of all unique tokens from market on startOrder
 */
export async function getCurrentAllowanceTokens(
  web3: Web3,
  tokens: any,
  address: string,
  consumer: string
) {
  // remove duplicates
  const uniqueTokens = Array.from(new Set(tokens.map((a) => a.token))).map((token) => {
    return tokens.find((a) => a.token === token)
  })

  const getAllowanceTokensPromise = uniqueTokens.map(async (token) => {
    if (token.token === ZERO_ADDRESS || token.feeAmount === 0) return token
    const currentAllowance = await allowance(web3, token.token, address, consumer)
    if (
      new Decimal(currentAllowance).greaterThanOrEqualTo(new Decimal(token.feeAmount))
    ) {
      LoggerInstance.error(`ERROR: Failed checking allowance for token: ${token.token}`)
      throw new Error(`allowance (${currentAllowance}) is too low`)
    } else {
      token.currentAllowance = currentAllowance
      return token
    }
  })

  await Promise.all(getAllowanceTokensPromise)
}
