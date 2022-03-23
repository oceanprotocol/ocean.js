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
    // Experiments to be deleted later
    /* 
    console.log('getHash data: ', data)
    const sha = CryptoJS.SHA256(data).toString()
    console.log('sha: ', sha)
    CryptoJS.enc.Base64.
    const data = CryptoJS.enc.Utf8.parse(shaData)
    const parsed = CryptoJS.enc.Utf8.parse(sha)
    console.log('parsed: ', parsed)
    console.log('result: ', CryptoJS.enc.Utf8.stringify(parsed))

    console.log('initial sha: ', CryptoJS.SHA256(data))

    const encodedWord = CryptoJS.enc.Utf8.parse(data)
    const encoded = CryptoJS.enc.Base64.stringify(encodedWord)
    let wordArray = CryptoJS.SHA256(data)
    console.log('wordArray: ', wordArray)
    let base64 = CryptoJS.enc.Base64.p(wordArray)
    return
    let str = wordArray.toString(CryptoJS.enc.Utf8)
    console.log('str: ', str)
    console.log('result: ', CryptoJS.SHA256(str).toString())
    return str
    */
    return CryptoJS.SHA256(data).toString()
  } catch (e) {
    LoggerInstance.error('getHash error: ', e.message)
  }
}
