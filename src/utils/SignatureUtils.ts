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
