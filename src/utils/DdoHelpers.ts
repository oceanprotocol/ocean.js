import sha256 from 'crypto-js/sha256'
import Web3 from 'web3'
import { LoggerInstance } from '.'

export function generateDid(erc721Address: string, chainId: number): string {
  erc721Address = Web3.utils.toChecksumAddress(erc721Address)
  const checksum = sha256(erc721Address + chainId.toString(10))
  return `did:op:${checksum.toString()}`
}

export function getHash(data: any): string {
  try {
    return sha256(data).toString()
  } catch (e) {
    LoggerInstance.error('getHash error: ', e.message)
  }
}
