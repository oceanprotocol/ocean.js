/**
 * Mapping of `chainId` -> list of smart contract addresses on that chain.
 */
export interface AccessList {
  [chainId: string]: string[]
}
