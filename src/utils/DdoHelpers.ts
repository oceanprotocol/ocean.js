import sha256 from 'crypto-js/sha256'
import { ethers } from 'ethers'

export function generateDid(nftAddress: string, chainId: number): string {
  nftAddress = ethers.utils.getAddress(nftAddress)
  const checksum = sha256(nftAddress + chainId.toString(10))
  return `did:op:${checksum.toString()}`
}

export function getHash(data: any): string {
  return sha256(data).toString()
}
