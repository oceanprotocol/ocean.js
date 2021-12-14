import sha256 from 'crypto-js/sha256'
import Web3 from 'web3'

export function generateDid(erc721Address: string, chainId: number): string {
  erc721Address = Web3.utils.toChecksumAddress(erc721Address)
  const checksum = sha256(erc721Address + chainId)
  return checksum.toString()
}
