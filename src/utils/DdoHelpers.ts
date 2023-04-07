import sha256 from 'crypto-js/sha256'
import { ethers } from 'ethers'

/**
 * Generates a valid DID
 * @param {string} nftAddress - The NFT address
 * @param {number} chainId - The chain ID
 * @returns {string} - The DID
 */
export function generateDid(nftAddress: string, chainId: number): string {
  nftAddress = ethers.utils.getAddress(nftAddress)
  const checksum = sha256(nftAddress + chainId.toString(10))
  return `did:op:${checksum.toString()}`
}

/**
 * Returns the SHA256 hash of the input data
 * @param {any} data - The input data
 * @returns {string} - The SHA256 hash of the input data
 */
export function getHash(data: any): string {
  return sha256(data).toString()
}
