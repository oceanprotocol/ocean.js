import CryptoJS from 'crypto-js'
import Web3 from 'web3'
import LoggerInstance from './Logger'

export function generateDid(erc721Address: string, chainId: number): string {
  erc721Address = Web3.utils.toChecksumAddress(erc721Address)
  const checksum = CryptoJS.SHA256(erc721Address + chainId.toString(10))
  return `did:op:${checksum.toString()}`
}

export function getHash(data: any): string {
  try {
    return CryptoJS.SHA256(data).toString()
  } catch (e) {
    LoggerInstance.error('getHash error: ', e.message)
  }
}
