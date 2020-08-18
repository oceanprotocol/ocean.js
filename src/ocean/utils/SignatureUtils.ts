import Web3 from 'web3'
import { Logger } from '../../utils'
import { Account } from '../../lib'

export class SignatureUtils {
  private web3: Web3
  private logger: Logger

  constructor(web3: Web3, logger: Logger) {
    this.web3 = web3
    this.logger = logger
  }

  public async signText(
    text: string,
    publicKey: string,
    password?: string
  ): Promise<string> {
    const isMetaMask =
      this.web3 &&
      this.web3.currentProvider &&
      (this.web3.currentProvider as any).isMetaMask
    try {
      return await this.web3.eth.personal.sign(text, publicKey, password)
    } catch (e) {
      if (isMetaMask) {
        throw e
      }
      this.logger.warn('Error on personal sign.')
      this.logger.warn(e)
      try {
        return await this.web3.eth.sign(text, publicKey)
      } catch (e2) {
        this.logger.error('Error on sign.')
        this.logger.error(e2)
        throw new Error('Error executing personal sign')
      }
    }
  }

  public async signWithHash(
    text: string,
    publicKey: string,
    password?: string
  ): Promise<string> {
    const hash = this.web3.utils.utf8ToHex(text)
    const isMetaMask =
      this.web3 &&
      this.web3.currentProvider &&
      (this.web3.currentProvider as any).isMetaMask
    try {
      return await this.web3.eth.personal.sign(hash, publicKey, password)
    } catch (e) {
      if (isMetaMask) {
        throw e
      }
      this.logger.warn('Error on personal sign.')
      this.logger.warn(e)
      try {
        return await this.web3.eth.sign(hash, publicKey)
      } catch (e2) {
        this.logger.error('Error on sign.')
        this.logger.error(e2)
        throw new Error('Error executing personal sign')
      }
    }
  }

  public async verifyText(text: string, signature: string): Promise<string> {
    return this.web3.eth.personal.ecRecover(text, signature)
  }

  public async getHash(message: string): Promise<string> {
    let hex = ''
    for (let i = 0; i < message.length; i++) {
      hex += '' + message.charCodeAt(i).toString(16)
    }
    const hexMessage = '0x' + hex
    return hexMessage as string
  }

  public async signForAquarius(message: string, account: Account): Promise<string> {
    const hash = await this.getHash(message)
    const isMetaMask =
      this.web3 &&
      this.web3.currentProvider &&
      (this.web3.currentProvider as any).isMetaMask
    try {
      return this.web3.eth.personal.sign(hash, account.getId(), account.getPassword())
    } catch (e) {
      if (isMetaMask) {
        throw e
      }
      this.logger.warn('Error on personal sign.')
      this.logger.warn(e)
      return null
    }
  }
}
