import Web3 from 'web3'
import { LoggerInstance } from './Logger'

export async function signText(
  web3: Web3,
  text: string,
  publicKey: string,
  password?: string
): Promise<string> {
  const isMetaMask =
    web3 && web3.currentProvider && (web3.currentProvider as any).isMetaMask
  try {
    return await web3.eth.personal.sign(text, publicKey, password)
  } catch (e) {
    if (isMetaMask) {
      throw e
    }
    LoggerInstance.warn('Error on personal sign.')
    LoggerInstance.warn(e)
    try {
      return await web3.eth.sign(text, publicKey)
    } catch (e2) {
      LoggerInstance.error('Error on sign.')
      LoggerInstance.error(e2)
      throw new Error('Error executing personal sign')
    }
  }
}

export async function signHash(web3: Web3, message: string, address: string) {
  let signedMessage = await web3.eth.sign(message, address)
  signedMessage = signedMessage.substr(2) // remove 0x
  const r = '0x' + signedMessage.slice(0, 64)
  const s = '0x' + signedMessage.slice(64, 128)
  let v = '0x' + signedMessage.slice(128, 130)
  // make sure we obey 27 and 28 standards
  if (v === '0x00') v = '0x1b'
  if (v === '0x01') v = '0x1c'
  return { v, r, s }
}

export async function signWithHash(
  web3: Web3,
  text: string,
  publicKey: string,
  password?: string
): Promise<string> {
  const hash = web3.utils.utf8ToHex(text)
  const isMetaMask =
    web3 && web3.currentProvider && (web3.currentProvider as any).isMetaMask
  try {
    return await web3.eth.personal.sign(hash, publicKey, password)
  } catch (e) {
    if (isMetaMask) {
      throw e
    }
    LoggerInstance.warn('Error on personal sign.')
    LoggerInstance.warn(e)
    try {
      return await web3.eth.sign(hash, publicKey)
    } catch (e2) {
      LoggerInstance.error('Error on sign.')
      LoggerInstance.error(e2)
      throw new Error('Error executing personal sign')
    }
  }
}
