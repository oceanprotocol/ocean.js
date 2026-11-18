import { deriveDid, hashSerializedDdo } from '@oceanprotocol/ddo-js'

/**
 * Generates a valid DID
 * @param {string} nftAddress - The NFT address
 * @param {number} chainId - The chain ID
 * @returns {string} - The DID
 */
export function generateDid(nftAddress: string, chainId: number): string {
  return deriveDid(nftAddress, chainId, '4')
}

/**
 * Returns the SHA256 hash of the input data
 * @param {any} data - The input data
 * @returns {string} - The SHA256 hash of the input data
 */
export function getHash(data: any): string {
  return hashSerializedDdo(String(data), 'json-utf8').slice(2)
}
